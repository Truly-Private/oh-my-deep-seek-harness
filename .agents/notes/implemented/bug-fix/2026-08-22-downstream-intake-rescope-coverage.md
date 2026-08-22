# Agent Note: Downstream intake rescope and coverage correction

Status: implemented

English | [中文](2026-08-22-downstream-intake-rescope-coverage.zh.md)

## Problem

The upstream intake rescope changed workspace packages to `@truly-private/omdsh-*`, but the dynamic client bundle purity gate and one credentials invariant assertion still selected `@deepseek-ai/*`. Undeclared downstream cross-plugin value imports therefore bypassed the build error, while the invariant test expected the wrong package identity. The intake adapter also changed several English expectations without changing fixtures that explicitly selected Chinese, so those tests contradicted their setup. The merge retained the downstream 9Router default selection but dropped the provider configuration that makes the selection executable. Under the complete Linux coverage workload, the real PowerShell PTY suite could miss persistent-shell output while it shared the broad test project with unrelated instrumented suites. The local node-pty provider also forwarded PowerShell's cursor-position query without answering it. The bootstrap could therefore reach PSReadLine before its native prompt accepted input, while a substring readiness check could mistake the echoed bootstrap source for the installed prompt because that source contains the prompt literal.

## Decision

The client purity gate treats `@truly-private/*` as the owned workspace scope, retains explicit inline allowances for `@truly-private/omdsh-*` wire packages and generated Remote contributions, and allows the separately vendored `@deepseek-ai` libraries before applying the downstream scope check.

The credentials invariant test expects the downstream package identity. The base bundle restores the first-party 9Router provider with the credential reference, loopback endpoint, OpenAI-compatible protocol, and the requested `trifecta` model; it does not embed a credential.

Locale tests assert the language each fixture selects. Fixtures that stage `zh` keep the shipped Chinese copy expectations and exercise an explicit switch to `en` where both dictionaries matter.

The real `terminal-bash` local PTY suite runs in the existing process-bound Vitest project. It remains part of the same coverage invocation and thresholds, but does not share the broad project's accumulated process state under aggregate instrumentation.

The local node-pty provider answers complete or split `CSI 6 n` cursor-position queries with a minimal `CSI 1;1 R` response. PowerShell startup first waits for printable native-prompt output, submits the encoding and controlled-prompt bootstrap exactly once, and then accepts readiness only when the installed prompt is the viewport or scrollback suffix. The persistent PowerShell tool uses the same suffix requirement when installing its private prompt. Its assembled keyless snapshot records the exact `PWSH_OK` tool result without bootstrap source, clipping text, or credential material.

## Alternatives considered

**Change the fixtures to English.** The affected client surfaces intentionally ship Chinese product copy, and the tests already state that they select Chinese. Changing the fixture would hide the intake mismatch instead of preserving the upstream behavior.

**Remove the purity assertions after rescoping.** That would permit a client plugin to inline a second workspace runtime or request a module-table row it never declared. The downstream scope needs the same enforcement the upstream scope had.

**Retry the PTY assertions.** A retry would conceal loss of a persistent-shell boundary under aggregate contention. The process-bound project already exists for real process and timing-sensitive I/O suites.

**Accept a prompt literal anywhere in captured output.** The submitted PowerShell function contains that literal before the function has executed. Only the final prompt suffix proves that the shell accepted the bootstrap and returned to its controlled input state.

## Consequences

Downstream browser builds again reject undeclared workspace value imports, while vendored framework libraries remain usable. The package identity assertions and locale fixtures agree with the downstream runtime, the base profile can resolve its selected 9Router route, and the complete coverage gate isolates the real PTY lifecycle without removing it from coverage. A fresh native ARM64 Ubuntu OrbStack container, with Node, Python, Bun, and pnpm installed through Proto, completed the frozen install, host library build, both real PowerShell PTY tests, and the targeted assembled snapshot. These corrections do not promote the upstream intake beyond `candidate` or authorize a release.
