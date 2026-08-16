import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const fixtureRoot = fileURLToPath(new URL('../conformance/', import.meta.url))
const expectedNames = [
  'acp-capability-mismatch',
  'approval-unavailable',
  'cancel-ack',
  'cancel-force-reap',
  'child-exit',
  'concurrent-isolation',
  'env-disallowed',
  'host-version-mismatch',
  'malformed-response',
  'permission-allow',
  'permission-deny',
  'success-utf8',
  'workspace-outside-root',
  'workspace-unavailable',
]

describe('language-neutral conformance fixtures', () => {
  it('publishes the complete version 1 scenario set', async () => {
    const files = (await readdir(fixtureRoot)).filter(file => file.endsWith('.json')).sort()
    expect(files).toEqual(expectedNames.map(name => `${name}.json`))
    for (const file of files) {
      const fixture = JSON.parse(await readFile(new URL(`../conformance/${file}`, import.meta.url), 'utf8')) as Record<string, unknown>
      expect(fixture.name).toBe(file.slice(0, -5))
      expect(['completed', 'canceled', 'denied', 'failed', 'incompatible']).toContain(fixture.expectedStatus)
    }
  })
})
