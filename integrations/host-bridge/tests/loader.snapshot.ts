import { spawnSync } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url))
const extensionPath = fileURLToPath(new URL('../src/pi/index.ts', import.meta.url))

it('loads the candidate extension through the real Pi RPC host', async () => {
  const profile = await mkdtemp(join(tmpdir(), 'dsh-pi-loader-snapshot-'))
  try {
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
          ...process.env,
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
  } finally {
    await rm(profile, { recursive: true, force: true })
  }
})
