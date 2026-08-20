# Agent Note: Fresh-container agent comparisons retain executable evidence

Status: implemented

English | [中文](2026-08-19-fresh-container-agent-comparison.zh.md)

## Problem

Comparing Pi with and without the downstream harness is easy to distort through different prompts, models, preinstalled dependencies, host credentials, outer-agent model calls, or subjective screenshots. Generated browser applications also need executable evidence: source appearance alone cannot show that a production build succeeds, a server starts, or the required game interface exists.

## Decision

The comparison bench runs Pi baseline and Pi plus DeepSeek Harness in separate disposable Linux containers built from the same digest-pinned base. Moonrepo proto installs every language runtime. Both lanes receive the same Pi version, DeepSeek model, prompt bytes, empty workspace, resource limits, and named API-key variable. The baseline exposes Pi's normal coding tools. The harness lane loads the real Pi extension and invokes `dsh_delegate` directly, avoiding an unrelated outer Pi model turn while preserving the shipped host-to-ACP path.

The agent phase permits network access because model calls and application dependency installation require it. The Docker context excludes common local environment and credential files. The container mounts only the output workspace, passes no host credential path or Docker socket, and removes the API-key variable before generated commands run. The baseline model runtime retains its in-memory key. The harness ACP runtime reads a mode-0600 credential file from an ephemeral directory outside the workspace and shell sandbox; its child environment does not contain the key. The bench records the commit, dirty state, versions, prompt hash, order, time, and generated-file hashes. A separate credential-free evaluator runs offline with a read-only root filesystem. It runs available tests, requires a production build and local server, checks stable interface hooks, and captures deterministic desktop and mobile screenshots.

The method produces comparable artifacts rather than an automatic winner. A single run cannot control provider load or model nondeterminism, and the direct harness lane reports bridge lifecycle data rather than Pi token accounting. Maintainers repeat trials and interpret functional, visual, and maintainability evidence together. Passing the bench does not change the downstream review state or the host bridge's candidate label.

This testing decision complements the [host-agent ACP bridge decision](../architecture/2026-08-15-host-agent-acp-bridges.md). That note remains active because its lifecycle, permission, cancellation, and compatibility rationale is not superseded by this benchmark.

## Alternatives considered

- **Run both agents in one container** — rejected because shared caches, installed packages, and filesystem residue make lane provenance ambiguous.
- **Prompt Pi to decide whether to delegate** — rejected because the harness lane would add an outer model call, variable tool selection, and extra cost unrelated to the downstream agent's implementation quality.
- **Mount the operator's home or existing login files** — rejected because it broadens secret exposure and makes the run depend on unrecorded host state.
- **Judge only source files or one screenshot** — rejected because neither proves install/build behavior, responsive rendering, stable evaluation hooks, or a running application.
- **Compute one aggregate winner score** — rejected because arbitrary weights conceal meaningful trade-offs and overstate the statistical value of a small nondeterministic sample.

## Consequences

The bench costs more time and image storage than an in-place comparison, and real runs consume model tokens. Generated projects must use the documented npm commands and interface hooks to receive complete screenshot evidence. In return, each result is tied to exact prompt, dependency, container, commit, build, and visual artifacts; credentials remain narrowly transported; and reviewers can distinguish a broken deliverable from a stylistic preference without treating one run as a release or security verdict.
