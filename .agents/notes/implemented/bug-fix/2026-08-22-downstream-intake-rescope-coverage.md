# Agent Note: Downstream intake rescope and coverage correction

Status: implemented

English | [中文](2026-08-22-downstream-intake-rescope-coverage.zh.md)

## Problem

The upstream intake rescope changed workspace packages to `@truly-private/omdsh-*`, but the dynamic client bundle purity gate and one credentials invariant assertion still selected `@deepseek-ai/*`. Undeclared downstream cross-plugin value imports therefore bypassed the build error, while the invariant test expected the wrong package identity. The intake adapter also changed several English expectations without changing fixtures that explicitly selected Chinese, so those tests contradicted their setup. The merge retained the downstream 9Router default selection but dropped the provider configuration that makes the selection executable. Under the complete Linux coverage workload, the real PowerShell PTY suite could miss persistent-shell output while it shared the broad test project with unrelated instrumented suites.

## Decision

The client purity gate treats `@truly-private/*` as the owned workspace scope, retains explicit inline allowances for `@truly-private/omdsh-*` wire packages and generated Remote contributions, and allows the separately vendored `@deepseek-ai` libraries before applying the downstream scope check.

The credentials invariant test expects the downstream package identity. The base bundle restores the first-party 9Router provider with the credential reference, loopback endpoint, OpenAI-compatible protocol, and the requested `trifecta` model; it does not embed a credential.

Locale tests assert the language each fixture selects. Fixtures that stage `zh` keep the shipped Chinese copy expectations and exercise an explicit switch to `en` where both dictionaries matter.

The real `terminal-bash` local PTY suite runs in the existing process-bound Vitest project. It remains part of the same coverage invocation and thresholds, but does not share the broad project's accumulated process state under aggregate instrumentation.

## Alternatives considered

**Change the fixtures to English.** The affected client surfaces intentionally ship Chinese product copy, and the tests already state that they select Chinese. Changing the fixture would hide the intake mismatch instead of preserving the upstream behavior.

**Remove the purity assertions after rescoping.** That would permit a client plugin to inline a second workspace runtime or request a module-table row it never declared. The downstream scope needs the same enforcement the upstream scope had.

**Retry the PTY assertions.** A retry would conceal loss of a persistent-shell boundary under aggregate contention. The process-bound project already exists for real process and timing-sensitive I/O suites.

## Consequences

Downstream browser builds again reject undeclared workspace value imports, while vendored framework libraries remain usable. The package identity assertions and locale fixtures agree with the downstream runtime, the base profile can resolve its selected 9Router route, and the complete coverage gate isolates the real PTY lifecycle without removing it from coverage. These corrections do not promote the upstream intake beyond `candidate` or authorize a release.
