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
export const processIsolatedCoverageTests = [
  'packages/shell/pwsh-local/tests/executor.spec.ts',
  'packages/shell/tool-pwsh-persistent/tests/loader-composition.spec.ts',
  'packages/terminal/terminal-bash/tests/local.spec.ts',
] as const

/** Process-bound suites safe to share one serial instrumented process. */
export const processBoundCoreCoverageTests = processBoundTests.filter(
  test => !processIsolatedCoverageTests.includes(test as typeof processIsolatedCoverageTests[number]),
)
