import { spawnSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const FINGERPRINT_PATTERN = /^([0-9a-f]{40}):(.+):([a-z0-9][a-z0-9-]*):([1-9][0-9]*)$/
const CLASSIFICATIONS = new Set(['test-fixture', 'non-secret-identifier'])
const NON_SECRET_IDENTIFIER_PATHS = new Set([
  'examples/desktop/src/renderer/tracing-index-model.js',
  'packages/session-projection/session-projection/src/index.ts',
])
const EXPECTED_TRANSLATION_PAIRING = {
  classification: 'git-blob-hash',
  findingCount: 253,
  rule: 'generic-api-key',
  pathPattern: '(^|/)[^/]+\\.i18n\\.yaml$',
  matchPattern: '^(?:[A-Za-z0-9_-]+\\.md|[A-Za-z0-9_-]+\\.zh\\.md):[ \\t]+[0-9a-f]{40}[ \\t]*$',
}

/**
 * Render the only repository-level Gitleaks exception permitted by this policy.
 * @param {typeof EXPECTED_TRANSLATION_PAIRING} pairing Translation-pair disposition.
 * @returns {string} Canonical TOML configuration.
 */
export function renderConfig(pairing) {
  return `[extend]
useDefault = true

[[allowlists]]
description = "Translation pairing records contain reviewed Git blob hashes, not credentials."
targetRules = ["${pairing.rule}"]
condition = "AND"
regexTarget = "match"
paths = ['''${pairing.pathPattern}''']
regexes = ['''${pairing.matchPattern}''']
`
}

/**
 * Validate the Gitleaks disposition manifest and its generated policy files.
 * @param {object} input Validation inputs.
 * @param {string} input.configText Checked-in Gitleaks configuration.
 * @param {string} input.ignoreText Checked-in exact fingerprint list.
 * @param {unknown} input.manifest Parsed disposition manifest.
 * @param {string} input.primaryCommit Primary commit from the upstream lock.
 * @param {(commit: string) => boolean} input.isPrimaryAncestor Commit ancestry predicate.
 * @returns {string[]} Human-readable validation failures.
 */
export function validatePolicy({ configText, ignoreText, manifest, primaryCommit, isPrimaryAncestor }) {
  const errors = []
  if (typeof manifest !== 'object' || manifest === null || Array.isArray(manifest)) return ['manifest must be an object']
  if (manifest.schemaVersion !== 1) errors.push('schemaVersion must equal 1')
  if (manifest.primaryCommit !== primaryCommit) errors.push('primaryCommit must match security/upstream-lock.json')
  if (JSON.stringify(manifest.translationPairing) !== JSON.stringify(EXPECTED_TRANSLATION_PAIRING)) {
    errors.push('translationPairing must equal the structurally constrained Git blob-hash disposition')
  }
  if (configText !== renderConfig(EXPECTED_TRANSLATION_PAIRING)) errors.push('.gitleaks.toml must equal the canonical narrow configuration')

  const records = Array.isArray(manifest.fingerprints) ? manifest.fingerprints : []
  if (!Array.isArray(manifest.fingerprints)) errors.push('fingerprints must be an array')
  const values = []
  const seen = new Set()
  for (const [index, record] of records.entries()) {
    if (typeof record !== 'object' || record === null || Array.isArray(record)) {
      errors.push(`fingerprints[${index}] must be an object`)
      continue
    }
    const value = record.value
    const match = typeof value === 'string' ? FINGERPRINT_PATTERN.exec(value) : null
    if (!match) {
      errors.push(`fingerprints[${index}].value must be an exact Gitleaks fingerprint`)
      continue
    }
    if (seen.has(value)) errors.push(`duplicate fingerprint: ${value}`)
    seen.add(value)
    values.push(value)
    const [, commit, path] = match
    if (!CLASSIFICATIONS.has(record.classification)) errors.push(`unsupported classification for ${value}`)
    if (typeof record.rationale !== 'string' || record.rationale.trim() === '') errors.push(`missing rationale for ${value}`)
    if (!isPrimaryAncestor(commit)) errors.push(`fingerprint commit is not an ancestor of the pinned primary commit: ${commit}`)
    if (record.classification === 'test-fixture' && !/(^|\/)(tests?\/|[^/]+\.(?:spec|test)\.)/.test(path)) {
      errors.push(`test-fixture fingerprint is outside a test path: ${path}`)
    }
    if (record.classification === 'non-secret-identifier' && !NON_SECRET_IDENTIFIER_PATHS.has(path)) {
      errors.push(`non-secret-identifier fingerprint is outside the reviewed path set: ${path}`)
    }
  }

  const ignoreValues = ignoreText.split(/\r?\n/u).filter(Boolean)
  const sortedValues = [...values].sort()
  if (JSON.stringify(ignoreValues) !== JSON.stringify(sortedValues)) errors.push('.gitleaksignore must equal the sorted manifest fingerprints')
  if (!Number.isInteger(manifest.totalHistoricalFindings) || manifest.totalHistoricalFindings !== EXPECTED_TRANSLATION_PAIRING.findingCount + records.length) {
    errors.push('totalHistoricalFindings must equal the structural findings plus exact fingerprints')
  }
  return errors
}

function isAncestorOfPrimary(commit, primaryCommit) {
  const exists = spawnSync('git', ['cat-file', '-e', `${commit}^{commit}`], { stdio: 'ignore' })
  if (exists.status !== 0) return false
  return spawnSync('git', ['merge-base', '--is-ancestor', commit, primaryCommit], { stdio: 'ignore' }).status === 0
}

async function main() {
  const root = new URL('../../', import.meta.url)
  const [configText, ignoreText, manifestText, upstreamText] = await Promise.all([
    readFile(new URL('.gitleaks.toml', root), 'utf8'),
    readFile(new URL('.gitleaksignore', root), 'utf8'),
    readFile(new URL('security/gitleaks-dispositions.json', root), 'utf8'),
    readFile(new URL('security/upstream-lock.json', root), 'utf8'),
  ])
  const manifest = JSON.parse(manifestText)
  const upstream = JSON.parse(upstreamText)
  const errors = validatePolicy({
    configText,
    ignoreText,
    manifest,
    primaryCommit: upstream.primary.commit,
    isPrimaryAncestor: commit => isAncestorOfPrimary(commit, upstream.primary.commit),
  })
  if (errors.length > 0) throw new Error(`invalid Gitleaks policy:\n- ${errors.join('\n- ')}`)
  process.stdout.write(`Gitleaks policy valid: ${manifest.translationPairing.findingCount} structural hashes and ${manifest.fingerprints.length} exact inherited fingerprints\n`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    process.stderr.write(`${error.message}\n`)
    process.exitCode = 1
  })
}
