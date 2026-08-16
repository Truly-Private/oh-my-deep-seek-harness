import { readBridgeConfig } from './config.ts'
import { runBridge } from './acp-client.ts'
import { BRIDGE_VERSION, type BridgeHost, type BridgeResult } from './protocol.ts'

export interface HostExecutionContext {
  cwd: string
  hasUI: boolean
  confirm(title: string, message: string): Promise<boolean>
}

/** Create one host tool execution function from immutable extension configuration. */
export function createHostExecutor(host: BridgeHost, env: NodeJS.ProcessEnv = process.env) {
  const config = readBridgeConfig(env)
  return async (callId: string, prompt: string, signal: AbortSignal | undefined, context: HostExecutionContext): Promise<BridgeResult> => {
    return await runBridge(
      host,
      { version: BRIDGE_VERSION, callId, prompt, hostCwd: context.cwd, workspaceRoot: config.workspaceRoot },
      config,
      signal,
      async request => {
        if (!context.hasUI) return undefined
        return await context.confirm(request.title, request.options.map(option => `${option.name} (${option.kind})`).join('\n'))
      },
    )
  }
}
