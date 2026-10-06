import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useDispatch, useSelector } from 'react-redux'
import {
  ArrowRight, ChevronLeft, ChevronRight, Filter, LayoutGrid, List, PackageSearch,
  Search, ShieldCheck, Sparkles, X, Zap,
} from 'lucide-react'
import { Badge, Button, Card, Counter, Reveal, Skeleton, Sparkline, Tabs } from '../components/ui'
import { FilterRail, SortBar } from '../components/marketplace/FilterRail'
import { ListingCard, PlatformGlyph } from '../components/marketplace/ListingCard'
import { CATEGORIES, PLATFORMS } from '../data/catalog'
import { cn, compact, usd } from '../lib/format'
import { resetFilters, setFilter, setPage, setView, toggleArrayFilter, toggleCompare, clearCompare } from '../app/features/catalogSlice'

export default function Marketplace() {
  const dispatch = useDispatch()
  const [params, setParams] = useSearchParams()
  const { filters, results, page, perPage, view, compared, listings } = useSelector((s) => s.catalog)
  const [railOpen, setRailOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  /* deep-link support: ?category= & ?platform= & ?q= */
  useEffect(() => {
    const patch = {}
    const cat = params.get('category')
    const platform = params.get('platform')
    const q = params.get('q')
    if (cat && !filters.categories.includes(cat)) patch.categories = [cat]
    if (platform && !filters.platforms.includes(platform)) patch.platforms = [platform]
    if (q != null && q !== filters.query) patch.query = q
    if (Object.keys(patch).length) dispatch(setFilter(patch))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  const totalPages = Math.max(1, Math.ceil(results.length / perPage))
  const paged = results.slice((page - 1) * perPage, page * perPage)

  useEffect(() => {
    setLoading(true)
    const t = setTimeout(() => setLoading(false), 380)
    return () => clearTimeout(t)
  }, [filters, page, view])

  const kpis = useMemo(() => {
    const prices = results.map((l) => l.price).sort((a, b) => a - b)
    const median = prices[Math.floor(prices.length / 2)] ?? 0
    return {
      median,
      cheapest: prices[0] ?? 0,
      dearest: prices[prices.length - 1] ?? 0,
      reach: results.reduce((a, l) => a + l.scale, 0),
      verified: results.filter((l) => l.verified).length,
    }
  }, [results])

  const comparedListings = listings.filter((l) => compared.includes(l.id))

  return (
    <div className="pt-24 sm:pt-28">
      {/* ------------------------------------------------------------- header */}
      <section className="relative mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
            <Link to="/" className="hover:text-slate-300">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-300">Marketplace</span>
            {filters.categories.length === 1 && (
              <>
                <ChevronRight className="h-3 w-3" />
                <span className="capitalize text-volt-300">{filters.categories[0]}</span>
              </>
            )}
          </div>
        </Reveal>

        <div className="mt-5 grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:items-end">
          <div>
            <Reveal delay={0.04}>
              <h1 className="text-[2.1rem] leading-tight sm:text-[2.7rem]">
                The <span className="gradient-text">Reachmark floor</span>
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-slate-400">
                {listings.length} seeded logs across social, gaming, streaming and aged SaaS inventory. Filters,
                sorting and compare run entirely client-side so the floor responds instantly.
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.14}>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={filters.query}
                onChange={(e) => {
                  dispatch(setFilter({ query: e.target.value }))
                  const next = new URLSearchParams(params)
                  if (e.target.value) next.set('q', e.target.value)
                  else next.delete('q')
                  setParams(next, { replace: true })
                }}
                placeholder="Search handles, niches, platforms or IDs…"
                className="h-12 w-full rounded-xl2 border border-white/10 bg-ink-900/70 pl-11 pr-10 text-[14px] outline-none transition focus:border-volt-500/60 focus:shadow-[0_0_0_4px_rgba(124,92,255,.13)]"
              />
              {filters.query && (
                <button
                  onClick={() => dispatch(setFilter({ query: '' }))}
                  className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-slate-500 hover:text-slate-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </Reveal>
        </div>

        {/* KPI ribbon */}
        <Reveal delay={0.18}>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: 'Matching logs', value: <Counter to={results.length} />, icon: PackageSearch },
              { label: 'Median ask', value: usd(kpis.median), icon: Sparkles },
              { label: 'Ownership verified', value: <Counter to={kpis.verified} />, icon: ShieldCheck },
              { label: 'Aggregate reach', value: compact(kpis.reach), icon: Zap },
              { label: 'Price range', value: `${usd(kpis.cheapest)} – ${usd(kpis.dearest)}`, icon: Filter },
            ].map((k) => (
              <div key={k.label} className="flex items-center gap-3 rounded-xl2 border border-white/8 bg-white/[0.02] px-4 py-3">
                <k.icon className="h-4 w-4 shrink-0 text-volt-300" />
                <div className="min-w-0">
                  <div className="text-[10.5px] uppercase tracking-[0.14em] text-slate-500">{k.label}</div>
                  <div className="tnum truncate text-[15px] font-semibold text-slate-100">{k.value}</div>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        {/* quick platform pills */}
        <Reveal delay={0.22}>
          <div className="scrollbar-none mt-6 flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => dispatch(setFilter({ platforms: [], categories: [] }))}
              className={cn(
                'shrink-0 rounded-full border px-3.5 py-1.5 text-[12.5px] transition',
                !filters.platforms.length ? 'border-volt-500/45 bg-volt-500/14 text-volt-300' : 'border-white/8 bg-white/[0.02] text-slate-400 hover:text-slate-200',
              )}
            >
              All platforms
            </button>
            {PLATFORMS.map((p) => {
              const active = filters.platforms.includes(p.id)
              return (
                <button
                  key={p.id}
                  onClick={() => dispatch(toggleArrayFilter({ key: 'platforms', value: p.id }))}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12.5px] transition',
                    active ? 'border-volt-500/45 bg-volt-500/14 text-volt-300' : 'border-white/8 bg-white/[0.02] text-slate-400 hover:border-white/16 hover:text-slate-200',
                  )}
                >
                  <PlatformGlyph platform={p.id} className="h-3.5 w-3.5" />
                  {p.label}
                </button>
              )
            })}
          </div>
        </Reveal>
      </section>

      {/* -------------------------------------------------------------- body */}
      <section className="mx-auto mt-8 max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-7 lg:grid-cols-[276px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-xl3 glass edge p-4 pr-2">
              <FilterRail />
            </div>
          </aside>

          <div>
            <div className="flex items-center gap-2 lg:hidden">
              <Button variant="ghost" size="sm" onClick={() => setRailOpen(true)}>
                <Filter className="h-4 w-4" /> Filters
                {filters.categories.length + filters.platforms.length + filters.niches.length > 0 && (
                  <Badge tone="volt">{filters.categories.length + filters.platforms.length + filters.niches.length}</Badge>
                )}
              </Button>
              <span className="tnum ml-auto text-[12px] text-slate-500">{results.length} results</span>
            </div>

            <div className="mt-4 hidden lg:block">
              <SortBar view={view} onView={(v) => dispatch(setView(v))} />
            </div>

            {/* active category banner */}
            {filters.categories.length === 1 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-5 flex items-start gap-3 rounded-xl2 border border-volt-500/22 bg-volt-500/[0.07] p-4">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-volt-300" />
                <div>
                  <div className="text-[13px] font-medium text-volt-200">
                    {CATEGORIES.find((c) => c.id === filters.categories[0])?.label} inventory
                  </div>
                  <p className="mt-0.5 text-[12px] text-slate-400">
                    {CATEGORIES.find((c) => c.id === filters.categories[0])?.blurb}
                  </p>
                </div>
                <button onClick={() => dispatch(setFilter({ categories: [] }))} className="ml-auto text-slate-500 hover:text-slate-200">
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            )}

            {/* results */}
            <div className="mt-5">
              {loading ? (
                <div className={cn('grid gap-5', view === 'grid' ? 'sm:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1')}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-xl3 border border-white/8 p-4">
                      <Skeleton className="h-40 w-full" />
                      <Skeleton className="mt-3 h-4 w-3/4" />
                      <Skeleton className="mt-2 h-3 w-1/2" />
                      <Skeleton className="mt-4 h-10 w-full" />
                    </div>
                  ))}
                </div>
              ) : results.length === 0 ? (
                <Card className="p-12 text-center" hover={false}>
                  <PackageSearch className="mx-auto h-10 w-10 text-slate-600" />
                  <h3 className="mt-5 text-[18px]">No logs match those filters</h3>
                  <p className="mx-auto mt-2 max-w-md text-[13px] text-slate-400">
                    Loosen the price band, drop a platform chip or clear the niche match. The seeded floor has {listings.length} logs.
                  </p>
                  <Button className="mt-6" variant="ghost" onClick={() => dispatch(resetFilters())}>
                    Reset every filter
                  </Button>
                </Card>
              ) : view === 'grid' ? (
                <motion.div layout className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  <AnimatePresence mode="popLayout">
                    {paged.map((l, i) => (
                      <ListingCard key={l.id} listing={l} index={i} />
                    ))}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {paged.map((l, i) => (
                    <ListRow key={l.id} listing={l} index={i} />
                  ))}
                </div>
              )}
            </div>

            {/* pagination */}
            {results.length > perPage && (
              <div className="mt-9 flex items-center justify-between gap-4">
                <span className="tnum text-[12.5px] text-slate-500">
                  Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, results.length)} of {results.length}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={page === 1}
                    onClick={() => dispatch(setPage(page - 1))}
                    className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-300 transition hover:border-volt-500/40 disabled:opacity-35"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {Array.from({ length: totalPages }).slice(0, 7).map((_, i) => {
                    const p = i + 1
                    return (
                      <button
                        key={p}
                        onClick={() => dispatch(setPage(p))}
                        className={cn(
                          'relative h-9 min-w-9 rounded-xl px-3 text-[13px] font-medium transition',
                          page === p ? 'text-white' : 'text-slate-400 hover:text-slate-200',
                        )}
                      >
                        {page === p && <motion.span layoutId="page-pill" className="absolute inset-0 rounded-xl bg-volt-500/18 ring-1 ring-volt-500/35" />}
                        <span className="relative z-10">{p}</span>
                      </button>
                    )
                  })}
                  <button
                    disabled={page === totalPages}
                    onClick={() => dispatch(setPage(page + 1))}
                    className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-300 transition hover:border-volt-500/40 disabled:opacity-35"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* mobile filter drawer */}
      <AnimatePresence>
        {railOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRailOpen(false)}
              className="fixed inset-0 z-[88] bg-ink-950/70 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="fixed inset-x-0 bottom-0 z-[89] max-h-[86vh] overflow-y-auto rounded-t-[1.6rem] glass noise p-5 lg:hidden"
            >
              <FilterRail onClose={() => setRailOpen(false)} />
              <Button className="mt-5 w-full" onClick={() => setRailOpen(false)}>
                Show {results.length} logs
              </Button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* compare tray */}
      <AnimatePresence>
        {comparedListings.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed inset-x-3 bottom-3 z-[75] mx-auto max-w-4xl rounded-xl3 glass edge noise p-3 shadow-[0_30px_80px_-30px_rgba(0,0,0,.95)]"
          >
            <div className="flex items-center gap-3">
              <Badge tone="aqua">Compare {comparedListings.length}/3</Badge>
              <div className="scrollbar-none flex flex-1 gap-2 overflow-x-auto">
                {comparedListings.map((l) => (
                  <div key={l.id} className="flex shrink-0 items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] p-1.5 pr-2.5">
                    <img src={l.proof[0].src} alt="" className="h-8 w-10 rounded-lg object-cover" />
                    <span className="tnum text-[11.5px] text-slate-300">{usd(l.price)}</span>
                    <button
                      onClick={() => dispatch(toggleCompare(l.id))}
                      aria-label="Remove from compare"
                      className="grid h-6 w-6 place-items-center rounded-md text-slate-500 transition hover:bg-danger-500/15 hover:text-danger-400"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <Button size="sm" variant="ghost" onClick={() => dispatch(clearCompare())}>
                Clear
              </Button>
              <Link to={`/logs/${comparedListings[0].id}`}>
                <Button size="sm">
                  Open <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ListRow({ listing, index }) {
  const platform = PLATFORMS.find((p) => p.id === listing.platform)
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.03, 0.25) }}
    >
      <Link
        to={`/logs/${listing.id}`}
        className="group grid gap-4 rounded-xl3 glass edge p-3.5 transition hover:-translate-y-0.5 sm:grid-cols-[180px_1fr_auto]"
      >
        <div className="relative overflow-hidden rounded-xl2">
          <img src={listing.proof[0].src} alt="" className="h-28 w-full object-cover transition duration-700 group-hover:scale-105 sm:h-full" loading="lazy" />
          <span className="absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-ink-950/75 px-2 py-0.5 text-[10.5px] backdrop-blur">
            <PlatformGlyph platform={listing.platform} className="h-3 w-3" /> {listing.platformLabel}
          </span>
        </div>
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-[15px] font-semibold text-slate-100 group-hover:text-white">{listing.title}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11.5px] text-slate-500">
            <span className="tnum">{listing.id}</span>
            <span className="h-1 w-1 rounded-full bg-slate-700" />
            <span className="capitalize">{listing.niche}</span>
            <span className="h-1 w-1 rounded-full bg-slate-700" />
            <span>{listing.country}</span>
            <span className="h-1 w-1 rounded-full bg-slate-700" />
            <span>{listing.age}y aged</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {listing.verified && <Badge tone="verify" dot>verified</Badge>}
            {listing.monetized && <Badge tone="warn">monetised</Badge>}
            {listing.assured && <Badge tone="aqua">assured</Badge>}
            <Badge tone="neutral">{compact(listing.scale)} {listing.unit}</Badge>
            <Badge tone="neutral">{listing.engagement}% eng.</Badge>
          </div>
          <p className="mt-3 line-clamp-2 text-[12.5px] leading-relaxed text-slate-500">{listing.description}</p>
        </div>
        <div className="flex flex-col items-end justify-between gap-3 sm:w-48">
          <div className="text-right">
            <div className="text-[10.5px] uppercase tracking-[0.14em] text-slate-500">Ask</div>
            <div className="tnum text-[21px] font-semibold text-slate-100">{usd(listing.price)}</div>
          </div>
          <Sparkline series={listing.growth.slice(-12)} width={150} height={42} stroke={platform?.accent ?? '#38d9f0'} />
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="h-3 w-3 text-verify-400" /> escrow {listing.credentialChain.escrowDays}d
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
