import { realpath, stat } from 'node:fs/promises'
import { isAbsolute, relative } from 'node:path'
import type { BridgeErrorCode } from './protocol.ts'

export class WorkspaceError extends Error {
  constructor(readonly code: Extract<BridgeErrorCode, 'BRIDGE_WORKSPACE_UNAVAILABLE' | 'BRIDGE_WORKSPACE_OUTSIDE_ROOT'>, message: string) {
    super(message)
  }
}

async function canonicalDirectory(path: string | null): Promise<string> {
  if (path === null || !isAbsolute(path)) {
    throw new WorkspaceError('BRIDGE_WORKSPACE_UNAVAILABLE', 'The host must provide an existing absolute workspace directory.')
  }
  try {
    const canonical = await realpath(path)
    if (!(await stat(canonical)).isDirectory()) throw new Error('not a directory')
    return canonical
  } catch {
    throw new WorkspaceError('BRIDGE_WORKSPACE_UNAVAILABLE', 'The configured workspace directory is unavailable.')
  }
}

/** Canonicalize the host cwd and require it to remain below the configured root. */
export async function resolveWorkspace(hostCwd: string | null, configuredRoot: string | null): Promise<string> {
  const root = await canonicalDirectory(configuredRoot ?? hostCwd)
  const cwd = await canonicalDirectory(hostCwd ?? configuredRoot)
  const displacement = relative(root, cwd)
  if (displacement === '..' || displacement.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || isAbsolute(displacement)) {
    throw new WorkspaceError('BRIDGE_WORKSPACE_OUTSIDE_ROOT', 'The host workspace is outside the configured workspace root.')
  }
  return cwd
}
