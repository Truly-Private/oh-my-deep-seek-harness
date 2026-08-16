# Agent Note: Hosted release gates and dependency alert floors

Status: implemented

English | [中文](2026-08-16-hosted-release-gates-and-alert-floors.zh.md)

## Problem

The downstream repository inherited pull-request jobs that defaulted to organization-specific runner labels. Those labels are unavailable in the Truly-Private fork, so otherwise useful checks remained queued and could not protect a release. The three cross-platform serial reference jobs were also disabled. GitHub Dependabot reported advisories in the documentation toolchain even though the production-only dependency audit passed, because production audit scope does not cover development dependencies or vulnerable ranges retained in manifests.

## Decision

The required Linux jobs and real-Windows job default to GitHub-hosted runners, while the existing repository-variable switches retain the private failover pools. Hosted concurrency is reduced to match standard runners. Linux, macOS, and Windows serial reference jobs run on pull requests and join the `all checks passed` aggregate; self-hosted Linux and Windows lanes remain master-push standby drills under distinct job identifiers.

The documentation toolchain sets advisory-fixed floors for Mermaid, Vite, DOMPurify, and esbuild. The website uses Vite 6.4.3, while the repository test runner explicitly retains Vite 8.0.16 so Vitest preserves its source-module runner behavior on Node 24 and Node 26. pnpm overrides the Vite 5 range retained by VitePress to Vite 6.4.3 and keeps transitive DOMPurify on 3.4.13. The resulting lockfile contains no esbuild 0.21.5 because the Vite 5 dependency is gone. [`2026-08-16-release-blockers.md`](../../../../security/reviews/2026-08-16-release-blockers.md) records the alert-to-version dispositions and keeps remote validation pending until GitHub evaluates this exact commit.

The timeout policy keeps its descriptive package name, `@deepseek-ai/dsh-tool-call-timeout-policy`; its location under `packages/guard/` does not require a less precise npm name. Request provider, model, reasoning effort, and sampling values remain logged epoch-level state so cache reuse and replay observe the same configuration transition. These decisions remove the two release-blocking `FIXME` markers without changing runtime behavior.

## Alternatives considered

**Keep the custom labels and add organization runners later.** This leaves every pull request without a timely verdict and makes release evidence depend on unprovisioned infrastructure.

**Treat the production audit as the complete dependency signal.** This would omit the documentation build and browser-facing development dependencies that GitHub correctly reports separately.

**Dismiss development-only alerts.** The documentation site processes repository content and ships public pages, so fixed versions are preferred when compatible replacements are available.

## Consequences

Pull requests consume more GitHub-hosted compute and the serial lanes take longer, but their verdicts are available to this public fork. Private runners remain optional failover infrastructure rather than a prerequisite. The repository intentionally carries separate Vite major versions for its test runner and VitePress site until VitePress adopts an advisory-fixed compatible line that also preserves the source-module runner. Dependency floors may need removal after direct parents adopt the fixed releases; until then, the lockfile, source-worker compatibility test, and website build carry compatibility evidence. The candidate status is unchanged: passing these gates does not mark a commit reviewed or authorize stable publication.
