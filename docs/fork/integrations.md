# Integration status

English | [中文](integrations.zh.md)

This reference separates model-provider interoperability from host-agent interoperability. Sharing an OpenAI-compatible endpoint does not make two agent runtimes interchangeable: host integration also needs tool, permission, cancellation, session, and result semantics.

| Target | Current level | Supported path | Next compatibility milestone |
| --- | --- | --- | --- |
| Pi provider library | Available upstream | `dsh-llm-pi-ai` supplies multi-provider model routing inside DeepSeek Harness. | Continue testing DeepSeek models and gateway-specific behavior. |
| Pi coding agent | Candidate extension | The [Pi ACP extension](../../integrations/host-bridge/README.md) registers `dsh_delegate`; its real loader and keyless ACP contract pass locally. | Prove a model-driven tool call, host cancellation, and approval transcript against the exact published commit. |
| Oh My Pi (OMP) | Candidate extension | The [OMP ACP extension](../../integrations/host-bridge/README.md) registers the same tool through an independent OMP entrypoint; its real loader and keyless ACP contract pass locally. | Prove the complete OMP host matrix on Bun and record commit-matched transcripts. |
| Hermes Agent | Candidate plugin; full bridge target | The [Hermes ACP plugin](../../integrations/hermes-dsh/README.md) executes approval-free ACP tasks and rejects permission requests when no safe callback exists. | Add and prove real Hermes approval and cancellation callbacks before calling the host bridge complete. |
| OpenClaw | Compatibility target | OpenClaw and `dsh` can use the same local 9Router endpoint independently. | Add an OpenClaw adapter with explicit workspace and approval boundaries. |
| 9Router | First-party provider | The base bundle ships a `9router` route through `llm-pi-ai`, including onboarding, local endpoint defaults, a safe credential reference, model discovery, and the downstream default model. | Add a live request-path integration test against a pinned 9Router release. |

## Configure 9Router

Start 9Router locally, connect Kiro AI or another upstream provider, and copy the endpoint key. On first launch, paste that key into **Connect 9Router to get started**. The base bundle supplies:

| Field | Value |
| --- | --- |
| Base URL | `http://127.0.0.1:20128/v1` |
| API protocol | `openai-completions` |
| Credential reference | `NINE_ROUTER_API_KEY` |
| Starter model | `kr/claude-sonnet-4.5` |

The route appears as **9Router** in the Models page without using the custom-provider form. Choose **Edit**, then **Fetch available models**, to replace the starter model with any exact model or combo ID returned by the installation. For file-based overrides, copy [`integrations/9router/settings.yaml.example`](../../integrations/9router/settings.yaml.example) into the `llm-pi-ai` section of `$DSH_HOME/settings.yaml`, replace the placeholder model ID, and export the referenced key. Keep the loopback address unless the gateway is intentionally secured for remote access.

## Bridge requirements

A host-agent integration is not complete until an automated test proves all of the following:

- the host starts and stops `dsh` without orphaned processes;
- prompts and tool results preserve UTF-8 and structured data;
- cancellation reaches the running task;
- workspace access is explicit and cannot silently widen;
- secrets remain references rather than prompt or log content;
- approval requests remain visible to the person operating the host;
- an upstream compatibility break fails clearly instead of falling back to broader access.

The candidate Pi and OMP extensions have keyless contract and loader evidence, but they do not satisfy the complete host matrix yet. Hermes remains a full-bridge compatibility target because Hermes 0.16.0 plugin handlers expose neither an interactive approval callback nor host cancellation. OpenClaw remains a compatibility target with no adapter in this repository.

## Clean-room installation evidence

The [`just`-fronted clean-room harness](../../integrations/clean-room/README.md) fresh-installs the documented Pi, OMP, and Hermes versions in disposable containers. Pi and OMP load the packed bridge from a clean host project; Hermes loads the candidate plugin through its real plugin manager. Test execution is keyless, offline, non-root, read-only, and credential-free, and it retains a commit and version manifest plus per-host logs. This evidence strengthens the candidate paths but does not satisfy the missing approval, cancellation, and model-driven milestones above.
