# Pi and Oh My Pi ACP extensions

English | [中文](README.zh.md)

This candidate package lets Pi or Oh My Pi (OMP) register a `dsh_delegate` tool that starts a separately configured DeepSeek Harness ACP server. The model can supply only the delegated prompt; the extension owns the executable, arguments, workspace root, environment allowlist, approval path, cancellation, and process-tree cleanup.

## Configure the ACP launcher

Set the launcher explicitly before loading either extension. A source checkout can use the repository's key-backed ACP demo:

```bash
export DSH_BRIDGE_COMMAND=pnpm
export DSH_BRIDGE_ARGS_JSON='["--dir","/absolute/path/to/oh-my-deepseek-harness","run","demo:acp"]'
export DSH_BRIDGE_WORKSPACE_ROOT=/absolute/path/to/allowed/workspace
export DSH_BRIDGE_ENV_ALLOWLIST=DEEPSEEK_API_KEY
export DSH_BRIDGE_REQUEST_TIMEOUT_MS=30000
```

`DSH_BRIDGE_PERMISSION=interactive` is the default. Pi and OMP show each ACP permission request through their confirmation UI and fail closed when no UI is available. `allow` and `reject` are deployment presets set outside model input; use `allow` only where the surrounding host already provides an equivalent approval policy.

The child receives only locale, executable-search, temporary-directory, and required Windows runtime variables by default. Home-directory variables and credentials are excluded; add each required name, such as `DEEPSEEK_API_KEY` or `DSH_HOME`, to `DSH_BRIDGE_ENV_ALLOWLIST` explicitly.

`DSH_BRIDGE_REQUEST_TIMEOUT_MS` bounds each ACP request and defaults to 30 seconds. `DSH_BRIDGE_CANCEL_GRACE_MS` bounds graceful process cleanup and defaults to 3 seconds. A request timeout returns the retryable `BRIDGE_REQUEST_TIMEOUT` result; host cancellation remains `BRIDGE_CANCELED` and reaches startup, approval, and prompt waits.

## Load in Pi

From a clone pinned to a commit whose candidate evidence you have inspected, load the Pi entrypoint directly:

```bash
pi --extension /absolute/path/to/oh-my-deepseek-harness/integrations/host-bridge/src/pi/index.ts
```

The package also declares its Pi entrypoint under `pi.extensions`, so Pi package installation can discover it from the repository. Run `/dsh-bridge-status` to confirm discovery.

## Load in Oh My Pi

OMP uses a separate entrypoint and its own schema and approval metadata:

```bash
omp --extension /absolute/path/to/oh-my-deepseek-harness/integrations/host-bridge/src/omp/index.ts
```

Run `/dsh-bridge-status` to confirm discovery. OMP 17.3.4 requires Bun 1.3.14 or newer.

## Verify

Install the repository-pinned Node, Bun, Python, and pnpm versions through Moonrepo proto, then run the focused checks:

```bash
proto install
pnpm --filter @truly-private/dsh-host-bridge typecheck
pnpm --filter @truly-private/dsh-host-bridge test
```

The keyless suite uses a scripted ACP process and covers UTF-8 results, permission outcomes, cancellation, forced process-tree cleanup, canonical workspace checks, environment allowlisting, protocol failures, and concurrent sessions. A focused snapshot also loads the extension through the real Pi SDK, retrieves the active `dsh_delegate` tool, and executes it against that ACP fixture. Real provider execution still needs the configured DSH credential, and the downstream remains a candidate.
