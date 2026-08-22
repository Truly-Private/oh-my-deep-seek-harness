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
npx @truly-private/omdsh web
```

The command starts the Web UI at `http://127.0.0.1:3080` by default and opens it in the default browser for a local launch. An SSH launch only prints the host URL because the SSH client or editor owns the local forwarded address. Pass `--no-open` to run the server without opening a browser. See [Web UI guide](docs/user/guide/index.md).

### Run from source

When the harness repository itself is the workspace, use its source launcher:

```sh
git clone https://github.com/Truly-Private/oh-my-deepseek-harness.git
cd oh-my-deepseek-harness
pnpm install
pnpm dsh web
```

`pnpm run build` prepares the repository artifacts. `pnpm dsh web` uses those built artifacts without rebuilding.

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
