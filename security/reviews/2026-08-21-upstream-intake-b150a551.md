# Upstream intake security review for b150a551

Review state: `candidate`

Previously reviewed primary commit: `47f943859bef60e4160492346772ded9b24f765a`

Candidate primary commit: `b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`

Inspiration commit: `de9e880c19cdd37166caf3912fbbb794ed388c32`

## Intake scope

The candidate advances the primary upstream by 854 commits and preserves both upstream and downstream ancestry in a merge commit. Conflict resolution retains downstream package scope, repository metadata, product branding, security policy, release tooling, and integration claims. Newly accepted upstream packages use the `@truly-private/omdsh-*` scope and downstream repository URL. The upstream browser brand-slot package renders the downstream logo and product name instead of restoring DeepSeek artwork.

The inspiration repository remains comparison material and is not the code merge base. This intake does not imply endorsement by DeepSeek AI, Yuan Chenglu, or either contributor community.

## Local evidence

The following evidence was collected through downstream validation commit `19deefc73f741c74804a61a3d3ff22bcf6796de2`, whose history contains merge commit `d6f77c57f3d43c923f885090b0637bccc46f5920`:

| Check | State |
| --- | --- |
| Upstream lock validation and validator tests | Passed in candidate state; all 12 security-validator tests passed. |
| Full-history Gitleaks scan | Gitleaks 8.30.1 scanned 7,233 commits and about 160.42 MB after its official release checksum was verified; no undisposed leaks were found. |
| Production dependency audit and lockfile policy | Passed with zero known low, moderate, high, or critical findings. |
| Repository static and documentation gates | `pnpm run check:ci:static` passed all 37 gates. |
| GitHub Actions supply-chain review | All 122 mutable external action references accepted from upstream were replaced with full 40-character commit pins; a repository test rejects future mutable refs. |
| Pi/OMP host bridge tests | All 27 tests passed. |
| Hermes plugin tests | All 8 tests passed under the Proto-managed Python 3.10.21 runtime. |
| Targeted review of credentials, subprocesses, filesystem permissions, network parsing, executable loading, and release workflows | Path and workflow triage completed; the per-commit human review remains pending. |
| Official production build | `pnpm run build:official` passed for the host, client, and web application bundles. Vite reported size warnings but no build failure. |
| Repository hygiene | `pnpm run hygiene` passed all 13 gates. |
| Keyless snapshot tests | Thirteen of fourteen files passed in the aggregate run with 126 tests passed and 2 skipped. The remaining deterministic translation-prompt snapshot was refreshed for the downstream README and its exact test passed twice afterward. The complete aggregate suite was not rerun after that isolated correction. |
| Downstream release-family verification | `pnpm run release:verify --family dsh` passed for all 227 publishable packages at version 0.0.3. |
| Package assembly and clean installation | Release packing produced 227 downstream, 9 vendored, and 1 Landlock tarball. `release:verify-packed-install` installed all 237 tarballs into a fresh temporary environment and the installed `@truly-private/omdsh` CLI reported version 0.0.3. |

## Remote evidence

GitHub provenance validation, production dependency audit, full-history Gitleaks, JavaScript/TypeScript CodeQL, Python CodeQL, and pull-request dependency review remain pending until the candidate branch is pushed and its workflow results are inspected.

## Release decision

The candidate is not reviewed, secure, vulnerability-free, or release-ready. `security/upstream-lock.json` remains in `candidate` state. A release labeled reviewed requires complete commit-matched evidence and explicit human maintainer approval.
