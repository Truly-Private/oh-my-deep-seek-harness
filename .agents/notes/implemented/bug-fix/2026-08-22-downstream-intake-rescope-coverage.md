# Agent Note: Downstream intake rescope and coverage correction

Status: implemented

English | [中文](2026-08-22-downstream-intake-rescope-coverage.zh.md)

## Problem

The upstream intake rescope changed workspace packages to `@truly-private/omdsh-*`, but the dynamic client bundle purity gate and one credentials invariant assertion still selected `@deepseek-ai/*`. Undeclared downstream cross-plugin value imports therefore bypassed the build error, while the invariant test expected the wrong package identity. The intake adapter also changed several English expectations without changing fixtures that explicitly selected Chinese, so those tests contradicted their setup. The merge retained the downstream 9Router default selection but dropped the provider configuration that makes the selection executable. Under the complete Linux coverage workload, the real PowerShell PTY suite could miss persistent-shell output while it shared the broad test project with unrelated instrumented suites. The local node-pty provider also forwarded PowerShell's cursor-position query without answering it. The bootstrap could therefore reach PSReadLine before its native prompt accepted input, while a substring readiness check could mistake the echoed bootstrap source for the installed prompt because that source contains the prompt literal.

The six-worker Web snapshot job exposed independent timing and artifact-ownership defects. The HMR scenario restored dynamic plugin bundles but left `apps/web/dist` rewritten, invalidating the complete-build digest before the built-bundle smoke loaded. Theme checks observed the persisted file before the Host settings write committed in memory and still intercepted the upstream bundle route after the downstream rescope. A reference snapshot could capture before the saved `trifecta` selection arrived, the subagent hover catalog could be queried before it mounted, and the two-message steering fixture allowed too little streaming time for three browser gestures under concurrent CI load. A cold seeded-history page could render its persisted transcript before the resumed host agent attached, so a direct live-event append failed under the same load.

Other release-shaped checks depended on incidental scheduler timing. The history-and-streaming scenario could consume its finite replay before establishing the reader anchor, transcript capture could retain the off-bottom control after the answered question settled, and responsive queue geometry was measured before the browser completed layout after a viewport change. The subagent catalog test dispatched resize without proving that the open-menu effect had installed its listener. A process-heavy Oxlint retry retained the five-second default test timeout. PowerShell scrollback can terminate a prompt with LF or CRLF, but both prompt-installation loops accepted only the bare prompt in scrollback and could wait indefinitely after the shell was ready.

## Decision

The client purity gate treats `@truly-private/*` as the owned workspace scope, retains explicit inline allowances for `@truly-private/omdsh-*` wire packages and generated Remote contributions, and allows the separately vendored `@deepseek-ai` libraries before applying the downstream scope check.

The official client build profile embeds `oh-my-deepseek-harness` as the product title. Release-shaped artifacts therefore use the downstream identity without changing the explicit upstream credits.

The credentials invariant test expects the downstream package identity. The base bundle restores the first-party 9Router provider with the credential reference, loopback endpoint, OpenAI-compatible protocol, and the requested `trifecta` model; it does not embed a credential.

Locale tests assert the language each fixture selects. Fixtures that stage `zh` keep the shipped Chinese copy expectations and exercise an explicit switch to `en` where both dictionaries matter.

The real `terminal-bash` local PTY suite runs in the existing process-bound Vitest project. It remains part of the same coverage invocation and thresholds, but does not share the broad project's accumulated process state under aggregate instrumentation.

The local node-pty provider answers complete or split `CSI 6 n` cursor-position queries with a minimal `CSI 1;1 R` response. PowerShell startup first waits for printable native-prompt output, submits the encoding and controlled-prompt bootstrap exactly once, and then accepts readiness only when the installed prompt is the viewport or scrollback suffix. The persistent PowerShell tool uses the same suffix requirement when installing its private prompt. Its assembled keyless snapshot records the exact `PWSH_OK` tool result without bootstrap source, clipping text, or credential material.

The HMR scenario snapshots every artifact covered by the complete-build digest, stops both writers before restoration, replaces the generated Web tree, restores all original bytes, and revalidates the build record during teardown. Browser checks wait for the Host's authoritative theme and model state rather than file or first-paint proxies, intercept the downstream `@truly-private/omdsh-client-ui-theme` route, and wait for the subagent catalog tree before selecting a row. The two-message steering scenario receives a dedicated replay pace sized for the six-worker pool; other steering scenarios retain their shorter pace. The seeded-history scenario waits for the authoritative host agent attachment before appending live context to a cold resumed session.

The history-and-streaming scenario uses a dedicated 600-delta replay and asserts that streaming remains active before testing concurrent arrival. Answered-question capture returns to the transcript bottom, while queue and context-panel geometry polls the rendered invariant after responsive layout settles. The subagent catalog test waits for the open-menu effect and proves resize-driven menu placement. The process-heavy Oxlint retry receives an explicit twenty-second test timeout.

Both PowerShell prompt-installation loops recognize the private prompt as a bare suffix or as a suffix followed by LF or CRLF. Regression fixtures prove newline-terminated scrollback readiness and distinguish a native-prompt success followed by a setup timeout.

## Alternatives considered

**Change the fixtures to English.** The affected client surfaces intentionally ship Chinese product copy, and the tests already state that they select Chinese. Changing the fixture would hide the intake mismatch instead of preserving the upstream behavior.

**Remove the purity assertions after rescoping.** That would permit a client plugin to inline a second workspace runtime or request a module-table row it never declared. The downstream scope needs the same enforcement the upstream scope had.

**Retry the PTY assertions.** A retry would conceal loss of a persistent-shell boundary under aggregate contention. The process-bound project already exists for real process and timing-sensitive I/O suites.

**Accept a prompt literal anywhere in captured output.** The submitted PowerShell function contains that literal before the function has executed. Only the final prompt suffix proves that the shell accepted the bootstrap and returned to its controlled input state.

**Ignore or retry the Web snapshot failures.** The build-record rejection identified a real shared-artifact mutation, while the browser failures showed missing synchronization against authoritative state. Retries would make publication evidence depend on scheduler luck.

## Consequences

Downstream browser builds again reject undeclared workspace value imports, while vendored framework libraries remain usable. The package identity assertions and locale fixtures agree with the downstream runtime, the base profile can resolve its selected 9Router route, the complete coverage gate isolates the real PTY lifecycle without removing it from coverage, and the Web snapshot pool preserves the client artifact digest while waiting for durable UI state. Responsive and streaming checks now preserve their original behavioral assertions under the release worker pool, and newline-terminated PowerShell prompts no longer strand shell creation. A fresh native ARM64 Ubuntu OrbStack container, with Node, Python, Bun, and pnpm installed through Proto, completed the frozen install, host library build, both real PowerShell PTY tests, and the targeted assembled snapshot. These corrections do not promote the upstream intake beyond `candidate` or authorize a release.
