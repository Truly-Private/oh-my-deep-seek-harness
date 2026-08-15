import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { validateManifest } from './verify-upstream-lock.mjs'

const manifest = JSON.parse(await readFile(new URL('../../security/upstream-lock.json', import.meta.url), 'utf8'))

test('accepts the checked-in candidate record', () => {
  assert.deepEqual(validateManifest(manifest), [])
})

test('rejects an untrusted primary URL', () => {
  const changed = structuredClone(manifest)
  changed.primary.url = 'https://example.com/deepseek-harness.git'
  assert.match(validateManifest(changed).join('\n'), /primary\.url/)
})

test('requires reviewed evidence to match the primary commit', () => {
  const changed = structuredClone(manifest)
  changed.review = {
    status: 'reviewed',
    reviewedCommit: '0000000000000000000000000000000000000000',
    reviewedAt: '2026-08-15T22:00:00Z',
    evidence: [],
  }
  const errors = validateManifest(changed).join('\n')
  assert.match(errors, /reviewedCommit/)
  assert.match(errors, /evidence/)
})

test('rejects automatic merging', () => {
  const changed = structuredClone(manifest)
  changed.policy.automaticMerge = true
  assert.match(validateManifest(changed).join('\n'), /automaticMerge/)
})
