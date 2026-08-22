/**
 * Package-owned invariant companion for `@truly-private/omdsh-skill`.
 * @module @truly-private/omdsh-skill/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@truly-private/omdsh-invariants'

const PACKAGE_NAME = '@truly-private/omdsh-skill'

/** Cordis companion plugin name. */
export const name = 'skill-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: provider/runtime maps and revisioned caches mutate atomically inside the
 * registry, which exposes no independent change event or snapshot for cross-checking them.
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
