/**
 * Auth middleware — three modes, one contract.
 *
 *   1. `clerk`  CLERK_SECRET_KEY is set. Clerk owns identity (unchanged from
 *               upstream AccountsBazaar); this file only maps the Clerk session
 *               onto the shapes the rest of the app expects.
 *   2. `local`  No Clerk. Reachmark's own accounts: a bearer token or session
 *               cookie is resolved against the Session table. This is the mode
 *               the shipped product runs in, and the one the E2E suite exercises
 *               with real sign-up and sign-in.
 *   3. `demo`   AUTH_MODE=demo, explicitly opted into (tests, screenshots). A
 *               synthesised principal so fixtures render without an account.
 *               Never chosen by accident: it must be asked for by name.
 *
 * Whatever the mode, `req.userId`, `req.user`, `req.role`, `req.plan` and the
 * `await req.auth()` shim are populated — thirteen upstream controllers call
 * `req.auth()` directly and none of them had to change.
 */
import { clerkConfigured as clerkKeysPresent } from './clerk.js'
import { resolveSession, hashToken, AuthError } from '../services/authService.js'
import prisma from '../configs/prisma.js'

export const clerkConfigured = clerkKeysPresent
export const authMode = () => {
  if (process.env.AUTH_MODE === 'demo') return 'demo'
  return clerkConfigured() ? 'clerk' : 'local'
}
export const sessionCookieName = () => process.env.SESSION_COOKIE_NAME ?? 'reachmark_session'

const adminEmails = () =>
  (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

const DEMO_USERS = {
  buyer: { id: 'demo_user_buyer', email: 'ada.buyer@reachmarklogs.test', name: 'Ada Okonjo', role: 'buyer' },
  seller: { id: 'demo_user_seller', email: 'ada@reachmarklogs.test', name: 'Ada Okonjo', role: 'seller' },
  admin: { id: 'demo_user_admin', email: 'ops@reachmarklogs.test', name: 'Maya Ops', role: 'admin' },
}

/** Reads the token from the Authorization header, then the session cookie. */
function readToken(req) {
  const header = req.get('authorization') ?? ''
  if (/^bearer\s+/i.test(header)) return header.replace(/^bearer\s+/i, '').trim()
  const cookie = req.headers.cookie ?? ''
  const name = sessionCookieName()
  const match = cookie.split(/;\s*/).find((c) => c.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null
}

/**
 * Attaches the caller if there is one. Never rejects — routes decide, using
 * `protect` / `protectAdmin`, whether anonymous access is acceptable.
 */
export async function attachAuth(req, res, next) {
  const mode = authMode()
  res.setHeader('x-reachmark-auth', mode)
  req.authMode = mode

  const authShim = (payload) => async () => ({
    userId: payload.userId,
    sessionId: payload.sessionId ?? 'n/a',
    role: payload.role ?? 'buyer',
    has: async ({ plan } = {}) => (Array.isArray(plan) ? plan.includes(payload.plan ?? 'free') : plan === payload.plan),
  })

  try {
    if (mode === 'demo') {
      const wanted = String(req.get('x-demo-role') ?? process.env.DEMO_ROLE ?? 'seller').toLowerCase()
      const user = DEMO_USERS[wanted] ?? DEMO_USERS.seller
      req.userId = user.id
      req.user = { ...user, plan: process.env.DEMO_PLAN ?? 'pro' }
      req.role = user.role
      req.plan = req.user.plan
      req.demoAuth = true
      req.auth = authShim({ userId: user.id, role: user.role, plan: req.plan })
      return next()
    }

    if (mode === 'clerk') {
      // Clerk's own middleware already ran and populated req.auth; we only mirror
      // it into the fields this codebase and its controllers use.
      const claims = typeof req.auth === 'function' ? await req.auth() : null
      if (claims?.userId) {
        req.userId = claims.userId
        req.sessionId = claims.sessionId
        let role = 'buyer'
        let plan = 'free'
        try {
          const local = await prisma.user.findUnique({ where: { id: claims.userId } })
          if (local) {
            role = local.role
            plan = local.plan
            req.user = local
          }
        } catch { /* database not reachable — Clerk identity still stands */ }
        const email = String(req.get('x-clerk-email') ?? '').toLowerCase()
        if (email && adminEmails().includes(email)) role = 'admin'
        req.role = role
        req.plan = plan
      }
      return next()
    }

    // ---- local (Reachmark accounts) ----
    const token = readToken(req)
    if (token) {
      const session = await resolveSession(token)
      if (session) {
        const user = session.user
        const role = adminEmails().includes(user.email) && user.role !== 'admin' ? 'admin' : user.role
        req.userId = user.id
        req.sessionId = session.id
        req.sessionTokenHash = hashToken(token)
        req.user = user
        req.role = role
        req.plan = user.plan
        req.auth = authShim({ userId: user.id, role, plan: user.plan, sessionId: session.id })
      }
    }
    next()
  } catch (error) {
    // A failure here must not 500 an anonymous request; it just stays anonymous.
    console.warn('[auth] attach failed:', error.message)
    next()
  }
}

/** Rejects with 401 when there is no authenticated caller. */
export function protect(req, res, next) {
  if (!req.userId) {
    return res.status(401).json({
      ok: false,
      code: 'unauthenticated',
      message: 'Sign in to continue.',
      mode: req.authMode,
    })
  }
  if (req.user && req.user.status && req.user.status !== 'active') {
    return res.status(403).json({ ok: false, code: 'inactive', message: 'This account is not active.' })
  }
  next()
}

/** Rejects unless the caller is an admin (or an allow-listed Clerk email). */
export function protectAdmin(req, res, next) {
  if (!req.userId) {
    return res.status(401).json({ ok: false, code: 'unauthenticated', message: 'Sign in to continue.' })
  }
  if (req.role !== 'admin') {
    return res.status(403).json({ ok: false, code: 'forbidden', message: 'The ops desk requires an admin account.' })
  }
  next()
}

/** Sets/clears the session cookie. The bearer token is the primary mechanism
 *  (it works inside sandboxed preview iframes, where third-party cookies are
 *  blocked); the cookie is a convenience for same-origin deployments. */
export function setSessionCookie(res, token, expiresAt) {
  const parts = [
    `${sessionCookieName()}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Expires=${new Date(expiresAt).toUTCString()}`,
  ]
  if (process.env.NODE_ENV === 'production') parts.push('Secure')
  res.setHeader('set-cookie', parts.join('; '))
}

export function clearSessionCookie(res) {
  res.setHeader('set-cookie', `${sessionCookieName()}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
}

export { AuthError }
