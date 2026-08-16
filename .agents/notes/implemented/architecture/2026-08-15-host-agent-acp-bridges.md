# Agent Note: Host-agent extensions use the automation-only ACP server

Status: implemented

English | [中文](2026-08-15-host-agent-acp-bridges.zh.md)

## Problem

Pi, Oh My Pi, and Hermes can share a model endpoint with DeepSeek Harness without sharing agent lifecycle semantics. A host extension must preserve DSH permission requests, cancellation, workspace confinement, credential handling, structured results, and process ownership instead of treating endpoint compatibility or captured CLI output as an agent bridge.

## Decision

The downstream ships candidate host-native adapters over the existing automation-only ACP server. Pi and OMP use independent TypeScript entrypoints over one process-owning ACP client; Hermes uses a standard-library Python ACP client registered through `plugin.yaml`. Every model-facing tool accepts only `prompt`. The launcher arguments, canonical workspace root, environment allowlist, permission preset, and cleanup grace are immutable deployment configuration.

The language-neutral version 1 result distinguishes `completed`, `canceled`, `denied`, `failed`, and `incompatible`, with stable error codes and cleanup state. Fourteen JSON fixtures name the required cross-host scenarios. Keyless tests run a scripted ACP child to prove UTF-8 results, permission outcomes, cooperative and forced cancellation cleanup, symlink-aware workspace checks, environment filtering, protocol failures, and concurrent isolation.

Pi and OMP surface ACP permission requests through their host confirmation interfaces and fail closed without a UI. Hermes 0.16.0 plugin handlers expose neither an interactive approval callback nor an abort signal, so the Hermes plugin rejects permission requests by default and remains incomplete for full approval and host-cancellation semantics. The integration status reference labels these paths as candidates rather than complete bridges, consistent with the [reviewed downstream intake policy](../process/2026-08-15-reviewed-downstream-intake.md).

## Alternatives considered

- **Wrap `dsh --profile headless` and parse its output** — rejected because captured stdout does not preserve ACP permission requests, cancellation acknowledgement, or connection-owned teardown.
- **Use the current DSH JSON-RPC SDK** — rejected because its client contract lacks the required mid-turn cancellation and server-to-client permission request path.
- **Expose one MCP server to all hosts** — deferred because the tested Pi and OMP integration points are native extensions, and adding MCP would introduce another translation layer without proving equivalent permission and cancellation behavior.
- **Treat Hermes permission requests as automatically allowed** — rejected because Hermes' missing interaction callback is a compatibility limitation, not authorization.

## Consequences

The adapters reuse DSH's existing session and approval authority and keep model-callable configuration narrow. Process-tree and environment code exists in both TypeScript and Python, so shared fixtures and host-specific tests must continue to detect semantic drift. Pi and OMP can load the candidate extensions, and Hermes can run approval-free ACP tasks, but no host receives a complete-integration label until commit-matched real-host evidence covers every required lifecycle path.
