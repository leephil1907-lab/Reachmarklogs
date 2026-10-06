import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import {
  ArrowLeft, ArrowRight, BadgeCheck, BarChart3, Check, CheckCircle2, CircleDollarSign,
  Image as ImageIcon, KeyRound, Layers, Percent, Rocket, ShieldCheck, Sparkles, Tag,
  Target, TrendingUp, Upload, Users, Wand2, X, Zap,
} from 'lucide-react'
import { Badge, Button, Card, Field, Input, Progress, Select, Textarea, Toggle, ease } from '../components/ui'
import { CATEGORIES, NICHES, PLATFORMS, REGIONS, avatarArt, proofArt } from '../data/catalog'
import { PlatformGlyph } from '../components/marketplace/ListingCard'
import { cn, compact, usd } from '../lib/format'
import { addListing } from '../app/features/catalogSlice'
import { DraftAssistant } from '../components/copilot'
// The shared engine package — the browser runs the exact model the API runs.
import { estimateFairValue } from '@reachmark/copilot'

const STEPS = [
  { id: 'platform', label: 'Platform', icon: Layers, blurb: 'What are you selling?' },
  { id: 'identity', label: 'Identity', icon: Tag, blurb: 'Handle, niche and region' },
  { id: 'metrics', label: 'Metrics', icon: BarChart3, blurb: 'Reach, engagement, age' },
  { id: 'proof', label: 'Proof', icon: ImageIcon, blurb: 'Show the receipts' },
  { id: 'pricing', label: 'Pricing', icon: CircleDollarSign, blurb: 'Set your ask' },
  { id: 'review', label: 'Review', icon: CheckCircle2, blurb: 'Publish to the floor' },
]

export default function Sell() {
  const dispatch = useDispatch()
  const nav = useNavigate()
  const user = useSelector((s) => s.auth.user)
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    platform: 'instagram',
    category: 'social',
    handle: '',
    niche: 'lifestyle',
    region: 'United States',
    language: 'English',
    title: '',
    scale: 25000,
    engagement: 4.2,
    monthlyViews: 180000,
    age: 3,
    verified: true,
    monetized: false,
    assured: true,
    handover: 'Email + password + 2FA seed',
    escrowDays: 7,
    proofCount: 3,
    price: 2400,
    description: '',
    acceptOffers: true,
    featured: false,
  })

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const platform = PLATFORMS.find((p) => p.id === form.platform)

  /**
   * Suggested price comes from @reachmark/copilot — the same engine the API runs
   * and the same one the copilot panel quotes. It used to be a second copy of the
   * formula living in this file, which is exactly how a seller ends up seeing two
   * different "fair values" for one listing.
   */
  const suggested = useMemo(() => estimateFairValue(form).value, [form])

  const readiness = useMemo(() => {
    const checks = [
      Boolean(form.title.trim().length > 8),
      Boolean(form.handle.trim().length > 2),
      form.scale > 0,
      form.proofCount >= 2,
      Boolean(form.description.trim().length > 40),
      form.price > 0,
    ]
    return Math.round((checks.filter(Boolean).length / checks.length) * 100)
  }, [form])

  const canNext = () => {
    if (step === 0) return Boolean(form.platform)
    if (step === 1) return form.title.trim().length > 8 && form.handle.trim().length > 1
    if (step === 2) return form.scale > 0
    if (step === 3) return form.proofCount >= 2
    if (step === 4) return form.price > 0
    return readiness >= 66
  }

  const go = (delta) => {
    if (delta > 0 && !canNext()) {
      toast.error('Finish the highlighted fields before moving on')
      return
    }
    setDir(delta)
    setStep((s) => Math.max(0, Math.min(STEPS.length - 1, s + delta)))
  }

  const publish = () => {
    setSubmitting(true)
    setTimeout(() => {
      const id = `RM-${Math.floor(9000 + Math.random() * 900)}`
      dispatch(
        addListing({
          id,
          slug: `${form.platform}-${form.niche}-new`,
          title: form.title,
          platform: form.platform,
          platformLabel: platform.label,
          category: form.category,
          niche: form.niche,
          handle: form.handle.startsWith('@') ? form.handle : `@${form.handle}`,
          scale: Number(form.scale),
          unit: platform.metric,
          engagement: Number(form.engagement),
          monthlyViews: Number(form.monthlyViews),
          price: Number(form.price),
          currency: 'USD',
          age: Number(form.age),
          verified: form.verified,
          monetized: form.monetized,
          featured: form.featured,
          trending: false,
          status: 'pending',
          country: form.region,
          language: form.language,
          audienceSplit: 62,
          deliveryHours: 24,
          views24h: 4,
          watchers: 1,
          offers: 0,
          description:
            form.description ||
            'Freshly listed on Reachmark. Proof vault attached and credential chain submitted for ops review.',
          proof: [
            { kind: 'analytics', label: 'Analytics dashboard', src: proofArt(`${id}-a`, 0, platform.accent, 'analytics') },
            { kind: 'audience', label: 'Audience geography', src: proofArt(`${id}-b`, 1, platform.accent, 'audience') },
            { kind: 'analytics', label: 'Monetisation status', src: proofArt(`${id}-c`, 2, platform.accent, 'analytics') },
          ],
          seller: {
            id: 'sl_me',
            name: user.name,
            slug: 'you',
            rating: 5,
            reviews: 0,
            transfers: 0,
            joined: user.joined,
            verified: user.kyc === 'verified',
            responseMins: 6,
            avatar: avatarArt(user.name, user.name[0]),
            country: user.country,
          },
          credentialChain: {
            submitted: true,
            verified: false,
            changed: false,
            handover: form.handover,
            escrowDays: Number(form.escrowDays),
          },
          priceHistory: Array.from({ length: 12 }, () => Number(form.price)),
          growth: Array.from({ length: 14 }, (_, i) => Math.round(Number(form.scale) * (0.86 + i * 0.01))),
          createdAt: new Date().toISOString().slice(0, 10),
          assured: form.assured,
        }),
      )
      setSubmitting(false)
      toast.success(`${id} published — ops will verify within 4 working hours`)
      nav(`/logs/${id}`)
    }, 1500)
  }

  return (
    <div className="pt-24 sm:pt-28">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-volt-500/25 bg-volt-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-volt-300">
              <Sparkles className="h-3 w-3" /> Listing wizard
            </div>
            <h1 className="text-[2.1rem] leading-tight sm:text-[2.6rem]">
              List a log in <span className="gradient-text">six guided steps</span>
            </h1>
            <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-slate-400">
              The wizard mirrors ui-builder’s step engine: live validation, a persistent summary card and a
              publish gate that only opens once the proof vault and pricing look sane.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge tone={readiness >= 80 ? 'verify' : readiness >= 50 ? 'warn' : 'danger'} dot>
              {readiness}% complete
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => nav('/dashboard')}>
              Save draft
            </Button>
          </div>
        </div>

        {/* stepper */}
        <div className="mt-10">
          <div className="scrollbar-none flex items-center gap-2 overflow-x-auto pb-1">
            {STEPS.map((s, i) => {
              const done = i < step
              const active = i === step
              return (
                <button
                  key={s.id}
                  onClick={() => i <= step && setStep(i)}
                  className={cn(
                    'group relative flex shrink-0 items-center gap-3 rounded-xl2 border px-3.5 py-2.5 text-left transition duration-300',
                    active
                      ? 'border-volt-500/45 bg-volt-500/12'
                      : done
                        ? 'border-verify-500/25 bg-verify-500/[0.06]'
                        : 'border-white/8 bg-white/[0.02]',
                  )}
                >
                  <span
                    className={cn(
                      'grid h-8 w-8 shrink-0 place-items-center rounded-lg border',
                      active ? 'border-volt-500/45 text-volt-300' : done ? 'border-verify-500/35 text-verify-400' : 'border-white/10 text-slate-500',
                    )}
                  >
                    {done ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
                  </span>
                  <span className="hidden sm:block">
                    <span className={cn('block text-[12.5px] font-semibold', active ? 'text-white' : done ? 'text-verify-400' : 'text-slate-400')}>
                      {s.label}
                    </span>
                    <span className="block text-[10.5px] text-slate-500">{s.blurb}</span>
                  </span>
                  {active && (
                    <motion.span layoutId="step-glow" className="absolute inset-0 rounded-xl2 ring-1 ring-volt-500/40" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
                  )}
                </button>
              )
            })}
          </div>
          <Progress value={((step + 1) / STEPS.length) * 100} className="mt-4" />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.55fr_1fr]">
          {/* ------------------------------------------------------------ form */}
          <div className="overflow-hidden rounded-xl3 glass edge noise p-6">
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={STEPS[step].id}
                initial={{ opacity: 0, x: dir * 44, filter: 'blur(10px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: dir * -44, filter: 'blur(10px)' }}
                transition={{ duration: 0.45, ease }}
              >
                {step === 0 && <StepPlatform form={form} set={set} />}
                {step === 1 && <StepIdentity form={form} set={set} />}
                {step === 2 && <StepMetrics form={form} set={set} platform={platform} />}
                {step === 3 && <StepProof form={form} set={set} platform={platform} />}
                {step === 4 && <StepPricing form={form} set={set} suggested={suggested} />}
                {step === 5 && <StepReview form={form} set={set} suggested={suggested} readiness={readiness} />}
              </motion.div>
            </AnimatePresence>

            <div className="mt-8 flex items-center justify-between gap-3 border-t border-white/8 pt-5">
              <Button variant="ghost" onClick={() => go(-1)} disabled={step === 0}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <div className="flex items-center gap-2">
                <span className="hidden text-[11.5px] text-slate-500 sm:inline">
                  Step {step + 1} of {STEPS.length}
                </span>
                {step < STEPS.length - 1 ? (
                  <Button onClick={() => go(1)} disabled={!canNext()}>
                    Continue <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={publish} loading={submitting}>
                    <Rocket className="h-4 w-4" /> Publish listing
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* --------------------------------------------------------- summary */}
          <div>
            <div className="sticky top-24 space-y-4">
              <Card className="p-5" hover={false}>
                <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-200">
                  <Target className="h-4 w-4 text-volt-300" /> Live preview
                </div>
                <div className="mt-4 overflow-hidden rounded-xl2 border border-white/8">
                  <div className="relative h-32">
                    <img src={proofArt('preview', 0, platform.accent, 'analytics')} alt="" className="h-full w-full object-cover" />
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-ink-950/75 px-2 py-0.5 text-[10.5px] backdrop-blur">
                      <PlatformGlyph platform={form.platform} className="h-3 w-3" /> {platform.label}
                    </span>
                  </div>
                  <div className="bg-white/[0.02] p-3.5">
                    <div className="line-clamp-2 text-[13px] font-medium text-slate-100">
                      {form.title || 'Your listing title appears here'}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="tnum text-[15px] font-semibold text-aqua-300">{usd(form.price)}</span>
                      <span className="tnum text-[11.5px] text-slate-500">
                        {compact(form.scale)} {platform.metric}
                      </span>
                    </div>
                  </div>
                </div>

                <dl className="mt-4 space-y-2 text-[12px]">
                  {[
                    ['Asset class', CATEGORIES.find((c) => c.id === form.category)?.label],
                    ['Niche', form.niche],
                    ['Region', form.region],
                    ['Account age', `${form.age} years`],
                    ['Proof artefacts', form.proofCount],
                    ['Escrow window', `${form.escrowDays} days`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between gap-3">
                      <dt className="text-slate-500">{k}</dt>
                      <dd className="text-right font-medium capitalize text-slate-200">{v}</dd>
                    </div>
                  ))}
                </dl>
              </Card>

              <DraftAssistant
                form={form}
                onApply={(patch) => set(patch)}
              />

              <Card className="p-5" hover={false}>
                <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-200">
                  <Percent className="h-4 w-4 text-aqua-300" /> Fee preview
                </div>
                <div className="mt-4 space-y-2 text-[12.5px]">
                  {[
                    ['Buyer pays', usd(form.price)],
                    ['Reachmark fee (7.5%)', `− ${usd(form.price * 0.075)}`],
                    ['Payment processing', `− ${usd(Math.max(0.9, form.price * 0.029))}`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between">
                      <span className="text-slate-500">{k}</span>
                      <span className="tnum text-slate-300">{v}</span>
                    </div>
                  ))}
                  <div className="mt-2 flex items-center justify-between border-t border-white/8 pt-2.5">
                    <span className="font-medium text-slate-300">You receive</span>
                    <span className="tnum text-[16px] font-semibold text-verify-400">
                      {usd(form.price * (1 - 0.075) - Math.max(0.9, form.price * 0.029))}
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                  Pro sellers pay 5.5%. Payout lands within 24h of escrow release.
                </p>
              </Card>

              <Card className="p-5" hover={false}>
                <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-200">
                  <ShieldCheck className="h-4 w-4 text-verify-400" /> Before you publish
                </div>
                <ul className="mt-3 space-y-2 text-[12px] text-slate-400">
                  {[
                    ['Title is descriptive (8+ chars)', form.title.trim().length > 8],
                    ['Handle captured', form.handle.trim().length > 1],
                    ['At least 2 proof artefacts', form.proofCount >= 2],
                    ['Description written (40+ chars)', form.description.trim().length > 40],
                  ].map(([label, ok]) => (
                    <li key={label} className="flex items-center gap-2">
                      <span className={cn('grid h-4 w-4 place-items-center rounded-full text-[9px]', ok ? 'bg-verify-500/20 text-verify-400' : 'bg-warn-400/16 text-warn-400')}>
                        {ok ? '✓' : '!'}
                      </span>
                      {label}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------- steps */
function StepPlatform({ form, set }) {
  return (
    <div>
      <StepHead title="What are you selling?" sub="Pick the platform first — the wizard adapts its metrics, units and pricing model to the asset class." />
      <div className="space-y-6">
        <div>
          <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Asset class</div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  const first = PLATFORMS.find((p) => p.category === c.id)
                  set({ category: c.id, platform: first.id })
                }}
                className={cn(
                  'rounded-xl2 border p-4 text-left transition duration-300',
                  form.category === c.id ? 'border-volt-500/50 bg-volt-500/12 shadow-[0_14px_40px_-20px_rgba(124,92,255,.9)]' : 'border-white/8 bg-white/[0.02] hover:border-white/16',
                )}
              >
                <div className="text-[13.5px] font-semibold text-slate-100">{c.label}</div>
                <div className="mt-1 text-[11.5px] leading-relaxed text-slate-400">{c.blurb}</div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Platform</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PLATFORMS.filter((p) => p.category === form.category).map((p) => (
              <button
                key={p.id}
                onClick={() => set({ platform: p.id })}
                className={cn(
                  'flex items-center gap-2.5 rounded-xl border px-3 py-3 text-left transition',
                  form.platform === p.id ? 'border-aqua-500/45 bg-aqua-500/12 text-white' : 'border-white/8 bg-white/[0.02] text-slate-300 hover:border-white/16',
                )}
              >
                <PlatformGlyph platform={p.id} className="h-4 w-4 shrink-0" />
                <span className="truncate text-[12.5px]">{p.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function StepIdentity({ form, set }) {
  return (
    <div>
      <StepHead title="Identity & audience" sub="Buyers search on handle, niche and geography — these fields feed the marketplace index." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Listing title" hint={`${form.title.length}/80`} required className="sm:col-span-2">
          <Input
            value={form.title}
            maxLength={80}
            onChange={(e) => set({ title: e.target.value })}
            placeholder="e.g. Monetised lifestyle page, 42K followers, US-heavy audience"
          />
        </Field>
        <Field label="Handle" required>
          <Input value={form.handle} onChange={(e) => set({ handle: e.target.value })} placeholder="@yourhandle" />
        </Field>
        <Field label="Primary niche">
          <Select value={form.niche} onChange={(e) => set({ niche: e.target.value })}>
            {NICHES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </Select>
        </Field>
        <Field label="Audience top region">
          <Select value={form.region} onChange={(e) => set({ region: e.target.value })}>
            {REGIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </Select>
        </Field>
        <Field label="Content language">
          <Select value={form.language} onChange={(e) => set({ language: e.target.value })}>
            {['English', 'Spanish', 'Portuguese', 'German', 'French', 'Arabic'].map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </Select>
        </Field>
        <Field label="Description" hint={`${form.description.length}/480`} className="sm:col-span-2">
          <Textarea
            value={form.description}
            maxLength={480}
            onChange={(e) => set({ description: e.target.value })}
            placeholder="Tell buyers how the log was built, what is included in the handover and anything that affects price."
          />
        </Field>
      </div>
    </div>
  )
}

function StepMetrics({ form, set, platform }) {
  return (
    <div>
      <StepHead title="Metrics that buyers verify" sub="These numbers are cross-checked against your proof uploads during ops review. Inflated figures are the fastest route to a rejected listing." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={`Reach (${platform.metric})`} required hint={compact(form.scale)}>
          <Input type="number" value={form.scale} onChange={(e) => set({ scale: Number(e.target.value) })} />
        </Field>
        <Field label="Engagement rate (%)">
          <Input type="number" step="0.1" value={form.engagement} onChange={(e) => set({ engagement: Number(e.target.value) })} />
        </Field>
        <Field label="Monthly views / impressions">
          <Input type="number" value={form.monthlyViews} onChange={(e) => set({ monthlyViews: Number(e.target.value) })} />
        </Field>
        <Field label="Account age (years)">
          <Input type="number" value={form.age} onChange={(e) => set({ age: Number(e.target.value) })} />
        </Field>
        <Field label="Handover format" className="sm:col-span-2">
          <Select value={form.handover} onChange={(e) => set({ handover: e.target.value })}>
            {['Email + password + 2FA seed', 'Email + password + recovery codes', 'Email + password only', 'Full mailbox handover'].map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="mt-5 space-y-2">
        <Toggle checked={form.verified} onChange={(v) => set({ verified: v })} label="Ownership already verified" hint="Ops ran the ownership test on this log before" />
        <Toggle checked={form.monetized} onChange={(v) => set({ monetized: v })} label="Monetised" hint="Active ad revenue or creator fund" />
        <Toggle checked={form.assured} onChange={(v) => set({ assured: v })} label="Apply for Platform Assured" hint="Reachmark underwrites the transfer for a 1.5% premium" />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          ['Reach', compact(form.scale), Users, 'aqua'],
          ['Engagement', `${form.engagement}%`, TrendingUp, 'volt'],
          ['Age', `${form.age}y`, Zap, 'magenta'],
        ].map(([label, value, Icon, tone]) => (
          <div key={label} className="rounded-xl2 border border-white/8 bg-white/[0.025] p-4">
            <Icon className={cn('h-4 w-4', tone === 'aqua' ? 'text-aqua-300' : tone === 'volt' ? 'text-volt-300' : 'text-magenta-400')} />
            <div className="mt-2.5 text-[18px] font-semibold text-slate-100">{value}</div>
            <div className="text-[10.5px] uppercase tracking-[0.12em] text-slate-500">{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StepProof({ form, set, platform }) {
  const artefacts = Array.from({ length: form.proofCount }, (_, i) => ({
    label: ['Analytics dashboard', 'Audience geography', 'Monetisation status', 'Content library', 'Growth trend'][i % 5],
    src: proofArt(`upload-${i}-${form.platform}`, i, platform.accent, i % 2 ? 'audience' : 'analytics'),
  }))

  return (
    <div>
      <StepHead title="Proof vault" sub="Upload analytics screenshots, then record a 60-second ownership walkthrough. Reachmark hashes each artefact so replacement uploads get flagged." />
      <div className="rounded-xl3 border border-dashed border-white/14 bg-white/[0.02] p-8 text-center transition hover:border-volt-500/40">
        <Upload className="mx-auto h-8 w-8 text-slate-500" />
        <div className="mt-4 text-[14px] font-medium text-slate-200">Drop screenshots or a screen recording</div>
        <p className="mx-auto mt-2 max-w-md text-[12px] text-slate-500">
          PNG, JPG, MP4 up to 25MB each. Free plan caps at 5 artefacts; Pro is unlimited. Uploads are
          simulated in this build — artefacts below are generated locally.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {[2, 3, 5, 8].map((n) => (
            <button
              key={n}
              onClick={() => set({ proofCount: n })}
              className={cn(
                'rounded-xl border px-3 py-1.5 text-[12px] transition',
                form.proofCount === n ? 'border-volt-500/45 bg-volt-500/14 text-volt-300' : 'border-white/8 bg-white/[0.02] text-slate-400 hover:text-slate-200',
              )}
            >
              {n} artefacts
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {artefacts.map((a, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05, duration: 0.4, ease }}
            className="group relative overflow-hidden rounded-xl2 border border-white/8"
          >
            <img src={a.src} alt={a.label} className="h-32 w-full object-cover" />
            <div className="flex items-center justify-between bg-white/[0.02] px-3 py-2">
              <span className="text-[11px] text-slate-400">{a.label}</span>
              <BadgeCheck className="h-3.5 w-3.5 text-verify-400" />
            </div>
            <button
              onClick={() => set({ proofCount: Math.max(1, form.proofCount - 1) })}
              className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-lg border border-white/12 bg-ink-950/75 text-slate-300 opacity-0 transition group-hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ))}
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-xl2 border border-aqua-500/22 bg-aqua-500/[0.06] p-4">
        <Wand2 className="mt-0.5 h-4 w-4 shrink-0 text-aqua-300" />
        <div>
          <div className="text-[12.5px] font-medium text-aqua-200">Turn these into a proof reel</div>
          <p className="mt-1 text-[11.5px] leading-relaxed text-slate-400">
            The Proof Studio narrates your screenshots with captions — listings with a reel convert ~2.4×
            better. Generate one after publishing.
          </p>
        </div>
      </div>
    </div>
  )
}

function StepPricing({ form, set, suggested }) {
  const delta = ((form.price - suggested) / suggested) * 100
  return (
    <div>
      <StepHead title="Set your ask" sub="The model blends reach, engagement, age, verification and monetisation. You can always accept offers below ask." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Asking price (USD)" required>
          <Input type="number" value={form.price} onChange={(e) => set({ price: Number(e.target.value) })} />
        </Field>
        <Field label="Escrow window (days)">
          <Select value={form.escrowDays} onChange={(e) => set({ escrowDays: Number(e.target.value) })}>
            {[3, 5, 7, 10, 14].map((d) => (
              <option key={d} value={d}>{d} days</option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="mt-5 rounded-xl2 border border-volt-500/25 bg-volt-500/[0.07] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-volt-300">Reachmark fair-value model</div>
            <div className="tnum mt-1 text-[26px] font-semibold text-slate-100">{usd(suggested)}</div>
          </div>
          <div className="text-right">
            <Badge tone={Math.abs(delta) < 12 ? 'verify' : delta > 0 ? 'warn' : 'aqua'}>
              {delta >= 0 ? '+' : ''}{delta.toFixed(1)}% vs model
            </Badge>
            <div className="mt-2 text-[11.5px] text-slate-400">
              {Math.abs(delta) < 12 ? 'Priced in the clearing band' : delta > 0 ? 'Above model — expect slower clearing' : 'Below model — likely to sell fast'}
            </div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {[0.85, 0.92, 1, 1.1, 1.25].map((m) => (
            <button
              key={m}
              onClick={() => set({ price: Math.round(suggested * m) })}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[12px] text-slate-300 transition hover:border-volt-500/40 hover:text-white"
            >
              {usd(Math.round(suggested * m))}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <Toggle checked={form.acceptOffers} onChange={(v) => set({ acceptOffers: v })} label="Accept offers below ask" hint="Buyers can open a negotiation thread" />
        <Toggle checked={form.featured} onChange={(v) => set({ featured: v })} label="Feature this listing" hint="$29 for 7 days on the home floor" />
      </div>
    </div>
  )
}

function StepReview({ form, set, suggested, readiness }) {
  const rows = [
    ['Platform', `${PLATFORMS.find((p) => p.id === form.platform).label} · ${form.category}`],
    ['Title', form.title],
    ['Handle', form.handle],
    ['Reach', compact(form.scale)],
    ['Engagement', `${form.engagement}%`],
    ['Account age', `${form.age} years`],
    ['Region', form.region],
    ['Handover', form.handover],
    ['Proof artefacts', form.proofCount],
    ['Ask', usd(form.price)],
    ['Model value', usd(suggested)],
    ['Escrow window', `${form.escrowDays} days`],
  ]
  return (
    <div>
      <StepHead title="Review & publish" sub="Ops verifies the credential chain within 4 working hours. You can edit the listing at any time before the first escrow opens." />
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map(([k, v], i) => (
          <motion.div
            key={k}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03, duration: 0.4 }}
            className="flex items-start justify-between gap-4 rounded-xl border border-white/8 bg-white/[0.02] px-3.5 py-3"
          >
            <span className="text-[11.5px] uppercase tracking-[0.1em] text-slate-500">{k}</span>
            <span className="max-w-[58%] text-right text-[12.5px] font-medium capitalize text-slate-200">{v || '—'}</span>
          </motion.div>
        ))}
      </div>

      <div className="mt-5 space-y-2">
        <Toggle checked={form.assured} onChange={(v) => set({ assured: v })} label="Request Platform Assured underwriting" hint="Adds a visible trust badge and 1.5% premium" />
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-xl2 border border-verify-500/25 bg-verify-500/[0.06] p-4">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-verify-400" />
        <div>
          <div className="text-[12.5px] font-medium text-verify-400">Publishing agreement</div>
          <p className="mt-1 text-[11.5px] leading-relaxed text-slate-400">
            You confirm the log is yours to sell, that the metrics match the proof vault, and that you will
            complete the handover inside the escrow window. Readiness score {readiness}%.
          </p>
        </div>
      </div>
    </div>
  )
}

function StepHead({ title, sub }) {
  return (
    <div className="mb-6">
      <h2 className="text-[20px]">{title}</h2>
      <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-slate-400">{sub}</p>
    </div>
  )
}
