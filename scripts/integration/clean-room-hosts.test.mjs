import assert from 'node:assert/strict'
import test from 'node:test'
import { dockerRunArgs, readVersions } from './clean-room-hosts.mjs'

test('uses the reviewed compatibility pins by default', () => {
  const versions = readVersions({})
  assert.equal(versions.piVersion, '0.84.2')
  assert.equal(versions.ompVersion, '17.3.4')
  assert.equal(versions.hermesVersion, '0.16.0')
  assert.match(versions.baseImage, /^ubuntu:24\.04@sha256:[a-f0-9]{64}$/)
})

test('allows deliberate host-version probes without changing the defaults', () => {
  const versions = readVersions({
    CLEANROOM_PI_VERSION: '0.84.3',
    CLEANROOM_OMP_VERSION: '17.3.5',
    CLEANROOM_HERMES_VERSION: '0.20.2',
  })
  assert.equal(versions.piVersion, '0.84.3')
  assert.equal(versions.ompVersion, '17.3.5')
  assert.equal(versions.hermesVersion, '0.20.2')
})

test('runtime containers have no network, writable root, capabilities, or host credentials', () => {
  const args = dockerRunArgs('example:test')
  assert.deepEqual(args.slice(0, 2), ['run', '--rm'])
  assert.deepEqual(args.slice(args.indexOf('--network'), args.indexOf('--network') + 2), ['--network', 'none'])
  assert.ok(args.includes('--read-only'))
  assert.deepEqual(args.slice(args.indexOf('--cap-drop'), args.indexOf('--cap-drop') + 2), ['--cap-drop', 'ALL'])
  assert.deepEqual(args.slice(args.indexOf('--security-opt'), args.indexOf('--security-opt') + 2), ['--security-opt', 'no-new-privileges'])
  assert.equal(args.some(value => value.startsWith('--volume') || value.startsWith('-v')), false)
  assert.equal(args.at(-1), 'example:test')
})
