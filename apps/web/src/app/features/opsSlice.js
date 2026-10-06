import { createSelector, createSlice } from '@reduxjs/toolkit'
import { CATALOG } from '../../data/catalog'
import { mulberry32, hashString } from '../../data/catalog'

/**
 * Ops console data (the AccountsBazaar admin dashboard, extended).
 * Verification queue + payout approvals + revenue series are derived from the
 * same seeded catalog so numbers always reconcile across pages.
 */
const queue = CATALOG.listings.slice(0, 14).map((l, i) => {
  const rng = mulberry32(hashString(`q:${l.id}`))
  const state = ['awaiting-credential', 'credential-verified', 'ownership-test', 'flagged'][i % 4]
  return {
    id: `VQ-${9100 + i}`,
    listingId: l.id,
    listing: l.title,
    platform: l.platformLabel,
    seller: l.seller.name,
    submittedAt: new Date(Date.now() - (i + 1) * 3600_000 * 5).toISOString(),
    state,
    slaHours: 4 + Math.floor(rng() * 20),
    notes: 'Credential chain submitted; ownership screen-share pending review.',
    risk: Math.round(rng() * 100) / 100,
  }
})

const payouts = Array.from({ length: 9 }, (_, i) => {
  const l = CATALOG.listings[i * 3 + 1]
  const rng = mulberry32(hashString(`p:${l.id}`))
  return {
    id: `WD-${4400 + i}`,
    seller: l.seller.name,
    amount: Math.round((600 + rng() * 9000) * 100) / 100,
    method: ['Bank transfer', 'USDT (TRC-20)', 'Paystack', 'Wire'][i % 4],
    requestedAt: new Date(Date.now() - (i + 2) * 7200_000).toISOString(),
    status: i % 3 === 0 ? 'review' : i % 3 === 1 ? 'approved' : 'paid',
    trust: l.seller.rating,
  }
})

const revenue = Array.from({ length: 12 }, (_, m) => {
  const rng = mulberry32(hashString(`rev:${m}`))
  const gmv = Math.round(168000 + m * 14200 + rng() * 41000)
  return {
    month: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'][m],
    gmv,
    fees: Math.round(gmv * 0.075),
    listings: Math.round(820 + m * 61 + rng() * 190),
    disputes: Math.round(rng() * 9),
  }
})

const initialState = {
  queue,
  payouts,
  revenue,
  audit: [
    { at: new Date(Date.now() - 42 * 60_000).toISOString(), actor: 'ops.maya', action: 'Credential chain re-verified', target: 'RM-4277', tone: 'ok' },
    { at: new Date(Date.now() - 96 * 60_000).toISOString(), actor: 'risk.bot', action: 'Listing auto-flagged: duplicate proof hash', target: 'RM-4326', tone: 'warn' },
    { at: new Date(Date.now() - 190 * 60_000).toISOString(), actor: 'ops.daniel', action: 'Payout approved', target: 'WD-4403', tone: 'ok' },
    { at: new Date(Date.now() - 320 * 60_000).toISOString(), actor: 'ops.maya', action: 'Seller suspended pending KYC', target: 'sl_11', tone: 'danger' },
    { at: new Date(Date.now() - 610 * 60_000).toISOString(), actor: 'escrow.worker', action: 'Escrow released on buyer confirmation', target: 'RM-4241', tone: 'ok' },
  ],
}

const opsSlice = createSlice({
  name: 'ops',
  initialState,
  reducers: {
    advance: (s, a) => {
      const item = s.queue.find((q) => q.id === a.payload)
      if (!item) return
      const order = ['awaiting-credential', 'credential-verified', 'ownership-test', 'flagged']
      const i = order.indexOf(item.state)
      item.state = order[(i + 1) % order.length]
      s.audit.unshift({
        at: new Date().toISOString(),
        actor: 'you@reachmark',
        action: `Queue item advanced to ${item.state.replace('-', ' ')}`,
        target: item.id,
        tone: item.state === 'flagged' ? 'warn' : 'ok',
      })
    },
    resolvePayout: (s, a) => {
      const p = s.payouts.find((x) => x.id === a.payload)
      if (!p) return
      p.status = p.status === 'paid' ? 'review' : 'paid'
      s.audit.unshift({
        at: new Date().toISOString(),
        actor: 'you@reachmark',
        action: `Payout marked ${p.status}`,
        target: p.id,
        tone: 'ok',
      })
    },
  },
})

export const { advance, resolvePayout } = opsSlice.actions
export const selectOpsKpis = createSelector(
  [(s) => s.ops, (s) => s.catalog.listings, (s) => s.catalog.sellers],
  (ops, listings, sellers) => {
  const { revenue, queue: q, payouts: p } = ops
  const gmv = revenue.reduce((a, r) => a + r.gmv, 0)
  return {
    gmv,
    fees: revenue.reduce((a, r) => a + r.fees, 0),
    openQueue: q.filter((x) => x.state !== 'credential-verified').length,
    pendingPayouts: p.filter((x) => x.status !== 'paid').reduce((a, x) => a + x.amount, 0),
    disputes: revenue.reduce((a, r) => a + r.disputes, 0),
    listings: listings.length,
    sellers: sellers.length,
    liveTools: 44,
  }
  },
)

export default opsSlice.reducer
