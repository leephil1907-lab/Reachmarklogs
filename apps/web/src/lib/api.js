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

/* ------------------------------------------------------------------ token -- */

/**
 * Where the session token lives.
 *
 * localStorage rather than an httpOnly cookie on purpose: the product is
 * embedded in sandboxed preview iframes (`sandbox="allow-scripts"`, no
 * `allow-same-origin`), where cookies are treated as third-party and dropped.
 * A bearer token works in both worlds, and the server still sets an httpOnly
 * cookie as well for normal same-origin deployments.
 *
 * The trade-off is real and worth stating: localStorage is readable by any XSS
 * on this origin. The server mitigates that by never storing the raw token, by
 * expiring sessions, and by letting a user kill any device from the account
 * page. Cookie-only mode is a one-line switch (`VITE_AUTH_STORAGE=cookie`).
 */
const STORAGE_KEY = 'reachmark.session'
const useCookieOnly = (import.meta.env?.VITE_AUTH_STORAGE ?? 'local') === 'cookie'

export const sessionToken = {
  get() {
    if (useCookieOnly || typeof localStorage === 'undefined') return null
    try { return localStorage.getItem(STORAGE_KEY) } catch { return null }
  },
  set(token) {
    if (useCookieOnly || typeof localStorage === 'undefined' || !token) return
    try { localStorage.setItem(STORAGE_KEY, token) } catch { /* private mode */ }
  },
  clear() {
    if (typeof localStorage === 'undefined') return
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
  },
}

/** Clerk supplies its own token when configured; otherwise ours is used. */
let tokenProvider = null
export const setTokenProvider = (fn) => { tokenProvider = fn }
const authToken = async () => {
  if (typeof tokenProvider === 'function') {
    const external = await tokenProvider()
    if (external) return external
  }
  return sessionToken.get()
}

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const token = await authToken()
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
  if (!res.ok) {
    throw Object.assign(new Error(payload?.message ?? `${path} → ${res.status}`), {
      status: res.status,
      code: payload?.code,
      problems: payload?.problems,
      attemptsLeft: payload?.attemptsLeft,
      payload,
    })
  }
  return payload
}

export { request }

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

/* ------------------------------------------------------------------ auth --- */

/** The persona local mode presents. Shaped exactly like a real API user. */
const guestPersona = {
  id: 'local_guest', email: 'ada@reachmarklogs.test', name: 'Ada Okonjo', image: '',
  role: 'seller', status: 'active', plan: 'pro', handle: 'ada', bio: '', country: 'Nigeria',
  timezone: 'Africa/Lagos', emailVerified: true, earned: 74210.25, withdrawn: 55789.75,
  createdAt: '2024-03-18T00:00:00.000Z', lastLoginAt: null,
}

const liveAuth = {
  status: () => request('/api/auth/status'),
  session: () => request('/api/auth/session'),
  signup: (body) => request('/api/auth/signup', { method: 'POST', body }),
  login: (body) => request('/api/auth/login', { method: 'POST', body }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  verifyEmail: (token) => request('/api/auth/verify-email', { method: 'POST', body: { token } }),
  resendVerification: () => request('/api/auth/resend-verification', { method: 'POST' }),
  forgotPassword: (email) => request('/api/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token, password) => request('/api/auth/reset-password', { method: 'POST', body: { token, password } }),
  changePassword: (currentPassword, password) => request('/api/auth/change-password', { method: 'POST', body: { currentPassword, password } }),
  updateProfile: (patch) => request('/api/auth/profile', { method: 'PATCH', body: patch }),
  reactivate: (email, password) => request('/api/auth/reactivate', { method: 'POST', body: { email, password } }),
  deactivate: () => request('/api/auth/deactivate', { method: 'POST' }),
  sessions: () => request('/api/auth/sessions'),
  revokeSession: (id) => request(`/api/auth/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  revokeOthers: () => request('/api/auth/sessions/revoke-others', { method: 'POST' }),
}

/**
 * Local mode has no server, so there is no real account to create — but the
 * same interface still has to answer, and it must never *pretend* a password was
 * checked. It returns the seeded persona and flags `demo: true`, which the UI
 * surfaces honestly.
 */
const localAuth = {
  status: async () => ({ ok: true, mode: 'demo', provider: 'local-fixtures', signupAvailable: false, mailer: 'none', stats: {} }),
  session: async () => ({ ok: true, authenticated: true, user: guestPersona, mode: 'demo' }),
  signup: async () => ({ ok: true, demo: true, user: guestPersona, token: null }),
  login: async () => ({ ok: true, demo: true, user: guestPersona, token: null }),
  logout: async () => ({ ok: true }),
  verifyEmail: async () => ({ ok: true, demo: true }),
  resendVerification: async () => ({ ok: true, demo: true }),
  forgotPassword: async () => ({ ok: true, demo: true, message: 'Local mode has no mail server — switch to live mode for real resets.' }),
  resetPassword: async () => ({ ok: true, demo: true }),
  changePassword: async () => ({ ok: true, demo: true }),
  updateProfile: async (patch) => ({ ok: true, demo: true, user: { ...guestPersona, ...patch } }),
  reactivate: async () => ({ ok: true, demo: true }),
  deactivate: async () => ({ ok: true, demo: true }),
  sessions: async () => ({ ok: true, items: [] }),
  revokeSession: async () => ({ ok: true }),
  revokeOthers: async () => ({ ok: true }),
}

/* ------------------------------------------------------------------- me ---- */

export const auth = isLive ? liveAuth : localAuth

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

export default { catalog, copilot, auth, me, health, apiMode, isLive, setTokenProvider, sessionToken }
