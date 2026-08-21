# oh-my-deep-seek-harness

English | [中文](README.zh.md)

<p align="center">
  <img src="assets/omdsh-readme-hero.jpg" alt="oh-my-deep-seek-harness whale rider emblem" width="1000">
</p>

`oh-my-deep-seek-harness` is a security-review-first downstream distribution of [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) for English-speaking operators and integrators. It intentionally trails upstream when review needs more time.

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

> [!NOTE]
>
> The reviewed downstream package is `@truly-private/omdsh`. npm package names are lowercase, so use this spelling even though the GitHub organization is `Truly-Private`. Pin `@0.0.1` when you need the exact first release.

### Use DeepSeek Harness with 9Router

This path sends model requests through [9Router](https://github.com/decolua/9router). DeepSeek Harness does not need `DEEPSEEK_API_KEY`; 9Router owns the credentials for the upstream providers and accounts you connect.

#### 1. Install the prerequisites

Install Node.js `^22.19.0` or `>=24.0.0`, then verify npm can resolve this distribution:

```sh
node --version
npm view @truly-private/omdsh@0.0.1 version
```

Install 9Router:

```sh
npm install -g 9router
```

#### 2. Start 9Router

Run 9Router and leave this terminal open:

```sh
9router
```

9Router opens its dashboard and serves its OpenAI-compatible API at `http://127.0.0.1:20128/v1`.

#### 3. Configure a model in 9Router

In the 9Router dashboard, connect **Kiro AI** for the shipped `kr/claude-sonnet-4.5` starter model. You may instead connect another provider or create a combo; in that case, copy its exact model or combo ID. Copy the 9Router endpoint key from the dashboard.

#### 4. Start DeepSeek Harness in your project

Open a second terminal in the directory the coding agent may edit:

```sh
cd /path/to/project
npx --yes @truly-private/omdsh@0.0.1 web
```

Open the printed URL; the default is `http://127.0.0.1:3080`.

#### 5. Connect the first-party 9Router provider

On first launch, the Web UI opens **Connect 9Router to get started**. Paste the 9Router endpoint key and choose **Save and continue**. The shipped setup already supplies:

| Field | Value |
| --- | --- |
| Base URL | `http://127.0.0.1:20128/v1` |
| API protocol | `openai-completions` |
| Credential reference | `NINE_ROUTER_API_KEY` |
| Starter model | `kr/claude-sonnet-4.5` |

9Router now appears as a first-party row under **Settings → Models**, not under **Add a custom provider**. To use another model or combo, choose **Edit → Customized settings → Fetch available models**, select the exact ID from step 3, and apply the change. The custom-provider form remains available for other OpenAI-compatible gateways.

#### 6. Select the model and run a task

Choose the project directory as the workspace, start a new session, open the model picker, and select the model under **9Router**. Then send a task such as:

> Inspect this repository, explain its main packages, and identify one useful improvement.

A successful response confirms that requests are passing through 9Router. The harness stores the endpoint key under `$DSH_HOME` using the `NINE_ROUTER_API_KEY` reference. The shipped 9Router model is the initial default; selecting another model makes it the default for new Web UI sessions and headless runs.

For file-based setup, use the [`settings.yaml` example](integrations/9router/settings.yaml.example) and the [9Router integration guide](docs/fork/integrations.md#configure-9router).

### Run one coding task

After completing the 9Router steps above, run the headless profile from the directory the agent may edit:

```sh
npx --yes @truly-private/omdsh@0.0.1 --profile headless \
  "Inspect this repository, fix the failing tests, and verify the result."
```

The command creates and persists a fresh session, prints the final response, and exits. See the [headless profile reference](apps/cli/README.md#entry-modes) and the [Python SDK guide](docs/user/guide/python-sdk.md) for embedding the same runtime in an application.

### Run auditable multi-agent orchestration

Enable Code Mode and explicitly request a workflow when agents should coordinate typed tool calls in code:

```sh
DSH_TOOLS_MODE=code npx --yes @truly-private/omdsh@0.0.1 --profile headless \
  "From a run_code program, use the workflow tool to ask independent agents to review security, tests, and architecture. Return one evidence-backed report."
```

The workflow runs a model-written JavaScript program whose `agent()` calls fan out child sessions, while Code Mode lets the parent compose typed tool calls in TypeScript. The root and child sessions persist under `~/.dsh/sessions` or `$DSH_HOME/sessions`. Each event carries a monotonic sequence number and epoch-millisecond timestamp; the logs cover model-visible inputs, tool calls and results, Code Mode sub-dispatches, and workflow lifecycle. Session headers preserve parent-child lineage. Start the Web UI with the same harness home to inspect the saved run.

Use `npx --yes @truly-private/omdsh@0.0.1 --profile headless --dump-config` to inspect the effective plugin tree without booting it. The [plugin configuration catalog](https://deepseek-harness.github.io/deepseek-harness/reference/config-catalog) lists every configurable plugin, and the [persistence catalog](docs/persistence-catalog.md) defines the recorded event types.

### Run from source

When the harness repository itself is the workspace, use its source launcher:

```sh
git clone https://github.com/Truly-Private/oh-my-deepseek-harness.git
cd oh-my-deepseek-harness
pnpm install
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
