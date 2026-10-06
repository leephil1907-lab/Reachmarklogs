import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Boxes, Code2, FileJson, GitMerge, Heart, Layers, Package, Scale,
  Sparkles, Terminal, Users,
} from 'lucide-react'
import { Badge, Button, Card, Counter, Reveal, SectionHead, Tabs, ease } from '../components/ui'
import { useState } from 'react'
import { compact } from '../lib/format'
import BUILD from '../data/harvest/build-manifest.json'
import REPO from '../data/harvest/repo-manifest.json'

const REPO_ROLES = {
  AccountsBazaar: {
    tone: '#7c5cff',
    role: 'The business logic',
    kept: ['Prisma schema (User, Listing, Chat, Message, Credential, Transaction, Withdrawal)', 'Express route/controller layer', 'Clerk auth + Stripe + Inngest jobs', 'Admin verification workflow', 'Short-poll chat model'],
    changed: ['Re-skinned end to end', 'Asset taxonomy widened from social-only to social + gaming + streaming + aged SaaS', 'Credential chain promoted from admin page to public trust surface'],
  },
  'ui-builder': {
    tone: '#22d3ee',
    role: 'The design system & wizard engine',
    kept: ['shadcn "new-york" base + Radix primitive set', 'Tailwind token layering', 'Multi-step wizard shell with live validation', 'Field registry / dynamic form idea', 'Card + hairline border treatment'],
    changed: ['Replaced the blockchain network pickers with platform/asset pickers', 'Design tokens re-ramped to the Reachmark dark-premium palette'],
  },
  MoneyPrinterTurbo_: {
    tone: '#f472b6',
    role: 'The proof-reel studio',
    kept: ['FastAPI app structure and /api/v1 routes', 'Task pipeline (script → TTS → subtitles → render)', 'edge-tts voice catalogue', 'BGM + material services', 'Scene/timeline vocabulary'],
    changed: ['Repointed at marketplace proof assets instead of stock footage', 'Heavy sample media pruned from the repo; add your own BGM'],
  },
  'claw-code': {
    tone: '#4ade80',
    role: 'The harvest harness',
    kept: ['Probe/manifest scripting patterns', 'Board + roadmap validation ideas', 'Doctor-style preflight checks', 'Repo-walking utilities'],
    changed: ['Re-targeted from agent-harness maintenance to build-manifest generation', 'Rewritten as a dependency-free Python CLI: tools/claw/claw.py'],
  },
}

export default function About() {
  const [tab, setTab] = useState('story')

  return (
    <div className="pt-24 sm:pt-28">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <SectionHead
          kicker="About this build"
          title="Four repositories, one marketplace"
          sub="Reachmark Logs is a merge, not a rewrite. The structure comes from AccountsBazaar, the interface language from ui-builder, the media pipeline from MoneyPrinterTurbo, and the analysis that ties them together from claw-code."
        />

        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Repositories merged', value: 4, icon: GitMerge },
            { label: 'Files clawed', value: BUILD.totals.sourceFiles, icon: FileJson },
            { label: 'Lines analysed', value: BUILD.totals.sourceLoc, icon: Code2 },
            { label: 'Reference tools indexed', value: BUILD.totals.referenceTools, icon: Layers },
          ].map((k, i) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07, duration: 0.55, ease }}>
              <Card className="p-5" hover={false}>
                <span className="grid h-9 w-9 place-items-center rounded-xl border border-volt-500/25 bg-volt-500/12 text-volt-300">
                  <k.icon className="h-4 w-4" />
                </span>
                <div className="mt-4 text-[24px] font-semibold text-slate-100">
                  <Counter to={k.value} />
                </div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{k.label}</div>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="mt-12">
          <Tabs
            tabs={[
              { id: 'story', label: 'The merge', icon: <GitMerge className="h-3.5 w-3.5" /> },
              { id: 'licences', label: 'Licences & credits', icon: <Scale className="h-3.5 w-3.5" /> },
              { id: 'roadmap', label: 'What is next', icon: <Sparkles className="h-3.5 w-3.5" /> },
            ]}
            value={tab}
            onChange={setTab}
          />

          <div className="mt-6">
            {tab === 'story' && (
              <div className="space-y-5">
                {REPO.repos.map((repo) => {
                  const meta = REPO_ROLES[repo.name]
                  return (
                    <motion.div key={repo.name} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.55, ease }}>
                      <Card className="p-6" hover={false}>
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <span
                              className="grid h-12 w-12 place-items-center rounded-xl2 border font-mono text-[15px] font-bold"
                              style={{ borderColor: `${meta.tone}55`, background: `${meta.tone}18`, color: meta.tone }}
                            >
                              {repo.name.slice(0, 2)}
                            </span>
                            <div>
                              <div className="font-mono text-[14px] font-semibold text-slate-100">{repo.name}</div>
                              <div className="text-[11.5px] text-slate-500">{meta.role}</div>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone="neutral">{repo.files} files</Badge>
                            <Badge tone="aqua">{compact(repo.codeLines)} LOC</Badge>
                            <Badge tone="volt">imported</Badge>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-5 lg:grid-cols-2">
                          <div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-verify-400">Kept</div>
                            <ul className="mt-3 space-y-2">
                              {meta.kept.map((k) => (
                                <li key={k} className="flex items-start gap-2 text-[12.5px] text-slate-300">
                                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-verify-400" />
                                  {k}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-warn-400">Changed for Reachmark</div>
                            <ul className="mt-3 space-y-2">
                              {meta.changed.map((k) => (
                                <li key={k} className="flex items-start gap-2 text-[12.5px] text-slate-400">
                                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-warn-400" />
                                  {k}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            )}

            {tab === 'licences' && (
              <div className="grid gap-5 lg:grid-cols-2">
                <Card className="p-6" hover={false}>
                  <div className="flex items-center gap-2 text-[15px] font-semibold text-slate-100">
                    <Scale className="h-4 w-4 text-volt-300" /> Licensing
                  </div>
                  <p className="mt-3 text-[12.5px] leading-relaxed text-slate-400">
                    All four upstream repositories ship under permissive licences (MIT). Reachmark Logs keeps every
                    original copyright notice in place under{" "}
                    <span className="font-mono text-slate-300">upstream/</span>, and the merged application code is
                    released under MIT.
                  </p>
                  <div className="mt-5 space-y-2">
                    {REPO.repos.map((r) => (
                      <div key={r.name} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] px-3.5 py-2.5">
                        <span className="font-mono text-[12px] text-slate-300">{r.name}</span>
                        <Badge tone="verify">MIT</Badge>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-6" hover={false}>
                  <div className="flex items-center gap-2 text-[15px] font-semibold text-slate-100">
                    <Heart className="h-4 w-4 text-magenta-400" /> Credits
                  </div>
                  <ul className="mt-3 space-y-2.5 text-[12.5px] text-slate-400">
                    <li>• <span className="text-slate-300">AccountsBazaar</span> — marketplace schema, controllers and the credential workflow this project is modelled on.</li>
                    <li>• <span className="text-slate-300">OpenZeppelin ui-builder</span> — the card, wizard and form patterns that define how Reachmark feels to use.</li>
                    <li>• <span className="text-slate-300">MoneyPrinterTurbo</span> — the FastAPI render pipeline behind the Proof Studio.</li>
                    <li>• <span className="text-slate-300">claw-code</span> — the agent-harness scripting patterns the harvest CLI descends from.</li>
                    <li>• <span className="text-slate-300">50 reference tools</span> — the design, asset and utility sites indexed on the tool library page.</li>
                  </ul>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {['React 18', 'Vite 6', 'Tailwind v4', 'Framer Motion', 'Redux Toolkit', 'Express', 'Prisma', 'FastAPI'].map((t) => (
                      <span key={t} className="rounded-lg border border-white/8 bg-ink-950/50 px-2 py-1 font-mono text-[10.5px] text-slate-400">
                        {t}
                      </span>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {tab === 'roadmap' && (
              <div className="grid gap-5 lg:grid-cols-3">
                {[
                  {
                    label: 'Now',
                    tone: 'verify',
                    items: [
                      'Escrow engine backed by the Node API + Stripe',
                      'Credential chain written to Postgres, not local state',
                      'Proof Studio posting real render jobs to the FastAPI service',
                      'Ops queue wired to the Inngest worker',
                    ],
                  },
                  {
                    label: 'Next',
                    tone: 'aqua',
                    items: [
                      'LLM listing copilot (draft title, description, pricing rationale)',
                      'Automated duplicate-proof detection at upload time',
                      'Multi-currency payouts and tax statements',
                      'Public Reachmark API: search, escrow, webhooks',
                    ],
                  },
                  {
                    label: 'Later',
                    tone: 'volt',
                    items: [
                      'Portfolio analytics for buyers running a book of logs',
                      'Escrow insurance tiers priced per asset class',
                      'Desktop capture agent for one-click ownership tests',
                      'Marketplace liquidity score per platform/niche',
                    ],
                  },
                ].map((col, i) => (
                  <motion.div key={col.label} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.55, ease }}>
                    <Card className="h-full p-6" hover={false}>
                      <Badge tone={col.tone} dot>{col.label}</Badge>
                      <ul className="mt-5 space-y-3">
                        {col.items.map((it) => (
                          <li key={it} className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-slate-300">
                            <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
                            {it}
                          </li>
                        ))}
                      </ul>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        <Reveal delay={0.1}>
          <div className="mt-16 flex flex-wrap items-center justify-between gap-6 rounded-[1.8rem] border border-white/10 bg-[linear-gradient(120deg,rgba(124,92,255,.16),rgba(34,211,238,.08))] p-8">
            <div>
              <h3 className="text-[19px]">Want to see the machinery?</h3>
              <p className="mt-2 max-w-xl text-[13px] text-slate-300/90">
                The build manifest page exposes the full harvest: repo stats, capability matrix, component inventory
                and every data model the merge inherited.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/docs">
                <Button>
                  <Boxes className="h-4 w-4" /> Build manifest
                </Button>
              </Link>
              <Link to="/tools">
                <Button variant="ghost">
                  <Users className="h-4 w-4" /> Tool library
                </Button>
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  )
}
