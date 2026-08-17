# Clean-room host integration checks

English | [中文](README.zh.md)

This harness fresh-installs the documented Pi, Oh My Pi (OMP), and Hermes Agent compatibility versions into disposable Linux containers. It tests the candidate adapters without API keys and saves commit-matched logs for review. Passing this harness does not change the downstream from candidate status or prove the complete host-integration matrix.

## Prerequisites

Install the repository runtime pins with Moonrepo proto. On macOS, start OrbStack and select its Docker context. Install `just` as the command runner; it does not install a language runtime.

```bash
proto install
orb start
docker context use orbstack
just cleanroom-doctor
```

Linux CI can use a compatible Docker engine. The macOS doctor refuses a non-OrbStack context unless an operator deliberately sets `CLEANROOM_ALLOW_NON_ORBSTACK=1`.

## Run the checks

```bash
just cleanroom-all
just cleanroom-pi
just cleanroom-omp
just cleanroom-hermes
just cleanroom-report
```

Each normal check performs a no-cache build from the digest-pinned Ubuntu image. The build downloads the checksum-pinned proto binary, installs Node, Bun, and Python through proto, and then installs the exact host version from its public package registry. Pi and OMP install an `npm pack` tarball of the candidate bridge into the clean host project. Hermes installs its public wheel and loads a copied candidate plugin from a new temporary Hermes home.

The test container then runs as an unprivileged user with a read-only root filesystem, all Linux capabilities dropped, `no-new-privileges`, bounded CPU, memory, and process counts, one temporary filesystem, no volume mounts, and `--network none`. No host home directory, credential store, environment file, API key, or Docker socket enters the container.

## Evidence

Every run writes `.artifacts/clean-room/<UTC run id>/manifest.json` plus separate build and test logs for each selected host. The manifest records the repository commit, dirty-tree state, Docker context, exact versions, isolation settings, and pass or failure state. `just cleanroom-report` prints the newest manifest and its directory; capture that terminal output and the three host result lines for release-review screenshots.

The default compatibility pins live in [`versions.json`](versions.json). A maintainer can probe a specific newer host with `CLEANROOM_PI_VERSION`, `CLEANROOM_OMP_VERSION`, or `CLEANROOM_HERMES_VERSION`. Such a probe is evidence for that run only and does not update a support claim.

## Current coverage

| Host | Clean-room assertion | Deliberate limitation |
| --- | --- | --- |
| Pi 0.84.2 | A fresh real Pi SDK loads the packed extension and executes `dsh_delegate` against the keyless ACP fixture, preserving UTF-8 and clean child teardown. | No real model or credential is used. |
| OMP 17.3.4 | A fresh real OMP RPC host loads the packed extension and exposes `dsh-bridge-status`. | The container does not claim the complete model-driven OMP lifecycle matrix. |
| Hermes 0.16.0 | A fresh real Hermes plugin manager loads the plugin and dispatches an approval-free `dsh_delegate` call against the keyless ACP fixture. | Hermes 0.16.0 still supplies neither an interactive approval callback nor host cancellation to the plugin handler. |

The shared conformance suite remains responsible for cancellation, permission outcomes, workspace containment, environment filtering, protocol failures, concurrent isolation, and forced cleanup. A reviewed release still requires commit-matched remote checks and human maintainer approval.
