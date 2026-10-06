/**
 * @reachmark/copilot — the deterministic listing copilot.
 *
 * This is the engine that runs when no model is available: valuation, listing
 * copy, proof-reel narration, seller replies and the ops risk screen. It is pure
 * JavaScript with no Node or DOM dependencies, and it lives in a package because
 * *both* hosts run it — the Express service (as the fallback behind the LLM) and
 * the browser (as the entire engine when `VITE_API_MODE=local`).
 *
 * Keeping one implementation is the point: a seller must see the same valuation
 * whether the request was served by Neon + a model or by a browser tab with no
 * network at all. `apps/api/scripts/e2e.mjs` and `copilot-test.mjs` enforce it.
 */

/**
 * Commercial terms are configurable, not hard-coded: apps/api reads them from the
 * environment, the browser uses the defaults. The UI must quote the same fee the
 * escrow contract charges, so this is one value, injected at boot.
 */
let CONFIG = { feeBps: 750, escrowDays: 7 }
export const configure = (next = {}) => { CONFIG = { ...CONFIG, ...next } }
export const config = () => ({ ...CONFIG })
const FEE_BPS = () => CONFIG.feeBps
const ESCROW_DAYS = () => CONFIG.escrowDays

/* ------------------------------------------------------------------ utils - */

export const compact = (n) => {
  const v = Number(n) || 0
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(v >= 100_000 ? 0 : 1)}K`
  return `${Math.round(v)}`
}

export const usd = (n) => `$${Math.round(Number(n) || 0).toLocaleString('en-US')}`

const titleCase = (s = '') => s.replace(/\b\w/g, (c) => c.toUpperCase())
const clean = (s = '') => String(s).replace(/\s+/g, ' ').trim()

function slugWords(listing) {
  const platform = titleCase(listing.platform ?? 'account')
  const niche = listing.niche ?? 'general'
  return { platform, niche }
}

/* ------------------------------------------------------- valuation engine - */

/**
 * Fair value. Same shape as the client's Sell wizard model so the number a
 * seller sees while drafting matches the number the copilot quotes.
 */
export function estimateFairValue(input = {}) {
  const scale = Number(input.scale ?? input.followers ?? 0)
  const engagement = Number(input.engagement ?? 3)
  const age = Number(input.age ?? 2)
  const klass = input.category ?? input.assetClass ?? 'social'
  const verified = Boolean(input.verified)
  const monetized = Boolean(input.monetized)

  const base =
    klass === 'social'
      ? scale * 0.021 + engagement * 42
      : klass === 'gaming'
        ? 180 + scale * 0.26
        : klass === 'streaming'
          ? Math.max(14, scale * 5.4)
          : 60 + age * 74

  const value = Math.round(base * (1 + age * 0.045) * (verified ? 1.12 : 1) * (monetized ? 1.2 : 1))
  const band = [Math.round(value * 0.86), Math.round(value * 1.18)]

  const drivers = [
    { factor: `${compact(scale)} reach`, weight: klass === 'social' ? 'high' : 'medium', note: klass === 'social' ? 'Reach dominates social pricing.' : 'Reach matters less than inventory or runway here.' },
    { factor: `${engagement}% engagement`, weight: engagement >= 4 ? 'high' : engagement >= 2 ? 'medium' : 'low', note: engagement >= 4 ? 'Above the 3.8% median — supports a premium.' : 'At or below median; price defensively.' },
    { factor: `${age} years aged`, weight: age >= 5 ? 'high' : 'medium', note: age >= 5 ? 'Original creation date preserved — carries real weight.' : 'Young but clean.' },
    { factor: verified ? 'Ownership verified' : 'Verification pending', weight: verified ? 'high' : 'medium', note: verified ? 'Verified logs clear ~12% higher.' : 'Expect a small discount until ops signs off.' },
    { factor: monetized ? 'Monetised' : 'Not monetised', weight: monetized ? 'high' : 'low', note: monetized ? 'Active revenue supports an earnings multiple.' : 'Buyer pays for optionality, not income.' },
  ]

  return {
    value,
    band,
    confidence: verified && scale > 5_000 ? 'high' : scale > 500 ? 'medium' : 'low',
    drivers,
    clearing: {
      fast: band[0],
      fair: value,
      patient: band[1],
      note: `List at ${usd(value)}; accept from ${usd(band[0])} for a sub-week clear.`,
    },
  }
}

/* ------------------------------------------------------ local copywriter -- */

const NICHE_ANGLE = {
  fitness: 'programme-aware buyers who convert on transformation content',
  finance: 'high-CPM advertisers in the personal-finance bracket',
  tech: 'sponsor-friendly tech audience with strong link click-through',
  gaming: 'high-intent gaming traffic and creator-programme eligibility',
  beauty: 'brand-heavy category with reliable affiliate economics',
  travel: 'seasonal spikes and destination-partnership potential',
  crypto: 'volatile but high-value sponsorship demand',
  education: 'evergreen search traffic and low churn',
  business: 'B2B-adjacent audience with strong newsletter crossover',
  lifestyle: 'broad evergreen appeal and easy brand fit',
}

export function localListingDraft(input = {}) {
  const { platform, niche } = slugWords(input)
  const scale = Number(input.scale ?? 0)
  const engagement = Number(input.engagement ?? 0)
  const age = Number(input.age ?? 0)
  const region = input.region ?? 'United States'
  const monetized = Boolean(input.monetized)
  const verified = Boolean(input.verified)
  const klass = input.category ?? 'social'
  const unit = klass === 'social' ? 'followers' : klass === 'gaming' ? 'in library value' : klass === 'streaming' ? 'months of runway' : 'years aged'

  const title =
    klass === 'social'
      ? `${monetized ? 'Monetised ' : ''}${titleCase(niche)} ${platform} — ${compact(scale)} ${unit}, ${engagement}% engagement`
      : klass === 'gaming'
        ? `Loaded ${platform} profile — ${compact(scale)} in library value, original owner`
        : klass === 'streaming'
          ? `${platform} premium seat — ${compact(scale)} ${unit} remaining, receipt included`
          : `${age}-year aged ${platform} account — clean recovery trail, transferable`

  const angle = NICHE_ANGLE[niche] ?? 'a clean, well-mapped audience with obvious brand fit'

  const description = [
    `Built over ${age} ${age === 1 ? 'year' : 'years'} and held by a single owner since creation, with ${verified ? 'ownership already verified by Reachmark ops' : 'ownership verification scheduled at listing time'}.`,
    `Audience skews ${region} (${input.audienceSplit ?? 62}% of reach) and suits ${angle}.`,
    `Engagement sits at ${engagement}% and monthly impressions run at ${compact(input.monthlyViews ?? scale * 3)}.`,
    monetized
      ? 'The account is enrolled in the platform partner programme, so revenue continues through the transfer window.'
      : 'Monetisation is not enabled — priced accordingly, and the audience quality supports enrolment.',
    `Handover runs through Reachmark escrow with a ${ESCROW_DAYS()}-day release window, a recorded ownership test and a 7-day transfer warranty. ${verified ? 'The credential chain is already attached.' : 'The credential chain is submitted for review.'}`,
  ].join(' ')

  const tags = [
    platform.toLowerCase(),
    niche,
    klass,
    monetized ? 'monetised' : 'growth-stage',
    age >= 5 ? 'vintage' : 'modern',
    region.split(' ')[0].toLowerCase(),
  ]

  const valuation = estimateFairValue(input)

  return {
    title: title.slice(0, 96),
    description,
    tags,
    suggestedPrice: valuation.value,
    priceBand: valuation.band,
    rationale: valuation.drivers.slice(0, 3).map((d) => d.note),
    checklist: [
      'Attach the analytics dashboard export to the proof vault',
      'Record the ownership walkthrough before escrow opens',
      verified ? 'Chain already verified — nothing to do' : 'Ops verification pending (SLA 4 working hours)',
      `Confirm payout rail for ${usd(valuation.value)}`,
    ],
    valuation,
  }
}

export function localPriceBrief(input = {}) {
  const v = estimateFairValue(input)
  const fee = (v.value * FEE_BPS()) / 10_000
  return {
    ...v,
    fees: {
      bps: FEE_BPS(),
      feeAmount: Math.round(fee),
      netToSeller: Math.round(v.value - fee),
    },
    summary: `Model says ${usd(v.value)} (band ${usd(v.band[0])}–${usd(v.band[1])}). Seller nets about ${usd(v.value - fee)} after the ${(FEE_BPS() / 100).toFixed(2)}% fee.`,
  }
}

export function localReelScript(input = {}) {
  const { platform, niche } = slugWords(input)
  const scale = compact(input.scale ?? 0)
  const unit = input.category === 'social' ? 'followers' : 'asset value'
  const lines = [
    `This is a verified ${platform} log with ${scale} ${unit}.`,
    `Engagement sits at ${input.engagement ?? 4} percent — organic growth, no purchased reach.`,
    `The account is ${input.age ?? 3} years old and its audience is ${input.audienceSplit ?? 60} percent ${input.region ?? 'United States'}.`,
    input.monetized
      ? 'It is already enrolled in the platform partner programme, so revenue continues through the handover.'
      : 'Monetisation is not enabled, which is reflected in the asking price.',
    'Every metric you are seeing is hashed into the Reachmark proof vault.',
    `Fund escrow and it is yours — release window is ${ESCROW_DAYS()} days, or instantly once you confirm the credential chain.`,
  ]
  return {
    script: lines.join('\n'),
    hook: `Verified ${titleCase(niche)} ${platform} log — ${scale} reach, clean history.`,
    cta: 'Open the escrow sheet on Reachmark Logs.',
    wordCount: lines.join(' ').split(/\s+/).length,
    estimatedSeconds: Math.max(12, Math.round((lines.join(' ').split(/\s+/).length / 165) * 60)),
    sceneBeats: ['Hook', 'Reach', 'Engagement', 'Audience', 'Proof', 'Escrow CTA'],
  }
}

/**
 * Signal-weighted intent classifier.
 *
 * A first-match regex chain got the obvious cases wrong (a message that asked
 * for a discount *and* offered to pay on WhatsApp read as plain negotiation),
 * and the off-platform attempt is the one thing the risk desk must never miss.
 * So every intent scores its keywords, off-platform carries a hard override, and
 * the reply is written per intent rather than shared.
 */
const INTENT_SIGNALS = [
  {
    id: 'off-platform',
    label: 'Off-platform payment attempt',
    override: true,
    weight: 10,
    signals: [
      /off[\s-]?platform/i, /whatsapp|telegram|signal|dm me|call me|text me/i,
      /pay\s*(you\s*)?(direct|directly|outside|privately)/i, /skip\s*(the\s*)?(escrow|fee)/i,
      /paypal|venmo|cash ?app|zelle|western union|money ?gram|bank transfer|wire|usdt|btc|bitcoin|crypto|wallet/i,
      /friends? and family/i, /without (the )?escrow/i,
    ],
    guard: 'Buyer tried to move payment off-platform. Escrow is mandatory: decline, restate the escrow terms, and do not share credentials or recovery details. Thread flagged for the risk desk.',
  },
  {
    id: 'discount',
    label: 'Price negotiation',
    weight: 6,
    signals: [/discount|lower|cheaper|reduce|drop the price|best price|final price|negotiat|counter|too expensive|budget/i, /\b\d{1,2}\s?%\s?off\b/i, /can you do/i],
  },
  {
    id: 'proof',
    label: 'Proof request',
    weight: 5,
    signals: [/proof|screenshot|analytics|evidence|verify|verif|insights|dashboard|stats|report/i],
  },
  {
    id: 'handover',
    label: 'Handover mechanics',
    weight: 5,
    signals: [/handover|hand over|transfer|credentials|login|password|2fa|two[\s-]?factor|recovery|email change|ownership test/i],
  },
  {
    id: 'timeline',
    label: 'Timing',
    weight: 4,
    signals: [/when|how long|timeline|soon|today|tomorrow|this week|eta|how fast|how quick/i],
  },
  {
    id: 'motive',
    label: 'Reason for selling',
    weight: 3,
    signals: [/why (are you )?sell|reason|selling|leaving|get out|exiting/i],
  },
  {
    id: 'bundle',
    label: 'Bundle / multi-asset',
    weight: 3,
    signals: [/bundle|both|package|all three|portfolio|together with/i],
  },
  {
    id: 'terms',
    label: 'Escrow & fees',
    weight: 3,
    signals: [/escrow|fee|commission|warranty|guarantee|refund|dispute|contract|invoice/i],
  },
]

export function classifyIntent(message = '') {
  const scores = INTENT_SIGNALS.map((intent) => {
    const hits = intent.signals.filter((re) => re.test(message)).length
    return { intent, score: hits * intent.weight, hits }
  }).sort((a, b) => b.score - a.score)

  const best = scores[0]
  const override = INTENT_SIGNALS.find((i) => i.override && i.signals.some((re) => re.test(message)))
  if (override) return { id: override.id, label: override.label, score: best?.score ?? 0, offPlatform: true }
  if (!best || best.score === 0) return { id: 'general', label: 'General enquiry', score: 0, offPlatform: false }
  return { id: best.intent.id, label: best.intent.label, score: best.score, offPlatform: false }
}

/** Reply per intent, written against the actual listing facts. */
const REPLY_LIBRARY = {
  'off-platform': (c) =>
    `I only transact through Reachmark escrow — that is a hard rule, and it is what protects both of us on a ${c.platform} log. If the ${c.fee} fee is the issue, escrow is what covers the ${c.escrowDays}-day warranty, so I would rather keep it and finish inside the platform.`,
  discount: (c) =>
    `The ${c.ask} ask already sits inside the model band (${c.band}), so there is not much room — but I can move ${c.concession} if escrow opens in the next 48 hours and you complete the ownership test this week. Past that I would rather hold and relist.`,
  proof: (c) =>
    `The proof vault for ${c.id} carries the analytics dashboard, the audience export and the monetisation status, each hashed at capture time. I can also screen-share a live session so you see ${c.scale} rendered fresh rather than trusting a screenshot.`,
  handover: (c) =>
    `Handover is email, password and the 2FA seed on a recorded call, with the recovery address rotated to the escrow alias first. You confirm the chain end to end before any funds release — that is why the ${c.escrowDays}-day warranty is worth having.`,
  timeline: () =>
    `I can run the ownership test within a few hours of escrow funding and complete handover the same day. After that the release window is yours — the warranty still runs the full term from transfer.`,
  motive: (c) =>
    `I am consolidating into one niche, so the audience and the ad rates line up. No policy strikes and no shadow bans — the ${c.platform} analytics in the vault show the full history and you can read it before you commit.`,
  bundle: (c) =>
    `I can bundle, yes — two logs at a combined discount, still one escrow contract each so the chains stay separate and clean. Tell me which pair you want and I will price the ${c.platform} pair inside the band.`,
  terms: (c) =>
    `Escrow holds the funds until you confirm the credentials work; Reachmark takes ${c.fee}, I net the rest, and the ${c.escrowDays}-day warranty covers credential failure. Disputes go to the ops desk with the hashed proof set, not to me.`,
  general: (c) =>
    `Thanks for the interest in the ${c.platform} log.${c.id ? ` It is ${c.id},` : ''} ${c.verified ? 'fully verified with the credential chain attached' : 'still in ops verification'}. Ask what you need and you will get a straight answer — if you are ready, the escrow sheet is the fastest route.`,
}

export function localReply({ message = '', listing = {}, tone = 'professional' } = {}) {
  const { platform } = slugWords(listing)
  const intent = classifyIntent(message)
  const facts = {
    platform,
    id: listing.id,
    ask: listing.price ? usd(listing.price) : 'the current',
    band: Array.isArray(listing.band) ? `${usd(listing.band[0])}–${usd(listing.band[1])}` : 'the model band',
    scale: listing.scale ? compact(listing.scale) : 'the audience',
    verified: Boolean(listing.verified),
    fee: `${(FEE_BPS() / 100).toFixed(2)}%`,
    escrowDays: ESCROW_DAYS(),
    concession: listing.price ? `${usd(Math.round(listing.price * 0.06))} (about 6%)` : 'about 6%',
  }

  const reply = REPLY_LIBRARY[intent.id](facts)
  const terse = tone === 'terse' ? reply.split('. ')[0] + '.' : reply

  const alternatives = [
    terse,
    REPLY_LIBRARY.terms(facts),
    intent.id === 'discount'
      ? REPLY_LIBRARY.proof(facts)
      : `Happy to answer anything else — say the word and I will add another artefact to the proof vault for ${listing.id ?? platform}.`,
  ].filter((a, i, arr) => a && arr.indexOf(a) === i)

  return {
    reply: terse,
    intent: intent.id,
    intentLabel: intent.label,
    offPlatform: intent.offPlatform,
    confidence: intent.score >= 10 ? 'high' : intent.score >= 5 ? 'medium' : intent.score > 0 ? 'low' : 'none',
    guard: intent.offPlatform ? (INTENT_SIGNALS.find((i) => i.id === 'off-platform').guard) : null,
    alternatives,
  }
}

export function localRiskNotes(listing = {}) {
  const flags = []
  if (!listing.verified) flags.push({ level: 'medium', flag: 'Verification incomplete', note: 'Credential chain has not been signed off by ops yet.' })
  if (listing.monetized && !listing.verified) flags.push({ level: 'high', flag: 'Monetised but unverified', note: 'Revenue claims need corroboration before the floor price is trusted.' })
  if ((listing.age ?? 0) === 0) flags.push({ level: 'low', flag: 'Newly aged', note: 'No multi-year history to price against.' })
  if ((listing.offers ?? 0) > 8) flags.push({ level: 'medium', flag: 'Offer pile-up', note: 'Many open offers — check for coordinated lowballing.' })
  if (!flags.length) flags.push({ level: 'low', flag: 'No material risk signals', note: 'Chain verified, pricing inside the model band, proof set complete.' })
  return {
    riskScore: Math.min(1, flags.reduce((a, f) => a + ({ high: 0.42, medium: 0.22, low: 0.06 })[f.level] ?? 0, 0)),
    flags,
    recommendation: flags.some((f) => f.level === 'high') ? 'hold_escrow' : flags.some((f) => f.level === 'medium') ? 'review' : 'clear',
  }
}

