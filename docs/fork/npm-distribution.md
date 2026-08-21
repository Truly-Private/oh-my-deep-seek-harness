# Downstream npm distribution setup

English | [中文](npm-distribution.zh.md)

This guide records how the downstream CLI is released as `@truly-private/omdsh`. Version `0.0.1` is the first public release of the complete downstream package family.

## Package identity

npm package names cannot contain uppercase letters, so the downstream name is `@truly-private/omdsh`, not `@Truly-Private/omdsh`. The npm user or organization named `truly-private` must own the matching scope before this repository can publish into it.

The identity map is:

| Role | Upstream name | Downstream name |
| --- | --- | --- |
| Private workspace root | `@deepseek-ai/dsh-root` | `@truly-private/omdsh-root` |
| Installed CLI | `@deepseek-ai/dsh` | `@truly-private/omdsh` |
| Harness packages | `@deepseek-ai/dsh-*` | `@truly-private/omdsh-*` |

The CLI depends on many workspace packages. Renaming only `apps/cli/package.json` would leave the published CLI dependent on the upstream package family, so the release family must be rescoped together unless a separate bundling design removes those runtime package dependencies.

## Release procedure

1. Confirm `security/upstream-lock.json` marks the exact pinned primary commit as `reviewed` and links its review evidence.
2. Run the repository gates and pack the complete release family from that reviewed commit:

```sh
pnpm install
pnpm run build
pnpm run hygiene
pnpm run release:verify --family dsh
pnpm run release:pack --family dsh --out dist/npm-omdsh
pnpm run release:pack --family vendor --out dist/npm-vendor
```

3. Clean-install the packed CLI with its vendored framework tarballs. The release check must report `@truly-private/omdsh 0.0.1` before publication.
4. Publish the unchanged dsh tarballs with `scripts/release/publish.ts`. Keep npm credentials outside the repository; never put a token in `.npmrc` under this checkout, a tracked shell file, logs, or documentation.
5. From outside the repository, verify the registry and executable:

```sh
npm view @truly-private/omdsh@0.0.1 version
npx --yes @truly-private/omdsh@0.0.1 --profile headless --dump-config
```

The [downstream npm scope Agent Note](../../.agents/notes/implemented/process/2026-08-20-downstream-npm-scope.md) records why the complete family moves together and why vendored packages keep their existing names.

## Publication stop condition

Do not publish when `npm view` already finds different bytes at the target version, packed-install verification resolves `@deepseek-ai/dsh-*` harness packages, or the release commit lacks reviewed intake evidence.

## npm references

- [Package name guidelines](https://docs.npmjs.com/package-name-guidelines/)
- [About scopes](https://docs.npmjs.com/about-scopes/)
- [Trusted publishing with OIDC](https://docs.npmjs.com/trusted-publishers/)
