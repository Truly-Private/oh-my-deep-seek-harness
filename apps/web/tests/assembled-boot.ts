// Shared scaffolding for the assembled-jsdom snapshots: the real built
// workspace `lib/client.js` artifacts booted through AppWebEntry's
// ModuleLoader path (loadBundle) against the keyless FixtureApiClient
// transport. Every file that mounts this graph needs the same boot entry list,
// the same bundle map, the same jsdom globals, and the same mount call, and
// differs only in what it asserts afterwards, so the scaffolding lives here.
//
// Keyless and deterministic: the fixture is the fake server, so nothing here
// reaches a model or the network.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import type { WebBootEntry } from '@truly-private/omdsh-client-modules/client'
import { AppWebEntry } from '@truly-private/omdsh-client-web'

/** Boot entries for the minimal assembled graph, each carrying the workspace bundle it loads. */
const PLUGINS: readonly (WebBootEntry & { bundlePath: string })[] = [
  { id: '@truly-private/omdsh-typert-registry', bundlePath: 'packages/typert/registry/lib/client.js', url: '/plugins/typert-registry.js', rev: 'fx', inject: [], immediately: true },
  { id: '@truly-private/omdsh-client-connection', bundlePath: 'packages/client/connection/lib/client.js', url: '/plugins/connection.js', rev: 'fx', inject: [], immediately: true },
  { id: '@truly-private/omdsh-api-gateway', bundlePath: 'packages/api/gateway/lib/client.js', url: '/plugins/api-gateway.js', rev: 'fx', inject: ['@truly-private/omdsh-typert-registry', '@truly-private/omdsh-client-connection'], immediately: true },
  { id: '@truly-private/omdsh-api-remotes', bundlePath: 'packages/api/remotes/lib/client.js', url: '/plugins/api-remotes.js', rev: 'fx', inject: ['@truly-private/omdsh-api-gateway'], immediately: true },
  // The settings domain base: the only provider of ctx.settingsScope, which the
  // locale and ui-theme rows below inject for their preference rows. Without it
  // both stay pending and ui-layout never activates, so nothing renders.
  { id: '@truly-private/omdsh-client-ui-settings', bundlePath: 'packages/client/ui-settings/lib/client.js', url: '/plugins/ui-settings.js', rev: 'fx', inject: ['@truly-private/omdsh-client-connection', '@truly-private/omdsh-client-runtime', '@truly-private/omdsh-api-remotes'], immediately: true },
  { id: '@truly-private/omdsh-client-runtime', bundlePath: 'packages/client/runtime/lib/client.js', url: '/plugins/runtime.js', rev: 'fx', inject: ['@truly-private/omdsh-client-connection', '@truly-private/omdsh-typert-registry', '@truly-private/omdsh-api-gateway'], immediately: true },
  { id: '@truly-private/omdsh-client-ui-theme', bundlePath: 'packages/client/ui-theme/lib/client.js', url: '/plugins/ui-theme.js', rev: 'fx', inject: ['@truly-private/omdsh-client-connection', '@truly-private/omdsh-client-runtime', '@truly-private/omdsh-client-locale', '@truly-private/omdsh-client-ui-settings', '@truly-private/omdsh-api-remotes'], immediately: true },
  { id: '@truly-private/omdsh-client-locale', bundlePath: 'packages/client/locale/lib/client.js', url: '/plugins/locale.js', rev: 'fx', inject: ['@truly-private/omdsh-client-connection', '@truly-private/omdsh-client-runtime', '@truly-private/omdsh-client-ui-settings', '@truly-private/omdsh-api-remotes'], immediately: true },
  { id: '@truly-private/omdsh-client-ui-layout', bundlePath: 'packages/client/ui-layout/lib/client.js', url: '/plugins/ui-layout.js', rev: 'fx', inject: ['@truly-private/omdsh-client-runtime'] },
  { id: '@truly-private/omdsh-client-ui-sidebar', bundlePath: 'packages/client/ui-sidebar/lib/client.js', url: '/plugins/ui-sidebar.js', rev: 'fx', inject: ['@truly-private/omdsh-client-ui-layout'] },
  { id: '@truly-private/omdsh-client-ui-conversation', bundlePath: 'packages/client/ui-conversation/lib/client.js', url: '/plugins/ui-conversation.js', rev: 'fx', inject: ['@truly-private/omdsh-client-ui-layout'] },
  { id: '@truly-private/omdsh-client-ui-tool', bundlePath: 'packages/client/ui-tool/lib/client.js', url: '/plugins/ui-tool.js', rev: 'fx', inject: ['@truly-private/omdsh-client-runtime', '@truly-private/omdsh-client-locale', '@truly-private/omdsh-client-ui-conversation'] },
  { id: '@truly-private/omdsh-client-ui-workflow-run', bundlePath: 'packages/client/ui-workflow-run/lib/client.js', url: '/plugins/ui-workflow-run.js', rev: 'fx', inject: ['@truly-private/omdsh-client-locale', '@truly-private/omdsh-client-runtime', '@truly-private/omdsh-client-ui-conversation'] },
  {
    id: '@truly-private/omdsh-client-ui-workspace',
    bundlePath: 'packages/client/ui-workspace/lib/client.js',
    url: '/plugins/ui-workspace.js',
    rev: 'fx',
    inject: [
      '@truly-private/omdsh-client-runtime',
      '@truly-private/omdsh-client-ui-conversation',
      '@truly-private/omdsh-client-ui-sidebar',
    ],
  },
  { id: '@truly-private/omdsh-session-log-export', bundlePath: 'packages/session-query/session-log-export/lib/client.js', url: '/plugins/session-log-download.js', rev: 'fx', inject: ['@truly-private/omdsh-client-ui-commands', '@truly-private/omdsh-client-ui-conversation'] },
  { id: '@truly-private/omdsh-client-ui-trajectory', bundlePath: 'packages/client/ui-trajectory/lib/client.js', url: '/plugins/ui-trajectory.js', rev: 'fx', inject: ['@truly-private/omdsh-client-ui-conversation'] },
]

const bundles = new Map(PLUGINS.map(plugin => [
  plugin.url,
  readFileSync(join(process.cwd(), plugin.bundlePath), 'utf8'),
]))

interface FixtureWindow extends Window {
  __DSH_BOOT__?: { rev: string; entries: WebBootEntry[] }
  __ModuleLoader__?: unknown
}

class ResizeObserverStub {
  observe(): void {}
  disconnect(): void {}
  unobserve(): void {}
}

const win = window as FixtureWindow
let unmount: (() => void) | undefined

/**
 * Register the per-test jsdom setup and teardown the assembled boot needs:
 * The observers and frame callbacks jsdom lacks, plus a full reset of the
 * document, boot globals, and injected plugin styles after each test. With no
 * Host locale preference, the assembled client uses the English product default.
 */
export function installAssembledBootEnv(): void {
  beforeEach(() => {
    localStorage.clear()
    document.title = 'DeepSeek Harness'
    vi.stubGlobal('ResizeObserver', ResizeObserverStub)
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
      setTimeout(() => { callback(0) }, 0) as unknown as number)
    vi.stubGlobal('cancelAnimationFrame', (id: number) => { clearTimeout(id) })
  })

  afterEach(() => {
    act(() => { unmount?.() })
    unmount = undefined
    cleanup()
    delete win.__DSH_BOOT__
    delete win.__ModuleLoader__
    document.body.innerHTML = ''
    document.head.querySelectorAll('style[data-plugin]').forEach((style) => { style.remove() })
    document.title = ''
    history.replaceState(null, '', '/')
    // Deleting the own properties uncovers jsdom's own accessors again
    // (Navigator declares both readonly, hence the erased receiver).
    const ownNavigator = navigator as unknown as Record<string, unknown>
    delete ownNavigator.languages
    delete ownNavigator.language
    vi.unstubAllGlobals()
  })
}

/**
 * Mount the assembled application on the fixture transport; the teardown
 * registered by installAssembledBootEnv disposes it.
 */
export function mountAssembledApp(): void {
  history.replaceState(null, '', '/?fixture')
  const root = document.createElement('div')
  root.id = 'root'
  document.body.appendChild(root)
  win.__DSH_BOOT__ = { rev: 'fx', entries: PLUGINS.map(({ bundlePath: _bundlePath, ...plugin }) => plugin) }
  act(() => {
    const entry = new AppWebEntry(root, {
      loadBundle: async (url) => {
        const code = bundles.get(url)
        if (code === undefined) throw new Error(`missing built bundle ${url}`)
        ;(0, eval)(code)
      },
    })
    void entry.run()
    unmount = () => { entry.dispose() }
  })
}

/**
 * Match a CSS-module class by its logical name.
 * Module class names carry a per-build hash in one of two schemes —
 * ui-primitives emits `_<name>_<hash>` (name bounded by underscores),
 * feature bundles emit `<hash>_<name>` (name at the end) — and a longer name
 * containing this one must not match (`line` must not hit `lineNumber`).
 * @param el - element whose class list is inspected.
 * @param name - logical (unhashed) module class name.
 * @returns whether the element carries that module class.
 */
export function hasClass(el: Element, name: string): boolean {
  return [...el.classList].some(cls => cls === name || cls.endsWith(`_${name}`) || cls.startsWith(`_${name}_`) || cls.includes(`_${name}_`))
}

/**
 * Whether this run rewrites its golden instead of comparing against it, set by
 * the snapshot gate's `DSH_SNAPSHOT` mode (`record` re-runs the scenarios from
 * scratch, `refresh` re-derives the expected text from the existing ones).
 */
export const REFRESHING_GOLDEN = process.env.DSH_SNAPSHOT === 'record' || process.env.DSH_SNAPSHOT === 'refresh'
