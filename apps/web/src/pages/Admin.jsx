import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import {
  Activity, AlertTriangle, ArrowUpRight, BadgeCheck, Banknote, BarChart3, CheckCircle2,
  ClipboardCheck, Clock, Eye, FileWarning, Filter, Fingerprint, Gauge, KeyRound, Layers,
  LineChart, Lock, Radio, ScrollText, Search, ShieldAlert, ShieldCheck, Siren, Users, XCircle, Zap,
} from 'lucide-react'
import { Badge, Button, Card, Counter, Modal, Progress, Reveal, Sparkline, Tabs, ease } from '../components/ui'
import { PlatformGlyph } from '../components/marketplace/ListingCard'
import { cn, compact, formatDate, usd } from '../lib/format'
import { advance, resolvePayout, selectOpsKpis } from '../app/features/opsSlice'
import { RiskPanel } from '../components/copilot'
import { CATALOG } from '../data/catalog'

const STATE_META = {
  'awaiting-credential': { label: 'awaiting credential', tone: 'warn', icon: Clock },
  'credential-verified': { label: 'verified', tone: 'verify', icon: CheckCircle2 },
  'ownership-test': { label: 'ownership test', tone: 'aqua', icon: Fingerprint },
  flagged: { label: 'flagged', tone: 'danger', icon: ShieldAlert },
}

export default function Admin() {
  const dispatch = useDispatch()
  const kpis = useSelector(selectOpsKpis)
  const { queue, payouts, revenue, audit } = useSelector((s) => s.ops)
  const listings = useSelector((s) => s.catalog.listings)
  const [tab, setTab] = useState('queue')
  const [q, setQ] = useState('')
  const [detail, setDetail] = useState(null)

  const filteredQueue = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return queue
    return queue.filter((r) => `${r.id} ${r.listing} ${r.seller} ${r.listingId}`.toLowerCase().includes(term))
  }, [queue, q])

  const gmvSeries = revenue.map((r) => r.gmv)
  const openFlagged = queue.filter((r) => r.state === 'flagged').length

  return (
    <div className="pt-24 sm:pt-28">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        {/* header */}
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-danger-500/25 bg-danger-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-danger-400">
              <Siren className="h-3 w-3" /> Ops console
            </div>
            <h1 className="text-[2rem] leading-tight sm:text-[2.4rem]">Reachmark operations</h1>
            <p className="mt-2.5 max-w-2xl text-[14px] text-slate-400">
              Credential verification queue, escrow ledger, payout approvals and the audit trail. Ported from the
              AccountsBazaar admin dashboard and re-skinned for the Reachmark protocol.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="verify" dot>all workers healthy</Badge>
            <Badge tone="aqua">
              <Radio className="h-3 w-3" /> live
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => toast.success('Queue synchronised with the verification worker')}>
              <Activity className="h-3.5 w-3.5" /> Sync queue
            </Button>
          </div>
        </div>

        {/* KPI grid */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'GMV (12 mo)', value: usd(kpis.gmv), delta: 18.4, icon: Banknote, spark: gmvSeries },
            { label: 'Fees captured', value: usd(kpis.fees), delta: 17.9, icon: LineChart, spark: revenue.map((r) => r.fees) },
            { label: 'Open verifications', value: kpis.openQueue, delta: -6.2, icon: ClipboardCheck, spark: [24, 21, 19, 22, 17, 14] },
            { label: 'Pending payouts', value: usd(kpis.pendingPayouts), delta: 3.4, icon: Banknote, spark: [12, 18, 14, 22, 19, 26] },
          ].map((k, i) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06, duration: 0.55, ease }}>
              <Card className="p-5" hover={false}>
                <div className="flex items-start justify-between">
                  <span className="grid h-9 w-9 place-items-center rounded-xl border border-aqua-500/25 bg-aqua-500/10 text-aqua-300">
                    <k.icon className="h-4 w-4" />
                  </span>
                  <span className={cn('tnum rounded-full px-2 py-0.5 text-[11px] font-semibold', k.delta >= 0 ? 'bg-verify-500/14 text-verify-400' : 'bg-warn-400/14 text-warn-400')}>
                    {k.delta >= 0 ? '▲' : '▼'} {Math.abs(k.delta)}%
                  </span>
                </div>
                <div className="tnum mt-4 text-[22px] font-semibold text-slate-100">{k.value}</div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{k.label}</div>
                <Sparkline series={k.spark} stroke="#38d9f0" className="mt-2" />
              </Card>
            </motion.div>
          ))}
        </div>

        {/* revenue + risk */}
        <div className="mt-6 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <Card className="p-6" hover={false}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[16px] font-semibold text-slate-100">GMV &amp; fee capture</h2>
                <p className="mt-1 text-[12px] text-slate-500">Rolling 12 months, escrow-settled only</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="volt"><BarChart3 className="h-3 w-3" /> GMV</Badge>
                <Badge tone="aqua"><Zap className="h-3 w-3" /> fees</Badge>
              </div>
            </div>
            <div className="relative mt-6 h-56">
              <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="h-full w-full">
                <defs>
                  <linearGradient id="adminGmv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#7c5cff" stopOpacity="0.5" />
                    <stop offset="1" stopColor="#7c5cff" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[12.5, 25, 37.5].map((y) => (
                  <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="rgba(148,163,214,.08)" strokeWidth="0.25" />
                ))}
                <motion.polygon
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9 }}
                  points={`0,50 ${revenue.map((r, i) => `${(i / 11) * 100},${48 - (r.gmv / Math.max(...gmvSeries)) * 44}`).join(' ')} 100,50`}
                  fill="url(#adminGmv)"
                />
                <motion.polyline
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.6, ease: 'easeOut' }}
                  points={revenue.map((r, i) => `${(i / 11) * 100},${48 - (r.gmv / Math.max(...gmvSeries)) * 44}`).join(' ')}
                  fill="none"
                  stroke="#9a86ff"
                  strokeWidth="0.8"
                  vectorEffect="non-scaling-stroke"
                />
                <motion.polyline
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.6, delay: 0.2, ease: 'easeOut' }}
                  points={revenue.map((r, i) => `${(i / 11) * 100},${48 - (r.fees / Math.max(...revenue.map((x) => x.fees))) * 44}`).join(' ')}
                  fill="none"
                  stroke="#38d9f0"
                  strokeWidth="0.8"
                  strokeDasharray="3 2"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <div className="mt-3 flex justify-between text-[10.5px] text-slate-500">
                {revenue.map((r) => <span key={r.month}>{r.month}</span>)}
              </div>
            </div>
          </Card>

          <div className="space-y-5">
            <Card className="p-6" hover={false}>
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-slate-100">Risk signals</h2>
                <ShieldAlert className="h-4 w-4 text-warn-400" />
              </div>
              <div className="mt-4 space-y-3">
                {[
                  { label: 'Duplicate proof hashes', value: 7, tone: 'danger' },
                  { label: 'Off-platform payment requests', value: 3, tone: 'warn' },
                  { label: 'Credential rollback attempts', value: 2, tone: 'warn' },
                  { label: 'Disputes open this month', value: revenue[11].disputes, tone: 'aqua' },
                ].map((r) => (
                  <div key={r.label} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] px-3.5 py-2.5">
                    <span className="text-[12.5px] text-slate-300">{r.label}</span>
                    <span className={cn('tnum rounded-full px-2 py-0.5 text-[11.5px] font-semibold', r.tone === 'danger' ? 'bg-danger-500/16 text-danger-400' : r.tone === 'warn' ? 'bg-warn-400/16 text-warn-400' : 'bg-aqua-500/16 text-aqua-300')}>
                      {r.value}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl2 border border-danger-500/22 bg-danger-500/[0.06] p-3.5">
                <div className="flex items-center gap-2 text-[12px] font-medium text-danger-400">
                  <AlertTriangle className="h-3.5 w-3.5" /> {openFlagged} listings auto-flagged
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
                  Flagged listings stay visible but escrow is frozen pending owner review.
                </p>
              </div>
            </Card>

            <Card className="p-6" hover={false}>
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-slate-100">Coverage</h2>
                <Gauge className="h-4 w-4 text-volt-300" />
              </div>
              <div className="mt-4 space-y-3.5">
                {[
                  ['Sellers KYC verified', 94],
                  ['Listings with proof vault', 100],
                  ['Ownership tests recorded', 88],
                  ['Credential chains audited', 96],
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
          </div>
        </div>

        {/* tabs */}
        <div className="mt-9">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Tabs
              tabs={[
                { id: 'queue', label: 'Verification queue', icon: <ClipboardCheck className="h-3.5 w-3.5" />, count: queue.length },
                { id: 'payouts', label: 'Payout approvals', icon: <Banknote className="h-3.5 w-3.5" />, count: payouts.filter((p) => p.status !== 'paid').length },
                { id: 'listings', label: 'Inventory', icon: <Layers className="h-3.5 w-3.5" />, count: listings.length },
                { id: 'audit', label: 'Audit trail', icon: <ScrollText className="h-3.5 w-3.5" /> },
              ]}
              value={tab}
              onChange={setTab}
            />
            {tab === 'queue' && (
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search queue, seller or listing…"
                  className="h-10 w-full rounded-xl border border-white/10 bg-ink-900/70 pl-9 pr-3 text-[12.5px] outline-none focus:border-volt-500/60"
                />
              </div>
            )}
          </div>

          <div className="mt-6">
            {tab === 'queue' && (
              <div className="overflow-hidden rounded-xl3 glass edge">
                <table className="w-full text-left text-[12.5px]">
                  <thead className="bg-white/[0.03] text-[10.5px] uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Ref</th>
                      <th className="px-4 py-3 font-medium">Listing</th>
                      <th className="hidden px-4 py-3 font-medium md:table-cell">Seller</th>
                      <th className="px-4 py-3 font-medium">State</th>
                      <th className="hidden px-4 py-3 font-medium lg:table-cell">SLA</th>
                      <th className="hidden px-4 py-3 font-medium lg:table-cell">Risk</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/6">
                    {filteredQueue.map((r, i) => {
                      const meta = STATE_META[r.state]
                      return (
                        <motion.tr
                          key={r.id}
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: Math.min(i * 0.03, 0.3) }}
                          className="group transition hover:bg-white/[0.03]"
                        >
                          <td className="px-4 py-3 font-mono text-[11.5px] text-volt-300">{r.id}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <PlatformGlyph
                                platform={listings.find((l) => l.id === r.listingId)?.platform ?? 'instagram'}
                                className="h-3.5 w-3.5 shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="max-w-xs truncate text-[12.5px] text-slate-200">{r.listing}</div>
                                <div className="tnum text-[10.5px] text-slate-500">{r.listingId} · {r.platform}</div>
                              </div>
                            </div>
                          </td>
                          <td className="hidden px-4 py-3 text-slate-400 md:table-cell">{r.seller}</td>
                          <td className="px-4 py-3">
                            <Badge tone={meta.tone} dot>{meta.label}</Badge>
                          </td>
                          <td className="hidden px-4 py-3 lg:table-cell">
                            <span className={cn('tnum inline-flex items-center gap-1.5', r.slaHours > 18 ? 'text-warn-400' : 'text-slate-400')}>
                              <Clock className="h-3 w-3" /> {r.slaHours}h
                            </span>
                          </td>
                          <td className="hidden px-4 py-3 lg:table-cell">
                            <span className={cn('tnum', r.risk > 0.7 ? 'text-danger-400' : r.risk > 0.4 ? 'text-warn-400' : 'text-verify-400')}>
                              {r.risk.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setDetail(r)}
                                className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 text-slate-400 transition hover:text-slate-200"
                                title="Inspect"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  dispatch(advance(r.id))
                                  toast.success(`${r.id} advanced`)
                                }}
                                className="rounded-lg border border-volt-500/35 bg-volt-500/12 px-2.5 py-1.5 text-[11.5px] text-volt-300 transition hover:bg-volt-500/20"
                              >
                                Advance
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'payouts' && (
              <div className="grid gap-4 lg:grid-cols-2">
                {payouts.map((p, i) => (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04, duration: 0.5, ease }}>
                    <Card className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-mono text-[11.5px] text-volt-300">{p.id}</div>
                          <div className="mt-1 text-[13.5px] font-semibold text-slate-100">{p.seller}</div>
                          <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-500">
                            <span>{p.method}</span>
                            <span className="tnum">trust {p.trust.toFixed(2)}</span>
                            <span>{formatDate(p.requestedAt)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="tnum text-[18px] font-semibold text-slate-100">{usd(p.amount)}</div>
                          <Badge tone={p.status === 'paid' ? 'verify' : p.status === 'approved' ? 'aqua' : 'warn'} dot className="mt-1.5">
                            {p.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button
                          size="sm"
                          variant={p.status === 'paid' ? 'ghost' : 'primary'}
                          onClick={() => {
                            dispatch(resolvePayout(p.id))
                            toast.success(`${p.id} marked ${p.status === 'paid' ? 'review' : 'paid'}`)
                          }}
                        >
                          {p.status === 'paid' ? 'Reopen' : 'Approve payout'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => toast.success('Statement exported')}>
                          Statement
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}

            {tab === 'listings' && (
              <div className="overflow-hidden rounded-xl3 glass edge">
                <div className="max-h-[62vh] overflow-y-auto">
                  <table className="w-full text-left text-[12.5px]">
                    <thead className="sticky top-0 bg-ink-900/95 text-[10.5px] uppercase tracking-[0.12em] text-slate-500 backdrop-blur">
                      <tr>
                        <th className="px-4 py-3 font-medium">Log</th>
                        <th className="px-4 py-3 font-medium">Platform</th>
                        <th className="hidden px-4 py-3 font-medium md:table-cell">Seller</th>
                        <th className="px-4 py-3 font-medium">Ask</th>
                        <th className="hidden px-4 py-3 font-medium lg:table-cell">Chain</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/6">
                      {listings.slice(0, 40).map((l) => (
                        <tr key={l.id} className="transition hover:bg-white/[0.03]">
                          <td className="px-4 py-2.5">
                            <Link to={`/logs/${l.id}`} className="group inline-flex items-center gap-2">
                              <span className="max-w-xs truncate text-slate-200">{l.title}</span>
                              <ArrowUpRight className="h-3 w-3 text-slate-600 transition group-hover:text-aqua-300" />
                            </Link>
                            <div className="tnum text-[10.5px] text-slate-500">{l.id}</div>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="inline-flex items-center gap-1.5 text-slate-400">
                              <PlatformGlyph platform={l.platform} className="h-3.5 w-3.5" /> {l.platformLabel}
                            </span>
                          </td>
                          <td className="hidden px-4 py-2.5 text-slate-400 md:table-cell">{l.seller.name}</td>
                          <td className="tnum px-4 py-2.5 font-semibold text-slate-100">{usd(l.price)}</td>
                          <td className="hidden px-4 py-2.5 lg:table-cell">
                            <span className="inline-flex items-center gap-2">
                              {[
                                ['submitted', true],
                                ['verified', l.credentialChain.verified],
                                ['changed', l.credentialChain.changed],
                              ].map(([k, ok]) => (
                                <span key={k} className={cn('inline-flex items-center gap-1 text-[10.5px]', ok ? 'text-verify-400' : 'text-slate-500')}>
                                  <span className={cn('h-1.5 w-1.5 rounded-full', ok ? 'bg-verify-400' : 'bg-slate-600')} />
                                  {k}
                                </span>
                              ))}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            {l.status === 'active' ? <Badge tone="verify" dot>active</Badge> : <Badge tone="warn">verifying</Badge>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'audit' && (
              <Card className="p-5" hover={false}>
                <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-200">
                  <ScrollText className="h-4 w-4 text-volt-300" /> Immutable audit trail
                </div>
                <div className="mt-5 space-y-2.5">
                  {audit.map((a, i) => (
                    <motion.div
                      key={`${a.at}-${i}`}
                      initial={{ opacity: 0, x: -14 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.05, 0.4), duration: 0.45, ease }}
                      className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-3.5 py-3"
                    >
                      <span
                        className={cn(
                          'grid h-8 w-8 shrink-0 place-items-center rounded-lg border',
                          a.tone === 'ok' ? 'border-verify-500/30 text-verify-400' : a.tone === 'warn' ? 'border-warn-400/30 text-warn-400' : 'border-danger-500/30 text-danger-400',
                        )}
                      >
                        {a.tone === 'ok' ? <CheckCircle2 className="h-3.5 w-3.5" /> : a.tone === 'warn' ? <FileWarning className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12.5px] text-slate-200">{a.action}</div>
                        <div className="text-[11px] text-slate-500">
                          <span className="font-mono text-volt-300">{a.actor}</span> · {a.target} · {new Date(a.at).toLocaleString()}
                        </div>
                      </div>
                      <Lock className="h-3.5 w-3.5 shrink-0 text-slate-600" />
                    </motion.div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* queue detail modal */}
      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        subtitle={detail?.id}
        title="Verification detail"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDetail(null)}>Close</Button>
            <Button
              onClick={() => {
                dispatch(advance(detail.id))
                toast.success(`${detail.id} advanced`)
                setDetail(null)
              }}
            >
              <BadgeCheck className="h-4 w-4" /> Advance state
            </Button>
          </>
        }
      >
        {detail && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['Listing', detail.listing],
                ['Reference', detail.listingId],
                ['Seller', detail.seller],
                ['Platform', detail.platform],
                ['Submitted', new Date(detail.submittedAt).toLocaleString()],
                ['SLA remaining', `${detail.slaHours}h`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl2 border border-white/8 bg-white/[0.02] p-3.5">
                  <div className="text-[10.5px] uppercase tracking-[0.14em] text-slate-500">{k}</div>
                  <div className="mt-1 text-[12.5px] text-slate-200">{v}</div>
                </div>
              ))}
            </div>

            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Credential chain checks</div>
              <div className="space-y-2">
                {[
                  ['Recovery email matches platform state', true],
                  ['Ownership screen-share hash verified', true],
                  ['Proof artefacts unique (no duplicate hash)', detail.risk < 0.7],
                  ['Monetisation status corroborated', detail.risk < 0.5],
                  ['No prior resale in the registry', detail.risk < 0.3],
                ].map(([label, ok]) => (
                  <div key={label} className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.02] px-3.5 py-2.5 text-[12.5px]">
                    <span className={cn('grid h-5 w-5 place-items-center rounded-full text-[10px]', ok ? 'bg-verify-500/18 text-verify-400' : 'bg-danger-500/18 text-danger-400')}>
                      {ok ? '✓' : '!'}
                    </span>
                    <span className={ok ? 'text-slate-300' : 'text-slate-400'}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl2 border border-white/8 bg-ink-950/50 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Ops note</div>
              <p className="mt-2 text-[12.5px] leading-relaxed text-slate-400">{detail.notes}</p>
              <div className="mt-3 flex items-center gap-3">
                <span className="text-[11px] text-slate-500">Risk score</span>
                <Progress value={detail.risk * 100} className="flex-1" tone={detail.risk > 0.7 ? 'volt' : 'verify'} />
                <span className="tnum text-[12px] text-slate-300">{detail.risk.toFixed(2)}</span>
              </div>
            </div>

            {/* Copilot screen — a second, independent read on the same listing.
                The desk's own score is a stored number; this is computed live
                from the credential state, revenue claims and offer pressure. */}
            <RiskPanel listing={CATALOG.listings.find((l) => l.id === detail.listingId) ?? { id: detail.listingId, title: detail.listing, risk: detail.risk }} />
          </div>
        )}
      </Modal>
    </div>
  )
}
