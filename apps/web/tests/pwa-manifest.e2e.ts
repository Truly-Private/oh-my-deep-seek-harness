import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { expect, it } from 'vitest'

const DIST_ROOT = fileURLToPath(new URL('../dist', import.meta.url))

it('ships install metadata with the built web application', async () => {
  const index = await readFile(join(DIST_ROOT, 'index.html'), 'utf8')
  expect(index).toContain('<html lang="en">')
  expect(index).toContain('<link rel="manifest" href="/manifest.webmanifest" />')
  expect(index).toContain('<link rel="icon" type="image/jpeg" href="/omdsh-icon.jpg" />')

  const manifest: unknown = JSON.parse(await readFile(join(DIST_ROOT, 'manifest.webmanifest'), 'utf8'))
  expect(manifest).toEqual({
    id: '/',
    name: 'DeepSeek Harness',
    short_name: 'DSH',
    start_url: '/',
    scope: '/',
    display: 'fullscreen',
    icons: [{
      src: '/omdsh-icon.jpg',
      sizes: '351x351',
      type: 'image/jpeg',
      purpose: 'any',
    }],
  })
})

it('ships the owned JPEG logo and square browser icon', async () => {
  const logo = await readFile(join(DIST_ROOT, 'omdsh-logo.jpg'))
  const icon = await readFile(join(DIST_ROOT, 'omdsh-icon.jpg'))
  expect([...logo.subarray(0, 2)]).toEqual([0xff, 0xd8])
  expect([...icon.subarray(0, 2)]).toEqual([0xff, 0xd8])
  expect(logo.byteLength).toBeGreaterThan(10_000)
  expect(icon.byteLength).toBeGreaterThan(10_000)
})
