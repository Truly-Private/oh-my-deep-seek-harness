# Agent Note: 9Router is the distribution's first-party provider

Status: implemented

English | [中文](2026-08-20-first-party-9router-provider.zh.md)

## Problem

The npm quick start described 9Router as the preferred model gateway, but the assembled product treated it as a hand-declared custom provider. A user had to know the pi-ai profile format, choose a protocol, enter a local endpoint, choose a route id, supply a model id, and avoid deriving `9ROUTER_API_KEY`, which is not a valid POSIX environment-variable name because it starts with a digit. The shipped default model and first-run credential prompt still selected the direct DeepSeek route, so following the 9Router documentation did not make the first Web or headless session usable.

## Decision

The base bundle configures a complete `9router` route through `@truly-private/omdsh-llm-pi-ai`: display name `9Router`, OpenAI Chat Completions at `http://127.0.0.1:20128/v1`, credential reference `NINE_ROUTER_API_KEY`, and starter model `kr/claude-sonnet-4.5`. The base Agent default selects that route and model.

`llm-pi-ai` owns a small first-party preset roster beside pi-ai's installed catalog. A configured route in that roster is reported as shipped (`declared: false`) in the configurable-provider directory even though pi-ai does not include it. The roster does not activate or offer an incomplete route in a bare adapter; the distribution composition must supply the endpoint, protocol, credential reference, and starter model. This keeps provider construction in the existing multi-provider adapter while making the distribution's supported setup explicit.

The Models onboarding step targets the configured `9router` entry under `llm-pi-ai.providers.9router`. It asks only for the endpoint key and continues to use the shared readiness rule: any other usable provider ends the step. The Models page can interrogate 9Router's OpenAI-compatible model listing and replace the starter model without a restart. DeepSeek and every pi-ai catalog provider remain available as alternatives.

## Alternatives considered

**Keep 9Router as a custom provider.** Rejected because the product would continue asking for facts the distribution already knows, label its supported setup Custom, and derive an invalid digit-leading credential reference unless the user knew to override it by hand.

**Create a dedicated `llm-9router` adapter package.** Rejected because 9Router uses the OpenAI-compatible route declaration, credential seam, discovery action, model metadata, retry policy, and settings editor already owned by `llm-pi-ai`. A second adapter would duplicate those mechanisms without a distinct wire protocol or lifecycle.

**Add 9Router to every bare `llm-pi-ai` directory.** Rejected because a directory entry marked shipped hides the endpoint, protocol, and display-name fields that a custom route needs. Without a composition-supplied profile, selecting that entry could not produce a serviceable route.

**Name the credential `9ROUTER_API_KEY`.** Rejected because credential references are POSIX shell identifiers and cannot start with a digit. The spelled-out `NINE_ROUTER_API_KEY` stays valid in environment variables, the managed credential file, and settings validation.

## Consequences

A new npm installation has one credential-only path from first launch to a routable default model. The same route appears as **9Router** in Models and in the model picker, and headless sessions inherit it unless the user selects another default. The starter model assumes the operator connected Kiro AI under that id; an installation using another upstream or combo must fetch or enter its exact id before sending a request.

The base-bundle test pins the serialized profile and default. Adapter tests pin the first-party directory classification and route metadata. The assembled Web composition pins the active provider, starter model, directory entry, and Agent default, while the keyless browser onboarding snapshots exercise the managed credential write and model replacement without contacting 9Router.
