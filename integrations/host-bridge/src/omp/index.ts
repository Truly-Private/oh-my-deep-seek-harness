import type { ExtensionAPI } from '@oh-my-pi/pi-coding-agent'
import { createHostExecutor } from '../adapter.ts'

/** Register the candidate DeepSeek Harness delegation tool for Oh My Pi. */
export default function registerOmpBridge(omp: ExtensionAPI): void {
  if (
    typeof omp.registerTool !== 'function'
    || typeof omp.registerCommand !== 'function'
    || typeof omp.zod?.object !== 'function'
    || typeof omp.zod?.string !== 'function'
  ) {
    throw new Error('BRIDGE_HOST_VERSION: OMP requires registerTool, registerCommand, and zod schema builders')
  }
  const execute = createHostExecutor('omp')
  const z = omp.zod
  omp.registerTool({
    name: 'dsh_delegate',
    label: 'DeepSeek Harness',
    description: 'Delegate one bounded task to the configured DeepSeek Harness ACP runtime.',
    approval: 'exec',
    parameters: z.object({
      prompt: z.string().min(1).describe('The task to delegate to DeepSeek Harness.'),
    }),
    async execute(toolCallId, params, signal, _onUpdate, ctx) {
      const input = params as { prompt: string }
      const details = await execute(toolCallId, input.prompt, signal, {
        cwd: ctx.cwd,
        hasUI: ctx.hasUI,
        confirm: (title, message) => ctx.ui.confirm(title, message),
      })
      return { content: details.content.length > 0 ? details.content : [{ type: 'text', text: JSON.stringify(details) }], details }
    },
  })
  omp.registerCommand('dsh-bridge-status', {
    description: 'Show the configured DeepSeek Harness bridge status.',
    handler: async (_args, ctx) => {
      ctx.ui.notify('DeepSeek Harness ACP bridge loaded (candidate).', 'info')
    },
  })
}
