# Integration status

English | [中文](integrations.zh.md)

This reference separates model-provider interoperability from host-agent interoperability. Sharing an OpenAI-compatible endpoint does not make two agent runtimes interchangeable: host integration also needs tool, permission, cancellation, session, and result semantics.

| Target | Current level | Supported path | Next compatibility milestone |
| --- | --- | --- | --- |
| Pi provider library | Available upstream | `dsh-llm-pi-ai` supplies multi-provider model routing inside DeepSeek Harness. | Continue testing DeepSeek models and gateway-specific behavior. |
| Pi coding agent | Compatibility target | Run Pi and `dsh` as separate agents against the same provider or gateway. | Add an executable agent bridge with cancellation, permissions, and transcript tests. |
| Oh My Pi (OMP) | Compatibility target | OMP and `dsh` can use the same DeepSeek or 9Router endpoint independently. | Test a delegated `dsh` tool or ACP bridge in an OMP session. |
| Hermes Agent | Compatibility target | Hermes can use DeepSeek independently; no Hermes plugin ships in this repository yet. | Build a Hermes plugin over a stable `dsh` automation interface without changing Hermes core. |
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

These requirements intentionally keep Hermes, OpenClaw, Pi, and OMP marked as compatibility targets until their adapters carry executable evidence.
