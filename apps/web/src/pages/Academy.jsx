import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Award, BadgeCheck, BookOpen, CheckCircle2, ChevronRight, Compass, Crown, FileCheck2,
  GraduationCap, Layers, Lock, PlayCircle, Route, ScrollText, Shield, Sparkles, Target,
  TrendingUp, Users, Zap,
} from 'lucide-react'
import { Badge, Button, Card, Counter, Progress, Reveal, SectionHead, Tabs, ease } from '../components/ui'
import { cn } from '../lib/format'

/** Roadmap data — the visual-learning-path pattern borrowed from roadmap.sh. */
const TRACKS = [
  {
    id: 'seller',
    label: 'First sale',
    icon: Target,
    blurb: 'Zero to cleared sale in a week.',
    nodes: [
      { id: 's1', title: 'Account valuation basics', mins: 12, done: true, body: 'How reach, engagement, age and monetisation combine into a fair clearing price — and why your 40K page is not worth what a valuation site told you.' },
      { id: 's2', title: 'Building the proof vault', mins: 18, done: true, body: 'Which artefacts buyers actually check, how to capture a clean analytics screenshot set, and why the live session beats a static export every time.' },
      { id: 's3', title: 'Writing a listing that clears', mins: 15, done: false, body: 'Title structure, the eight facts buyers scan for, and how to disclose problems in a way that builds rather than kills trust.' },
      { id: 's4', title: 'Running the ownership test', mins: 21, done: false, body: 'A rehearsal script for the screen share, the three questions buyers always ask, and the credential artefacts to have open in separate tabs.' },
      { id: 's5', title: 'Pricing, offers and counter-offers', mins: 16, done: false, body: 'When to hold the ask, when to accept 12% below, and how escrow windows move your negotiating position.' },
      { id: 's6', title: 'Getting paid cleanly', mins: 9, done: false, body: 'Payout rails, timing, fees, and the record-keeping that keeps your desk audit-ready.' },
    ],
  },
  {
    id: 'buyer',
    label: 'First acquisition',
    icon: Compass,
    blurb: 'Buy a log without the horror stories.',
    nodes: [
      { id: 'b1', title: 'Reading a listing critically', mins: 14, done: false, body: 'Red flags in metrics, why engagement outliers matter, and how to sanity-check reach against niche benchmarks.' },
      { id: 'b2', title: 'The escrow walkthrough', mins: 11, done: false, body: 'What each escrow stage protects, what it does not, and the exact moment your money becomes the seller’s.' },
      { id: 'b3', title: 'Auditing the credential chain', mins: 20, done: false, body: 'How to read a chain: current recovery email, 2FA possession, backup codes, and stale sessions that can be used to reclaim.' },
      { id: 'b4', title: 'Post-transfer hygiene', mins: 17, done: false, body: 'First 24 hours: password rotation, session invalidation, connected-app review, and the screenshot you keep for your own records.' },
      { id: 'b5', title: 'Portfolio thinking', mins: 13, done: false, body: 'Building a book of logs: diversification across platforms, exit timing, and when to flip versus hold.' },
    ],
  },
  {
    id: 'desk',
    label: 'Ops desk',
    icon: Crown,
    blurb: 'For teams running volume through Reachmark.',
    nodes: [
      { id: 'd1', title: 'Verification queue mechanics', mins: 22, done: false, body: 'State machine, SLA handling, duplicate-hash detection and how flagged listings are frozen without delisting.' },
      { id: 'd2', title: 'Escrow ledger accounting', mins: 19, done: false, body: 'Reconciling committed, held and settled balances; fee recognition; and the payout approval workflow.' },
      { id: 'd3', title: 'Risk scoring sellers', mins: 24, done: false, body: 'Signals we score: KYC depth, response latency, chain hygiene, historical claims and resale patterns.' },
      { id: 'd4', title: 'Dispute adjudication', mins: 26, done: false, body: 'Running a 48-hour review: statements, chain audit, ruling templates and the suspension ladder.' },
      { id: 'd5', title: 'API & bulk operations', mins: 30, done: false, body: 'Hitting the Reachmark API for bulk listing import, bulk verification and webhook-driven settlement.' },
    ],
  },
]

export default function Academy() {
  const [track, setTrack] = useState('seller')
  const active = TRACKS.find((t) => t.id === track)
  const doneCount = active.nodes.filter((n) => n.done).length
  const [open, setOpen] = useState(active.nodes[0].id)

  const progress = Math.round((doneCount / active.nodes.length) * 100)
  const totalMins = active.nodes.reduce((a, n) => a + n.mins, 0)

  return (
    <div className="pt-24 sm:pt-28">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <SectionHead
          kicker="Seller academy"
          title="Learn the protocol, then move volume"
          sub="Short, opinionated lessons on buying and selling digital logs safely. The node graph pattern is lifted from roadmap.sh — click a node to expand the lesson brief."
        />

        <Reveal delay={0.1}>
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Lessons published', value: 46, icon: BookOpen },
              { label: 'Sellers certified', value: 7310, icon: Award },
              { label: 'Median lesson length', value: 17, suffix: ' min', icon: PlayCircle },
              { label: 'Escrow success after course', value: 98.4, suffix: '%', decimals: 1, icon: Shield },
            ].map((k) => (
              <Card key={k.label} className="p-5" hover={false}>
                <span className="grid h-9 w-9 place-items-center rounded-xl border border-volt-500/25 bg-volt-500/12 text-volt-300">
                  <k.icon className="h-4 w-4" />
                </span>
                <div className="mt-4 text-[23px] font-semibold text-slate-100">
                  <Counter to={k.value} suffix={k.suffix} decimals={k.decimals ?? 0} />
                </div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{k.label}</div>
              </Card>
            ))}
          </div>
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-[300px_1fr]">
          {/* track list */}
          <div className="space-y-3">
            {TRACKS.map((t) => {
              const done = t.nodes.filter((n) => n.done).length
              const isActive = t.id === track
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setTrack(t.id)
                    setOpen(t.nodes[0].id)
                  }}
                  className={cn(
                    'w-full rounded-xl2 border p-4 text-left transition duration-300',
                    isActive ? 'border-volt-500/45 bg-volt-500/12' : 'border-white/8 bg-white/[0.02] hover:border-white/16',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn('grid h-9 w-9 place-items-center rounded-xl border', isActive ? 'border-volt-500/40 text-volt-300' : 'border-white/10 text-slate-400')}>
                      <t.icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className={cn('text-[13.5px] font-semibold', isActive ? 'text-white' : 'text-slate-200')}>{t.label}</div>
                      <div className="truncate text-[11px] text-slate-500">{t.blurb}</div>
                    </div>
                  </div>
                  <Progress value={(done / t.nodes.length) * 100} className="mt-3.5" tone={isActive ? 'volt' : 'verify'} />
                  <div className="mt-2 flex items-center justify-between text-[10.5px] text-slate-500">
                    <span className="tnum">{done}/{t.nodes.length} lessons</span>
                    <span className="tnum">{t.nodes.reduce((a, n) => a + n.mins, 0)} min</span>
                  </div>
                </button>
              )
            })}

            <Card className="p-4" hover={false}>
              <div className="flex items-center gap-2 text-[12.5px] font-semibold text-slate-200">
                <Layers className="h-3.5 w-3.5 text-aqua-300" /> Certification
              </div>
              <p className="mt-2 text-[11.5px] leading-relaxed text-slate-400">
                Finish a track and the badge appears on your seller profile. Certified sellers see 31% faster
                first offers on the floor.
              </p>
              <Button size="sm" variant="ghost" className="mt-3 w-full" onClick={() => {}}>
                <GraduationCap className="h-3.5 w-3.5" /> View certificate
              </Button>
            </Card>
          </div>

          {/* node graph + lesson */}
          <div>
            <Card className="p-5" hover={false}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[13.5px] font-semibold text-slate-100">
                  <Route className="h-4 w-4 text-volt-300" /> {active.label} roadmap
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={progress > 60 ? 'verify' : 'warn'}>{progress}% complete</Badge>
                  <span className="tnum text-[11.5px] text-slate-500">{totalMins} min total</span>
                </div>
              </div>

              {/* roadmap graph */}
              <div className="scrollbar-none mt-6 overflow-x-auto pb-2">
                <div className="flex min-w-max items-center gap-3">
                  {active.nodes.map((n, i) => (
                    <div key={n.id} className="flex items-center gap-3">
                      <motion.button
                        initial={{ opacity: 0, y: 14 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.07, duration: 0.5, ease }}
                        onClick={() => setOpen(n.id)}
                        className={cn(
                          'relative w-[190px] rounded-xl2 border p-3.5 text-left transition',
                          open === n.id
                            ? 'border-volt-500/50 bg-volt-500/14 shadow-[0_16px_44px_-22px_rgba(124,92,255,.9)]'
                            : n.done
                              ? 'border-verify-500/30 bg-verify-500/[0.07]'
                              : 'border-white/8 bg-white/[0.02] hover:border-white/16',
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className={cn('grid h-6 w-6 place-items-center rounded-lg text-[10px]', n.done ? 'bg-verify-500/20 text-verify-400' : open === n.id ? 'bg-volt-500/25 text-volt-300' : 'bg-white/6 text-slate-400')}>
                            {n.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                          </span>
                          <span className="tnum text-[10.5px] text-slate-500">{n.mins} min</span>
                          {!n.done && <Lock className="ml-auto h-3 w-3 text-slate-600" />}
                        </div>
                        <div className="mt-2.5 line-clamp-2 text-[12.5px] font-medium text-slate-200">{n.title}</div>
                      </motion.button>
                      {i < active.nodes.length - 1 && (
                        <svg width="34" height="10" className="shrink-0">
                          <line x1="0" y1="5" x2="34" y2="5" stroke={n.done ? '#4ade80' : '#2a3555'} strokeWidth="1.5" strokeDasharray="4 3" className="animate-dash" />
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* lesson detail */}
            {active.nodes
              .filter((n) => n.id === open)
              .map((n) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease }}
                  className="mt-5"
                >
                  <Card className="p-6" hover={false}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge tone={n.done ? 'verify' : 'volt'} dot>{n.done ? 'completed' : 'in progress'}</Badge>
                          <span className="tnum text-[11.5px] text-slate-500">{n.mins} minute lesson</span>
                        </div>
                        <h2 className="mt-3 text-[21px]">{n.title}</h2>
                      </div>
                      <Button variant={n.done ? 'ghost' : 'primary'}>
                        <PlayCircle className="h-4 w-4" /> {n.done ? 'Rewatch' : 'Start lesson'}
                      </Button>
                    </div>

                    <p className="mt-5 text-[13.5px] leading-relaxed text-slate-400">{n.body}</p>

                    <div className="mt-6 grid gap-4 sm:grid-cols-3">
                      {[
                        ['Reading', '7 min', ScrollText],
                        ['Walkthrough', '6 min', PlayCircle],
                        ['Checklist', '4 min', FileCheck2],
                      ].map(([label, mins, Icon]) => (
                        <div key={label} className="rounded-xl2 border border-white/8 bg-white/[0.02] p-4">
                          <Icon className="h-4 w-4 text-aqua-300" />
                          <div className="mt-2.5 text-[13px] font-medium text-slate-200">{label}</div>
                          <div className="tnum text-[11px] text-slate-500">{mins}</div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </motion.div>
              ))}

            {/* next up */}
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {active.nodes
                .filter((n) => !n.done)
                .slice(0, 2)
                .map((n, i) => (
                  <Card key={n.id} className="p-5">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                      <Sparkles className="h-3 w-3 text-volt-300" /> up next
                    </div>
                    <div className="mt-2.5 text-[14px] font-semibold text-slate-100">{n.title}</div>
                    <p className="mt-1.5 line-clamp-2 text-[12px] text-slate-400">{n.body}</p>
                    <Button size="sm" variant="ghost" className="mt-4" onClick={() => setOpen(n.id)}>
                      Open lesson <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </Card>
                ))}
            </div>

            <Reveal delay={0.1}>
              <div className="mt-8 flex flex-wrap items-center justify-between gap-5 rounded-[1.6rem] border border-volt-500/25 bg-[linear-gradient(120deg,rgba(124,92,255,.18),rgba(34,211,238,.08))] p-7">
                <div>
                  <h3 className="text-[18px]">Ready to put it into practice?</h3>
                  <p className="mt-2 max-w-lg text-[12.5px] text-slate-300/90">
                    Build your first listing with the wizard — the academy checklists are embedded directly in the
                    proof and pricing steps.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Link to="/sell">
                    <Button>
                      <Zap className="h-4 w-4" /> Start a listing
                    </Button>
                  </Link>
                  <Link to="/trust">
                    <Button variant="ghost">
                      <Shield className="h-4 w-4" /> Trust centre
                    </Button>
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </div>
  )
}
