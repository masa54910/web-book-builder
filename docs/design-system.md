# WebBookMaker Design Foundation

Gate 22 documents the existing visual language and adds a small, semantic foundation for future UI work. It is intentionally additive: current CSS Modules, `globals.css`, Tailwind utilities, and persisted book settings remain valid and continue to render the same way.

## Inventory and architecture

The application currently uses `src/app/globals.css` for shared chrome and reader/editor primitives, CSS Modules for page-specific layouts, and TypeScript models in `src/lib/themeSystem.ts`, `src/lib/coverDesign.ts`, `src/lib/pageAdjustments.ts`, and `src/config/bookConfig.ts`. The large landing page stylesheet remains page-local; it is not rewritten in this gate.

The new contract is:

1. semantic CSS custom properties in `globals.css` for new shared UI;
2. `src/lib/designSpec.ts` for a validated, renderer-facing book design shape;
3. `designSpecFromBookConfig()` as a read-only adapter for legacy projects.

No database migration or persistence format change is required.

## Semantic tokens

Tokens use the `--wbm-` prefix and cover semantic color roles, typography roles, spacing, shape, elevation, motion, content widths, and existing desktop/tablet/mobile breakpoints. Values are deliberately mapped to the current palette and dimensions. Existing variables and classes remain untouched, so token introduction alone cannot recolor the application.

New components should prefer roles such as `--wbm-color-surface`, `--wbm-color-text-muted`, `--wbm-color-border`, `--wbm-radius-md`, `--wbm-shadow-sm`, and `--wbm-motion-normal` instead of inventing a one-off value. A token is semantic when its meaning is stable (for example, “surface”); near-identical colors with different meanings should not be merged automatically.

## Typography and content roles

The existing book theme settings remain the source of truth for `fontFamily`, `fontScale`, `lineHeight`, page background, margins, width, and image layout. The design spec mirrors those safe options and keeps reader/article typography separate from dashboard chrome. Display, heading, body, label, and caption token sizes are available for new shared UI without replacing existing article rules.

## Safe Design Spec

`BookDesignSpec` contains only allow-listed theme, typography, palette, page, cover, image, and motion options. Cover layouts and positions are the ten existing cover options; numeric cover values are bounded to the same ranges used by the cover normalizer. `parseBookDesignSpec()` rejects unknown enum values, non-hex colors, HTML/CSS-like title overrides, and out-of-range numbers. It does not accept arbitrary CSS, HTML, or class names.

`DEFAULT_BOOK_DESIGN_SPEC` represents the existing Classic book defaults (`layout-01`, RTL binding, paper background, mincho/medium/normal typography). `designPresets.default` is the intentionally small preset registry foundation. AI APIs, prompts, model calls, and a new renderer are explicitly deferred.

## Components and accessibility

Existing Button, input, card, alert, modal, article-link, status, editor chrome, and reader chrome implementations remain in place. This gate does not mass-replace them. New adoption should preserve `:focus-visible`, disabled states, keyboard operation, adequate touch targets, and `prefers-reduced-motion`; the design spec’s motion contract always respects reduced-motion preferences.

## Responsive and visual-regression rules

Respect the existing 480px mobile, 768px tablet, and 1024px desktop breakpoints. Do not introduce a new breakpoint for a one-off component. Before adopting a token in existing UI, compare desktop, tablet, and mobile screenshots and confirm there is no color, spacing, line-height, button-size, overflow, or layout shift.

## Backward compatibility

Legacy `BookConfig` objects may omit theme settings and cover design. `designSpecFromBookConfig()` supplies the same defaults used by the existing theme and cover normalizers without writing back or migrating data. Gate 21 editor history remains session state and is unrelated to any future AI design history.

## Do / don’t

- Do use semantic `--wbm-` tokens and allow-listed spec values for new work.
- Do keep existing page-specific CSS when its semantics are genuinely local.
- Don’t put arbitrary CSS, HTML, or class names in a design spec.
- Don’t convert this foundation into a redesign, a Tailwind/CSS-Modules migration, or a database migration.
