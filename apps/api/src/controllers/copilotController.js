/**
 * copilotController — exposes the LLM copilot (with its deterministic fallback).
 *
 * Every handler returns `engine: "local" | "openai" | "anthropic" | "openrouter"`
 * so the client can label the output honestly instead of implying an LLM ran.
 */
import * as copilot from '../services/copilot.js'
import prisma from '../configs/prisma.js'

const fail = (res, route) => (error) => {
  console.error(`[copilot.${route}]`, error)
  res.status(500).json({ ok: false, message: error.message })
}

export const status = (req, res) => res.json({ ok: true, ...copilot.copilotStatus() })

/** Draft a listing from partial wizard input. */
export const listing = async (req, res) => {
  try {
    const payload = { ...req.body }
    // If only an id was supplied, hydrate from the database first.
    if (payload.id && !payload.scale) {
      const row = await prisma.listing.findUnique({ where: { id: payload.id } })
      if (row) Object.assign(payload, {
        platform: row.platform,
        niche: row.niche,
        scale: row.followers_count,
        engagement: row.engagement_rate,
        monthlyViews: row.monthly_views,
        age: new Date().getFullYear() - new Date(row.createdAt).getFullYear(),
        region: row.region,
        category: row.assetClass,
        monetized: row.monetized,
        verified: row.isCredentialVerified,
        audienceSplit: row.audienceSplitPct,
      })
    }
    res.json({ ok: true, draft: await copilot.draftListing(payload) })
  } catch (error) {
    fail(res, 'listing')(error)
  }
}

export const price = async (req, res) => {
  try {
    res.json({ ok: true, brief: await copilot.priceBrief(req.body ?? {}) })
  } catch (error) {
    fail(res, 'price')(error)
  }
}

export const reel = async (req, res) => {
  try {
    res.json({ ok: true, reel: await copilot.reelScript(req.body ?? {}) })
  } catch (error) {
    fail(res, 'reel')(error)
  }
}

/** Suggest a reply for an escrow thread; flags off-platform payment attempts. */
export const reply = async (req, res) => {
  try {
    const { message = '', listingId, tone } = req.body ?? {}
    let listing = {}
    if (listingId) {
      const row = await prisma.listing.findUnique({ where: { id: listingId } })
      if (row) listing = { id: row.id, price: row.price, verified: row.isCredentialVerified, platform: row.platform }
    }
    res.json({ ok: true, suggestion: await copilot.suggestReply({ message, listing, tone }) })
  } catch (error) {
    fail(res, 'reply')(error)
  }
}

/** Ops-desk risk notes (admin surface). */
export const risk = async (req, res) => {
  try {
    const { listingId, ...inline } = req.body ?? {}
    let listing = inline
    if (listingId) {
      const row = await prisma.listing.findUnique({
        where: { id: listingId },
        include: { _count: { select: { proofArtifacts: true } } },
      })
      if (!row) return res.status(404).json({ ok: false, message: `No listing ${listingId}` })
      listing = {
        id: row.id,
        verified: row.isCredentialVerified,
        monetized: row.monetized,
        age: new Date().getFullYear() - new Date(row.createdAt).getFullYear(),
        offers: row.offerCount,
        price: row.price,
        proofCount: row._count.proofArtifacts,
      }
    }
    res.json({ ok: true, assessment: await copilot.riskNotes(listing) })
  } catch (error) {
    fail(res, 'risk')(error)
  }
}
