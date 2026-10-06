# Design reference — what the merge was built from

These are the **source files** the Reachmark design system and page structures were derived from.
They are kept as read-only reference so any styling decision can be traced back to an upstream file
rather than to taste. The live implementation lives in `apps/web/src`.

## ui-builder (OpenZeppelin)

| Reference file | Used for in Reachmark |
| --- | --- |
| `ui-builder-index.css` | The `glass-panel` / `glass-card` stacking model, scrollbar treatment and base layer that the Reachmark token set re-ramps. |
| `ui-builder-tailwind.config.cjs` | How the upstream themes Tailwind; informs the Tailwind v4 `@theme` block in `apps/web/src/styles/index.css`. |
| `ui-builder-components.json` | shadcn "new-york" configuration (base colour, CSS variables, aliases) — the primitive set Reachmark's `components/ui` mirrors. |
| `uibuilder-WizardLayout.tsx` | Step shell, progress affordance and summary column → the six-step `/sell` wizard. |
| `uibuilder-FieldBasicSettings.tsx`, `uibuilder-FieldAdvancedSettings.tsx` | The per-field settings pattern (label, hint, validation, advanced drawer) → `Field`, `Input`, `Select`, `Toggle` in `components/ui`. |
| `uibuilder-HeroSection.tsx` | Landing hero composition: badge, headline pair, dual CTA, stat row → `pages/Home.jsx`. |

## AccountsBazaar

| Reference file | Used for in Reachmark |
| --- | --- |
| `accountsbazaar-Hero.jsx` | The marketplace hero: rotating subject, stat strip, CTA pair. |
| `accountsbazaar-ListingCard.jsx` | Card anatomy (platform chip, metric row, trust badges, price block, watch toggle) → `components/marketplace/ListingCard.jsx`. |
| `accountsbazaar-FilterSidebar.jsx` | Filter grouping and the `title` / `toggle` sub-components → `components/marketplace/FilterRail.jsx`. |
| `accountsbazaar-Plans.jsx` | Tier layout and feature-list rhythm → `pages/Pricing.jsx`. |
| `accountsbazaar-CredentialSubmission.jsx` | The credential-submission concept, promoted from an admin step to the public credential chain on `/logs/:id`. |
| `accountsbazaar-listingSlice.js` | Redux slice shape → `app/features/catalogSlice.js` (filters, applyFilters semantics, compare list). |

## MoneyPrinterTurbo

| Reference file | Used for in Reachmark |
| --- | --- |
| `mpt-schema.py` | Request/response contracts for the render task → the brief shape produced by `services/studio/reachmark_proof.py`. |
| `mpt-voice.py` | TTS voice catalogue and synthesis call → the voice picker on `/studio`. |

## claw-code

| Reference file | Used for in Reachmark |
| --- | --- |
| `clawcode-dogfood-probe.py` | The concurrent HTTP probe pattern (thread pool, timeout, tolerant error handling) that `tools/claw/claw.py probe` is modelled on, extended with title/theme-colour/favicon extraction. |
