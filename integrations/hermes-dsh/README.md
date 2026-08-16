# Hermes Agent ACP plugin

English | [中文](README.zh.md)

This opt-in candidate plugin registers `dsh_delegate` in Hermes Agent and drives the configured DeepSeek Harness ACP server with Python's standard library. The model supplies only `prompt`; launcher, workspace, environment, and permission settings remain deployment-owned.

## Install

Hermes supports a plugin subdirectory inside a Git repository:

```bash
hermes plugins install Truly-Private/oh-my-deep-seek-harness/integrations/hermes-dsh --no-enable
hermes plugins enable dsh-bridge
```

Pin or inspect the repository commit before enabling the plugin. For local development, enable project plugins and place or link this directory under `.hermes/plugins/dsh-bridge/`.

## Configure

Use the same `DSH_BRIDGE_COMMAND`, `DSH_BRIDGE_ARGS_JSON`, `DSH_BRIDGE_WORKSPACE_ROOT`, and `DSH_BRIDGE_ENV_ALLOWLIST` settings documented by the [shared bridge package](../host-bridge/README.md). Hermes 0.16.0 does not pass an interactive approval callback or an abort signal to plugin tool handlers. The plugin therefore rejects ACP permission requests by default. An external deployment that already enforces equivalent approval may set `DSH_BRIDGE_PERMISSION=allow`; this preset is never model-callable.

The Python client also accepts `DSH_BRIDGE_REQUEST_TIMEOUT_SECONDS` and `DSH_BRIDGE_CANCEL_GRACE_SECONDS`, which default to 30 and 3 seconds. Its cancellation and process-tree behavior is conformance-tested through an internal event, but Hermes cannot supply that event through its 0.16.0 plugin handler.

Home-directory variables and credentials are not inherited by the ACP child. Add every required variable name explicitly to `DSH_BRIDGE_ENV_ALLOWLIST`.

## Verify

Install the repository-pinned Python version through Moonrepo proto before running the plugin tests:

```bash
proto install python
python -W error::ResourceWarning -m unittest discover -s integrations/hermes-dsh/tests -v
```

The plugin is usable for ACP tasks that do not request a new approval. It remains a compatibility target for the full host bridge until Hermes exposes and the repository proves interactive approvals and host cancellation through the real plugin handler.
