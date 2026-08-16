/** Versioned host-facing request and result fields shared by every adapter. */

export const BRIDGE_VERSION = 1 as const
export const ADAPTER_VERSION = '0.1.0-candidate.0'

export type BridgeHost = 'pi' | 'omp' | 'hermes'
export type BridgeStatus = 'completed' | 'canceled' | 'denied' | 'failed' | 'incompatible'
export type BridgeCleanup = 'clean' | 'forced' | 'failed'

export type BridgeErrorCode =
  | 'BRIDGE_CANCELED'
  | 'BRIDGE_APPROVAL_DENIED'
  | 'BRIDGE_APPROVAL_UNAVAILABLE'
  | 'BRIDGE_WORKSPACE_UNAVAILABLE'
  | 'BRIDGE_WORKSPACE_OUTSIDE_ROOT'
  | 'BRIDGE_ENV_NOT_ALLOWED'
  | 'BRIDGE_HOST_VERSION'
  | 'BRIDGE_ACP_CAPABILITY'
  | 'BRIDGE_PROTOCOL'
  | 'BRIDGE_CHILD_NOT_FOUND'
  | 'BRIDGE_CHILD_EXITED'
  | 'BRIDGE_REQUEST_TIMEOUT'
  | 'BRIDGE_CLEANUP_FAILED'

export interface BridgeRequest {
  version: 1
  callId: string
  prompt: string
  hostCwd: string | null
  workspaceRoot: string | null
}

export interface BridgeError {
  code: BridgeErrorCode
  message: string
  retryable: boolean
}

export interface BridgeResult {
  version: 1
  callId: string
  sessionId: string | null
  status: BridgeStatus
  content: Array<{ type: 'text'; text: string }>
  error: BridgeError | null
  meta: {
    host: BridgeHost
    adapterVersion: string
    acpVersion: string | null
    cleanup: BridgeCleanup
  }
}

export interface BridgeConfig {
  command: string
  args: string[]
  workspaceRoot: string | null
  envAllowlist: string[]
  permission: 'interactive' | 'allow' | 'reject'
  cancelGraceMs: number
  requestTimeoutMs: number
}

export type PermissionDecision = (request: {
  title: string
  options: Array<{ optionId: string; name: string; kind: string }>
}) => Promise<boolean | undefined>

export function bridgeFailure(
  host: BridgeHost,
  callId: string,
  status: Exclude<BridgeStatus, 'completed'>,
  code: BridgeErrorCode,
  message: string,
  cleanup: BridgeCleanup = 'clean',
  sessionId: string | null = null,
): BridgeResult {
  return {
    version: BRIDGE_VERSION,
    callId,
    sessionId,
    status,
    content: [],
    error: { code, message, retryable: code === 'BRIDGE_CHILD_EXITED' || code === 'BRIDGE_REQUEST_TIMEOUT' || code === 'BRIDGE_CLEANUP_FAILED' },
    meta: { host, adapterVersion: ADAPTER_VERSION, acpVersion: null, cleanup },
  }
}
