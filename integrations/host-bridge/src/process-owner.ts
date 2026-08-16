import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { once } from 'node:events'

export interface OwnedProcess {
  child: ChildProcessWithoutNullStreams
  cleanup(graceMs: number): Promise<'clean' | 'forced' | 'failed'>
}

function isRunning(child: ChildProcessWithoutNullStreams): boolean {
  return child.exitCode === null && child.signalCode === null
}

async function exitsWithin(child: ChildProcessWithoutNullStreams, ms: number): Promise<boolean> {
  if (!isRunning(child)) return true
  return await Promise.race([
    once(child, 'exit').then(() => true),
    new Promise<false>(resolve => setTimeout(() => resolve(false), ms)),
  ])
}

function signalTree(child: ChildProcessWithoutNullStreams, signal: NodeJS.Signals): void {
  if (child.pid === undefined || !isRunning(child)) return
  if (process.platform === 'win32') {
    const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore', windowsHide: true })
    killer.unref()
    return
  }
  try {
    process.kill(-child.pid, signal)
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error
  }
}

/** Spawn one detached process tree and return idempotent bounded cleanup. */
export function spawnOwned(command: string, args: readonly string[], cwd: string, env: NodeJS.ProcessEnv): OwnedProcess {
  const child = spawn(command, [...args], {
    cwd,
    env,
    detached: process.platform !== 'win32',
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  })
  child.stderr.resume()
  let cleanupPromise: Promise<'clean' | 'forced' | 'failed'> | undefined
  return {
    child,
    cleanup(graceMs) {
      cleanupPromise ??= (async () => {
        try {
          child.stdin.end()
          if (await exitsWithin(child, graceMs)) return 'clean'
          signalTree(child, 'SIGTERM')
          if (await exitsWithin(child, graceMs)) return 'forced'
          signalTree(child, 'SIGKILL')
          return (await exitsWithin(child, graceMs)) ? 'forced' : 'failed'
        } catch {
          return 'failed'
        }
      })()
      return cleanupPromise
    },
  }
}
