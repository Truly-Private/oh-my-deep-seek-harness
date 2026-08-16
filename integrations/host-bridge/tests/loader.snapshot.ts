import { spawnSync } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'
import { buildChildEnvironment } from '../src/environment.ts'

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url))
const extensionPath = fileURLToPath(new URL('../src/pi/index.ts', import.meta.url))
const fakeServer = fileURLToPath(new URL('../test-support/fake-acp-server.ts', import.meta.url))
const hostToolSmoke = fileURLToPath(new URL('../test-support/pi-host-tool-smoke.ts', import.meta.url))
const tsxLoader = createRequire(import.meta.url).resolve('tsx/esm')

it('loads the candidate extension through the real Pi RPC host and executes its active tool', async () => {
  const profile = await mkdtemp(join(tmpdir(), 'dsh-pi-loader-snapshot-'))
  const workspace = await mkdtemp(join(tmpdir(), 'dsh-pi-host-tool-snapshot-'))
  try {
    const baseEnv = buildChildEnvironment([], process.env)
    const result = spawnSync(
      process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
      [
        '--filter', '@truly-private/dsh-host-bridge', 'exec', 'pi',
        '--mode', 'rpc', '--offline', '--no-session', '--no-extensions',
        '--extension', extensionPath,
      ],
      {
        cwd: repositoryRoot,
        env: {
          ...baseEnv,
          DSH_BRIDGE_ARGS_JSON: '[]',
          DSH_BRIDGE_COMMAND: process.execPath,
          PI_CODING_AGENT_DIR: profile,
        },
        encoding: 'utf8',
        input: '{"type":"get_commands","id":"loader-snapshot"}\n',
      },
    )
    expect(result.status, result.stderr).toBe(0)
    const responseLine = result.stdout
      .split('\n')
      .find(line => line.startsWith('{') && line.includes('"id":"loader-snapshot"'))
    if (responseLine === undefined) throw new Error(`Pi RPC response missing from stdout:\n${result.stdout}`)
    const response = JSON.parse(responseLine) as {
      id: string
      type: string
      command: string
      success: boolean
      data: { commands: Array<{ name: string, description: string, source: string }> }
    }
    expect({
      id: response.id,
      type: response.type,
      command: response.command,
      success: response.success,
      commands: response.data.commands
        .filter(command => command.name === 'dsh-bridge-status')
        .map(command => ({ name: command.name, description: command.description, source: command.source })),
    }).toMatchInlineSnapshot(`
      {
        "command": "get_commands",
        "commands": [
          {
            "description": "Show the configured DeepSeek Harness bridge status.",
            "name": "dsh-bridge-status",
            "source": "extension",
          },
        ],
        "id": "loader-snapshot",
        "success": true,
        "type": "response",
      }
    `)

    const execution = spawnSync(
      process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
      [
        '--filter', '@truly-private/dsh-host-bridge', 'exec', 'tsx',
        hostToolSmoke, extensionPath, profile, workspace,
      ],
      {
        cwd: repositoryRoot,
        env: {
          ...baseEnv,
          DSH_BRIDGE_ARGS_JSON: JSON.stringify(['--import', tsxLoader, fakeServer, 'success']),
          DSH_BRIDGE_COMMAND: process.execPath,
          DSH_BRIDGE_PERMISSION: 'allow',
          DSH_BRIDGE_WORKSPACE_ROOT: workspace,
        },
        encoding: 'utf8',
      },
    )
    expect(execution.status, execution.stderr).toBe(0)
    const executionLine = execution.stdout.split('\n').find(line => line.startsWith('{'))
    if (executionLine === undefined) throw new Error(`Pi host tool result missing from stdout:\n${execution.stdout}`)
    expect(JSON.parse(executionLine)).toMatchInlineSnapshot(`
      {
        "host": "pi",
        "result": {
          "content": [
            {
              "text": "fixture: 你好 from real Pi host 👋",
              "type": "text",
            },
          ],
          "details": {
            "callId": "pi-host-smoke",
            "content": [
              {
                "text": "fixture: 你好 from real Pi host 👋",
                "type": "text",
              },
            ],
            "error": null,
            "meta": {
              "acpVersion": "1",
              "adapterVersion": "0.1.0-candidate.0",
              "cleanup": "clean",
              "host": "pi",
            },
            "sessionId": "<session>",
            "status": "completed",
            "version": 1,
          },
        },
        "tool": "dsh_delegate",
      }
    `)
  } finally {
    await Promise.all([
      rm(profile, { recursive: true, force: true }),
      rm(workspace, { recursive: true, force: true }),
    ])
  }
})
