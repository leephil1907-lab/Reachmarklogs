import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform, useMotionValue, useSpring, AnimatePresence } from 'framer-motion'
import {
  ArrowRight, BadgeCheck, Banknote, Boxes, ChevronRight, CircleDollarSign, Command,
  Fingerprint, Gauge, KeyRound, Layers, LineChart, Lock, MessageSquare, PlayCircle,
  Rocket, ScanFace, ShieldCheck, Sparkles, Star, Store, Tags, Timer, TrendingUp, Users, Wand2, Zap,
} from 'lucide-react'
import { useSelector } from 'react-redux'
import { Badge, Button, Card, Counter, Reveal, SectionHead, Sparkline, StaggerGroup, Stat, Tabs, TiltCard, ease } from '../components/ui'
import { HeroFloor } from '../components/layout/Ambience'
import { ListingCard, PlatformGlyph } from '../components/marketplace/ListingCard'
import { PLATFORMS, proofArt, avatarArt } from '../data/catalog'
import { cn, compact, usd } from '../lib/format'
import BUILD from '../data/harvest/build-manifest.json'

const ROTATING = ['social accounts', 'gaming profiles', 'streaming seats', 'aged mailboxes']

export default function Home() {
  const listings = useSelector((s) => s.catalog.listings)
  const [word, setWord] = useState(0)
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 130])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0])
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.94])

  useEffect(() => {
    const t = setInterval(() => setWord((w) => (w + 1) % ROTATING.length), 2600)
    return () => clearInterval(t)
  }, [])

  const featured = useMemo(
    () => [...listings].sort((a, b) => Number(b.featured) - Number(a.featured) || b.views24h - a.views24h).slice(0, 6),
    [listings],
  )
  const trending = useMemo(() => [...listings].sort((a, b) => b.watchers - a.watchers).slice(0, 5), [listings])
  const totalVolume = useMemo(() => listings.reduce((a, l) => a + l.price, 0), [listings])
  const platformMix = useMemo(
    () =>
      PLATFORMS.map((p) => ({ ...p, count: listings.filter((l) => l.platform === p.id).length }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
    [listings],
  )

  return (
    <>
      {/* ------------------------------------------------------------------ hero */}
      <section ref={heroRef} className="relative overflow-hidden pt-28 sm:pt-32 lg:pt-36">
        <HeroFloor />
        <motion.div style={{ y: heroY, opacity: heroOpacity, scale: heroScale }} className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-14 lg:grid-cols-[1.08fr_0.92fr]">
            <div>
              <Reveal>
                <div className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[12px] text-slate-300 backdrop-blur">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-verify-400" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-verify-400" />
                  </span>
                  Escrow live · <span className="tnum text-verify-400">{listings.length}</span> verified logs listed today
                </div>
              </Reveal>

              <h1 className="mt-6 text-[2.7rem] leading-[1.02] sm:text-[3.6rem] lg:text-[4.15rem]">
                <Reveal delay={0.05}>
                  <span className="block text-slate-100">Buy and sell</span>
                </Reveal>
                <Reveal delay={0.12}>
                  <span className="relative block h-[1.15em] overflow-hidden">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={ROTATING[word]}
                        initial={{ y: '110%', opacity: 0, filter: 'blur(10px)' }}
                        animate={{ y: '0%', opacity: 1, filter: 'blur(0px)' }}
                        exit={{ y: '-110%', opacity: 0, filter: 'blur(10px)' }}
                        transition={{ duration: 0.72, ease }}
                        className="absolute inset-x-0 gradient-text"
                      >
                        {ROTATING[word]}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                </Reveal>
                <Reveal delay={0.18}>
                  <span className="block text-slate-100">
                    without the <span className="gradient-text-aqua">guesswork</span>.
                  </span>
                </Reveal>
              </h1>

              <Reveal delay={0.24}>
                <p className="mt-6 max-w-xl text-pretty text-[15.5px] leading-relaxed text-slate-400">
                  Reachmark Logs is the escrow-protected marketplace for digital log inventory. Every
                  listing carries a live proof vault, an audited credential chain and a 7-day transfer
                  warranty — so the handover is boring, in the best possible way.
                </p>
              </Reveal>

              <Reveal delay={0.3}>
                <div className="mt-9 flex flex-wrap items-center gap-3">
                  <Link to="/marketplace">
                    <Button size="lg" className="group">
                      Browse the marketplace
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </Button>
                  </Link>
                  <Link to="/sell">
                    <Button size="lg" variant="ghost" className="group">
                      <Tags className="h-4 w-4" />
                      List a log in 6 steps
                    </Button>
                  </Link>
                  <button
                    onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
                    className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-[12.5px] text-slate-400 transition hover:border-volt-500/40 hover:text-slate-200 xl:flex"
                  >
                    <Command className="h-3.5 w-3.5" /> Press ⌘K to search 72 logs
                  </button>
                </div>
              </Reveal>

              <Reveal delay={0.36}>
                <div className="mt-11 grid max-w-2xl grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
                  <HeroStat icon={CircleDollarSign} label="Escrowed volume" value={<Counter to={totalVolume / 1000} decimals={1} prefix="$" suffix="k" />} />
                  <HeroStat icon={ShieldCheck} label="Ownership verified" value={<Counter to={94.6} decimals={1} suffix="%" />} />
                  <HeroStat icon={Timer} label="Median handover" value={<Counter to={41} suffix=" min" />} />
                  <HeroStat icon={Star} label="Seller rating" value={<Counter to={4.93} decimals={2} />} />
                </div>
              </Reveal>
            </div>

            {/* hero visual — a live escrow card stack */}
            <Reveal delay={0.2} y={40}>
              <HeroStack listings={listings} />
            </Reveal>
          </div>
        </motion.div>

        {/* platform marquee */}
        <div className="relative mt-20 border-y border-white/8 bg-ink-950/40 py-5 backdrop-blur">
          <div className="mask-fade-x flex overflow-hidden">
            <div className="animate-marquee pause-on-hover flex shrink-0 items-center gap-12 pr-12">
              {[...PLATFORMS, ...PLATFORMS].map((p, i) => (
                <span key={`${p.id}-${i}`} className="flex shrink-0 items-center gap-2.5 text-slate-500 transition-colors hover:text-slate-200">
                  <PlatformGlyph platform={p.id} className="h-5 w-5" />
                  <span className="whitespace-nowrap text-[13px] font-medium">{p.label}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- trust strip */}
      <section className="mx-auto max-w-[1400px] px-4 pt-20 sm:px-6 lg:px-8">
        <StaggerGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: ScanFace, title: 'Ownership test', body: 'Screen-shared, recorded and written to the proof vault before funds move.' },
            { icon: KeyRound, title: 'Credential chain', body: 'Original recovery email, backup codes and every change ops made — timestamped.' },
            { icon: Lock, title: 'Escrow by default', body: 'Money sits in escrow until you confirm the handover. Disputes freeze payouts.' },
            { icon: Timer, title: '7-day warranty', body: 'If the platform reclaims the log, Reachmark refunds under the assurance policy.' },
          ].map((f, i) => (
            <Card key={f.title} className="p-5">
              <span className="mb-4 grid h-10 w-10 place-items-center rounded-xl border border-volt-500/25 bg-volt-500/12 text-volt-300">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="text-[15px] font-semibold text-slate-100">{f.title}</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-400">{f.body}</p>
              <span className="tnum mt-4 block text-[10.5px] uppercase tracking-[0.16em] text-slate-600">0{i + 1} — Reachmark protocol</span>
            </Card>
          ))}
        </StaggerGroup>
      </section>

      {/* ------------------------------------------------------------ featured */}
      <section className="mx-auto max-w-[1400px] px-4 pt-24 sm:px-6 lg:px-8">
        <SectionHead
          kicker="Featured inventory"
          title="Logs the desk is watching this week"
          sub="Hand-picked by the Reachmark floor team: clean history, verified ownership and pricing that actually clears."
          action={
            <Link to="/marketplace">
              <Button variant="ghost" size="md" className="group">
                <Store className="h-4 w-4" /> All {listings.length} logs
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
          }
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {featured.map((l, i) => (
            <ListingCard key={l.id} listing={l} index={i} />
          ))}
        </div>
      </section>

      {/* --------------------------------------------------------- how it works */}
      <HowItWorks />

      {/* ------------------------------------------------------------- trending */}
      <section className="mx-auto max-w-[1400px] px-4 pt-24 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <SectionHead
              kicker="Live floor"
              title="Most-watched logs right now"
              sub="Watcher counts update as buyers open escrow sheets. These move fastest."
            />
            <div className="mt-8 space-y-2.5">
              {trending.map((l, i) => (
                <motion.div
                  key={l.id}
                  initial={{ opacity: 0, x: -18 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.55, delay: i * 0.07, ease }}
                >
                  <Link
                    to={`/logs/${l.id}`}
                    className="group flex items-center gap-4 rounded-xl2 border border-white/8 bg-white/[0.02] p-3.5 transition hover:border-volt-500/35 hover:bg-white/[0.05]"
                  >
                    <span className="tnum w-6 text-center text-[13px] font-semibold text-slate-600">{i + 1}</span>
                    <img src={l.proof[0].src} alt="" className="h-12 w-16 shrink-0 rounded-lg object-cover opacity-85 transition group-hover:opacity-100" loading="lazy" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium text-slate-200">{l.title}</span>
                      <span className="mt-0.5 flex items-center gap-2 text-[11.5px] text-slate-500">
                        <PlatformGlyph platform={l.platform} className="h-3 w-3" />
                        {compact(l.scale)} {l.unit}
                        <span className="h-1 w-1 rounded-full bg-slate-700" />
                        {l.watchers} watching
                      </span>
                    </span>
                    <span className="hidden w-24 sm:block">
                      <Sparkline series={l.growth.slice(-8)} width={92} height={30} stroke={PLATFORMS.find((p) => p.id === l.platform).accent} />
                    </span>
                    <span className="tnum shrink-0 text-[14px] font-semibold text-aqua-300">{usd(l.price)}</span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <Card className="p-5" hover={false}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Floor activity</div>
                  <div className="mt-1 text-[15px] font-semibold text-slate-100">24h listing velocity</div>
                </div>
                <Badge tone="verify" dot>
                  streaming
                </Badge>
              </div>
              <VelocityChart listings={listings} />
              <div className="mt-4 grid grid-cols-3 gap-3">
                <Stat label="Impressions" value={compact(listings.reduce((a, l) => a + l.views24h, 0))} delta={12.4} />
                <Stat label="Open offers" value={listings.reduce((a, l) => a + l.offers, 0)} delta={4.1} spark={[3, 5, 4, 8, 7, 11, 9, 14]} />
                <Stat label="Avg. age" value={`${(listings.reduce((a, l) => a + l.age, 0) / listings.length).toFixed(1)}y`} delta={-1.2} />
              </div>
            </Card>

            <Card className="p-5" hover={false}>
              <div className="mb-4 flex items-center gap-2 text-[13px] font-semibold text-slate-200">
                <Boxes className="h-4 w-4 text-aqua-300" /> Inventory mix
              </div>
              <div className="space-y-3">
                {platformMix.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <PlatformGlyph platform={p.id} className="h-4 w-4 shrink-0" />
                    <span className="w-28 shrink-0 truncate text-[12.5px] text-slate-300">{p.label}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/6">
                      <motion.span
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(p.count / platformMix[0].count) * 100}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: i * 0.06, ease }}
                        className="block h-full rounded-full"
                        style={{ background: `linear-gradient(90deg,${p.accent},rgba(34,211,238,.6))` }}
                      />
                    </span>
                    <span className="tnum w-7 text-right text-[11.5px] text-slate-500">{p.count}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- escrow */}
      <EscrowFlow />

      {/* ---------------------------------------------------------- testimonials */}
      <Testimonials />

      {/* ------------------------------------------------------ harvester strip */}
      <section className="mx-auto max-w-[1400px] px-4 pt-24 sm:px-6 lg:px-8">
        <Card className="relative overflow-hidden p-8 lg:p-10" hover={false}>
          <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <div>
              <Reveal>
                <Badge tone="aqua" dot>
                  claw-code harvest · fingerprint {BUILD.fingerprint}
                </Badge>
              </Reveal>
              <Reveal delay={0.06}>
                <h2 className="mt-4 text-3xl sm:text-[2.4rem]">
                  This marketplace was <span className="gradient-text">assembled by clawing</span> four codebases.
                </h2>
              </Reveal>
              <Reveal delay={0.12}>
                <p className="mt-4 max-w-lg text-[14.5px] leading-relaxed text-slate-400">
                  AccountsBazaar supplied the market structure and credential workflow, ui-builder the design
                  system and wizard engine, MoneyPrinterTurbo the proof-reel studio, and claw-code the harvest
                  harness that indexed {BUILD.totals.sourceFiles.toLocaleString()} files
                  ({compact(BUILD.totals.sourceLoc)} lines) into a build manifest the app reads at runtime.
                </p>
              </Reveal>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/docs">
                  <Button>
                    <Layers className="h-4 w-4" /> Open the build manifest
                  </Button>
                </Link>
                <Link to="/tools">
                  <Button variant="ghost">
                    <Sparkles className="h-4 w-4" /> {BUILD.totals.referenceTools} reference tools
                  </Button>
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {BUILD.sources.map((s, i) => (
                <motion.div
                  key={s.repo}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.55, ease }}
                  className="rounded-xl2 border border-white/8 bg-ink-900/60 p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[12px] text-volt-300">{s.repo}</span>
                    <span className="tnum text-[10.5px] text-slate-500">{compact(s.loc)} LOC</span>
                  </div>
                  <p className="mt-2 line-clamp-3 text-[11.5px] leading-relaxed text-slate-500">{s.purpose}</p>
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/6">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${(s.loc / Math.max(...BUILD.sources.map((x) => x.loc))) * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.1, delay: 0.2 + i * 0.08, ease }}
                      className="h-full bg-[linear-gradient(90deg,#7c5cff,#22d3ee)]"
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </Card>
      </section>

      {/* ------------------------------------------------------------------ cta */}
      <section className="mx-auto max-w-[1400px] px-4 pt-24 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] border border-volt-500/25 bg-[linear-gradient(120deg,rgba(124,92,255,.22),rgba(34,211,238,.12)_46%,rgba(236,72,153,.16))] p-10 text-center lg:p-16">
          <div className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,.12), transparent 42%)' }} />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 44, repeat: Infinity, ease: 'linear' }}
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10"
          />
          <Reveal>
            <h2 className="mx-auto max-w-3xl text-balance text-3xl sm:text-[2.6rem]">
              Ready to move inventory at a fair clearing price?
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="mx-auto mt-5 max-w-xl text-[15px] text-slate-300/90">
              List in six guided steps, let the Proof Studio generate your reel, and get paid the moment the
              buyer confirms the credential chain.
            </p>
          </Reveal>
          <Reveal delay={0.16}>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link to="/sell">
                <Button size="lg">
                  <Rocket className="h-4 w-4" /> Start a listing
                </Button>
              </Link>
              <Link to="/marketplace">
                <Button size="lg" variant="outline">
                  <LineChart className="h-4 w-4" /> See pricing data
                </Button>
              </Link>
            </div>
          </Reveal>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-[12px] text-slate-300/80">
            {[
              [ShieldCheck, 'Escrow protected'],
              [Fingerprint, 'KYC verified sellers'],
              [MessageSquare, 'Guarded messaging'],
              [Banknote, 'Payouts in 24h'],
            ].map(([Icon, label]) => (
              <span key={label} className="inline-flex items-center gap-2">
                <Icon className="h-3.5 w-3.5" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

/* ------------------------------------------------------------- hero stack -- */
function HeroStack({ listings }) {
  const [active, setActive] = useState(0)
  const rotate = useMotionValue(0)
  const spring = useSpring(rotate, { stiffness: 60, damping: 18 })
  const picks = listings.slice(0, 4)

  useEffect(() => {
    const t = setInterval(() => {
      setActive((a) => (a + 1) % picks.length)
      rotate.set(rotate.get() + 90)
    }, 4200)
    return () => clearInterval(t)
  }, [picks.length, rotate])

  const l = picks[active]

  return (
    <div className="relative mx-auto max-w-[460px]">
      <motion.div style={{ rotate: spring }} className="pointer-events-none absolute -inset-6 rounded-full border border-dashed border-volt-500/20" />
      <div className="absolute -left-6 top-10 hidden animate-float lg:block">
        <span className="flex items-center gap-2 rounded-xl2 border border-verify-500/30 bg-ink-950/80 px-3 py-2 text-[11.5px] backdrop-blur">
          <BadgeCheck className="h-3.5 w-3.5 text-verify-400" /> Escrow released · {usd(4820)}
        </span>
      </div>
      <div className="absolute -right-4 bottom-16 hidden animate-float lg:block" style={{ animationDelay: '-2.4s' }}>
        <span className="flex items-center gap-2 rounded-xl2 border border-aqua-500/30 bg-ink-950/80 px-3 py-2 text-[11.5px] backdrop-blur">
          <Zap className="h-3.5 w-3.5 text-aqua-300" /> Handover in 38 min
        </span>
      </div>

      <TiltCard intensity={9}>
        <div className="relative overflow-hidden rounded-[1.7rem] glass edge noise p-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-[11.5px] text-slate-400">
              <Gauge className="h-3.5 w-3.5 text-volt-300" /> Escrow sheet
            </span>
            <span className="tnum font-mono text-[11px] text-slate-500">{l.id}</span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={l.id}
              initial={{ opacity: 0, x: 26, filter: 'blur(8px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: -26, filter: 'blur(8px)' }}
              transition={{ duration: 0.6, ease }}
            >
              <div className="relative mt-4 overflow-hidden rounded-xl2">
                <img src={l.proof[0].src} alt="" className="h-44 w-full object-cover" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,7,13,.1),rgba(5,7,13,.9))]" />
                <div className="absolute inset-x-4 bottom-3 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-ink-950/70 px-2.5 py-1 text-[11px] backdrop-blur">
                    <PlatformGlyph platform={l.platform} className="h-3.5 w-3.5" /> {l.platformLabel}
                  </span>
                  <span className="tnum text-[19px] font-semibold">{usd(l.price)}</span>
                </div>
              </div>

              <h3 className="mt-4 line-clamp-2 text-[15px] font-semibold text-slate-100">{l.title}</h3>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {[
                  [compact(l.scale), l.unit.split(' ')[0]],
                  [`${l.engagement}%`, 'engagement'],
                  [`${l.age}y`, 'aged'],
                ].map(([v, k]) => (
                  <div key={k} className="rounded-xl border border-white/8 bg-white/[0.03] py-2">
                    <div className="tnum text-[14px] font-semibold text-aqua-300">{v}</div>
                    <div className="text-[10px] uppercase tracking-[0.1em] text-slate-500">{k}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-2 rounded-xl2 border border-white/8 bg-ink-950/50 p-3.5">
                {[
                  ['Credential chain', l.credentialChain.verified ? 'verified' : 'in review', l.credentialChain.verified],
                  ['Ownership test', 'recorded', true],
                  ['Escrow window', `${l.credentialChain.escrowDays} days`, true],
                ].map(([label, value, ok], i) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + i * 0.08, duration: 0.5 }}
                    className="flex items-center justify-between text-[12px]"
                  >
                    <span className="text-slate-400">{label}</span>
                    <span className={cn('inline-flex items-center gap-1.5', ok ? 'text-verify-400' : 'text-warn-400')}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', ok ? 'bg-verify-400' : 'bg-warn-400')} />
                      {value}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {picks.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => setActive(i)}
                  className={cn('h-1.5 rounded-full transition-all duration-400', i === active ? 'w-6 bg-aqua-400' : 'w-1.5 bg-white/16 hover:bg-white/30')}
                  aria-label={`Show log ${p.id}`}
                />
              ))}
            </div>
            <Link to={`/logs/${l.id}`} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-volt-300 transition hover:text-volt-200">
              Open sheet <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </TiltCard>

      <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5"><Users className="h-3 w-3" /> {l.watchers} watching</span>
        <span className="inline-flex items-center gap-1.5"><TrendingUp className="h-3 w-3" /> {l.views24h} views today</span>
        <span className="inline-flex items-center gap-1.5"><Store className="h-3 w-3" /> {l.seller.name}</span>
      </div>
    </div>
  )
}

function HeroStat({ icon: Icon, label, value }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-slate-500">
        <Icon className="h-3.5 w-3.5 text-volt-300" />
        {label}
      </div>
      <div className="mt-1.5 text-[22px] font-semibold text-slate-100">{value}</div>
    </div>
  )
}

/* ------------------------------------------------------------ how it works - */
function HowItWorks() {
  const [tab, setTab] = useState('buy')
  const steps = {
    buy: [
      { icon: Store, title: 'Lock the log', body: 'Open the escrow sheet, review the proof vault and watcher data, then fund escrow. The seller sees funds are committed — not released.' },
      { icon: ScanFace, title: 'Run the ownership test', body: 'Screen-share with the seller while they log into the account and change the recovery email to your vault alias.' },
      { icon: KeyRound, title: 'Confirm the chain', body: 'Tick off email, password, 2FA seed and backup codes. Reachmark timestamps every mutation in the credential chain.' },
      { icon: Banknote, title: 'Release & warranty', body: 'Funds settle to the seller, a 7-day warranty window opens, and payouts are frozen if the platform reclaims the log.' },
    ],
    sell: [
      { icon: Tags, title: 'Build the listing', body: 'Six guided steps: platform, identity, metrics, proof, pricing, review. Validation runs live as you type.' },
      { icon: Wand2, title: 'Generate proof', body: 'The Proof Studio turns your analytics into a narrated reel with captions, so buyers stop asking for screenshots.' },
      { icon: ShieldCheck, title: 'Ops verification', body: 'Reachmark ops audits your credential chain within 4 working hours and stamps the listing verified.' },
      { icon: CircleDollarSign, title: 'Get paid', body: 'Escrow releases on buyer confirmation. Withdraw by bank transfer, Paystack or USDT — first payout within 24h.' },
    ],
  }

  const { scrollYProgress } = useScroll()
  const railHeight = useTransform(scrollYProgress, [0.18, 0.72], ['0%', '100%'])

  return (
    <section className="relative mx-auto max-w-[1400px] px-4 pt-24 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <SectionHead
          kicker="The protocol"
          title="A handover that behaves like a bank transfer"
          sub="Reachmark wraps every deal in the same four-stage protocol, whether you are moving a 40K Instagram page or a 9-year-old mailbox."
        />
        <Tabs
          tabs={[
            { id: 'buy', label: 'For buyers', icon: <Store className="h-3.5 w-3.5" /> },
            { id: 'sell', label: 'For sellers', icon: <Tags className="h-3.5 w-3.5" /> },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      <div className="relative mt-12 grid gap-5 lg:grid-cols-4">
        <div className="absolute left-0 top-0 hidden h-full w-px bg-white/8 lg:block">
          <motion.div style={{ height: railHeight }} className="w-px bg-[linear-gradient(180deg,#7c5cff,#22d3ee,#f472b6)]" />
        </div>
        {steps[tab].map((s, i) => (
            <motion.div
              key={`${tab}-${s.title}`}
              initial={{ opacity: 0, y: 28, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.55, delay: i * 0.08, ease }}
            >
              <Card className="group h-full p-5">
                <div className="flex items-center justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-xl2 border border-volt-500/25 bg-volt-500/12 text-volt-300 transition group-hover:border-aqua-500/40 group-hover:text-aqua-300">
                    <s.icon className="h-5 w-5" />
                  </span>
                  <span className="tnum font-mono text-[26px] font-semibold text-white/8 transition group-hover:text-white/16">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-[15.5px] font-semibold text-slate-100">{s.title}</h3>
                <p className="mt-2 text-[12.5px] leading-relaxed text-slate-400">{s.body}</p>
            </Card>
            </motion.div>
          ))}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------ escrow flow -- */
function EscrowFlow() {
  const stages = [
    { key: 'funded', label: 'Escrow funded', detail: 'Buyer card or balance locked', icon: Lock, tone: '#7c5cff' },
    { key: 'test', label: 'Ownership test', detail: 'Recorded screen share', icon: ScanFace, tone: '#22d3ee' },
    { key: 'chain', label: 'Credential chain', detail: '4 artefacts signed off', icon: KeyRound, tone: '#4ade80' },
    { key: 'settled', label: 'Settled + warranty', detail: 'Payout queued, 7-day cover', icon: Banknote, tone: '#f472b6' },
  ]
  const [step, setStep] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % (stages.length + 1)), 2200)
    return () => clearInterval(t)
  }, [stages.length])

  return (
    <section className="mx-auto max-w-[1400px] px-4 pt-24 sm:px-6 lg:px-8">
      <SectionHead
        align="center"
        kicker="Escrow engine"
        title="Watch a deal clear, stage by stage"
        sub="No stage can be skipped. The credential chain must be signed off before escrow releases, and every mutation is written to an immutable audit log."
      />
      <div className="mt-14 grid gap-4 lg:grid-cols-4">
        {stages.map((s, i) => {
          const done = i < step
          const active = i === step
          return (
            <Reveal key={s.key} delay={i * 0.08}>
              <div
                className={cn(
                  'relative h-full overflow-hidden rounded-xl3 border p-5 transition-all duration-700',
                  active ? 'border-white/16 bg-white/[0.05]' : done ? 'border-verify-500/25 bg-verify-500/[0.05]' : 'border-white/8 bg-white/[0.02]',
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="relative grid h-11 w-11 place-items-center rounded-xl2 border"
                    style={{
                      borderColor: active || done ? `${s.tone}66` : 'rgba(255,255,255,.08)',
                      background: active || done ? `${s.tone}1f` : 'rgba(255,255,255,.02)',
                      color: active || done ? s.tone : '#5f6d8e',
                    }}
                  >
                    <s.icon className="h-5 w-5" />
                    {active && <span className="absolute inset-0 animate-pulse-ring rounded-xl2 border" style={{ borderColor: s.tone }} />}
                  </span>
                  <div>
                    <div className="text-[13.5px] font-semibold text-slate-100">{s.label}</div>
                    <div className="text-[11.5px] text-slate-500">{s.detail}</div>
                  </div>
                  {done && <BadgeCheck className="ml-auto h-4 w-4 text-verify-400" />}
                </div>
                <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/6">
                  <motion.div
                    animate={{ width: done ? '100%' : active ? '62%' : '0%' }}
                    transition={{ duration: 1.1, ease }}
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg,${s.tone},rgba(34,211,238,.6))` }}
                  />
                </div>
                {i < stages.length - 1 && (
                  <span className="absolute -right-2 top-11 hidden h-px w-4 bg-gradient-to-r from-white/20 to-transparent lg:block" />
                )}
              </div>
            </Reveal>
          )
        })}
      </div>

      <Reveal delay={0.2}>
        <Card className="mt-6 p-6" hover={false}>
          <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr_1fr]">
            {[
              { label: 'Deals under escrow', value: 1284, suffix: '', icon: Lock },
              { label: 'Median release time', value: 2.7, suffix: ' h', icon: Timer, decimals: 1 },
              { label: 'Disputes resolved', value: 99.2, suffix: '%', icon: ShieldCheck, decimals: 1 },
            ].map((k) => (
              <div key={k.label} className="flex items-center gap-4">
                <span className="grid h-12 w-12 place-items-center rounded-xl2 border border-aqua-500/25 bg-aqua-500/10 text-aqua-300">
                  <k.icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-[11.5px] uppercase tracking-[0.14em] text-slate-500">{k.label}</div>
                  <div className="mt-1 text-[24px] font-semibold text-slate-100">
                    <Counter to={k.value} suffix={k.suffix} decimals={k.decimals ?? 0} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </Reveal>
    </section>
  )
}

/* ---------------------------------------------------------- testimonials --- */
const OPERATORS = [
  {
    name: 'Marcus Reyes',
    role: 'Acquisition lead · Northbeam Media',
    quote:
      'We buy ten to fifteen logs a month. Reachmark’s credential chain replaced a spreadsheet, two lawyers and most of my anxiety. The proof vault alone is worth the subscription.',
    metric: '38 transfers closed',
  },
  {
    name: 'Ifeoma Balogun',
    role: 'Creator · Lagos',
    quote:
      'I listed a monetised lifestyle page on a Tuesday and it cleared by Thursday. Payout hit my bank in under a day, and the buyer never once asked me for a screenshot.',
    metric: '$9,400 cleared',
  },
  {
    name: 'Tomas Lindqvist',
    role: 'Ops desk · Verkstad Group',
    quote:
      'The verification queue is the part nobody else builds. We can see exactly which artefact a seller changed and when — disputes basically stopped.',
    metric: '0 disputes in 6 months',
  },
]

function Testimonials() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % OPERATORS.length), 5400)
    return () => clearInterval(t)
  }, [])
  const o = OPERATORS[i]

  return (
    <section className="mx-auto max-w-[1400px] px-4 pt-24 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <SectionHead
          kicker="Operator stories"
          title="Trusted by the people who move volume"
          sub="Media buyers, agencies and full-time sellers run their digital-asset books on Reachmark."
        />
        <div>
          <Card className="p-7" hover={false}>
            <div className="flex items-center gap-1 text-warn-400">
              {Array.from({ length: 5 }).map((_, k) => (
                <Star key={k} className="h-4 w-4 fill-current" />
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.blockquote
                key={o.name}
                initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -10, filter: 'blur(6px)' }}
                transition={{ duration: 0.5, ease }}
                className="mt-5 text-[16px] leading-relaxed text-slate-200"
              >
                “{o.quote}”
              </motion.blockquote>
            </AnimatePresence>
            <div className="mt-6 flex items-center gap-3 border-t border-white/8 pt-5">
              <img src={avatarArt(o.name, o.name[0])} alt="" className="h-11 w-11 rounded-full" />
              <div>
                <div className="text-[13.5px] font-semibold text-slate-100">{o.name}</div>
                <div className="text-[11.5px] text-slate-500">{o.role}</div>
              </div>
              <Badge tone="verify" className="ml-auto">{o.metric}</Badge>
            </div>
            <div className="mt-5 flex items-center gap-1.5">
              {OPERATORS.map((op, k) => (
                <button
                  key={op.name}
                  onClick={() => setI(k)}
                  className={cn('h-1.5 rounded-full transition-all duration-400', k === i ? 'w-7 bg-volt-500' : 'w-1.5 bg-white/16 hover:bg-white/30')}
                  aria-label={`Story ${k + 1}`}
                />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------- velocity chart --- */
function VelocityChart({ listings }) {
  const buckets = useMemo(() => {
    const arr = Array.from({ length: 24 }, () => 0)
    listings.forEach((l) => {
      arr[l.id.charCodeAt(3) % 24] += 1 + Math.floor(l.views24h / 90)
    })
    let acc = 0
    return arr.map((v, i) => {
      acc += v
      return { hour: i, value: acc }
    })
  }, [listings])

  const max = buckets[buckets.length - 1].value
  const min = buckets[0].value
  const path = buckets
    .map((b, i) => `${(i / 23) * 100},${40 - ((b.value - min) / (max - min || 1)) * 34}`)
    .join(' ')

  return (
    <div className="relative mt-4 h-[120px] w-full">
      <svg viewBox="0 0 100 46" preserveAspectRatio="none" className="h-full w-full">
        <defs>
          <linearGradient id="vel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#22d3ee" stopOpacity="0.45" />
            <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[10, 20, 30].map((y) => (
          <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="rgba(148,163,214,.09)" strokeWidth="0.3" />
        ))}
        <motion.polygon
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          points={`0,44 ${path} 100,44`}
          fill="url(#vel)"
        />
        <motion.polyline
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.6, ease: 'easeOut' }}
          points={path}
          fill="none"
          stroke="#38d9f0"
          strokeWidth="0.7"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex items-end justify-between text-[10px] text-slate-600">
        {['00:00', '06:00', '12:00', '18:00', '24:00'].map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
    </div>
  )
}
