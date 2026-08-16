import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { validatePolicy } from './verify-gitleaks-policy.mjs'

const root = new URL('../../', import.meta.url)
const [configText, ignoreText, manifestText, upstreamText] = await Promise.all([
  readFile(new URL('.gitleaks.toml', root), 'utf8'),
  readFile(new URL('.gitleaksignore', root), 'utf8'),
  readFile(new URL('security/gitleaks-dispositions.json', root), 'utf8'),
  readFile(new URL('security/upstream-lock.json', root), 'utf8'),
])
const manifest = JSON.parse(manifestText)
const primaryCommit = JSON.parse(upstreamText).primary.commit
const validate = overrides => validatePolicy({
  configText,
  ignoreText,
  manifest,
  primaryCommit,
  isPrimaryAncestor: () => true,
  ...overrides,
})

test('accepts the checked-in inherited-history dispositions', () => {
  assert.deepEqual(validate(), [])
})

test('rejects a broadened Gitleaks configuration', () => {
  assert.match(validate({ configText: `${configText}\n[[allowlists]]\npaths = ['''tests/''']\n` }).join('\n'), /canonical narrow configuration/)
})

test('requires the ignore file to match the manifest exactly', () => {
  assert.match(validate({ ignoreText: ignoreText.replace(/^.*\n/u, '') }).join('\n'), /sorted manifest fingerprints/)
})

test('rejects fingerprints outside the pinned primary ancestry', () => {
  const rejectedCommit = manifest.fingerprints[0].value.slice(0, 40)
  assert.match(validate({ isPrimaryAncestor: commit => commit !== rejectedCommit }).join('\n'), /not an ancestor/)
})

test('rejects a fixture disposition outside a test path', () => {
  const changed = structuredClone(manifest)
  changed.fingerprints[0].value = changed.fingerprints[0].value.replace('apps/web/tests/models-settings.e2e.ts', 'apps/web/src/models-settings.ts')
  assert.match(validate({ manifest: changed }).join('\n'), /outside a test path/)
})
