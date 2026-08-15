import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const COMMIT_PATTERN = /^[0-9a-f]{40}$/
const REVIEW_STATUSES = new Set(['candidate', 'reviewed', 'rejected'])
const TRUSTED_PRIMARY_URL = 'https://github.com/deepseek-ai/deepseek-harness.git'
const TRUSTED_INSPIRATION_URL = 'https://github.com/yuanchenglu/oh-my-deepseek-harness.git'

/**
 * Validate the upstream record independently of the local git checkout.
 * @param {unknown} value Parsed JSON value.
 * @returns {string[]} Human-readable validation failures.
 */
export function validateManifest(value) {
  const errors = []
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return ['manifest must be an object']

  const manifest = value
  if (manifest.schemaVersion !== 1) errors.push('schemaVersion must equal 1')
  validateSource(errors, manifest.primary, 'primary', TRUSTED_PRIMARY_URL, true)
  validateSource(errors, manifest.inspiration, 'inspiration', TRUSTED_INSPIRATION_URL, false)

  const review = manifest.review
  if (typeof review !== 'object' || review === null || Array.isArray(review)) {
    errors.push('review must be an object')
  } else if (!REVIEW_STATUSES.has(review.status)) {
    errors.push('review.status must be candidate, reviewed, or rejected')
  } else if (review.status === 'reviewed') {
    if (review.reviewedCommit !== manifest.primary?.commit) errors.push('review.reviewedCommit must match primary.commit')
    if (typeof review.reviewedAt !== 'string' || Number.isNaN(Date.parse(review.reviewedAt))) errors.push('review.reviewedAt must be an ISO timestamp')
    if (!Array.isArray(review.evidence) || review.evidence.length === 0 || review.evidence.some(item => typeof item !== 'string' || item.trim() === '')) {
      errors.push('review.evidence must contain at least one non-empty evidence identifier')
    }
  } else {
    if (review.reviewedCommit !== null) errors.push('an unreviewed record must set review.reviewedCommit to null')
    if (review.reviewedAt !== null) errors.push('an unreviewed record must set review.reviewedAt to null')
    if (!Array.isArray(review.evidence) || review.evidence.length !== 0) errors.push('an unreviewed record must have an empty review.evidence array')
  }

  const policy = manifest.policy
  if (typeof policy !== 'object' || policy === null || Array.isArray(policy)) {
    errors.push('policy must be an object')
  } else {
    if (policy.automaticMerge !== false) errors.push('policy.automaticMerge must be false')
    if (policy.humanApprovalRequired !== true) errors.push('policy.humanApprovalRequired must be true')
    if (policy.releaseRequiresReviewedStatus !== true) errors.push('policy.releaseRequiresReviewedStatus must be true')
  }

  return errors
}

function validateSource(errors, source, label, trustedUrl, requireBranch) {
  if (typeof source !== 'object' || source === null || Array.isArray(source)) {
    errors.push(`${label} must be an object`)
    return
  }
  if (source.url !== trustedUrl) errors.push(`${label}.url must equal ${trustedUrl}`)
  if (!COMMIT_PATTERN.test(source.commit ?? '')) errors.push(`${label}.commit must be a lowercase 40-character git commit`)
  if (requireBranch && (typeof source.branch !== 'string' || source.branch.trim() === '')) errors.push(`${label}.branch must be a non-empty string`)
}

function assertPrimaryCommitIsAncestor(commit) {
  const exists = spawnSync('git', ['cat-file', '-e', `${commit}^{commit}`], { stdio: 'ignore' })
  if (exists.status !== 0) throw new Error(`primary commit ${commit} is absent from this checkout`)
  const ancestor = spawnSync('git', ['merge-base', '--is-ancestor', commit, 'HEAD'], { stdio: 'ignore' })
  if (ancestor.status !== 0) throw new Error(`primary commit ${commit} is not an ancestor of HEAD`)
}

async function main() {
  const manifestUrl = new URL('../../security/upstream-lock.json', import.meta.url)
  const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'))
  const errors = validateManifest(manifest)
  if (errors.length > 0) throw new Error(`invalid upstream lock:\n- ${errors.join('\n- ')}`)
  assertPrimaryCommitIsAncestor(manifest.primary.commit)
  process.stdout.write(`upstream lock valid: ${manifest.primary.commit} (${manifest.review.status})\n`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    process.stderr.write(`${error.message}\n`)
    process.exitCode = 1
  })
}
