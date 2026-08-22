import { clientBundle } from '../tsdown.client.ts'

export default clientBundle(
  '@truly-private/omdsh-client-modules',
  ['lib/types/index.js', 'lib/types/invariant.js'],
)
