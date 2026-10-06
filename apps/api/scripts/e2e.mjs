#!/usr/bin/env node
/**
 * Reachmark API — end-to-end verification.
 *
 * Boots `server.js` in-process on an ephemeral port, then exercises every route
 * the web client can reach and asserts the shapes the UI depends on.
 *
 * The interesting test is the *parity* one: the client can run in two modes —
 * `local` (seeded fixtures in apps/web/src/data/catalog.js) and `live` (this
 * API over Postgres). Both must answer the same filter questions with the same
 * listings, or flipping VITE_API_MODE would silently change what a buyer sees.
 * So the harness imports the client's own `applyFilters` and diffs the result
 * sets, scenario by scenario.
 *
 *   node scripts/e2e.mjs            # needs the local Postgres + seed (npm run pg:local)
 *   API_ORIGIN=http://... node scripts/e2e.mjs   # test an already-running API
 */
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const apiRoot = resolve(here, '..')

const results = []
let failed = 0
const ok = (name, detail = '') => { results.push(`  \x1b[32m✓\x1b[0m ${name}${detail ? ` \x1b[2m${detail}\x1b[0m` : ''}`) }
const bad = (name, detail = '') => { failed++; results.push(`  \x1b[31m✗\x1b[0m ${name}${detail ? ` \x1b[2m${detail}\x1b[0m` : ''}`) }
const check = (cond, name, detail = '') => (cond ? ok(name, detail) : bad(name, detail))
const head = (s) => console.log(`\n\x1b[1m${s}\x1b[0m`)

const PORT = Number(process.env.E2E_PORT ?? 3411)
let origin = process.env.API_ORIGIN ?? `http://127.0.0.1:${PORT}`
let child = null

/**
 * The product now runs on real accounts, so the harness signs in like a user
 * rather than relying on a synthesised demo principal. Every protected check
 * below uses a token from the seeded accounts.
 */
let sellerToken = null
let adminToken = null
const SELLER = process.env.SEED_SELLER_EMAIL ?? 'ada@reachmarklogs.test'
const ADMIN = process.env.SEED_ADMIN_EMAIL ?? 'ops@reachmarklogs.test'
const SEED_PASSWORD = process.env.DEMO_PASSWORD ?? 'reachmark-demo-2026'

async function api(path, opts = {}) {
  const res = await fetch(origin + path, {
    ...opts,
    headers: {
      'content-type': 'application/json',
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
      ...(opts.headers ?? {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  const text = await res.text()
  let json = null
  try { json = JSON.parse(text) } catch { /* non-JSON */ }
  return { status: res.status, json, text, headers: res.headers }
}

async function waitForHealth(timeoutMs = 45_000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      const r = await api('/api/health')
      if (r.status < 500) return r
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 400))
  }
  throw new Error(`API did not answer /api/health within ${timeoutMs}ms`)
}

/* ------------------------------------------------------------------ boot --- */

if (!process.env.API_ORIGIN) {
  console.log(`\x1b[2mstarting api on :${PORT} …\x1b[0m`)
  child = spawn(process.execPath, ['server.js'], {
    cwd: apiRoot,
    env: { ...process.env, PORT: String(PORT), NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let boot = ''
  child.stdout.on('data', (d) => { boot += d })
  child.stderr.on('data', (d) => { boot += d })
  process.on('exit', () => child?.kill('SIGKILL'))
  try {
    await waitForHealth()
  } catch (err) {
    console.error(boot.trim() || err.message)
    console.error('\n\x1b[31mAPI failed to boot.\x1b[0m Is the dev Postgres running?  npm run pg:local\n')
    process.exit(1)
  }
}

/* ----------------------------------------------------------------- tests --- */

head('accounts (the rest of the suite runs signed in)')
let buyerToken = null
{
  const status = await api('/api/auth/status')
  check(status.status === 200, 'GET /api/auth/status → ok', `mode=${status.json?.mode}`)

  const seller = await api('/api/auth/login', { method: 'POST', body: { email: SELLER, password: SEED_PASSWORD } })
  check(seller.status === 200 && Boolean(seller.json?.token), 'the seeded seller signs in', seller.json?.user?.role)
  sellerToken = seller.json?.token

  const admin = await api('/api/auth/login', { method: 'POST', body: { email: ADMIN, password: SEED_PASSWORD } })
  check(admin.status === 200 && admin.json?.user?.role === 'admin', 'the seeded ops account signs in as admin', admin.json?.user?.role)
  adminToken = admin.json?.token

  const anon = await api('/api/me/listings')
  check(anon.status === 401, 'anonymous access to a protected route is refused', `${anon.status}`)

  const stale = await api('/api/me/listings', { token: 'rm_invalid_token_value' })
  check(stale.status === 401, 'a fabricated token is refused', `${stale.status}`)

  const own = await api('/api/auth/session', { token: sellerToken })
  check(own.json?.authenticated === true, 'the session resolves to the signed-in user', own.json?.user?.email)
  buyerToken = sellerToken
}

head('health & boot')
{
  const h = await api('/api/health')
  check(h.status === 200 && h.json?.ok === true, 'GET /api/health → ok', `${h.status}`)
  const db = h.json?.database ?? {}
  check(db.ok === true, 'database reachable', `transport listings=${db.listings} users=${db.users}`)
  check(Number(db.listings) > 0, 'catalog is seeded', `${db.listings} listings`)
  check(['clerk', 'local', 'demo'].includes(h.json?.auth), 'auth mode declared', h.json?.auth)
  check(Boolean(h.json?.copilot?.engine), 'copilot engine declared', h.json?.copilot?.engine)
  check(h.json?.feeBps > 0, 'fee is configured', `${h.json?.feeBps} bps`)
}

head('catalog')
let liveListing = null
{
  const r = await api('/api/catalog?perPage=12')
  const j = r.json
  check(r.status === 200 && j?.ok === true, 'GET /api/catalog → ok')
  check(j?.total === 72, 'all 72 listings are served', `total=${j?.total}`)
  check(j?.items?.length === 12, 'page size honoured', `returned=${j?.items?.length}`)
  liveListing = j?.items?.[0]

  const required = ['id', 'slug', 'title', 'platform', 'platformLabel', 'category', 'niche', 'handle', 'scale', 'unit', 'price', 'age', 'verified', 'monetized', 'assured', 'country', 'region', 'seller', 'escrowDays', 'proofCount']
  const missing = required.filter((k) => liveListing?.[k] === undefined)
  check(missing.length === 0, 'list DTO matches the client card contract', missing.length ? `missing: ${missing.join(',')}` : `${required.length} keys`)
  check(typeof liveListing?.seller?.name === 'string', 'seller joined onto the card', liveListing?.seller?.name)
  check(Number.isFinite(liveListing?.fairValue), 'fair value is precomputed per card', `$${liveListing?.fairValue}`)
}

head('facets, filters, summary')
{
  const f = await api('/api/catalog/facets')
  check(f.status === 200 && Array.isArray(f.json?.byPlatform), 'GET /api/catalog/facets → grouped counts')
  check(f.json?.byPlatform?.reduce((a, b) => a + b.count, 0) === 72, 'facet counts sum to the catalog', `${f.json?.byPlatform?.length} platforms`)
  check(Number.isFinite(f.json?.medianPrice), 'median price computed', `$${f.json?.medianPrice}`)
  check(f.json?.byAssetClass?.length >= 3, 'asset classes split social/gaming/streaming/aged', f.json?.byAssetClass?.map((c) => `${c.id}:${c.count}`).join(' '))

  const fl = await api('/api/catalog/filters')
  check(fl.status === 200 && Array.isArray(fl.json?.platforms), 'GET /api/catalog/filters → option lists')

  const s = await api('/api/catalog/summary')
  check(s.status === 200 && Number(s.json?.listings) > 0, 'GET /api/catalog/summary → ops numbers', `gmv=$${s.json?.gmv} fees=$${s.json?.fees}`)

  check(fl.json?.platforms?.length > 1, '/filters publishes the platform vocabulary', `${fl.json?.platforms?.length} platforms`)
  check(fl.json?.niches?.length > 1 && fl.json?.regions?.length > 1, '/filters publishes niches + regions', `${fl.json?.niches?.length} niches / ${fl.json?.regions?.length} regions`)
}

head('detail, chain, 404')
{
  const d = await api(`/api/catalog/${liveListing.id}`)
  check(d.status === 200 && d.json?.item?.id === liveListing.id, 'GET /api/catalog/:id → detail')
  check(Array.isArray(d.json?.item?.detail?.priceHistory), 'detail carries a price history')

  check(d.json?.item?.detail?.proof?.length > 0, 'detail carries hashed proof artefacts', `${d.json?.item?.detail?.proof?.length}`)

  const c = await api(`/api/catalog/${liveListing.id}/chain`)
  check(c.status === 200 && Array.isArray(c.json?.events), 'GET /api/catalog/:id/chain → ledger chain', `${c.json?.count} blocks`)

  const miss = await api('/api/catalog/RM-0000')
  check(miss.status === 404, 'unknown listing → 404', `${miss.status}`)
}

head('client ⇄ server filter parity (the VITE_API_MODE switch)')
try {
  // Importing the client's *own* filter module — not a copy of it.
  const { CATALOG } = await import(resolve(apiRoot, '../../apps/web/src/data/catalog.js'))
  const { applyFilters, DEFAULT_FILTERS } = await import(resolve(apiRoot, '../../apps/web/src/app/features/catalogFilters.js'))

  /** Walks every page — the API caps perPage at 48, the catalog is 72. */
  async function allIds(qs) {
    const out = []
    for (let page = 1; page <= 8; page++) {
      const r = await api(`/api/catalog?${qs}&page=${page}&perPage=48`)
      const items = r.json?.items ?? []
      out.push(...items.map((l) => l.id))
      if (out.length >= (r.json?.total ?? 0) || !items.length) break
    }
    return out
  }

  const SORT_IDS = ['trending', 'newest', 'price-asc', 'price-desc', 'scale-desc', 'engagement-desc', 'age-desc']

  const scenarios = [
    ['defaults / trending', {}],
    ['query "gaming"', { query: 'gaming' }],
    ['query "crypto"', { query: 'crypto' }],
    ['query "real estate"', { query: 'real estate' }],
    ['query "pets"', { query: 'pets' }],
    ['query "quartz" (seller name)', { query: 'quartz' }],
    ['query "RM-43" (id fragment)', { query: 'RM-43' }],
    ['instagram only', { platforms: ['instagram'] }],
    ['social class', { categories: ['social'] }],
    ['monetised + verified', { monetizedOnly: true, verifiedOnly: true }],
    ['escrow-assured', { assuredOnly: true }],
    ['price 5k–15k', { priceMin: 5000, priceMax: 15000 }],
    ['scale ≥ 100k', { scaleMin: 100000 }],
    ['region NG', { region: 'NG' }],
    ['niche=gaming', { niches: ['gaming'] }],
    ['niche=real estate', { niches: ['real estate'] }],
    ...SORT_IDS.map((sort) => [`sort=${sort}`, { sort }]),
  ]

  for (const [label, patch] of scenarios) {
    const filters = { ...DEFAULT_FILTERS, ...patch }
    // Same order, not just the same set — the API must page in the client's order.
    const expected = applyFilters(CATALOG.listings, filters).map((l) => l.id)
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(filters)) {
      if (Array.isArray(v)) { if (v.length) qs.set(k, v.join(',')) }
      else if (v !== '' && v !== 'all' && v !== undefined && v !== null) qs.set(k, String(v))
    }
    const got = await allIds(qs.toString())
    const same = expected.length === got.length && expected.every((id, i) => id === got[i])
    check(same, `parity · ${label}`, same ? `${expected.length} ids` : `local=${expected.length} live=${got.length}${firstDiff(expected, got)}`)
  }

  // Ordering, not just membership: the top card must be the same card.
  const topLocal = applyFilters(CATALOG.listings, { ...DEFAULT_FILTERS, sort: 'price-desc' })[0]?.id
  const topLive = (await api('/api/catalog?sort=price-desc&perPage=1')).json?.items?.[0]?.id
  check(topLocal === topLive, 'sort order matches, not just the set', `local=${topLocal} live=${topLive}`)
} catch (err) {
  bad('client parity harness', err.message)
}

function firstDiff(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) return ` first-diff@${i}: ${a[i] ?? '—'} vs ${b[i] ?? '—'}`
  return ''
}

head('copilot')
{
  const s = await api('/api/copilot/status')
  check(s.status === 200 && s.json?.ok === true, 'GET /api/copilot/status → ok')
  check(Boolean(s.json?.fallback), 'fallback engine is advertised', String(s.json?.fallback).slice(0, 60))
  check(s.json?.escrowDays > 0, 'escrow terms exposed to the copilot UI', `${s.json?.escrowDays} days`)

  const draft = await api('/api/copilot/listing', {
    method: 'POST',
    token: sellerToken,
    body: { platform: 'instagram', niche: 'fitness', scale: 48200, engagement: 4.6, age: 4, verified: true, monetized: true, region: 'NG' },
  })
  check(draft.status === 200 && typeof draft.json?.draft?.title === 'string', 'POST /api/copilot/listing → draft')
  const d = draft.json?.draft ?? {}
  check(typeof d.engine === 'string', 'draft reports which engine ran', d.engine)
  check(Number(d.suggestedPrice) > 0, 'draft suggests a price', `$${d.suggestedPrice}`)
  check(d.title.length > 20, 'draft title is specific', String(d.title).slice(0, 52))
  check(Array.isArray(d.tags) && d.tags.length >= 5, 'draft suggests tags', `${d.tags?.length}`)
  check(Array.isArray(d.rationale) && d.rationale.length >= 3, 'draft explains itself', `${d.rationale?.length} reasons`)

  const price = await api('/api/copilot/price', { method: 'POST', token: sellerToken, body: { platform: 'instagram', scale: 48200, engagement: 4.6, age: 4, verified: true, monetized: true } })
  const v = price.json?.brief ?? {}
  check(price.status === 200 && v.value > 0, 'POST /api/copilot/price → valuation', `$${v.value}`)
  check(Array.isArray(v.band) && v.band[0] < v.value, 'valuation returns a band', v.band?.join('–'))
  check(v.drivers?.length >= 3, 'valuation explains its drivers', `${v.drivers?.length} drivers`)
  check(typeof v.summary === 'string' && v.summary.length > 40, 'valuation narrates the number', `${v.summary?.length} chars`)
  check(v.clearing?.fast > 0 && v.clearing?.fair > 0 && v.clearing?.patient > 0 && v.clearing.fast < v.clearing.fair && v.clearing.fair < v.clearing.patient,
    'valuation prices fast / fair / patient clears', `$${v.clearing?.fast} / $${v.clearing?.fair} / $${v.clearing?.patient}`)

  const reel = await api('/api/copilot/reel', { method: 'POST', token: sellerToken, body: { id: liveListing.id } })
  const rl = reel.json?.reel ?? {}
  check(reel.status === 200 && typeof rl.script === 'string', 'POST /api/copilot/reel → proof-reel script', `${rl.script?.split('\n').length} beats`)
  check(Boolean(rl.hook) && Boolean(rl.cta), 'reel has a hook and a CTA')

  const reply = await api('/api/copilot/reply', {
    method: 'POST',
    token: sellerToken,
    body: { id: liveListing.id, message: 'can you do 20% off? i can pay you on WhatsApp instead, skip the escrow fee' },
  })
  const rp = reply.json?.suggestion ?? {}
  check(reply.status === 200 && typeof rp.reply === 'string', 'POST /api/copilot/reply → seller reply')
  check(rp.intent === 'off-platform', 'discount + WhatsApp message classified as off-platform', rp.intent)
  check(Boolean(rp.guard), 'off-platform payment attempt raises the guard', String(rp.guard).slice(0, 58))
  check(Array.isArray(rp.alternatives) && rp.alternatives.length >= 2, 'reply offers alternatives', `${rp.alternatives?.length}`)

  const clean = await api('/api/copilot/reply', { method: 'POST', token: sellerToken, body: { id: liveListing.id, message: 'can I see the analytics before I commit?' } })
  check(clean.json?.suggestion?.intent === 'proof' && !clean.json?.suggestion?.guard, 'a normal question is not flagged', clean.json?.suggestion?.intent)

  const unauthRisk = await api('/api/copilot/risk', { method: 'POST', token: sellerToken, body: { id: liveListing.id } })
  check(unauthRisk.status === 403, 'a seller cannot use the ops risk screen', `${unauthRisk.status}`)

  const risk = await api('/api/copilot/risk', { method: 'POST', token: adminToken, body: { id: liveListing.id } })
  const a = risk.json?.assessment ?? {}
  check(risk.status === 200 && Boolean(a.recommendation), 'an admin gets a risk verdict', `${risk.status} ${a.recommendation}`)
  check(Array.isArray(a.flags) && a.flags.length > 0, 'risk lists flags', `${a.flags?.length} flags`)

  const noauth = await api('/api/copilot/listing', { method: 'POST', body: {} })
  check(noauth.status === 401, 'the copilot refuses anonymous callers', `${noauth.status}`)
  const empty = await api('/api/copilot/listing', { method: 'POST', token: sellerToken, body: {} })
  check(empty.status === 200, 'an empty payload still returns a usable draft', `${empty.status}`)
}

head('session, payouts, watchlist')
{
  const s = await api('/api/me/session', { token: sellerToken })
  check(s.status === 200 && Boolean(s.json?.user?.id), 'GET /api/me/session → principal', s.json?.user?.id)
  check(Boolean(s.headers.get('x-reachmark-auth')), 'auth mode surfaced in a header', s.headers.get('x-reachmark-auth'))

  const l = await api('/api/me/listings', { token: sellerToken })
  check(l.status === 200 && Array.isArray(l.json?.items), 'GET /api/me/listings → seller inventory', `${l.json?.items?.length} rows`)

  const o = await api('/api/me/orders', { token: sellerToken })
  check(o.status === 200 && Array.isArray(o.json?.items), 'GET /api/me/orders → escrow orders', `${o.json?.items?.length} rows`)

  const p = await api('/api/me/payouts', { token: sellerToken })
  check(p.status === 200 && Array.isArray(p.json?.items), 'GET /api/me/payouts → withdrawal ledger', `${p.json?.items?.length} rows`)

  const w = await api(`/api/me/watchlist/${liveListing.id}`, { method: 'POST', token: sellerToken })
  check([200, 201].includes(w.status), 'POST /api/me/watchlist/:id toggles a watch', `${w.status}`)
}

head('upstream AccountsBazaar routes still mounted')
{
  const publicListing = await api('/api/listing/public')
  check(publicListing.status === 200, '/api/listing/public is public', `HTTP ${publicListing.status}`)
  const chat = await api('/api/chat/user', { token: sellerToken })
  check(chat.status === 200, '/api/chat/user is mounted behind auth', `HTTP ${chat.status}`)
  const adminDash = await api('/api/admin/dashboard', { token: adminToken })
  check(adminDash.status === 200, '/api/admin/dashboard is mounted behind the ops gate', `HTTP ${adminDash.status}`)
  const missing = await api('/api/definitely-not-a-route')
  check(missing.status === 404, 'unknown route → JSON 404', `${missing.status}`)
}

head('database transport selection')
{
  // The Neon serverless driver cannot be exercised without a Neon account, but the
  // *decision* can be: construct the client with each kind of URL in a child
  // process and read back which transport it chose. This is the branch that would
  // otherwise only ever run in production.
  const { spawnSync } = await import('node:child_process')
  const probe = (env) => {
    const r = spawnSync(process.execPath, ['-e', "import('./src/configs/prisma.js').then(() => process.exit(0))"], {
      cwd: apiRoot,
      env: { ...process.env, ...env },
      encoding: 'utf8',
      timeout: 25_000,
    })
    return `${r.stdout ?? ''}${r.stderr ?? ''}`
  }

  const neonOut = probe({ DATABASE_URL: 'postgresql://user:pw@ep-cool-name-123456.us-east-2.aws.neon.tech/reachmark?sslmode=require', PG_ADAPTER: '', DIRECT_URL: '' })
  check(/transport=neon/.test(neonOut), 'a neon.tech host selects the Neon serverless driver', (neonOut.match(/transport=\w+/) ?? ['no transport line'])[0])

  const forced = probe({ DATABASE_URL: 'postgresql://user:pw@ep-cool-name-123456.us-east-2.aws.neon.tech/reachmark', PG_ADAPTER: 'pg' })
  check(/transport=pg/.test(forced), 'PG_ADAPTER=pg overrides auto-detection', (forced.match(/transport=\w+/) ?? ['no transport line'])[0])

  const tcp = probe({ DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:5432/reachmark', PG_ADAPTER: '', DIRECT_URL: '' })
  check(/transport=pg/.test(tcp), 'a plain host uses the TCP pool', (tcp.match(/transport=\w+/) ?? ['no transport line'])[0])
  const logs = neonOut + tcp
  check(/:\*{4}@/.test(logs) && !/\bpw\b|:postgres@/.test(logs), 'credentials are masked when the target is logged',
    (logs.match(/target=\S+/) ?? ['no target line'])[0])
}

head('auth boundary')
{
  const seller = await api('/api/admin/dashboard', { token: sellerToken })
  check(seller.status === 403, 'a seller is refused by the admin desk', `${seller.status}`)
  const admin = await api('/api/admin/dashboard', { token: adminToken })
  check(admin.status === 200 && Boolean(admin.json?.dashboardData), 'an admin gets the ops dashboard', `listings=${admin.json?.dashboardData?.totalListings}`)
  const anon = await api('/api/me/session')
  check(anon.status === 401, 'an unauthenticated session is refused', `${anon.status}`)

  /* ------------------------------------------------------- 10. sign out --- */

  // The suite signs in as real seeded accounts, so it signs back out: every run
  // would otherwise leave two live sessions behind in a database a developer
  // then opens by hand. Signing out also proves the token really dies.
  for (const [label, token] of [['seller', sellerToken], ['admin', adminToken]]) {
    const out = await api('/api/auth/logout', { method: 'POST', token })
    check(out.status === 200, `the ${label} signs out`, `${out.status}`)
    const after = await api('/api/me/session', { token })
    check(after.status === 401, `the ${label}'s token is dead afterwards`, `${after.status}`)
  }
}

/* ---------------------------------------------------------------- report --- */

console.log(results.join('\n'))
const total = results.length
console.log(
  failed === 0
    ? `\n\x1b[32m\x1b[1mPASS\x1b[0m ${total}/${total} checks against ${origin}\n`
    : `\n\x1b[31m\x1b[1mFAIL\x1b[0m ${failed}/${total} checks failed against ${origin}\n`,
)

child?.kill('SIGTERM')
process.exit(failed === 0 ? 0 : 1)
