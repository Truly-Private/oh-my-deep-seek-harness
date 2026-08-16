# oh-my-deepseek-harness

English | [中文](README.zh.md)

`oh-my-deepseek-harness` is a security-review-first downstream distribution of [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) for English-speaking operators and integrators. It intentionally trails upstream when review needs more time.

The distribution prioritizes Pi and Oh My Pi (OMP), Hermes Agent, OpenClaw, and 9Router interoperability. [Current integration status](docs/fork/integrations.md) distinguishes working paths from compatibility targets.

> [!IMPORTANT]
>
> A reviewed release means its pinned upstream commit passed the checks recorded by this repository. It is not a claim that the software is vulnerability-free. See the [security policy](SECURITY.md) and [upstream intake policy](docs/fork/upstream-intake.md).

DeepSeek Harness (`dsh`) is the open-source agent harness developed by [DeepSeek AI](https://deepseek.com). The Hermes-oriented product and plugin ideas are inspired by [Yuan Chenglu's `oh-my-deepseek-harness`](https://github.com/yuanchenglu/oh-my-deepseek-harness). See [CREDITS.md](CREDITS.md) for full attribution. This downstream project is independent and is not endorsed by either upstream project.

It uses an architecture where **everything is a plugin**, and is powered by [Cordis](https://github.com/cordiverse/cordis), whose design is described in [_A Programming Paradigm for Spatiotemporal Composability_](https://github.com/cordiverse/paper).

## Developer preview

DeepSeek Harness is currently in _developer preview_ and is iterating rapidly. **THERE WILL BE COMPATIBILITY-BREAKING CHANGES.**

<a id="run"></a>

## Quick starts

### Chat with the coding agent

Install `Node.js`, then run:

```sh
npx @deepseek-ai/dsh web
```

The command starts the Web UI, served at `http://127.0.0.1:3080` by default. See [Web UI guide](docs/user/guide/index.md).

### Connect 9Router

In another terminal, install and start [9Router](https://github.com/decolua/9router), then use its dashboard to connect an upstream provider or account, create a 9Router endpoint key, and note the exact model or combo ID you want to use:

```sh
npm install -g 9router
9router
```

In the DeepSeek Harness Web UI, open **Settings → Models → Add a custom provider** and enter:

| Field | Value |
| --- | --- |
| Provider ID | `9router` |
| Base URL | `http://127.0.0.1:20128/v1` |
| API protocol | `openai-completions` |
| API key | The endpoint key from the 9Router dashboard |
| Model | The exact 9Router model or combo ID |

Save the provider, start a session, and select its model once. The harness stores the credential under `$DSH_HOME` and uses that selection as the default for new Web UI sessions and headless runs. For file-based setup, use the [`settings.yaml` example](integrations/9router/settings.yaml.example) and the [9Router integration guide](docs/fork/integrations.md#configure-9router).

### Run one coding task

After selecting the 9Router model above, run the headless profile from the directory the agent may edit:

```sh
npx @deepseek-ai/dsh --profile headless \
  "Inspect this repository, fix the failing tests, and verify the result."
```

The command creates and persists a fresh session, prints the final response, and exits. See the [headless profile reference](apps/cli/README.md#entry-modes) and the [Python SDK guide](docs/user/guide/python-sdk.md) for embedding the same runtime in an application.

### Run auditable multi-agent orchestration

Enable Code Mode and explicitly request a workflow when agents should coordinate typed tool calls in code:

```sh
DSH_TOOLS_MODE=code npx @deepseek-ai/dsh --profile headless \
  "From a run_code program, use the workflow tool to ask independent agents to review security, tests, and architecture. Return one evidence-backed report."
```

The workflow runs a model-written JavaScript program whose `agent()` calls fan out child sessions, while Code Mode lets the parent compose typed tool calls in TypeScript. The root and child sessions persist under `~/.dsh/sessions` or `$DSH_HOME/sessions`. Each event carries a monotonic sequence number and epoch-millisecond timestamp; the logs cover model-visible inputs, tool calls and results, Code Mode sub-dispatches, and workflow lifecycle. Session headers preserve parent-child lineage. Start the Web UI with the same harness home to inspect the saved run.

Use `npx @deepseek-ai/dsh --profile headless --dump-config` to inspect the effective plugin tree without booting it. The [plugin configuration catalog](https://deepseek-harness.github.io/deepseek-harness/reference/config-catalog) lists every configurable plugin, and the [persistence catalog](docs/persistence-catalog.md) defines the recorded event types.

### Run from source

To run from a repository checkout:

```sh
git clone https://github.com/Truly-Private/oh-my-deepseek-harness.git
cd oh-my-deepseek-harness
pnpm install
pnpm run build
pnpm dsh web
```

## Community and support

- Feel free to submit feedback or bug reports through [GitHub Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions).
- Add the [`dsh-plugin`](https://github.com/topics/dsh-plugin) topic to your plugin repository for discoverability.
- Join <a href="https://discord.gg/Ycq5dCaS4">DeepSeek Harness Discord community</a>.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Development

Start with the [development guide](docs/development.md) and [architecture documentation](docs/architecture.md).

For agents, follow [AGENTS.md](AGENTS.md).

## License

[MIT](LICENSE)

Third-party dependencies and their licenses are disclosed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
