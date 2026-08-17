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

## Source corrections awaiting remote analysis

The remediation branch replaces the mechanisms reported by alerts 4–9, 12–18, 23–25, and 31:

- session-reference, JSDoc, and HTML-comment parsing use bounded linear scanners instead of backtracking or incomplete multi-character replacement;
- generated Markdown tables and Mermaid labels escape existing backslashes before delimiter escaping;
- profile files use exclusive creation rather than an existence check followed by a write;
- JSONL stable reads obtain both revisions and bytes through one open file handle.

Local evidence includes the focused parser, profile, persistence, Markdown, and catalog tests; the issue-policy Node tests; changed-file lint; repository-wide typecheck; generated catalog checks; and `git diff --check`. The exact branch commit and remote CodeQL result remain pending until the pull request is pushed and analyzed.

## Pending dispositions

Alerts 20, 22, and 35–43 remain open until the remediation pull request's exact-head analysis completes. They cover a monotonic runtime identifier, same-identity repository or build tooling, GitHub issue-policy requests, and three intentional code-construction paths. Each requires an exact finding-specific threat analysis before dismissal or another source correction. No pending alert is evidence that the candidate is reviewed or ready for release.
