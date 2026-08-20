/**
 * Shared mounting for the services required before tests load the concrete
 * agent loop. The caller retains ownership of the context, loop, adapters,
 * optional plugins, and teardown.
 * @module @truly-private/omdsh-agent-loop-testkit
 */

import type { Context } from '@deepseek-ai/cordis'
import AgentRegistry from '@truly-private/omdsh-agent'
import LlmRuntime from '@truly-private/omdsh-llm'
import SessionStore from '@truly-private/omdsh-session'
import SystemPrompt from '@truly-private/omdsh-system-prompt'
import type { Config as SystemPromptConfig } from '@truly-private/omdsh-system-prompt'
import ToolRuntime from '@truly-private/omdsh-tools'
import type { Config as ToolRuntimeConfig } from '@truly-private/omdsh-tools'

/** Configuration forwarded to the prerequisite service plugins. */
export interface AgentLoopTestDependenciesOptions {
  /** Configuration for the system-prompt registry. */
  readonly systemPrompt?: SystemPromptConfig
  /** Configuration for the tool registry. */
  readonly tools?: ToolRuntimeConfig
}

/**
 * Mount the standard prerequisite services for an AgentLoop test.
 *
 * The function deliberately does not mount AgentLoop or register an adapter,
 * so tests retain control of load order and the topology under test. The
 * context owns every mounted service and remains responsible for disposal. A
 * plugin-load failure rejects the promise; services activated earlier in the
 * sequence remain context-owned and unwind with that context.
 * @param ctx - test context that owns the mounted services.
 * @param options - optional service configuration forwarded without mutation.
 * @returns after every prerequisite service has activated.
 */
export async function mountAgentLoopTestDependencies(
  ctx: Context,
  options: AgentLoopTestDependenciesOptions = {},
): Promise<void> {
  await ctx.plugin(LlmRuntime)
  await ctx.plugin(SessionStore)
  await ctx.plugin(SystemPrompt, options.systemPrompt ?? {})
  await ctx.plugin(ToolRuntime, options.tools ?? {})
  await ctx.plugin(AgentRegistry)
}
