import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const versionsPath = join(repositoryRoot, 'integrations/clean-room/versions.json')
const supportedHosts = ['pi', 'omp', 'hermes']

export function readVersions(env = process.env) {
  const versions = JSON.parse(readFileSync(versionsPath, 'utf8'))
  if (versions.schemaVersion !== 1) throw new Error(`Unsupported clean-room schema: ${String(versions.schemaVersion)}`)
  return {
    ...versions,
    piVersion: env.CLEANROOM_PI_VERSION ?? versions.piVersion,
    ompVersion: env.CLEANROOM_OMP_VERSION ?? versions.ompVersion,
    hermesVersion: env.CLEANROOM_HERMES_VERSION ?? versions.hermesVersion,
  }
}

function dockerBuildArgs(host, versions, tag) {
  const freshness = process.env.CLEANROOM_REUSE_BUILD_CACHE === '1' ? [] : ['--pull', '--no-cache']
  return [
    'build', ...freshness, '--progress=plain',
    '--file', 'integrations/clean-room/Containerfile',
    '--target', host,
    '--tag', tag,
    '--build-arg', `BASE_IMAGE=${versions.baseImage}`,
    '--build-arg', `PROTO_VERSION=${versions.protoVersion}`,
    '--build-arg', `PROTO_SHA256_AMD64=${versions.protoSha256.amd64}`,
    '--build-arg', `PROTO_SHA256_ARM64=${versions.protoSha256.arm64}`,
    '--build-arg', `NODE_VERSION=${versions.nodeVersion}`,
    '--build-arg', `BUN_VERSION=${versions.bunVersion}`,
    '--build-arg', `PYTHON_VERSION=${versions.pythonVersion}`,
    '--build-arg', `PI_VERSION=${versions.piVersion}`,
    '--build-arg', `OMP_VERSION=${versions.ompVersion}`,
    '--build-arg', `HERMES_VERSION=${versions.hermesVersion}`,
    '--build-arg', `ACP_SDK_VERSION=${versions.acpSdkVersion}`,
    '--build-arg', `TSX_VERSION=${versions.tsxVersion}`,
    '--build-arg', `TYPEBOX_VERSION=${versions.typeboxVersion}`,
    '.',
  ]
}

export function dockerRunArgs(tag) {
  return [
    'run', '--rm',
    '--network', 'none',
    '--read-only',
    '--cap-drop', 'ALL',
    '--security-opt', 'no-new-privileges',
    '--pids-limit', '256',
    '--memory', '2g',
    '--cpus', '2',
    '--tmpfs', '/tmp:rw,nosuid,nodev,size=512m',
    tag,
  ]
}

function safeTagPart(value) {
  return value.toLowerCase().replaceAll(/[^a-z0-9_.-]+/g, '-')
}

function imageTag(host, versions) {
  const hostVersion = versions[`${host}Version`]
  return `oh-my-deepseek-harness-cleanroom-${host}:${safeTagPart(hostVersion)}`
}

async function run(command, args, logPath, options = {}) {
  const output = []
  const child = spawn(command, args, { cwd: repositoryRoot, env: process.env, ...options })
  for (const stream of [child.stdout, child.stderr]) {
    stream?.on('data', chunk => {
      output.push(chunk)
      process.stdout.write(chunk)
    })
  }
  const status = await new Promise((resolveStatus, reject) => {
    child.once('error', reject)
    child.once('close', code => resolveStatus(code ?? 1))
  })
  if (logPath !== undefined) writeFileSync(logPath, Buffer.concat(output))
  if (status !== 0) throw new Error(`${command} exited with status ${status}`)
  return Buffer.concat(output).toString('utf8').trim()
}

async function capture(command, args) {
  const chunks = []
  const child = spawn(command, args, { cwd: repositoryRoot, env: process.env })
  child.stdout.on('data', chunk => chunks.push(chunk))
  const status = await new Promise((resolveStatus, reject) => {
    child.once('error', reject)
    child.once('close', code => resolveStatus(code ?? 1))
  })
  if (status !== 0) throw new Error(`${command} ${args.join(' ')} exited with status ${status}`)
  return Buffer.concat(chunks).toString('utf8').trim()
}

async function doctor() {
  const context = await capture('docker', ['context', 'show'])
  await capture('docker', ['info', '--format', '{{.ServerVersion}}'])
  if (process.platform === 'darwin') {
    await capture('orb', ['version'])
    if (context !== 'orbstack' && process.env.CLEANROOM_ALLOW_NON_ORBSTACK !== '1') {
      throw new Error(`Docker context is ${context}; select the orbstack context before running clean-room tests.`)
    }
  }
  const versions = readVersions()
  process.stdout.write(`${JSON.stringify({ status: 'ready', engine: context, versions }, null, 2)}\n`)
}

function requestedHosts(value) {
  if (value === 'all') return supportedHosts
  if (!supportedHosts.includes(value)) throw new Error(`Expected one of: all, ${supportedHosts.join(', ')}`)
  return [value]
}

async function test(hostValue) {
  await doctor()
  const versions = readVersions()
  const hosts = requestedHosts(hostValue)
  const runId = new Date().toISOString().replaceAll(/[:.]/g, '-')
  const evidenceRoot = resolve(process.env.CLEANROOM_EVIDENCE_DIR ?? join(repositoryRoot, '.artifacts/clean-room', runId))
  mkdirSync(evidenceRoot, { recursive: true })
  const manifest = {
    schemaVersion: 1,
    runId,
    startedAt: new Date().toISOString(),
    repositoryCommit: await capture('git', ['rev-parse', 'HEAD']),
    repositoryDirty: (await capture('git', ['status', '--porcelain'])).length > 0,
    dockerContext: await capture('docker', ['context', 'show']),
    freshInstall: process.env.CLEANROOM_REUSE_BUILD_CACHE !== '1',
    isolation: { network: 'none-at-runtime', rootFilesystem: 'read-only', user: 'non-root', credentials: 'not-mounted' },
    versions,
    hosts: [],
  }
  const manifestPath = join(evidenceRoot, 'manifest.json')
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  try {
    for (const host of hosts) {
      const tag = imageTag(host, versions)
      const entry = { host, tag, status: 'building' }
      manifest.hosts.push(entry)
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
      await run('docker', dockerBuildArgs(host, versions, tag), join(evidenceRoot, `${host}-build.log`))
      entry.status = 'testing'
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
      entry.output = await run('docker', dockerRunArgs(tag), join(evidenceRoot, `${host}-test.log`))
      entry.status = 'passed'
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
    }
    manifest.completedAt = new Date().toISOString()
    manifest.status = 'passed'
  } catch (error) {
    manifest.completedAt = new Date().toISOString()
    manifest.status = 'failed'
    manifest.error = error instanceof Error ? error.message : String(error)
    throw error
  } finally {
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
    process.stdout.write(`\nClean-room evidence: ${manifestPath}\n`)
  }
}

function report() {
  const root = join(repositoryRoot, '.artifacts/clean-room')
  if (!existsSync(root)) throw new Error('No clean-room evidence exists yet. Run just cleanroom-all first.')
  const latest = readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort()
    .at(-1)
  if (latest === undefined) throw new Error('No clean-room evidence exists yet. Run just cleanroom-all first.')
  const manifestPath = join(root, latest, 'manifest.json')
  process.stdout.write(readFileSync(manifestPath, 'utf8'))
  process.stdout.write(`Evidence directory: ${dirname(manifestPath)}\n`)
}

async function main() {
  const [command = 'doctor', host = 'all'] = process.argv.slice(2)
  if (command === 'doctor') return await doctor()
  if (command === 'test') return await test(host)
  if (command === 'report') return report()
  throw new Error('Usage: clean-room-hosts.mjs doctor | test [all|pi|omp|hermes] | report')
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`)
    process.exitCode = 1
  })
}
