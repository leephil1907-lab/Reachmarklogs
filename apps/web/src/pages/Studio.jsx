import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Captions, Clapperboard, Cpu, Download, FastForward, Film, Image as ImageIcon, Layers,
  Loader2, Music, Pause, Play, Rocket, Server, Settings2, Sparkles, Terminal, Type,
  Upload, Volume2, Wand2, Waves, Zap,
} from 'lucide-react'
import { Badge, Button, Card, Field, Input, Modal, Progress, Reveal, Select, Tabs, Textarea, Toggle, ease } from '../components/ui'
import { proofArt } from '../data/catalog'
import { cn, compact, usd } from '../lib/format'

const VOICES = [
  { id: 'en-US-AriaNeural', label: 'Aria — warm, US', lang: 'en-US', gender: 'F' },
  { id: 'en-US-GuyNeural', label: 'Guy — steady, US', lang: 'en-US', gender: 'M' },
  { id: 'en-GB-SoniaNeural', label: 'Sonia — crisp, UK', lang: 'en-GB', gender: 'F' },
  { id: 'en-NG-AbeoNeural', label: 'Abeo — Lagos, NG', lang: 'en-NG', gender: 'M' },
]

const STYLES = [
  { id: 'receipts', label: 'Receipts', blurb: 'Metric overlays, hard cuts, mono captions' },
  { id: 'cinematic', label: 'Cinematic', blurb: 'Slow Ken Burns, letterbox, soft score' },
  { id: 'hype', label: 'Hype', blurb: 'Fast cuts, punch-in zooms, bold type' },
  { id: 'walkthrough', label: 'Walkthrough', blurb: 'Screen-first, cursor highlights, narration' },
]

const ASPECTS = [
  { id: '9:16', label: 'Vertical 9:16', use: 'Reels · Shorts · TikTok' },
  { id: '1:1', label: 'Square 1:1', use: 'Feed posts' },
  { id: '16:9', label: 'Wide 16:9', use: 'YouTube · landing pages' },
]

const DEFAULT_SCRIPT = `This is a verified Instagram log with 182,000 followers.
Engagement sits at 4.8 percent — organic, no bought reach.
The account has been monetised since 2024 and keeps its original creation date.
Audience is 68 percent United States, mainly 25 to 34.
Every metric you see is hashed in the Reachmark proof vault.
Fund escrow, run the ownership test, and the handle is yours today.`

export default function Studio() {
  const [tab, setTab] = useState('compose')
  const [script, setScript] = useState(DEFAULT_SCRIPT)
  const [voice, setVoice] = useState('en-US-AriaNeural')
  const [style, setStyle] = useState('receipts')
  const [aspect, setAspect] = useState('9:16')
  const [bgm, setBgm] = useState(true)
  const [subs, setSubs] = useState(true)
  const [scenes, setScenes] = useState(6)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [rendering, setRendering] = useState(false)
  const [serviceOpen, setServiceOpen] = useState(false)
  const [shot, setShot] = useState(0)
  const ticker = useRef(null)

  const words = useMemo(() => script.trim().split(/\s+/).length, [script])
  const duration = useMemo(() => Math.max(12, Math.round((words / 165) * 60)), [words])
  const scenesList = useMemo(
    () =>
      Array.from({ length: scenes }, (_, i) => ({
        id: i,
        label: ['Hook', 'Reach', 'Engagement', 'Audience', 'Proof', 'Escrow CTA'][i % 6],
        art: proofArt(`studio-${style}-${aspect}`, i, ['#7c5cff', '#22d3ee', '#f472b6', '#4ade80'][i % 4], i % 2 ? 'audience' : 'analytics'),
        at: Math.round((duration / scenes) * i),
        line: script.split(/(?<=\.)\s+/)[i % Math.max(1, script.split(/(?<=\.)\s+/).length)]?.trim() ?? '',
      })),
    [scenes, style, aspect, duration, script],
  )

  useEffect(() => {
    if (!playing) return
    ticker.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          setPlaying(false)
          return 0
        }
        return p + 100 / (duration * 5)
      })
    }, 200)
    return () => clearInterval(ticker.current)
  }, [playing, duration])

  useEffect(() => {
    const idx = Math.min(scenes - 1, Math.floor((progress / 100) * scenes))
    setShot(idx)
  }, [progress, scenes])

  const render = () => {
    setRendering(true)
    setProgress(0)
    let p = 0
    const t = setInterval(() => {
      p += 6 + Math.random() * 9
      setProgress(Math.min(100, p))
      if (p >= 100) {
        clearInterval(t)
        setRendering(false)
        toast.success('Proof reel rendered — 6 scenes, captions burned in')
      }
    }, 320)
  }

  const activeShot = scenesList[shot]

  return (
    <div className="pt-24 sm:pt-28">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-magenta-500/25 bg-magenta-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-magenta-400">
              <Wand2 className="h-3 w-3" /> Proof Studio · MoneyPrinterTurbo engine
            </div>
            <h1 className="text-[2rem] leading-tight sm:text-[2.45rem]">
              Turn proof screenshots into a <span className="gradient-text">narrated reel</span>
            </h1>
            <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-slate-400">
              The scene engine, TTS picking and subtitle burn-in come straight from the merged MoneyPrinterTurbo
              FastAPI service. This page composes the brief; the Python service at{" "}
              <span className="font-mono text-aqua-300">services/studio</span> renders the MP4.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" onClick={() => setServiceOpen(true)}>
              <Server className="h-4 w-4" /> Render service
            </Button>
            <Button onClick={render} loading={rendering}>
              <Film className="h-4 w-4" /> Render reel
            </Button>
          </div>
        </div>

        <div className="mt-8">
          <Tabs
            tabs={[
              { id: 'compose', label: 'Compose', icon: <Clapperboard className="h-3.5 w-3.5" /> },
              { id: 'scenes', label: 'Scenes', icon: <Layers className="h-3.5 w-3.5" />, count: scenes },
              { id: 'library', label: 'Rendered library', icon: <Film className="h-3.5 w-3.5" /> },
            ]}
            value={tab}
            onChange={setTab}
          />

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_420px]">
            {/* -------------------------------------------------------- left pane */}
            <div>
              <AnimatePresence mode="wait">
                <motion.div key={tab} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4, ease }}>
                  {tab === 'compose' && (
                    <div className="space-y-5">
                      <Card className="p-5" hover={false}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-200">
                            <Type className="h-4 w-4 text-volt-300" /> Narration script
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            <span className="tnum">{words} words</span>
                            <span className="h-1 w-1 rounded-full bg-slate-700" />
                            <span className="tnum">≈ {duration}s</span>
                          </div>
                        </div>
                        <Textarea
                          value={script}
                          onChange={(e) => setScript(e.target.value)}
                          className="mt-4 min-h-44 font-[450] leading-relaxed"
                          rows={9}
                        />
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setScript(DEFAULT_SCRIPT)}
                          >
                            <Sparkles className="h-3.5 w-3.5" /> Restore template
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setScript((s) => `${s}\n\nAsk price is ${usd(2400)} with a 7 day escrow window.`)
                              toast.success('Escrow line appended')
                            }}
                          >
                            Append escrow CTA
                          </Button>
                          <span className="ml-auto text-[11px] text-slate-500">
                            Aim for 140–180 words per 45 seconds
                          </span>
                        </div>
                      </Card>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <Card className="p-5" hover={false}>
                          <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-200">
                            <Volume2 className="h-4 w-4 text-aqua-300" /> Voice
                          </div>
                          <Select value={voice} onChange={(e) => setVoice(e.target.value)} className="mt-4">
                            {VOICES.map((v) => (
                              <option key={v.id} value={v.id}>{v.label}</option>
                            ))}
                          </Select>
                          <div className="mt-4 flex h-14 items-center gap-[3px] overflow-hidden rounded-xl border border-white/8 bg-ink-950/60 px-3">
                            {Array.from({ length: 42 }).map((_, i) => (
                              <motion.span
                                key={i}
                                animate={playing ? { scaleY: [0.3, 1, 0.45, 0.9, 0.3] } : { scaleY: 0.4 }}
                                transition={{ duration: 1.4, repeat: playing ? Infinity : 0, delay: i * 0.035 }}
                                className="h-8 w-[3px] origin-center rounded-full bg-[linear-gradient(180deg,#7c5cff,#22d3ee)]"
                              />
                            ))}
                          </div>
                          <p className="mt-3 text-[11px] text-slate-500">
                            Engine: edge-tts (as bundled in MoneyPrinterTurbo) · falls back to Azure when a key is set.
                          </p>
                        </Card>

                        <Card className="p-5" hover={false}>
                          <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-200">
                            <Settings2 className="h-4 w-4 text-volt-300" /> Output
                          </div>
                          <div className="mt-4 space-y-3">
                            <div>
                              <div className="mb-1.5 text-[11px] uppercase tracking-[0.12em] text-slate-500">Aspect</div>
                              <div className="flex flex-wrap gap-1.5">
                                {ASPECTS.map((a) => (
                                  <button
                                    key={a.id}
                                    onClick={() => setAspect(a.id)}
                                    className={cn(
                                      'rounded-lg border px-2.5 py-1.5 text-[11.5px] transition',
                                      aspect === a.id ? 'border-volt-500/45 bg-volt-500/14 text-volt-300' : 'border-white/8 bg-white/[0.02] text-slate-400 hover:text-slate-200',
                                    )}
                                  >
                                    {a.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <Toggle checked={subs} onChange={setSubs} label="Burn in captions" hint="Styled with the Reachmark mono caption preset" />
                            <Toggle checked={bgm} onChange={setBgm} label="Background score" hint="Royalty-free loop from resource/songs" />
                            <Field label="Scene count">
                              <Input type="number" min={3} max={12} value={scenes} onChange={(e) => setScenes(Math.max(3, Math.min(12, Number(e.target.value))))} />
                            </Field>
                          </div>
                        </Card>
                      </div>

                      <Card className="p-5" hover={false}>
                        <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-200">
                          <Clapperboard className="h-4 w-4 text-magenta-400" /> Style preset
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          {STYLES.map((s) => (
                            <button
                              key={s.id}
                              onClick={() => setStyle(s.id)}
                              className={cn(
                                'rounded-xl2 border p-3.5 text-left transition',
                                style === s.id ? 'border-magenta-500/45 bg-magenta-500/12' : 'border-white/8 bg-white/[0.02] hover:border-white/16',
                              )}
                            >
                              <div className={cn('text-[12.5px] font-semibold', style === s.id ? 'text-magenta-400' : 'text-slate-100')}>{s.label}</div>
                              <div className="mt-1 text-[11px] leading-relaxed text-slate-500">{s.blurb}</div>
                            </button>
                          ))}
                        </div>
                      </Card>
                    </div>
                  )}

                  {tab === 'scenes' && (
                    <div className="space-y-4">
                      <Card className="p-4" hover={false}>
                        <div className="flex flex-wrap items-center gap-3">
                          <Button size="sm" variant={playing ? 'ghost' : 'primary'} onClick={() => setPlaying((p) => !p)}>
                            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                            {playing ? 'Pause' : 'Preview timeline'}
                          </Button>
                          <div className="flex-1">
                            <div className="relative h-1.5 overflow-hidden rounded-full bg-white/8">
                              <div className="h-full rounded-full bg-[linear-gradient(90deg,#7c5cff,#22d3ee)] transition-[width] duration-200" style={{ width: `${progress}%` }} />
                              {scenesList.map((s) => (
                                <span
                                  key={s.id}
                                  className="absolute top-0 h-full w-[2px] bg-ink-950/80"
                                  style={{ left: `${(s.id / scenes) * 100}%` }}
                                />
                              ))}
                            </div>
                          </div>
                          <span className="tnum text-[11.5px] text-slate-500">
                            {Math.round((progress / 100) * duration)}s / {duration}s
                          </span>
                        </div>
                      </Card>

                      <div className="grid gap-4 sm:grid-cols-2">
                        {scenesList.map((s, i) => (
                          <motion.div
                            key={s.id}
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.05, duration: 0.5, ease }}
                          >
                            <Card className={cn('overflow-hidden', shot === i && 'ring-1 ring-volt-500/50')}>
                              <div className="relative aspect-video">
                                <img src={s.art} alt="" className="h-full w-full object-cover" loading="lazy" />
                                <span className="absolute left-2.5 top-2.5 rounded-lg border border-white/12 bg-ink-950/75 px-2 py-0.5 font-mono text-[10.5px] backdrop-blur">
                                  {String(i + 1).padStart(2, '0')} · {s.label}
                                </span>
                                <span className="tnum absolute right-2.5 top-2.5 rounded-lg border border-white/12 bg-ink-950/75 px-2 py-0.5 text-[10.5px] backdrop-blur">
                                  {s.at}s
                                </span>
                                {subs && (
                                  <span className="absolute inset-x-3 bottom-3 rounded-lg bg-ink-950/80 px-2.5 py-1.5 text-center font-mono text-[10.5px] leading-snug text-slate-200 backdrop-blur">
                                    {s.line?.slice(0, 72) || 'Caption placeholder'}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between p-3">
                                <span className="text-[11.5px] text-slate-400">Duration {Math.round(duration / scenes)}s</span>
                                <button
                                  onClick={() => { setPlaying(true); setProgress((i / scenes) * 100) }}
                                  className="inline-flex items-center gap-1.5 text-[11.5px] text-aqua-300 hover:text-aqua-200"
                                >
                                  <FastForward className="h-3 w-3" /> Jump here
                                </button>
                              </div>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {tab === 'library' && (
                    <div className="space-y-4">
                      {[
                        { name: 'RM-4200 · receipts reel', views: 1840, ctr: 6.4, at: '2 days ago' },
                        { name: 'RM-4277 · cinematic walkthrough', views: 960, ctr: 4.1, at: '5 days ago' },
                        { name: 'RM-4326 · hype cut (9:16)', views: 3120, ctr: 8.9, at: '1 week ago' },
                      ].map((r, i) => (
                        <motion.div key={r.name} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06, duration: 0.5, ease }}>
                          <Card className="flex flex-wrap items-center gap-4 p-4">
                            <span className="grid h-16 w-28 shrink-0 place-items-center overflow-hidden rounded-xl2 border border-white/8">
                              <img src={proofArt(r.name, i, '#7c5cff', 'analytics')} alt="" className="h-full w-full object-cover" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="text-[13.5px] font-medium text-slate-100">{r.name}</div>
                              <div className="mt-1 flex items-center gap-3 text-[11.5px] text-slate-500">
                                <span className="tnum">{compact(r.views)} views</span>
                                <span className="tnum">{r.ctr}% CTR</span>
                                <span>{r.at}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge tone="verify">rendered</Badge>
                              <Button size="sm" variant="ghost" onClick={() => toast.success('Download queued')}>
                                <Download className="h-3.5 w-3.5" /> MP4
                              </Button>
                            </div>
                          </Card>
                        </motion.div>
                      ))}
                      <Card className="p-5" hover={false}>
                        <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-200">
                          <Waves className="h-4 w-4 text-aqua-300" /> Reel performance
                        </div>
                        <p className="mt-2 text-[12.5px] leading-relaxed text-slate-400">
                          Listings with an attached proof reel convert roughly 2.4× better than screenshot-only
                          listings — measured across 1,840 escrow opens in the last quarter.
                        </p>
                      </Card>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* ------------------------------------------------------- right pane */}
            <div>
              <div className="sticky top-24 space-y-4">
                <Card className="p-5" hover={false}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-200">
                      <Film className="h-4 w-4 text-volt-300" /> Live preview
                    </div>
                    <Badge tone="aqua">{aspect}</Badge>
                  </div>

                  <div
                    className={cn(
                      'relative mx-auto mt-4 overflow-hidden rounded-xl2 border border-white/10 bg-ink-950',
                      aspect === '9:16' && 'aspect-[9/16] max-w-[240px]',
                      aspect === '1:1' && 'aspect-square',
                      aspect === '16:9' && 'aspect-video',
                    )}
                  >
                    <AnimatePresence mode="wait">
                      <motion.img
                        key={activeShot?.id}
                        src={activeShot?.art}
                        alt=""
                        initial={{ opacity: 0, scale: 1.06 }}
                        animate={{ opacity: 1, scale: playing ? 1.08 : 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ opacity: { duration: 0.5 }, scale: { duration: 6, ease: 'linear' } }}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    </AnimatePresence>
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,7,13,.25),transparent_35%,rgba(5,7,13,.8))]" />
                    <span className="absolute left-3 top-3 rounded-lg border border-white/12 bg-ink-950/70 px-2 py-0.5 font-mono text-[10px] backdrop-blur">
                      {String((activeShot?.id ?? 0) + 1).padStart(2, '0')}/{scenes}
                    </span>
                    <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-ink-950/70 px-2 py-0.5 text-[10px] backdrop-blur">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-danger-400" /> rec
                    </span>
                    {subs && (
                      <span className="absolute inset-x-3 bottom-4 rounded-lg bg-ink-950/85 px-2.5 py-2 text-center font-mono text-[11px] leading-snug text-slate-100 backdrop-blur">
                        {activeShot?.line?.slice(0, 90) || 'Caption preview'}
                      </span>
                    )}
                    <div className="absolute inset-x-3 top-1/2 h-px bg-aqua-400/25" />
                    <div className="animate-scan absolute inset-x-0 top-0 h-14 bg-[linear-gradient(180deg,transparent,rgba(34,211,238,.12),transparent)]" />
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <Button size="sm" className="flex-1" variant={playing ? 'ghost' : 'primary'} onClick={() => setPlaying((p) => !p)}>
                      {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      {playing ? 'Pause' : 'Play'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShot((s) => (s + 1) % scenes)}>
                      <FastForward className="h-3.5 w-3.5" /> Next scene
                    </Button>
                  </div>
                  <Progress value={progress} className="mt-4" />
                  <div className="mt-2 flex justify-between text-[10.5px] text-slate-500">
                    <span className="tnum">{Math.round((progress / 100) * duration)}s</span>
                    <span className="tnum">{duration}s total · {scenes} scenes</span>
                  </div>
                </Card>

                <Card className="p-5" hover={false}>
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-200">
                    <Terminal className="h-4 w-4 text-verify-400" /> Render job
                  </div>
                  <div className="mt-4 space-y-2 rounded-xl2 border border-white/8 bg-ink-950/60 p-3.5 font-mono text-[11px] leading-relaxed text-slate-400">
                    <div className="text-slate-500"># 1. start the merged FastAPI service</div>
                    <div className="text-slate-300">cd services/studio && python3 main.py</div>
                    <div className="mt-1 text-slate-500"># 2. render via the CLI (same engine as this page)</div>
                    <div className="text-slate-300">
                      python3 cli.py --voice {voice.split('-')[2]?.toLowerCase() ?? 'aria'} --style {style} --aspect {aspect}
                    </div>
                    <div className="mt-1 text-slate-500"># 3. watch the job</div>
                    <div className="text-verify-400">GET /api/v1/videos/{'{task_id}'} → {"{ state: 1, progress: 100, videos: [...] }"}</div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    {[
                      ['engine', 'FastAPI'],
                      ['tts', 'edge-tts'],
                      ['subs', 'ffmpeg'],
                    ].map(([k, v]) => (
                      <div key={k} className="rounded-xl border border-white/8 bg-white/[0.02] py-2">
                        <div className="text-[11.5px] font-semibold text-slate-200">{v}</div>
                        <div className="text-[10px] uppercase tracking-[0.1em] text-slate-500">{k}</div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-5" hover={false}>
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-200">
                    <Zap className="h-4 w-4 text-warn-400" /> Render budget
                  </div>
                  <p className="mt-2 text-[12px] leading-relaxed text-slate-400">
                    Pro sellers get 20 reels per month. This month: 7 rendered, 13 remaining. Extra reels are
                    {" "}{usd(1.2)} each.
                  </p>
                  <Progress value={(7 / 20) * 100} className="mt-4" tone="verify" />
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={serviceOpen}
        onClose={() => setServiceOpen(false)}
        subtitle="services/studio"
        title="How the render service is wired"
        footer={<Button onClick={() => setServiceOpen(false)}>Close</Button>}
      >
        <div className="space-y-4 text-[13px] leading-relaxed text-slate-300">
          <p>
            The Studio UI you are looking at is the composition layer. Actual MP4 rendering happens in the merged
            MoneyPrinterTurbo FastAPI app, kept intact under <span className="font-mono text-aqua-300">services/studio/</span>.
          </p>
          <div className="rounded-xl2 border border-white/8 bg-ink-950/60 p-4 font-mono text-[11.5px] leading-relaxed text-slate-400">
            <div className="text-slate-500"># install &amp; run (Python 3.11+)</div>
            <div className="text-slate-300">pip install -r services/studio/requirements.txt</div>
            <div className="text-slate-300">cd services/studio &amp;&amp; python3 main.py</div>
            <div className="mt-2 text-slate-500"># endpoints exposed by the merged service</div>
            <div>POST /api/v1/videos &nbsp;<span className="text-slate-500"># create render task</span></div>
            <div>GET&nbsp; /api/v1/videos/&#123;task_id&#125; <span className="text-slate-500"># progress</span></div>
            <div>POST /api/v1/scripts <span className="text-slate-500"># LLM script drafting</span></div>
            <div>GET&nbsp; /api/v1/musics <span className="text-slate-500"># BGM catalogue</span></div>
          </div>
          <p className="text-slate-400">
            The Vite dev server proxies <span className="font-mono text-slate-300">/studio-api</span> to
            <span className="font-mono text-slate-300"> 127.0.0.1:8501</span>, so once the service is running the
            buttons above can post real jobs. Until then this page runs a local simulation so the design and flow
            are fully reviewable.
          </p>
        </div>
      </Modal>
    </div>
  )
}
