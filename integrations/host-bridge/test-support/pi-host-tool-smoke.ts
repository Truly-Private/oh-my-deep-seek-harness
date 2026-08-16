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
    'pi-host-smoke',
    { prompt: '你好 from real Pi host 👋' },
    undefined,
    undefined,
  )
  const details = result.details as { sessionId: string | null }
  process.stdout.write(`${JSON.stringify({
    host: 'pi',
    tool: tool.name,
    result: {
      ...result,
      details: { ...result.details, sessionId: details.sessionId === null ? null : '<session>' },
    },
  })}\n`)
} finally {
  session.dispose()
}
