import { staticLinked } from '../tsdown.client.ts'

export default staticLinked(
  '@truly-private/omdsh-client-web',
  ['lib/types/index.js', 'lib/types/invariant.js'],
)
