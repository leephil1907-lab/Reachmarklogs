import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity, ArrowUpRight, CheckCircle2, CircleSlash, Clock, Filter, Globe2, Layers,
  Search, ShieldAlert, Sparkles, Terminal, Wrench, X, Zap,
} from 'lucide-react'
import { Badge, Button, Card, Counter, Modal, Progress, Reveal, SectionHead, StaggerGroup, Tabs } from '../components/ui'
import { cn, compact } from '../lib/format'
import CATALOG from '../data/harvest/tool-catalog.json'
import BUILD from '../data/harvest/build-manifest.json'

const STATUS = {
  ok: { label: 'live', tone: 'verify', icon: CheckCircle2 },
  blocked: { label: 'bot-walled', tone: 'warn', icon: ShieldAlert },
  unreachable: { label: 'offline', tone: 'danger', icon: CircleSlash },
}

export default function Tools() {
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [status, setStatus] = useState('all')
  const [focus, setFocus] = useState(params.get('focus'))

  const categories = useMemo(() => ['all', ...CATALOG.categories], [])
  const tools = CATALOG.sites

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return tools.filter((t) => {
      if (cat !== 'all' && t.category !== cat) return false
      if (status !== 'all' && t.status !== status) return false
      if (!term) return true
      return `${t.name} ${t.category} ${t.whatItIs} ${t.reachmarkUse}`.toLowerCase().includes(term)
    })
  }, [tools, q, cat, status])

  const focused = tools.find((t) => t.slug === focus)

  const grouped = useMemo(() => {
    const map = new Map()
    filtered.forEach((t) => {
      const key = t.category
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(t)
    })
    return [...map.entries()]
  }, [filtered])

  const reachable = tools.filter((t) => t.status === 'ok').length

  return (
    <div className="pt-24 sm:pt-28">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <SectionHead
          kicker="claw-code harvest · live probe"
          title="The 50 reference tools behind this build"
          sub={`Every site on the operator's list was probed by the claw harness — HTTP status, title, theme colour and favicon captured into the build manifest. ${reachable} of ${tools.length} answered on the last run.`}
        />

        <Reveal delay={0.1}>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Tools indexed', value: tools.length, icon: Layers, tone: 'volt' },
              { label: 'Reachable right now', value: reachable, icon: Activity, tone: 'verify' },
              { label: 'Categories', value: CATALOG.categories.length, icon: Filter, tone: 'aqua' },
              { label: 'Manifest fingerprint', value: BUILD.fingerprint, icon: Terminal, tone: 'magenta', raw: true },
            ].map((k) => (
              <div key={k.label} className="flex items-center gap-3 rounded-xl2 border border-white/8 bg-white/[0.02] px-4 py-3.5">
                <k.icon
                  className={cn(
                    'h-4 w-4 shrink-0',
                    k.tone === 'volt' ? 'text-volt-300' : k.tone === 'verify' ? 'text-verify-400' : k.tone === 'aqua' ? 'text-aqua-300' : 'text-magenta-400',
                  )}
                />
                <div className="min-w-0">
                  <div className="text-[10.5px] uppercase tracking-[0.14em] text-slate-500">{k.label}</div>
                  <div className="tnum truncate font-mono text-[14px] font-semibold text-slate-100">
                    {k.raw ? k.value : <Counter to={k.value} />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        {/* controls */}
        <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative lg:w-96">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search tools, categories or how Reachmark uses them…"
              className="h-11 w-full rounded-xl2 border border-white/10 bg-ink-900/70 pl-11 pr-4 text-[13.5px] outline-none transition focus:border-volt-500/60"
            />
          </div>
          <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={cn(
                  'shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] capitalize transition',
                  cat === c ? 'border-volt-500/45 bg-volt-500/14 text-volt-300' : 'border-white/8 bg-white/[0.02] text-slate-400 hover:text-slate-200',
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {['all', 'ok', 'blocked', 'unreachable'].map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={cn(
                  'rounded-lg border px-2.5 py-1.5 text-[11.5px] capitalize transition',
                  status === s ? 'border-aqua-500/45 bg-aqua-500/12 text-aqua-300' : 'border-white/8 bg-white/[0.02] text-slate-400 hover:text-slate-200',
                )}
              >
                {s === 'all' ? 'any status' : STATUS[s].label}
              </button>
            ))}
          </div>
        </div>

        {/* grid grouped by category */}
        <div className="mt-8 space-y-12">
          {grouped.map(([category, items]) => (
            <div key={category}>
              <div className="flex items-center gap-3">
                <h2 className="text-[17px] font-semibold text-slate-100">{category}</h2>
                <Badge tone="neutral">{items.length}</Badge>
                <span className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
              </div>
              <StaggerGroup className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" stagger={0.04}>
                {items.map((t) => {
                  const st = STATUS[t.status]
                  return (
                    <Card key={t.slug} className="group flex h-full flex-col p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.03] font-mono text-[13px] font-semibold"
                            style={{ color: t.themeColor || '#9a86ff' }}
                          >
                            {t.name.slice(0, 2).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate text-[13.5px] font-semibold text-slate-100">{t.name}</div>
                            <div className="truncate font-mono text-[10.5px] text-slate-500">{t.slug}</div>
                          </div>
                        </div>
                        <span className="shrink-0">
                          <Badge tone={st.tone} dot>{st.label}</Badge>
                        </span>
                      </div>

                      <p className="mt-4 text-[12.5px] text-slate-300">{t.whatItIs}</p>

                      <div className="mt-3 rounded-xl border border-volt-500/18 bg-volt-500/[0.06] p-3">
                        <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-volt-300">
                          <Wand2Icon /> Reachmark use
                        </div>
                        <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-300/90">{t.reachmarkUse}</p>
                      </div>

                      <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                        <span className="inline-flex items-center gap-1.5 text-[10.5px] text-slate-500">
                          <Globe2 className="h-3 w-3" />
                          {t.httpStatus || '—'} · {t.latencyMs ? `${t.latencyMs}ms` : 'n/a'}
                        </span>
                        <button
                          onClick={() => { setFocus(t.slug); setParams({ focus: t.slug }, { replace: true }) }}
                          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-aqua-300 transition hover:text-aqua-200"
                        >
                          Inspect <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </Card>
                  )
                })}
              </StaggerGroup>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <Card className="mt-10 p-12 text-center" hover={false}>
            <Sparkles className="mx-auto h-9 w-9 text-slate-600" />
            <h3 className="mt-4 text-[17px]">No tools match that filter</h3>
            <p className="mt-2 text-[13px] text-slate-400">Try clearing the search or switching category.</p>
            <Button className="mt-6" variant="ghost" onClick={() => { setQ(''); setCat('all'); setStatus('all') }}>
              Reset filters
            </Button>
          </Card>
        )}
      </div>

      {/* inspector */}
      <Modal
        open={Boolean(focused)}
        onClose={() => { setFocus(null); setParams({}, { replace: true }) }}
        subtitle={focused?.category}
        title={focused?.name}
        footer={
          <>
            <Button variant="ghost" onClick={() => { setFocus(null); setParams({}, { replace: true }) }}>
              Close
            </Button>
            <Button as="a" href={focused?.url} target="_blank" rel="noreferrer">
              Visit site <ArrowUpRight className="h-4 w-4" />
            </Button>
          </>
        }
      >
        {focused && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={STATUS[focused.status].tone} dot>{STATUS[focused.status].label}</Badge>
              <Badge tone="neutral">HTTP {focused.httpStatus || '—'}</Badge>
              <Badge tone="aqua">{focused.latencyMs ? `${focused.latencyMs}ms` : 'no response'}</Badge>
              {focused.themeColor && <Badge tone="volt">theme {focused.themeColor}</Badge>}
            </div>

            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">What it is</div>
              <p className="mt-2 text-[13.5px] text-slate-300">{focused.whatItIs}</p>
            </div>

            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">How Reachmark uses it</div>
              <p className="mt-2 text-[13.5px] text-slate-300">{focused.reachmarkUse}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl2 border border-white/8 bg-white/[0.02] p-4">
                <div className="text-[10.5px] uppercase tracking-[0.14em] text-slate-500">Probed title</div>
                <div className="mt-1.5 text-[12.5px] text-slate-200">{focused.title || '—'}</div>
              </div>
              <div className="rounded-xl2 border border-white/8 bg-white/[0.02] p-4">
                <div className="text-[10.5px] uppercase tracking-[0.14em] text-slate-500">Final URL</div>
                <div className="mt-1.5 truncate font-mono text-[11.5px] text-slate-300">{focused.finalUrl || focused.url}</div>
              </div>
            </div>

            <div className="rounded-xl2 border border-white/8 bg-ink-950/50 p-4 font-mono text-[11.5px] leading-relaxed text-slate-400">
              <div className="text-slate-500">$ python3 tools/claw/claw.py probe</div>
              <div className="mt-1 text-verify-400">✓ {focused.slug} → HTTP {focused.httpStatus} in {focused.latencyMs}ms</div>
              <div className="text-slate-500"># reachmarkUse: {focused.reachmarkUse}</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function Wand2Icon() {
  return <Sparkles className="h-3 w-3" />
}
