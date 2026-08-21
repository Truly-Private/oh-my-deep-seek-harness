# Design

## Source of truth

- Status: Active
- Last refreshed: 2026-08-21
- Primary product surfaces: Web application and documentation website
- Evidence reviewed: `apps/web/public/omdsh-logo.jpg`, `assets/omdsh-readme-hero.jpg`, `packages/client/ui-primitives/src/BrandLogo.tsx`, `website/.vitepress/config.ts`, and the owned-product-logo Agent Note

## Brand

- Personality: practical, independent, security-conscious, and welcoming to English-speaking operators
- Trust signals: clear downstream ownership, visible upstream attribution, and direct links to the Truly-Private repository
- Avoid: upstream DeepSeek marks as the product identity, ambiguous ownership, and decorative redraws of the supplied artwork

## Product goals

- Goals: identify the distribution consistently and make English the first experience for public documentation visitors
- Non-goals: replacing upstream attribution or redesigning the VitePress documentation system
- Success signals: the product logo appears in application and documentation chrome, and the documentation root lands on English content

## Personas and jobs

- Primary personas: English-speaking operators, integrators, and contributors
- User jobs: evaluate the distribution, install it, configure providers, and find implementation references
- Key contexts of use: desktop and mobile browsers, light and dark themes, and GitHub Pages

## Information architecture

- Primary navigation: Guide, Development, Reference, language selection, search, and repository link
- Core routes/screens: English guide under `/en/`, Chinese guide under `/`, and application routes served by the Web composition
- Content hierarchy: English is the public entry point; the existing language menu preserves access to Chinese documentation

## Design principles

- Reuse the owned artwork from its canonical asset instead of tracing or regenerating it.
- Keep the stock VitePress structure and change only the branding and entry language needed for product identity.
- Tradeoffs: the detailed artwork needs a light image field to remain legible in dark themes.

## Visual language

- Color: retain the existing VitePress theme tokens; the monochrome logo sits on a light neutral field
- Typography: use the stock VitePress system stack and a text wordmark beside the image mark
- Spacing/layout rhythm: preserve existing navigation and sidebar rhythm
- Shape/radius/elevation: use a small rounded logo tile without additional elevation
- Motion: use only existing theme transitions
- Imagery/iconography: `apps/web/public/omdsh-logo.jpg` is the authoritative product mark

## Components

- Existing components to reuse: VitePress default theme and `BrandLogo` in the Web application
- New/changed components: documentation navigation lockup and documentation favicon
- Variants and states: responsive lockup, light theme, and dark theme
- Token/component ownership: VitePress owns documentation layout tokens; the Web public asset owns the logo pixels

## Accessibility

- Target standard: WCAG 2.1 AA for maintained product surfaces
- Keyboard/focus behavior: preserve VitePress defaults
- Contrast/readability: keep the wordmark as text and place the raster logo on a stable light field
- Screen-reader semantics: the logo image is decorative because the adjacent text names the product
- Reduced motion and sensory considerations: add no new motion

## Responsive behavior

- Supported breakpoints/devices: current VitePress desktop and mobile layouts
- Layout adaptations: keep the logo and product name compact enough for the default mobile navigation controls
- Touch/hover differences: preserve default-theme behavior

## Interaction states

- Loading: preserve static-site behavior
- Empty: not applicable to documentation chrome
- Error: preserve VitePress not-found behavior
- Success: English guide content is visible after visiting the site root
- Disabled: not applicable
- Offline/slow network, if applicable: serve the logo as a cacheable static asset from the same origin

## Content voice

- Tone: direct, concise, and operational
- Terminology: use “Oh My DeepSeek Harness” for the distribution and “DeepSeek Harness” only for upstream attribution
- Microcopy rules: navigation labels name destinations; release-stage labels stay short

## Implementation constraints

- Framework/styling system: VitePress default theme with inline site-specific CSS
- Design-token constraints: use existing VitePress CSS variables
- Performance constraints: reuse the canonical raster without adding a runtime dependency
- Compatibility constraints: GitHub Pages supplies the deployment base path at build time
- Test/screenshot expectations: pass documentation gates and visually verify the English route in desktop and mobile layouts

## Open questions

- [ ] Decide whether Chinese should remain at the root route tree or move under an explicit locale prefix in a future information-architecture change.
