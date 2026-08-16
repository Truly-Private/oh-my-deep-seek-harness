import { Readable as NodeReadable, Writable as NodeWritable } from 'node:stream'
import {
  ClientSideConnection,
  ndJsonStream,
  PROTOCOL_VERSION,
  type Agent as AcpAgent,
  type Client,
  type RequestPermissionRequest,
  type RequestPermissionResponse,
  type SessionNotification,
} from '@agentclientprotocol/sdk'
import { buildChildEnvironment, EnvironmentError } from './environment.ts'
import { spawnOwned } from './process-owner.ts'
import {
  ADAPTER_VERSION,
  BRIDGE_VERSION,
  bridgeFailure,
  type BridgeConfig,
  type BridgeHost,
  type BridgeRequest,
  type BridgeResult,
  type PermissionDecision,
} from './protocol.ts'
import { resolveWorkspace, WorkspaceError } from './workspace.ts'

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function isAborted(signal: AbortSignal | undefined): boolean {
  return signal?.aborted === true
}

class BridgeRequestTimeoutError extends Error {
  constructor(readonly operation: string) {
    super(`ACP request timed out: ${operation}`)
  }
}

async function awaitAcp<T>(operation: Promise<T>, aborted: Promise<void>, timeoutMs: number, name: string): Promise<T> {
  let timeout: NodeJS.Timeout | undefined
  const timedOut = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => reject(new BridgeRequestTimeoutError(name)), timeoutMs)
  })
  try {
    return await Promise.race([
      operation,
      aborted.then(() => { throw new DOMException('The host canceled the ACP request.', 'AbortError') }),
      timedOut,
    ])
  } finally {
    if (timeout !== undefined) clearTimeout(timeout)
  }
}

function classifyStartupError(host: BridgeHost, callId: string, error: unknown): BridgeResult {
  if (error instanceof WorkspaceError) {
    return bridgeFailure(host, callId, error.code === 'BRIDGE_WORKSPACE_OUTSIDE_ROOT' ? 'denied' : 'incompatible', error.code, error.message)
  }
  if (error instanceof EnvironmentError) {
    return bridgeFailure(host, callId, 'denied', error.code, error.message)
  }
  if (error instanceof BridgeRequestTimeoutError) {
    return bridgeFailure(host, callId, 'failed', 'BRIDGE_REQUEST_TIMEOUT', error.message)
  }
  const code = (error as NodeJS.ErrnoException).code
  if (code === 'ENOENT') {
    return bridgeFailure(host, callId, 'incompatible', 'BRIDGE_CHILD_NOT_FOUND', 'The configured DSH ACP executable was not found.')
  }
  return bridgeFailure(host, callId, 'failed', 'BRIDGE_PROTOCOL', `ACP startup failed: ${messageOf(error)}`)
}

/** Execute one bounded ACP delegation and own the child process through final reap. */
export async function runBridge(
  host: BridgeHost,
  request: BridgeRequest,
  config: BridgeConfig,
  signal: AbortSignal | undefined,
  decidePermission: PermissionDecision,
): Promise<BridgeResult> {
  if (isAborted(signal)) {
    return bridgeFailure(host, request.callId, 'canceled', 'BRIDGE_CANCELED', 'The host canceled before ACP startup.')
  }
  let workspace: string
  let childEnv: NodeJS.ProcessEnv
  try {
    workspace = await resolveWorkspace(request.hostCwd, request.workspaceRoot ?? config.workspaceRoot)
    childEnv = buildChildEnvironment(config.envAllowlist)
  } catch (error: unknown) {
    return classifyStartupError(host, request.callId, error)
  }

  const owner = spawnOwned(config.command, config.args, workspace, childEnv)
  const { child } = owner
  let sessionId: string | null = null
  let acpVersion: string | null = null
  let approvalFailure: 'denied' | 'unavailable' | null = null
  let canceled: boolean = signal?.aborted ?? false
  let output = ''

  let abortResolve: (() => void) | undefined
  const aborted = new Promise<void>(resolve => { abortResolve = resolve })

  const makeClient = (_agent: AcpAgent): Client => ({
    sessionUpdate(params: SessionNotification): Promise<void> {
      const update = params.update
      if (update.sessionUpdate === 'agent_message_chunk' && update.content.type === 'text') output += update.content.text
      return Promise.resolve()
    },
    async requestPermission(params: RequestPermissionRequest): Promise<RequestPermissionResponse> {
      let allow = false
      if (config.permission === 'allow') {
        allow = true
      } else if (config.permission === 'interactive') {
        const decision = await Promise.race([
          decidePermission({
            title: params.toolCall.title ?? 'DeepSeek Harness permission request',
            options: params.options.map(option => ({ optionId: option.optionId, name: option.name, kind: option.kind })),
          }),
          aborted.then(() => undefined),
        ])
        if (canceled) return { outcome: { outcome: 'cancelled' } }
        if (decision === undefined) approvalFailure = 'unavailable'
        else if (!decision) approvalFailure = 'denied'
        allow = decision === true
      } else {
        approvalFailure = 'denied'
      }
      const option = allow ? params.options.find(value => value.kind === 'allow_once' || value.kind === 'allow_always') : undefined
      if (option === undefined) {
        if (allow) approvalFailure = 'unavailable'
        return { outcome: { outcome: 'cancelled' } }
      }
      return { outcome: { outcome: 'selected', optionId: option.optionId } }
    },
  })

  const connection = new ClientSideConnection(
    makeClient,
    ndJsonStream(
      NodeWritable.toWeb(child.stdin) as WritableStream<Uint8Array>,
      NodeReadable.toWeb(child.stdout) as ReadableStream<Uint8Array>,
    ),
  )

  const onAbort = (): void => {
    canceled = true
    abortResolve?.()
    if (sessionId !== null) void connection.cancel({ sessionId }).catch(() => {})
  }
  signal?.addEventListener('abort', onAbort, { once: true })
  if (isAborted(signal)) onAbort()
  const spawnError = new Promise<never>((_resolve, reject) => child.once('error', reject))

  let result: BridgeResult
  try {
    if (canceled) throw new DOMException('The host canceled before ACP startup.', 'AbortError')
    const initialized = await awaitAcp(
      Promise.race([connection.initialize({ protocolVersion: PROTOCOL_VERSION, clientCapabilities: {} }), spawnError]),
      aborted,
      config.requestTimeoutMs,
      'initialize',
    )
    acpVersion = String(initialized.protocolVersion)
    if (initialized.protocolVersion !== PROTOCOL_VERSION) {
      result = bridgeFailure(host, request.callId, 'incompatible', 'BRIDGE_ACP_CAPABILITY', `Unsupported ACP version: ${initialized.protocolVersion}`)
    } else {
      const session = await awaitAcp(
        Promise.race([connection.newSession({ cwd: workspace, mcpServers: [] }), spawnError]),
        aborted,
        config.requestTimeoutMs,
        'session/new',
      )
      if (typeof session.sessionId !== 'string' || session.sessionId.length === 0) throw new Error('ACP session/new returned no session id')
      sessionId = session.sessionId
      if (canceled) onAbort()
      const prompt = connection.prompt({ sessionId, prompt: [{ type: 'text', text: request.prompt }] })
      const promptResult = await awaitAcp(
        Promise.race([prompt, spawnError]),
        aborted,
        config.requestTimeoutMs,
        'session/prompt',
      )
      if (canceled) {
        result = bridgeFailure(host, request.callId, 'canceled', 'BRIDGE_CANCELED', 'The host canceled the delegated task.', 'clean', sessionId)
      } else if (approvalFailure === 'unavailable') {
        result = bridgeFailure(host, request.callId, 'incompatible', 'BRIDGE_APPROVAL_UNAVAILABLE', 'DSH requested approval, but this host has no safe interaction path.', 'clean', sessionId)
      } else if (approvalFailure === 'denied') {
        result = bridgeFailure(host, request.callId, 'denied', 'BRIDGE_APPROVAL_DENIED', 'The DSH permission request was denied.', 'clean', sessionId)
      } else if (promptResult.stopReason === 'end_turn') {
        result = {
          version: BRIDGE_VERSION,
          callId: request.callId,
          sessionId,
          status: 'completed',
          content: output.length === 0 ? [] : [{ type: 'text', text: output }],
          error: null,
          meta: { host, adapterVersion: ADAPTER_VERSION, acpVersion, cleanup: 'clean' },
        }
      } else if (promptResult.stopReason === 'cancelled') {
        result = bridgeFailure(host, request.callId, 'canceled', 'BRIDGE_CANCELED', 'The ACP task ended as canceled.', 'clean', sessionId)
      } else {
        result = bridgeFailure(host, request.callId, 'failed', 'BRIDGE_CHILD_EXITED', `ACP task stopped before completion: ${promptResult.stopReason}`, 'clean', sessionId)
      }
    }
  } catch (error: unknown) {
    result = canceled
      ? bridgeFailure(host, request.callId, 'canceled', 'BRIDGE_CANCELED', 'The host canceled the delegated task.', 'clean', sessionId)
      : classifyStartupError(host, request.callId, error)
    result.sessionId = sessionId
  } finally {
    signal?.removeEventListener('abort', onAbort)
  }

  const cleanup = await owner.cleanup(config.cancelGraceMs)
  if (cleanup === 'failed') {
    return bridgeFailure(host, request.callId, 'failed', 'BRIDGE_CLEANUP_FAILED', 'The DSH process tree could not be fully reaped.', cleanup, sessionId)
  }
  result.meta.cleanup = cleanup
  result.meta.acpVersion = acpVersion
  return result
}
