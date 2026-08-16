import type { BridgeErrorCode } from './protocol.ts'

const BASE_ENV = new Set([
  'LANG', 'LC_ALL', 'PATH', 'SYSTEMROOT', 'TEMP', 'TERM', 'TMP', 'TMPDIR', 'WINDIR',
])
const ENV_NAME = /^[A-Z_][A-Z0-9_]*$/

export class EnvironmentError extends Error {
  readonly code: Extract<BridgeErrorCode, 'BRIDGE_ENV_NOT_ALLOWED'> = 'BRIDGE_ENV_NOT_ALLOWED'
}

/** Build a minimal child environment plus explicitly named deployment credentials. */
export function buildChildEnvironment(allowlist: readonly string[], env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const output: NodeJS.ProcessEnv = {}
  for (const name of BASE_ENV) {
    if (env[name] !== undefined) output[name] = env[name]
  }
  for (const name of allowlist) {
    if (!ENV_NAME.test(name)) throw new EnvironmentError(`Invalid environment allowlist name: ${name}`)
    if (env[name] !== undefined) output[name] = env[name]
  }
  return output
}
