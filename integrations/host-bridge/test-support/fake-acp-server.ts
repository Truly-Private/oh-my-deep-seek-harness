import { Readable, Writable } from 'node:stream'
import {
  AgentSideConnection,
  ndJsonStream,
  PROTOCOL_VERSION,
  type Agent,
  type CancelNotification,
  type InitializeRequest,
  type InitializeResponse,
  type NewSessionRequest,
  type NewSessionResponse,
  type PromptRequest,
  type PromptResponse,
} from '@agentclientprotocol/sdk'

const scenario = process.argv[2] ?? 'success'
let resolveCancel: (() => void) | undefined

if (scenario === 'malformed') {
  process.stdout.write('{not-json}\n', () => process.exit(0))
}

function makeAgent(connection: AgentSideConnection): Agent {
  return {
    initialize(_request: InitializeRequest): Promise<InitializeResponse> {
      if (scenario === 'hang-initialize') return new Promise(() => {})
      return Promise.resolve({
        protocolVersion: scenario === 'bad-version' ? 0 : PROTOCOL_VERSION,
        agentCapabilities: { loadSession: false, promptCapabilities: { image: false, audio: false, embeddedContext: false } },
        authMethods: [],
      })
    },
    newSession(_request: NewSessionRequest): Promise<NewSessionResponse> {
      if (scenario === 'hang-session') return new Promise(() => {})
      if (scenario === 'missing-session') return Promise.resolve({} as NewSessionResponse)
      return Promise.resolve({ sessionId: `fixture-${process.pid}` })
    },
    authenticate(): Promise<void> {
      return Promise.resolve()
    },
    async prompt(request: PromptRequest): Promise<PromptResponse> {
      if (scenario.startsWith('permission')) {
        const response = await connection.requestPermission({
          sessionId: request.sessionId,
          toolCall: { toolCallId: 'fixture-tool', title: 'Allow fixture action?' },
          options: [
            { optionId: 'allow', name: 'Allow once', kind: 'allow_once' },
            { optionId: 'deny', name: 'Deny', kind: 'reject_once' },
          ],
        })
        if (response.outcome.outcome === 'cancelled') return { stopReason: 'cancelled' }
      }
      if (scenario === 'hang' || scenario === 'ignore-cancel') {
        return await new Promise(resolve => {
          resolveCancel = () => resolve({ stopReason: 'cancelled' })
        })
      }
      const prompt = request.prompt.filter(block => block.type === 'text').map(block => block.text).join('')
      if (scenario === 'noisy-stderr') process.stderr.write('x'.repeat(1024 * 1024))
      const text = scenario === 'echo-env'
        ? `${process.env.BRIDGE_TEST_ALLOWED ?? '<unset>'}|${process.env.BRIDGE_TEST_SECRET ?? '<unset>'}`
        : `fixture: ${prompt}`
      await connection.sessionUpdate({
        sessionId: request.sessionId,
        update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text } },
      })
      return { stopReason: scenario === 'child-stop' ? 'max_tokens' : 'end_turn' }
    },
    cancel(_request: CancelNotification): Promise<void> {
      if (scenario !== 'ignore-cancel') resolveCancel?.()
      return Promise.resolve()
    },
  }
}

if (scenario !== 'malformed') {
  new AgentSideConnection(
    makeAgent,
    ndJsonStream(
      Writable.toWeb(process.stdout) as WritableStream<Uint8Array>,
      Readable.toWeb(process.stdin) as ReadableStream<Uint8Array>,
    ),
  )
}

process.stdin.once('end', () => {
  if (scenario !== 'ignore-cancel') setImmediate(() => process.exit(0))
})
if (scenario === 'ignore-cancel') setInterval(() => {}, 1_000)
