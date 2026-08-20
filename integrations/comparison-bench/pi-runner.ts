import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  createAgentSession,
  DefaultResourceLoader,
  ModelRuntime,
  SessionManager,
  SettingsManager,
} from '@earendil-works/pi-coding-agent'

const lane = process.env.COMPARISON_LANE
const cwd = '/workspace'
const profile = '/tmp/pi-profile'
const promptPath = '/opt/bench/game-prompt.txt'
const apiKey = process.env.DEEPSEEK_API_KEY ?? ''
const modelId = process.env.COMPARISON_MODEL ?? 'deepseek-v4-pro'
const timeoutMs = Number(process.env.COMPARISON_TIMEOUT_MS ?? '3600000')

if (lane !== 'pi-baseline' && lane !== 'pi-harness') throw new Error('COMPARISON_LANE must be pi-baseline or pi-harness')
if (apiKey.length === 0) throw new Error('DEEPSEEK_API_KEY is required for a comparison run')
if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) throw new Error('COMPARISON_TIMEOUT_MS must be a positive integer')

mkdirSync(cwd, { recursive: true })
mkdirSync(profile, { recursive: true })
const prompt = readFileSync(promptPath, 'utf8')
const startedAt = Date.now()
const controller = new AbortController()
const timeout = setTimeout(() => controller.abort(), timeoutMs)

function loader(settingsManager: SettingsManager, extensionPath?: string): DefaultResourceLoader {
  return new DefaultResourceLoader({
    cwd,
    agentDir: profile,
    settingsManager,
    additionalExtensionPaths: extensionPath === undefined ? [] : [extensionPath],
    noExtensions: extensionPath === undefined,
    noSkills: true,
    noPromptTemplates: true,
    noThemes: true,
    noContextFiles: true,
  })
}

async function baseline(): Promise<Record<string, unknown>> {
  const settingsManager = SettingsManager.inMemory()
  settingsManager.setProjectTrusted(true)
  const resourceLoader = loader(settingsManager)
  await resourceLoader.reload({ resolveProjectTrust: async () => true })
  const modelRuntime = await ModelRuntime.create({
    authPath: join(profile, 'auth.json'),
    modelsPath: null,
    refreshOnCreate: false,
  })
  await modelRuntime.setRuntimeApiKey('deepseek', apiKey)
  delete process.env.DEEPSEEK_API_KEY
  const model = modelRuntime.getModel('deepseek', modelId)
  if (model === undefined) throw new Error(`Pi does not provide deepseek/${modelId}`)
  const { session } = await createAgentSession({
    cwd,
    modelRuntime,
    model,
    thinkingLevel: 'high',
    resourceLoader,
    sessionManager: SessionManager.inMemory(cwd),
    settingsManager,
    tools: ['read', 'bash', 'edit', 'write'],
  })
  const abort = (): void => { void session.abort() }
  controller.signal.addEventListener('abort', abort, { once: true })
  try {
    await Promise.race([
      session.prompt(prompt, { source: 'rpc' }).then(() => session.waitForIdle()),
      new Promise<never>((_resolve, reject) => controller.signal.addEventListener('abort', () => reject(new Error('Comparison lane timed out')), { once: true })),
    ])
    const stats = session.getSessionStats()
    return {
      lane,
      model: `deepseek/${modelId}`,
      activeTools: session.getActiveToolNames(),
      tokens: stats.tokens,
      cost: stats.cost,
      assistantMessages: stats.assistantMessages,
      toolCalls: stats.toolCalls,
    }
  } finally {
    controller.signal.removeEventListener('abort', abort)
    session.dispose()
  }
}

async function harness(): Promise<Record<string, unknown>> {
  const extensionPath = '/opt/bench/node_modules/@truly-private/dsh-host-bridge/src/pi/index.ts'
  const credentialRoot = '/run/dsh-credentials'
  writeFileSync(join(credentialRoot, '.credentials.yaml'), `DEEPSEEK_API_KEY: ${JSON.stringify(apiKey)}\n`, { mode: 0o600 })
  delete process.env.DEEPSEEK_API_KEY
  process.env.DSH_BRIDGE_COMMAND = 'node'
  process.env.DSH_BRIDGE_ARGS_JSON = JSON.stringify([
    '--import',
    '/opt/dsh/node_modules/tsx/dist/esm/index.mjs',
    '/opt/dsh/packages/examples/acp-demo/src/bin.ts',
    '--config',
    '/opt/dsh/examples/acp-agent/cordis.yml',
  ])
  process.env.DSH_BRIDGE_WORKSPACE_ROOT = cwd
  process.env.DSH_BRIDGE_ENV_ALLOWLIST = 'DSH_HOME,DSH_PERMISSION_MODE,DSH_SNAPSHOT_SESSIONS_ROOT,HOME'
  process.env.DSH_BRIDGE_PERMISSION = 'allow'
  process.env.DSH_BRIDGE_REQUEST_TIMEOUT_MS = String(timeoutMs)
  process.env.DSH_PERMISSION_MODE = 'workspace-write'
  process.env.DSH_HOME = credentialRoot
  process.env.DSH_SNAPSHOT_SESSIONS_ROOT = '/tmp/dsh-sessions'
  process.env.HOME = '/tmp/dsh-home'
  mkdirSync(process.env.HOME, { recursive: true })

  const settingsManager = SettingsManager.inMemory()
  settingsManager.setProjectTrusted(true)
  const resourceLoader = loader(settingsManager, extensionPath)
  await resourceLoader.reload({ resolveProjectTrust: async () => true })
  const errors = resourceLoader.getExtensions().errors
  if (errors.length > 0) throw new Error(`Pi could not load the harness extension: ${JSON.stringify(errors)}`)
  const { session } = await createAgentSession({
    cwd,
    resourceLoader,
    sessionManager: SessionManager.inMemory(cwd),
    settingsManager,
    noTools: 'builtin',
    tools: ['dsh_delegate'],
  })
  try {
    const tool = session.state.tools.find(candidate => candidate.name === 'dsh_delegate')
    if (tool === undefined) throw new Error('Pi did not activate dsh_delegate')
    const result = await tool.execute('comparison-bench', { prompt }, controller.signal, undefined)
    const details = result.details as { status?: string; error?: unknown; meta?: { cleanup?: string } }
    if (details.status !== 'completed') throw new Error(`Harness delegation failed: ${JSON.stringify(details)}`)
    return {
      lane,
      model: `deepseek-official/${modelId}`,
      activeTools: ['dsh_delegate'],
      bridgeStatus: details.status,
      cleanup: details.meta?.cleanup,
      bridgeError: details.error ?? null,
    }
  } finally {
    session.dispose()
  }
}

try {
  const result = lane === 'pi-baseline' ? await baseline() : await harness()
  process.stdout.write(`${JSON.stringify({
    ...result,
    durationMs: Date.now() - startedAt,
    status: 'completed',
  })}\n`)
} finally {
  clearTimeout(timeout)
}
