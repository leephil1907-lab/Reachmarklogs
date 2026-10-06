/**
 * apiClient — one interface, two transports.
 *
 * Reachmark runs local-first: `VITE_API_MODE` unset (or `local`) serves every
 * read and every copilot call from the seeded fixtures in src/data, so the whole
 * product is clickable in a browser tab with no server at all. Set
 * `VITE_API_MODE=live` plus `VITE_API_URL` and the identical calls hit the
 * Express + Postgres service in apps/api instead.
 *
 * Callers never branch on the mode — they call `api.catalog.list(params)` and
 * get the same shape either way. The shape contract is enforced server-side by
 * `toListingDto` and by apps/api/scripts/e2e.mjs, which diffs the two modes.
 */
import { CATALOG } from '../data/catalog'
import { applyFilters, DEFAULT_FILTERS } from '../app/features/catalogFilters'
import * as localCopilot from './copilot'

const MODE = (import.meta.env?.VITE_API_MODE ?? 'local').toLowerCase()
const BASE = (import.meta.env?.VITE_API_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '')

export const apiMode = MODE === 'live' ? 'live' : 'local'
export const isLive = apiMode === 'live'

const PER_PAGE_MAX = 48

/** Adds the auth headers the live API expects. Clerk's token wins if present. */
let tokenProvider = null
export const setTokenProvider = (fn) => { tokenProvider = fn }

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const token = typeof tokenProvider === 'function' ? await tokenProvider().catch(() => null) : null
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const payload = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(payload?.message ?? `${path} → ${res.status}`), { status: res.status, payload })
  return payload
}

/* ---------------------------------------------------------------- catalog -- */

const toQuery = (params = {}) => {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries({ ...DEFAULT_FILTERS, ...params })) {
    if (Array.isArray(v)) { if (v.length) qs.set(k, v.join(',')) }
    else if (v !== '' && v !== 'all' && v !== undefined && v !== null) qs.set(k, String(v))
  }
  return qs
}

const localCatalog = {
  /** Mirrors { items, total, page, perPage, totalPages } from the live service. */
  list(params = {}) {
    const filters = { ...DEFAULT_FILTERS, ...params }
    const all = applyFilters(CATALOG.listings, filters)
    const perPage = Math.min(PER_PAGE_MAX, Math.max(1, Number(params.perPage ?? 12)))
    const page = Math.max(1, Number(params.page ?? 1))
    return Promise.resolve({
      ok: true,
      page,
      perPage,
      total: all.length,
      totalPages: Math.max(1, Math.ceil(all.length / perPage)),
      items: all.slice((page - 1) * perPage, page * perPage),
      mode: 'local',
    })
  },
  filters() {
    const byCount = (key) => {
      const seen = new Map()
      for (const l of CATALOG.listings) seen.set(l[key], (seen.get(l[key]) ?? 0) + 1)
      return [...seen.entries()].map(([id, count]) => ({ id, count })).filter((r) => r.id).sort((a, b) => b.count - a.count)
    }
    return Promise.resolve({
      ok: true,
      platforms: byCount('platform'),
      niches: byCount('niche'),
      regions: byCount('country'),
      categories: ['social', 'gaming', 'streaming', 'saas'],
      sorts: ['trending', 'newest', 'price-asc', 'price-desc', 'scale-desc', 'engagement-desc', 'age-desc'],
      mode: 'local',
    })
  },
  facets() {
    const median = (xs) => {
      const s = [...xs].sort((a, b) => a - b)
      const m = Math.floor(s.length / 2)
      return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2)
    }
    const group = (key) => {
      const seen = new Map()
      for (const l of CATALOG.listings) seen.set(l[key], (seen.get(l[key]) ?? 0) + 1)
      return [...seen.entries()].map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count)
    }
    return Promise.resolve({
      ok: true,
      byPlatform: group('platform'),
      byAssetClass: group('category'),
      byNiche: group('niche'),
      medianPrice: median(CATALOG.listings.map((l) => l.price)),
      mode: 'local',
    })
  },
  detail(id) {
    const item = CATALOG.listings.find((l) => l.id === id || l.slug === id)
    return Promise.resolve({ ok: Boolean(item), item, mode: 'local' })
  },
  chain(id) {
    const item = CATALOG.listings.find((l) => l.id === id)
    const events = (item?.detail?.chain ?? []).map((e, i) => ({
      id: `ce_${id}_${i}`, listingId: id, ...e,
    }))
    return Promise.resolve({ ok: true, count: events.length, events, mode: 'local' })
  },
  summary() {
    const sold = CATALOG.listings.filter((l) => l.status === 'sold')
    return Promise.resolve({
      ok: true,
      gmv: sold.reduce((a, l) => a + l.price, 0),
      listings: CATALOG.listings.length,
      sellers: CATALOG.sellers.length,
      mode: 'local',
    })
  },
}

const liveCatalog = {
  list: (params = {}) => request(`/api/catalog?${toQuery(params)}`),
  filters: () => request('/api/catalog/filters'),
  facets: () => request('/api/catalog/facets'),
  detail: (id) => request(`/api/catalog/${encodeURIComponent(id)}`),
  chain: (id) => request(`/api/catalog/${encodeURIComponent(id)}/chain`),
  summary: () => request('/api/catalog/summary'),
}

export const catalog = isLive ? liveCatalog : localCatalog

/* ---------------------------------------------------------------- copilot -- */

/**
 * In live mode this hits the Express service, which chooses between the LLM and
 * its own deterministic engine and reports which one ran in `engine`. In local
 * mode the same deterministic engine runs right here in the browser. Either way
 * the payload carries `engine`, so the UI can be honest about what produced it.
 */
export const copilot = {
  async status() {
    if (!isLive) return { ok: true, ...localCopilot.status() }
    try { return await request('/api/copilot/status') } catch { return { ok: true, ...localCopilot.status(), unreachable: true } }
  },
  async draft(input) {
    if (!isLive) return { ok: true, draft: localCopilot.draftListing(input) }
    try { return await request('/api/copilot/listing', { method: 'POST', body: input }) } catch (err) {
      return { ok: true, draft: localCopilot.draftListing(input), degraded: err.message }
    }
  },
  async price(input) {
    if (!isLive) return { ok: true, brief: localCopilot.priceBrief(input) }
    try { return await request('/api/copilot/price', { method: 'POST', body: input }) } catch (err) {
      return { ok: true, brief: localCopilot.priceBrief(input), degraded: err.message }
    }
  },
  async reel(input) {
    if (!isLive) return { ok: true, reel: localCopilot.reelScript(input) }
    try { return await request('/api/copilot/reel', { method: 'POST', body: input }) } catch (err) {
      return { ok: true, reel: localCopilot.reelScript(input), degraded: err.message }
    }
  },
  async reply(input) {
    if (!isLive) return { ok: true, suggestion: localCopilot.suggestReply(input) }
    try { return await request('/api/copilot/reply', { method: 'POST', body: input }) } catch (err) {
      return { ok: true, suggestion: localCopilot.suggestReply(input), degraded: err.message }
    }
  },
  async risk(input) {
    if (!isLive) return { ok: true, assessment: localCopilot.riskNotes(input) }
    try { return await request('/api/copilot/risk', { method: 'POST', body: input, headers: { 'x-demo-role': 'admin' } }) } catch (err) {
      return { ok: true, assessment: localCopilot.riskNotes(input), degraded: err.message }
    }
  },
  /** Server-side LLM, browser-side fallback — used to label generated content. */
  engineLabel: isLive ? 'server' : 'browser',
}

/* ------------------------------------------------------------------- me ---- */

export const me = {
  session: () => (isLive ? request('/api/me/session') : Promise.resolve({ ok: true, user: { id: 'demo_user_seller', name: 'Ada Reach', role: 'seller', plan: 'pro' }, mode: 'local' })),
  listings: () => (isLive ? request('/api/me/listings') : Promise.resolve({ ok: true, items: CATALOG.listings.filter((l) => l.seller?.id === 'sl_01'), mode: 'local' })),
  orders: () => (isLive ? request('/api/me/orders') : Promise.resolve({ ok: true, items: [], mode: 'local' })),
  payouts: () => (isLive ? request('/api/me/payouts') : Promise.resolve({ ok: true, items: [], mode: 'local' })),
}

export const health = () => (isLive ? request('/api/health') : Promise.resolve({
  ok: true, mode: 'local', database: { ok: true, listings: CATALOG.listings.length, users: CATALOG.sellers.length },
  auth: 'demo', copilot: { engine: 'local', configured: false }, feeBps: 750, escrowDefaultDays: 7,
}))

export default { catalog, copilot, me, health, apiMode, isLive, setTokenProvider }
