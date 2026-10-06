import { memo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BadgeCheck, BookmarkIcon, Eye, Flame, Heart, ShieldCheck, Sparkles, TrendingUp, Users,
} from 'lucide-react'
import { PLATFORM_MAP } from '../../data/catalog'
import { cn, compact, usd } from '../../lib/format'
import { Sparkline, TiltCard } from '../ui'
import { useDispatch, useSelector } from 'react-redux'
import { toggleWatch } from '../../app/features/authSlice'
import { toggleCompare } from '../../app/features/catalogSlice'

const CATEGORY_TONE = {
  social: 'from-volt-500/22 to-aqua-500/10',
  gaming: 'from-magenta-500/22 to-volt-500/10',
  streaming: 'from-verify-500/20 to-aqua-500/10',
  saas: 'from-warn-400/18 to-volt-500/10',
}

/**
 * Listing card — ported from AccountsBazaar's ListingCard and rebuilt with the
 * ui-builder card shell (gradient hairline + glass surface) plus the Reachmark
 * motion layer (tilt, glare, animated KPI, hover reveal rail).
 */
export const ListingCard = memo(function ListingCard({ listing, index = 0, compactMode = false }) {
  const platform = PLATFORM_MAP[listing.platform]
  const dispatch = useDispatch()
  const watched = useSelector((s) => s.auth.user.watchlist.includes(listing.id))
  const compared = useSelector((s) => s.catalog.compared.includes(listing.id))
  const [loaded, setLoaded] = useState(true)

  if (compactMode) {
    return (
      <Link
        to={`/logs/${listing.id}`}
        className="group flex items-center gap-3 rounded-xl2 border border-white/8 bg-white/[0.02] p-3 transition hover:border-volt-500/35 hover:bg-white/[0.05]"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ background: `linear-gradient(135deg,${platform.accent}33,transparent)` }}>
          <PlatformGlyph platform={listing.platform} className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-slate-200">{listing.title}</span>
          <span className="tnum block text-[11.5px] text-slate-500">{listing.id} · {compact(listing.scale)} {listing.unit}</span>
        </span>
        <span className="tnum shrink-0 text-[13px] font-semibold text-aqua-300">{usd(listing.price)}</span>
      </Link>
    )
  }

  return (
    <TiltCard intensity={6} className="h-full">
      <motion.article
        initial={{ opacity: 0, y: 26 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-8%' }}
        transition={{ duration: 0.6, delay: Math.min(index * 0.045, 0.4), ease: [0.16, 1, 0.3, 1] }}
        className="group relative flex h-full flex-col overflow-hidden rounded-xl3 glass edge noise"
      >
        {/* media */}
        <Link to={`/logs/${listing.id}`} className="relative block aspect-[16/10] overflow-hidden">
          <div className={cn('absolute inset-0 bg-gradient-to-br', CATEGORY_TONE[listing.category])} />
          <img
            src={listing.proof[0].src}
            alt={listing.proof[0].label}
            onError={() => setLoaded(false)}
            className={cn(
              'absolute inset-0 h-full w-full object-cover opacity-90 transition-[transform,opacity] duration-700 ease-out group-hover:scale-[1.06] group-hover:opacity-100',
              !loaded && 'opacity-0',
            )}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,7,13,.15),rgba(5,7,13,.86))]" />

          {/* top chips */}
          <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-ink-950/70 px-2.5 py-1 text-[11px] font-medium backdrop-blur">
                <PlatformGlyph platform={listing.platform} className="h-3.5 w-3.5" />
                {listing.platformLabel}
              </span>
              {listing.featured && (
                <span className="inline-flex items-center gap-1 rounded-full border border-volt-500/35 bg-volt-500/18 px-2 py-1 text-[10.5px] font-semibold text-volt-300 backdrop-blur">
                  <Sparkles className="h-3 w-3" /> Featured
                </span>
              )}
            </div>
            <button
              onClick={(e) => { e.preventDefault(); dispatch(toggleWatch(listing.id)) }}
              aria-label="Watch log"
              className={cn(
                'grid h-8 w-8 shrink-0 place-items-center rounded-full border backdrop-blur transition',
                watched ? 'border-magenta-500/40 bg-magenta-500/20 text-magenta-400' : 'border-white/12 bg-ink-950/60 text-slate-300 hover:text-white',
              )}
            >
              <Heart className={cn('h-3.5 w-3.5', watched && 'fill-current')} />
            </button>
          </div>

          {/* hover proof rail */}
          <div className="absolute inset-x-3 bottom-3 flex translate-y-3 items-center gap-2 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
            {listing.proof.slice(0, 3).map((p, i) => (
              <span key={i} className="flex-1 overflow-hidden rounded-lg border border-white/12 bg-ink-950/70 p-0.5 backdrop-blur">
                <img src={p.src} alt={p.label} className="h-9 w-full rounded-md object-cover" loading="lazy" />
              </span>
            ))}
            <span className="rounded-lg border border-white/12 bg-ink-950/70 px-2 py-1.5 text-[10.5px] text-slate-300 backdrop-blur">
              +{listing.proof.length} proof
            </span>
          </div>
        </Link>

        {/* body */}
        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-start justify-between gap-3">
            <Link to={`/logs/${listing.id}`} className="min-w-0">
              <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-slate-100 transition-colors group-hover:text-white">
                {listing.title}
              </h3>
            </Link>
          </div>

          <div className="mt-1.5 flex items-center gap-2 text-[11.5px] text-slate-500">
            <span className="tnum">{listing.id}</span>
            <span className="h-1 w-1 rounded-full bg-slate-600" />
            <span className="capitalize">{listing.niche}</span>
            <span className="h-1 w-1 rounded-full bg-slate-600" />
            <span>{listing.age}y aged</span>
          </div>

          <div className="mt-3.5 grid grid-cols-3 gap-2">
            <Kpi label={listing.unit.split(' ')[0]} value={compact(listing.scale)} tone="aqua" />
            <Kpi label="engagement" value={`${listing.engagement}%`} tone="volt" />
            <Kpi label="monthly views" value={compact(listing.monthlyViews)} tone="magenta" />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {listing.verified && (
              <span className="inline-flex items-center gap-1 rounded-full border border-verify-500/30 bg-verify-500/12 px-2 py-0.5 text-[10.5px] font-medium text-verify-400">
                <ShieldCheck className="h-3 w-3" /> Ownership verified
              </span>
            )}
            {listing.monetized && (
              <span className="inline-flex items-center gap-1 rounded-full border border-warn-400/30 bg-warn-400/12 px-2 py-0.5 text-[10.5px] font-medium text-warn-400">
                <BadgeCheck className="h-3 w-3" /> Monetised
              </span>
            )}
            {listing.assured && (
              <span className="inline-flex items-center gap-1 rounded-full border border-aqua-500/30 bg-aqua-500/12 px-2 py-0.5 text-[10.5px] font-medium text-aqua-300">
                <ShieldCheck className="h-3 w-3" /> Platform assured
              </span>
            )}
          </div>

          <div className="mt-4 flex items-end justify-between gap-3 border-t border-white/8 pt-3.5">
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.14em] text-slate-500">Ask</div>
              <div className="tnum text-[19px] font-semibold text-slate-100">{usd(listing.price)}</div>
            </div>
            <Sparkline series={listing.growth.slice(-10)} width={116} height={34} stroke={platform.accent} />
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <Link to={`/logs/${listing.id}`} className="flex-1">
              <span className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-[linear-gradient(102deg,#6a45f5,#7c5cff_40%,#22d3ee)] text-[13px] font-medium text-white opacity-90 transition group-hover:opacity-100">
                Open escrow sheet
              </span>
            </Link>
            <button
              onClick={() => dispatch(toggleCompare(listing.id))}
              title="Compare"
              className={cn(
                'grid h-10 w-10 shrink-0 place-items-center rounded-xl border transition',
                compared ? 'border-aqua-500/45 bg-aqua-500/15 text-aqua-300' : 'border-white/10 bg-white/[0.03] text-slate-400 hover:text-slate-200',
              )}
            >
              <BookmarkIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> {listing.views24h} today</span>
            <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {listing.watchers} watching</span>
            {listing.trending && (
              <span className="ml-auto inline-flex items-center gap-1 text-warn-400"><TrendingUp className="h-3 w-3" /> hot</span>
            )}
          </div>
        </div>
      </motion.article>
    </TiltCard>
  )
})

function Kpi({ label, value, tone }) {
  const color = tone === 'volt' ? 'text-volt-300' : tone === 'magenta' ? 'text-magenta-400' : 'text-aqua-300'
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.025] px-2.5 py-2">
      <div className="text-[9.5px] uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className={cn('tnum text-[14px] font-semibold', color)}>{value}</div>
    </div>
  )
}

/** Inline platform glyphs (self-contained SVG — no icon CDN, preview-safe). */
export function PlatformGlyph({ platform, className }) {
  const { accent } = PLATFORM_MAP[platform] ?? { accent: '#9a86ff' }
  const paths = {
    youtube: <path d="M21.6 7.2a3 3 0 0 0-2.1-2.1C17.7 4.6 12 4.6 12 4.6s-5.7 0-7.5.5A3 3 0 0 0 2.4 7.2 31 31 0 0 0 2 12a31 31 0 0 0 .4 4.8 3 3 0 0 0 2.1 2.1c1.8.5 7.5.5 7.5.5s5.7 0 7.5-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 22 12a31 31 0 0 0-.4-4.8Z" />,
    instagram: <><rect x="3" y="3" width="18" height="18" rx="5.4" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="17.2" cy="6.8" r="1.2" /></>,
    tiktok: <path d="M16.5 3h-3v12.2a2.7 2.7 0 1 1-2.4-2.7V9.4a5.9 5.9 0 1 0 5.4 5.9V9.1a6.7 6.7 0 0 0 4 1.3V7.3a3.8 3.8 0 0 1-4-3.8Z" />,
    twitter: <path d="M17.5 3h2.9l-6.3 7.2L21 21h-5.6l-4-5.3L6.7 21H3.8l6.5-7.4L3 3h5.7l3.7 5 5.1-5Zm-1 16h1.6L7.6 4.6H5.9L16.5 19Z" />,
    facebook: <path d="M13.5 21v-7.3h2.6l.4-3h-3V8.8c0-.9.3-1.5 1.6-1.5H17V4.6A22 22 0 0 0 14.7 4.4c-2.3 0-3.9 1.4-3.9 4v2.3H8.2v3h2.6V21h2.7Z" />,
    linkedin: <path d="M6.9 8.7H4.2V20h2.7V8.7ZM5.5 4a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2ZM20 20h-2.7v-5.9c0-1.4-.5-2.3-1.7-2.3-.9 0-1.5.6-1.7 1.2-.1.2-.1.5-.1.8V20h-2.7s.1-9.2 0-11.3h2.7v1.6c.4-.6 1.1-1.4 2.7-1.4 2 0 3.5 1.3 3.5 4.1V20Z" />,
    twitch: <path d="M4.3 3 3 6.8V19h4v2.7h3.2L12.6 19h3.9L21 14.6V3H4.3Zm14.5 10.6-2.4 2.4h-3.6l-2.2 2.2v-2.2H7V5.2h11.8v8.4ZM14.4 7.6v4.2h1.5V7.6h-1.5Zm-3.1 0v4.2h1.5V7.6h-1.5Z" />,
    steam: <><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.7" /><circle cx="15" cy="9.4" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M4.6 14.4l4.2 2.8a2.4 2.4 0 1 0 2.6-4l-2.2.6" fill="none" stroke="currentColor" strokeWidth="1.5" /></>,
    riot: <path d="M3 6h4.4l1.3 9.6L12 6h4l2.9 9.4L20.3 6H23l-2.5 12h-4.6L13.6 9.3 11.4 18H6.8L3 6Z" />,
    roblox: <path d="M5.6 2.2h12.8a3.4 3.4 0 0 1 3.4 3.4v12.8a3.4 3.4 0 0 1-3.4 3.4H5.6a3.4 3.4 0 0 1-3.4-3.4V5.6a3.4 3.4 0 0 1 3.4-3.4Zm3 4.6-1.4 8.6 8.6 2.2 2.2-8.6-9.4-2.2Z" />,
    netflix: <path d="M8 3h3.6l4.2 10.4V3H19v18h-3.5L10.9 9.6V21H8V3Zm3.1 0h1.2v18h-1.2V3Z" />,
    spotify: <><circle cx="12" cy="12" r="9" /><path d="M7.4 9.6c3-.8 6.4-.5 9.2 1M8 12.6c2.4-.6 5-.3 7.2.9M8.7 15.5c1.9-.4 3.9-.2 5.6.7" fill="none" stroke="#080b14" strokeWidth="1.6" strokeLinecap="round" /></>,
    disney: <path d="M12 3.4c5 0 9 3.3 9 7.4 0 2.9-2.2 5.4-5.5 6.6.5.7.9 1.5 1.1 2.3-2.5-1.6-5.9-2.5-9.6-2.5-5.2 0-9-2.9-9-6.4 0-4.1 4-7.4 9-7.4Zm-.6 3.1c-3 0-5.4 2-5.4 4.4s2.4 4.4 5.4 4.4 5.4-2 5.4-4.4-2.4-4.4-5.4-4.4Z" />,
    crunchyroll: <path d="M12 3.2 21 8v8l-9 4.8L3 16V8l9-4.8Zm0 3.3L6 9.9v4.2l6 3.4 6-3.4V9.9l-6-3.4Z" />,
    gmail: <path d="M3 6.6 12 13l9-6.4V18a1.8 1.8 0 0 1-1.8 1.8H4.8A1.8 1.8 0 0 1 3 18V6.6Zm1.6-1.8L12 10.4l7.4-5.6H4.6Z" />,
    outlook: <path d="M13 4h7a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-7V4Zm-2 2v12l-8 2V4l8 2Zm-4.3 2.6v6.8l3 .8V7.9l-3 .7Z" />,
    adobe: <path d="M13.9 3H21v18l-7.1-18ZM10.1 3H3v18l7.1-18Zm1.9 7.3 3.6 9.7h-2.4l-1.1-3.1H9.5L11 12.4l1-2.1Z" />,
    notion: <path d="M4.6 4.2 15 3.4c1 0 1.9.3 2.6.9l2.2 1.7c.5.4.8 1 .8 1.6v11c0 1-.8 1.8-1.8 1.9l-10.6.8a4 4 0 0 1-2.8-.8L3.2 18a2.4 2.4 0 0 1-.9-1.9V6.1c0-.9.8-1.7 1.7-1.8l.6-.1Zm2 3.1v9.9l2.3.2V10l4.4 7.6 2.6-.2V7.1l-2.2.2v6.9L9.3 7.4l-2.7-.1Z" />,
  }
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" style={{ color: accent }} aria-hidden>
      {paths[platform] ?? <circle cx="12" cy="12" r="8" />}
    </svg>
  )
}

export function Flame2(props) {
  return <Flame {...props} />
}
