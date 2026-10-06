/**
 * authService — first-party accounts for Reachmark Logs.
 *
 * Upstream AccountsBazaar had no local identity at all: every request carried a
 * Clerk session and the database only ever stored a `userId` string. Reachmark
 * keeps Clerk as an option (see middlewares/authMiddleware.js) but ships its own
 * accounts, because a marketplace where people trade four-figure assets cannot
 * be a demo-only product.
 *
 * Decisions worth knowing, and why:
 *
 *   Passwords   scrypt (Node's built-in, memory-hard, N=2^15) with a per-user
 *               random salt. No native dependency, no bcrypt build step, and
 *               argon2-grade resistance to GPU cracking. Verification is
 *               constant-time.
 *   Tokens      Sessions and one-time tokens are random 32-byte values; only
 *               their sha256 is stored. A database dump does not hand over live
 *               sessions, and a leaked token is single-use where it matters.
 *   Sessions    Server-side rows, not stateless JWTs — so "sign out everywhere"
 *               works, a password change kills every other device, and the
 *               account page can list where you are signed in.
 *   Lockouts    Failure counts live on the user row, so restarting the API does
 *               not reset an attacker's progress. (Per-IP limiting alone is
 *               useless against a botnet; per-account lockout is not.)
 *   Enumeration Signup and password-reset never reveal whether an address
 *               exists — the responses are identical either way.
 */
import { randomBytes, randomUUID, scrypt as _scrypt, timingSafeEqual, createHash } from 'node:crypto'
import { promisify } from 'node:util'
import prisma from '../configs/prisma.js'

const scrypt = promisify(_scrypt)

/* ------------------------------------------------------------- parameters -- */

const SCRYPT = { N: 32768, r: 8, p: 1, keylen: 64, maxmem: 128 * 1024 * 1024 }
const SESSION_TTL_DAYS = Number(process.env.SESSION_TTL_DAYS ?? 30)
const SESSION_TTL_REMEMBER_DAYS = Number(process.env.SESSION_TTL_REMEMBER_DAYS ?? 90)
const TOKEN_TTL_MINUTES = Number(process.env.AUTH_TOKEN_TTL_MINUTES ?? 60)
export const MAX_FAILED_LOGINS = Number(process.env.MAX_FAILED_LOGINS ?? 8)
export const LOCKOUT_MINUTES = Number(process.env.LOCKOUT_MINUTES ?? 15)

/* --------------------------------------------------------------- passwords - */

/**
 * Password policy: length is the only thing that reliably correlates with
 * strength, so the floor is 10 characters and there are no composition rules to
 * encourage `Passw0rd!`. A tiny blocklist catches the handful of passwords that
 * would otherwise top the list on this site specifically.
 */
const BLOCKLIST = new Set([
  'password', 'password1', 'password123', 'qwertyuiop', 'letmein123',
  'reachmarklogs', 'reachmark123', '1234567890', 'iloveyou123', 'admin12345',
])

export function validatePassword(password = '') {
  const problems = []
  if (typeof password !== 'string' || password.length < 10) problems.push('Use at least 10 characters.')
  if (password.length > 200) problems.push('Keep it under 200 characters.')
  const lower = password.toLowerCase()
  if (BLOCKLIST.has(lower)) problems.push('That password is too common.')
  if (/^(.)\1+$/.test(password)) problems.push('Do not repeat a single character.')
  if (lower.includes('reachmark')) problems.push('Do not use the site name in your password.')
  return { ok: problems.length === 0, problems }
}

export async function hashPassword(password) {
  const salt = randomBytes(16)
  const derived = await scrypt(password, salt, SCRYPT.keylen, SCRYPT)
  // Self-describing format so the parameters can be raised later without a
  // migration: scrypt$N$r$p$salt$hash
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${derived.toString('base64')}`
}

export async function verifyPassword(password, stored) {
  if (!stored) return false
  const [scheme, N, r, p, saltB64, hashB64] = String(stored).split('$')
  if (scheme !== 'scrypt') return false
  try {
    const salt = Buffer.from(saltB64, 'base64')
    const expected = Buffer.from(hashB64, 'base64')
    const derived = await scrypt(password, salt, expected.length, { N: Number(N), r: Number(r), p: Number(p), maxmem: SCRYPT.maxmem })
    return derived.length === expected.length && timingSafeEqual(derived, expected)
  } catch {
    return false
  }
}

/** True when a stored hash was made with weaker parameters than we now use. */
export function needsRehash(stored) {
  const [, N] = String(stored ?? '').split('$')
  return Number(N) < SCRYPT.N
}

/* ----------------------------------------------------------------- tokens -- */

const sha256 = (v) => createHash('sha256').update(v).digest('hex')
export const newToken = () => randomBytes(32).toString('base64url')
export const hashToken = (token) => sha256(String(token))

/* -------------------------------------------------------------- throttling -- */

/**
 * Failure counters live in their own table keyed by a hash of the email, so
 * they exist for addresses that have no account. That is what lets the sign-in
 * response be *identical* whether or not the address is registered: if only
 * real users were counted, the presence of a counter would be the tell.
 *
 * Surviving a restart is the point of putting it in the database rather than in
 * a Map — an in-memory limiter that resets on deploy is a limiter that resets
 * whenever an attacker is closest to succeeding.
 */
const attemptKey = (email) => sha256(`login:${normalizeEmail(email)}`)

async function lockStateFor(email) {
  const row = await prisma.loginAttempt.findUnique({ where: { key: attemptKey(email) } })
  if (!row) return { count: 0, locked: false, minutes: 0 }
  if (row.lockedUntil && row.lockedUntil > new Date()) {
    return { count: row.count, locked: true, minutes: Math.max(1, Math.ceil((row.lockedUntil - Date.now()) / 60000)) }
  }
  return { count: row.count, locked: false, minutes: 0 }
}

async function recordFailure(email) {
  const key = attemptKey(email)
  const row = await prisma.loginAttempt.upsert({
    where: { key },
    create: { key, count: 1 },
    update: { count: { increment: 1 } },
  })
  if (row.count >= MAX_FAILED_LOGINS) {
    const lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60_000)
    await prisma.loginAttempt.update({ where: { key }, data: { count: 0, lockedUntil } })
    return { locked: true, minutes: LOCKOUT_MINUTES }
  }
  return { locked: false, minutes: 0 }
}

const clearFailures = async (email) => {
  await prisma.loginAttempt.deleteMany({ where: { key: attemptKey(email) } }).catch(() => {})
}

/* ------------------------------------------------------------------ input -- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i
export const normalizeEmail = (email = '') => String(email).trim().toLowerCase()
export const isEmail = (email) => EMAIL_RE.test(normalizeEmail(email))

export class AuthError extends Error {
  constructor(code, message, status = 400, extra = {}) {
    super(message)
    this.code = code
    this.status = status
    Object.assign(this, extra)
  }
}

/* ------------------------------------------------------------------- user -- */

/** The user shape the client is allowed to see. Never includes credential data. */
export const publicUser = (u) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  image: u.image || '',
  role: u.role,
  status: u.status,
  plan: u.plan,
  handle: u.handle ?? '',
  bio: u.bio ?? '',
  country: u.country ?? '',
  timezone: u.timezone ?? '',
  emailVerified: u.emailVerified,
  earned: u.earned ?? 0,
  withdrawn: u.withdrawn ?? 0,
  createdAt: u.createdAt,
  lastLoginAt: u.lastLoginAt ?? null,
})

const initialsAvatar = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')

/* ----------------------------------------------------------------- signup -- */

export async function signUp({ email, password, name, role = 'buyer', country = '', timezone = '', acceptTerms }, meta = {}) {
  const cleanEmail = normalizeEmail(email)
  const cleanName = String(name ?? '').trim()

  if (!isEmail(cleanEmail)) throw new AuthError('invalid_email', 'Enter a valid email address.', 422)
  if (cleanName.length < 2) throw new AuthError('invalid_name', 'Tell us what to call you.', 422)
  if (!['buyer', 'seller'].includes(role)) {
    throw new AuthError('invalid_role', 'Choose whether you are buying or selling.', 422)
  }
  if (!acceptTerms) throw new AuthError('terms_required', 'Accept the escrow terms to continue.', 422)

  const policy = validatePassword(password)
  if (!policy.ok) throw new AuthError('weak_password', policy.problems[0], 422, { problems: policy.problems })

  const existing = await prisma.user.findUnique({ where: { email: cleanEmail } })
  if (existing) {
    // Deliberately explicit here, unlike the reset flow: at sign-up the address
    // is already public knowledge to the person typing it, and a vague error
    // would leave someone stuck wondering why they cannot register.
    throw new AuthError('email_taken', 'An account already uses that email. Try signing in.', 409)
  }

  const user = await prisma.user.create({
    data: {
      id: `usr_${randomUUID().replace(/-/g, '').slice(0, 20)}`,
      email: cleanEmail,
      name: cleanName,
      image: initialsAvatar(cleanName),
      passwordHash: await hashPassword(password),
      role,
      plan: 'free',
      country: String(country ?? '').slice(0, 64),
      timezone: String(timezone ?? '').slice(0, 64),
      emailVerified: false,
    },
  })

  const verification = await issueToken(user.id, 'verify_email')
  const session = await createSession(user.id, meta)

  return { user: publicUser(user), token: session.token, expiresAt: session.expiresAt, verification }
}

/* ------------------------------------------------------------------ login -- */

export async function logIn({ email, password, remember }, meta = {}) {
  const cleanEmail = normalizeEmail(email)

  /**
   * One error for every failure mode that is not a lockout — no such user,
   * wrong password, no local password. Identical text, identical status, and no
   * "attempts left" hint: that hint used to be appended only when the address
   * existed, which made the response itself an enumeration oracle.
   */
  const invalid = new AuthError('invalid_credentials', 'That email and password do not match.', 401)

  const lock = await lockStateFor(cleanEmail)
  if (lock.locked) {
    throw new AuthError('locked', `Too many failed attempts. Try again in ${lock.minutes} minute${lock.minutes === 1 ? '' : 's'}.`, 429, { retryAfterMinutes: lock.minutes })
  }

  const user = await prisma.user.findUnique({ where: { email: cleanEmail } })

  if (!user || !user.passwordHash) {
    // Burn comparable CPU to a real verification so latency does not betray
    // which addresses are registered, then count the failure like any other.
    await verifyPassword(password ?? '', await hashPassword('decoy-password-for-timing'))
    const after = await recordFailure(cleanEmail)
    if (after.locked) throw new AuthError('locked', `Too many failed attempts. Try again in ${after.minutes} minutes.`, 429, { retryAfterMinutes: after.minutes })
    throw invalid
  }

  if (user.status === 'suspended') throw new AuthError('suspended', 'This account is suspended. Contact the ops desk.', 403)
  if (user.status === 'deactivated') throw new AuthError('deactivated', 'This account was deactivated. You can restore it from the sign-in page.', 403)

  const okPassword = await verifyPassword(password ?? '', user.passwordHash)
  if (!okPassword) {
    const after = await recordFailure(cleanEmail)
    if (after.locked) {
      throw new AuthError('locked', `Too many failed attempts. Try again in ${after.minutes} minutes.`, 429, { retryAfterMinutes: after.minutes })
    }
    throw invalid
  }

  // Success clears the counter and silently upgrades a weaker stored hash.
  await clearFailures(cleanEmail)
  const data = { lastLoginAt: new Date() }
  if (needsRehash(user.passwordHash)) data.passwordHash = await hashPassword(password)
  const updated = await prisma.user.update({ where: { id: user.id }, data })

  const session = await createSession(user.id, { ...meta, remember })
  return { user: publicUser(updated), token: session.token, expiresAt: session.expiresAt }
}

/* --------------------------------------------------------------- sessions -- */

export async function createSession(userId, { userAgent = '', ip = '', remember = false } = {}) {
  const token = newToken()
  const days = remember ? SESSION_TTL_REMEMBER_DAYS : SESSION_TTL_DAYS
  const expiresAt = new Date(Date.now() + days * 86_400_000)
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      userAgent: String(userAgent).slice(0, 240),
      ip: String(ip).slice(0, 64),
      expiresAt,
    },
  })
  return { token, expiresAt }
}

/** Resolves a bearer token to its user, touching `lastSeen` at most hourly. */
export async function resolveSession(rawToken) {
  if (!rawToken) return null
  const session = await prisma.session.findUnique({ where: { tokenHash: hashToken(rawToken) }, include: { user: true } })
  if (!session || session.revokedAt || session.expiresAt < new Date()) return null
  if (session.user.status !== 'active') return null
  if (Date.now() - new Date(session.lastSeen).getTime() > 3_600_000) {
    prisma.session.update({ where: { id: session.id }, data: { lastSeen: new Date() } }).catch(() => {})
  }
  return session
}

export const revokeSession = (rawToken) =>
  prisma.session.updateMany({ where: { tokenHash: hashToken(rawToken), revokedAt: null }, data: { revokedAt: new Date() } })

export const listSessions = (userId) =>
  prisma.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastSeen: 'desc' },
    select: { id: true, userAgent: true, ip: true, createdAt: true, lastSeen: true, expiresAt: true },
  })

export const revokeSessionById = (userId, id) =>
  prisma.session.updateMany({ where: { id, userId, revokedAt: null }, data: { revokedAt: new Date() } })

export const revokeAllSessions = (userId, { exceptToken } = {}) =>
  prisma.session.updateMany({
    where: { userId, revokedAt: null, ...(exceptToken ? { tokenHash: { not: hashToken(exceptToken) } } : {}) },
    data: { revokedAt: new Date() },
  })

/* ------------------------------------------------------- one-time tokens -- */

export async function issueToken(userId, kind) {
  const token = newToken()
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000)
  await prisma.authToken.create({ data: { userId, kind, tokenHash: hashToken(token), expiresAt } })
  return { token, expiresAt, kind }
}

export async function consumeToken(rawToken, kind) {
  const row = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(rawToken) } })
  if (!row || row.kind !== kind || row.usedAt || row.expiresAt < new Date()) {
    throw new AuthError('invalid_token', 'That link is invalid or has expired. Request a new one.', 400)
  }
  await prisma.authToken.update({ where: { id: row.id }, data: { usedAt: new Date() } })
  return row
}

export async function verifyEmail(rawToken) {
  const row = await consumeToken(rawToken, 'verify_email')
  const user = await prisma.user.update({ where: { id: row.userId }, data: { emailVerified: true } })
  return publicUser(user)
}

/**
 * Always resolves, whether or not the address exists, and always returns a
 * token for a real user so the caller can send the mail. The HTTP layer reports
 * success either way.
 */
export async function requestPasswordReset(email) {
  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } })
  if (!user) return { user: null, token: null }
  const token = await issueToken(user.id, 'reset_password')
  return { user: publicUser(user), token }
}

export async function resetPassword(rawToken, newPassword) {
  const policy = validatePassword(newPassword)
  if (!policy.ok) throw new AuthError('weak_password', policy.problems[0], 422, { problems: policy.problems })

  const row = await consumeToken(rawToken, 'reset_password')
  const user = await prisma.user.update({
    where: { id: row.userId },
    data: {
      passwordHash: await hashPassword(newPassword),
      // A reset is often a response to a compromise, so every existing device
      // is signed out. The user signs back in with the new password.
      sessions: { updateMany: { where: { revokedAt: null }, data: { revokedAt: new Date() } } },
    },
  })
  const session = await createSession(user.id, { userAgent: 'password-reset' })
  return { user: publicUser(user), token: session.token, expiresAt: session.expiresAt, sessionsRevoked: true }
}

export async function changePassword(userId, currentPassword, newPassword, currentToken) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new AuthError('not_found', 'Account not found.', 404)
  if (user.passwordHash && !(await verifyPassword(currentPassword ?? '', user.passwordHash))) {
    throw new AuthError('invalid_credentials', 'Your current password is not correct.', 401)
  }
  const policy = validatePassword(newPassword)
  if (!policy.ok) throw new AuthError('weak_password', policy.problems[0], 422, { problems: policy.problems })

  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(newPassword) } })
  const { count } = await revokeAllSessions(userId, { exceptToken: currentToken })
  return { revokedOtherSessions: count }
}

/* ----------------------------------------------------------------- profile -- */

export async function updateProfile(userId, patch = {}) {
  const data = {}
  if (typeof patch.name === 'string') {
    const name = patch.name.trim()
    if (name.length < 2) throw new AuthError('invalid_name', 'That name is too short.', 422)
    data.name = name.slice(0, 80)
    data.image = initialsAvatar(name)
  }
  if (typeof patch.handle === 'string') {
    const handle = patch.handle.trim().replace(/^@/, '')
    if (handle && !/^[a-z0-9_.]{3,24}$/i.test(handle)) {
      throw new AuthError('invalid_handle', 'Handles are 3–24 characters: letters, numbers, underscore or dot.', 422)
    }
    data.handle = handle ? handle.toLowerCase() : null
  }
  if (typeof patch.bio === 'string') data.bio = patch.bio.slice(0, 280)
  if (typeof patch.country === 'string') data.country = patch.country.slice(0, 64)
  if (typeof patch.timezone === 'string') data.timezone = patch.timezone.slice(0, 64)
  if (typeof patch.role === 'string' && ['buyer', 'seller'].includes(patch.role)) data.role = patch.role

  if (!Object.keys(data).length) throw new AuthError('nothing_to_update', 'No changes to save.', 422)
  const user = await prisma.user.update({ where: { id: userId }, data })
  return publicUser(user)
}

export async function deactivateAccount(userId) {
  await revokeAllSessions(userId)
  const user = await prisma.user.update({ where: { id: userId }, data: { status: 'deactivated' } })
  return publicUser(user)
}

/** Re-enables a deactivated account after proving the password. */
export async function reactivateAccount(email, password) {
  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } })
  if (!user || !user.passwordHash || !(await verifyPassword(password ?? '', user.passwordHash))) {
    throw new AuthError('invalid_credentials', 'That email and password do not match.', 401)
  }
  await clearFailures(user.email)
  const updated = await prisma.user.update({ where: { id: user.id }, data: { status: 'active' } })
  const session = await createSession(user.id)
  return { user: publicUser(updated), token: session.token, expiresAt: session.expiresAt }
}

/* ------------------------------------------------------------------ misc --- */

export const authStats = async () => {
  const [users, sellers, admins, sessions, verified] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'seller' } }),
    prisma.user.count({ where: { role: 'admin' } }),
    prisma.session.count({ where: { revokedAt: null, expiresAt: { gt: new Date() } } }),
    prisma.user.count({ where: { emailVerified: true } }),
  ])
  return { users, sellers, admins, activeSessions: sessions, emailVerified: verified }
}

export { sha256, initialsAvatar }
