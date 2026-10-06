import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import {
  ArrowRight, ArrowUpRight, BadgeCheck, Banknote, BarChart3, Calendar, CircleDollarSign,
  Clock, CreditCard, Download, Eye, Gauge, Heart, Layers, Package, PiggyBank, Plus,
  ShieldCheck, Sparkles, Star, TrendingUp, Users, Wallet, Zap,
} from 'lucide-react'
import { Badge, Button, Card, Counter, Field, Input, Modal, Progress, Reveal, SectionHead, Sparkline, Stat, Tabs, ease } from '../components/ui'
import { PlatformGlyph } from '../components/marketplace/ListingCard'
import { avatarArt } from '../data/catalog'
import { cn, compact, formatDate, usd } from '../lib/format'
import { toggleWatch, withdraw } from '../app/features/authSlice'

const TABS = [
  { id: 'listings', label: 'My listings', icon: <Package className="h-3.5 w-3.5" /> },
  { id: 'orders', label: 'Orders', icon: <CircleDollarSign className="h-3.5 w-3.5" /> },
  { id: 'payouts', label: 'Payouts', icon: <Banknote className="h-3.5 w-3.5" /> },
  { id: 'watchlist', label: 'Watchlist', icon: <Heart className="h-3.5 w-3.5" /> },
]

export default function Dashboard() {
  const dispatch = useDispatch()
  const { user } = useSelector((s) => s.auth)
  const listings = useSelector((s) => s.catalog.listings)
  const [tab, setTab] = useState('listings')
  const [payoutOpen, setPayoutOpen] = useState(false)
  const [amount, setAmount] = useState('')

  const mine = useMemo(() => listings.filter((l) => l.seller.name === user.name || l.seller.id === 'sl_me'), [listings, user.name])
  const ownListings = mine.length ? mine : listings.slice(0, 6)
  const watched = listings.filter((l) => user.watchlist.includes(l.id))

  const orders = useMemo(
    () =>
      listings.slice(2, 9).map((l, i) => ({
        id: `ORD-${8100 + i * 3}`,
        listing: l,
        amount: Math.round(l.price * (i % 2 ? 1 : 0.94)),
        status: i < 3 ? 'escrow' : i < 6 ? 'released' : 'warranty',
        placed: new Date(Date.now() - (i + 1) * 86400000 * 1.4).toISOString(),
        release: new Date(Date.now() + (7 - i) * 86400000).toISOString(),
      })),
    [listings],
  )

  const payouts = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        id: `WD-${5200 + i * 7}`,
        amount: Math.round(480 + i * 620 + (i % 3) * 210),
        status: i < 2 ? 'pending' : 'paid',
        method: ['Bank transfer', 'Paystack', 'USDT (TRC-20)'][i % 3],
        at: new Date(Date.now() - i * 86400000 * 4).toISOString(),
      })),
    [],
  )

  const earningsSeries = useMemo(() => {
    let seed = 42
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    return Array.from({ length: 12 }, (_, i) => Math.round(1200 + i * 480 + rand() * 1900))
  }, [])

  const growth = ((earningsSeries[11] - earningsSeries[0]) / earningsSeries[0]) * 100

  return (
    <div className="pt-24 sm:pt-28">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        {/* header */}
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <Reveal>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-verify-500/25 bg-verify-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-verify-400">
                <Gauge className="h-3 w-3" /> Seller console
              </div>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 className="text-[2.1rem] leading-tight sm:text-[2.5rem]">
                Welcome back, {user.name.split(' ')[0]}
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-3 max-w-2xl text-[14px] text-slate-400">
                {ownListings.length} active listings · {orders.filter((o) => o.status === 'escrow').length} deals in escrow ·
                {" "}{payouts.filter((p) => p.status === 'pending').length} payouts awaiting release.
              </p>
            </Reveal>
          </div>
          <Reveal delay={0.12}>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3 rounded-xl2 border border-white/8 bg-white/[0.03] px-4 py-3">
                <img src={avatarArt(user.name, user.name[0])} alt="" className="h-10 w-10 rounded-xl2" />
                <div>
                  <div className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-100">
                    {user.name}
                    <BadgeCheck className="h-3.5 w-3.5 text-verify-400" />
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Trust {user.trustScore} · {user.plan.toUpperCase()} plan
                  </div>
                </div>
              </div>
              <Link to="/sell">
                <Button>
                  <Plus className="h-4 w-4" /> New listing
                </Button>
              </Link>
            </div>
          </Reveal>
        </div>

        {/* KPIs */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Available balance', value: usd(user.balance), delta: 12.4, icon: Wallet, spark: earningsSeries.slice(-6) },
            { label: 'In escrow', value: usd(user.pending), delta: 4.1, icon: ShieldCheck, spark: [4, 6, 5, 8, 9, 11] },
            { label: 'Lifetime earned', value: usd(user.lifetime), delta: 21.8, icon: TrendingUp, spark: [12, 18, 24, 31, 44, 58] },
            { label: 'Listing views (7d)', value: compact(ownListings.reduce((a, l) => a + l.views24h, 0) * 7), delta: -3.2, icon: Eye, spark: [40, 32, 36, 28, 31, 26] },
          ].map((k, i) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06, duration: 0.55, ease }}>
              <Card className="p-5" hover={false}>
                <div className="flex items-start justify-between">
                  <span className="grid h-9 w-9 place-items-center rounded-xl border border-volt-500/25 bg-volt-500/12 text-volt-300">
                    <k.icon className="h-4 w-4" />
                  </span>
                  <span className={cn('tnum rounded-full px-2 py-0.5 text-[11px] font-semibold', k.delta >= 0 ? 'bg-verify-500/14 text-verify-400' : 'bg-danger-500/14 text-danger-400')}>
                    {k.delta >= 0 ? '▲' : '▼'} {Math.abs(k.delta)}%
                  </span>
                </div>
                <div className="tnum mt-4 text-[24px] font-semibold text-slate-100">{k.value}</div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{k.label}</div>
                <Sparkline series={k.spark} stroke={k.delta >= 0 ? '#4ade80' : '#fb7185'} className="mt-2" />
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          {/* earnings chart */}
          <Card className="p-6" hover={false}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[16px] font-semibold text-slate-100">Earnings · last 12 months</h2>
                <p className="mt-1 text-[12px] text-slate-500">Net of Reachmark fees and processing</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone="verify">▲ {growth.toFixed(1)}%</Badge>
                <Button size="sm" variant="ghost">
                  <Download className="h-3.5 w-3.5" /> CSV
                </Button>
              </div>
            </div>
            <div className="mt-7 flex h-52 items-end gap-2.5">
              {earningsSeries.map((v, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  whileInView={{ height: `${(v / Math.max(...earningsSeries)) * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, delay: i * 0.05, ease }}
                  className="group relative flex-1 rounded-t-lg bg-[linear-gradient(180deg,rgba(124,92,255,.95),rgba(34,211,238,.3))]"
                >
                  <span className="tnum pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-ink-950/90 px-1.5 py-0.5 text-[10px] opacity-0 transition group-hover:opacity-100">
                    {usd(v)}
                  </span>
                </motion.div>
              ))}
            </div>
            <div className="mt-3 flex justify-between text-[10.5px] text-slate-500">
              {['Nov', 'Jan', 'Mar', 'May', 'Jul', 'Sep', 'Oct'].map((m) => <span key={m}>{m}</span>)}
            </div>
          </Card>

          {/* payout + plan */}
          <div className="space-y-5">
            <Card className="p-6" hover={false}>
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-slate-100">Withdraw funds</h2>
                <PiggyBank className="h-4 w-4 text-verify-400" />
              </div>
              <div className="tnum mt-3 text-[28px] font-semibold text-slate-100">{usd(user.balance)}</div>
              <p className="mt-1 text-[11.5px] text-slate-500">Available now · escrow releases clear in 24h</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {[0.25, 0.5, 1].map((p) => (
                  <button
                    key={p}
                    onClick={() => setAmount(String(Math.round(user.balance * p)))}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[12px] text-slate-300 transition hover:border-volt-500/40"
                  >
                    {p === 1 ? 'Max' : `${p * 100}%`}
                  </button>
                ))}
              </div>
              <Button className="mt-4 w-full" onClick={() => setPayoutOpen(true)}>
                <Banknote className="h-4 w-4" /> Request withdrawal
              </Button>
            </Card>

            <Card className="p-6" hover={false}>
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-slate-100">Plan</h2>
                <Badge tone="volt">{user.plan.toUpperCase()}</Badge>
              </div>
              <div className="mt-3 space-y-2 text-[12.5px]">
                {[
                  ['Fee per sale', '5.5%'],
                  ['Unlimited proof artefacts', 'included'],
                  ['Proof Studio reels', '20/mo'],
                  ['Renews', formatDate(user.planRenews)],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between">
                    <span className="text-slate-500">{k}</span>
                    <span className="font-medium capitalize text-slate-200">{v}</span>
                  </div>
                ))}
              </div>
              <Link to="/pricing">
                <Button size="sm" variant="ghost" className="mt-4 w-full">
                  <CreditCard className="h-3.5 w-3.5" /> Manage plan
                </Button>
              </Link>
            </Card>
          </div>
        </div>

        {/* tabs */}
        <div className="mt-9">
          <Tabs tabs={TABS.map((t) => (t.id === 'watchlist' ? { ...t, count: watched.length } : t))} value={tab} onChange={setTab} />
          <div className="mt-6">
            {tab === 'listings' && <MyListings listings={ownListings} />}
            {tab === 'orders' && <Orders orders={orders} />}
            {tab === 'payouts' && (
              <Payouts
                payouts={payouts}
                onWithdraw={(amount) => {
                  dispatch(withdraw(amount))
                  toast.success(`${usd(amount)} withdrawal requested — desk review within 24h`)
                  setPayoutOpen(false)
                }}
              />
            )}
            {tab === 'watchlist' && <Watchlist listings={watched} onRemove={(id) => dispatch(toggleWatch(id))} />}
          </div>
        </div>
      </div>

      <Modal
        open={payoutOpen}
        onClose={() => setPayoutOpen(false)}
        subtitle="Payouts"
        title="Request a withdrawal"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPayoutOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                const n = Number(amount)
                if (!n || n <= 0) return toast.error('Enter an amount')
                if (n > user.balance) return toast.error('That exceeds your available balance')
                dispatch(withdraw(n))
                toast.success(`${usd(n)} requested — settles within 24h`)
                setPayoutOpen(false)
                setAmount('')
              }}
            >
              Confirm request
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Amount (USD)" hint={`Available ${usd(user.balance)}`}>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(Math.round(user.balance))} />
          </Field>
          <div>
            <div className="mb-2 text-[11.5px] font-medium text-slate-300">Destination</div>
            <div className="space-y-2">
              {[
                ['Bank transfer', 'GTBank •••• 4821', '1–2 business days'],
                ['Paystack wallet', 'ada@reachmarklogs.test', 'instant'],
                ['USDT (TRC-20)', 'TQx…8f2d', '15 minutes'],
              ].map(([name, detail, eta], i) => (
                <label key={name} className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3.5 transition hover:border-volt-500/35">
                  <input type="radio" name="dest" defaultChecked={i === 0} className="accent-volt-500" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-medium text-slate-200">{name}</span>
                    <span className="block truncate text-[11px] text-slate-500">{detail}</span>
                  </span>
                  <span className="text-[11px] text-slate-500">{eta}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="rounded-xl2 border border-warn-400/25 bg-warn-400/[0.07] p-4 text-[11.5px] leading-relaxed text-slate-300">
            Withdrawals are reviewed by the ops desk. Pending escrow (in-flight deals) cannot be withdrawn until
            the buyer confirms the credential chain.
          </div>
        </div>
      </Modal>
    </div>
  )
}

function MyListings({ listings }) {
  return (
    <div className="overflow-hidden rounded-xl3 glass edge">
      <table className="w-full text-left text-[12.5px]">
        <thead className="bg-white/[0.03] text-[10.5px] uppercase tracking-[0.12em] text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Listing</th>
            <th className="hidden px-4 py-3 font-medium md:table-cell">Metrics</th>
            <th className="px-4 py-3 font-medium">Ask</th>
            <th className="hidden px-4 py-3 font-medium lg:table-cell">Status</th>
            <th className="px-4 py-3 font-medium">Views</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-white/6">
          {listings.map((l, i) => (
            <motion.tr
              key={l.id}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className="group transition hover:bg-white/[0.03]"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <img src={l.proof[0].src} alt="" className="h-10 w-14 rounded-lg object-cover" loading="lazy" />
                  <div className="min-w-0">
                    <div className="max-w-xs truncate text-[12.5px] font-medium text-slate-200">{l.title}</div>
                    <div className="tnum text-[11px] text-slate-500">{l.id} · {l.platformLabel}</div>
                  </div>
                </div>
              </td>
              <td className="tnum hidden px-4 py-3 text-slate-400 md:table-cell">
                {compact(l.scale)} {l.unit}
              </td>
              <td className="tnum px-4 py-3 font-semibold text-slate-100">{usd(l.price)}</td>
              <td className="hidden px-4 py-3 lg:table-cell">
                {l.status === 'active' ? <Badge tone="verify" dot>active</Badge> : <Badge tone="warn">verifying</Badge>}
              </td>
              <td className="tnum px-4 py-3 text-slate-400">{l.views24h}</td>
              <td className="px-4 py-3 text-right">
                <Link to={`/logs/${l.id}`} className="inline-flex items-center gap-1 text-[12px] text-aqua-300 opacity-0 transition group-hover:opacity-100">
                  Open <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Orders({ orders }) {
  const tone = { escrow: 'warn', released: 'verify', warranty: 'aqua' }
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {orders.map((o, i) => (
        <motion.div key={o.id} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05, duration: 0.5, ease }}>
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <img src={o.listing.proof[0].src} alt="" className="h-14 w-20 shrink-0 rounded-xl object-cover" loading="lazy" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="tnum font-mono text-[11px] text-slate-500">{o.id}</span>
                  <Badge tone={tone[o.status]} dot>{o.status}</Badge>
                </div>
                <div className="mt-1.5 line-clamp-1 text-[13px] font-medium text-slate-200">{o.listing.title}</div>
                <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-500">
                  <span className="tnum font-semibold text-aqua-300">{usd(o.amount)}</span>
                  <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(o.placed)}</span>
                  {o.status !== 'released' && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> release {formatDate(o.release)}</span>}
                </div>
              </div>
            </div>
            <div className="mt-3.5">
              <Progress value={o.status === 'released' ? 100 : o.status === 'warranty' ? 82 : 46} tone={o.status === 'released' ? 'verify' : 'volt'} />
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                <span>{o.status === 'escrow' ? 'Waiting on buyer confirmation' : o.status === 'warranty' ? 'Warranty window open' : 'Funds released'}</span>
                <Link to={`/logs/${o.listing.id}`} className="text-aqua-300 hover:text-aqua-200">View listing</Link>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}

function Payouts({ payouts, onWithdraw }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="overflow-hidden rounded-xl3 glass edge">
        <table className="w-full text-left text-[12.5px]">
          <thead className="bg-white/[0.03] text-[10.5px] uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Reference</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Method</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">Requested</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/6">
            {payouts.map((p) => (
              <tr key={p.id} className="transition hover:bg-white/[0.03]">
                <td className="px-4 py-3 font-mono text-[11.5px] text-slate-300">{p.id}</td>
                <td className="tnum px-4 py-3 font-semibold text-slate-100">{usd(p.amount)}</td>
                <td className="hidden px-4 py-3 text-slate-400 sm:table-cell">{p.method}</td>
                <td className="px-4 py-3">
                  {p.status === 'paid' ? <Badge tone="verify" dot>paid</Badge> : <Badge tone="warn" dot>pending</Badge>}
                </td>
                <td className="hidden px-4 py-3 text-slate-500 md:table-cell">{formatDate(p.at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Card className="p-5" hover={false}>
        <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-200">
          <Zap className="h-4 w-4 text-volt-300" /> Payout speed
        </div>
        <div className="mt-4 space-y-3">
          {[
            ['Bank transfer', 92],
            ['Paystack', 68],
            ['USDT (TRC-20)', 99],
          ].map(([label, pct]) => (
            <div key={label}>
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-slate-400">{label}</span>
                <span className="tnum text-slate-300">{pct}% within 24h</span>
              </div>
              <Progress value={pct} className="mt-1.5" tone="verify" />
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-xl2 border border-verify-500/22 bg-verify-500/[0.06] p-4">
          <div className="flex items-center gap-2 text-[12.5px] font-medium text-verify-400">
            <ShieldCheck className="h-3.5 w-3.5" /> Escrow-protected payouts
          </div>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-400">
            Payouts only enter your balance once the buyer confirms the credential chain — never before.
          </p>
        </div>
      </Card>
    </div>
  )
}

function Watchlist({ listings, onRemove }) {
  if (!listings.length) {
    return (
      <Card className="p-12 text-center" hover={false}>
        <Heart className="mx-auto h-9 w-9 text-slate-600" />
        <h3 className="mt-4 text-[17px]">Nothing on the watchlist yet</h3>
        <p className="mx-auto mt-2 max-w-md text-[13px] text-slate-400">
          Tap the heart on any listing to track it here. Watched logs surface in your daily digest mail.
        </p>
        <Link to="/marketplace">
          <Button className="mt-6" variant="ghost">
            <Layers className="h-4 w-4" /> Browse the floor
          </Button>
        </Link>
      </Card>
    )
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {listings.map((l) => (
        <Card key={l.id} className="p-4">
          <img src={l.proof[0].src} alt="" className="h-32 w-full rounded-xl2 object-cover" loading="lazy" />
          <div className="mt-3 line-clamp-2 text-[13px] font-medium text-slate-200">{l.title}</div>
          <div className="mt-2 flex items-center justify-between">
            <span className="tnum text-[15px] font-semibold text-aqua-300">{usd(l.price)}</span>
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
              <PlatformGlyph platform={l.platform} className="h-3 w-3" /> {l.platformLabel}
            </span>
          </div>
          <div className="mt-3 flex gap-2">
            <Link to={`/logs/${l.id}`} className="flex-1">
              <Button size="sm" className="w-full">
                Open <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Button size="sm" variant="ghost" onClick={() => onRemove(l.id)}>Remove</Button>
          </div>
        </Card>
      ))}
    </div>
  )
}
