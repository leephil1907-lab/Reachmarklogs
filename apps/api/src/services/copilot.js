/**
 * copilot — the Reachmark listing copilot (server host).
 *
 * The deterministic half of this service now lives in the shared workspace
 * package `@reachmark/copilot`, because the browser runs the very same engine
 * when `VITE_API_MODE=local`. This file adds what only the server can do: call an
 * LLM, merge its copy over the deterministic numbers, and contain its failures.
 *
 * Design rule, unchanged: the copilot must never be the reason the product is
 * unusable. If the provider 500s, hangs past the timeout, or returns nonsense,
 * the deterministic engine answers and `engine` says so.
 */
import {
  configure as configureEngine,
  compact,
  usd,
  estimateFairValue,
  localListingDraft,
  localPriceBrief,
  localReelScript,
  localReply,
  localRiskNotes,
  classifyIntent,
} from '@reachmark/copilot'

// Feed the engine the commercial terms this deployment actually charges.
configureEngine({
  feeBps: Number(process.env.REACHMARK_FEE_BPS ?? 750),
  escrowDays: Number(process.env.ESCROW_DEFAULT_DAYS ?? 7),
})

export {
  compact,
  usd,
  estimateFairValue,
  localListingDraft,
  localPriceBrief,
  localReelScript,
  localReply,
  localRiskNotes,
  classifyIntent,
}

const FEE_BPS = () => Number(process.env.REACHMARK_FEE_BPS ?? 750)
const ESCROW_DAYS = () => Number(process.env.ESCROW_DEFAULT_DAYS ?? 7)
const clean = (s = '') => String(s).replace(/\s+/g, ' ').trim()

/* ------------------------------------------------------------- LLM engine - */

const PROVIDERS = {
  openai: {
    key: () => process.env.OPENAI_API_KEY,
    // Base URLs are overridable so the LLM path can be exercised end to end
    // against a local mock (see scripts/copilot-test.mjs) or an Azure/self-hosted
    // gateway, without touching product code.
    url: () => `${process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1'}/chat/completions`,
    model: () => process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    body: (model, system, user) => ({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.5,
      response_format: { type: 'json_object' },
    }),
    headers: (key) => ({ Authorization: `Bearer ${key}` }),
    extract: (j) => j.choices?.[0]?.message?.content,
  },
  openrouter: {
    key: () => process.env.OPENROUTER_API_KEY,
    url: () => `${process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1'}/chat/completions`,
    model: () => process.env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini',
    body: (model, system, user) => ({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.5,
      response_format: { type: 'json_object' },
    }),
    headers: (key) => ({ Authorization: `Bearer ${key}` }),
    extract: (j) => j.choices?.[0]?.message?.content,
  },
  anthropic: {
    key: () => process.env.ANTHROPIC_API_KEY,
    url: () => `${process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com/v1'}/messages`,
    model: () => process.env.ANTHROPIC_MODEL ?? 'claude-3-5-haiku-latest',
    body: (model, system, user) => ({
      model,
      max_tokens: 1400,
      system,
      messages: [{ role: 'user', content: user }],
    }),
    headers: (key) => ({ 'x-api-key': key, 'anthropic-version': '2023-06-01' }),
    extract: (j) => j.content?.map((c) => c.text ?? '').join(''),
  },
}

export function providerCatalog() {
  return Object.entries(PROVIDERS).map(([id, p]) => ({ id, url: p.url(), model: p.model(), configured: Boolean(p.key()) }))
}

export function activeProvider() {
  const explicit = (process.env.LLM_PROVIDER ?? 'local').toLowerCase()
  if (explicit === 'local') return 'local'
  if (PROVIDERS[explicit]?.key()) return explicit
  // Auto-detect when LLM_PROVIDER is left on "auto" (or mis-set) but a key exists.
  if (explicit === 'auto') {
    const found = Object.entries(PROVIDERS).find(([, p]) => p.key())
    if (found) return found[0]
  }
  return 'local'
}

async function callLLM(system, user, { timeoutMs = 20_000 } = {}) {
  const name = activeProvider()
  if (name === 'local') return null
  const provider = PROVIDERS[name]

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(provider.url(), {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...provider.headers(provider.key()) },
      body: JSON.stringify(provider.body(provider.model(), system, user)),
    })
    if (!res.ok) throw new Error(`${name} HTTP ${res.status}`)
    const json = await res.json()
    const text = provider.extract(json)
    if (!text) throw new Error('empty completion')
    // Strip markdown fences if the model ignored the JSON instruction.
    const cleaned = text.replace(/```json|```/g, '').trim()
    return JSON.parse(cleaned)
  } catch (err) {
    console.warn(`[copilot] ${name} failed (${err.message}); falling back to the local engine`)
    return null
  } finally {
    clearTimeout(timer)
  }
}

const SYSTEM = `You are the Reachmark Logs listing copilot. Reachmark is an escrow-protected marketplace for digital logs (social, gaming, streaming, aged SaaS/mail accounts).
Rules you must never break:
- Never invent metrics. Use only the figures supplied in the payload.
- Never promise a transfer is safe or legal; the escrow protocol and the 7-day warranty are the only guarantees.
- Never move payment off-platform; escrow is mandatory.
- Prices are USD. Be specific and terse. No hype adjectives, no exclamation marks.
- Return ONLY JSON matching the requested keys.`

/* ------------------------------------------------------------- public API - */

export async function draftListing(input) {
  const local = localListingDraft(input)
  const inv = await callLLM(
    SYSTEM,
    `Draft a marketplace listing from this payload and return JSON with keys: title (max 96 chars), description (2-4 sentences, factual), tags (5-7 lowercase), suggestedPrice (number), rationale (3 short strings).

Payload: ${JSON.stringify(input)}`,
  )
  if (!inv) return { ...local, engine: 'local' }

  // Merge: trust the model for copy, trust the local model for numbers unless it
  // produced something sane. That keeps valuation reproducible across engines.
  const suggestedPrice = Number(inv.suggestedPrice)
  return {
    ...local,
    title: typeof inv.title === 'string' ? inv.title.slice(0, 96) : local.title,
    description: typeof inv.description === 'string' ? clean(inv.description) : local.description,
    tags: Array.isArray(inv.tags) && inv.tags.length ? inv.tags.slice(0, 7).map((t) => String(t).toLowerCase()) : local.tags,
    suggestedPrice: Number.isFinite(suggestedPrice) && suggestedPrice > 0 ? Math.round(suggestedPrice) : local.suggestedPrice,
    rationale: Array.isArray(inv.rationale) && inv.rationale.length ? inv.rationale.slice(0, 3).map(String) : local.rationale,
    engine: activeProvider(),
  }
}

export async function priceBrief(input) {
  const local = localPriceBrief(input)
  const inv = await callLLM(
    SYSTEM,
    `Explain this valuation in one paragraph and return JSON with keys: summary (string), risks (3 short strings).
Payload: ${JSON.stringify({ ...input, modelValue: local.value, band: local.band })}`,
  )
  if (!inv) return { ...local, engine: 'local' }
  return {
    ...local,
    summary: typeof inv.summary === 'string' ? clean(inv.summary) : local.summary,
    risks: Array.isArray(inv.risks) ? inv.risks.slice(0, 3).map(String) : undefined,
    engine: activeProvider(),
  }
}

export async function reelScript(input) {
  const local = localReelScript(input)
  const inv = await callLLM(
    SYSTEM,
    `Write a 40-second proof-reel narration and return JSON with keys: hook (string), script (string, 6 short lines separated by newlines), cta (string).
Payload: ${JSON.stringify(input)}`,
  )
  if (!inv) return { ...local, engine: 'local' }
  const script = typeof inv.script === 'string' ? inv.script.replace(/\\n/g, '\n') : local.script
  const words = script.split(/\s+/).length
  return {
    ...local,
    hook: typeof inv.hook === 'string' ? clean(inv.hook) : local.hook,
    script,
    cta: typeof inv.cta === 'string' ? clean(inv.cta) : local.cta,
    wordCount: words,
    estimatedSeconds: Math.max(12, Math.round((words / 165) * 60)),
    engine: activeProvider(),
  }
}

export async function suggestReply(input) {
  const local = localReply(input)
  const inv = await callLLM(
    SYSTEM,
    `Suggest a seller reply to this escrow-thread message and return JSON with keys: reply (string, max 60 words), alternatives (3 strings), guard (string or null if the buyer tried to move payment off-platform).
Payload: ${JSON.stringify(input)}`,
  )
  if (!inv) return { ...local, engine: 'local' }
  return {
    ...local,
    reply: typeof inv.reply === 'string' ? clean(inv.reply) : local.reply,
    alternatives: Array.isArray(inv.alternatives) && inv.alternatives.length ? inv.alternatives.slice(0, 3).map(clean) : local.alternatives,
    // The compliance guard is not the model's to remove. The deterministic
    // classifier decides whether payment was pushed off-platform; a model may
    // only *add* a guard, never clear one (it returns `null` by default, which
    // used to wipe the flag the moment an API key was configured).
    guard: local.guard ?? (typeof inv.guard === 'string' ? clean(inv.guard) : null),
    offPlatform: local.offPlatform || Boolean(local.guard),
    engine: activeProvider(),
  }
}

export async function riskNotes(listing) {
  const local = localRiskNotes(listing)
  const inv = await callLLM(
    SYSTEM,
    `Assess this listing for the ops desk and return JSON with keys: flags (array of {level: low|medium|high, flag, note}), recommendation (clear|review|hold_escrow).
Payload: ${JSON.stringify(listing)}`,
  )
  if (!inv) return { ...local, engine: 'local' }
  const valid = ['low', 'medium', 'high']
  const flags = Array.isArray(inv.flags)
    ? inv.flags
        .filter((f) => f && valid.includes(String(f.level)))
        .slice(0, 6)
        .map((f) => ({ level: String(f.level), flag: clean(f.flag ?? 'Signal'), note: clean(f.note ?? '') }))
    : local.flags
  // A model may add scrutiny but never remove it: any local high-severity flag is
  // retained, and the stricter of the two verdicts wins. Otherwise one agreeable
  // completion could clear a listing the deterministic screen wanted held.
  const RANK = { clear: 0, review: 1, hold_escrow: 2 }
  const merged = [...flags]
  for (const f of local.flags) {
    if (f.level === 'high' && !merged.some((m) => m.flag === f.flag)) merged.push(f)
  }
  const modelVerdict = ['clear', 'review', 'hold_escrow'].includes(inv.recommendation) ? inv.recommendation : local.recommendation
  const recommendation = RANK[modelVerdict] >= RANK[local.recommendation] ? modelVerdict : local.recommendation
  return {
    riskScore: Math.min(1, merged.reduce((a, f) => a + ({ high: 0.42, medium: 0.22, low: 0.06 })[f.level] ?? 0, 0)),
    flags: merged.slice(0, 7),
    recommendation,
    engine: activeProvider(),
  }
}

export const copilotStatus = () => ({
  engine: activeProvider(),
  provider: activeProvider(),
  configured: activeProvider() !== 'local',
  available: providerCatalog().map((p) => p.id),
  providers: providerCatalog(),
  fallback: 'local deterministic engine (always available, no key required)',
  // Commercial terms the copilot quotes, lifted to the top level so the UI does
  // not have to reach into `valuationModel` to render an escrow badge.
  feeBps: FEE_BPS(),
  escrowDays: ESCROW_DAYS(),
  valuationModel: { feeBps: FEE_BPS(), escrowDays: ESCROW_DAYS() },
})
