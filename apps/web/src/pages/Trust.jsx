import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AlertTriangle, BadgeCheck, Banknote, BookOpen, Fingerprint, Gavel, Handshake, KeyRound,
  Lock, MessageSquare, Radar, ScanFace, ScrollText, Shield, ShieldCheck, Siren, Timer,
  UserCheck, Users, XCircle, Zap,
} from 'lucide-react'
import { Badge, Button, Card, Counter, Progress, Reveal, SectionHead, Tabs, ease } from '../components/ui'
import { cn } from '../lib/format'

const PILLARS = [
  {
    id: 'ownership',
    label: 'Ownership',
    icon: Fingerprint,
    title: 'Ownership is tested, not assumed',
    body: 'Before escrow releases, the seller screen-shares a live login: recovery email change, 2FA confirmation and a look at the platform’s own metrics page. The recording is hashed and stored in the proof vault, so a later dispute is settled against evidence rather than screenshots.',
    points: [
      'Screen-share recording, minimum 4 minutes',
      'Live metrics view, not a static export',
      'Hash written to the chain at capture time',
      'Recording retained for 180 days post-transfer',
    ],
  },
  {
    id: 'escrow',
    label: 'Escrow',
    icon: Lock,
    title: 'Money only moves when credentials do',
    body: 'Reachmark holds the buyer’s funds for the whole handover. Sellers see committed funds (so they know the buyer is real) but cannot touch them until the buyer confirms the credential chain. If nobody confirms, the window expires and the money returns.',
    points: [
      'Funds held 3–14 days depending on the log',
      'Auto-release on buyer confirmation',
      'Auto-refund if the window lapses undisputed',
      'Off-platform payment voids all protection',
    ],
  },
  {
    id: 'warranty',
    label: 'Warranty',
    icon: Handshake,
    title: '7-day warranty on every transfer',
    body: 'Most reclaims happen in the first week. If the platform rolls the credential back, suspends the log, or the seller re-uses a recovery path inside the warranty window, the buyer is refunded and the seller is suspended pending review.',
    points: [
      'Covers credential rollback and platform reclaim',
      'Covers material misstatement of metrics',
      'Refund within 72 hours of an upheld claim',
      'Sellers suspended after two upheld claims',
    ],
  },
  {
    id: 'disputes',
    label: 'Disputes',
    icon: Gavel,
    title: 'Disputes are decided on the chain',
    body: 'When a deal sours, the credential chain is the record of truth: every agreed handover artefact, every mutation, every confirmation, timestamped. A human reviewer reads the chain and rules within 48 hours.',
    points: [
      '48-hour review SLA',
      'Buyer and seller submit statements in-thread',
      'Evidence is the signed credential chain, not chat',
      'Escrow is frozen the moment a dispute opens',
    ],
  },
]

const RED_FLAGS = [
  { icon: XCircle, title: 'Payment requested off-platform', body: 'Any “send it to my wallet instead” is a scam pattern. Report the thread — the guard flags it automatically.' },
  { icon: AlertTriangle, title: 'Screenshots with no live session', body: 'Static analytics images are trivial to fake. Insist on the recorded live view in the proof vault.' },
  { icon: Siren, title: 'Price far below the model', body: 'A log at 40% of fair value is usually stolen, or the seller plans to reclaim it after payment.' },
  { icon: UserCheck, title: 'Seller refuses the ownership test', body: 'The test is mandatory on Reachmark. A refusal is a hard stop — walk away and tell the desk.' },
]

export default function Trust() {
  const [tab, setTab] = useState('ownership')
  const active = PILLARS.find((p) => p.id === tab)

  return (
    <div className="pt-24 sm:pt-28">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <SectionHead
          kicker="Trust centre"
          title="The escrow protocol, in plain language"
          sub="Reachmark exists because buying a digital log is normally a leap of faith. Here is exactly what we verify, what we hold, and what happens when something goes wrong."
        />

        {/* coverage strip */}
        <Reveal delay={0.1}>
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Deals cleared under escrow', value: 41280, icon: Banknote },
              { label: 'Ownership tests recorded', value: 38940, icon: ScanFace },
              { label: 'Claims upheld and refunded', value: 214, icon: ShieldCheck },
              { label: 'Dispute resolution rate', value: 99.2, suffix: '%', decimals: 1, icon: Gavel },
            ].map((k) => (
              <Card key={k.label} className="p-5" hover={false}>
                <span className="grid h-9 w-9 place-items-center rounded-xl border border-verify-500/25 bg-verify-500/10 text-verify-400">
                  <k.icon className="h-4 w-4" />
                </span>
                <div className="mt-4 text-[24px] font-semibold text-slate-100">
                  <Counter to={k.value} suffix={k.suffix} decimals={k.decimals ?? 0} />
                </div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{k.label}</div>
              </Card>
            ))}
          </div>
        </Reveal>

        {/* pillars */}
        <div className="mt-14">
          <Tabs tabs={PILLARS.map((p) => ({ id: p.id, label: p.label, icon: <p.icon className="h-3.5 w-3.5" /> }))} value={tab} onChange={setTab} />
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease }}
            className="mt-6 grid gap-5 lg:grid-cols-[1.3fr_1fr]"
          >
            <Card className="p-7" hover={false}>
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl2 border border-volt-500/30 bg-volt-500/12 text-volt-300">
                  <active.icon className="h-5 w-5" />
                </span>
                <h2 className="text-[20px]">{active.title}</h2>
              </div>
              <p className="mt-5 text-[14px] leading-relaxed text-slate-400">{active.body}</p>
              <ul className="mt-6 space-y-3">
                {active.points.map((p) => (
                  <li key={p} className="flex items-start gap-3 text-[13px] text-slate-300">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-verify-400" />
                    {p}
                  </li>
                ))}
              </ul>
            </Card>

            <div className="space-y-4">
              <Card className="p-6" hover={false}>
                <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-200">
                  <Radar className="h-4 w-4 text-aqua-300" /> Live monitoring
                </div>
                <div className="mt-4 space-y-3.5">
                  {[
                    ['Escrow ledger reconciled', 100],
                    ['Threads scanned for off-platform invites', 100],
                    ['Proof artefacts hash-unique', 96],
                    ['KYC coverage across active sellers', 94],
                  ].map(([label, v]) => (
                    <div key={label}>
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="text-slate-400">{label}</span>
                        <span className="tnum text-slate-300">{v}%</span>
                      </div>
                      <Progress value={v} className="mt-1.5" tone="verify" />
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6" hover={false}>
                <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-200">
                  <ScrollText className="h-4 w-4 text-volt-300" /> What we cannot promise
                </div>
                <p className="mt-3 text-[12.5px] leading-relaxed text-slate-400">
                  Account transfer usually breaches a platform’s terms of service, even where it is lawful. Reachmark
                  verifies ownership and protects the handover; you remain responsible for assessing platform policy
                  risk. Every listing shows the platform and the handover format precisely so you can make that call.
                </p>
              </Card>
            </div>
          </motion.div>
        </div>

        {/* red flags */}
        <section className="mt-20">
          <SectionHead
            kicker="Fraud patterns"
            title="Four red flags that end badly"
            sub="The risk desk sees the same plays repeatedly. Recognise them and you avoid almost every bad outcome on the floor."
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {RED_FLAGS.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07, duration: 0.55, ease }}>
                <Card className="h-full p-5">
                  <span className="grid h-10 w-10 place-items-center rounded-xl2 border border-danger-500/30 bg-danger-500/10 text-danger-400">
                    <f.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-[14.5px] font-semibold text-slate-100">{f.title}</h3>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-slate-400">{f.body}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* timeline of a disputed deal */}
        <section className="mt-20">
          <SectionHead kicker="Worked example" title="What a disputed deal looks like end to end" />
          <Card className="mt-8 p-7" hover={false}>
            <div className="relative pl-7">
              <span className="absolute left-[7px] top-2 h-[calc(100%-2rem)] w-px bg-gradient-to-b from-volt-500/60 via-aqua-500/40 to-transparent" />
              {[
                ['Day 0 — escrow funded', 'Buyer funds $4,820. Seller sees committed funds and starts the ownership test the same evening.', 'volt'],
                ['Day 0 — chain confirmed', 'Recovery email rotated to the buyer’s vault alias, 2FA seed re-sealed, chain signed off by both parties.', 'aqua'],
                ['Day 3 — claim opened', 'Platform suspends the log citing an unusual login. Buyer opens a claim; escrow freezes pending review.', 'warn'],
                ['Day 4 — chain audited', 'Reviewer reads the credential chain: the seller’s recording shows the login, but the account had an unresolved appeal from a prior owner.', 'magenta'],
                ['Day 5 — ruling', 'Claim upheld on material non-disclosure. Buyer refunded in full within 72 hours; seller suspended pending KYC re-verification.', 'verify'],
              ].map(([title, body, tone], i) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.5, ease }}
                  className="relative pb-7 last:pb-0"
                >
                  <span
                    className={cn(
                      'absolute -left-7 top-1.5 h-3.5 w-3.5 rounded-full border-2',
                      tone === 'volt' ? 'border-volt-400 bg-volt-500/30'
                        : tone === 'aqua' ? 'border-aqua-400 bg-aqua-500/30'
                        : tone === 'warn' ? 'border-warn-400 bg-warn-400/30'
                        : tone === 'magenta' ? 'border-magenta-400 bg-magenta-500/30'
                        : 'border-verify-400 bg-verify-500/30',
                    )}
                  />
                  <div className="text-[13.5px] font-semibold text-slate-100">{title}</div>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-slate-400">{body}</p>
                </motion.div>
              ))}
            </div>
          </Card>
        </section>

        <Reveal delay={0.1}>
          <div className="mt-16 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <Card className="p-7" hover={false}>
              <div className="flex items-center gap-2 text-[15px] font-semibold text-slate-100">
                <Shield className="h-4 w-4 text-verify-400" /> Your obligations as a buyer or seller
              </div>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                {[
                  ['Buyers', ['Fund through escrow only', 'Run the ownership test on the call', 'Confirm the chain before release', 'Raise claims inside the warranty window']],
                  ['Sellers', ['Disclose prior appeals and suspensions', 'Complete handover inside the escrow window', 'Never reuse a recovery path', 'Keep the vault artefacts current']],
                ].map(([who, items]) => (
                  <div key={who}>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{who}</div>
                    <ul className="mt-3 space-y-2">
                      {items.map((it) => (
                        <li key={it} className="flex items-start gap-2 text-[12.5px] text-slate-300">
                          <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-volt-300" />
                          {it}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="flex flex-col justify-between p-7" hover={false}>
              <div>
                <div className="flex items-center gap-2 text-[15px] font-semibold text-slate-100">
                  <MessageSquare className="h-4 w-4 text-aqua-300" /> Talk to trust &amp; safety
                </div>
                <p className="mt-3 text-[12.5px] leading-relaxed text-slate-400">
                  Report a listing, a thread or a counterparty. The desk reviews every report inside two hours
                  during working hours, and freezes escrow immediately if a live deal is at risk.
                </p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button onClick={() => (window.location.href = 'mailto:trust@reachmarklogs.test')}>
                  <ShieldCheck className="h-4 w-4" /> Report an issue
                </Button>
                <Link to="/academy">
                  <Button variant="ghost">
                    <BookOpen className="h-4 w-4" /> Read the playbook
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </Reveal>
      </div>
    </div>
  )
}
