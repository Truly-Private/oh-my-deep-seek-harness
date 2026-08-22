# Agent Note: CodeQL intake hardening

Status: implemented

English | [中文](2026-08-22-codeql-intake-hardening.zh.md)

## Problem

The upstream intake introduced regular expressions that could take superlinear time while locating HTML tags, trimming provider endpoint slashes, or extracting a PowerShell test marker. Dynamic package prechecks also parsed model-written code through the host-realm `Function` constructor before recompiling it with `node:vm`, even though host execution already uses the VM parser.

## Decision

Repository-sized HTML uses a bounded linear tag scan, provider endpoint normalization walks backward over trailing ASCII slashes, and the PowerShell fixture uses the marker's single delimiter rule without a nested repetition. Regression cases exercise long malformed HTML and long slash suffixes, while the existing persistent-shell suite covers marker extraction.

Dynamic package prechecks compile the same async-function wrapper directly with `vm.Script` and never run it. This removes the redundant host-realm compiler while preserving the product's intentional executable-plugin feature and its documented stance that the VM is not a security boundary.

## Alternatives considered

**Dismiss the regular-expression findings as inherited upstream code.** Provenance does not reduce denial-of-service risk, and the linear implementations preserve behavior without exclusions.

**Keep `new Function` as a browser-compatible precheck.** The browser half does not load the host sandbox module, so a second parser and its different syntax behavior provide no compatibility benefit.

**Disable the CodeQL queries for dynamic code.** The executable-plugin feature remains visible to analysis; any remaining alert requires a finding-specific disposition tied to its documented trust model.

## Consequences

Tag insertion, endpoint normalization, and marker extraction have linear work in input length. Define-time and run-time host parsing now share one parser and wrapper. GitHub security evidence still requires inspecting the exact commit's open-alert inventory, and this change does not promote the upstream lock beyond `candidate`.
