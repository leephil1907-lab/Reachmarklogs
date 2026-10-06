/**
 * Auth middleware — Clerk in production, a synthesised demo principal offline.
 *
 * Upstream AccountsBazaar assumed Clerk is always configured. Reachmark keeps
 * that path (unchanged: `req.auth()`, plan claims, admin email allow-list) but
 * degrades gracefully when CLERK_SECRET_KEY is absent so the API can be booted
 * for local development, CI and the E2E harness without external accounts.
 *
 * The demo principal is intentionally loud: it sets `req.demoAuth = true` and the
 * API tags every response with `x-reachmark-auth: demo` so nobody mistakes an
 * unauthenticated local run for a secured deployment.
 */
import { clerkClient } from '@clerk/express'

export const clerkConfigured = () =>
  Boolean(process.env.CLERK_SECRET_KEY && process.env.CLERK_SECRET_KEY.trim())

const adminEmails = () =>
  (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

/** Demo identities so the API mirrors the client's local-first personas. */
const DEMO_USERS = {
  buyer: { id: 'demo_user_buyer', email: 'ada@reachmarklogs.test', name: 'Ada Okonjo', role: 'buyer' },
  seller: { id: 'demo_user_seller', email: 'ada@reachmarklogs.test', name: 'Ada Okonjo', role: 'seller' },
  admin: { id: 'demo_user_admin', email: 'ops@reachmarklogs.test', name: 'Maya Ops', role: 'admin' },
}

function demoPrincipal(req) {
  const requested = String(req.get('x-demo-role') ?? process.env.DEMO_ROLE ?? 'seller').toLowerCase()
  const user = DEMO_USERS[requested] ?? DEMO_USERS.seller
  return user
}

/** Populates req.userId / req.plan / req.role without ever rejecting. */
export async function attachAuth(req, res, next) {
  req.demoAuth = false
  if (!clerkConfigured()) {
    const user = demoPrincipal(req)
    req.userId = user.id
    req.user = user
    req.role = user.role
    req.plan = process.env.DEMO_PLAN ?? 'pro'
    req.demoAuth = true

    // Clerk-compatible shim. Every upstream AccountsBazaar controller calls
    // `await req.auth()` directly, so instead of editing thirteen call sites the
    // demo mode implements the same contract: `{ userId, sessionId, has() }`.
    req.auth = async () => ({
      userId: user.id,
      sessionId: 'demo_session',
      role: user.role,
      has: async ({ plan } = {}) => (plan ? plan === 'free' || plan === 'pro' : false),
    })

    res.setHeader('x-reachmark-auth', 'demo')
    return next()
  }
  try {
    const { userId, has } = await req.auth()
    req.userId = userId ?? null
    if (userId) {
      const hasPremium = typeof has === 'function' ? await has({ plan: 'premium' }) : false
      req.plan = hasPremium ? 'premium' : 'free'
      req.role = 'member'
    }
  } catch (error) {
    req.authError = error?.message ?? 'auth failed'
  }
  return next()
}

/** Requires a signed-in principal (Clerk session or demo). */
export const protect = async (req, res, next) => {
  try {
    if (!req.demoAuth && !req.userId) {
      return res.status(401).json({ message: 'Unauthorized', hint: 'Sign in with Clerk, or run with CLERK_SECRET_KEY unset for demo mode.' })
    }
    return next()
  } catch (error) {
    return res.status(401).json({ message: error.code || error.message })
  }
}

/** Admin gate: Clerk session + email in ADMIN_EMAILS, or demo admin role. */
export const protectAdmin = async (req, res, next) => {
  try {
    if (req.demoAuth) {
      if (req.role !== 'admin') {
        return res.status(403).json({ message: 'Demo mode: send x-demo-role: admin to use the ops endpoints.' })
      }
      return next()
    }
    if (!req.userId) return res.status(401).json({ message: 'Unauthorized' })

    const allow = adminEmails()
    if (!allow.length) {
      return res.status(503).json({ message: 'ADMIN_EMAILS is not configured on this deployment.' })
    }
    const user = await clerkClient.users.getUser(req.userId)
    const emails = (user.emailAddresses ?? []).map((e) => e.emailAddress.toLowerCase())
    if (!emails.some((e) => allow.includes(e))) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    req.user = { id: user.id, email: emails[0], name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(), role: 'admin' }
    return next()
  } catch (error) {
    return res.status(401).json({ message: error.code || error.message })
  }
}
