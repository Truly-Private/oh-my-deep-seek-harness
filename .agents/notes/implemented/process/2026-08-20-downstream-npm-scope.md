# Agent Note: Downstream npm scope and first public release

Status: implemented

English | [中文](2026-08-20-downstream-npm-scope.zh.md)

## Problem

The downstream repository needs an npm command that names its own reviewed distribution. It cannot publish into the upstream `@deepseek-ai` namespace, and changing only the CLI package would leave its runtime dependency graph pointing at upstream harness packages.

## Decision

The complete dsh release family moves together from `@truly-private/omdsh*` to `@truly-private/omdsh*`. The installed entry is `@truly-private/omdsh`; the workspace root is `@truly-private/omdsh-root`; all 221 packages under `apps/*` and `packages/*/*` use the same downstream prefix, version `0.0.1`, public npm access, and this repository in their package metadata.

Vendored Cordis packages and the Landlock packages remain under `@deepseek-ai`. They are separate release families with existing public identities and version lines. Downstream harness packages continue to declare those packages as dependencies where required.

The first publication uses tarballs built and clean-installed from a commit whose pinned upstream intake is marked `reviewed` in `security/upstream-lock.json`. Registry credentials stay outside the repository. The release script publishes in dependency order and compares an existing version's registry integrity before it skips, so a retry cannot silently replace different bytes.

This decision supersedes only the npm scope and dsh access statements in [the release-sequence note](2026-08-10-npm-release-sequences.md) and [the public dependency-sequences note](2026-08-13-public-vendor-and-native-sequences.md). Their three-family topology, pack-before-publish process, and manifest-owned access mechanism still apply.

## Alternatives considered

**Rename only the CLI.** Rejected because its packed manifest would still require many `@truly-private/omdsh-*` packages that this downstream does not own.

**Bundle every runtime dependency into one CLI tarball.** Rejected for the first release because it changes plugin resolution and package ownership instead of applying the existing release-family design.

**Keep the upstream npm names.** Rejected because the downstream does not control the upstream scope and must not present reviewed downstream artifacts as upstream packages.

## Consequences

- Consumers run `npx @truly-private/omdsh`; source imports, plugin names, generated references, fixtures, and TypeScript paths use the downstream family names.
- All 221 downstream packages are public because a public CLI must be able to resolve its complete plugin family without organization credentials.
- The package names are a pre-release break from upstream. No compatibility aliases are published.
- Publishing `0.0.1` is irreversible for those package names and bytes. Later changes require a new version.
- The vendored framework and native packages retain their existing names, so a clean-install check must include or resolve both namespaces.
