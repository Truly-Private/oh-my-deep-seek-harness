import { access, mkdir, mkdtemp, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  COVERAGE_PARTITION_MODE_ENV,
  COVERAGE_PARTITIONS_ENV,
  COVERAGE_TEST_TIMEOUT_ENV,
  CoveragePartitionCoordinator,
  coverageTestTimeoutArgs,
  forwardedCoverageArgs,
  parseCoveragePartitionCount,
  type CoverageCommand,
  type CoverageCommandResult,
} from './coverage-partitions.ts'
import {
  processBoundCoreCoverageTests,
  processIsolatedCoverageTests,
} from './process-bound-test-inventory.ts'

const passed: CoverageCommandResult = { exitCode: 0, signalCode: null }
const processCoverageLabels = [
  'process-bound core coverage',
  ...processIsolatedCoverageTests.map(test => `isolated coverage: ${test}`),
]

afterEach(() => vi.restoreAllMocks())

async function writeBlob(command: CoverageCommand): Promise<void> {
  if (command.blobPath === undefined) return
  await mkdir(dirname(command.blobPath), { recursive: true })
  await writeFile(command.blobPath, '{}')
}

async function temporaryRoot(): Promise<string> {
  return await mkdtemp(join(tmpdir(), 'dsh-coverage-partitions-'))
}

function successfulCommandRecorder(commands: CoverageCommand[]) {
  return vi.fn(async (command: CoverageCommand) => {
    commands.push(command)
    await writeBlob(command)
    return passed
  })
}

describe('coverage partition count', () => {
  it.each([
    [undefined, undefined],
    ['', undefined],
    ['2', 2],
    ['3', 3],
  ])('parses %j as %j', (raw, expected) => {
    expect(parseCoveragePartitionCount(raw)).toBe(expected)
  })

  it.each(['0', '1', '2.5', '02', 'many'])('rejects %j', (raw) => {
    expect(() => parseCoveragePartitionCount(raw))
      .toThrow(`${COVERAGE_PARTITIONS_ENV} must be an integer greater than 1`)
  })
})

describe('coverage partition timeout', () => {
  it('applies one configured timeout to tests and polling', () => {
    expect(coverageTestTimeoutArgs('30000')).toEqual([
      '--testTimeout=30000',
      '--expect.poll.timeout=30000',
    ])
  })

  it('keeps Vitest defaults when the timeout is absent', () => {
    expect(coverageTestTimeoutArgs(undefined)).toEqual([])
  })

  it('rejects invalid timeout input', () => {
    expect(() => coverageTestTimeoutArgs('0'))
      .toThrow(`${COVERAGE_TEST_TIMEOUT_ENV} must be a positive integer`)
  })
})

describe('coverage forwarded arguments', () => {
  it('removes one package-script separator', () => {
    expect(forwardedCoverageArgs(['--', 'scripts/example.spec.ts'])).toEqual(['scripts/example.spec.ts'])
  })

  it('preserves direct arguments and a subsequent Vitest separator', () => {
    expect(forwardedCoverageArgs(['--testNamePattern=example'])).toEqual(['--testNamePattern=example'])
    expect(forwardedCoverageArgs(['--', '--', 'example'])).toEqual(['--', 'example'])
  })
})

describe('coverage partition coordinator', () => {
  it('runs thread-safe partitions, then fresh process-bound coverage passes, before one merged threshold check', async () => {
    const root = await temporaryRoot()
    const commands: CoverageCommand[] = []
    const runCommand = successfulCommandRecorder(commands)
    const coordinator = new CoveragePartitionCoordinator({
      root,
      partitions: 3,
      pnpmEntrypoint: '/pnpm.cjs',
      vitestArgs: ['--testTimeout=30000'],
      runCommand,
    })

    await expect(coordinator.run()).resolves.toBe(0)

    expect(commands.map(command => command.label)).toEqual([
      'partition 1/3',
      'partition 2/3',
      'partition 3/3',
      ...processCoverageLabels,
      'merged coverage report',
    ])
    for (const [index, command] of commands.slice(0, 3).entries()) {
      expect(command.command).toBe(process.execPath)
      expect(command.args[0]).toBe('/pnpm.cjs')
      expect(command.args).toEqual(expect.arrayContaining([
        '--coverage',
        '--coverage.reportOnFailure',
        '--maxWorkers=1',
        '--project=thread-safe',
        `--shard=${index + 1}/3`,
        '--reporter=default',
        '--reporter=blob',
        '--testTimeout=30000',
      ]))
      expect(command.env).toEqual({
        [COVERAGE_PARTITIONS_ENV]: undefined,
        [COVERAGE_PARTITION_MODE_ENV]: '1',
      })
    }
    const processBoundCommands = commands.slice(3, -1)
    expect(processBoundCommands).toHaveLength(processCoverageLabels.length)
    for (const command of processBoundCommands) {
      expect(command.args).toEqual(expect.arrayContaining([
        '--coverage',
        '--coverage.reportOnFailure',
        '--maxWorkers=1',
        '--project=process-bound',
        '--reporter=default',
        '--reporter=blob',
        '--testTimeout=30000',
      ]))
      expect(command.args.some(argument => argument.startsWith('--shard='))).toBe(false)
      expect(command.env).toEqual({
        [COVERAGE_PARTITIONS_ENV]: undefined,
        [COVERAGE_PARTITION_MODE_ENV]: '1',
      })
    }
    expect(processBoundCommands[0]?.args).toEqual(expect.arrayContaining(processBoundCoreCoverageTests))
    for (const [index, test] of processIsolatedCoverageTests.entries()) {
      const command = processBoundCommands[index + 1]
      expect(command?.args).toContain(test)
      expect(command?.args.filter(argument => processIsolatedCoverageTests.includes(
        argument as typeof processIsolatedCoverageTests[number],
      ))).toEqual([test])
    }
    const mergeCommand = commands.at(-1)
    if (mergeCommand === undefined) throw new Error('coverage merge command was not observed')
    expect(mergeCommand.args).toContain('--coverage')
    expect(mergeCommand.args.some(argument => argument.startsWith('--merge-reports='))).toBe(true)
    expect(mergeCommand.env).toEqual({
      [COVERAGE_PARTITIONS_ENV]: undefined,
      [COVERAGE_PARTITION_MODE_ENV]: undefined,
    })
  })

  it('runs a native pnpm entrypoint directly', async () => {
    const root = await temporaryRoot()
    const commands: CoverageCommand[] = []
    const runCommand = successfulCommandRecorder(commands)
    const coordinator = new CoveragePartitionCoordinator({
      root,
      partitions: 2,
      pnpmEntrypoint: '/tools/pnpm',
      runCommand,
    })

    await expect(coordinator.run()).resolves.toBe(0)
    expect(commands).toHaveLength(2 + processCoverageLabels.length + 1)
    for (const command of commands) {
      expect(command.command).toBe('/tools/pnpm')
      expect(command.args[0]).toBe('exec')
    }
  })

  it('waits for every thread-safe partition before starting process-bound coverage', async () => {
    const root = await temporaryRoot()
    const gate = Promise.withResolvers<undefined>()
    let activePartitions = 0
    const labels: string[] = []
    const runCommand = vi.fn(async (command: CoverageCommand) => {
      labels.push(command.label)
      if (command.label.startsWith('partition ')) {
        activePartitions += 1
        await gate.promise
        activePartitions -= 1
      }
      if (processCoverageLabels.includes(command.label)) expect(activePartitions).toBe(0)
      await writeBlob(command)
      return passed
    })
    const coordinator = new CoveragePartitionCoordinator({
      root,
      partitions: 2,
      pnpmEntrypoint: '/pnpm.cjs',
      runCommand,
    })

    const result = coordinator.run()
    await vi.waitFor(() => { expect(activePartitions).toBe(2) })
    expect(labels).toEqual(['partition 1/2', 'partition 2/2'])
    gate.resolve(undefined)

    await expect(result).resolves.toBe(0)
    expect(labels).toEqual([
      'partition 1/2',
      'partition 2/2',
      ...processCoverageLabels,
      'merged coverage report',
    ])
  })

  it('merges normal test failures and returns their failed status', async () => {
    const root = await temporaryRoot()
    const reported = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const runCommand = vi.fn(async (command: CoverageCommand) => {
      await writeBlob(command)
      return command.label === 'partition 2/2'
        ? { exitCode: 1, signalCode: null, outputTail: 'specific Vitest failure' }
        : passed
    })
    const coordinator = new CoveragePartitionCoordinator({
      root,
      partitions: 2,
      pnpmEntrypoint: '/pnpm.cjs',
      runCommand,
    })

    await expect(coordinator.run()).resolves.toBe(1)
    expect(reported).toHaveBeenCalledWith('coverage-partitions: FAIL partition 2/2 (exit 1)')
    expect(reported).toHaveBeenCalledWith(
      'coverage-partitions: output tail for partition 2/2:\nspecific Vitest failure',
    )
    expect(runCommand).toHaveBeenCalledTimes(2 + processCoverageLabels.length + 1)
  })

  it('rejects a missing partition blob before merge', async () => {
    const root = await temporaryRoot()
    const runCommand = vi.fn(async (command: CoverageCommand) => {
      if (command.label !== 'partition 2/2') await writeBlob(command)
      return passed
    })
    const coordinator = new CoveragePartitionCoordinator({
      root,
      partitions: 2,
      pnpmEntrypoint: '/pnpm.cjs',
      runCommand,
    })

    await expect(coordinator.run()).rejects.toThrow('coverage partitions produced')
    expect(runCommand).toHaveBeenCalledTimes(6)
  })

  it('reports signal termination before missing-blob validation', async () => {
    const root = await temporaryRoot()
    const reported = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const runCommand = vi.fn(async (command: CoverageCommand) => {
      if (command.label === 'partition 1/2') await writeBlob(command)
      return command.label === 'partition 2/2'
        ? { exitCode: null, signalCode: 'SIGTERM' as const }
        : passed
    })
    const coordinator = new CoveragePartitionCoordinator({
      root,
      partitions: 2,
      pnpmEntrypoint: '/pnpm.cjs',
      runCommand,
    })

    await expect(coordinator.run()).rejects.toThrow('coverage partitions produced')
    expect(reported).toHaveBeenCalledWith('coverage-partitions: FAIL partition 2/2 (signal SIGTERM)')
  })

  it('waits for every partition after one spawn failure', async () => {
    const root = await temporaryRoot()
    const reported = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    let secondFinished = false
    const runCommand = vi.fn(async (command: CoverageCommand) => {
      await writeBlob(command)
      if (command.label === 'partition 1/2') {
        return { exitCode: null, signalCode: null, error: 'spawn unavailable' }
      }
      if (command.label === 'partition 2/2') secondFinished = true
      return passed
    })
    const coordinator = new CoveragePartitionCoordinator({
      root,
      partitions: 2,
      pnpmEntrypoint: '/pnpm.cjs',
      runCommand,
    })

    await expect(coordinator.run()).resolves.toBe(1)
    expect(reported).toHaveBeenCalledWith('coverage-partitions: FAIL partition 1/2 (spawn unavailable)')
    expect(secondFinished).toBe(true)
    expect(runCommand).toHaveBeenCalledTimes(2 + processCoverageLabels.length + 1)
  })

  it('unlinks a link-shaped coverage path without touching its target', async () => {
    const root = await temporaryRoot()
    const target = await temporaryRoot()
    const marker = join(target, 'marker.txt')
    await writeFile(marker, 'owned elsewhere')
    await symlink(target, join(root, 'coverage'), process.platform === 'win32' ? 'junction' : 'dir')
    const runCommand = vi.fn(async (command: CoverageCommand) => {
      await writeBlob(command)
      return passed
    })
    const coordinator = new CoveragePartitionCoordinator({
      root,
      partitions: 2,
      pnpmEntrypoint: '/pnpm.cjs',
      runCommand,
    })

    await expect(coordinator.run()).resolves.toBe(0)
    await expect(access(marker)).resolves.toBeUndefined()
  })
})
