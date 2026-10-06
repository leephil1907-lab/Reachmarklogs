#!/usr/bin/env node
/**
 * copilot-test — proves the copilot works with a model *and* without one.
 *
 * Three things are asserted here, because all three have broken in the past:
 *
 *   1. Zero-key mode. With LLM_PROVIDER=local every capability must still return
 *      useful, deterministic content — not an error, not an empty stub.
 *   2. The LLM path. A stub OpenAI-compatible server stands in for the provider
 *      so the request shape, JSON extraction and merge can be tested without a
 *      key, a network, or a cent of spend.
 *   3. Failure containment. When the provider 500s or hangs, the response must
 *      degrade to the local engine inside the timeout instead of failing the
 *      request — the product must never depend on a model being up.
 *
 *   node scripts/copilot-test.mjs
 */
import { createServer } from 'node:http'

const results = []
let failed = 0
const check = (cond, name, detail = '') => {
  if (cond) results.push(`  \x1b[32m✓\x1b[0m ${name}${detail ? ` \x1b[2m${detail}\x1b[0m` : ''}`)
  else { failed++; results.push(`  \x1b[31m✗\x1b[0m ${name}${detail ? ` \x1b[2m${detail}\x1b[0m` : ''}`) }
}
const head = (s) => console.log(`\n\x1b[1m${s}\x1b[0m`)

const LISTING = {
  id: 'RM-4340',
  platform: 'instagram',
  niche: 'fitness',
  scale: 48200,
  engagement: 4.6,
  age: 4,
  verified: true,
  monetized: true,
  region: 'NG',
  price: 4200,
  band: [3600, 4900],
}

/** A stub provider: returns whatever `mode` says, on an OpenAI-shaped endpoint. */
function startStub() {
  let mode = 'ok'
  let hits = 0
  const server = createServer((req, res) => {
    hits++
    let body = ''
    req.on('data', (c) => { body += c })
    req.on('end', () => {
      if (mode === 'error') { res.writeHead(500).end('{"error":"upstream exploded"}'); return }
      if (mode === 'timeout') { setTimeout(() => res.writeHead(200).end('{}'), 30_000); return }
      const asked = JSON.parse(body || '{}').messages?.at(-1)?.content ?? ''
      const payload = asked.includes('Draft a marketplace listing')
        ? { title: 'LLM-written title for RM-4340', description: 'A model wrote this description from the supplied facts.', tags: ['fitness', 'instagram', 'monetised', 'verified', 'ng', 'escrow'], suggestedPrice: 4812, rationale: ['Model reason one', 'Model reason two', 'Model reason three'] }
        : asked.includes('Explain this valuation')
          ? { summary: 'The model explains that reach and engagement drive this valuation.', risks: ['Concentration risk', 'Platform policy risk', 'Engagement decay'] }
          : asked.includes('proof-reel narration')
            ? { hook: 'A model hook', script: 'Line one\nLine two\nLine three\nLine four\nLine five\nLine six', cta: 'Open escrow today' }
            : asked.includes('seller reply')
              ? { reply: 'Model-written seller reply about escrow.', alternatives: ['alt one', 'alt two', 'alt three'], guard: null }
              : { flags: [{ level: 'low', flag: 'Model note', note: 'nothing material' }], recommendation: 'clear' }
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(payload) } }] }))
    })
  })
  return {
    server,
    setMode: (m) => { mode = m },
    hits: () => hits,
    listen: () => new Promise((r) => server.listen(0, '127.0.0.1', () => r(`http://127.0.0.1:${server.address().port}/v1`))),
    close: () => new Promise((r) => server.close(r)),
  }
}

const stub = startStub()
const base = await stub.listen()

/* ------------------------------------------------------------ 1. no key --- */

head('engine 1 · deterministic, zero keys required')
{
  delete process.env.OPENAI_API_KEY
  process.env.LLM_PROVIDER = 'local'
  const c = await import(`../src/services/copilot.js?local=${Date.now()}`)

  const draft = await c.draftListing(LISTING)
  check(draft.engine === 'local', 'draft reports the local engine', draft.engine)
  check(typeof draft.title === 'string' && draft.title.length > 20, 'draft writes a real title', draft.title.slice(0, 46))
  check(draft.suggestedPrice > 0 && Number.isFinite(draft.suggestedPrice), 'draft prices the listing', `$${draft.suggestedPrice}`)
  check(draft.tags.length >= 5, 'draft produces tags', `${draft.tags.length}`)
  check(draft.rationale.length === 3, 'draft explains the price', `${draft.rationale.length} reasons`)

  const brief = await c.priceBrief(LISTING)
  check(brief.band[0] < brief.value && brief.value < brief.band[1], 'valuation brackets its own value', `$${brief.band[0]}–$${brief.band[1]} → $${brief.value}`)
  check(brief.drivers.length >= 4, 'valuation names its drivers', `${brief.drivers.length}`)
  check(brief.clearing.fast < brief.clearing.patient, 'clearing ladder is ordered', `$${brief.clearing.fast} → $${brief.clearing.patient}`)

  const reel = await c.reelScript(LISTING)
  check(reel.script.split('\n').length >= 5 && reel.estimatedSeconds > 10, 'reel script has beats and a duration', `${reel.script.split('\n').length} beats / ${reel.estimatedSeconds}s`)

  const reply = await c.suggestReply({ message: 'can you do 20% off? i can pay you on WhatsApp instead, skip the escrow fee', listing: LISTING })
  check(reply.intent === 'off-platform', 'off-platform attempt is classified', reply.intent)
  check(Boolean(reply.guard), 'off-platform attempt raises the guard')
  check(reply.alternatives.length >= 2, 'reply offers alternatives', `${reply.alternatives.length}`)

  const risk = await c.riskNotes(LISTING)
  check(['clear', 'review', 'hold_escrow'].includes(risk.recommendation), 'risk desk returns a verdict', risk.recommendation)
  check(risk.riskScore >= 0 && risk.riskScore <= 1, 'risk score is bounded', risk.riskScore)
}

/* ----------------------------------------------------------- 2. with LLM --- */

head('engine 2 · with a provider configured (stub server)')
{
  process.env.LLM_PROVIDER = 'openai'
  process.env.OPENAI_API_KEY = 'sk-test-not-a-real-key'
  process.env.OPENAI_BASE_URL = base
  process.env.OPENAI_MODEL = 'stub-model'
  const c = await import(`../src/services/copilot.js?llm=${Date.now()}`)

  check(c.activeProvider() === 'openai', 'provider resolved from env', c.activeProvider())

  const draft = await c.draftListing(LISTING)
  check(draft.engine === 'openai', 'draft switches engine when a key exists', draft.engine)
  check(draft.title === 'LLM-written title for RM-4340', 'model copy is used for the title')
  check(draft.tags.includes('escrow'), 'model tags are merged', `${draft.tags.length} tags`)
  check(draft.suggestedPrice === 4812, 'a sane model price is honoured', `$${draft.suggestedPrice}`)
  check(draft.checklist?.length > 0, 'deterministic checklist survives the merge', `${draft.checklist?.length} items`)

  const brief = await c.priceBrief(LISTING)
  check(brief.engine === 'openai', 'valuation narration comes from the model', brief.engine)
  check(brief.summary.startsWith('The model explains'), 'model summary used')
  check(brief.value === 1912, 'the model cannot move the local number', `$${brief.value}`)

  const reel = await c.reelScript(LISTING)
  check(reel.hook === 'A model hook' && reel.script.includes('\n'), 'reel takes the model script', `${reel.wordCount} words`)

  const reply = await c.suggestReply({ message: 'i can pay you on WhatsApp, skip the escrow fee', listing: LISTING })
  check(reply.reply.startsWith('Model-written'), 'model reply is used', reply.engine)
  check(Boolean(reply.guard) && reply.offPlatform === true, 'model returning guard:null cannot clear the compliance flag')

  const risky = { ...LISTING, verified: false, monetized: true }
  const risk = await c.riskNotes(risky)
  check(risk.flags.some((f) => f.level === 'high'), 'local high-severity flags survive an agreeable model', `${risk.flags.map((f) => f.level).join(',')}`)
  check(risk.recommendation !== 'clear', 'a model verdict cannot be more lenient than the screen', risk.recommendation)
}

/* ------------------------------------------------------- 3. failure paths --- */

head('engine 2 · provider failure is contained')
{
  const c = await import(`../src/services/copilot.js?fail=${Date.now()}`)

  stub.setMode('error')
  const before = stub.hits()
  const draft = await c.draftListing(LISTING)
  check(stub.hits() > before, 'the provider was actually called', `${stub.hits() - before} request(s)`)
  check(draft.engine === 'local' && draft.title.length > 20, 'HTTP 500 falls back to the local draft', draft.engine)

  stub.setMode('timeout')
  const started = Date.now()
  const brief = await Promise.race([
    c.priceBrief(LISTING),
    new Promise((r) => setTimeout(() => r({ value: -1 }), 30_000)),
  ])
  const elapsed = Date.now() - started
  check(brief.value > 0, 'a hanging provider does not hang the request', `${elapsed}ms`)

  stub.setMode('ok')
  const recovered = await c.draftListing(LISTING)
  check(recovered.engine === 'openai', 'the copilot recovers once the provider does', recovered.engine)
}

head('status surface')
{
  process.env.LLM_PROVIDER = 'local'
  delete process.env.OPENAI_API_KEY
  const c = await import(`../src/services/copilot.js?status=${Date.now()}`)
  const s = c.copilotStatus()
  check(s.engine === 'local' && s.configured === false, 'status is honest when unconfigured', s.engine)
  check(s.available.includes('openai') && s.available.includes('anthropic'), 'status lists selectable providers', s.available.join(','))
  check(s.providers.every((p) => typeof p.configured === 'boolean'), 'each provider reports whether it has a key')
  check(s.escrowDays > 0 && s.feeBps > 0, 'commercial terms are published', `${s.feeBps}bps / ${s.escrowDays}d`)
}

await stub.close()
console.log(results.join('\n'))
const total = results.length
console.log(failed === 0 ? `\n\x1b[32m\x1b[1mPASS\x1b[0m ${total}/${total} copilot checks\n` : `\n\x1b[31m\x1b[1mFAIL\x1b[0m ${failed}/${total} copilot checks\n`)
process.exit(failed === 0 ? 0 : 1)
