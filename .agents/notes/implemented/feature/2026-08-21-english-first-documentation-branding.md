# Agent Note: Make the documentation entry point English-first

Status: implemented

English | [中文](2026-08-21-english-first-documentation-branding.zh.md)

## Problem

The documentation root opened the Chinese guide and used the upstream DeepSeek wordmark, while this distribution serves English-speaking operators under its own product identity. The first public page therefore communicated the wrong audience and ownership.

## Decision

The documentation root redirects to the existing English guide under `/en/`. The language menu continues to expose the Chinese route tree, so the change selects the public entry language without removing maintained translations.

The navigation lockup, favicon, site title, description, GitHub link, edit links, and projected links to unpublished repository sources identify Oh My DeepSeek Harness and the Truly-Private repository. VitePress serves `apps/web/public/omdsh-logo.jpg` and its square `apps/web/public/omdsh-icon.jpg` derivative from the documentation base path. The static page chrome references those authoritative assets without tracing, regenerating, or maintaining another copy.

## Alternatives considered

**Move every English route to the root route tree.** Reversing both locale trees would change all published documentation URLs and the projection manifest. Redirecting the entry point provides the intended first experience without an unrelated route migration.

**Copy the logo into `website/public`.** A second raster would create another product asset that could drift from the Web application. Serving the Web public directory keeps the existing asset authoritative.

**Keep the DeepSeek wordmark with a downstream label.** The upstream mark would remain the dominant identity even though the site documents an independent distribution.

## Consequences

Visitors who open the site root arrive at English content, while direct Chinese routes remain available. The cacheable logo and favicon add static requests without repeating base64 payloads in generated page metadata. Documentation checks pin the projected routes, while a production-build smoke check verifies the base-aware asset URLs and rendered lockup.
