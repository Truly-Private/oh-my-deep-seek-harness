# Reviewed upstream intake

English | [中文](upstream-intake.zh.md)

This reference defines how `oh-my-deep-seek-harness` accepts DeepSeek Harness updates. The distribution prefers a known reviewed commit over automatic synchronization with upstream `master`.

## Trust anchors

[`security/upstream-lock.json`](../../security/upstream-lock.json) records the exact primary upstream URL, branch, commit, and review state. It also records the inspiration repository for attribution and design comparison; that repository is not a source-code merge base.

The lock verifier rejects unknown source URLs, malformed commit identifiers, a primary commit absent from this repository's history, and a `reviewed` state without commit-matched evidence.

## Intake procedure

1. Fetch `https://github.com/deepseek-ai/deepseek-harness.git` into the `upstream` remote without executing repository scripts.
2. Create a review branch from the downstream default branch and merge or rebase the selected upstream commit without publishing a release.
3. Update the primary commit in `security/upstream-lock.json` and leave its review status as `candidate`.
4. Review the complete diff from the previously accepted upstream commit, including workflow files, install hooks, package-manager scripts, native code, vendored changes, credential handling, network destinations, and sandbox policy.
5. Run provenance validation, relevant repository tests, CodeQL, dependency review, secret scanning, and dependency vulnerability auditing. Record any waived or environment-blocked check as an exception; silence is not a pass.
6. Exercise the integration paths affected by the update. A provider-only test does not qualify as evidence for a host-agent bridge.
7. After human approval and successful required checks, set the lock status to `reviewed`, identify evidence for the exact commit, and merge the review pull request.
8. Tag or publish only from a commit whose lock still validates as `reviewed`.

## Review lag

Upstream may advance while a candidate is under review. That is expected. Security fixes receive priority, but they still retain commit provenance and focused validation. A release note must identify the upstream commit so users can compare the distribution with upstream without relying on a version-name inference.

## No automatic merge

Discovery automation may open an issue or prepare a branch. It must not mark a commit reviewed, approve its own pull request, merge, tag, or publish. Those actions require review evidence and a maintainer decision.
