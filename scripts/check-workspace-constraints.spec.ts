/** Experimental-package publication and dependency constraints. */

import { describe, expect, it } from 'vitest'
import {
  checkExperimentalDependencyIsolation,
  checkExperimentalManifest,
  type WorkspaceManifest,
} from './check-workspace-constraints.ts'

const experimental: WorkspaceManifest = {
  dir: 'packages/experimental/prototype',
  manifest: { name: '@truly-private/omdsh-experimental-prototype', private: true },
}

describe('experimental workspace constraints', () => {
  it('requires the experimental package-name prefix', () => {
    expect(checkExperimentalManifest({
      ...experimental,
      manifest: { ...experimental.manifest, name: '@truly-private/omdsh-prototype' },
    })).toEqual([
      '@truly-private/omdsh-prototype: experimental package name must start with "@truly-private/omdsh-experimental-"',
    ])
  })

  it('requires private manifests without publication metadata', () => {
    expect(checkExperimentalManifest(experimental)).toEqual([])
    expect(checkExperimentalManifest({
      ...experimental,
      manifest: { ...experimental.manifest, private: false, publishConfig: { access: 'public' } },
    })).toEqual([
      '@truly-private/omdsh-experimental-prototype: experimental package must set "private": true',
      '@truly-private/omdsh-experimental-prototype: experimental package must omit publishConfig',
    ])
  })

  it.each(['dependencies', 'optionalDependencies', 'peerDependencies'] as const)(
    'rejects release %s on an experimental package',
    (section) => {
      expect(checkExperimentalDependencyIsolation([experimental, {
        dir: 'packages/core/consumer',
        manifest: {
          name: '@truly-private/omdsh-consumer',
          [section]: { '@truly-private/omdsh-experimental-prototype': 'workspace:^' },
        },
      }])).toEqual([
        `@truly-private/omdsh-consumer: ${section}.@truly-private/omdsh-experimental-prototype must not reference an experimental package`,
      ])
    },
  )

  it('allows development and experimental consumers but rejects the Python release runtime', () => {
    const manifests: WorkspaceManifest[] = [experimental, {
      dir: 'packages/core/test-only',
      manifest: {
        name: '@truly-private/omdsh-test-only',
        devDependencies: { '@truly-private/omdsh-experimental-prototype': 'workspace:^' },
      },
    }, {
      dir: 'packages/experimental/consumer',
      manifest: {
        name: '@truly-private/omdsh-experimental-consumer',
        dependencies: { '@truly-private/omdsh-experimental-prototype': 'workspace:^' },
      },
    }, {
      dir: 'python/sdk-runtime',
      manifest: {
        name: '@truly-private/omdsh-python-runtime',
        dependencies: { '@truly-private/omdsh-experimental-prototype': 'workspace:^' },
      },
    }]

    expect(checkExperimentalDependencyIsolation(manifests)).toEqual([
      '@truly-private/omdsh-python-runtime: dependencies.@truly-private/omdsh-experimental-prototype must not reference an experimental package',
    ])
  })
})
