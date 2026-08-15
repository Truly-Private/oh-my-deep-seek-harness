# oh-my-deep-seek-harness

English | [中文](README.zh.md)

`oh-my-deep-seek-harness` is a security-review-first downstream distribution of [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) for English-speaking operators and integrators. It intentionally trails upstream when review needs more time.

The distribution prioritizes Pi and Oh My Pi (OMP), Hermes Agent, OpenClaw, and 9Router interoperability. [Current integration status](docs/fork/integrations.md) distinguishes working paths from compatibility targets.

> [!IMPORTANT]
>
> A reviewed release means its pinned upstream commit passed the checks recorded by this repository. It is not a claim that the software is vulnerability-free. See the [security policy](SECURITY.md) and [upstream intake policy](docs/fork/upstream-intake.md).

DeepSeek Harness (`dsh`) is the open-source agent harness developed by [DeepSeek AI](https://deepseek.com). The Hermes-oriented product and plugin ideas are inspired by [Yuan Chenglu's `oh-my-deepseek-harness`](https://github.com/yuanchenglu/oh-my-deepseek-harness). See [CREDITS.md](CREDITS.md) for full attribution. This downstream project is independent and is not endorsed by either upstream project.

It uses an architecture where **everything is a plugin**, and is powered by [Cordis](https://github.com/cordiverse/cordis), whose design is described in [_A Programming Paradigm for Spatiotemporal Composability_](https://github.com/cordiverse/paper).

## Developer preview

DeepSeek Harness is currently in _developer preview_ and is iterating rapidly. **THERE WILL BE COMPATIBILITY-BREAKING CHANGES.**

## Run

### Run from `npm`

Install `Node.js`, then run:

```sh
npx @deepseek-ai/dsh web
```

The command starts the Web UI, served at `http://127.0.0.1:3080` by default. See [Web UI guide](docs/user/guide/index.md).

### Run from source

To run from a repository checkout:

```sh
git clone https://github.com/trulyprivate/oh-my-deep-seek-harness.git
cd oh-my-deep-seek-harness
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
