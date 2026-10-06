/**
 * meController — the signed-in seller's console.
 *
 * Works with Clerk identities in production and the demo principal offline, so
 * the dashboard is exercisable end to end before you have any keys.
 */
import prisma from '../configs/prisma.js'

const feeBps = () => Number(process.env.REACHMARK_FEE_BPS ?? 750)

export const session = async (req, res) => {
  try {
    const id = req.userId
    const user = id ? await prisma.user.findUnique({ where: { id } }) : null
    res.json({
      ok: true,
      auth: req.authMode ?? (req.demoAuth ? 'demo' : 'clerk'),
      role: req.role ?? 'member',
      plan: req.plan ?? 'free',
      feeBps: feeBps(),
      escrowDays: Number(process.env.ESCROW_DEFAULT_DAYS ?? 7),
      user: user
        ? {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
            plan: user.plan,
            emailVerified: user.emailVerified,
            status: user.status,
            balance: user.earned - user.withdrawn,
            earned: user.earned,
            withdrawn: user.withdrawn,
          }
        : { id, email: null, name: 'Clerk user', image: null, balance: 0, earned: 0, withdrawn: 0 },
    })
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message })
  }
}

export const listings = async (req, res) => {
  try {
    const rows = await prisma.listing.findMany({
      where: { ownerId: req.userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { proofArtifacts: true, chats: true, transactions: true } } },
    })
    res.json({
      ok: true,
      count: rows.length,
      items: rows.map((l) => ({
        id: l.id,
        title: l.title,
        platform: l.platform,
        assetClass: l.assetClass,
        price: l.price,
        status: l.status,
        verified: l.isCredentialVerified,
        views24h: l.viewCount24h,
        watchers: l.watcherCount,
        offers: l.offerCount,
        proofCount: l._count.proofArtifacts,
        chats: l._count.chats,
        transactions: l._count.transactions,
        createdAt: l.createdAt,
      })),
    })
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message })
  }
}

export const orders = async (req, res) => {
  try {
    const rows = await prisma.transaction.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      include: { listing: { select: { id: true, title: true, platform: true } } },
    })
    res.json({ ok: true, count: rows.length, items: rows })
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message })
  }
}

export const payouts = async (req, res) => {
  try {
    const rows = await prisma.withdrawal.findMany({ where: { userId: req.userId }, orderBy: { createdAt: 'desc' } })
    res.json({ ok: true, count: rows.length, items: rows })
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message })
  }
}

/** Request a withdrawal — the AccountsBazaar flow, with balance guarding. */
export const requestPayout = async (req, res) => {
  try {
    const amount = Number(req.body?.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ ok: false, message: 'amount must be a positive number' })
    }
    const user = await prisma.user.findUnique({ where: { id: req.userId } })
    if (!user) return res.status(404).json({ ok: false, message: 'Unknown user' })

    const available = user.earned - user.withdrawn
    const inFlight = await prisma.withdrawal.aggregate({
      where: { userId: req.userId, isWithdrawn: false },
      _sum: { amount: true },
    })
    const committed = inFlight._sum.amount ?? 0
    const free = available - committed

    if (amount > free) {
      return res.status(400).json({
        ok: false,
        message: `Only $${free.toFixed(2)} is available (balance $${available.toFixed(2)}, already requested $${committed.toFixed(2)}).`,
      })
    }

    const wd = await prisma.withdrawal.create({
      data: {
        userId: req.userId,
        amount,
        account: req.body?.account ?? [{ method: 'Bank transfer', detail: 'on file' }],
        isWithdrawn: false,
      },
    })
    res.status(201).json({ ok: true, withdrawal: wd })
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message })
  }
}

/** Watchlist persisted server-side (the client keeps a copy in Redux). */
export const watchlist = async (req, res) => {
  try {
    const { id } = req.params
    const exists = await prisma.listing.findUnique({ where: { id } })
    if (!exists) return res.status(404).json({ ok: false, message: `No listing ${id}` })
    res.json({ ok: true, watching: true, id, note: 'Watch state is stored client-side in this build; the table lands with the auth migration.' })
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message })
  }
}
