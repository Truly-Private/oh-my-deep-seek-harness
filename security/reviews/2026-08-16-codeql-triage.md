# CodeQL alert triage

Review state: `candidate`

Analyzed downstream commit: `6ee3e55a5d2941d34cf09992d73ca4e185057ead`

Remediation branch: `codex/codeql-alert-dispositions`

## Baseline inventory

The successful default-branch security workflow uploaded JavaScript/TypeScript and Python analysis for the analyzed commit. The GitHub code-scanning API reported 43 open JavaScript/TypeScript alerts: 38 high-severity alerts and 5 medium-severity alerts. It reported no open Python alerts.

| Rule | Severity | Open alerts |
| --- | --- | ---: |
| `js/file-system-race` | high | 19 |
| `js/polynomial-redos` | high | 6 |
| `js/incomplete-sanitization` | high | 4 |
| `js/incomplete-multi-character-sanitization` | high | 3 |
| `js/redos` | high | 3 |
| `js/bad-tag-filter` | high | 1 |
| `js/insecure-randomness` | high | 1 |
| `js/file-access-to-http` | medium | 1 |
| `js/unsafe-code-construction` | medium | 3 |
| `js/bad-code-sanitization` | medium | 2 |

## Completed dispositions

Alerts 1, 2, 3, 10, 11, 15, 19, 21, 26, 27, 28, 29, 30, 32, 33, and 34 are dismissed as `used in tests`. Each alert points only to a test or fixture path, and each GitHub dismissal records the exact path and why the code has no production reachability. No test directory or rule is excluded from later analysis.

Alerts 20 and 40 are dismissed as `false positive`. Alert 20 reports the deterministic monotonic Cordis fiber counter as insecure randomness even though it is not random, secret, or authorization data. Alert 40 follows repository owner and name routing fields into a GitHub API request; those fields are not file contents or secrets, the request origin remains the GitHub Actions API, and the downstream workflow is disabled by its repository-identity condition.

Alerts 22 and 35–39 are dismissed as `won't fix`. These checks and generators operate on same-identity local or CI build trees and grant no additional authority from the reported metadata check. A process that can race those paths already controls the checkout, hook, manifest, or artifact after the operation completes. Each GitHub comment records the exact operation and trust assumption; the disposition does not generalize to product runtime file access.

Alerts 41–43 are dismissed as `won't fix` because code construction is the named feature. The Cordis dynamic-package and workflow-worker documentation states that `node:vm` is an API-shaping or lifecycle mechanism rather than a security boundary and requires bash-level trust. The client schema-form documentation states that Schemastery rehydration executes plugin-defined callbacks, accepts only the trusted same-host envelope, and is not an inert cross-trust format.

## Source corrections awaiting default-branch analysis

The remediation branch replaces the mechanisms reported by alerts 4–9, 12–18, 23–25, and 31:

- session-reference, JSDoc, and HTML-comment parsing use bounded linear scanners instead of backtracking or incomplete multi-character replacement;
- generated Markdown tables and Mermaid labels escape existing backslashes before delimiter escaping;
- profile files use exclusive creation rather than an existence check followed by a write;
- JSONL stable reads obtain both revisions and bytes through one open file handle.

Local evidence includes the focused parser, profile, persistence, Markdown, and catalog tests; the issue-policy Node tests; changed-file lint; repository-wide typecheck; generated catalog checks; and `git diff --check`.

Pull request 8 analyzed source-change commit `21fe10c5b6ce56fbfefd742bba8040efbcaf74df` through merge ref commit `40eeed6bfb6df21a363810e0f9105b74afc64ce3`. JavaScript/TypeScript CodeQL 2.26.3 ran 103 rules and uploaded zero pull-request results; Python CodeQL, dependency review, dependency audit, full-history Gitleaks, and provenance also passed. Pull-request analysis filters findings already present on the base branch, so the zero-result upload proves that the branch introduces no new alerts but does not by itself prove that the 16 corrected base alerts close.

## Pending default-branch evidence

Alerts 4–9, 12–14, 16–18, 23–25, and 31 remain open on the default branch until pull request 8 merges and the default-branch JavaScript/TypeScript analysis scans the merged source. That scan must close all 16 alerts before this remediation is complete. The project remains `candidate` regardless; alert closure does not supply maintainer approval or the other evidence required for a reviewed release.
