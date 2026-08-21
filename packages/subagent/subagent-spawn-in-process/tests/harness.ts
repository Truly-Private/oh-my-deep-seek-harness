import { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@truly-private/omdsh-agent'
import AgentLoop from '@truly-private/omdsh-agent-loop'
import { mountAgentLoopTestDependencies } from '@truly-private/omdsh-agent-loop-testkit'
import { LocalBashExecutor } from '@truly-private/omdsh-bash-local'
import * as BashEnvPlugin from '@truly-private/omdsh-shell-env'
import LocalSubprocessRuntime from '@truly-private/omdsh-subprocess-local'
import * as ToolBash from '@truly-private/omdsh-tool-bash'
import * as LlmDeepSeek from '@truly-private/omdsh-llm-deepseek'
import SubagentRuntime from '@truly-private/omdsh-subagent'
import * as Spawn from '../src/index.ts'
import * as ToolSubagent from '@truly-private/omdsh-tool-subagent'

/**
 * Shared harness for the spawn-backend e2e: the full real stack (DeepSeek
 * adapter + real bash tool + the subagent tool bound to the spawn backend), so
 * a real parent agent can delegate to a real in-process child that does real
 * work (writes a file). Lives outside the *.e2e.ts pattern so importing it never
 * re-registers another file's tests.
 */
export async function spawnHarness(workdir: string): Promise<Context> {
  const ctx = new Context()
  // This harness installs only the global default persona, so both parent and
  // spawned children render it. It stays neutral for both roles; the
  // delegation nudge lives in the e2e's user prompt and the subagent tool's
  // own description.
  await mountAgentLoopTestDependencies(ctx, {
    systemPrompt: { persona: 'You are a coding agent. Report only when the requested work is done.' },
  })
  await ctx.plugin(AgentLoop, { agents: [] })
  await ctx.plugin(LlmDeepSeek)
  await ctx.plugin(LocalSubprocessRuntime)
  await ctx.plugin(BashEnvPlugin)
  await ctx.plugin(LocalBashExecutor, { cwd: workdir, timeoutMs: 30_000 })
  await ctx.plugin(ToolBash)
  await ctx.plugin(SubagentRuntime)
  await ctx.plugin(Spawn, { providerName: 'spawn' })
  // The model-facing subagent tool, bound to the spawn backend.
  await ctx.plugin(ToolSubagent, { provider: 'spawn' })
  return ctx
}

export function waitForIdle(ctx: Context, agent: Agent): Promise<void> {
  return new Promise((resolve) => {
    const dispose = ctx.on('agent/status', ({ agent: subject, status }) => {
      if (subject === agent && status === 'idle') {
        dispose()
        resolve()
      }
    })
  })
}
