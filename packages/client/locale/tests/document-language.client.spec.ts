// @vitest-environment jsdom
/**
 * `<html lang>` tracks the active locale.
 *
 * The served markup declares one language, but a stored Host preference may
 * differ, and the language changes again whenever the user switches.
 * Assistive technology and browser features read this attribute, so a stale value misreports the
 * document language rather than merely looking untidy.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { SlotRegistry } from '@truly-private/omdsh-client-runtime/client'
import { apply as settingsApply, inject as settingsInject } from '@truly-private/omdsh-client-ui-settings/client'
import { TestRemote } from '@truly-private/omdsh-client-test-runtime'
import { apply, inject } from '@truly-private/omdsh-client-locale/client'
import type { LocaleRuntime } from '@truly-private/omdsh-client-locale/client'
import { LOCALE_SETTINGS_NAMESPACE, LocaleSettingsSchema } from '../src/locale-settings.ts'

/** Boot the plugin over a stub Host settings document. */
async function bench(preference?: string) {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  let stored = preference
  let revision = 0
  const namespace = () => ({
    ns: LOCALE_SETTINGS_NAMESPACE,
    schema: LocaleSettingsSchema.toJSON(),
    value: stored === undefined ? {} : { preference: stored },
    applies: 'live' as const,
    secrets: [],
    revision,
  })
  const describeRpc = vi.fn(async () => ({
    rpcId: 'locale-describe' as never,
    result: { ok: true as const, value: { writable: true, hasDocument: true, namespaces: [namespace()] } },
  }))
  const mutate = vi.fn(async (request: { ops: { value: string }[] }) => {
    stored = request.ops[0]!.value
    revision += 1
    return { rpcId: 'locale-mutate' as never, result: { ok: true as const, value: namespace() } }
  })
  ctx.provide('connection', { api: { settings: { describe: describeRpc, mutate } }, isLoopback: true } as never)
  // The settings transport and the forwarded-event port the plugin injects.
  new TestRemote(ctx)
  await ctx.plugin({ inject: [...settingsInject], apply: settingsApply }).await()
  await ctx.plugin({ inject: [...inject], apply }).await()
  return { ctx, locale: ctx.get('locale') as LocaleRuntime }
}

const langOf = (): string => document.documentElement.lang

describe('document language', () => {
  beforeEach(() => {
    // The served markup declares the product default; the plugin must not
    // depend on that value already being correct.
    document.documentElement.lang = 'zh-CN'
  })

  it('states the product-default locale at activation, not the value the markup shipped', async () => {
    const { locale } = await bench()
    expect(locale.getLocale().active).toBe('en')
    expect(langOf()).toBe('en')
  })

  it('follows a locale switch in both directions with BCP 47 tags', async () => {
    const { locale } = await bench()
    expect(langOf()).toBe('en')
    locale.setLocale('zh')
    // `en` needs no region; `zh` names its script variant, which bare `zh`
    // leaves ambiguous for pronunciation and font selection.
    expect(langOf()).toBe('zh-CN')
    locale.setLocale('en')
    expect(langOf()).toBe('en')
  })

  it('follows an explicit Host preference that overrides the product default', async () => {
    const { locale } = await bench('zh')
    await vi.waitFor(() => { expect(locale.getLocale().active).toBe('zh') })
    await vi.waitFor(() => { expect(langOf()).toBe('zh-CN') })
  })
})
