# Agent Note: CodeQL alert dispositions

Status: implemented

English | [中文](2026-08-16-codeql-alert-dispositions.zh.md)

## Problem

A successful CodeQL workflow means GitHub accepted an analysis result; it does not mean the result contains no alerts. Treating the workflow conclusion as the security verdict can leave production findings unreviewed, while broad query exclusions or unrecorded dismissals can make the dashboard green without reducing risk.

## Decision

Every downstream CodeQL analysis is paired with an alert inventory for the exact analyzed commit. A finding leaves the open inventory only through a source correction or a GitHub disposition with a finding-specific comment. The supporting counts, alert numbers, changed paths, local checks, and pending remote evidence live in the matching file under [`security/reviews/`](../../../../security/reviews/2026-08-16-codeql-triage.md).

Source corrections preserve existing behavior while removing the reported unsafe mechanism. Repository parsers use bounded linear scanners for untrusted or repository-sized text, generated Markdown and Mermaid values escape backslashes before their format delimiters, profile initialization uses exclusive file creation, and JSONL session reads compare revisions through one open file handle. Regression tests cover malformed long input, adjacent comments, concurrent-revision retries, and byte-identical catalog projection.

GitHub dispositions use `used in tests` only when the reported path is test or fixture code with no production reachability. `false positive` requires a recorded explanation of why the query's modeled security property is absent. `won't fix` is limited to an intentional executable-code feature whose trust and containment limits are already part of its user-facing contract. A passing workflow, an inherited upstream location, or a locally trusted input is not sufficient by itself. Query suites stay enabled, and the workflow does not exclude broad paths to hide reviewed findings.

CodeQL evidence does not change [`security/upstream-lock.json`](../../../../security/upstream-lock.json) from `candidate`. A reviewed state still requires complete commit-matched evidence and maintainer approval under the [reviewed downstream intake decision](2026-08-15-reviewed-downstream-intake.md).

## Alternatives considered

**Use only the workflow conclusion.** This verifies analysis delivery but never inspects the findings, so it cannot support a security-review claim.

**Dismiss every inherited or local-tooling finding.** Provenance and execution context affect exploitability, but neither proves a finding harmless. Each alert keeps its own source-path and threat-model explanation.

**Disable noisy queries or exclude tests and vendored code.** Those paths can contain executable fixtures, install behavior, and code that ships in the distribution. The complete query set stays active and exact alerts receive narrow dispositions.

## Consequences

Maintainers must inspect both workflow conclusions and the CodeQL alert API for each candidate commit. The dashboard can contain deliberate findings only after their exact risks and trust assumptions are recorded, and later source movement or changed reachability requires a new review. This costs more review time but prevents a green workflow badge from being represented as zero findings.
