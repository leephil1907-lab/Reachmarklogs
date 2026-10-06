# Reachmark API (`apps/api`)

Express + Prisma service for Reachmark Logs. This is the **AccountsBazaar server**, imported intact
and re-pointed at the Reachmark product model. Nothing was thrown away: the controllers, routes,
middlewares, Inngest jobs and the Prisma schema are the upstream files, extended rather than replaced.

```
apps/api
├── server.js                  # Express entrypoint (from AccountsBazaar server/server.js)
├── prisma/
│   ├── schema.prisma          # extended: Reachmark platform/niche taxonomy, CredentialEvent, proof
│   └── seed.mjs               # seeds from apps/web/src/data/catalog.js — one source of truth
├── scripts/
│   ├── dev-postgres.mjs       # real Postgres (PGlite + wire protocol) for machines without one
│   ├── e2e.mjs                # 87 checks, incl. client ⇄ server filter/sort parity
│   └── copilot-test.mjs       # 36 checks across both copilot engines + failure containment
└── src
    ├── configs                # prisma (dual transport), ImageKit, multer, nodemailer
    ├── controllers            # listing, chat, admin, catalog, copilot, me, stripeWebhook
    ├── middlewares            # authMiddleware (Clerk + demo fallback)
    ├── routes                 # listing, chat, admin, catalog, copilot, me, inngest, stripe
    ├── services               # catalogService (queries), copilot (LLM + deterministic merge)
    └── inngest                # background jobs (clerk user sync, listing colour state)
```

## Running it

```bash
npm run pg:local      # terminal 1 — real Postgres on 127.0.0.1:5432 (PGlite, in-memory)
npm run prisma:push   # apply the schema
npm run db:seed       # 72 logs · 23 principals · 288 credential events · 216 proof artefacts
npm run dev           # terminal 2 — API on :3000
npm run test:e2e      # 87 checks (boots its own server on :3411)
npm run test:copilot  # 36 checks, both engines, no key required
```

Point `DATABASE_URL` at Neon and `CLERK_SECRET_KEY` at a Clerk instance and the same code runs
unchanged — no adapter switch to remember, no code path that only exists in production.

## What changed for Reachmark

| Area | Change |
| --- | --- |
| Listing taxonomy | `Platform` enum extended from 10 social platforms to include gaming, streaming and aged SaaS assets. |
| Asset class | New `AssetClass` enum (`social`, `gaming`, `streaming`, `saas`) on `Listing`. |
| Credential chain | New `CredentialEvent` model records every mutation with actor, timestamp and hash — this is what the public trust surface reads. |
| Escrow | `Transaction` gains `escrowState`, `releaseAt`, `disputeId` so the escrow engine can be driven from the API. |
| Proof vault | `Listing.images` stays, plus `ProofArtifact` for hashed, typed artefacts. |

## Run it

```bash
cd apps/api
npm install
cp ../../.env.example .env            # fill in DATABASE_URL, CLERK_*, IMAGEKIT_*
npx prisma generate
npx prisma db push
npm run dev                            # http://localhost:3000
```

The web client proxies `/api/*` to `127.0.0.1:3000` (see `apps/web/vite.config.js`), so once this
service is running you can flip the client from the seeded local store to live data by setting
`VITE_API_MODE=live` in `apps/web/.env`.

## Endpoints (upstream, unchanged shape)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/listing` | Browse listings (filters mirror the client's filter rail) |
| POST | `/api/listing` | Create a listing (seller wizard submit target) |
| GET | `/api/listing/:id` | Single listing + proof + credential chain |
| POST | `/api/listing/credential` | Submit / update credential chain |
| GET | `/api/chat` | Threads for the signed-in user |
| POST | `/api/chat/message` | Send a message |
| GET | `/api/admin/stats` | Ops KPIs (GMV, fees, queue counts) |
| GET | `/api/admin/queue` | Verification queue |
| POST | `/api/admin/approve` | Advance a queue item |
| POST | `/api/admin/withdraw` | Approve or reject a payout |
| POST | `/api/webhooks/stripe` | Escrow funding + release webhook |

> Until `VITE_API_MODE=live` is set, the web app runs against the seeded store in
> `apps/web/src/data/catalog.js`. The shapes are identical, so switching is a config change, not a
> rewrite.

## Transports

**Database.** `src/configs/prisma.js` inspects the connection string: a host matching
`neon.tech` / `neon.build` builds a `PrismaNeon` client over the Neon serverless driver
(`@neondatabase/serverless` + `ws`, `poolQueryViaFetch`), anything else builds a `PrismaPg` TCP
pool. `PG_ADAPTER=neon|pg` overrides the guess. The chosen transport is logged at boot with a
masked URL, and `/api/health` reports it — a support question about "which database is this
talking to" should never need a code read.

**Auth.** With `CLERK_SECRET_KEY` present, `clerkMiddleware()` runs and every route sees a real
Clerk session. Without it the API stays fully usable: `attachAuth` installs a demo principal,
implements the same `await req.auth()` contract the upstream controllers call, and sets
`x-reachmark-auth: demo` on every response. `protectAdmin` accepts either Clerk plus the
`ADMIN_EMAILS` allow-list, or `x-demo-role: admin` in demo mode. This is why the whole product is
testable in CI with no vendor accounts.

## The listing copilot

`src/services/copilot.js` is the LLM half; the deterministic engine it falls back to lives in the
shared workspace package **`@reachmark/copilot`**, which the browser imports too — so the valuation
a seller sees in the browser and the one the server quotes are the same code.

| Capability | Route | What it returns |
| --- | --- | --- |
| Status | `GET /api/copilot/status` | engine, provider, configured keys, fallback, fee/escrow terms |
| Draft | `POST /api/copilot/listing` | title, description, tags, suggested price + band, rationale, checklist |
| Valuation | `POST /api/copilot/price` | value, band, confidence, drivers, fast/fair/patient clearing, fees |
| Proof reel | `POST /api/copilot/reel` | hook, 6-beat script, CTA, word count and duration |
| Reply | `POST /api/copilot/reply` | intent + label, reply, alternatives, off-platform guard |
| Risk | `POST /api/copilot/risk` | flags, risk score, `clear \| review \| hold_escrow` (admin only) |

Three rules hold regardless of which engine answers:

1. **The model cannot move a number.** Valuation is computed deterministically; an LLM may only
   write copy around it.
2. **The model cannot clear a flag.** The off-platform guard is decided by the classifier; a model
   returning `guard: null` cannot remove it, and a lenient risk verdict can never be more lenient
   than the deterministic screen.
3. **A failed provider is invisible to the user.** Timeout (20 s), HTTP error or malformed JSON all
   fall back to the deterministic engine; every response carries `engine` so the UI can be honest.

Both rules are regression-tested in `scripts/copilot-test.mjs`, which runs a stub OpenAI-compatible
server so the LLM path is exercised without a key or a network.

## Verification

```bash
npm run test:e2e       # PASS 87/87 — routes, shapes, auth boundaries, parity
npm run test:copilot   # PASS 36/36 — both engines, merge rules, failure containment
```

`test:e2e` imports the client's own `catalogFilters.js` and diffs local against live for every
filter combination and all seven sort orders. When the two modes disagree, the suite fails — which
is the only reason the `VITE_API_MODE` switch can be trusted.
