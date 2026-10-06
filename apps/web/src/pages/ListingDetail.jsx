import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import {
  AlertTriangle, ArrowLeft, ArrowRight, BadgeCheck, Banknote, BarChart3, Calendar,
  ChevronRight, Clock, Copy, Download, Eye, FileCheck2, Fingerprint, Globe2, Handshake,
  Heart, Image as ImageIcon, Info, KeyRound, Lock, MapPin, MessageSquare, Play, Scale,
  ShieldCheck, Sparkles, Star, Timer, TrendingUp, Users, Wallet, X, ZoomIn, Zap,
} from 'lucide-react'
import { Badge, Button, Card, Counter, Modal, Progress, Reveal, Sparkline, Tabs, TiltCard, ease } from '../components/ui'
import { PlatformGlyph } from '../components/marketplace/ListingCard'
import { PLATFORMS, avatarArt } from '../data/catalog'
import { cn, compact, formatDate, usd } from '../lib/format'
import { ProofReel, ReplyCoach } from '../components/copilot'
import { toggleWatch } from '../app/features/authSlice'
import { openThreadFor } from '../app/features/chatSlice'
import { addListing } from '../app/features/catalogSlice'

const TABS = [
  { id: 'overview', label: 'Overview', icon: <Info className="h-3.5 w-3.5" /> },
  { id: 'proof', label: 'Proof vault', icon: <ImageIcon className="h-3.5 w-3.5" /> },
  { id: 'chain', label: 'Credential chain', icon: <KeyRound className="h-3.5 w-3.5" /> },
  { id: 'pricing', label: 'Price history', icon: <BarChart3 className="h-3.5 w-3.5" /> },
]

export default function ListingDetail() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const nav = useNavigate()
  const listings = useSelector((s) => s.catalog.listings)
  const watched = useSelector((s) => s.auth.user.watchlist)
  const listing = listings.find((l) => l.id === id || l.slug === id)

  const [tab, setTab] = useState('overview')
  const [shot, setShot] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const [escrowOpen, setEscrowOpen] = useState(false)
  const [stage, setStage] = useState(0)
  const [offer, setOffer] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    window.scrollTo({ top: 0 })
    setTab('overview')
    setShot(0)
  }, [id])

  if (!listing) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-40 text-center">
        <h1 className="text-3xl">That log is no longer listed</h1>
        <p className="mt-3 text-slate-400">
          {id} either sold, expired or was pulled during verification. The floor still has {listings.length} live listings.
        </p>
        <Link to="/marketplace">
          <Button className="mt-8">
            <ArrowLeft className="h-4 w-4" /> Back to the floor
          </Button>
        </Link>
      </div>
    )
  }

  const platform = PLATFORMS.find((p) => p.id === listing.platform)
  const isWatched = watched.includes(listing.id)
  const similar = listings
    .filter((l) => l.id !== listing.id && (l.platform === listing.platform || l.category === listing.category))
    .slice(0, 4)

  const priceStats = useMemo(() => {
    const h = listing.priceHistory
    const first = h[0]
    const last = h[h.length - 1]
    return { first, last, delta: ((last - first) / first) * 100, min: Math.min(...h), max: Math.max(...h) }
  }, [listing])

  const escrowStages = [
    { label: 'Fund escrow', detail: `${usd(listing.price)} held by Reachmark`, icon: Lock },
    { label: 'Ownership test', detail: 'Recorded screen share scheduled', icon: Fingerprint },
    { label: 'Credential chain', detail: `${listing.credentialChain.handover}`, icon: KeyRound },
    { label: 'Release & warranty', detail: `7-day cover, seller paid in 24h`, icon: Banknote },
  ]

  const startEscrow = () => {
    setEscrowOpen(true)
    setStage(0)
    const run = (i) => {
      if (i >= escrowStages.length) {
        toast.success('Escrow opened — thread created with the seller')
        dispatch(openThreadFor(listing.id))
        nav('/messages')
        return
      }
      setStage(i)
      setTimeout(() => run(i + 1), 1100)
    }
    setTimeout(() => run(0), 400)
  }

  return (
    <div className="pt-24 sm:pt-28">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        {/* breadcrumb */}
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
          <Link to="/" className="hover:text-slate-300">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/marketplace" className="hover:text-slate-300">Marketplace</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to={`/marketplace?category=${listing.category}`} className="capitalize hover:text-slate-300">{listing.category}</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-300">{listing.id}</span>
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.55fr_1fr]">
          {/* ------------------------------------------------------- left column */}
          <div>
            <Reveal>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-[12px]">
                  <PlatformGlyph platform={listing.platform} className="h-3.5 w-3.5" /> {listing.platformLabel}
                </span>
                {listing.verified && <Badge tone="verify" dot>Ownership verified</Badge>}
                {listing.monetized && <Badge tone="warn">Monetised</Badge>}
                {listing.assured && <Badge tone="aqua">Platform assured</Badge>}
                {listing.trending && <Badge tone="magenta">Trending</Badge>}
              </div>
            </Reveal>

            <Reveal delay={0.05}>
              <h1 className="mt-4 text-balance text-[1.9rem] leading-tight sm:text-[2.4rem]">{listing.title}</h1>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-slate-500">
                <span className="tnum font-mono text-volt-300">{listing.id}</span>
                <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {listing.country}</span>
                <span className="inline-flex items-center gap-1.5"><Globe2 className="h-3.5 w-3.5" /> {listing.language}</span>
                <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> listed {formatDate(listing.createdAt)}</span>
                <span className="inline-flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" /> {listing.views24h} views today</span>
              </div>
            </Reveal>

            {/* gallery */}
            <Reveal delay={0.14}>
              <div className="mt-6 overflow-hidden rounded-xl3 glass edge noise">
                <div className="relative aspect-[16/10] cursor-zoom-in" onClick={() => setLightbox(true)}>
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={shot}
                      src={listing.proof[shot].src}
                      alt={listing.proof[shot].label}
                      initial={{ opacity: 0, scale: 1.03 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.99 }}
                      transition={{ duration: 0.5, ease }}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </AnimatePresence>
                  <div className="absolute inset-x-3 top-3 flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-ink-950/70 px-3 py-1 text-[11.5px] backdrop-blur">
                      <FileCheck2 className="h-3.5 w-3.5 text-verify-400" /> {listing.proof[shot].label}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-ink-950/70 px-2.5 py-1 text-[11px] backdrop-blur">
                      <ZoomIn className="h-3.5 w-3.5" /> click to zoom
                    </span>
                  </div>
                  <span className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,transparent,rgba(5,7,13,.85))]" />
                </div>
                <div className="flex gap-2 p-3">
                  {listing.proof.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => setShot(i)}
                      className={cn(
                        'relative flex-1 overflow-hidden rounded-xl border transition',
                        i === shot ? 'border-volt-500/60' : 'border-white/8 opacity-70 hover:opacity-100',
                      )}
                    >
                      <img src={p.src} alt={p.label} className="h-14 w-full object-cover" loading="lazy" />
                      {i === shot && <motion.span layoutId="shot-ring" className="absolute inset-0 rounded-xl ring-2 ring-volt-500/60" />}
                    </button>
                  ))}
                  <button className="grid w-16 place-items-center rounded-xl border border-dashed border-white/12 text-[11px] text-slate-500 transition hover:border-volt-500/40 hover:text-volt-300">
                    +{listing.proof.length}
                  </button>
                </div>
              </div>
            </Reveal>

            {/* metric grid */}
            <Reveal delay={0.18}>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: listing.unit, value: compact(listing.scale), icon: Users, tone: 'aqua' },
                  { label: 'Engagement', value: `${listing.engagement}%`, icon: TrendingUp, tone: 'volt' },
                  { label: 'Monthly views', value: compact(listing.monthlyViews), icon: BarChart3, tone: 'magenta' },
                  { label: 'Account age', value: `${listing.age} years`, icon: Clock, tone: 'verify' },
                ].map((k) => (
                  <TiltCard key={k.label} intensity={5}>
                    <div className="rounded-xl2 border border-white/8 bg-white/[0.025] p-4">
                      <k.icon className={cn('h-4 w-4', k.tone === 'aqua' ? 'text-aqua-300' : k.tone === 'volt' ? 'text-volt-300' : k.tone === 'magenta' ? 'text-magenta-400' : 'text-verify-400')} />
                      <div className="mt-3 text-[21px] font-semibold text-slate-100">{k.value}</div>
                      <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{k.label}</div>
                    </div>
                  </TiltCard>
                ))}
              </div>
            </Reveal>

            {/* tabs */}
            <div className="mt-8">
              <Tabs tabs={TABS} value={tab} onChange={setTab} />
              <div className="mt-5">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={tab}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.4, ease }}
                  >
                    {tab === 'overview' && <Overview listing={listing} />}
                    {tab === 'proof' && <ProofVault listing={listing} />}
                    {tab === 'chain' && <Chain listing={listing} />}
                    {tab === 'pricing' && <Pricing listing={listing} stats={priceStats} />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------ right column */}
          <div>
            <div className="sticky top-24 space-y-4">
              <Card className="p-5" hover={false}>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Asking price</div>
                    <div className="tnum mt-1 text-[32px] font-semibold text-slate-100">{usd(listing.price)}</div>
                    <div className="mt-1 text-[12px] text-slate-500">
                      ≈ {usd(listing.price / Math.max(listing.scale, 1))} per {listing.unit.split(' ')[0].replace(/s$/, '')}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge tone="verify">{listing.offers} offers</Badge>
                    <div className="mt-2 text-[11.5px] text-slate-500">{listing.watchers} watching</div>
                  </div>
                </div>

                <div className="mt-5 flex gap-2">
                  <Button className="flex-1" onClick={startEscrow}>
                    <Lock className="h-4 w-4" /> Fund escrow
                  </Button>
                  <button
                    onClick={() => dispatch(toggleWatch(listing.id))}
                    className={cn(
                      'grid h-11 w-11 shrink-0 place-items-center rounded-xl2 border transition',
                      isWatched ? 'border-magenta-500/40 bg-magenta-500/15 text-magenta-400' : 'border-white/10 bg-white/[0.03] text-slate-400 hover:text-slate-200',
                    )}
                    aria-label="Watch"
                  >
                    <Heart className={cn('h-4 w-4', isWatched && 'fill-current')} />
                  </button>
                </div>

                <div className="mt-2.5 flex gap-2">
                  <Button
                    variant="ghost"
                    className="flex-1"
                    onClick={() => {
                      dispatch(openThreadFor(listing.id))
                      toast.success('Thread opened with the seller')
                      nav('/messages')
                    }}
                  >
                    <MessageSquare className="h-4 w-4" /> Message seller
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-11 px-0"
                    aria-label="Copy link"
                    onClick={() => {
                      navigator.clipboard?.writeText(`${window.location.origin}/logs/${listing.id}`)
                      setCopied(true)
                      toast.success('Link copied')
                      setTimeout(() => setCopied(false), 1600)
                    }}
                  >
                    <Copy className={cn('h-4 w-4', copied && 'text-verify-400')} />
                  </Button>
                </div>

                <form
                  className="mt-5 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    const n = Number(offer)
                    if (!n) return toast.error('Enter an offer amount first')
                    toast.success(`Offer of ${usd(n)} sent — the desk has 24h to respond`)
                    setOffer('')
                  }}
                >
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-slate-500">$</span>
                    <input
                      value={offer}
                      onChange={(e) => setOffer(e.target.value)}
                      type="number"
                      placeholder={String(Math.round(listing.price * 0.92))}
                      className="h-10 w-full rounded-xl border border-white/10 bg-ink-900/70 pl-7 pr-3 text-[13px] tnum outline-none focus:border-volt-500/60"
                    />
                  </div>
                  <Button size="sm" variant="outline" type="submit" className="h-10">
                    Send offer
                  </Button>
                </form>

                <div className="mt-5 space-y-2.5 border-t border-white/8 pt-4">
                  {[
                    [ShieldCheck, 'Escrow protected', `${listing.credentialChain.escrowDays}-day release window`],
                    [Timer, `Handover in ~${listing.deliveryHours}h`, 'Seller median response time'],
                    [Handshake, '7-day transfer warranty', 'Refund if the platform reclaims'],
                    [Scale, 'Dispute desk', 'Independent review within 48h'],
                  ].map(([Icon, title, sub]) => (
                    <div key={title} className="flex items-start gap-3">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-verify-400" />
                      <div>
                        <div className="text-[12.5px] font-medium text-slate-200">{title}</div>
                        <div className="text-[11.5px] text-slate-500">{sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* seller */}
              <Card className="p-5" hover={false}>
                <div className="flex items-center gap-3">
                  <img src={avatarArt(listing.seller.name, listing.seller.name[0])} alt="" className="h-12 w-12 rounded-xl2" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[14px] font-semibold text-slate-100">{listing.seller.name}</span>
                      {listing.seller.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-verify-400" />}
                    </div>
                    <div className="text-[11.5px] text-slate-500">
                      {listing.seller.country} · joined {formatDate(listing.seller.joined)}
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {[
                    ['rating', listing.seller.rating.toFixed(2), Star],
                    ['transfers', listing.seller.transfers, Handshake],
                    ['response', `${listing.seller.responseMins}m`, Clock],
                  ].map(([label, value, Icon]) => (
                    <div key={label} className="rounded-xl border border-white/8 bg-white/[0.025] py-2.5">
                      <Icon className="mx-auto h-3.5 w-3.5 text-volt-300" />
                      <div className="tnum mt-1.5 text-[14px] font-semibold text-slate-100">{value}</div>
                      <div className="text-[10px] uppercase tracking-[0.1em] text-slate-500">{label}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between text-[11.5px] text-slate-500">
                  <span className="inline-flex items-center gap-1.5"><Star className="h-3 w-3 fill-warn-400 text-warn-400" /> {listing.seller.reviews} reviews</span>
                  <span className="inline-flex items-center gap-1.5"><BadgeCheck className="h-3 w-3 text-verify-400" /> KYC verified seller</span>
                </div>
              </Card>

              {/* copilot — reply coach + proof reel for this specific log */}
              <ReplyCoach listing={listing} />
              <ProofReel listing={listing} />

              {/* trust checklist */}
              <Card className="p-5" hover={false}>
                <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-200">
                  <Fingerprint className="h-4 w-4 text-aqua-300" /> Verification checklist
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    ['Credential submitted', true],
                    ['Credentials verified by ops', listing.credentialChain.verified],
                    ['Ownership test recorded', true],
                    ['Recovery email transferable', listing.credentialChain.changed],
                    ['Monetisation confirmed', listing.monetized],
                  ].map(([label, ok]) => (
                    <div key={label} className="flex items-center gap-2.5 text-[12.5px]">
                      <span className={cn('grid h-5 w-5 place-items-center rounded-full text-[10px]', ok ? 'bg-verify-500/18 text-verify-400' : 'bg-warn-400/18 text-warn-400')}>
                        {ok ? '✓' : '!'}
                      </span>
                      <span className={ok ? 'text-slate-300' : 'text-slate-400'}>{label}</span>
                    </div>
                  ))}
                </div>
                <Progress value={listing.credentialChain.verified ? 100 : 72} className="mt-5" tone="verify" />
                <div className="mt-2 text-[11px] text-slate-500">
                  {listing.credentialChain.verified ? 'All checks passed — ready to transfer' : 'Ops review in progress'}
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* similar */}
        <section className="mt-20">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl">Comparable logs</h2>
              <p className="mt-1.5 text-[13px] text-slate-400">
                Similar {platform.label} inventory the floor is pricing right now.
              </p>
            </div>
            <Link to={`/marketplace?platform=${listing.platform}`}>
              <Button variant="ghost" size="sm">
                See all {platform.label} <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((l) => (
              <Link
                key={l.id}
                to={`/logs/${l.id}`}
                className="group overflow-hidden rounded-xl2 glass edge p-3 transition hover:-translate-y-1"
              >
                <img src={l.proof[0].src} alt="" className="h-28 w-full rounded-xl object-cover transition duration-700 group-hover:scale-[1.04]" loading="lazy" />
                <div className="mt-3 line-clamp-2 text-[13px] font-medium text-slate-200">{l.title}</div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="tnum text-[14px] font-semibold text-aqua-300">{usd(l.price)}</span>
                  <span className="tnum text-[11px] text-slate-500">{compact(l.scale)} {l.unit}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[95] grid place-items-center bg-ink-950/92 p-6 backdrop-blur-lg"
            onClick={() => setLightbox(false)}
          >
            <motion.img
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              transition={{ duration: 0.4, ease }}
              src={listing.proof[shot].src}
              alt=""
              className="max-h-[80vh] w-full max-w-4xl rounded-xl3 border border-white/10 object-contain"
            />
            <button className="absolute right-6 top-6 grid h-10 w-10 place-items-center rounded-xl border border-white/12 bg-white/[0.06]">
              <X className="h-5 w-5" />
            </button>
            <div className="absolute inset-x-0 bottom-8 flex justify-center gap-2">
              {listing.proof.map((p, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setShot(i) }}
                  className={cn('h-1.5 rounded-full transition-all', i === shot ? 'w-8 bg-aqua-400' : 'w-2 bg-white/25')}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* escrow modal */}
      <Modal
        open={escrowOpen}
        onClose={() => setEscrowOpen(false)}
        subtitle="Escrow protocol"
        title={`Opening escrow for ${listing.id}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEscrowOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setEscrowOpen(false)
                toast.success('Escrow funded — check Messages for the handover thread')
                dispatch(openThreadFor(listing.id))
                nav('/messages')
              }}
            >
              <Lock className="h-4 w-4" /> Confirm & fund {usd(listing.price)}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {escrowStages.map((s, i) => {
            const done = i < stage
            const active = i === stage
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.09, duration: 0.45, ease }}
                className={cn(
                  'flex items-center gap-4 rounded-xl2 border p-4 transition-colors duration-500',
                  done ? 'border-verify-500/30 bg-verify-500/[0.06]' : active ? 'border-volt-500/40 bg-volt-500/[0.08]' : 'border-white/8 bg-white/[0.02]',
                )}
              >
                <span className={cn('grid h-10 w-10 place-items-center rounded-xl border', done ? 'border-verify-500/40 text-verify-400' : active ? 'border-volt-500/40 text-volt-300' : 'border-white/10 text-slate-500')}>
                  {done ? <BadgeCheck className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
                </span>
                <div className="min-w-0">
                  <div className="text-[13.5px] font-medium text-slate-100">{s.label}</div>
                  <div className="text-[11.5px] text-slate-500">{s.detail}</div>
                </div>
                {active && (
                  <span className="ml-auto inline-flex items-center gap-1.5 text-[11.5px] text-volt-300">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-volt-400" /> working
                  </span>
                )}
              </motion.div>
            )
          })}
        </div>
        <div className="mt-5 flex items-start gap-3 rounded-xl2 border border-warn-400/25 bg-warn-400/[0.07] p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn-400" />
          <p className="text-[12px] leading-relaxed text-slate-300">
            This is a demo escrow. In production the flow is backed by the Reachmark Node API (Stripe +
            Prisma) and every stage writes to an immutable audit log.
          </p>
        </div>
      </Modal>
    </div>
  )
}

/* ------------------------------------------------------------------ panels - */
function Overview({ listing }) {
  const rows = [
    ['Platform', listing.platformLabel],
    ['Asset class', listing.category],
    ['Primary niche', listing.niche],
    ['Handle', listing.handle],
    ['Audience top-region', `${listing.country} (${listing.audienceSplit}% of reach)`],
    ['Account age', `${listing.age} years`],
    ['Monetisation', listing.monetized ? 'Active (partner programme)' : 'Not enabled'],
    ['Handover format', listing.credentialChain.handover],
    ['Delivery window', `~${listing.deliveryHours} hours after escrow`],
    ['Escrow release', `${listing.credentialChain.escrowDays} days or on buyer confirmation`],
  ]
  return (
    <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
      <Card className="p-5" hover={false}>
        <h3 className="text-[15px] font-semibold text-slate-100">Seller notes</h3>
        <p className="mt-3 text-[13.5px] leading-relaxed text-slate-400">{listing.description}</p>
        <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
          {[
            ['Original creation date preserved', true],
            ['No policy strikes on record', true],
            ['Audience export available on request', listing.assured],
            ['Brand deals transferable', listing.monetized],
          ].map(([label, ok]) => (
            <div key={label} className="flex items-center gap-2 text-[12.5px] text-slate-300">
              <span className={cn('grid h-4.5 w-4.5 place-items-center rounded-full text-[9px]', ok ? 'bg-verify-500/18 text-verify-400' : 'bg-white/6 text-slate-500')}>
                {ok ? '✓' : '—'}
              </span>
              {label}
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-5" hover={false}>
        <h3 className="text-[15px] font-semibold text-slate-100">Specification</h3>
        <dl className="mt-4 divide-y divide-white/6">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-start justify-between gap-4 py-2.5">
              <dt className="text-[12.5px] text-slate-500">{k}</dt>
              <dd className="text-right text-[12.5px] font-medium capitalize text-slate-200">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  )
}

function ProofVault({ listing }) {
  return (
    <div className="space-y-4">
      <Card className="p-5" hover={false}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-semibold text-slate-100">Proof vault</h3>
            <p className="mt-1 text-[12.5px] text-slate-400">
              Captured {formatDate(listing.createdAt)} · hashed and pinned by Reachmark ops. Any replacement
              upload after this timestamp is flagged in the verification queue.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost">
              <Download className="h-3.5 w-3.5" /> Export bundle
            </Button>
            <Button size="sm" variant="outline">
              <Play className="h-3.5 w-3.5" /> Watch ownership test
            </Button>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {listing.proof.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5, ease }}
              className="group overflow-hidden rounded-xl2 border border-white/8"
            >
              <img src={p.src} alt={p.label} className="h-36 w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" />
              <div className="flex items-center justify-between bg-white/[0.02] px-3 py-2">
                <span className="text-[11.5px] text-slate-400">{p.label}</span>
                <span className="inline-flex items-center gap-1 text-[10.5px] text-verify-400">
                  <ShieldCheck className="h-3 w-3" /> hashed
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5" hover={false}>
          <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-200">
            <Sparkles className="h-4 w-4 text-volt-300" /> Generated proof reel
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-slate-400">
            The Proof Studio (ported from MoneyPrinterTurbo) can render these screenshots into a narrated reel
            with captions — ideal for buyers who want the story in 40 seconds.
          </p>
          <div className="mt-4 aspect-video overflow-hidden rounded-xl2 border border-white/8 bg-ink-950/70">
            <img src={listing.proof[1].src} alt="" className="h-full w-full object-cover opacity-80" />
          </div>
          <Link to="/studio">
            <Button size="sm" className="mt-4 w-full" variant="ghost">
              <Play className="h-3.5 w-3.5" /> Open in Proof Studio
            </Button>
          </Link>
        </Card>
        <Card className="p-5" hover={false}>
          <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-200">
            <BarChart3 className="h-4 w-4 text-aqua-300" /> Reach trend (14 days)
          </div>
          <div className="mt-4">
            <Sparkline series={listing.growth} width={320} height={110} stroke={PLATFORMS.find((p) => p.id === listing.platform).accent} />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[
              ['start', compact(listing.growth[0])],
              ['now', compact(listing.growth[listing.growth.length - 1])],
              ['delta', `+${(((listing.growth[listing.growth.length - 1] - listing.growth[0]) / listing.growth[0]) * 100).toFixed(1)}%`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-white/8 bg-white/[0.025] py-2">
                <div className="tnum text-[14px] font-semibold text-slate-100">{v}</div>
                <div className="text-[10px] uppercase tracking-[0.1em] text-slate-500">{k}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function Chain({ listing }) {
  const events = [
    { label: 'Listing created', detail: 'Seller opened a draft and attached metrics', at: listing.createdAt, tone: 'neutral' },
    { label: 'Credential submitted', detail: listing.credentialChain.handover, at: listing.createdAt, tone: 'volt' },
    { label: 'Ownership test recorded', detail: 'Screen share, 6m 42s, stored in vault', at: listing.createdAt, tone: 'aqua' },
    listing.credentialChain.verified
      ? { label: 'Verified by ops', detail: 'Artefacts compared against platform state', at: listing.createdAt, tone: 'verify' }
      : { label: 'Ops review in progress', detail: 'SLA 4 working hours', at: listing.createdAt, tone: 'warn' },
    listing.credentialChain.changed
      ? { label: 'Recovery email rotated', detail: 'Moved to reachmark escrow alias', at: listing.createdAt, tone: 'magenta' }
      : { label: 'Recovery email unchanged', detail: 'Will rotate at transfer time', at: listing.createdAt, tone: 'neutral' },
  ]

  return (
    <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
      <Card className="p-5" hover={false}>
        <h3 className="text-[15px] font-semibold text-slate-100">Credential chain</h3>
        <p className="mt-1.5 text-[12.5px] text-slate-400">
          Every mutation to the log’s credentials, timestamped and signed. This is the record disputes are
          settled against.
        </p>
        <div className="relative mt-6 pl-6">
          <span className="absolute left-[7px] top-1 h-[calc(100%-1rem)] w-px bg-gradient-to-b from-volt-500/60 via-aqua-500/40 to-transparent" />
          {events.map((e, i) => (
            <motion.div
              key={e.label}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5, ease }}
              className="relative pb-5 last:pb-0"
            >
              <span
                className={cn(
                  'absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2',
                  e.tone === 'verify' ? 'border-verify-400 bg-verify-500/25'
                    : e.tone === 'warn' ? 'border-warn-400 bg-warn-400/25'
                    : e.tone === 'aqua' ? 'border-aqua-400 bg-aqua-500/25'
                    : e.tone === 'magenta' ? 'border-magenta-400 bg-magenta-500/25'
                    : 'border-volt-400 bg-volt-500/25',
                )}
                style={{ borderColor: 'currentColor' }}
              />
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[13px] font-medium text-slate-100">{e.label}</span>
                <span className="tnum text-[11px] text-slate-500">{formatDate(e.at)}</span>
              </div>
              <p className="mt-0.5 text-[12px] text-slate-400">{e.detail}</p>
            </motion.div>
          ))}
        </div>
      </Card>

      <div className="space-y-4">
        <Card className="p-5" hover={false}>
          <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-200">
            <KeyRound className="h-4 w-4 text-aqua-300" /> Handover artefacts
          </div>
          <div className="mt-4 space-y-2.5">
            {[
              ['Recovery email', 'reachmark-escrow alias'],
              ['Primary password', 'rotated at transfer'],
              ['2FA seed', 'encrypted, sealed until release'],
              ['Backup codes', 'downloaded fresh on the call'],
              ['Phone number', 'released to buyer post-window'],
            ].map(([k, v], i) => (
              <div key={k} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] px-3.5 py-2.5">
                <span className="text-[12.5px] text-slate-300">{k}</span>
                <span className="inline-flex items-center gap-2 text-[11.5px] text-slate-500">
                  {v}
                  {i < 2 ? <Lock className="h-3 w-3 text-verify-400" /> : <Clock className="h-3 w-3 text-warn-400" />}
                </span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5" hover={false}>
          <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-200">
            <ShieldCheck className="h-4 w-4 text-verify-400" /> Escrow terms
          </div>
          <ul className="mt-3 space-y-2 text-[12.5px] text-slate-400">
            <li>• Funds held until buyer confirms or {listing.credentialChain.escrowDays} days elapse.</li>
            <li>• Seller payout queued immediately after release, settled within 24h.</li>
            <li>• 7-day warranty covers platform reclaim and credential rollback.</li>
            <li>• Off-platform payment voids all protection — the guard bot will warn you in-thread.</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}

function Pricing({ listing, stats }) {
  const series = listing.priceHistory
  const max = Math.max(...series)
  const min = Math.min(...series)
  return (
    <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
      <Card className="p-5" hover={false}>
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-slate-100">Asking price, last 12 months</h3>
          <Badge tone={stats.delta >= 0 ? 'verify' : 'danger'}>
            {stats.delta >= 0 ? '▲' : '▼'} {Math.abs(stats.delta).toFixed(1)}%
          </Badge>
        </div>
        <div className="mt-6 flex h-48 items-end gap-2">
          {series.map((v, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              whileInView={{ height: `${(v / max) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.05, ease }}
              className="group relative flex-1 rounded-t-lg bg-[linear-gradient(180deg,rgba(124,92,255,.9),rgba(34,211,238,.35))]"
            >
              <span className="tnum pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-ink-950/90 px-1.5 py-0.5 text-[10px] opacity-0 transition group-hover:opacity-100">
                {usd(v)}
              </span>
            </motion.div>
          ))}
        </div>
        <div className="mt-3 flex justify-between text-[10.5px] text-slate-500">
          <span>Nov</span><span>Feb</span><span>May</span><span>Aug</span><span>Oct</span>
        </div>
      </Card>
      <div className="space-y-4">
        {[
          ['Current ask', usd(stats.last), 'aqua'],
          ['Lowest seen', usd(min), 'verify'],
          ['Peak ask', usd(max), 'warn'],
          ['Comparable median', usd(Math.round(series.reduce((a, b) => a + b, 0) / series.length)), 'volt'],
        ].map(([label, value, tone]) => (
          <Card key={label} className="flex items-center justify-between p-4" hover={false}>
            <span className="text-[12.5px] text-slate-400">{label}</span>
            <span
              className={cn(
                'tnum text-[17px] font-semibold',
                tone === 'aqua' ? 'text-aqua-300' : tone === 'verify' ? 'text-verify-400' : tone === 'warn' ? 'text-warn-400' : 'text-volt-300',
              )}
            >
              {value}
            </span>
          </Card>
        ))}
        <Card className="p-4" hover={false}>
          <div className="flex items-center gap-2 text-[12.5px] text-slate-300">
            <Zap className="h-4 w-4 text-volt-300" /> Fair-price signal
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-slate-500">
            At {usd(stats.last)} this log is {stats.last < stats.min * 1.1 ? 'near the 12-month floor — expect fast clearing.' : 'mid-band for its reach and engagement profile.'}
          </p>
        </Card>
      </div>
    </div>
  )
}
