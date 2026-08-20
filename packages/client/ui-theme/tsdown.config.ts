import { clientBundle } from '../tsdown.client.ts'

export default clientBundle(
  '@truly-private/omdsh-client-ui-theme',
  ['lib/types/index.js', 'lib/types/invariant.js'],
  {
    lib: {
      copy: [{ from: 'src/styles/*', to: 'lib/styles' }],
    },
  },
)
