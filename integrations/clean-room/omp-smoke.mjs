import { mkdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

mkdirSync('/tmp/omp-profile', { recursive: true })
mkdirSync('/tmp/workspace', { recursive: true })
mkdirSync('/tmp/home', { recursive: true })

const execution = spawnSync(
  'bun',
  [
    '/opt/harness/node_modules/@oh-my-pi/pi-coding-agent/dist/cli.js',
    '--mode', 'rpc',
    '--api-key', 'keyless-clean-room-placeholder',
    '--model', 'openai/gpt-4o',
    '--no-session',
    '--no-extensions',
    '--extension', '/opt/harness/node_modules/@truly-private/dsh-host-bridge/src/omp/index.ts',
  ],
  {
    input: '{"type":"get_commands","id":"clean-room-omp"}\n',
    encoding: 'utf8',
    env: {
      ...process.env,
      HOME: '/tmp/home',
      DSH_BRIDGE_COMMAND: 'node',
      DSH_BRIDGE_ARGS_JSON: JSON.stringify([
        '--import',
        '/opt/harness/node_modules/tsx/dist/esm/index.mjs',
        '/opt/harness/node_modules/@truly-private/dsh-host-bridge/test-support/fake-acp-server.ts',
        'success',
      ]),
      DSH_BRIDGE_PERMISSION: 'allow',
      DSH_BRIDGE_WORKSPACE_ROOT: '/tmp/workspace',
    },
  },
)

if (execution.status !== 0) {
  throw new Error(`OMP exited with ${String(execution.status)}\nstdout:\n${execution.stdout}\nstderr:\n${execution.stderr}`)
}
if (!execution.stdout.includes('dsh-bridge-status')) {
  throw new Error(`OMP did not expose dsh-bridge-status:\n${execution.stdout}`)
}

process.stdout.write(`${JSON.stringify({
  host: 'omp',
  hostVersion: process.env.CLEANROOM_HOST_VERSION,
  extension: 'dsh-bridge-status',
  status: 'loaded',
})}\n`)
