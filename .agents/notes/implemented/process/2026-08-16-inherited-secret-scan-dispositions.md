# Agent Note: Inherited secret-scan dispositions

Status: implemented

English | [中文](2026-08-16-inherited-secret-scan-dispositions.zh.md)

## Problem

A full-history secret scan covers the pinned upstream ancestry as well as downstream work. Translation-pairing blob hashes, credential-shaped redaction fixtures, and ordinary identifiers can match secret detectors even though no downstream commit introduced them. Skipping upstream history would make the check green by removing the evidence the downstream intake policy requires.

## Decision

The security workflow keeps the full-history Gitleaks scan. [The disposition manifest](../../../../security/gitleaks-dispositions.json) classifies the inherited findings without storing extracted values. A path-and-detector-match conjunction permits only translation records that pair an ordinary Markdown basename with a 40-character lowercase Git blob hash, and exact fingerprints identify the remaining reviewed fixtures and identifiers.

[`verify-gitleaks-policy.mjs`](../../../../scripts/security/verify-gitleaks-policy.mjs) requires every exact fingerprint commit to be an ancestor of the primary commit in [`upstream-lock.json`](../../../../security/upstream-lock.json), constrains each classification to reviewed paths, and requires the scanner configuration and fingerprint file to equal the manifest. New occurrences therefore fail until a maintainer records another disposition. This policy extends the [reviewed downstream intake decision](2026-08-15-reviewed-downstream-intake.md) without changing candidate or reviewed status.

## Alternatives considered

**Rewrite inherited Git history.** The findings belong to the public primary upstream ancestry, and translation records in the current tree still contain Git blob hashes. A rewrite would break pinned provenance without removing the detector conflict.

**Exclude the upstream range or all tests.** Either exclusion would hide later detector findings in security-sensitive history. The scan retains every commit and uses structural or exact finding-level dispositions instead.

**Commit a Gitleaks baseline report.** A report carries more captured finding context than the policy needs and can accidentally preserve sensitive material. The manifest and exact fingerprints retain only commit, path, rule, line, classification, and rationale.

## Consequences

Full-history scans remain sensitive to new upstream and downstream findings, while the reviewed inherited noise does not permanently fail every pull request. Maintainers must classify each new fingerprint and confirm its ancestry. Exact fingerprint ignores are an experimental Gitleaks feature, so the repository-owned validator prevents silent broadening and remains part of the required provenance evidence.
