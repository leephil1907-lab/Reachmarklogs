import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { ArrowRight, BadgeCheck, Building2, Check, CreditCard, HelpCircle, Minus, Rocket, Shield, Sparkles, Store, Zap } from 'lucide-react'
import { Badge, Button, Card, Counter, Reveal, SectionHead, Tabs, ease } from '../components/ui'
import { cn, usd } from '../lib/format'
import { setPlan } from '../app/features/authSlice'

const PLANS = [
  {
    id: 'free',
    name: 'Starter',
    icon: Store,
    price: 0,
    tagline: 'For a first sale or two',
    fee: '7.5%',
    features: [
      ['Listings', 'Up to 3 active'],
      ['Proof artefacts', '5 per listing'],
      ['Escrow protection', true],
      ['Ownership test recording', true],
      ['Proof Studio reels', '1 per month'],
      ['Credential chain audit', true],
      ['Priority verification', false],
      ['Dedicated account desk', false],
    ],
    cta: 'Start free',
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: Zap,
    price: 29,
    tagline: 'For full-time sellers and small agencies',
    fee: '5.5%',
    highlight: true,
    features: [
      ['Listings', 'Unlimited'],
      ['Proof artefacts', 'Unlimited'],
      ['Escrow protection', true],
      ['Ownership test recording', true],
      ['Proof Studio reels', '20 per month'],
      ['Credential chain audit', true],
      ['Priority verification', '4 working hours'],
      ['Dedicated account desk', false],
    ],
    cta: 'Upgrade to Pro',
  },
  {
    id: 'desk',
    name: 'Desk',
    icon: Building2,
    price: 149,
    tagline: 'For media buyers and acquisition teams',
    fee: '4.0%',
    features: [
      ['Listings', 'Unlimited + bulk import'],
      ['Proof artefacts', 'Unlimited + API'],
      ['Escrow protection', true],
      ['Ownership test recording', 'Bulk scheduling'],
      ['Proof Studio reels', 'Unlimited'],
      ['Credential chain audit', 'Shared workspace'],
      ['Priority verification', '1 working hour'],
      ['Dedicated account desk', true],
    ],
    cta: 'Talk to the desk',
  },
]

const FAQ = [
  {
    q: 'How does Reachmark make money?',
    a: 'A percentage of each cleared sale (7.5% on Starter, 5.5% on Pro, 4.0% on Desk) plus optional extras like featured placement and Platform Assured underwriting. No listing fees, no subscription to browse.',
  },
  {
    q: 'What is Platform Assured?',
    a: 'For a 1.5% premium Reachmark underwrites the transfer: if the platform reclaims the log inside the warranty window, we refund the buyer in full and pursue the seller through the dispute desk.',
  },
  {
    q: 'When do sellers get paid?',
    a: 'The moment the buyer confirms the credential chain. Escrow auto-releases when the window expires with no dispute. Payouts settle within 24 hours by bank transfer, Paystack or USDT.',
  },
  {
    q: 'Can I sell on a free plan forever?',
    a: 'Yes — three active listings, five proof artefacts and 7.5% fee. Most sellers move to Pro once they are clearing more than one log a month.',
  },
  {
    q: 'Is buying logs legal?',
    a: 'Transferring an account usually violates the platform’s terms of service even where it is not illegal. Reachmark is explicit about this: we verify ownership and protect the handover, but you must do your own platform-policy assessment. Full detail is in the trust centre.',
  },
]

export default function Pricing() {
  const dispatch = useDispatch()
  const user = useSelector((s) => s.auth.user)
  const [annual, setAnnual] = useState(false)
  const [open, setOpen] = useState(0)

  const factor = annual ? 0.8 : 1

  return (
    <div className="pt-24 sm:pt-28">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <SectionHead
          align="center"
          kicker="Plans & fees"
          title="Pricing that only bites when a deal clears"
          sub="Browsing, escrow protection and the ownership test are free forever. You pay a percentage of settled volume — never a listing fee."
        />

        <Reveal delay={0.12}>
          <div className="mt-8 flex items-center justify-center gap-3">
            <span className={cn('text-[12.5px]', !annual ? 'text-slate-200' : 'text-slate-500')}>Monthly</span>
            <button
              onClick={() => setAnnual((v) => !v)}
              className={cn('relative h-6 w-11 rounded-full transition-colors duration-300', annual ? 'bg-[linear-gradient(100deg,#7c5cff,#22d3ee)]' : 'bg-white/12')}
            >
              <motion.span layout className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow" style={{ left: annual ? 22 : 2 }} />
            </button>
            <span className={cn('text-[12.5px]', annual ? 'text-slate-200' : 'text-slate-500')}>Annual</span>
            <Badge tone="verify">save 20%</Badge>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {PLANS.map((p, i) => {
            const price = Math.round(p.price * factor)
            const current = user.plan === p.id
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.09, duration: 0.6, ease }}
                className={cn('relative', p.highlight && 'lg:-mt-4 lg:mb-4')}
              >
                {p.highlight && (
                  <div className="absolute -top-3.5 left-1/2 z-10 -translate-x-1/2">
                    <Badge tone="volt" className="border-volt-500/50 bg-ink-900 px-3 py-1">
                      <Sparkles className="h-3 w-3" /> most popular
                    </Badge>
                  </div>
                )}
                <Card className={cn('flex h-full flex-col p-6', p.highlight && 'edge-on glow-volt')} hover={!p.highlight}>
                  <div className="flex items-center gap-3">
                    <span className={cn('grid h-11 w-11 place-items-center rounded-xl2 border', p.highlight ? 'border-volt-500/40 bg-volt-500/15 text-volt-300' : 'border-white/10 bg-white/[0.03] text-slate-300')}>
                      <p.icon className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-[15px] font-semibold text-slate-100">{p.name}</div>
                      <div className="text-[11.5px] text-slate-500">{p.tagline}</div>
                    </div>
                  </div>

                  <div className="mt-6 flex items-end gap-2">
                    <span className="tnum text-[2.6rem] font-semibold leading-none text-slate-100">
                      {price === 0 ? 'Free' : `$${price}`}
                    </span>
                    {price > 0 && <span className="pb-1 text-[12.5px] text-slate-500">/ month{annual ? ', billed yearly' : ''}</span>}
                  </div>

                  <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.02] px-3.5 py-2.5">
                    <CreditCard className="h-3.5 w-3.5 text-aqua-300" />
                    <span className="text-[12.5px] text-slate-300">
                      <span className="font-semibold text-slate-100">{p.fee}</span> per cleared sale
                    </span>
                  </div>

                  <ul className="mt-6 flex-1 space-y-3">
                    {p.features.map(([label, value]) => (
                      <li key={label} className="flex items-start gap-2.5 text-[12.5px]">
                        {value === false ? (
                          <Minus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600" />
                        ) : (
                          <Check className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', p.highlight ? 'text-volt-300' : 'text-verify-400')} />
                        )}
                        <span className={value === false ? 'text-slate-500' : 'text-slate-300'}>
                          {label}
                          {value !== true && value !== false && <span className="text-slate-500"> · {value}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="mt-7 w-full"
                    variant={p.highlight ? 'primary' : current ? 'ghost' : 'outline'}
                    onClick={() => {
                      if (current) return toast('You are already on this plan')
                      dispatch(setPlan(p.id))
                      toast.success(`Switched to ${p.name} — demo billing, no card charged`)
                    }}
                  >
                    {current ? 'Current plan' : p.cta}
                    {!current && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </Card>
              </motion.div>
            )
          })}
        </div>

        {/* value strip */}
        <Reveal delay={0.1}>
          <Card className="mt-10 p-7" hover={false}>
            <div className="grid gap-8 lg:grid-cols-3">
              {[
                { label: 'Average listing clears for', value: 2480, prefix: '$', icon: Store },
                { label: 'Median time to first offer', value: 6.4, suffix: 'h', decimals: 1, icon: Zap },
                { label: 'Escrow disputes resolved in our favour', value: 99.2, suffix: '%', decimals: 1, icon: Shield },
              ].map((k) => (
                <div key={k.label} className="flex items-center gap-4">
                  <span className="grid h-12 w-12 place-items-center rounded-xl2 border border-volt-500/25 bg-volt-500/12 text-volt-300">
                    <k.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-[24px] font-semibold text-slate-100">
                      <Counter to={k.value} prefix={k.prefix} suffix={k.suffix} decimals={k.decimals ?? 0} />
                    </div>
                    <div className="text-[11.5px] text-slate-500">{k.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Reveal>

        {/* fee calculator */}
        <FeeCalculator />

        {/* faq */}
        <section className="mt-20">
          <SectionHead kicker="Questions" title="Everything sellers ask before switching" />
          <div className="mt-8 space-y-3">
            {FAQ.map((f, i) => (
              <Reveal key={f.q} delay={i * 0.05}>
                <Card className={cn('overflow-hidden', 'p-0')} hover={false}>
                  <button onClick={() => setOpen(open === i ? -1 : i)} className="flex w-full items-center gap-4 p-5 text-left">
                    <HelpCircle className="h-4 w-4 shrink-0 text-volt-300" />
                    <span className="flex-1 text-[14px] font-medium text-slate-100">{f.q}</span>
                    <motion.span animate={{ rotate: open === i ? 45 : 0 }} className="text-slate-500">
                      <Plus />
                    </motion.span>
                  </button>
                  <motion.div
                    initial={false}
                    animate={{ height: open === i ? 'auto' : 0, opacity: open === i ? 1 : 0 }}
                    transition={{ duration: 0.35, ease }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-5 pl-13 text-[12.5px] leading-relaxed text-slate-400">{f.a}</p>
                  </motion.div>
                </Card>
              </Reveal>
            ))}
          </div>
        </section>

        <Reveal delay={0.1}>
          <div className="mt-16 flex flex-wrap items-center justify-between gap-6 rounded-[1.8rem] border border-volt-500/25 bg-[linear-gradient(120deg,rgba(124,92,255,.2),rgba(34,211,238,.1))] p-8">
            <div>
              <h3 className="text-[20px]">Not sure which plan fits your book?</h3>
              <p className="mt-2 max-w-lg text-[13px] text-slate-300/90">
                Tell the desk what you move and we will model the fees against your last quarter.
              </p>
            </div>
            <div className="flex gap-3">
              <Link to="/academy">
                <Button variant="ghost">
                  <Rocket className="h-4 w-4" /> Seller academy
                </Button>
              </Link>
              <Button onClick={() => toast.success('Desk pinged — expect a reply within 2 hours')}>
                <BadgeCheck className="h-4 w-4" /> Talk to the desk
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  )
}

function Plus() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.6" strokeLinecap="round">
      <path d="M10 5v10M5 10h10" />
    </svg>
  )
}

function FeeCalculator() {
  const [plan, setPlan] = useState('pro')
  const [volume, setVolume] = useState(12000)
  const fees = { free: 0.075, pro: 0.055, desk: 0.04 }
  const monthly = { free: 0, pro: 29, desk: 149 }
  const gmv = volume * 12
  const fee = gmv * fees[plan]
  const sub = monthly[plan] * 12
  const net = gmv - fee - sub

  return (
    <Reveal delay={0.12}>
      <Card className="mt-10 p-7" hover={false}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-[17px] font-semibold text-slate-100">Fee calculator</h3>
            <p className="mt-1 text-[12.5px] text-slate-500">Annualised against your monthly cleared volume</p>
          </div>
          <Tabs
            size="sm"
            tabs={PLANS.map((p) => ({ id: p.id, label: p.name }))}
            value={plan}
            onChange={setPlan}
          />
        </div>

        <div className="mt-7">
          <div className="flex items-center justify-between text-[12.5px]">
            <span className="text-slate-400">Monthly cleared volume</span>
            <span className="tnum font-semibold text-aqua-300">{usd(volume)}</span>
          </div>
          <input
            type="range"
            min={500}
            max={80000}
            step={500}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="mt-3 w-full accent-volt-500"
          />
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-4">
          {[
            ['Annual GMV', usd(gmv), 'neutral'],
            [`Reachmark fee (${(fees[plan] * 100).toFixed(1)}%)`, `− ${usd(fee)}`, 'danger'],
            ['Subscription', `− ${usd(sub)}`, 'danger'],
            ['You keep', usd(net), 'verify'],
          ].map(([label, value, tone]) => (
            <div key={label} className="rounded-xl2 border border-white/8 bg-white/[0.02] p-4">
              <div className="text-[10.5px] uppercase tracking-[0.14em] text-slate-500">{label}</div>
              <div
                className={cn(
                  'tnum mt-2 text-[19px] font-semibold',
                  tone === 'verify' ? 'text-verify-400' : tone === 'danger' ? 'text-danger-400' : 'text-slate-100',
                )}
              >
                {value}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </Reveal>
  )
}
