import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { runBridge } from '../src/acp-client.ts'
import registerPiBridge from '../src/pi/index.ts'
import type { BridgeConfig, BridgeResult } from '../src/protocol.ts'

interface Fixture {
  name: string
  scenario: string
  expectedStatus: BridgeResult['status']
  expectedError: string | null
}

interface FixtureOutcome {
  status: BridgeResult['status']
  error: { code: string } | null
}

const fixtureRoot = fileURLToPath(new URL('../conformance/', import.meta.url))
const fakeServer = fileURLToPath(new URL('../test-support/fake-acp-server.ts', import.meta.url))
const tsxLoader = createRequire(import.meta.url).resolve('tsx/esm')
const expectedNames = [
  'acp-capability-mismatch',
  'approval-unavailable',
  'cancel-ack',
  'cancel-force-reap',
  'child-exit',
  'concurrent-isolation',
  'env-disallowed',
  'host-version-mismatch',
  'malformed-response',
  'permission-allow',
  'permission-deny',
  'success-utf8',
  'workspace-outside-root',
  'workspace-unavailable',
]

async function loadFixtures(): Promise<Fixture[]> {
  const files = (await readdir(fixtureRoot)).filter(file => file.endsWith('.json')).sort()
  expect(files).toEqual(expectedNames.map(name => `${name}.json`))
  return await Promise.all(files.map(async file => {
    const fixture = JSON.parse(await readFile(join(fixtureRoot, file), 'utf8')) as Fixture
    expect(fixture.name).toBe(file.slice(0, -5))
    return fixture
  }))
}

async function executeFixture(fixture: Fixture): Promise<FixtureOutcome> {
  if (fixture.name === 'host-version-mismatch') {
    try {
      registerPiBridge({} as never)
    } catch (error: unknown) {
      expect(String(error)).toContain('BRIDGE_HOST_VERSION')
      return { status: 'incompatible', error: { code: 'BRIDGE_HOST_VERSION' } }
    }
    throw new Error('The unsupported host unexpectedly loaded the Pi extension')
  }

  const root = await mkdtemp(join(tmpdir(), 'dsh-conformance-root-'))
  const outside = await mkdtemp(join(tmpdir(), 'dsh-conformance-outside-'))
  try {
    const scenario = fixture.scenario === 'environment' || fixture.scenario === 'workspace' ? 'success' : fixture.scenario
    const config: BridgeConfig = {
      command: process.execPath,
      args: ['--import', tsxLoader, fakeServer, scenario],
      workspaceRoot: root,
      envAllowlist: fixture.name === 'env-disallowed' ? ['not-allowed'] : [],
      permission: 'interactive',
      cancelGraceMs: 150,
      requestTimeoutMs: 1_000,
    }
    const controller = new AbortController()
    if (fixture.name === 'cancel-ack' || fixture.name === 'cancel-force-reap') {
      setTimeout(() => controller.abort(), 100)
    }
    const hostCwd = fixture.name === 'workspace-outside-root'
      ? outside
      : fixture.name === 'workspace-unavailable'
        ? join(root, 'missing')
        : root
    const permission = fixture.name === 'permission-allow'
      ? async (): Promise<true> => true
      : fixture.name === 'permission-deny'
        ? async (): Promise<false> => false
        : async (): Promise<undefined> => undefined
    const run = (callId: string, prompt: string) => runBridge(
      'pi',
      { version: 1, callId, prompt, hostCwd, workspaceRoot: root },
      config,
      controller.signal,
      permission,
    )
    if (fixture.name === 'concurrent-isolation') {
      const [first, second] = await Promise.all([run('conformance-a', 'first'), run('conformance-b', 'second')])
      expect(first.sessionId).not.toBe(second.sessionId)
      expect(second).toMatchObject({ status: 'completed', error: null })
      return first
    }
    return await run(`conformance-${fixture.name}`, '你好, conformance 👋')
  } finally {
    await Promise.all([rm(root, { recursive: true, force: true }), rm(outside, { recursive: true, force: true })])
  }
}

describe('language-neutral conformance fixtures', () => {
  it('executes every version 1 scenario against the TypeScript bridge', async () => {
    for (const fixture of await loadFixtures()) {
      const result = await executeFixture(fixture)
      expect(result.status, fixture.name).toBe(fixture.expectedStatus)
      expect(result.error?.code ?? null, fixture.name).toBe(fixture.expectedError)
    }
  })
})
