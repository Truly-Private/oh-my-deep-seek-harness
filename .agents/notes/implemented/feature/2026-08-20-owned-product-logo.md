# Agent Note: Use the owned product logo across the Web surface

Status: implemented

English | [中文](2026-08-20-owned-product-logo.zh.md)

## Problem

The Web sidebar, empty-state hero, favicon, and install manifest used the upstream DeepSeek whale artwork. That mark does not identify this distribution, and maintaining separate inline SVG extracts allowed the browser chrome and rendered application to drift.

## Decision

The Web application serves the supplied cowboy-riding-a-whale artwork as `apps/web/public/omdsh-logo.jpg`. A centered mechanical crop removes unused paper margin without redrawing the artwork. `BrandLogo` in `@truly-private/omdsh-client-ui-primitives` renders that asset in both the expanded and collapsed sidebar and in the empty-state hero. A square padded derivative at `apps/web/public/omdsh-icon.jpg` supplies the favicon and install-manifest icon.

The image remains decorative in labeled controls and beside the hero heading, so it uses an empty alternative text and `aria-hidden`. The visible source and browser icon derive from the same supplied artwork.

## Alternatives considered

**Retain the upstream whale for compact placements.** Two unrelated marks would keep product identity dependent on layout width and preserve the branding ambiguity.

**Generate or trace a new vector version.** An AI redraw or manual trace could change the supplied line art. The original raster is the authoritative artwork.

**Embed the JPEG in every component.** Repeated data URLs would increase JavaScript bundles and create multiple copies to keep synchronized. The Web public asset gives every client component one stable URL.

## Consequences

The rendered application, browser tab, and installed-app metadata share one product mark. The Web composition must serve `/omdsh-logo.jpg` and `/omdsh-icon.jpg`; client primitives used outside that composition must provide the same public asset URLs. Component tests pin the image source and aspect ratio, and the browser lane verifies that the shipped image is visible.
