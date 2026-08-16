import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import registerOmpBridge from '../src/omp/index.ts'
import registerPiBridge from '../src/pi/index.ts'
import type { BridgeResult } from '../src/protocol.ts'

const fakeServer = fileURLToPath(new URL('../test-support/fake-acp-server.ts', import.meta.url))
const tsxLoader = createRequire(import.meta.url).resolve('tsx/esm')

interface CapturedTool {
  execute(
    callId: string,
    params: { prompt: string },
    signal: AbortSignal | undefined,
    onUpdate: undefined,
    context: { cwd: string, hasUI: boolean, ui: { confirm(title: string, message: string): Promise<boolean> } },
  ): Promise<{ details: BridgeResult }>
}

async function loadedTool(host: 'pi' | 'omp', scenario: string, confirmation = true): Promise<{
  tool: CapturedTool
  root: string
  context: { cwd: string, hasUI: boolean, ui: { confirm(title: string, message: string): Promise<boolean> } }
}> {
  const root = await mkdtemp(join(tmpdir(), `dsh-${host}-adapter-`))
  Object.assign(process.env, {
    DSH_BRIDGE_COMMAND: process.execPath,
    DSH_BRIDGE_ARGS_JSON: JSON.stringify(['--import', tsxLoader, fakeServer, scenario]),
    DSH_BRIDGE_WORKSPACE_ROOT: root,
    DSH_BRIDGE_CANCEL_GRACE_MS: '250',
  })
  let tool: CapturedTool | undefined
  const registerTool = (candidate: CapturedTool): void => { tool = candidate }
  const registerCommand = vi.fn()
  if (host === 'pi') {
    registerPiBridge({ registerTool, registerCommand } as never)
  } else {
    const stringSchema = { min: vi.fn().mockReturnThis(), describe: vi.fn().mockReturnThis() }
    const zod = { string: () => stringSchema, object: (properties: unknown) => ({ properties }) }
    registerOmpBridge({ registerTool, registerCommand, zod } as never)
  }
  if (tool === undefined) throw new Error(`${host} did not register dsh_delegate`)
  return {
    tool,
    root,
    context: { cwd: root, hasUI: true, ui: { confirm: async () => confirmation } },
  }
}

describe('host extension registration', () => {
  const bridgeEnv = { DSH_BRIDGE_COMMAND: 'node', DSH_BRIDGE_ARGS_JSON: '[]' }

  it('registers exactly one Pi tool with prompt-only model arguments', () => {
    const registerTool = vi.fn()
    const registerCommand = vi.fn()
    Object.assign(process.env, bridgeEnv)
    registerPiBridge({ registerTool, registerCommand } as never)
    expect(registerTool).toHaveBeenCalledOnce()
    const tool = registerTool.mock.calls[0]?.[0]
    expect(tool.name).toBe('dsh_delegate')
    expect(tool.parameters.required).toEqual(['prompt'])
    expect(Object.keys(tool.parameters.properties)).toEqual(['prompt'])
    expect(registerCommand).toHaveBeenCalledWith('dsh-bridge-status', expect.any(Object))
  })

  it('registers a distinct OMP tool with host-owned schema and approval metadata', () => {
    const registerTool = vi.fn()
    const registerCommand = vi.fn()
    const stringSchema = { min: vi.fn().mockReturnThis(), describe: vi.fn().mockReturnThis() }
    const zod = { string: () => stringSchema, object: (properties: unknown) => ({ properties }) }
    Object.assign(process.env, bridgeEnv)
    registerOmpBridge({ registerTool, registerCommand, zod } as never)
    expect(registerTool).toHaveBeenCalledOnce()
    expect(registerTool.mock.calls[0]?.[0]).toMatchObject({ name: 'dsh_delegate', approval: 'exec' })
  })

  it('fails clearly when a host lacks registerTool', () => {
    Object.assign(process.env, bridgeEnv)
    expect(() => registerPiBridge({ registerCommand: vi.fn() } as never)).toThrow('BRIDGE_HOST_VERSION')
    expect(() => registerOmpBridge({ registerCommand: vi.fn(), zod: {} } as never)).toThrow('BRIDGE_HOST_VERSION')
  })

  it('fails at load when a host lacks another required extension API', () => {
    Object.assign(process.env, bridgeEnv)
    expect(() => registerPiBridge({ registerTool: vi.fn() } as never)).toThrow('BRIDGE_HOST_VERSION')
    expect(() => registerOmpBridge({ registerTool: vi.fn(), registerCommand: vi.fn(), zod: {} } as never)).toThrow('BRIDGE_HOST_VERSION')
  })

  for (const host of ['pi', 'omp'] as const) {
    it(`executes UTF-8 ACP success through the registered ${host} tool`, async () => {
      const loaded = await loadedTool(host, 'success')
      const result = await loaded.tool.execute(`${host}-success`, { prompt: '你好, host 👋' }, undefined, undefined, loaded.context)
      expect(result.details).toMatchObject({ status: 'completed', content: [{ text: 'fixture: 你好, host 👋' }], meta: { host } })
    })

    it(`maps a ${host} confirmation denial to the closed bridge result`, async () => {
      const loaded = await loadedTool(host, 'permission', false)
      const result = await loaded.tool.execute(`${host}-deny`, { prompt: 'permission' }, undefined, undefined, loaded.context)
      expect(result.details).toMatchObject({ status: 'denied', error: { code: 'BRIDGE_APPROVAL_DENIED' }, meta: { host } })
    })

    it(`propagates ${host} host cancellation and reaps the ACP child`, async () => {
      const loaded = await loadedTool(host, 'ignore-cancel')
      const controller = new AbortController()
      setTimeout(() => controller.abort(), 150)
      const result = await loaded.tool.execute(`${host}-cancel`, { prompt: 'cancel' }, controller.signal, undefined, loaded.context)
      expect(result.details).toMatchObject({ status: 'canceled', error: { code: 'BRIDGE_CANCELED' }, meta: { host, cleanup: 'forced' } })
    })
  }
})
