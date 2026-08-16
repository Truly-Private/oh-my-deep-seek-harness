import { mkdtemp, mkdir, realpath, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { runBridge } from '../src/acp-client.ts'
import type { BridgeConfig } from '../src/protocol.ts'

const fakeServer = fileURLToPath(new URL('../test-support/fake-acp-server.ts', import.meta.url))
const tsxLoader = createRequire(import.meta.url).resolve('tsx/esm')
const savedAllowed = process.env.BRIDGE_TEST_ALLOWED
const savedSecret = process.env.BRIDGE_TEST_SECRET

afterEach(() => {
  if (savedAllowed === undefined) delete process.env.BRIDGE_TEST_ALLOWED
  else process.env.BRIDGE_TEST_ALLOWED = savedAllowed
  if (savedSecret === undefined) delete process.env.BRIDGE_TEST_SECRET
  else process.env.BRIDGE_TEST_SECRET = savedSecret
})

async function setup(scenario: string, changes: Partial<BridgeConfig> = {}) {
  const root = await mkdtemp(join(tmpdir(), 'dsh-host-bridge-'))
  const config: BridgeConfig = {
    command: process.execPath,
    args: ['--import', tsxLoader, fakeServer, scenario],
    workspaceRoot: root,
    envAllowlist: [],
    permission: 'interactive',
    cancelGraceMs: 250,
    requestTimeoutMs: 2_000,
    ...changes,
  }
  return { root, config }
}

function request(root: string, prompt = '你好, ACP 👋') {
  return { version: 1 as const, callId: 'call-1', prompt, hostCwd: root, workspaceRoot: root }
}

describe('ACP bridge core', () => {
  it('round-trips UTF-8 and returns a versioned result', async () => {
    const { root, config } = await setup('success')
    const result = await runBridge('pi', request(root), config, undefined, async () => true)
    expect(result).toMatchObject({ status: 'completed', callId: 'call-1', content: [{ text: 'fixture: 你好, ACP 👋' }] })
    expect(result.sessionId).toMatch(/^fixture-/)
  })

  it('surfaces permission allow and denial distinctly', async () => {
    const { root, config } = await setup('permission')
    const allowed = await runBridge('omp', request(root), config, undefined, async () => true)
    const denied = await runBridge('omp', request(root), config, undefined, async () => false)
    expect(allowed.status).toBe('completed')
    expect(denied).toMatchObject({ status: 'denied', error: { code: 'BRIDGE_APPROVAL_DENIED' } })
  })

  it('fails closed when approval UI is unavailable', async () => {
    const { root, config } = await setup('permission')
    const result = await runBridge('hermes', request(root), config, undefined, async () => undefined)
    expect(result).toMatchObject({ status: 'incompatible', error: { code: 'BRIDGE_APPROVAL_UNAVAILABLE' } })
  })

  it('sends ACP cancellation and reaps a cooperative child', async () => {
    const { root, config } = await setup('hang')
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 150)
    const result = await runBridge('pi', request(root), config, controller.signal, async () => true)
    expect(result).toMatchObject({ status: 'canceled', error: { code: 'BRIDGE_CANCELED' } })
  })

  for (const scenario of ['hang-initialize', 'hang-session'] as const) {
    it(`honors host cancellation while ACP ${scenario.slice(5)} is pending`, async () => {
      const { root, config } = await setup(scenario)
      const controller = new AbortController()
      setTimeout(() => controller.abort(), 100)
      const result = await runBridge('pi', request(root), config, controller.signal, async () => true)
      expect(result).toMatchObject({ status: 'canceled', error: { code: 'BRIDGE_CANCELED' } })
      expect(result.meta.cleanup).not.toBe('failed')
    })
  }

  it('bounds an ACP request when the host does not cancel', async () => {
    const { root, config } = await setup('hang-initialize', { requestTimeoutMs: 100 })
    const result = await runBridge('pi', request(root), config, undefined, async () => true)
    expect(result).toMatchObject({ status: 'failed', error: { code: 'BRIDGE_REQUEST_TIMEOUT', retryable: true } })
    expect(result.meta.cleanup).not.toBe('failed')
  })

  it('answers a pending permission request when the host cancels', async () => {
    const { root, config } = await setup('permission')
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 100)
    const result = await runBridge('pi', request(root), config, controller.signal, async () => await new Promise(() => {}))
    expect(result).toMatchObject({ status: 'canceled', error: { code: 'BRIDGE_CANCELED' } })
    expect(result.meta.cleanup).not.toBe('failed')
  })

  it('forces a non-cooperative process tree after the grace period', async () => {
    const { root, config } = await setup('ignore-cancel')
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 150)
    const result = await runBridge('pi', request(root), config, controller.signal, async () => true)
    expect(result.status).toBe('canceled')
    expect(result.meta.cleanup).toBe('forced')
  })

  it('blocks canonical workspace escapes before spawning', async () => {
    const { root, config } = await setup('success')
    const outside = await mkdtemp(join(tmpdir(), 'dsh-host-outside-'))
    const escape = join(root, 'escape')
    await symlink(outside, escape)
    const result = await runBridge('pi', { ...request(root), hostCwd: escape }, config, undefined, async () => true)
    expect(result).toMatchObject({ status: 'denied', error: { code: 'BRIDGE_WORKSPACE_OUTSIDE_ROOT' } })
  })

  it('passes only explicitly allowlisted environment names', async () => {
    const { root, config } = await setup('echo-env', { envAllowlist: ['BRIDGE_TEST_ALLOWED'] })
    process.env.BRIDGE_TEST_ALLOWED = 'allowed-value'
    process.env.BRIDGE_TEST_SECRET = 'secret-canary'
    const result = await runBridge('pi', request(root), config, undefined, async () => true)
    expect(result.content[0]?.text).toBe('allowed-value|<unset>')
    expect(JSON.stringify(result)).not.toContain('secret-canary')
  })

  it('does not start a child for a cancellation already requested by the host', async () => {
    const { root, config } = await setup('success', { command: 'definitely-not-a-real-command' })
    const controller = new AbortController()
    controller.abort()
    const result = await runBridge('pi', request(root), config, controller.signal, async () => true)
    expect(result).toMatchObject({ status: 'canceled', error: { code: 'BRIDGE_CANCELED' }, meta: { cleanup: 'clean' } })
  })

  it('reports missing workspaces and executables as incompatible', async () => {
    const root = await realpath(await mkdtemp(join(tmpdir(), 'dsh-host-bridge-')))
    await mkdir(join(root, 'exists'))
    const missingWorkspace = await runBridge('pi', { ...request(root), hostCwd: join(root, 'missing') }, {
      command: process.execPath, args: [], workspaceRoot: root, envAllowlist: [], permission: 'reject', cancelGraceMs: 100, requestTimeoutMs: 500,
    }, undefined, async () => false)
    expect(missingWorkspace.error?.code).toBe('BRIDGE_WORKSPACE_UNAVAILABLE')
    const missingChild = await runBridge('pi', request(root), {
      command: join(root, 'does-not-exist'), args: [], workspaceRoot: root, envAllowlist: [], permission: 'reject', cancelGraceMs: 100, requestTimeoutMs: 500,
    }, undefined, async () => false)
    expect(missingChild.error?.code).toBe('BRIDGE_CHILD_NOT_FOUND')
  })

  it('rejects an incompatible ACP version and premature stop reason', async () => {
    const badVersion = await setup('bad-version')
    const versionResult = await runBridge('pi', request(badVersion.root), badVersion.config, undefined, async () => true)
    expect(versionResult.error?.code).toBe('BRIDGE_ACP_CAPABILITY')
    const stopped = await setup('child-stop')
    const stopResult = await runBridge('pi', request(stopped.root), stopped.config, undefined, async () => true)
    expect(stopResult.error?.code).toBe('BRIDGE_CHILD_EXITED')
  })

  it('rejects malformed protocol output and invalid environment names', async () => {
    const malformed = await setup('malformed')
    const malformedResult = await runBridge('pi', request(malformed.root), malformed.config, undefined, async () => true)
    expect(malformedResult.error?.code).toBe('BRIDGE_PROTOCOL')
    const environment = await setup('success', { envAllowlist: ['not-allowed'] })
    const environmentResult = await runBridge('pi', request(environment.root), environment.config, undefined, async () => true)
    expect(environmentResult.error?.code).toBe('BRIDGE_ENV_NOT_ALLOWED')
  })

  it('isolates concurrent sessions and call ids', async () => {
    const first = await setup('success')
    const second = await setup('success')
    const [a, b] = await Promise.all([
      runBridge('pi', { ...request(first.root, 'first'), callId: 'a' }, first.config, undefined, async () => true),
      runBridge('pi', { ...request(second.root, 'second'), callId: 'b' }, second.config, undefined, async () => true),
    ])
    expect(a).toMatchObject({ callId: 'a', content: [{ text: 'fixture: first' }] })
    expect(b).toMatchObject({ callId: 'b', content: [{ text: 'fixture: second' }] })
    expect(a.sessionId).not.toBe(b.sessionId)
  })
})
