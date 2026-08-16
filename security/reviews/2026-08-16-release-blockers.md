# Release-blocker review

Review state: `candidate`

Primary upstream commit: `47f943859bef60e4160492346772ded9b24f765a`

## Dependency alert dispositions

GitHub reported 24 open alerts on the downstream default branch before this change. Duplicate alerts for the same advisory appeared against direct manifests and `pnpm-lock.yaml`; this table records every affected package, alert number, and version disposition.

| Package | Alerts | Disposition in this candidate |
| --- | --- | --- |
| `mermaid` | 1–5, 11–15, 20–24 | Upgrade direct root and website dependencies from 11.16.0 to advisory-fixed 11.16.1. |
| `vite` | 7–9, 17–19 | Require 6.4.3 in the website and override VitePress's `^5.4.14` dependency to advisory-fixed 6.4.3. |
| `dompurify` | 10, 16 | Override Mermaid's transitive dependency from 3.4.11 to advisory-fixed 3.4.13. |
| `esbuild` | 6 | Remove esbuild 0.21.5 by replacing the remaining Vite 5 resolution with Vite 6.4.3; the lockfile retains only 0.25.12 and 0.28.1. |

## Completed local evidence

- Runtime versions were installed through Moonrepo proto from `.prototools`.
- The regenerated lockfile passed the repository supply-chain policy during installation.
- The lockfile contains Mermaid 11.16.1, Vite 6.4.3 or 8.0.16, DOMPurify 3.4.13, and esbuild 0.25.12 or 0.28.1.
- The source-worker compatibility test passed under Node 24.19.0 and Node 26.7.0 with the repository test runner on Vite 8.0.16; the website remains on the patched Vite 6.4.3 line.
- `pnpm audit --audit-level low` reported no known vulnerabilities, and the production audit reported zero low, moderate, high, or critical findings.
- Twelve security validator tests passed, including the inherited-history Gitleaks policy tests.
- The documentation site tests passed 43 tests, the VitePress build completed with the Vite 6.4.3 floor, and 2,314 internal fragment references resolved.
- All 28 documentation gates passed, including Mermaid rendering, translation pairing, Agent Note validation, type equivalence, and the documentation build.
- The eligible source and documentation tree contains no unresolved release-blocking `FIXME` marker.

## Pending evidence

- GitHub must evaluate the exact pull-request commit and close or supersede all 24 default-branch alerts after merge.
- The hosted static, coverage, consumer, Linux serial, macOS serial, Windows serial, Wine, native Windows, and compatibility jobs must complete for the exact candidate commit.
- The website build, documentation gates, production dependency audit, full dependency audit, provenance validation, full-history Gitleaks scan, dependency review, and both CodeQL languages must pass for the exact candidate commit.

This record does not mark the candidate reviewed and does not authorize a stable release.
