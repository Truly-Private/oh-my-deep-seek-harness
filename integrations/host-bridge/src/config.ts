import type { BridgeConfig } from './protocol.ts'

function positiveInteger(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback
}

/** Read immutable adapter configuration once at extension load. */
export function readBridgeConfig(env: NodeJS.ProcessEnv = process.env): BridgeConfig {
  const command = env.DSH_BRIDGE_COMMAND
  if (command === undefined || command.length === 0) throw new Error('DSH_BRIDGE_COMMAND must name the reviewed ACP launcher')
  if (env.DSH_BRIDGE_ARGS_JSON === undefined) throw new Error('DSH_BRIDGE_ARGS_JSON must explicitly configure the ACP launcher arguments')
  const parsed: unknown = JSON.parse(env.DSH_BRIDGE_ARGS_JSON)
  if (!Array.isArray(parsed) || !parsed.every(value => typeof value === 'string')) {
    throw new Error('DSH_BRIDGE_ARGS_JSON must be a JSON array of strings')
  }
  const permission = env.DSH_BRIDGE_PERMISSION ?? 'interactive'
  if (permission !== 'interactive' && permission !== 'allow' && permission !== 'reject') {
    throw new Error('DSH_BRIDGE_PERMISSION must be interactive, allow, or reject')
  }
  return {
    command,
    args: parsed,
    workspaceRoot: env.DSH_BRIDGE_WORKSPACE_ROOT ?? null,
    envAllowlist: (env.DSH_BRIDGE_ENV_ALLOWLIST ?? '')
      .split(',')
      .map(name => name.trim())
      .filter(name => name.length > 0),
    permission,
    cancelGraceMs: positiveInteger(env.DSH_BRIDGE_CANCEL_GRACE_MS, 3_000),
  }
}
