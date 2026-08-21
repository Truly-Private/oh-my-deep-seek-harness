import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const benchRoot = join(repositoryRoot, 'integrations/comparison-bench')
const versionsPath = join(benchRoot, 'versions.json')
const promptPath = join(benchRoot, 'game-prompt.txt')
const lanes = ['pi-baseline', 'pi-harness']

export function readVersions(env = process.env) {
  const versions = JSON.parse(readFileSync(versionsPath, 'utf8'))
  if (versions.schemaVersion !== 1) throw new Error(`Unsupported comparison-bench schema: ${String(versions.schemaVersion)}`)
  return {
    ...versions,
    piVersion: env.COMPARISON_PI_VERSION ?? versions.piVersion,
    routerHostBaseURL: env.COMPARISON_ROUTER_HOST_BASE_URL ?? versions.routerHostBaseURL,
    routerContainerBaseURL: env.COMPARISON_ROUTER_CONTAINER_BASE_URL ?? versions.routerContainerBaseURL,
  }
}

function safeTagPart(value) {
  return value.toLowerCase().replaceAll(/[^a-z0-9_.-]+/g, '-')
}

function imageTag(target, versions) {
  return `oh-my-deepseek-harness-comparison-${target}:${safeTagPart(versions.piVersion)}`
}

function commonBuildArgs(target, versions, tag) {
  const freshness = process.env.COMPARISON_REUSE_BUILD_CACHE === '1' ? ['--pull'] : ['--pull', '--no-cache']
  return [
    'build', ...freshness, '--progress=plain',
    '--file', 'integrations/comparison-bench/Containerfile',
    '--target', target,
    '--tag', tag,
    '--build-arg', `BASE_IMAGE=${versions.baseImage}`,
    '--build-arg', `PROTO_VERSION=${versions.protoVersion}`,
    '--build-arg', `PROTO_SHA256_AMD64=${versions.protoSha256.amd64}`,
    '--build-arg', `PROTO_SHA256_ARM64=${versions.protoSha256.arm64}`,
    '--build-arg', `NODE_VERSION=${versions.nodeVersion}`,
    '--build-arg', `PYTHON_VERSION=${versions.pythonVersion}`,
    '--build-arg', `PNPM_VERSION=${versions.pnpmVersion}`,
    '--build-arg', `PI_VERSION=${versions.piVersion}`,
    '--build-arg', `TSX_VERSION=${versions.tsxVersion}`,
    '--build-arg', `TYPEBOX_VERSION=${versions.typeboxVersion}`,
    '--build-arg', `PLAYWRIGHT_VERSION=${versions.playwrightVersion}`,
    '.',
  ]
}

export function agentRunArgs(tag, lane, workspace, versions, containerName) {
  return [
    'run', '--name', containerName, '--rm',
    '--cap-drop', 'ALL',
    '--security-opt', 'no-new-privileges',
    '--pids-limit', '512',
    '--memory', '8g',
    '--cpus', '4',
    '--tmpfs', '/tmp:rw,nosuid,nodev,size=2g',
    '--add-host', 'host.docker.internal:host-gateway',
    '--env', 'NINE_ROUTER_API_KEY',
    '--env', `COMPARISON_LANE=${lane}`,
    '--env', `COMPARISON_PROVIDER=${versions.provider}`,
    '--env', `COMPARISON_MODEL=${versions.model}`,
    '--env', `COMPARISON_ROUTER_BASE_URL=${versions.routerContainerBaseURL}`,
    '--env', `COMPARISON_TIMEOUT_MS=${String(versions.promptTimeoutMs)}`,
    '--mount', `type=bind,src=${workspace},dst=/workspace`,
    tag,
  ]
}

export function evaluatorRunArgs(tag, workspace, evidence, containerName) {
  return [
    'run', '--name', containerName, '--rm',
    '--network', 'none',
    '--read-only',
    '--cap-drop', 'ALL',
    '--security-opt', 'no-new-privileges',
    '--pids-limit', '512',
    '--memory', '4g',
    '--cpus', '2',
    '--tmpfs', '/tmp:rw,nosuid,nodev,size=1g',
    '--tmpfs', '/dev/shm:rw,nosuid,nodev,size=1g',
    '--env', 'HOME=/tmp/home',
    '--env', 'PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright',
    '--mount', `type=bind,src=${workspace},dst=/workspace`,
    '--mount', `type=bind,src=${evidence},dst=/evidence`,
    tag,
  ]
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

async function run(command, args, logPath, options = {}) {
  const output = []
  const child = spawn(command, args, { cwd: repositoryRoot, env: process.env })
  for (const stream of [child.stdout, child.stderr]) {
    stream.on('data', chunk => {
      output.push(chunk)
      process.stdout.write(chunk)
    })
  }
  let timeout
  if (options.timeoutMs !== undefined) {
    timeout = setTimeout(() => child.kill('SIGTERM'), options.timeoutMs)
  }
  const status = await new Promise((resolveStatus, reject) => {
    child.once('error', reject)
    child.once('close', code => resolveStatus(code ?? 1))
  })
  if (timeout !== undefined) clearTimeout(timeout)
  const bytes = Buffer.concat(output)
  if (logPath !== undefined) writeFileSync(logPath, bytes)
  if (status !== 0) throw new Error(`${command} exited with status ${status}`)
  return bytes.toString('utf8').trim()
}

async function removeContainerIfPresent(name) {
  const child = spawn('docker', ['rm', '--force', name], { cwd: repositoryRoot, stdio: 'ignore' })
  await new Promise(resolveDone => child.once('close', resolveDone))
}

function requestedLanes(value) {
  if (value === 'all') return lanes
  if (!lanes.includes(value)) throw new Error(`Expected one of: all, ${lanes.join(', ')}`)
  return [value]
}

function digestFile(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

const inventoryExcludedDirectories = new Set(['.git', '.pw-browsers', '.pw-libs', 'node_modules'])

export function inventory(root) {
  const output = []
  const visit = directory => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && inventoryExcludedDirectories.has(entry.name)) continue
      const path = join(directory, entry.name)
      if (entry.isDirectory()) visit(path)
      else if (entry.isFile()) output.push({ path: relative(root, path), bytes: statSync(path).size, sha256: digestFile(path) })
    }
  }
  visit(root)
  return output.sort((left, right) => left.path.localeCompare(right.path))
}

async function doctor() {
  const context = await capture('docker', ['context', 'show'])
  await capture('docker', ['info', '--format', '{{.ServerVersion}}'])
  await capture('proto', ['--version'])
  await capture('just', ['--version'])
  if (process.platform === 'darwin') {
    await capture('orb', ['version'])
    if (context !== 'orbstack' && process.env.COMPARISON_ALLOW_NON_ORBSTACK !== '1') {
      throw new Error(`Docker context is ${context}; select the orbstack context before running the comparison bench.`)
    }
  }
  const versions = readVersions()
  const response = await fetch(`${versions.routerHostBaseURL}/models`, { signal: AbortSignal.timeout(10_000) })
  if (!response.ok) throw new Error(`9Router model discovery failed with HTTP ${response.status}`)
  const body = await response.json()
  const modelIds = Array.isArray(body?.data)
    ? body.data.map(candidate => candidate?.id).filter(candidate => typeof candidate === 'string')
    : []
  if (!modelIds.includes(versions.model)) {
    throw new Error(`9Router at ${versions.routerHostBaseURL} does not advertise the required ${versions.model} model`)
  }
  const credentialConfigured = Boolean(process.env.NINE_ROUTER_API_KEY)
  process.stdout.write(`${JSON.stringify({
    status: credentialConfigured ? 'ready' : 'needs-credential',
    engine: context,
    router: {
      reachable: true,
      provider: versions.provider,
      model: versions.model,
      credentialConfigured,
    },
    versions,
  }, null, 2)}\n`)
}

async function build(targetValue, evidenceRoot) {
  const versions = readVersions()
  const targets = [...requestedLanes(targetValue), 'evaluator']
  for (const target of targets) {
    const tag = imageTag(target, versions)
    const logPath = evidenceRoot === undefined ? undefined : join(evidenceRoot, `${target}-image-build.log`)
    await run('docker', commonBuildArgs(target, versions, tag), logPath)
  }
}

async function execute(targetValue) {
  await doctor()
  if (!process.env.NINE_ROUTER_API_KEY) {
    throw new Error('NINE_ROUTER_API_KEY is not configured. Copy the gateway key from the local 9Router dashboard before a real comparison run.')
  }
  const versions = readVersions()
  const selected = requestedLanes(targetValue)
  const runId = new Date().toISOString().replaceAll(/[:.]/g, '-')
  const evidenceRoot = resolve(process.env.COMPARISON_EVIDENCE_DIR ?? join(repositoryRoot, '.artifacts/comparison', runId))
  mkdirSync(evidenceRoot, { recursive: true })
  copyFileSync(promptPath, join(evidenceRoot, 'game-prompt.txt'))
  const manifest = {
    schemaVersion: 1,
    runId,
    startedAt: new Date().toISOString(),
    repositoryCommit: await capture('git', ['rev-parse', 'HEAD']),
    repositoryDirty: (await capture('git', ['status', '--porcelain'])).length > 0,
    dockerContext: await capture('docker', ['context', 'show']),
    promptSha256: digestFile(promptPath),
    promptBytes: statSync(promptPath).size,
    fairness: {
      identicalPrompt: true,
      identicalProvider: versions.provider,
      identicalModel: versions.model,
      freshContainers: process.env.COMPARISON_REUSE_BUILD_CACHE !== '1',
      laneOrder: selected,
      agentResources: { cpus: 4, memory: '8g', pids: 512 },
      credentialTransport: '9router-entrypoint-only-then-scrubbed',
    },
    versions,
    lanes: [],
  }
  const manifestPath = join(evidenceRoot, 'manifest.json')
  const save = () => writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  save()
  try {
    await build(targetValue, evidenceRoot)
    for (const lane of selected) {
      const laneRoot = join(evidenceRoot, lane)
      const workspace = join(laneRoot, 'workspace')
      mkdirSync(workspace, { recursive: true })
      const entry = { lane, status: 'running', startedAt: new Date().toISOString() }
      manifest.lanes.push(entry)
      save()
      const containerName = `omdsh-comparison-${safeTagPart(runId)}-${lane}`
      try {
        try {
          const agentOutput = await run(
            'docker',
            agentRunArgs(imageTag(lane, versions), lane, workspace, versions, containerName),
            join(laneRoot, 'agent.log'),
            { timeoutMs: versions.promptTimeoutMs + 60_000 },
          )
          entry.agentResult = JSON.parse(agentOutput.split('\n').at(-1))
          entry.status = 'capturing'
          save()
        } finally {
          await removeContainerIfPresent(containerName)
        }

        const evaluatorName = `omdsh-comparison-${safeTagPart(runId)}-${lane}-capture`
        try {
          await run(
            'docker',
            evaluatorRunArgs(imageTag('evaluator', versions), workspace, laneRoot, evaluatorName),
            join(laneRoot, 'capture.log'),
            { timeoutMs: 10 * 60_000 },
          )
        } finally {
          await removeContainerIfPresent(evaluatorName)
        }
        entry.files = inventory(workspace)
        entry.uiChecks = JSON.parse(readFileSync(join(laneRoot, 'ui-checks.json'), 'utf8'))
        entry.screenshots = ['desktop-start.png', 'desktop-playing.png', 'mobile-start.png']
        entry.status = entry.agentResult.status === 'completed' ? 'passed' : entry.agentResult.status
      } catch (error) {
        entry.status = 'failed'
        entry.error = error instanceof Error ? error.message : String(error)
      } finally {
        entry.completedAt = new Date().toISOString()
        save()
      }
    }
    manifest.completedAt = new Date().toISOString()
    const failedLanes = manifest.lanes.filter(entry => entry.status !== 'passed')
    manifest.status = failedLanes.length === 0 ? 'passed' : 'failed'
    if (failedLanes.length > 0) {
      throw new Error(`Comparison lanes did not pass: ${failedLanes.map(entry => `${entry.lane} (${entry.status})`).join(', ')}`)
    }
  } catch (error) {
    manifest.completedAt = new Date().toISOString()
    manifest.status = 'failed'
    manifest.error = error instanceof Error ? error.message : String(error)
    const active = manifest.lanes.at(-1)
    if (active !== undefined && (active.status === 'running' || active.status === 'capturing')) active.status = 'failed'
    throw error
  } finally {
    save()
    process.stdout.write(`\nComparison evidence: ${manifestPath}\n`)
  }
}

function report() {
  const root = join(repositoryRoot, '.artifacts/comparison')
  if (!existsSync(root)) throw new Error('No comparison evidence exists yet. Run just comparison-all first.')
  const latest = readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort()
    .at(-1)
  if (latest === undefined) throw new Error('No comparison evidence exists yet. Run just comparison-all first.')
  const manifestPath = join(root, latest, 'manifest.json')
  process.stdout.write(readFileSync(manifestPath, 'utf8'))
  process.stdout.write(`Evidence directory: ${dirname(manifestPath)}\n`)
}

async function main() {
  const [command = 'doctor', target = 'all'] = process.argv.slice(2)
  if (command === 'doctor') return await doctor()
  if (command === 'build') {
    await doctor()
    return await build(target)
  }
  if (command === 'run') return await execute(target)
  if (command === 'report') return report()
  throw new Error('Usage: comparison-bench.mjs doctor | build [all|pi-baseline|pi-harness] | run [all|pi-baseline|pi-harness] | report')
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`)
    process.exitCode = 1
  })
}
