/**
 * Catalog filter semantics — shared by the client and the API.
 *
 * These functions live here, free of React/Redux imports, so that the live API
 * (`apps/api/src/services/catalogService.js`) and the end-to-end parity harness
 * (`apps/api/scripts/e2e.mjs`) can import the *same* code the UI runs. If the two
 * modes ever drift, the harness fails instead of a buyer seeing different stock
 * after flipping VITE_API_MODE.
 */
import { CATALOG } from '../../data/catalog.js'
export const DEFAULT_FILTERS = {
  query: '',
  categories: [],
  platforms: [],
  niches: [],
  priceMin: 0,
  priceMax: 100000,
  scaleMin: 0,
  verifiedOnly: false,
  monetizedOnly: false,
  assuredOnly: false,
  escrowOnly: false,
  region: 'all',
  sort: 'trending',
}

/** Mirror of the AccountsBazaar listing controller's query semantics. */
export function applyFilters(items, f) {
  const q = f.query.trim().toLowerCase()
  let out = items.filter((l) => {
    if (q) {
      const haystack = `${l.title} ${l.platformLabel} ${l.niche} ${l.handle} ${l.id} ${l.seller.name}`.toLowerCase()
      if (!haystack.includes(q)) return false
    }
    if (f.categories.length && !f.categories.includes(l.category)) return false
    if (f.platforms.length && !f.platforms.includes(l.platform)) return false
    if (f.niches.length && !f.niches.includes(l.niche)) return false
    if (l.price < f.priceMin || l.price > f.priceMax) return false
    if (l.scale < f.scaleMin) return false
    if (f.verifiedOnly && !l.verified) return false
    if (f.monetizedOnly && !l.monetized) return false
    if (f.assuredOnly && !l.assured) return false
    if (f.region !== 'all' && l.country !== f.region) return false
    return true
  })

  /**
   * Every sorter ends on the listing id. Array.prototype.sort is stable, so
   * without an explicit tiebreak the browser falls back to catalogue insertion
   * order while Postgres falls back to physical row order — the same filter
   * would then produce two different top cards in local and live mode. The API
   * mirrors this (see SORTS in apps/api/src/services/catalogService.js).
   */
  const byId = (a, b) => String(a.id).localeCompare(String(b.id))
  const sorters = {
    trending: (a, b) => b.views24h + b.watchers * 4 - (a.views24h + a.watchers * 4) || byId(a, b),
    newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt) || byId(a, b),
    'price-asc': (a, b) => a.price - b.price || byId(a, b),
    'price-desc': (a, b) => b.price - a.price || byId(a, b),
    'scale-desc': (a, b) => b.scale - a.scale || byId(a, b),
    'engagement-desc': (a, b) => b.engagement - a.engagement || byId(a, b),
    // "oldest first" is sorted on createdAt (identical on both sides) rather
    // than the display integer, so a tie on age cannot order differently live.
    'age-desc': (a, b) => new Date(a.createdAt) - new Date(b.createdAt) || byId(a, b),
  }
  out = [...out].sort(sorters[f.sort] ?? sorters.trending)
  return out
}

