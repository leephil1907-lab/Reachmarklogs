/**
 * The copilot surface.
 *
 * Three components, all thin wrappers over `lib/api.js → copilot.*`, so that the
 * same panel works whether the request is answered by an LLM on the server or by
 * the deterministic engine in the tab. Every panel labels which engine answered
 * (`EngineBadge`) — a product that quietly pretends a template came from a model
 * is lying to its users, and one that hides the model entirely cannot be trusted
 * with a price.
 */
import { useCallback, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BrainCircuit, Check, Copy, Loader2, RefreshCw, ShieldAlert, Sparkles, Wand2, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { Badge, Button, Card, Progress, ease } from '../ui'
import { cn } from '../../lib/format'
import { copilot, isLive } from '../../lib/api'

const ENGINE_COPY = {
  local: { label: 'Deterministic engine', tone: 'neutral', hint: 'No model configured — computed from listing facts.' },
  openai: { label: 'OpenAI', tone: 'verify', hint: 'Copy written by the configured model.' },
  openrouter: { label: 'OpenRouter', tone: 'verify', hint: 'Copy written by the configured model.' },
  anthropic: { label: 'Anthropic', tone: 'verify', hint: 'Copy written by the configured model.' },
  server: { label: 'Server engine', tone: 'aqua', hint: 'Answered by the Reachmark API.' },
  browser: { label: 'Browser engine', tone: 'neutral', hint: 'Computed locally — no request left the tab.' },
}

export function EngineBadge({ engine = 'local', className }) {
  const copy = ENGINE_COPY[engine] ?? ENGINE_COPY.local
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)} title={copy.hint}>
      <Badge tone={copy.tone} dot pulse={engine !== 'local'}>
        <Zap className="h-3 w-3" />
        {copy.label}
      </Badge>
    </span>
  )
}

function CopilotShell({ title, sub, icon: Icon = Sparkles, children, actions, tone = 'volt' }) {
  return (
    <Card className="overflow-hidden p-0" hover={false}>
      <div className="flex items-start justify-between gap-3 border-b border-white/8 bg-gradient-to-r from-volt-500/10 via-transparent to-aqua-500/10 px-5 py-4">
        <div className="flex items-start gap-3">
          <span className={cn('mt-0.5 grid h-9 w-9 place-items-center rounded-xl border', tone === 'volt' ? 'border-volt-500/40 bg-volt-500/12 text-volt-200' : 'border-aqua-500/35 bg-aqua-500/10 text-aqua-200')}>
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <div className="text-[13.5px] font-semibold text-slate-100">{title}</div>
            {sub && <div className="mt-0.5 text-[11.5px] leading-relaxed text-slate-500">{sub}</div>}
          </div>
        </div>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </Card>
  )
}

const CopyButton = ({ text, label = 'Copy' }) => (
  <Button
    variant="ghost"
    size="sm"
    onClick={async () => {
      try {
        await navigator.clipboard.writeText(text)
        toast.success('Copied')
      } catch {
        toast.error('Clipboard blocked by the browser')
      }
    }}
    disabled={!text}
  >
    <Copy className="h-3.5 w-3.5" /> {label}
  </Button>
)

/* ------------------------------------------------------------------ draft -- */

/** Sell wizard: turn the half-filled form into a publishable listing. */
export function DraftAssistant({ form, onApply, className }) {
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState(null)
  const [engine, setEngine] = useState(isLive ? 'server' : 'browser')

  const generate = useCallback(async () => {
    setBusy(true)
    try {
      const res = await copilot.draft({ ...form, listingId: undefined })
      setDraft(res?.draft ?? null)
      setEngine(res?.draft?.engine ?? (isLive ? 'server' : 'browser'))
      if (res?.degraded) toast.error('API unreachable — drafted locally instead')
      else toast.success('Draft ready')
    } catch {
      toast.error('The copilot could not draft that — try again')
    } finally {
      setBusy(false)
    }
  }, [form])

  return (
    <CopilotShell
      title="Listing copilot"
      sub="Writes the title, description and tags, and prices it from the metrics you entered."
      icon={Wand2}
      className={className}
      actions={<EngineBadge engine={engine} />}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={generate} loading={busy} disabled={busy}>
          <Sparkles className="h-4 w-4" /> {draft ? 'Regenerate draft' : 'Draft my listing'}
        </Button>
        {draft && (
          <Button
            variant="secondary"
            onClick={() => {
              onApply?.({
                title: draft.title,
                description: draft.description,
                price: draft.suggestedPrice ?? form.price,
              })
              toast.success('Applied to the form')
            }}
          >
            <Check className="h-4 w-4" /> Apply to form
          </Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {busy && (
          <motion.div key="busy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4 space-y-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="h-3 rounded-full bg-white/6"
                animate={{ opacity: [0.35, 0.85, 0.35] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </motion.div>
        )}

        {!busy && draft && (
          <motion.div key="draft" initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: 0.5, ease }} className="mt-4 space-y-3">
            <div className="rounded-xl2 border border-white/8 bg-white/[0.02] p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="text-[13px] font-semibold text-slate-100">{draft.title}</div>
                <CopyButton text={draft.title} label="" />
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-slate-400">{draft.description}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(draft.tags ?? []).map((t) => (
                  <span key={t} className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10.5px] text-slate-400">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl2 border border-white/8 bg-white/[0.02] p-3.5">
                <div className="text-[11px] uppercase tracking-wide text-slate-500">Suggested ask</div>
                <div className="tnum mt-1 text-[19px] font-semibold text-aqua-300">
                  ${Number(draft.suggestedPrice ?? 0).toLocaleString()}
                </div>
                {Array.isArray(draft.priceBand) && (
                  <div className="tnum mt-0.5 text-[11px] text-slate-500">
                    band ${draft.priceBand[0].toLocaleString()}–${draft.priceBand[1].toLocaleString()}
                  </div>
                )}
              </div>
              <div className="rounded-xl2 border border-white/8 bg-white/[0.02] p-3.5">
                <div className="text-[11px] uppercase tracking-wide text-slate-500">Why this price</div>
                <ul className="mt-1 space-y-1">
                  {(draft.rationale ?? []).slice(0, 3).map((r) => (
                    <li key={r} className="text-[11.5px] leading-relaxed text-slate-400">— {r}</li>
                  ))}
                </ul>
              </div>
            </div>

            {draft.checklist?.length > 0 && (
              <div className="rounded-xl2 border border-volt-500/20 bg-volt-500/[0.05] p-3.5">
                <div className="text-[11px] uppercase tracking-wide text-volt-200">Before you publish</div>
                <ul className="mt-2 space-y-1.5">
                  {draft.checklist.map((c) => (
                    <li key={c} className="flex items-start gap-2 text-[11.5px] text-slate-300">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-volt-400" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </CopilotShell>
  )
}

/* ------------------------------------------------------------------ reply -- */

/** Buyer thread: classify the message, draft the seller's answer, catch scams. */
export function ReplyCoach({ listing, className }) {
  const [message, setMessage] = useState('')
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)

  const samples = useMemo(
    () => [
      'Can you do 20% off if I pay today?',
      'I can pay you on WhatsApp and skip the escrow fee',
      'Can I see the analytics before I commit?',
      'How does handover work — do I get the 2FA seed?',
    ],
    [],
  )

  const run = async (text = message) => {
    if (!text.trim()) return
    setBusy(true)
    try {
      const res = await copilot.reply({ message: text, listing })
      setResult(res?.suggestion ?? null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <CopilotShell
      title="Reply coach"
      sub="Reads the buyer's message, names what they actually want, and drafts your answer. Never negotiates outside escrow."
      icon={BrainCircuit}
      tone="aqua"
      className={className}
      actions={result && <EngineBadge engine={result.engine ?? (isLive ? 'server' : 'browser')} />}
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run()}
          placeholder="Paste the buyer's message…"
          className="w-full rounded-xl2 border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-[12.5px] text-slate-200 outline-none transition focus:border-aqua-500/45"
        />
        <Button onClick={() => run()} loading={busy} disabled={busy || !message.trim()}>
          Draft reply
        </Button>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {samples.map((s) => (
          <button
            key={s}
            onClick={() => { setMessage(s); run(s) }}
            className="rounded-full border border-white/10 bg-white/[0.02] px-2.5 py-1 text-[10.5px] text-slate-400 transition hover:border-aqua-500/40 hover:text-slate-200"
          >
            {s.length > 42 ? `${s.slice(0, 42)}…` : s}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {result && !busy && (
          <motion.div key="reply" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease }} className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={result.intent === 'off-platform' ? 'danger' : result.intent === 'discount' ? 'warn' : 'neutral'}>
                {result.intentLabel ?? result.intent}
              </Badge>
              {result.confidence && <span className="text-[11px] text-slate-500">confidence {result.confidence}</span>}
            </div>

            {result.guard && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-2.5 rounded-xl2 border border-danger-500/35 bg-danger-500/10 p-3.5"
              >
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger-400" />
                <div>
                  <div className="text-[12px] font-semibold text-danger-300">Off-platform payment attempt</div>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-danger-200/80">{result.guard}</p>
                </div>
              </motion.div>
            )}

            <div className="rounded-xl2 border border-white/8 bg-white/[0.02] p-3.5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[12.5px] leading-relaxed text-slate-200">{result.reply}</p>
                <CopyButton text={result.reply} label="" />
              </div>
            </div>

            {result.alternatives?.length > 0 && (
              <details className="group rounded-xl2 border border-white/8 bg-white/[0.015] p-3.5">
                <summary className="cursor-pointer text-[11.5px] font-medium text-slate-400 marker:content-none">
                  {result.alternatives.length} alternative phrasings
                </summary>
                <ul className="mt-2.5 space-y-2">
                  {result.alternatives.map((a, i) => (
                    <li key={i} className="rounded-lg border border-white/6 bg-white/[0.02] p-2.5 text-[11.5px] leading-relaxed text-slate-400">
                      {a}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </CopilotShell>
  )
}

/* ------------------------------------------------------------------- risk -- */

/** Ops desk: screen a listing before it reaches the floor. */
export function RiskPanel({ listing, className }) {
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)

  const run = async () => {
    setBusy(true)
    try {
      const res = await copilot.risk(listing)
      setResult(res?.assessment ?? null)
    } finally {
      setBusy(false)
    }
  }

  const tone = result?.recommendation === 'hold_escrow' ? 'danger' : result?.recommendation === 'review' ? 'warn' : 'verify'

  return (
    <CopilotShell
      title="Risk screen"
      sub="Weighs verification, revenue claims and offer pressure into a single desk recommendation."
      icon={ShieldAlert}
      tone="aqua"
      className={className}
      actions={
        <div className="flex items-center gap-2">
          {result && <EngineBadge engine={result.engine ?? (isLive ? 'server' : 'browser')} />}
          <Button variant="ghost" size="sm" onClick={run} loading={busy} disabled={busy}>
            <RefreshCw className={cn('h-3.5 w-3.5', busy && 'animate-spin')} /> {result ? 'Re-screen' : 'Screen'}
          </Button>
        </div>
      }
    >
      {!result && !busy && <p className="text-[12px] text-slate-500">No screening run yet for {listing?.id ?? 'this listing'}.</p>}

      <AnimatePresence mode="wait">
        {busy && (
          <motion.div key="busy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-[12px] text-slate-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Screening…
          </motion.div>
        )}
        {result && !busy && (
          <motion.div key="risk" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease }} className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <Badge tone={tone} dot>
                {result.recommendation === 'hold_escrow' ? 'Hold escrow' : result.recommendation === 'review' ? 'Manual review' : 'Clear to list'}
              </Badge>
              <div className="min-w-[130px] flex-1">
                <div className="mb-1 flex justify-between text-[11px] text-slate-500">
                  <span>risk score</span>
                  <span className="tnum">{Math.round((result.riskScore ?? 0) * 100)}/100</span>
                </div>
                <Progress value={(result.riskScore ?? 0) * 100} tone={tone === 'danger' ? 'danger' : tone === 'warn' ? 'warn' : 'verify'} />
              </div>
            </div>

            <ul className="space-y-2">
              {(result.flags ?? []).map((f) => (
                <li key={f.flag + f.note} className="rounded-xl2 border border-white/8 bg-white/[0.02] p-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        f.level === 'high' ? 'bg-danger-400' : f.level === 'medium' ? 'bg-warn-400' : 'bg-slate-500',
                      )}
                    />
                    <span className="text-[12px] font-medium text-slate-200">{f.flag}</span>
                    <span className="ml-auto text-[10.5px] uppercase tracking-wide text-slate-500">{f.level}</span>
                  </div>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-slate-500">{f.note}</p>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </CopilotShell>
  )
}

/* ------------------------------------------------------------------- reel -- */

/** Proof reel: a 40-second narration for the listing's proof artefacts. */
export function ProofReel({ listing, className }) {
  const [reel, setReel] = useState(null)
  const [busy, setBusy] = useState(false)

  const run = async () => {
    setBusy(true)
    try {
      const res = await copilot.reel(listing)
      setReel(res?.reel ?? null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <CopilotShell
      title="Proof reel"
      sub="A 40-second narration over the proof artefacts — the fastest way to make a listing legible."
      icon={Sparkles}
      className={className}
      actions={
        <div className="flex items-center gap-2">
          {reel && <EngineBadge engine={reel.engine ?? (isLive ? 'server' : 'browser')} />}
          <Button variant="ghost" size="sm" onClick={run} loading={busy} disabled={busy}>
            <RefreshCw className={cn('h-3.5 w-3.5', busy && 'animate-spin')} /> {reel ? 'Rewrite' : 'Write script'}
          </Button>
        </div>
      }
    >
      {reel ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }} className="space-y-3">
          <div className="rounded-xl2 border border-volt-500/25 bg-volt-500/[0.06] p-3.5">
            <div className="text-[10.5px] uppercase tracking-wide text-volt-200">Hook</div>
            <div className="mt-1 text-[13px] font-medium text-slate-100">{reel.hook}</div>
          </div>
          <ol className="space-y-2">
            {String(reel.script ?? '').split('\n').filter(Boolean).map((line, i) => (
              <li key={i} className="flex gap-3 rounded-xl2 border border-white/8 bg-white/[0.02] p-3">
                <span className="tnum text-[11px] text-slate-500">{String(i + 1).padStart(2, '0')}</span>
                <span className="text-[12px] leading-relaxed text-slate-300">{line}</span>
              </li>
            ))}
          </ol>
          <div className="flex items-center justify-between gap-3 rounded-xl2 border border-aqua-500/25 bg-aqua-500/[0.06] p-3.5">
            <span className="text-[12px] text-aqua-200">{reel.cta}</span>
            <span className="tnum shrink-0 text-[11px] text-slate-400">
              {reel.wordCount} words · ~{reel.estimatedSeconds}s
            </span>
          </div>
          <div className="flex justify-end">
            <CopyButton text={`${reel.hook}\n\n${reel.script}\n\n${reel.cta}`} label="Copy full script" />
          </div>
        </motion.div>
      ) : (
        <p className="text-[12px] text-slate-500">
          {busy ? 'Writing…' : 'Generate a narration script for the proof vault artefacts attached to this log.'}
        </p>
      )}
    </CopilotShell>
  )
}

export default { EngineBadge, DraftAssistant, ReplyCoach, RiskPanel, ProofReel }
