/**
 * catalogService — server-side floor queries.
 *
 * Deliberately mirrors the filter semantics of the client's `catalogSlice`
 * (`applyFilters` + sorters) so switching between local and live mode produces
 * the same result set for the same filter payload. When you add a filter, add it
 * in both places or the modes diverge — the E2E script compares them.
 */
import prisma from '../configs/prisma.js'
// The client's own vocabulary. Importing it (rather than redeclaring it) is what
// keeps the two modes from drifting when a platform or niche is added.
import { PLATFORMS, NICHES } from '../../../web/src/data/catalog.js'

/**
 * Sort definitions. Every sorter ends on `id: 'asc'` so ties resolve the same
 * way on every request — and the same way the browser's local sorter does
 * (the shared filter module breaks ties on id too). Without this, two listings
 * with equal prices swap places between reloads and parity is luck.
 */
/**
 * Trending = views + 4×watchers, descending — the same formula the client's
 * sorter uses. Postgres cannot order through Prisma on a computed expression, so
 * the matched set is ordered in memory (see searchListings). The TREND_MAX guard
 * keeps that from becoming a full-table sort if the floor ever grows past it.
 */
const TREND_MAX = 5000
export const trendScore = (row) => (row.viewCount24h ?? 0) + (row.watcherCount ?? 0) * 4
const TREND_COMPARATOR = (a, b) => trendScore(b) - trendScore(a) || String(a.id).localeCompare(String(b.id))
const SORT_KEYS = { trending: [{ viewCount24h: 'desc' }, { id: 'asc' }] }

export const SORTS = {
  // `trending` is a composite score, not a column. It is resolved by
  // TREND_COMPARATOR below — listing it here as two orderBy keys would sort
  // lexicographically (all views, then watchers) which is a different order.
  trending: SORT_KEYS.trending,
  newest: [{ createdAt: 'desc' }, { id: 'asc' }],
  'price-asc': [{ price: 'asc' }, { id: 'asc' }],
  'price-desc': [{ price: 'desc' }, { id: 'asc' }],
  'scale-desc': [{ followers_count: 'desc' }, { id: 'asc' }],
  'engagement-desc': [{ engagement_rate: 'desc' }, { id: 'asc' }],
  'age-desc': [{ createdAt: 'asc' }, { id: 'asc' }],
}

export const ASSET_CLASSES = ['social', 'gaming', 'streaming', 'saas']

/** Extracts the invariant part of the Prisma row for the client's card shape. */
export const toListingDto = (l) => ({
  id: l.id,
  slug: `${l.platform}-${l.niche}-${l.id.slice(-2)}`,
  title: l.title,
  platform: l.platform,
  platformLabel: l.platform,
  category: l.assetClass,
  niche: fromEnumNiche(l.niche),
  handle: l.handle ?? (l.username ? `@${l.username}` : null),
  scale: l.followers_count,
  unit: l.assetClass === 'social' ? 'followers' : l.assetClass === 'gaming' ? 'library value' : l.assetClass === 'streaming' ? 'months runway' : 'years aged',
  engagement: l.engagement_rate ?? 0,
  monthlyViews: l.monthly_views ?? 0,
  price: l.price,
  currency: 'USD',
  age: Math.max(0, new Date().getFullYear() - new Date(l.createdAt).getFullYear()),
  verified: l.isCredentialVerified,
  monetized: l.monetized,
  featured: l.featured,
  trending: l.viewCount24h > 400,
  status: l.status,
  country: l.region ?? l.country,
  // The client filters on `country`, the API's own query language uses `region`.
  // Publishing both means neither side has to guess.
  region: l.region ?? l.country,
  language: l.language,
  audienceSplit: l.audienceSplitPct,
  deliveryHours: l.deliveryHours,
  views24h: l.viewCount24h,
  watchers: l.watcherCount,
  offers: l.offerCount,
  assured: l.platformAssured,
  description: l.description,
  fairValue: l.fairValueEstimate,
  escrowDays: l.escrowDays,
  handover: l.handoverFormat,
  seller: l.owner
    ? {
        id: l.owner.id,
        name: l.owner.name,
        avatar: l.owner.image,
        rating: 4.9,
        transfers: Math.round((l.owner.earned ?? 0) / 420),
        verified: true,
        country: l.owner.email.split('@')[0],
        responseMins: 8,
      }
    : null,
  proofCount: l._count?.proofArtifacts ?? (l.images?.length ?? 0),
  chainVerified: l.isCredentialVerified,
  chainSubmitted: l.isCredentialSubmitted,
  chainChanged: l.isCredentialChanged,
})

const parseList = (v) => (Array.isArray(v) ? v : String(v ?? '').split(',').map((s) => s.trim()).filter(Boolean))
const num = (v, d) => (v === undefined || v === null || v === '' || Number.isNaN(Number(v)) ? d : Number(v))

/**
 * `niche`, `platform` and `assetClass` are Postgres **enums** in the Prisma
 * schema, so `contains` is a validation error — which is exactly how the live
 * catalogue used to answer a search for "gaming" with zero rows while the local
 * fixtures answered with seven. Substring search over an enum is instead done by
 * resolving which enum members contain the term, using the same vocabulary the
 * client searches over (PLATFORMS / NICHES from the web fixture).
 */
const PLATFORM_VOCAB = PLATFORMS.map((p) => p.id)
const PLATFORM_LABELS = PLATFORMS.map((p) => ({ id: p.id, label: p.label, category: p.category }))
const NICHE_VOCAB = NICHES.map((n) => n.id ?? n)

/**
 * Client vocabulary ⇄ Postgres enum. Postgres enum members must be single
 * identifiers, so "real estate" is stored as `real_estate`; every other niche is
 * identical on both sides. Kept here (not duplicated in the seed) so the two can
 * never disagree.
 */
export const toEnumNiche = (niche) => {
  const id = String(niche ?? 'other').trim().toLowerCase()
  const slug = id.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
  return NICHE_VOCAB.map((n) => n.replace(/[^a-z0-9]+/g, '_')).includes(slug) || slug === 'other' ? slug : 'other'
}
export const fromEnumNiche = (niche) => (niche === 'real_estate' ? 'real estate' : niche)

const substringEnums = (term) => {
  const t = term.toLowerCase()
  return {
    niches: NICHE_VOCAB.filter((n) => String(n).toLowerCase().includes(t)).map(toEnumNiche),
    platforms: PLATFORM_LABELS.filter((p) => p.id.includes(t) || p.label.toLowerCase().includes(t)).map((p) => p.id),
  }
}

/** Builds the Prisma `where` clause from the client filter payload. */
export function buildWhere(q = {}) {
  const where = {}
  const and = []

  const term = String(q.query ?? q.q ?? '').trim()
  if (term) {
    // Must reproduce the client haystack exactly: `${title} ${platformLabel} ${niche} ${handle} ${id} ${seller.name}`
    const enums = substringEnums(term)
    const or = [
      { title: { contains: term, mode: 'insensitive' } },
      { handle: { contains: term, mode: 'insensitive' } },
      { username: { contains: term, mode: 'insensitive' } },
      { id: { contains: term, mode: 'insensitive' } },
      { owner: { is: { name: { contains: term, mode: 'insensitive' } } } },
    ]
    if (enums.niches.length) or.push({ niche: { in: enums.niches } })
    if (enums.platforms.length) or.push({ platform: { in: enums.platforms } })
    // NOTE: the client haystack does *not* include the asset class, so neither do
    // we. Adding it here made a search for "gaming" return the 14 gaming-asset
    // listings on top of the 7 that actually mention it — a live-only result set.
    and.push({ OR: or })
  }

  const categories = parseList(q.categories ?? q.assetClass)
  if (categories.length) and.push({ assetClass: { in: categories.filter((c) => ASSET_CLASSES.includes(c)) } })

  const platforms = parseList(q.platforms ?? q.platform)
  if (platforms.length) and.push({ platform: { in: platforms.filter((p) => PLATFORM_VOCAB.includes(p)) } })

  const niches = parseList(q.niches ?? q.niche)
  if (niches.length) and.push({ niche: { in: niches.map(toEnumNiche) } })

  const priceMin = num(q.priceMin, null)
  const priceMax = num(q.priceMax, null)
  if (priceMin !== null || priceMax !== null) {
    and.push({ price: { ...(priceMin !== null ? { gte: priceMin } : {}), ...(priceMax !== null ? { lte: priceMax } : {}) } })
  }

  const scaleMin = num(q.scaleMin, null)
  if (scaleMin) and.push({ followers_count: { gte: scaleMin } })

  if (q.verifiedOnly === true || q.verifiedOnly === 'true') and.push({ isCredentialVerified: true })
  if (q.monetizedOnly === true || q.monetizedOnly === 'true') and.push({ monetized: true })
  if (q.assuredOnly === true || q.assuredOnly === 'true') and.push({ platformAssured: true })
  if (q.escrowOnly === true || q.escrowOnly === 'true') and.push({ escrowDays: { gt: 0 } })
  if (q.region && q.region !== 'all') and.push({ region: q.region })

  if (and.length) where.AND = and
  return where
}

export async function searchListings(q = {}) {
  const page = Math.max(1, num(q.page, 1))
  const perPage = Math.min(48, Math.max(1, num(q.perPage, 12)))

  const where = buildWhere(q)
  const sort = SORTS[q.sort] ? q.sort : 'trending'
  const include = { owner: true, _count: { select: { proofArtifacts: true } } }

  let rows
  let total
  if (sort === 'trending') {
    // Composite ordering: take the matched set, score it, page the slice.
    const matched = await prisma.listing.findMany({ where, take: TREND_MAX, include })
    total = matched.length
    rows = [...matched].sort(TREND_COMPARATOR).slice((page - 1) * perPage, (page - 1) * perPage + perPage)
    if (matched.length === TREND_MAX) total = await prisma.listing.count({ where })
  } else {
    ;[rows, total] = await Promise.all([
      prisma.listing.findMany({ where, orderBy: SORTS[sort], skip: (page - 1) * perPage, take: perPage, include }),
      prisma.listing.count({ where }),
    ])
  }

  return {
    page,
    perPage,
    total,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    items: rows.map(toListingDto),
  }
}

/** Facets for the filter rail, computed over the whole floor. */
export async function getFacets() {
  const [byPlatform, byClass, byNiche, agg] = await Promise.all([
    prisma.listing.groupBy({ by: ['platform'], _count: { _all: true } }),
    prisma.listing.groupBy({ by: ['assetClass'], _count: { _all: true } }),
    prisma.listing.groupBy({ by: ['niche'], _count: { _all: true } }),
    prisma.listing.aggregate({ _min: { price: true }, _max: { price: true }, _avg: { price: true }, _count: { _all: true } }),
  ])
  const prices = await prisma.listing.findMany({ select: { price: true }, orderBy: { price: 'asc' } })
  const median = prices.length ? prices[Math.floor(prices.length / 2)].price : 0

  return {
    total: agg._count._all,
    medianPrice: median,
    priceRange: [agg._min.price ?? 0, agg._max.price ?? 0],
    avgPrice: Math.round(agg._avg.price ?? 0),
    byPlatform: byPlatform.map((r) => ({ id: r.platform, count: r._count._all })),
    byAssetClass: byClass.map((r) => ({ id: r.assetClass, count: r._count._all })),
    byNiche: byNiche.map((r) => ({ id: r.niche, count: r._count._all })).sort((a, b) => b.count - a.count),
  }
}

/** Full detail including the credential chain and proof vault. */
export async function getListingDetail(id) {
  const l = await prisma.listing.findFirst({
    where: { OR: [{ id }, { id: { equals: id, mode: 'insensitive' } }] },
    include: {
      owner: true,
      proofArtifacts: { orderBy: { createdAt: 'asc' } },
      credentialChain: { orderBy: { createdAt: 'asc' } },
      _count: { select: { chats: true, transactions: true } },
    },
  })
  if (!l) return null

  const history = await prisma.transaction.findMany({ where: { listingId: l.id }, select: { amount: true, createdAt: true } })

  return {
    ...toListingDto(l),
    detail: {
      proof: l.proofArtifacts.map((p) => ({ kind: p.kind, label: p.label, url: p.url, sha256: p.sha256, bytes: p.bytes })),
      chain: l.credentialChain.map((e) => ({ kind: e.kind, actor: e.actor, detail: e.detail, hash: e.hash, at: e.createdAt })),
      priceHistory: history.map((h) => ({ amount: h.amount, at: h.createdAt })),
      images: l.images,
      counterPartyCount: l._count.chats,
      transactionCount: l._count.transactions,
      verified: l.isCredentialVerified,
      escrowState: history.length ? 'funded' : 'none',
    },
  }
}

/** Ops KPIs computed from the database rather than the client seed. */
/**
 * The filter vocabulary the UI needs to render its rail in live mode, read from
 * the data rather than hard-coded, so a new platform appears in the sidebar the
 * moment a listing is approved.
 */
export async function getFilterOptions() {
  const [platforms, niches, regions] = await Promise.all([
    prisma.listing.groupBy({ by: ['platform'], _count: { _all: true } }),
    prisma.listing.groupBy({ by: ['niche'], _count: { _all: true } }),
    prisma.listing.groupBy({ by: ['region'], _count: { _all: true } }),
  ])
  const norm = (rows, key) =>
    rows
      .map((r) => ({ id: r[key], count: r._count._all }))
      .filter((r) => r.id)
      .sort((a, b) => b.count - a.count)

  return {
    platforms: norm(platforms, 'platform'),
    niches: norm(niches, 'niche'),
    regions: norm(regions, 'region'),
    categories: ASSET_CLASSES,
    sorts: Object.keys(SORTS),
  }
}

export async function getOpsSummary() {
  const [gmv, fees, queue, pendingPayouts, disputes, listings, sellers] = await Promise.all([
    prisma.transaction.aggregate({ _sum: { amount: true } }),
    prisma.transaction.aggregate({ _sum: { feeAmount: true } }),
    prisma.listing.count({ where: { isCredentialVerified: false } }),
    prisma.withdrawal.aggregate({ where: { isWithdrawn: false }, _sum: { amount: true } }),
    prisma.transaction.count({ where: { escrowState: 'disputed' } }),
    prisma.listing.count(),
    prisma.user.count(),
  ])
  return {
    gmv: gmv._sum.amount ?? 0,
    fees: fees._sum.feeAmount ?? 0,
    openQueue: queue,
    pendingPayouts: pendingPayouts._sum.amount ?? 0,
    disputes,
    listings,
    sellers,
  }
}
