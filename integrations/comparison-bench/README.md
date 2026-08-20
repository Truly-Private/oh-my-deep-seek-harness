# Pi comparison bench

English | [中文](README.zh.md)

This bench gives the same substantial coding task to two fresh Pi installations in separate Linux containers: Pi with its built-in coding tools, and Pi loading the candidate `oh-my-deepseek-harness` extension and delegating the task to the DeepSeek Harness ACP runtime. It retains generated workspaces, logs, production-build results, interface checks, and desktop/mobile screenshots for side-by-side review. One run is comparative evidence, not a statistically controlled performance claim or proof that the candidate integration is reviewed.

## Prerequisites

Install the repository runtime pins with Moonrepo proto, start OrbStack on macOS, select its Docker context, and export a DeepSeek API key in the launching shell. The repository Docker context excludes local environment files, package-manager credentials, Pi auth files, and managed harness credential files. The bench never copies a home directory, CLI login, or credential store; Docker forwards only the named `DEEPSEEK_API_KEY` variable to each agent entrypoint. The entrypoint removes it before generated commands run. The harness lane gives its ACP runtime an ephemeral mode-0600 credential file outside the writable workspace and shell sandbox instead of forwarding the key in the ACP environment.

```bash
proto install
orb start
docker context use orbstack
export DEEPSEEK_API_KEY='your key'
just comparison-doctor
```

Real runs call the model API and may incur provider charges. `just comparison-build` is keyless and verifies that both agent images and the screenshot evaluator can be built before spending model tokens.

## Run the benchmark

```bash
just comparison-build
just comparison-all
just comparison-report
```

Use `just comparison-baseline` or `just comparison-harness` to run one lane for diagnosis. A normal run performs fresh no-cache image builds; set `COMPARISON_REUSE_BUILD_CACHE=1` only for local iteration, because a cached run is not fresh-install evidence. `COMPARISON_PI_VERSION` can probe another Pi version without changing the documented pin.

The exact shared task is [`game-prompt.txt`](game-prompt.txt). It asks both agents to build an original Three.js game that combines a timed falling-piece loop with a seedable 6×6 spatial puzzle, seven pegs, movable placed pieces, an animated loss state, endless timed rounds, and local friend challenges. The task fixes observable game and evaluation requirements while leaving art direction, architecture, and one original feature to the agent.

## Method reference

Both lanes use the pinned Pi version, `deepseek-v4-pro`, the same prompt bytes, an empty output directory, and the same CPU, memory, process, and wall-time limits. The baseline lane runs Pi with `read`, `bash`, `edit`, and `write`. The harness lane loads the packed Pi extension and calls `dsh_delegate` directly; it does not spend a separate Pi model turn deciding whether to delegate. The DeepSeek Harness ACP server uses `workspace-write`, reads the model credential from the ephemeral file described above, exposes only non-secret harness configuration through the bridge environment allowlist, and is launched from the current repository commit.

Agent containers require network access for the model API and generated-app package installation. They run as an unprivileged user with Linux capabilities dropped, `no-new-privileges`, bounded resources, an ephemeral temporary directory, and a single writable bind mount for their output. Generated commands do not inherit the API-key variable. The containers receive no Docker socket or host credential paths.

After generation, a separate evaluator container receives the completed workspace and its lane evidence directory. It has no network or credential, uses a read-only root filesystem, runs the project's tests when available, requires `npm run build`, starts the mandated local development server, checks the stable `data-testid` hooks, and captures `desktop-start.png`, `desktop-playing.png`, and `mobile-start.png` at seed `314159`. A missing test command is recorded as a comparison warning; a failed build, unavailable server, missing interface hook, or failed screenshot makes the lane fail.

## Evidence and interpretation

Each run writes `.artifacts/comparison/<UTC run id>/manifest.json`. The manifest records the repository commit and dirty state, Docker context, exact versions, prompt hash, lane order, resource limits, durations, Pi usage when available, bridge cleanup, generated-file hashes, interface checks, and screenshot names. The lane folders contain the retained workspaces and build, test, server, agent, capture, and image-build logs.

Review the generated games for functional completeness, visual quality, rules fidelity, maintainability, and recovery from invalid play. Provider load and nondeterministic model output can affect a single result, so repeat trials and alternate the recorded lane order before drawing broader conclusions. The bench does not promote an integration status, expose a friend-score service, or publish either generated game.
