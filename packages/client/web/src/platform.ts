/**
 * Shared browser platform modules. Seeding, bundling externals, and Vite
 * aliases consume this list so their module identities cannot drift.
 * @module @truly-private/omdsh-client-web/src/platform
 */

/** The module specifiers the shell shares into the frozen module table. */
export const PLATFORM_MODULES = [
  'react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', '@deepseek-ai/cordis',
  '@truly-private/omdsh-client-ui-slots',
  '@truly-private/omdsh-client-web-react',
  '@truly-private/omdsh-client-ui-primitives',
  '@truly-private/omdsh-client-ui-attachment',
  '@truly-private/omdsh-client-schema-form',
] as const

/** One platform module specifier (a seed-table key). */
export type PlatformModule = (typeof PLATFORM_MODULES)[number]
