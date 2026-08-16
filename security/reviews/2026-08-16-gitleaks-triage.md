# Inherited Gitleaks triage

Review state: `candidate`

Primary upstream commit: `47f943859bef60e4160492346772ded9b24f765a`

Failed workflow run: [Security review 31932376497](https://github.com/Truly-Private/oh-my-deepseek-harness/actions/runs/31932376497)

## Evidence

The Gitleaks 8.30.1 full-history scan reported 267 findings across 98 commits. Every finding commit is an ancestor of the pinned DeepSeek Harness upstream commit, and no finding belongs to a downstream commit.

| Classification | Findings | Disposition |
| --- | ---: | --- |
| Translation-pairing Git blob hashes | 253 | A path-and-detector-match conjunction permits only records that pair an ordinary Markdown basename with a 40-character lowercase Git blob hash in an `.i18n.yaml` file under the `generic-api-key` rule. |
| Credential-shaped test fixtures | 12 | Exact Gitleaks fingerprints identify the inherited test occurrences without suppressing later occurrences. |
| Non-secret identifiers and prose | 2 | Exact Gitleaks fingerprints identify the inherited occurrences without suppressing later occurrences. |

The provider-specific GCP and JWT findings occur in secret-redaction fixtures. The values are already public in the primary upstream history; only the upstream owner can attest that they were never live credentials. The downstream does not use either value for authentication.

## Policy

[`gitleaks-dispositions.json`](../gitleaks-dispositions.json) records the counts, classifications, rationales, and exact fingerprints without recording extracted values. [`verify-gitleaks-policy.mjs`](../../scripts/security/verify-gitleaks-policy.mjs) requires each fingerprint commit to be an ancestor of the pinned primary commit, rejects fingerprints outside the reviewed path classes, and requires `.gitleaks.toml` and `.gitleaksignore` to match the manifest exactly.

The scan continues to cover full history. New upstream commits, downstream commits, detector rules, paths, or line numbers produce new findings and require a new disposition. No commit, directory, test tree, or upstream range is skipped.

## Limitations

Gitleaks documents exact fingerprint ignores as experimental. The repository validator therefore treats the disposition manifest as the authority and fails if the generated policy files broaden or drift. This triage does not change the downstream review state and does not replace maintainer approval.
