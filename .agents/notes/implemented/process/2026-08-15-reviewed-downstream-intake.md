# Agent Note: Reviewed downstream intake

Status: implemented

English | [中文](2026-08-15-reviewed-downstream-intake.zh.md)

## Problem

A downstream distribution that follows a fast-moving agent harness can either mirror upstream quickly or make a meaningful security-review claim, but it cannot infer both from branch freshness. An unrecorded merge gives operators no exact source commit, no review state, and no way to distinguish a compatibility delay from an abandoned release. Host-agent integrations add another ambiguity because sharing a model endpoint is weaker than preserving tools, permissions, cancellation, workspace limits, and session results.

## Decision

The distribution records its exact DeepSeek Harness source commit and review state in [`security/upstream-lock.json`](../../../../security/upstream-lock.json). [`verify-upstream-lock.mjs`](../../../../scripts/security/verify-upstream-lock.mjs) accepts only the named DeepSeek and inspiration repositories, requires the primary commit to be an ancestor of the checkout, forbids automatic merge policy, and refuses a `reviewed` state unless its evidence names the same primary commit.

Upstream intake uses a candidate pull request and human approval. Automation runs provenance validation, dependency review, dependency vulnerability auditing, secret scanning, and CodeQL through [`security-review.yml`](../../../../.github/workflows/security-review.yml), but it cannot change the review state, merge, tag, or publish. The [intake reference](../../../../docs/fork/upstream-intake.md) owns the maintainer procedure, while the root [security policy](../../../../SECURITY.md) owns the user-visible meaning and limitations of “reviewed.”

The [integration status reference](../../../../docs/fork/integrations.md) reports provider interoperability separately from host-agent interoperability. A target remains a compatibility target until an executable test covers process cleanup, structured data, cancellation, workspace limits, secrets, and approvals. This prevents a shared DeepSeek or 9Router endpoint from being represented as a completed Hermes, OpenClaw, Pi, or OMP bridge.

## Alternatives considered

**Mirror upstream `master` automatically.** This minimizes lag but lets new workflows, install hooks, native code, network behavior, or credential paths enter without a maintainer decision. Discovery automation may prepare a candidate, but it cannot merge one.

**Apply security checks only at release time.** This leaves ordinary pull requests without the same static, dependency, secret, and provenance feedback and makes review failures accumulate. The security workflow runs on pull requests, the default branch, a schedule, and manual dispatch instead.

**Describe every shared-endpoint combination as integrated.** This creates an attractive but false support claim because agent runtimes can disagree about tool schemas, cancellation, approval, and filesystem authority. The compatibility table names that distinction and requires executable bridge evidence.

## Consequences

The distribution can trail DeepSeek Harness even when upstream contains desirable features. Every reviewed release has an exact source commit and named evidence, while candidate builds remain clearly unreviewed. Maintainers carry the ongoing cost of reviewing upstream diffs, maintaining pinned security actions, and building separate host-agent bridges for Hermes, OpenClaw, Pi, and OMP instead of treating 9Router model connectivity as proof of full integration.
