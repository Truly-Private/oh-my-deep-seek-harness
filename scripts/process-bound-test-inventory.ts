/** Suites whose process-global state or subprocess timing requires forked Vitest workers. */
export const processBoundTests = [
  'packages/session/session-persistence-jsonl/tests/jsonl.spec.ts',
  'packages/subagent/subagent-acp/tests/subagent-acp.spec.ts',
  'packages/subprocess/subprocess-local/tests/process-exit.spec.ts',
  'packages/subprocess/subprocess-local/tests/spawn.spec.ts',
  'packages/context/time-context/tests/time-context.spec.ts',
  'packages/llm/llm-pi-ai/tests/adapter.spec.ts',
  'packages/boot/app-boot/tests/app-boot.spec.ts',
  'packages/boot/app-boot/tests/hmr-config.spec.ts',
  'packages/shell/pwsh-local/tests/executor.spec.ts',
  'packages/shell/tool-pwsh-persistent/tests/loader-composition.spec.ts',
  'packages/terminal/terminal-bash/tests/local.spec.ts',
  'packages/workflow/workflow-worker-thread/tests/session.spec.ts',
  'packages/workflow/workflow-worker-thread/tests/workflow-worker-thread.spec.ts',
] as const

/** Real PowerShell and PTY suites that each require a fresh instrumented process. */
const processIsolatedCoverageCandidates = [
  'packages/shell/pwsh-local/tests/executor.spec.ts',
  'packages/shell/tool-pwsh-persistent/tests/loader-composition.spec.ts',
  'packages/terminal/terminal-bash/tests/local.spec.ts',
] as const

// The terminal package's POSIX suite is unsupported on Windows and the current
// Vitest project excludes the complete file there. Do not launch a one-file
// coverage process that can only report "No test files found".
const processCoverageTests = processBoundTests.filter(test =>
  process.platform !== 'win32'
  || test !== 'packages/terminal/terminal-bash/tests/local.spec.ts')

/** Platform-runnable real PowerShell and PTY suites that need fresh coverage processes. */
export const processIsolatedCoverageTests = processIsolatedCoverageCandidates.filter(test =>
  processCoverageTests.includes(test))

const processIsolatedCoverageTestSet: ReadonlySet<string> = new Set(processIsolatedCoverageTests)

/** Process-bound suites safe to share one serial instrumented process. */
export const processBoundCoreCoverageTests = processCoverageTests.filter(
  test => !processIsolatedCoverageTestSet.has(test),
)
