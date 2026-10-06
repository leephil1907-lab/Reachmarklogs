/**
 * catalogController — the live, database-backed floor.
 *
 * These endpoints shadow the client's local `catalogSlice` so the web app can
 * switch modes without changing a single component. Response shapes are kept
 * deliberately identical to the seeded store (see `toListingDto`).
 */
import * as catalog from '../services/catalogService.js'
import prisma from '../configs/prisma.js'

export const list = async (req, res) => {
  try {
    const data = await catalog.searchListings({ ...req.query, page: req.query.page, perPage: req.query.perPage })
    res.json({ ok: true, ...data })
  } catch (error) {
    console.error('[catalog.list]', error)
    res.status(500).json({ ok: false, message: error.message })
  }
}

export const facets = async (req, res) => {
  try {
    res.json({ ok: true, ...(await catalog.getFacets()) })
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message })
  }
}

export const detail = async (req, res) => {
  try {
    const item = await catalog.getListingDetail(req.params.id)
    if (!item) return res.status(404).json({ ok: false, message: `No listing ${req.params.id}` })
    res.json({ ok: true, item })
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message })
  }
}

/** Append-only credential chain for a listing. */
export const chain = async (req, res) => {
  try {
    const events = await prisma.credentialEvent.findMany({
      where: { listingId: req.params.id },
      orderBy: { createdAt: 'asc' },
    })
    res.json({ ok: true, count: events.length, events })
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message })
  }
}

/** Public ops summary — the /admin KPIs, computed from the database. */
export const summary = async (req, res) => {
  try {
    res.json({ ok: true, ...(await catalog.getOpsSummary()) })
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message })
  }
}

/** Filter semantics come from the shared service so local/live cannot diverge. */
export const filters = async (req, res) => {
  const { buildWhere, SORTS, ASSET_CLASSES, getFilterOptions } = catalog
  const options = await getFilterOptions()
  res.json({
    ok: true,
    assetClasses: ASSET_CLASSES,
    ...options,
    sample: buildWhere({ query: 'verified', priceMax: 5000, categories: ['social'] }),
  })
}
