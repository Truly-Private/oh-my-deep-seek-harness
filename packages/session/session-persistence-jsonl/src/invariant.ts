/**
 * Package-owned invariant companion for `@truly-private/omdsh-session-persistence-jsonl`.
 * @module @truly-private/omdsh-session-persistence-jsonl/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@truly-private/omdsh-invariants'

const PACKAGE_NAME = '@truly-private/omdsh-session-persistence-jsonl'

/** Cordis companion plugin name. */
export const name = 'session-persistence-jsonl-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: persistence correctness requires backend round-trip and crash-tail tests;
 * this package exposes no continuously observable in-process relation.
 */
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
