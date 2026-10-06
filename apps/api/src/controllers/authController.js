/**
 * authController — the HTTP surface for accounts.
 *
 * Every handler follows the same rules: validate, act, return the public user
 * plus (where relevant) a fresh session token. Errors are uniform — `{ ok,
 * code, message }` with a real status — so the client can show a field-level
 * message instead of a generic toast.
 */
import * as auth from '../services/authService.js'
import prisma from '../configs/prisma.js'
import { sendEmail, mailerConfigured } from '../configs/nodemailer.js'
import { authMode, setSessionCookie, clearSessionCookie } from '../middlewares/authMiddleware.js'

const meta = (req) => ({
  userAgent: req.get('user-agent') ?? '',
  ip: (req.headers['x-forwarded-for'] ?? req.socket?.remoteAddress ?? '').split(',')[0].trim(),
})

const fail = (res, error) => {
  if (error instanceof auth.AuthError) {
    return res.status(error.status).json({ ok: false, code: error.code, message: error.message, problems: error.problems, attemptsLeft: error.attemptsLeft, retryAfterMinutes: error.retryAfterMinutes })
  }
  console.error('[auth]', error)
  res.status(500).json({ ok: false, code: 'server_error', message: 'Something went wrong. Try again.' })
}

/** Where the client should send someone after clicking an emailed link. */
const appUrl = (path, token) =>
  `${(process.env.APP_URL ?? 'http://localhost:5173').replace(/\/$/, '')}${path}?token=${encodeURIComponent(token)}`

/* ------------------------------------------------------------------ status -- */

export const status = async (req, res) => {
  try {
    const stats = await auth.authStats()
    res.json({
      ok: true,
      mode: authMode(),
      provider: authMode() === 'clerk' ? 'clerk' : 'reachmark',
      // Sign-up is always available: local accounts work with no vendor, and
      // with Clerk configured the client hands off to Clerk instead.
      signupAvailable: true,
      passwordPolicy: { minLength: 10, blocklistEnforced: true },
      maxFailedLogins: auth.MAX_FAILED_LOGINS,
      lockoutMinutes: auth.LOCKOUT_MINUTES,
      mailer: mailerConfigured() ? 'smtp' : 'log-only',
      stats,
    })
  } catch (error) {
    fail(res, error)
  }
}

/* ------------------------------------------------------------------- signup -- */

export const signup = async (req, res) => {
  try {
    const { user, token, expiresAt, verification } = await auth.signUp(req.body ?? {}, meta(req))
    setSessionCookie(res, token, expiresAt)

    const verifyUrl = appUrl('/auth/verify', verification.token)
    // No SMTP in development: the link is logged and returned behind a flag so
    // the flow is completable without a mail server. In production this is the
    // only trace of the token, and it lives in the recipient's inbox.
    if (!mailerConfigured()) console.log(`[auth] verify email → ${user.email}: ${verifyUrl}`)
    await sendEmail({
      to: user.email,
      subject: 'Confirm your Reachmark Logs account',
      text: `Welcome to Reachmark Logs.\n\nConfirm your email to unlock selling and payouts:\n${verifyUrl}\n\nThis link expires in 60 minutes.`,
    })

    res.status(201).json({
      ok: true,
      user,
      token,
      expiresAt,
      emailVerification: {
        required: true,
        sentTo: user.email,
        // Surfaced only when there is no mailer, so a local run is testable.
        devUrl: mailerConfigured() ? undefined : verifyUrl,
      },
    })
  } catch (error) {
    fail(res, error)
  }
}

/* -------------------------------------------------------------------- login -- */

export const login = async (req, res) => {
  try {
    const { user, token, expiresAt } = await auth.logIn(req.body ?? {}, meta(req))
    setSessionCookie(res, token, expiresAt)
    res.json({ ok: true, user, token, expiresAt })
  } catch (error) {
    // A lockout is worth a security log line; a wrong password is not, or the
    // logs become a brute-force oracle themselves.
    if (error?.code === 'locked') console.warn(`[auth] lockout for ${auth.normalizeEmail(req.body?.email)} from ${meta(req).ip}`)
    fail(res, error)
  }
}

export const logout = async (req, res) => {
  try {
    const header = req.get('authorization') ?? ''
    const token = /^bearer\s+/i.test(header) ? header.replace(/^bearer\s+/i, '').trim() : null
    if (token) await auth.revokeSession(token)
    clearSessionCookie(res)
    res.json({ ok: true })
  } catch (error) {
    fail(res, error)
  }
}

/** Cheap endpoint the client polls on boot to restore a session. */
export const session = async (req, res) => {
  res.json({
    ok: true,
    authenticated: Boolean(req.userId),
    user: req.userId && req.user ? auth.publicUser(req.user) : null,
    role: req.role ?? null,
    plan: req.plan ?? null,
    mode: authMode(),
  })
}

/* -------------------------------------------------------------- verification */

export const verifyEmailToken = async (req, res) => {
  try {
    const user = await auth.verifyEmail(req.body?.token ?? req.query.token)
    res.json({ ok: true, user, message: 'Email confirmed.' })
  } catch (error) {
    fail(res, error)
  }
}

export const resendVerification = async (req, res) => {
  try {
    if (!req.userId) return res.status(401).json({ ok: false, code: 'unauthenticated', message: 'Sign in first.' })
    const user = await prisma.user.findUnique({ where: { id: req.userId } })
    if (!user) return res.status(404).json({ ok: false, message: 'Account not found.' })
    if (user.emailVerified) return res.json({ ok: true, alreadyVerified: true })
    const verification = await auth.issueToken(user.id, 'verify_email')
    const url = appUrl('/auth/verify', verification.token)
    if (!mailerConfigured()) console.log(`[auth] resend verify → ${user.email}: ${url}`)
    await sendEmail({ to: user.email, subject: 'Confirm your Reachmark Logs account', text: `Confirm your email:\n${url}` })
    res.json({ ok: true, sentTo: user.email, devUrl: mailerConfigured() ? undefined : url })
  } catch (error) {
    fail(res, error)
  }
}

/* ------------------------------------------------------------------ resets -- */

export const forgotPassword = async (req, res) => {
  try {
    const { user, token } = await auth.requestPasswordReset(req.body?.email ?? '')
    let devUrl
    if (user && token) {
      devUrl = appUrl('/auth/reset', token.token)
      if (!mailerConfigured()) console.log(`[auth] password reset → ${user.email}: ${devUrl}`)
      await sendEmail({
        to: user.email,
        subject: 'Reset your Reachmark Logs password',
        text: `Someone asked to reset the password on this account.\n\n${devUrl}\n\nThe link expires in 60 minutes. If this was not you, ignore this email — nothing changes.`,
      })
    }
    // Identical response whether or not the address exists.
    res.json({ ok: true, message: 'If that address has an account, a reset link is on its way.', devUrl: mailerConfigured() ? undefined : devUrl })
  } catch (error) {
    fail(res, error)
  }
}

export const resetPassword = async (req, res) => {
  try {
    const { user, token, expiresAt, sessionsRevoked } = await auth.resetPassword(req.body?.token, req.body?.password)
    setSessionCookie(res, token, expiresAt)
    res.json({ ok: true, user, token, expiresAt, sessionsRevoked, message: 'Password updated. Other devices were signed out.' })
  } catch (error) {
    fail(res, error)
  }
}

export const changePassword = async (req, res) => {
  try {
    // The device making the change keeps its session; every other device is
    // signed out (that is the point of changing a password). The token comes
    // from the request itself rather than the body, so a client cannot
    // accidentally — or deliberately — keep someone else's session alive.
    const header = req.get('authorization') ?? ''
    const current = /^bearer\s+/i.test(header) ? header.replace(/^bearer\s+/i, '').trim() : null
    const result = await auth.changePassword(req.userId, req.body?.currentPassword, req.body?.password, current)
    res.json({ ok: true, ...result, message: 'Password updated. Other devices were signed out.' })
  } catch (error) {
    fail(res, error)
  }
}

/* ----------------------------------------------------------------- profile -- */

export const updateProfile = async (req, res) => {
  try {
    const user = await auth.updateProfile(req.userId, req.body ?? {})
    res.json({ ok: true, user })
  } catch (error) {
    fail(res, error)
  }
}

export const deactivate = async (req, res) => {
  try {
    const user = await auth.deactivateAccount(req.userId)
    clearSessionCookie(res)
    res.json({ ok: true, user, message: 'Account deactivated. Sign in again to restore it.' })
  } catch (error) {
    fail(res, error)
  }
}

export const reactivate = async (req, res) => {
  try {
    const { user, token, expiresAt } = await auth.reactivateAccount(req.body?.email, req.body?.password)
    setSessionCookie(res, token, expiresAt)
    res.json({ ok: true, user, token, expiresAt })
  } catch (error) {
    fail(res, error)
  }
}

/* ---------------------------------------------------------------- sessions -- */

export const sessions = async (req, res) => {
  try {
    const rows = await auth.listSessions(req.userId)
    res.json({
      ok: true,
      items: rows.map((s) => ({ ...s, current: s.id === req.sessionId })),
    })
  } catch (error) {
    fail(res, error)
  }
}

export const revokeSession = async (req, res) => {
  try {
    const { count } = await auth.revokeSessionById(req.userId, req.params.id)
    if (!count) return res.status(404).json({ ok: false, message: 'That session is already signed out.' })
    res.json({ ok: true, revoked: count })
  } catch (error) {
    fail(res, error)
  }
}

export const revokeOtherSessions = async (req, res) => {
  try {
    const header = req.get('authorization') ?? ''
    const token = /^bearer\s+/i.test(header) ? header.replace(/^bearer\s+/i, '').trim() : null
    const { count } = await auth.revokeAllSessions(req.userId, { exceptToken: token })
    res.json({ ok: true, revoked: count })
  } catch (error) {
    fail(res, error)
  }
}
