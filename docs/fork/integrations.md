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
| 9Router | Configurable now | Add 9Router as an OpenAI-compatible custom provider through `llm-pi-ai`. | Add keyless local-gateway discovery and request-path integration tests. |

## Configure 9Router

Start 9Router locally and confirm its OpenAI-compatible endpoint and model identifiers. In the DeepSeek Harness Web UI, open **Settings -> Models -> Add a custom provider**, then use:

| Field | Value |
| --- | --- |
| Provider ID | `9router` |
| Base URL | `http://127.0.0.1:20128/v1` |
| API protocol | `openai-completions` |
| API key | A 9Router key or a non-secret placeholder required by the local endpoint |
| Model | An exact model ID returned by the 9Router installation |

For file-based configuration, copy [`integrations/9router/settings.yaml.example`](../../integrations/9router/settings.yaml.example) into the `llm-pi-ai` section of `$DSH_HOME/settings.yaml`, replace the placeholder model ID, and export the referenced key. Keep the loopback address unless the gateway is intentionally secured for remote access.

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
