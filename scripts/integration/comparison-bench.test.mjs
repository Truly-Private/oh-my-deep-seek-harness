import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { agentRunArgs, evaluatorRunArgs, inventory, readVersions } from './comparison-bench.mjs'

const runnerSource = readFileSync(new URL('../../integrations/comparison-bench/pi-runner.ts', import.meta.url), 'utf8')
const containerfile = readFileSync(new URL('../../integrations/comparison-bench/Containerfile', import.meta.url), 'utf8')
const harnessConfig = readFileSync(new URL('../../integrations/comparison-bench/harness-9router.cordis.yml', import.meta.url), 'utf8')
const dockerignore = readFileSync(new URL('../../.dockerignore', import.meta.url), 'utf8')

test('uses pinned Proto, Pi, model, and screenshot versions', () => {
  const versions = readVersions({})
  assert.equal(versions.protoVersion, '0.58.2')
  assert.equal(versions.nodeVersion, '24.19.0')
  assert.equal(versions.pythonVersion, '3.13.15')
  assert.equal(versions.pnpmVersion, '11.7.0')
  assert.equal(versions.piVersion, '0.84.2')
  assert.equal(versions.provider, '9router')
  assert.equal(versions.model, 'trifecta')
  assert.equal(versions.routerHostBaseURL, 'http://127.0.0.1:20128/v1')
  assert.equal(versions.routerContainerBaseURL, 'http://host.docker.internal:20128/v1')
  assert.match(versions.baseImage, /^ubuntu:24\.04@sha256:[a-f0-9]{64}$/)
})

test('permits an explicit Pi compatibility probe without changing the model', () => {
  const versions = readVersions({ COMPARISON_PI_VERSION: '0.84.3' })
  assert.equal(versions.piVersion, '0.84.3')
  assert.equal(versions.model, 'trifecta')
})

test('agent containers receive only the named key and one output workspace', () => {
  const versions = readVersions({})
  const args = agentRunArgs('agent:test', 'pi-baseline', '/tmp/output', versions, 'bench-agent')
  assert.deepEqual(args.slice(0, 4), ['run', '--name', 'bench-agent', '--rm'])
  assert.deepEqual(args.slice(args.indexOf('--add-host'), args.indexOf('--add-host') + 2), ['--add-host', 'host.docker.internal:host-gateway'])
  assert.deepEqual(args.slice(args.indexOf('--env'), args.indexOf('--env') + 2), ['--env', 'NINE_ROUTER_API_KEY'])
  assert.ok(args.includes('COMPARISON_PROVIDER=9router'))
  assert.ok(args.includes('COMPARISON_MODEL=trifecta'))
  assert.ok(args.includes('COMPARISON_ROUTER_BASE_URL=http://host.docker.internal:20128/v1'))
  assert.equal(args.includes('--read-only'), false)
  assert.equal(args.some(value => value.includes('.env') || value.includes('.ssh') || value.includes('.config')), false)
  assert.equal(args.filter(value => value.startsWith('type=bind')).length, 1)
  assert.equal(args.at(-1), 'agent:test')
})

test('screenshot evaluation is offline and credential-free', () => {
  const args = evaluatorRunArgs('capture:test', '/tmp/output', '/tmp/evidence', 'bench-capture')
  assert.deepEqual(args.slice(args.indexOf('--network'), args.indexOf('--network') + 2), ['--network', 'none'])
  assert.ok(args.includes('--read-only'))
  assert.ok(args.includes('no-new-privileges'))
  assert.equal(args.includes('NINE_ROUTER_API_KEY'), false)
  assert.equal(args.filter(value => value.startsWith('type=bind')).length, 2)
  assert.equal(args.at(-1), 'capture:test')
})

test('generated commands cannot inherit the model credential', () => {
  assert.equal(runnerSource.match(/delete process\.env\.NINE_ROUTER_API_KEY/g)?.length, 2)
  assert.match(runnerSource, /\.credentials\.yaml.*mode: 0o600/)
  assert.match(runnerSource, /TSX_TSCONFIG_PATH = '\/opt\/dsh\/tsconfig\.json'/)
  assert.match(runnerSource, /DSH_BRIDGE_ENV_ALLOWLIST = '[^']*TSX_TSCONFIG_PATH'/)
  assert.doesNotMatch(runnerSource, /DSH_BRIDGE_ENV_ALLOWLIST = '[^']*NINE_ROUTER_API_KEY/)
  assert.match(runnerSource, /status: 'timed_out'/)
  assert.match(harnessConfig, /name: '@deepseek-ai\/dsh-credentials-local'/)
  assert.match(containerfile, /npm install --prefix \/opt\/bench/)
  assert.match(containerfile, /--mode 0700 \/run\/dsh-credentials/)
  for (const pattern of ['**/.credentials.yaml', '**/.env', '**/.env.*', '**/.npmrc', '**/auth.json']) {
    assert.ok(dockerignore.split('\n').includes(pattern), `missing Docker exclusion: ${pattern}`)
  }
})

test('workspace inventory excludes dependency and browser caches', () => {
  const root = mkdtempSync(join(tmpdir(), 'comparison-inventory-'))
  try {
    writeFileSync(join(root, 'index.html'), '<main>game</main>')
    for (const directory of ['.git', '.pw-browsers', '.pw-libs', 'node_modules']) {
      mkdirSync(join(root, directory), { recursive: true })
      writeFileSync(join(root, directory, 'cache'), 'not generated app evidence')
    }
    assert.deepEqual(inventory(root).map(entry => entry.path), ['index.html'])
  } finally {
    rmSync(root, { recursive: true })
  }
})
