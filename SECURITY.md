# Security policy

## What “reviewed” means

A release may be described as reviewed only when its exact DeepSeek Harness upstream commit is recorded in [`security/upstream-lock.json`](security/upstream-lock.json), the review status is `reviewed`, and the named checks have evidence for that same commit. The review includes provenance validation, repository tests selected for the changed scope, static analysis, dependency review, secret scanning, and dependency vulnerability auditing.

Review reduces risk; it does not prove that the software is vulnerability-free. DeepSeek Harness is a developer preview, executes tools, and can reach external services when configured. Operators must still use least-privilege credentials, an appropriate sandbox, and deployment-specific network controls.

## Supported versions

Only the latest release whose upstream lock status is `reviewed` receives security fixes. Commits and prereleases marked `candidate` are evaluation builds and must not be represented as reviewed releases.

## Reporting a vulnerability

Use this repository's **Report a vulnerability** button under GitHub's Security tab. Include the affected commit or release, operating system, configuration, reproduction steps, impact, and whether the report contains secrets or personal data. Do not open a public issue for an unpatched vulnerability.

If private vulnerability reporting is unavailable, open a public issue containing no exploit details and ask the maintainers to establish a private channel.

## Upstream intake

Upstream changes enter through a review branch and pull request. Automation may discover or prepare an update, but it must not merge one. The reviewer verifies the source commit, examines the diff since the last accepted commit, records exceptions, and waits for required security and compatibility checks. The full procedure is documented in [the upstream intake reference](docs/fork/upstream-intake.md).

## Secrets

Never commit API keys, access tokens, cookies, private keys, or copied credential stores. Examples use environment-variable references and placeholder values. Rotate a credential immediately if it enters git history; deleting the visible line is not sufficient.
