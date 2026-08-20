import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { agentRunArgs, evaluatorRunArgs, readVersions } from './comparison-bench.mjs'

const runnerSource = readFileSync(new URL('../../integrations/comparison-bench/pi-runner.ts', import.meta.url), 'utf8')
const containerfile = readFileSync(new URL('../../integrations/comparison-bench/Containerfile', import.meta.url), 'utf8')
const dockerignore = readFileSync(new URL('../../.dockerignore', import.meta.url), 'utf8')

test('uses pinned Proto, Pi, model, and screenshot versions', () => {
  const versions = readVersions({})
  assert.equal(versions.protoVersion, '0.58.2')
  assert.equal(versions.nodeVersion, '24.19.0')
  assert.equal(versions.pythonVersion, '3.13.15')
  assert.equal(versions.pnpmVersion, '11.7.0')
  assert.equal(versions.piVersion, '0.84.2')
  assert.equal(versions.model, 'deepseek-v4-pro')
  assert.match(versions.baseImage, /^ubuntu:24\.04@sha256:[a-f0-9]{64}$/)
})

test('permits an explicit Pi compatibility probe without changing the model', () => {
  const versions = readVersions({ COMPARISON_PI_VERSION: '0.84.3' })
  assert.equal(versions.piVersion, '0.84.3')
  assert.equal(versions.model, 'deepseek-v4-pro')
})

test('agent containers receive only the named key and one output workspace', () => {
  const versions = readVersions({})
  const args = agentRunArgs('agent:test', 'pi-baseline', '/tmp/output', versions, 'bench-agent')
  assert.deepEqual(args.slice(0, 4), ['run', '--name', 'bench-agent', '--rm'])
  assert.deepEqual(args.slice(args.indexOf('--env'), args.indexOf('--env') + 2), ['--env', 'DEEPSEEK_API_KEY'])
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
  assert.equal(args.includes('DEEPSEEK_API_KEY'), false)
  assert.equal(args.filter(value => value.startsWith('type=bind')).length, 2)
  assert.equal(args.at(-1), 'capture:test')
})

test('generated commands cannot inherit the model credential', () => {
  assert.equal(runnerSource.match(/delete process\.env\.DEEPSEEK_API_KEY/g)?.length, 2)
  assert.match(runnerSource, /\.credentials\.yaml.*mode: 0o600/)
  assert.doesNotMatch(runnerSource, /DSH_BRIDGE_ENV_ALLOWLIST = '[^']*DEEPSEEK_API_KEY/)
  assert.match(containerfile, /--mode 0700 \/run\/dsh-credentials/)
  for (const pattern of ['**/.credentials.yaml', '**/.env', '**/.env.*', '**/.npmrc', '**/auth.json']) {
    assert.ok(dockerignore.split('\n').includes(pattern), `missing Docker exclusion: ${pattern}`)
  }
})
