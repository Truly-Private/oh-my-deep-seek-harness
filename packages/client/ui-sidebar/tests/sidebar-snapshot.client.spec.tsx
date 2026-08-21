// @vitest-environment jsdom
/**
 * Local DOM snapshots of the sidebar shell through the real assembly path:
 * SlotTestRuntime mounts the package apply on its own fiber, the auto frame
 * supplies the layout's owner share at the render site, and the snapshot
 * captures exactly the 'sidebar' slot's output (CSS-module class names
 * folded to their semantic locals by the runtime's serializer). The child
 * holes (sidebar.workspaces / sidebar.settings) have no registrant here, so
 * the snapshots pin the shell chrome itself.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, waitFor } from '@testing-library/react'
import { SlotTestRuntime } from '@truly-private/omdsh-client-test-runtime'
import { LocaleRuntime } from '@truly-private/omdsh-client-locale/client'
import { apply, inject } from '@truly-private/omdsh-client-ui-sidebar/client'

afterEach(cleanup)

/**
 * Boot the package over the slot test runtime. The default bench stays on
 * English, pinning what an untouched client shows; `locale: 'zh'` pins the
 * explicitly selected Chinese copy instead.
 * The installed face backs the entry's standard `t` seat either way.
 */
async function bench(options: { locale?: 'zh' } = {}) {
  const runtime = await SlotTestRuntime.create()
  runtime.provide('layout', { toggleSidebar: vi.fn() })
  const locale = new LocaleRuntime(runtime.ctx)
  if (options.locale === 'zh') locale.setLocale('zh')
  runtime.provide('locale', locale)
  runtime.slots.installLocale(locale)
  await runtime.declare({ 'sidebar': { kind: 'single', scope: 'root' } })
  await runtime.mount({ inject: [...inject], apply })
  return { runtime, locale }
}

describe('sidebar shell snapshots', () => {
  it('renders the expanded column in explicitly selected Chinese', async () => {
    const { runtime } = await bench({ locale: 'zh' })
    const slot = runtime.renderSlot('sidebar', { collapsed: false, width: 300 })
    // Logo + capsule both start a session in the expanded state.
    expect(slot.view.getAllByRole('button', { name: '新建会话' })).toHaveLength(2)
    expect(slot.container).toMatchSnapshot()
    await runtime.dispose()
  })

  it('renders the expanded column (logo, capsule, empty holes)', async () => {
    const { runtime } = await bench()
    const slot = runtime.renderSlot('sidebar', { collapsed: false, width: 300 })
    // Logo + capsule both start a session in the expanded state.
    expect(slot.view.getAllByRole('button', { name: 'New session' })).toHaveLength(2)
    expect(slot.container).toMatchSnapshot()
    await runtime.dispose()
  })

  it('renders the collapsed rail after the crossfade settles, in place', async () => {
    const { runtime } = await bench()
    const slot = runtime.renderSlot('sidebar', { collapsed: false, width: 300 })
    const shell = slot.container.firstElementChild
    slot.update({ collapsed: true, width: 56 })
    // The wide content (logo shortcut) unmounts at the 150ms settle;
    // only the rail's capsule remains a New-session button.
    await waitFor(() => {
      expect(slot.view.getAllByRole('button', { name: 'New session' })).toHaveLength(1)
    })
    expect(slot.container).toMatchSnapshot()
    // Same tree position: the owner flip re-rendered the shell in place.
    expect(slot.container.firstElementChild).toBe(shell)
    await runtime.dispose()
  })

  it('a locale switch refreshes mounted copy without re-registration', async () => {
    const { runtime, locale } = await bench()
    const slot = runtime.renderSlot('sidebar', { collapsed: false, width: 300 })
    expect(slot.view.getAllByRole('button', { name: 'New session' })).toHaveLength(2)
    // Same fiber, same registration: setLocale alone re-renders the outlet.
    act(() => { locale.setLocale('zh') })
    expect(slot.view.getAllByRole('button', { name: '新建会话' })).toHaveLength(2)
    expect(slot.view.queryByRole('button', { name: 'New session' })).toBeNull()
    await runtime.dispose()
  })
})
