/**
 * Browser copilot — the shared deterministic engine, hosted in the tab.
 *
 * `@reachmark/copilot` is the same package the Express service imports, so the
 * valuation a seller sees while drafting in the preview is the valuation the
 * server would have returned. Nothing here calls a network; when the app runs in
 * live mode, `lib/api.js` routes copilot calls to the server instead (which may
 * answer with an LLM, and says so in `engine`).
 */
import {
  configure,
  config,
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

/* Alias the local* names to the capability names the UI uses, so a component can
   call `copilot.priceBrief(input)` and not care which engine answered. */
export const draftListing = (input) => ({ ...localListingDraft(input), engine: 'local' })
export const priceBrief = (input) => ({ ...localPriceBrief(input), engine: 'local' })
export const reelScript = (input) => ({ ...localReelScript(input), engine: 'local' })
export const suggestReply = (input) => ({ ...localReply(input), engine: 'local' })
export const riskNotes = (input) => ({ ...localRiskNotes(input), engine: 'local' })

/** What the header badge and the copilot panels read. */
export const status = () => ({
  engine: 'local',
  provider: 'local',
  configured: false,
  available: ['openai', 'openrouter', 'anthropic'],
  fallback: 'deterministic engine (browser, no key required)',
  ...config(),
})

export const plainLanguage = (id) =>
  ({
    'off-platform': 'Buyer pushed for payment outside escrow',
    discount: 'Negotiating on price',
    proof: 'Asking for evidence',
    handover: 'Asking how transfer works',
    timeline: 'Asking about timing',
    motive: 'Asking why it is for sale',
    bundle: 'Asking about a bundle',
    terms: 'Asking about escrow and fees',
    general: 'General enquiry',
  })[id] ?? 'General enquiry'

export default {
  draftListing, priceBrief, reelScript, suggestReply, riskNotes, status, plainLanguage,
  estimateFairValue, compact, usd,
}
