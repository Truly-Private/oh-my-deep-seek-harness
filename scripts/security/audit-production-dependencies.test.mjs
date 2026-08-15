import assert from 'node:assert/strict'
import test from 'node:test'

import { blockingVulnerabilityCount } from './audit-production-dependencies.mjs'

test('accepts a report without high or critical findings', () => {
  assert.equal(blockingVulnerabilityCount({ metadata: { vulnerabilities: { high: 0, critical: 0 } } }), 0)
})

test('counts high and critical findings', () => {
  assert.equal(blockingVulnerabilityCount({ metadata: { vulnerabilities: { high: 2, critical: 1 } } }), 3)
})

test('rejects a report without severity metadata', () => {
  assert.throws(() => blockingVulnerabilityCount({ metadata: {} }), /metadata\.vulnerabilities/)
})
