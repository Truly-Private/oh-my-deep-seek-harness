# Use the Web UI

English | [中文](index.zh.md)

## Start from npm

From the directory the agent may edit, run the reviewed downstream package directly from npm:

```sh
npx --yes @truly-private/omdsh@0.0.1 web
```

The command prints the Web UI URL; the default is `http://127.0.0.1:3080`. The `dsh` process uses its invoking directory as the default filesystem location, but a fresh Web UI has no selected workspace until you add one. The [root quick start](../../../README.md#run) covers 9Router setup, headless tasks, and auditable multi-agent orchestration with the same npm package.

## Configure a model

On first launch, paste the endpoint key into **Connect 9Router to get started**. The shipped first-party route already uses `http://127.0.0.1:20128/v1`, `openai-completions`, `NINE_ROUTER_API_KEY`, and the starter model `kr/claude-sonnet-4.5`. To use another model or combo, open **Settings → Models → 9Router → Edit**, fetch the available models, and apply the exact ID. No server restart is required.

The [model configuration guide](./providers.md) covers other providers and custom OpenAI-compatible endpoints.

## Choose a workspace

Click **Choose workspace**, add the project directory where you started `dsh`, and select it. The session composer remains unavailable until a workspace is selected.

## Run a task

Start a session and send:

> Summarize this repository and identify its main packages.

The agent can read and edit workspace files, run commands, delegate work, and maintain a plan. The Web UI asks before operations that require approval under the active permission policy.

## Continue

- [Configure models](./providers.md)
- [Use the Python SDK](./python-sdk.md)
- [Use other CLI modes](../../../apps/cli/README.md)
- [Develop a plugin](../develop/basic/)
