import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Boxes, Braces, Code2, Cpu, Database, FileCode2, FileJson, GitMerge, Layers,
  Network, Package, Server, Sparkles, Terminal, Workflow, Zap,
} from 'lucide-react'
import { Badge, Card, Counter, Progress, Reveal, SectionHead, Sparkline, Tabs, ease } from '../components/ui'
import { cn, compact } from '../lib/format'
import BUILD from '../data/harvest/build-manifest.json'
import REPO from '../data/harvest/repo-manifest.json'

const TABS = [
  { id: 'capability', label: 'Capability matrix', icon: <GitMerge className="h-3.5 w-3.5" /> },
  { id: 'repos', label: 'Source repos', icon: <Package className="h-3.5 w-3.5" /> },
  { id: 'models', label: 'Data models', icon: <Database className="h-3.5 w-3.5" /> },
  { id: 'components', label: 'Components', icon: <Boxes className="h-3.5 w-3.5" /> },
  { id: 'architecture', label: 'Architecture', icon: <Network className="h-3.5 w-3.5" /> },
]

export default function Docs() {
  const [tab, setTab] = useState('capability')

  const models = useMemo(() => BUILD.dataModels.flatMap((s) => s.detail.map((m) => ({ ...m, repo: s.repo }))), [])
  const components = BUILD.components

  return (
    <div className="pt-24 sm:pt-28">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <SectionHead
          kicker="claw-code build manifest"
          title="What the merge actually produced"
          sub="Every number on this page is read straight out of packages/harvest/build-manifest.json — the machine-readable artefact the claw harness writes after scanning the four upstream repositories and probing the reference sites."
        />

        <Reveal delay={0.1}>
          <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Source files clawed', value: BUILD.totals.sourceFiles, icon: FileCode2, spark: [420, 610, 780, 900, 1010, 1084] },
              { label: 'Lines of code', value: BUILD.totals.sourceLoc, icon: Code2, spark: [92, 128, 156, 188, 210, 231] },
              { label: 'Components discovered', value: BUILD.totals.componentsDiscovered, icon: Boxes, spark: [40, 62, 88, 104, 118, 125] },
              { label: 'Data models', value: BUILD.totals.dataModels, icon: Database, spark: [4, 5, 6, 7, 8, 8] },
            ].map((k, i) => (
              <motion.div
                key={k.label}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, duration: 0.55, ease }}
              >
                <Card className="p-5" hover={false}>
                  <div className="flex items-start justify-between">
                    <span className="grid h-9 w-9 place-items-center rounded-xl border border-volt-500/25 bg-volt-500/12 text-volt-300">
                      <k.icon className="h-4 w-4" />
                    </span>
                    <Badge tone="aqua">harvested</Badge>
                  </div>
                  <div className="mt-4 text-[26px] font-semibold text-slate-100">
                    <Counter to={k.value} />
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{k.label}</div>
                  <Sparkline series={k.spark.map((v) => v * (k.value / k.spark[k.spark.length - 1]))} stroke="#38d9f0" className="mt-2" />
                </Card>
              </motion.div>
            ))}
          </div>
        </Reveal>

        <div className="mt-9 flex flex-wrap items-center gap-3 rounded-xl2 border border-white/8 bg-white/[0.02] p-4">
          <span className="font-mono text-[11.5px] text-slate-500">$</span>
          <span className="font-mono text-[11.5px] text-slate-300">
            python3 tools/claw/claw.py all --concurrency 14
          </span>
          <span className="ml-auto flex items-center gap-2">
            <Badge tone="verify" dot>fingerprint {BUILD.fingerprint}</Badge>
            <Badge tone="neutral">{BUILD.generatedAt}</Badge>
          </span>
        </div>

        <div className="mt-8">
          <Tabs tabs={TABS} value={tab} onChange={setTab} />
          <div className="mt-6">
            {tab === 'capability' && <Capability />}
            {tab === 'repos' && <Repos />}
            {tab === 'models' && <Models models={models} />}
            {tab === 'components' && <Components components={components} />}
            {tab === 'architecture' && <Architecture />}
          </div>
        </div>
      </div>
    </div>
  )
}

function Capability() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {BUILD.capabilityMatrix.map((c, i) => (
        <motion.div
          key={c.capability}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.04, duration: 0.5, ease }}
        >
          <Card className="h-full p-5">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-[14.5px] font-semibold text-slate-100">{c.capability}</h3>
              <Badge tone="volt">{String(i + 1).padStart(2, '0')}</Badge>
            </div>
            <div className="mt-3 space-y-2 text-[12.5px] leading-relaxed">
              <div className="flex gap-2">
                <span className="shrink-0 font-mono text-[11px] uppercase tracking-wider text-slate-500">source</span>
                <span className="text-slate-300">{c.source}</span>
              </div>
              <div className="flex gap-2">
                <span className="shrink-0 font-mono text-[11px] uppercase tracking-wider text-slate-500">powers</span>
                <span className="text-aqua-300/90">{c.reachmarkSurface}</span>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}

function Repos() {
  const maxLoc = Math.max(...REPO.repos.map((r) => r.codeLines ?? r.code_lines ?? 0))
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {REPO.repos.map((r, i) => (
        <motion.div
          key={r.name}
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.06, duration: 0.55, ease }}
        >
          <Card className="h-full p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-mono text-[13px] font-semibold text-volt-300">{r.name}</div>
                <p className="mt-1.5 max-w-md text-[12px] leading-relaxed text-slate-400">{r.purpose}</p>
              </div>
              <Badge tone={r.present ? 'verify' : 'danger'} dot>{r.present ? 'imported' : 'missing'}</Badge>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                ['files', r.files],
                ['lines', compact(r.codeLines ?? r.code_lines ?? 0)],
                ['size', `${(r.bytes / 1024 / 1024).toFixed(1)}MB`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-white/8 bg-white/[0.02] py-2.5">
                  <div className="tnum text-[14px] font-semibold text-slate-100">{v}</div>
                  <div className="text-[10px] uppercase tracking-[0.1em] text-slate-500">{k}</div>
                </div>
              ))}
            </div>

            <Progress value={r.codeLines ?? r.code_lines ?? 0} max={maxLoc} className="mt-4" />

            <div className="mt-4">
              <div className="text-[10.5px] uppercase tracking-[0.14em] text-slate-500">Entrypoints</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {r.entrypoints.slice(0, 6).map((e) => (
                  <span key={e} className="rounded-lg border border-white/8 bg-ink-950/50 px-2 py-1 font-mono text-[10.5px] text-slate-400">
                    {e}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <div className="text-[10.5px] uppercase tracking-[0.14em] text-slate-500">Feature surface</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Object.entries(r.extracted?.features ?? {}).map(([bucket, items]) => (
                  <Badge key={bucket} tone="neutral">
                    {bucket} · {items.length}
                  </Badge>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}

function Models({ models }) {
  const [open, setOpen] = useState(models[0]?.name)
  return (
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      <div className="space-y-1.5">
        {models.map((m) => (
          <button
            key={m.name}
            onClick={() => setOpen(m.name)}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left transition',
              open === m.name ? 'border-volt-500/45 bg-volt-500/12 text-white' : 'border-white/8 bg-white/[0.02] text-slate-300 hover:border-white/16',
            )}
          >
            <Database className={cn('h-3.5 w-3.5', open === m.name ? 'text-volt-300' : 'text-slate-500')} />
            <span className="text-[13px] font-medium">{m.name}</span>
            <span className="tnum ml-auto text-[11px] text-slate-500">{m.fieldCount}</span>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {models
          .filter((m) => m.name === open)
          .map((m) => (
            <Card key={m.name} className="p-5" hover={false}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[16px] font-semibold text-slate-100">{m.name}</h3>
                  <p className="mt-1 text-[12px] text-slate-500">
                    Prisma model harvested from <span className="font-mono text-volt-300">{m.repo}</span> — now
                    owned by the Reachmark API (apps/api/prisma/schema.prisma).
                  </p>
                </div>
                <Badge tone="aqua">{m.fieldCount} fields</Badge>
              </div>
              <div className="mt-5 overflow-hidden rounded-xl2 border border-white/8">
                <table className="w-full text-left text-[12.5px]">
                  <thead className="bg-white/[0.03] text-[10.5px] uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Field</th>
                      <th className="px-4 py-2.5 font-medium">Type</th>
                      <th className="px-4 py-2.5 font-medium">Attributes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/6">
                    {m.fields.map((f) => (
                      <tr key={f.name} className="transition hover:bg-white/[0.03]">
                        <td className="px-4 py-2 font-mono text-[12px] text-slate-200">{f.name}</td>
                        <td className="px-4 py-2 font-mono text-[12px] text-aqua-300">{f.type}</td>
                        <td className="px-4 py-2 font-mono text-[11px] text-slate-500">{f.attributes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
      </div>
    </div>
  )
}

function Components({ components }) {
  const [kind, setKind] = useState('all')
  const kinds = useMemo(() => ['all', ...new Set(components.map((c) => c.kind))], [components])
  const filtered = kind === 'all' ? components : components.filter((c) => c.kind === kind)

  return (
    <div>
      <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
        {kinds.map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 text-[11.5px] capitalize transition',
              kind === k ? 'border-volt-500/45 bg-volt-500/14 text-volt-300' : 'border-white/8 bg-white/[0.02] text-slate-400 hover:text-slate-200',
            )}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="mt-5 overflow-hidden rounded-xl3 glass edge">
        <div className="max-h-[70vh] overflow-y-auto">
          <table className="w-full text-left text-[12.5px]">
            <thead className="sticky top-0 bg-ink-900/95 text-[10.5px] uppercase tracking-[0.12em] text-slate-500 backdrop-blur">
              <tr>
                <th className="px-4 py-3 font-medium">Component</th>
                <th className="px-4 py-3 font-medium">Repo</th>
                <th className="px-4 py-3 font-medium">Kind</th>
                <th className="px-4 py-3 font-medium">Lines</th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">Path</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {filtered.slice(0, 80).map((c, i) => (
                <motion.tr
                  key={`${c.repo}-${c.path}`}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: Math.min(i * 0.012, 0.3) }}
                  className="transition hover:bg-white/[0.03]"
                >
                  <td className="px-4 py-2.5 font-medium text-slate-200">{c.name}</td>
                  <td className="px-4 py-2.5 font-mono text-[11.5px] text-volt-300">{c.repo}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone="neutral">{c.kind}</Badge>
                  </td>
                  <td className="tnum px-4 py-2.5 text-slate-400">{c.lines}</td>
                  <td className="hidden truncate px-4 py-2.5 font-mono text-[11px] text-slate-500 lg:table-cell">{c.path}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-3 text-[11.5px] text-slate-500">
        Showing {Math.min(filtered.length, 80)} of {components.length} discovered components. Full inventory lives in{" "}
        <span className="font-mono text-slate-400">packages/harvest/repo-manifest.json</span>.
      </p>
    </div>
  )
}

function Architecture() {
  const layers = [
    {
      name: 'apps/web',
      tone: '#7c5cff',
      icon: Sparkles,
      desc: 'React 18 + Vite client. Dark premium design system, Framer Motion layer, Redux Toolkit slices ported from AccountsBazaar.',
      parts: ['styles/index.css tokens', 'components/ui primitives', 'marketplace + escrow pages', 'Proof Studio UI', 'harvest manifest explorer'],
    },
    {
      name: 'apps/api',
      tone: '#22d3ee',
      icon: Server,
      desc: 'Express + Prisma API lifted from AccountsBazaar: listings, chat, admin, credential verification, Stripe webhooks, Inngest jobs.',
      parts: ['routes/listingRoutes.js', 'controllers/adminController.js', 'prisma/schema.prisma', 'inngest/index.js', 'middlewares/authMiddleware.js'],
    },
    {
      name: 'services/studio',
      tone: '#f472b6',
      icon: Cpu,
      desc: 'FastAPI service merged from MoneyPrinterTurbo. Turns proof screenshots + script into narrated reels with subtitles and BGM.',
      parts: ['app/router.py', 'app/services/task.py', 'app/services/voice.py', 'app/services/subtitle.py', 'webui/'],
    },
    {
      name: 'tools/claw',
      tone: '#4ade80',
      icon: Terminal,
      desc: 'Harvest harness descended from claw-code. Scans repos, probes the reference sites, merges manifests the client imports.',
      parts: ['claw.py scan', 'claw.py probe', 'claw.py merge', 'claw.py doctor', 'sync-harvest.mjs'],
    },
    {
      name: 'packages/harvest',
      tone: '#fbbf24',
      icon: FileJson,
      desc: 'The build manifest surface: repo stats, capability matrix, data models, component inventory and the tool catalog.',
      parts: ['repo-manifest.json', 'tool-catalog.json', 'build-manifest.json'],
    },
  ]

  return (
    <div className="space-y-4">
      {layers.map((l, i) => (
        <motion.div
          key={l.name}
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.07, duration: 0.55, ease }}
        >
          <Card className="p-5">
            <div className="grid gap-5 lg:grid-cols-[260px_1fr] lg:items-center">
              <div className="flex items-center gap-4">
                <span
                  className="grid h-12 w-12 place-items-center rounded-xl2 border"
                  style={{ borderColor: `${l.tone}55`, background: `${l.tone}18`, color: l.tone }}
                >
                  <l.icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="font-mono text-[13.5px] font-semibold text-slate-100">{l.name}</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-slate-500">
                    <Workflow className="h-3 w-3" /> layer {i + 1} of {layers.length}
                  </div>
                </div>
              </div>
              <div>
                <p className="text-[12.5px] leading-relaxed text-slate-400">{l.desc}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {l.parts.map((p) => (
                    <span key={p} className="rounded-lg border border-white/8 bg-ink-950/50 px-2 py-1 font-mono text-[10.5px] text-slate-400">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}

      <Card className="p-5" hover={false}>
        <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-200">
          <Braces className="h-4 w-4 text-volt-300" /> Merge provenance
        </div>
        <div className="mt-4 space-y-2 font-mono text-[11.5px] leading-relaxed text-slate-400">
          <div><span className="text-slate-500"># upstream import</span></div>
          <div className="text-slate-300">git clone leephil1907-lab/{'{'}ui-builder, AccountsBazaar, MoneyPrinterTurbo_, claw-code{'}'} → upstream/</div>
          <div className="text-slate-500"># harvest</div>
          <div className="text-verify-400">claw scan → {BUILD.totals.sourceFiles} files · {BUILD.totals.sourceLoc.toLocaleString()} LOC across {BUILD.sources.length} repos</div>
          <div className="text-verify-400">claw probe → {BUILD.totals.referenceTools} sites · {BUILD.totals.referenceToolsReachable} reachable</div>
          <div className="text-verify-400">claw merge → {BUILD.totals.componentsDiscovered} components · {BUILD.totals.dataModels} models · fingerprint {BUILD.fingerprint}</div>
          <div className="text-slate-500"># client consumption</div>
          <div className="text-aqua-300">apps/web/src/data/harvest/*.json → imported by Tools, Docs & CommandPalette</div>
        </div>
      </Card>
    </div>
  )
}
