import { AnimatePresence, motion } from 'framer-motion'
import { useDispatch, useSelector } from 'react-redux'
import { RotateCcw, Sliders, Sparkles, X } from 'lucide-react'
import { CATEGORIES, NICHES, PLATFORMS, REGIONS } from '../../data/catalog'
import { cn, compact, usd } from '../../lib/format'
import { toggleArrayFilter, setFilter, resetFilters } from '../../app/features/catalogSlice'
import { Badge, Button, Toggle } from '../ui'
import { PlatformGlyph } from './ListingCard'

const SORTS = [
  { id: 'trending', label: 'Trending' },
  { id: 'newest', label: 'Newest' },
  { id: 'price-asc', label: 'Price ↑' },
  { id: 'price-desc', label: 'Price ↓' },
  { id: 'scale-desc', label: 'Reach' },
  { id: 'engagement-desc', label: 'Engagement' },
  { id: 'age-desc', label: 'Oldest' },
]

export function FilterRail({ onClose }) {
  const dispatch = useDispatch()
  const { filters, results, listings } = useSelector((s) => s.catalog)
  const set = (patch) => dispatch(setFilter(patch))

  const platformCounts = PLATFORMS.map((p) => ({
    ...p,
    count: listings.filter((l) => l.platform === p.id).length,
  }))

  const activeChips = [
    ...filters.categories.map((c) => ({ key: 'categories', value: c, label: CATEGORIES.find((x) => x.id === c)?.label ?? c })),
    ...filters.platforms.map((p) => ({ key: 'platforms', value: p, label: platformCounts.find((x) => x.id === p)?.label ?? p })),
    ...filters.niches.map((n) => ({ key: 'niches', value: n, label: n })),
    ...(filters.verifiedOnly ? [{ key: 'verifiedOnly', label: 'Verified' }] : []),
    ...(filters.monetizedOnly ? [{ key: 'monetizedOnly', label: 'Monetised' }] : []),
    ...(filters.assuredOnly ? [{ key: 'assuredOnly', label: 'Assured' }] : []),
    ...(filters.region !== 'all' ? [{ key: 'region', label: filters.region }] : []),
    ...(filters.priceMin > 0 || filters.priceMax < 100000
      ? [{ key: 'price', label: `${usd(filters.priceMin)} – ${usd(filters.priceMax)}` }]
      : []),
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-200">
          <Sliders className="h-4 w-4 text-volt-300" />
          Filters
          <Badge tone="volt">{results.length}</Badge>
        </div>
        <div className="flex items-center gap-1.5">
          {activeChips.length > 0 && (
            <button
              onClick={() => dispatch(resetFilters())}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11.5px] text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 lg:hidden">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {activeChips.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-1.5 overflow-hidden"
          >
            {activeChips.map((chip) => (
              <button
                key={`${chip.key}-${chip.label}`}
                onClick={() =>
                  chip.key === 'price'
                    ? set({ priceMin: 0, priceMax: 100000 })
                    : chip.key === 'region'
                      ? set({ region: 'all' })
                      : ['verifiedOnly', 'monetizedOnly', 'assuredOnly'].includes(chip.key)
                        ? set({ [chip.key]: false })
                        : dispatch(toggleArrayFilter({ key: chip.key, value: chip.value }))
                }
                className="group inline-flex items-center gap-1.5 rounded-full border border-volt-500/30 bg-volt-500/12 px-2.5 py-1 text-[11.5px] text-volt-300 transition hover:border-danger-500/40 hover:bg-danger-500/12 hover:text-danger-400"
              >
                {chip.label}
                <X className="h-3 w-3 opacity-60 group-hover:opacity-100" />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <Group title="Asset class">
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map((c) => {
            const active = filters.categories.includes(c.id)
            return (
              <button
                key={c.id}
                onClick={() => dispatch(toggleArrayFilter({ key: 'categories', value: c.id }))}
                className={cn(
                  'group rounded-xl2 border p-3 text-left transition duration-300',
                  active
                    ? 'border-volt-500/45 bg-volt-500/12 shadow-[0_10px_30px_-16px_rgba(124,92,255,.8)]'
                    : 'border-white/8 bg-white/[0.02] hover:border-white/16 hover:bg-white/[0.05]',
                )}
              >
                <div className={cn('text-[12.5px] font-semibold', active ? 'text-volt-300' : 'text-slate-200')}>{c.label}</div>
                <div className="mt-0.5 line-clamp-2 text-[10.5px] leading-snug text-slate-500">{c.blurb}</div>
                <div className="tnum mt-1.5 text-[10.5px] text-slate-500">
                  {listings.filter((l) => l.category === c.id).length} logs
                </div>
              </button>
            )
          })}
        </div>
      </Group>

      <Group title="Platform" count={filters.platforms.length}>
        <div className="grid max-h-56 grid-cols-2 gap-1.5 overflow-y-auto pr-1">
          {platformCounts.map((p) => {
            const active = filters.platforms.includes(p.id)
            return (
              <button
                key={p.id}
                onClick={() => dispatch(toggleArrayFilter({ key: 'platforms', value: p.id }))}
                className={cn(
                  'flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-[12px] transition',
                  active ? 'border-volt-500/45 bg-volt-500/12 text-white' : 'border-white/8 bg-white/[0.02] text-slate-300 hover:border-white/16',
                )}
              >
                <PlatformGlyph platform={p.id} className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{p.label}</span>
                <span className="tnum ml-auto text-[10.5px] text-slate-500">{p.count}</span>
              </button>
            )
          })}
        </div>
      </Group>

      <Group title="Price band">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <div className="mb-1 text-[10.5px] uppercase tracking-[0.12em] text-slate-500">Min</div>
              <input
                type="number"
                value={filters.priceMin}
                onChange={(e) => set({ priceMin: Number(e.target.value) })}
                className="w-full rounded-lg border border-white/10 bg-ink-900/70 px-2.5 py-1.5 text-[12.5px] tnum outline-none focus:border-volt-500/60"
              />
            </div>
            <div className="flex-1">
              <div className="mb-1 text-[10.5px] uppercase tracking-[0.12em] text-slate-500">Max</div>
              <input
                type="number"
                value={filters.priceMax}
                onChange={(e) => set({ priceMax: Number(e.target.value) })}
                className="w-full rounded-lg border border-white/10 bg-ink-900/70 px-2.5 py-1.5 text-[12.5px] tnum outline-none focus:border-volt-500/60"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[[0, 250], [250, 1500], [1500, 5000], [5000, 100000]].map(([a, b]) => (
              <button
                key={`${a}-${b}`}
                onClick={() => set({ priceMin: a, priceMax: b })}
                className={cn(
                  'tnum rounded-lg border px-2.5 py-1 text-[11.5px] transition',
                  filters.priceMin === a && filters.priceMax === b
                    ? 'border-aqua-500/45 bg-aqua-500/12 text-aqua-300'
                    : 'border-white/8 bg-white/[0.02] text-slate-400 hover:border-white/16',
                )}
              >
                {a === 0 ? `Under ${usd(b)}` : `${usd(a)}–${usd(b)}`}
              </button>
            ))}
          </div>
        </div>
      </Group>

      <Group title="Reach floor">
        <input
          type="range"
          min={0}
          max={500000}
          step={1000}
          value={filters.scaleMin}
          onChange={(e) => set({ scaleMin: Number(e.target.value) })}
          className="w-full accent-volt-500"
        />
        <div className="mt-1 flex items-center justify-between text-[11.5px] text-slate-400">
          <span>Any size</span>
          <span className="tnum text-volt-300">{filters.scaleMin > 0 ? `${compact(filters.scaleMin)}+` : 'no floor'}</span>
        </div>
      </Group>

      <Group title="Niche" count={filters.niches.length}>
        <div className="flex flex-wrap gap-1.5">
          {NICHES.map((n) => {
            const active = filters.niches.includes(n)
            return (
              <button
                key={n}
                onClick={() => dispatch(toggleArrayFilter({ key: 'niches', value: n }))}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-[11.5px] capitalize transition',
                  active ? 'border-aqua-500/45 bg-aqua-500/12 text-aqua-300' : 'border-white/8 bg-white/[0.02] text-slate-400 hover:border-white/16 hover:text-slate-200',
                )}
              >
                {n}
              </button>
            )
          })}
        </div>
      </Group>

      <Group title="Trust & assurance">
        <div className="space-y-2">
          <Toggle checked={filters.verifiedOnly} onChange={(v) => set({ verifiedOnly: v })} label="Ownership verified only" hint="Credential chain reviewed by ops" />
          <Toggle checked={filters.monetizedOnly} onChange={(v) => set({ monetizedOnly: v })} label="Monetised" hint="Active ad revenue or partner programme" />
          <Toggle checked={filters.assuredOnly} onChange={(v) => set({ assuredOnly: v })} label="Platform assured" hint="Reachmark underwrites the transfer" />
        </div>
      </Group>

      <Group title="Audience region">
        <select
          value={filters.region}
          onChange={(e) => set({ region: e.target.value })}
          className="w-full rounded-xl border border-white/10 bg-ink-900/70 px-3 py-2 text-[12.5px] outline-none focus:border-volt-500/60 [&>option]:bg-ink-850"
        >
          <option value="all">Any region</option>
          {REGIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </Group>

      <div className="rounded-xl2 border border-volt-500/22 bg-volt-500/[0.07] p-3.5">
        <div className="flex items-center gap-2 text-[12.5px] font-medium text-volt-300">
          <Sparkles className="h-3.5 w-3.5" /> Reachmark score
        </div>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-400">
          Sort by reach, engagement or age — results re-rank instantly across {listings.length} seeded logs.
        </p>
      </div>
    </div>
  )
}

function Group({ title, count, children }) {
  return (
    <div className="border-t border-white/8 pt-4 first:border-0 first:pt-0">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</span>
        {count ? <Badge tone="aqua">{count}</Badge> : null}
      </div>
      {children}
    </div>
  )
}

export function SortBar({ view, onView }) {
  const dispatch = useDispatch()
  const { filters, results } = useSelector((s) => s.catalog)
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {SORTS.map((s) => (
          <button
            key={s.id}
            onClick={() => dispatch(setFilter({ sort: s.id }))}
            className={cn(
              'relative rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition',
              filters.sort === s.id ? 'text-white' : 'text-slate-400 hover:text-slate-200',
            )}
          >
            {filters.sort === s.id && (
              <motion.span
                layoutId="sort-pill"
                className="absolute inset-0 rounded-lg bg-white/[0.07] ring-1 ring-volt-500/28"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative z-10">{s.label}</span>
          </button>
        ))}
      </div>
      <div className="ml-auto flex items-center gap-3">
        <span className="tnum hidden text-[12px] text-slate-500 sm:inline">{results.length} results</span>
        <div className="inline-flex rounded-xl border border-white/8 bg-ink-900/60 p-0.5">
          {[
            ['grid', 'Grid'],
            ['list', 'List'],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => onView(id)}
              className={cn(
                'relative rounded-lg px-3 py-1.5 text-[11.5px] font-medium transition',
                view === id ? 'text-white' : 'text-slate-400 hover:text-slate-200',
              )}
            >
              {view === id && (
                <motion.span layoutId="view-pill" className="absolute inset-0 rounded-lg bg-volt-500/18 ring-1 ring-volt-500/30" />
              )}
              <span className="relative z-10">{label}</span>
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={() => dispatch(resetFilters())} className="hidden sm:inline-flex">
          Reset all
        </Button>
      </div>
    </div>
  )
}
