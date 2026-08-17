import { mkdirSync } from 'node:fs'
import {
  createAgentSession,
  DefaultResourceLoader,
  SessionManager,
  SettingsManager,
} from '@earendil-works/pi-coding-agent'

const [extensionPath, profile, cwd] = process.argv.slice(2)
if (extensionPath === undefined || profile === undefined || cwd === undefined) {
  throw new Error('Expected extension path, Pi profile directory, and working directory')
}
mkdirSync(profile, { recursive: true })
mkdirSync(cwd, { recursive: true })
process.env.DSH_BRIDGE_COMMAND = 'node'
process.env.DSH_BRIDGE_ARGS_JSON = JSON.stringify([
  '--import',
  '/opt/harness/node_modules/tsx/dist/esm/index.mjs',
  '/opt/harness/node_modules/@truly-private/dsh-host-bridge/test-support/fake-acp-server.ts',
  'success',
])
process.env.DSH_BRIDGE_PERMISSION = 'allow'
process.env.DSH_BRIDGE_WORKSPACE_ROOT = cwd

const settingsManager = SettingsManager.inMemory()
settingsManager.setProjectTrusted(true)
const resourceLoader = new DefaultResourceLoader({
  cwd,
  agentDir: profile,
  settingsManager,
  additionalExtensionPaths: [extensionPath],
  noSkills: true,
  noPromptTemplates: true,
  noThemes: true,
  noContextFiles: true,
})
await resourceLoader.reload({ resolveProjectTrust: async () => true })
const extensionErrors = resourceLoader.getExtensions().errors
if (extensionErrors.length > 0) throw new Error(JSON.stringify(extensionErrors))

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
  if (tool === undefined) throw new Error('Pi did not activate the dsh_delegate tool')
  const result = await tool.execute(
    'pi-clean-room',
    { prompt: '你好 from clean-room Pi 👋' },
    undefined,
    undefined,
  )
  const details = result.details as { sessionId: string | null; status: string; meta: { cleanup: string } }
  if (details.status !== 'completed' || details.meta.cleanup !== 'clean') {
    throw new Error(`Unexpected Pi bridge result: ${JSON.stringify(result)}`)
  }
  process.stdout.write(`${JSON.stringify({
    host: 'pi',
    hostVersion: process.env.CLEANROOM_HOST_VERSION,
    extension: tool.name,
    status: details.status,
    cleanup: details.meta.cleanup,
    sessionId: details.sessionId === null ? null : '<session>',
    text: result.content,
  })}\n`)
} finally {
  session.dispose()
}
