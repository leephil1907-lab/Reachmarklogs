# Reachmark Logs

> **The escrow-protected marketplace for social, gaming, streaming and aged digital logs.**
> Built by merging four repositories — AccountsBazaar, OpenZeppelin ui-builder, MoneyPrinterTurbo and
> claw-code — into one monorepo, then clawing them for everything useful.

<p>
  <img alt="routes" src="https://img.shields.io/badge/routes-17-7c5cff?style=flat-square" />
  <img alt="source files clawed" src="https://img.shields.io/badge/files%20clawed-1%2C084-22d3ee?style=flat-square" />
  <img alt="lines analysed" src="https://img.shields.io/badge/lines%20analysed-231k-4ade80?style=flat-square" />
  <img alt="reference tools" src="https://img.shields.io/badge/reference%20tools-50-f472b6?style=flat-square" />
  <img alt="license" src="https://img.shields.io/badge/license-MIT-b9c4dd?style=flat-square" />
</p>

---

## Run it

```bash
npm install                      # installs the web workspace
npm run dev                      # → http://localhost:5173
```

The client is **local-first**: the seeded catalog, chat threads, ops queue and session all live in the
browser, so every screen is fully interactive with no database, no keys and no network calls.

```bash
npm run claw                     # claw all four repos + probe the 50 reference sites
npm run claw:doctor              # preflight: repos present, manifests fresh
npm run merge:report             # regenerate MERGE.md from the manifests
npm run build                    # production build
node apps/web/scripts/smoke.mjs  # render every route through SSR, report errors
```

Optional services (only needed for live data):

```bash
npm run api                      # Express + Prisma API        → :3000
npm run studio                   # FastAPI proof-reel renderer → :8501
```

---

## What it does

Reachmark Logs is a marketplace for **digital logs** — social accounts, gaming profiles, streaming
seats and aged mail/SaaS credentials. The product is built around one promise: *the handover behaves
like a bank transfer.*

| Protocol stage | What happens | Where you see it |
| --- | --- | --- |
| **Fund escrow** | Buyer commits funds. Seller sees them but cannot touch them. | `/logs/:id` escrow sheet, `/messages` |
| **Ownership test** | Recorded screen share: live login, metrics from the platform itself, not a static export. | `/logs/:id` → Proof vault |
| **Credential chain** | Every artefact and mutation timestamped and hashed — the evidence a dispute is settled on. | `/logs/:id` → Credential chain, `/admin` |
| **Release + warranty** | Funds settle on confirmation; 7-day cover for rollback or reclaim. | `/dashboard` payouts, `/trust` |

### Feature tour

| Route | What is there |
| --- | --- |
| `/` | Cinematic hero with rotating subject line, live escrow-card stack, animated floor velocity chart, 4-stage protocol, escrow simulation, operator stories, orchestrated scroll reveals |
| `/marketplace` | 72 seeded logs · filter rail (asset class, platform, price band, reach floor, niche, trust flags, region) · 7 sort modes · grid/list toggle · compare tray · pagination |
| `/logs/:id` | Proof vault gallery + lightbox, KPI tiles, four tabs (Overview / Proof vault / Credential chain / Price history), animated escrow modal, seller panel, verification checklist, comparable logs |
| `/sell` | Six-step wizard (platform → identity → metrics → proof → pricing → review) with live validation, readiness score, fair-value model, fee preview and a publish gate |
| `/dashboard` | Balance/escrow/lifetime KPIs, 12-month earnings chart, listings table, orders with release countdowns, payouts, watchlist, withdrawal modal |
| `/messages` | Escrow-guarded threads, the Reachmark guard bot, typing indicator, quick offers, thread reporting, safety rules |
| `/admin` | GMV + fee chart, risk signals, verification queue with detail inspector and state machine, payout approvals, inventory with credential-chain columns, immutable audit trail |
| `/studio` | Proof Studio (MoneyPrinterTurbo engine): script editor, voice picker with animated waveform, scene timeline with playhead, style presets, aspect switching, render job console |
| `/tools` | The 50 clawed reference tools grouped by category, live probe status, and per-tool detail on how it feeds this build |
| `/docs` | Build manifest explorer: capability matrix, source-repo stats, Prisma data-model browser, 125-component inventory, architecture layers |
| `/pricing` · `/trust` · `/academy` · `/about` · `/auth` · `*` | Plans + fee calculator, trust centre with dispute walkthrough, roadmap-style academy, merge provenance, demo auth, 404 |

---

## The merge

Four repositories were imported verbatim into `upstream/`, then merged by capability rather than by
directory. Nothing was thrown away; only ~56 MB of sample MP3s were pruned.

| Repository | Role in Reachmark | Kept | Changed |
| --- | --- | --- | --- |
| **AccountsBazaar** | The business logic | Prisma schema, Express routes/controllers, Clerk auth, Stripe webhooks, Inngest jobs, admin workflow, short-poll chat | Re-skinned; asset taxonomy widened from social-only to four classes; credential chain promoted from an admin page to the public trust surface |
| **ui-builder** | Design system & wizard engine | shadcn "new-york" base, Radix primitives, Tailwind token layering, gradient-hairline card shell, multi-step wizard with live validation | Blockchain pickers replaced with platform/asset pickers; tokens re-ramped to the Reachmark dark-premium palette |
| **MoneyPrinterTurbo** | Proof Studio render service | FastAPI app + `/api/v1` routes, task pipeline (script → TTS → subtitles → render), edge-tts catalogue, BGM/media services, scene vocabulary | Repointed from stock footage to proof artefacts; `reachmark_proof.py` adapter builds the brief from a listing record; sample media pruned |
| **claw-code** | Harvest harness | Probe/manifest scripting patterns, doctor-style preflight checks, repo-walking utilities | Retargeted from agent-harness maintenance to build-manifest generation; rewritten as a stdlib-only Python CLI |

Full detail, including every extracted model and the ranked component inventory: **[`MERGE.md`](./MERGE.md)**.

---

## Architecture

```
reachmark-logs/
├── apps/
│   ├── web/                     React 18 · Vite 6 · Tailwind v4 · Framer Motion · Redux Toolkit
│   │   ├── src/styles/          design system: tokens, glass surfaces, aurora, motion utilities
│   │   ├── src/components/      ui primitives · layout chrome · marketplace · ambience
│   │   ├── src/pages/           17 routes, all lazy-loaded
│   │   ├── src/data/            seeded catalog + proof-art generator + harvest manifests
│   │   └── scripts/smoke.mjs    SSR smoke test for every route
│   └── api/                     Express · Prisma · Clerk · Stripe · Inngest   (from AccountsBazaar)
├── services/
│   └── studio/                  FastAPI proof-reel renderer + reachmark_proof.py adapter
├── packages/
│   └── harvest/                 generated build manifests (repo · tools · build)
├── tools/
│   ├── claw/claw.py             the harvest harness (scan · probe · merge · doctor)
│   ├── sync-harvest.mjs         manifest → client bridge
│   └── merge-report.mjs         generates MERGE.md
├── upstream/                    the four imported repositories, verbatim
└── docs/                        harvest schema · reference-site list · ui-builder design reference
```

### The claw harness

`tools/claw/claw.py` is the engine that made the merge legible. It walks the upstream trees, extracts
what actually matters, probes the reference sites live, and fuses the result into manifests the client
imports at build time.

```bash
$ python3 tools/claw/claw.py all --concurrency 14

  claw → AccountsBazaar … 84 files / 1.9MB / 16,056 LOC
  claw → ui-builder … 536 files / 11.1MB / 57,197 LOC
  claw → MoneyPrinterTurbo_ … 149 files / 3.7MB / 47,216 LOC
  claw → claw-code … 315 files / 10.7MB / 110,833 LOC

    ✓ 200  futuretools-io               697ms
    ▲ 403  leonardo-ai                   115ms     # bot-walled, recorded honestly
    ✗   0  missing-host                   125ms     # unreachable, still catalogued
  …

  merged → packages/harvest/build-manifest.json  (81.8 KB)
  components=125 models=8 tools=50
```

Extracted and used by the product:

* **Prisma models** → the `/docs` data-model browser, and the basis for the Reachmark schema extension
  (`AssetClass`, `CredentialEvent`, `ProofArtifact`, escrow fields on `Transaction`).
* **Design tokens** (CSS variables, Tailwind theme keys, keyframes, utility classes) → the Reachmark
  design system in `apps/web/src/styles/index.css`.
* **Component inventory** — 125 `.jsx/.tsx` components ranked by size and inferred kind → tells you
  what to port first.
* **Live site probe** — status, latency, page title, theme colour per reference tool → the `/tools`
  library, with bot-walled sites shown as such rather than dropped.

---

## Design & motion

The brief was explicit: no static, dull pages. The design system is a re-ramp of what the merge
surfaced, plus a motion layer written for this product.

**Tokens** — deep charcoal (`#080b14`) glass surfaces, violet→cyan electric accents, verify-green
trust signals, all as Tailwind v4 `@theme` variables. No external fonts or CDN assets: everything is
system fonts, inline SVG and CSS gradients, so it renders identically offline and inside sandboxed
iframes.

**Surfaces** — `.glass` (blur + saturation), `.edge` (gradient hairline via mask-composite),
`.noise`, `.gridlines`, `.glow-*`, `.gradient-text`.

**Motion** —

| Effect | Where |
| --- | --- |
| Page transitions (blur + rise, `AnimatePresence` on route key) | every route |
| Scroll progress rail + parallax hero that fades and scales | global / `/` |
| Staggered in-view reveals with blur-in | every section |
| Magnetic tilt cards with cursor glare (spring-driven) | listing cards, KPI tiles |
| Animated counters on first view | stats everywhere |
| Rotating animated headline (masked vertical swap) | hero |
| Aurora backdrop: three drifting radial blobs + masked grid + scanline | global |
| Cursor spotlight (disabled on touch / reduced motion) | global |
| Layout-animated pills (`layoutId`) for nav, tabs, sort, pagination | nav, filters, dashboards |
| Marquee platform rail, animated waveform, live SVG charts (path-length draw) | hero, Studio, Admin |
| Command palette (⌘K) searching listings, tools, pages and actions | global |
| `prefers-reduced-motion` honoured throughout | global |

---

## Local-first vs live

| | Local (default) | Live |
| --- | --- | --- |
| Data | Seeded, deterministic store in `src/data/catalog.js` (72 listings, 20 sellers, threads, queue) | Neon Postgres via Prisma in `apps/api` |
| Auth | Demo identity in `authSlice` mirroring the Clerk session shape | Clerk (client + server) |
| Media | Inline SVG proof art generated per listing | ImageKit uploads + `ProofArtifact` hashes |
| Reels | Simulated render with the real compose UI | FastAPI service at `services/studio` |
| Copilot | `@reachmark/copilot` runs in the tab — instant, deterministic | Express calls the LLM, merges copy over the same deterministic numbers |

Flip `VITE_API_MODE=live` and fill `.env` (see `.env.example`) — the state shapes are identical, so no
component changes are needed.

### Wiring it to Neon + Clerk + a model

```bash
cd apps/api
npm run pg:local        # or point DATABASE_URL at Neon (auto-detected, serverless driver)
npm run prisma:push && npm run db:seed
npm run dev             # :3000   → api/health reports the transport and auth mode
npm run test:e2e        # 87 checks — includes client ⇄ server parity for every filter and sort
npm run test:copilot    # 36 checks — both engines, with and without a provider
```

With no keys at all, everything still works: the API serves Postgres through the TCP pool, auth falls
back to a seeded demo principal that carries `x-reachmark-auth: demo`, and the copilot answers with
its deterministic engine. Add `CLERK_SECRET_KEY` and `ADMIN_EMAILS` for real sessions, and
`LLM_PROVIDER` + a provider key for model-written copy. The switch never changes a response shape —
`apps/api/scripts/e2e.mjs` fails the build if it does.

---

### About `upstream/`

The four source repositories the claw harness imported are **not** committed — they are third-party
code under their own licences and account for 1,084 files and ~31 MB of the working tree. To
regenerate them:

```bash
REACHMARK_UPSTREAM=./upstream npm run claw      # clone, scan, probe, merge
```

Everything the merge *produced* is committed: the harvested manifests in
`packages/harvest/`, the design references in `docs/design-reference/`, and the merged application
itself in `apps/`.

## Documentation

| File | Contents |
| --- | --- |
| [`MERGE.md`](./MERGE.md) | Generated merge report: what was imported, capability matrix, inherited models, ranked components, design provenance |
| [`docs/harvest-schema.json`](./docs/harvest-schema.json) | JSON Schema for all three manifests |
| [`docs/reference-sites.json`](./docs/reference-sites.json) | The 50 reference tools with a note on how each feeds this build |
| [`docs/design-reference/`](./docs/design-reference) | The ui-builder / AccountsBazaar sources the token ramp came from |
| [`apps/api/README.md`](./apps/api/README.md) | API surface and schema changes |
| [`services/studio/README.md`](./services/studio/README.md) | Render service and the proof-reel adapter |
| [`tools/claw/README.md`](./tools/claw/README.md) | Harness reference |

---

## Licensing

All four upstream projects are MIT licensed and their source is preserved under `upstream/` with
original notices intact. Reachmark Logs is released under MIT — see [`LICENSE`](./LICENSE).

Credits: **AccountsBazaar** (marketplace schema and credential workflow), **OpenZeppelin ui-builder**
(card, wizard and form patterns), **MoneyPrinterTurbo** (render pipeline), **claw-code** (harness
scripting patterns), and the 50 reference tools indexed under `docs/reference-sites.json`.

> **Note on the product domain.** Account transfers frequently breach a platform's terms of service
> even where they are lawful. Reachmark verifies ownership and protects the handover; buyers and
> sellers remain responsible for their own platform-policy assessment. This is stated plainly in the
> trust centre (`/trust`) rather than buried in small print.
