import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const BLOCKING_SEVERITIES = ['high', 'critical']

/**
 * Count vulnerabilities that block a reviewed release.
 * @param {unknown} value Parsed pnpm audit JSON.
 * @returns {number} Number of high or critical findings.
 */
export function blockingVulnerabilityCount(value) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('pnpm audit output must be an object')
  const vulnerabilities = value.metadata?.vulnerabilities
  if (typeof vulnerabilities !== 'object' || vulnerabilities === null || Array.isArray(vulnerabilities)) {
    throw new Error('pnpm audit output has no metadata.vulnerabilities object')
  }
  return BLOCKING_SEVERITIES.reduce((sum, severity) => {
    const count = vulnerabilities[severity]
    if (!Number.isSafeInteger(count) || count < 0) throw new Error(`pnpm audit output has an invalid ${severity} count`)
    return sum + count
  }, 0)
}

function main() {
  const audit = spawnSync('pnpm', ['audit', '--prod', '--json'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
  if (audit.error !== undefined) throw audit.error
  if (audit.status !== 0 && audit.stdout.trim() === '') {
    throw new Error(`pnpm audit failed before returning JSON: ${audit.stderr.trim() || `exit ${audit.status}`}`)
  }

  let report
  try {
    report = JSON.parse(audit.stdout)
  } catch {
    throw new Error(`pnpm audit returned invalid JSON: ${audit.stderr.trim() || 'no diagnostic'}`)
  }
  const blocking = blockingVulnerabilityCount(report)
  const counts = report.metadata.vulnerabilities
  process.stdout.write(`production audit: ${counts.low} low, ${counts.moderate} moderate, ${counts.high} high, ${counts.critical} critical\n`)
  if (blocking > 0) throw new Error(`production dependency audit found ${blocking} high or critical vulnerabilities`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main()
  } catch (error) {
    process.stderr.write(`${error.message}\n`)
    process.exitCode = 1
  }
}
