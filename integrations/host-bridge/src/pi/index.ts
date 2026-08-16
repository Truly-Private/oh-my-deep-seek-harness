import type { ExtensionAPI } from '@earendil-works/pi-coding-agent'
import { Type } from 'typebox'
import { createHostExecutor } from '../adapter.ts'

/** Register the candidate DeepSeek Harness delegation tool for Pi. */
export default function registerPiBridge(pi: ExtensionAPI): void {
  if (typeof pi.registerTool !== 'function') throw new Error('BRIDGE_HOST_VERSION: Pi registerTool is unavailable')
  const execute = createHostExecutor('pi')
  pi.registerTool({
    name: 'dsh_delegate',
    label: 'DeepSeek Harness',
    description: 'Delegate one bounded task to the configured DeepSeek Harness ACP runtime.',
    parameters: Type.Object({
      prompt: Type.String({ minLength: 1, description: 'The task to delegate to DeepSeek Harness.' }),
    }),
    async execute(toolCallId, params, signal, _onUpdate, ctx) {
      const details = await execute(toolCallId, params.prompt, signal, {
        cwd: ctx.cwd,
        hasUI: ctx.hasUI,
        confirm: (title, message) => ctx.ui.confirm(title, message),
      })
      return { content: details.content.length > 0 ? details.content : [{ type: 'text', text: JSON.stringify(details) }], details }
    },
  })
  pi.registerCommand('dsh-bridge-status', {
    description: 'Show the configured DeepSeek Harness bridge status.',
    handler: async (_args, ctx) => {
      ctx.ui.notify('DeepSeek Harness ACP bridge loaded (candidate).', 'info')
    },
  })
}
