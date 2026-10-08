#!/usr/bin/env node
/**
 * auth-test — end-to-end verification of accounts, sessions and recovery.
 *
 * These are the flows where "it looked like it worked" is not good enough: a
 * password reset that leaves the old session alive, a lockout that resets when
 * the server restarts, or a token that can be replayed are all silent, and all
 * of them are security failures rather than bugs.
 *
 * So every check here asserts the *negative* as well as the positive — the
 * revoked token must be refused, the reused link must be rejected, the wrong
 * password must not sign you in.
 *
 *   node scripts/auth-test.mjs            # boots its own API on :3422
 *   API_ORIGIN=http://… node scripts/auth-test.mjs
 */
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import 'dotenv/config'
import { withoutMailer } from './support/env.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const apiRoot = resolve(here, '..')

const results = []
let failed = 0
const ok = (n, d = '') => { const line = `  \x1b[32m✓\x1b[0m ${n}${d ? ` \x1b[2m${d}\x1b[0m` : ''}`; results.push(line); console.log(line) }
const bad = (n, d = '') => { failed++; const line = `  \x1b[31m✗\x1b[0m ${n}${d ? ` \x1b[2m${d}\x1b[0m` : ''}`; results.push(line); console.log(line) }
const check = (c, n, d = '') => (c ? ok(n, d) : bad(n, d))
const head = (s) => console.log(`\n\x1b[1m${s}\x1b[0m`)

const PORT = Number(process.env.AUTH_TEST_PORT ?? 3422)
const origin = process.env.API_ORIGIN ?? `http://127.0.0.1:${PORT}`
let child = null

async function api(path, { method, body, token, headers = {} } = {}) {
  // Infer POST when a body is present — the alternative is a dozen silent
  // GET-with-body mistakes, which fetch rejects outright anyway.
  const verb = method ?? (body ? 'POST' : 'GET')
  const res = await fetch(origin + path, {
    method: verb,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = null
  try { json = JSON.parse(text) } catch { /* non-JSON */ }
  return { status: res.status, json, text, headers: res.headers }
}

/* ------------------------------------------------------------------ boot --- */

if (!process.env.API_ORIGIN) {
  console.log(`\x1b[2mstarting api on :${PORT} …\x1b[0m`)
  // SMTP is blanked for the child process (see scripts/support/env.mjs). This
  // suite proves the verification and reset flows by reading the single-use links
  // out of the API's log, which the API only prints when no mailer is configured:
  // inheriting real credentials would both mail every fixture address and lose
  // the tokens this suite asserts on.
  child = spawn(process.execPath, ['server.js'], {
    cwd: apiRoot,
    env: { ...process.env, ...withoutMailer, PORT: String(PORT), NODE_ENV: 'test', AUTH_MODE: 'local', APP_URL: 'http://localhost:5173' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let boot = ''
  child.stdout.on('data', (d) => { boot += d })
  child.stderr.on('data', (d) => { boot += d })
  process.on('exit', () => child?.kill('SIGKILL'))

  const started = Date.now()
  let up = false
  while (Date.now() - started < 45_000) {
    try { if ((await api('/api/health')).status < 500) { up = true; break } } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 400))
  }
  if (!up) {
    console.error(boot.trim().slice(-2000))
    console.error('\n\x1b[31mAPI failed to boot — is the dev Postgres running?  npm run pg:local\x1b[0m\n')
    process.exit(1)
  }
  globalThis.__apiLog = () => boot
}

/* Unique per run so re-running never collides with a previous account. */
const stamp = Date.now().toString(36)
/* Any throttle row created after this moment belongs to this run. */
const startedAt = new Date()
const email = (who) => `${who}.${stamp}@authtest.dev`
const PASSWORD = 'correct-horse-battery-staple'
const NEW_PASSWORD = 'a-completely-different-secret'

/** Pulls the most recent one-time token for an address out of the API's logs. */
function tokenFromLog(who) {
  const log = globalThis.__apiLog?.() ?? ''
  const lines = log.split('\n').filter((l) => l.includes(who))
  const last = lines.at(-1) ?? ''
  const match = last.match(/token=([A-Za-z0-9_-]+)/)
  return match?.[1] ?? null
}

/* The suite needs log-only mode to see the links it asserts on: with a real
 * mailer configured the API (correctly) stops printing them, and those checks
 * would fail for a reason that has nothing to do with the accounts code. */
head('preflight')
{
  const st = await api('/api/auth/status')
  check(st.json?.mailer === 'log-only', 'the suite runs in log-only mail mode', String(st.json?.mailer))
}

/* ------------------------------------------------------------- 1. signup -- */

head('sign-up')
let buyerToken = null
let buyerId = null
{
  const status = await api('/api/auth/status')
  check(status.status === 200 && status.json?.mode === 'local', 'auth status reports local accounts', status.json?.mode)

  const weak = await api('/api/auth/signup', { body: { email: email('weak'), password: 'password', name: 'Weak Pass', role: 'buyer', acceptTerms: true } })
  check(weak.status === 422 && weak.json?.code === 'weak_password', 'a common password is refused', weak.json?.code)
  check(Array.isArray(weak.json?.problems) && weak.json.problems.length > 1, 'every policy violation is reported', `${weak.json?.problems?.length} problems`)

  const short = await api('/api/auth/signup', { body: { email: email('short'), password: 'abc123', name: 'Short Pass', role: 'buyer', acceptTerms: true } })
  check(short.status === 422, 'a short password is refused', short.json?.code)

  const noTerms = await api('/api/auth/signup', { body: { email: email('noterms'), password: PASSWORD, name: 'No Terms', role: 'buyer' } })
  check(noTerms.status === 422 && noTerms.json?.code === 'terms_required', 'terms must be accepted', noTerms.json?.code)

  const badEmail = await api('/api/auth/signup', { body: { email: 'not-an-email', password: PASSWORD, name: 'Bad Email', role: 'buyer', acceptTerms: true } })
  check(badEmail.status === 422 && badEmail.json?.code === 'invalid_email', 'an invalid email is refused', badEmail.json?.code)

  const created = await api('/api/auth/signup', { body: { email: email('buyer'), password: PASSWORD, name: 'Test Buyer', role: 'buyer', acceptTerms: true, country: 'Kenya' } })
  check(created.status === 201 && created.json?.ok === true, 'an account is created', `201 id=${created.json?.user?.id}`)
  buyerToken = created.json?.token
  buyerId = created.json?.user?.id
  check(Boolean(buyerToken), 'sign-up issues a session token')
  check(created.json?.user?.role === 'buyer', 'the chosen role is stored', created.json?.user?.role)
  check(created.json?.user?.emailVerified === false, 'the new account starts unverified')
  check(!('passwordHash' in (created.json?.user ?? {})), 'the response never contains a password hash')
  check(Boolean(created.json?.emailVerification?.sentTo), 'a verification email is queued', created.json?.emailVerification?.sentTo)
  check(Boolean(created.headers.get('set-cookie')?.includes('HttpOnly')), 'an httpOnly session cookie is set')
  check(created.headers.get('set-cookie')?.includes('SameSite=Lax'), 'the cookie is SameSite=Lax')

  const dupe = await api('/api/auth/signup', { body: { email: email('buyer'), password: PASSWORD, name: 'Test Buyer', role: 'buyer', acceptTerms: true } })
  check(dupe.status === 409 && dupe.json?.code === 'email_taken', 'a duplicate email is refused', dupe.json?.code)

  const casing = await api('/api/auth/signup', { body: { email: email('buyer').toUpperCase(), password: PASSWORD, name: 'Case Test', role: 'buyer', acceptTerms: true } })
  check(casing.status === 409, 'email matching is case-insensitive', `${casing.status}`)
}

/* -------------------------------------------------------------- 2. login -- */

head('sign-in')
{
  const wrong = await api('/api/auth/login', { body: { email: email('buyer'), password: 'definitely-not-it' } })
  check(wrong.status === 401 && wrong.json?.code === 'invalid_credentials', 'a wrong password is refused', wrong.json?.code)
  check(!('attemptsLeft' in (wrong.json ?? {})), 'the failure response carries no attempt counter')

  const unknown = await api('/api/auth/login', { body: { email: email('ghost'), password: 'definitely-not-it' } })
  check(unknown.status === 401 && unknown.json?.message === wrong.json?.message, 'an unknown address gives the identical error (no enumeration)')

  const upper = await api('/api/auth/login', { body: { email: email('buyer').toUpperCase(), password: PASSWORD } })
  check(upper.status === 200, 'sign-in works regardless of email casing')

  const good = await api('/api/auth/login', { body: { email: email('buyer'), password: PASSWORD, remember: true } })
  check(good.status === 200 && Boolean(good.json?.token), 'a correct password signs in')
  check(Boolean(good.json?.user?.lastLoginAt), 'lastLoginAt is recorded', good.json?.user?.lastLoginAt?.slice(0, 19))
  buyerToken = good.json.token

  const session = await api('/api/auth/session', { token: buyerToken })
  check(session.json?.authenticated === true && session.json?.user?.id === buyerId, 'the token resolves to the account')

  const anon = await api('/api/auth/session')
  check(anon.status === 200 && anon.json?.authenticated === false, 'an anonymous session is reported, not an error', `${anon.status}`)

  const garbage = await api('/api/auth/session', { token: 'not-a-real-token-at-all' })
  check(garbage.json?.authenticated === false, 'a garbage token resolves to nobody')
}

/* ------------------------------------------------------------ 3. gating --- */

head('authorisation')
{
  const anonList = await api('/api/me/listings')
  check(anonList.status === 401, 'a protected route refuses anonymous callers', `${anonList.status}`)

  const authedList = await api('/api/me/listings', { token: buyerToken })
  check(authedList.status === 200, 'the same route accepts a signed-in user', `${authedList.status}`)

  const buyerAdmin = await api('/api/admin/dashboard', { token: buyerToken })
  check(buyerAdmin.status === 403, 'a buyer cannot reach the ops desk', `${buyerAdmin.status}`)

  const adminLogin = await api('/api/auth/login', { body: { email: 'ops@reachmarklogs.test', password: process.env.DEMO_PASSWORD ?? 'reachmark-demo-2026' } })
  check(adminLogin.status === 200 && adminLogin.json?.user?.role === 'admin', 'the seeded ops account signs in as an admin', adminLogin.json?.user?.role)
  const adminDash = await api('/api/admin/dashboard', { token: adminLogin.json.token })
  check(adminDash.status === 200, 'the ops desk opens for an admin', `${adminDash.status}`)

  const sellerLogin = await api('/api/auth/login', { body: { email: 'ada@reachmarklogs.test', password: process.env.DEMO_PASSWORD ?? 'reachmark-demo-2026' } })
  check(sellerLogin.status === 200 && sellerLogin.json?.user?.role === 'seller', 'the seeded seller account signs in', sellerLogin.json?.user?.role)
  const sellerProfile = await api('/api/auth/profile', { method: 'PATCH', token: sellerLogin.json.token, body: { bio: 'Test bio' } })
  check(sellerProfile.status === 200 && sellerProfile.json?.user?.bio === 'Test bio', 'a signed-in user can edit their own profile')
  const badHandle = await api('/api/auth/profile', { method: 'PATCH', token: sellerLogin.json.token, body: { handle: 'no spaces allowed' } })
  check(badHandle.status === 422, 'an invalid handle is refused', badHandle.json?.code)
}

/* ----------------------------------------------------------- 4. sessions -- */

head('sessions & revocation')
{
  const second = await api('/api/auth/login', { body: { email: email('buyer'), password: PASSWORD } })
  const otherToken = second.json.token

  const list = await api('/api/auth/sessions', { token: buyerToken })
  check(list.status === 200 && list.json?.items?.length >= 2, 'both devices are listed', `${list.json?.items?.length} sessions`)
  check(list.json.items.filter((s) => s.current).length === 1, 'exactly one session is marked current')
  check(list.json.items.every((s) => !('tokenHash' in s)), 'the session list never exposes token hashes')

  const revokeOthers = await api('/api/auth/sessions/revoke-others', { method: 'POST', token: buyerToken })
  check(revokeOthers.json?.revoked >= 1, 'revoke-others ends the other devices', `${revokeOthers.json?.revoked} revoked`)

  const otherAfter = await api('/api/auth/session', { token: otherToken })
  check(otherAfter.json?.authenticated === false, 'the revoked device is signed out')
  const otherProtected = await api('/api/me/listings', { token: otherToken })
  check(otherProtected.status === 401, 'and is refused by protected routes', `${otherProtected.status}`)
  const kept = await api('/api/auth/session', { token: buyerToken })
  check(kept.json?.authenticated === true, 'the current device keeps its session')

  const revoked = await api('/api/auth/logout', { method: 'POST', token: otherToken })
  check(revoked.status === 200, 'logout is idempotent for an already-dead token', `${revoked.status}`)
}

/* ------------------------------------------------------------- 5. resets -- */

head('password reset')
{
  const unknown = await api('/api/auth/forgot-password', { body: { email: email('nobody') } })
  check(unknown.status === 200, 'an unknown address still reports success', `${unknown.status}`)
  check(!unknown.json?.devUrl, 'and leaks no link')

  const known = await api('/api/auth/forgot-password', { body: { email: email('buyer') } })
  check(known.json?.message === unknown.json?.message, 'the response is indistinguishable from the unknown-address case')

  const resetToken = known.json?.devUrl?.split('token=')[1] ?? tokenFromLog(email('buyer'))
  check(Boolean(resetToken), 'a reset link is issued', `${String(resetToken).slice(0, 10)}…`)

  const weak = await api('/api/auth/reset-password', { body: { token: resetToken, password: 'password' } })
  check(weak.status === 422, 'the reset enforces the password policy', weak.json?.code)

  const before = await api('/api/auth/login', { body: { email: email('buyer'), password: PASSWORD } })
  check(before.status === 200, 'the old password still works before the reset')

  const done = await api('/api/auth/reset-password', { body: { token: resetToken, password: NEW_PASSWORD } })
  check(done.status === 200 && done.json?.sessionsRevoked === true, 'the reset succeeds and reports session revocation', `revoked=${done.json?.sessionsRevoked}`)

  const oldPassword = await api('/api/auth/login', { body: { email: email('buyer'), password: PASSWORD } })
  check(oldPassword.status === 401, 'the old password no longer works', `${oldPassword.status}`)

  const newPassword = await api('/api/auth/login', { body: { email: email('buyer'), password: NEW_PASSWORD } })
  check(newPassword.status === 200, 'the new password works')
  buyerToken = newPassword.json.token

  const reuse = await api('/api/auth/reset-password', { body: { token: resetToken, password: 'yet-another-secret-1' } })
  check(reuse.status === 400 && reuse.json?.code === 'invalid_token', 'the reset link cannot be replayed', reuse.json?.code)

  const bogus = await api('/api/auth/reset-password', { body: { token: 'made-up-token', password: NEW_PASSWORD } })
  check(bogus.status === 400, 'a fabricated token is refused', bogus.json?.code)
}

/* --------------------------------------------------------- 6. lockout ----- */

head('brute-force lockout')
{
  const victim = email('locktarget')
  await api('/api/auth/signup', { body: { email: victim, password: PASSWORD, name: 'Lock Target', role: 'buyer', acceptTerms: true } })

  // The throttle must work for addresses with no account too, otherwise the
  // counter itself reveals which addresses are registered.
  let lockedUnknownAt = null
  for (let i = 1; i <= 9; i++) {
    const r = await api('/api/auth/login', { body: { email: email('never-registered'), password: `wrong-${i}` } })
    if (r.json?.code === 'locked') { lockedUnknownAt = i; break }
  }
  check(lockedUnknownAt !== null, 'an unregistered address is throttled identically', `locked on attempt ${lockedUnknownAt}`)

  let lockedAt = null
  for (let i = 1; i <= 8; i++) {
    const r = await api('/api/auth/login', { body: { email: victim, password: `wrong-${i}` } })
    if (r.json?.code === 'locked') { lockedAt = i; break }
  }
  check(lockedAt !== null, 'repeated failures lock the account', `locked on attempt ${lockedAt}`)

  const correctWhileLocked = await api('/api/auth/login', { body: { email: victim, password: PASSWORD } })
  check(correctWhileLocked.status === 429 && correctWhileLocked.json?.code === 'locked', 'even the correct password is refused while locked')
  check(correctWhileLocked.json?.retryAfterMinutes > 0, 'it says how long to wait', `${correctWhileLocked.json?.retryAfterMinutes} min`)
}

/* --------------------------------------------------- 7. password change --- */

head('change password')
{
  const parent = email('changer')
  await api('/api/auth/signup', { body: { email: parent, password: PASSWORD, name: 'Changer', role: 'buyer', acceptTerms: true } })
  const deviceA = (await api('/api/auth/login', { body: { email: parent, password: PASSWORD } })).json.token
  const deviceB = (await api('/api/auth/login', { body: { email: parent, password: PASSWORD } })).json.token

  const wrongCurrent = await api('/api/auth/change-password', { method: 'POST', token: deviceA, body: { currentPassword: 'not-my-password', password: NEW_PASSWORD } })
  check(wrongCurrent.status === 401, 'the current password is required', `${wrongCurrent.status}`)

  const changed = await api('/api/auth/change-password', { method: 'POST', token: deviceA, body: { currentPassword: PASSWORD, password: NEW_PASSWORD } })
  check(changed.status === 200 && changed.json?.revokedOtherSessions >= 1, 'the change succeeds and counts the revoked devices', `${changed.json?.revokedOtherSessions} revoked`)

  const aStillIn = await api('/api/auth/session', { token: deviceA })
  check(aStillIn.json?.authenticated === true, 'the device that changed it stays signed in')
  const bOut = await api('/api/auth/session', { token: deviceB })
  check(bOut.json?.authenticated === false, 'the other device is signed out')

  const reLogin = await api('/api/auth/login', { body: { email: parent, password: NEW_PASSWORD } })
  check(reLogin.status === 200, 'the new password signs in')
}

/* ------------------------------------------------------ 8. verification ---- */

head('email verification')
{
  const who = email('verifier')
  const created = await api('/api/auth/signup', { body: { email: who, password: PASSWORD, name: 'Verifier', role: 'buyer', acceptTerms: true } })
  const token = created.json.token
  check(created.json.user.emailVerified === false, 'a fresh account is unverified')

  const resent = await api('/api/auth/resend-verification', { method: 'POST', token })
  const verifyToken = resent.json?.devUrl?.split('token=')[1] ?? tokenFromLog(who)
  check(Boolean(verifyToken), 'a verification link is issued')

  const verified = await api('/api/auth/verify-email', { body: { token: verifyToken } })
  check(verified.status === 200 && verified.json?.user?.emailVerified === true, 'the link confirms the address')

  const replay = await api('/api/auth/verify-email', { body: { token: verifyToken } })
  check(replay.status === 400, 'the confirmation link cannot be replayed', replay.json?.code)
}

/* ---------------------------------------------------- 9. account closure -- */

head('deactivation')
{
  const who = email('leaver')
  const created = await api('/api/auth/signup', { body: { email: who, password: PASSWORD, name: 'Leaver', role: 'buyer', acceptTerms: true } })
  const token = created.json.token

  const closed = await api('/api/auth/deactivate', { method: 'POST', token })
  check(closed.status === 200 && closed.json?.user?.status === 'deactivated', 'the account can be closed', closed.json?.user?.status)

  const afterClose = await api('/api/auth/session', { token })
  check(afterClose.json?.authenticated === false, 'closing it signs the device out')

  const signInWhileClosed = await api('/api/auth/login', { body: { email: who, password: PASSWORD } })
  check(signInWhileClosed.status === 403 && signInWhileClosed.json?.code === 'deactivated', 'signing in while closed says so plainly', signInWhileClosed.json?.code)

  const restored = await api('/api/auth/reactivate', { body: { email: who, password: PASSWORD } })
  check(restored.status === 200 && restored.json?.user?.status === 'active', 'it can be restored', restored.json?.user?.status)
}

/* --------------------------------------------------------- 10. hardening -- */

head('storage hardening')
{
  /*
   * The local dev Postgres (PGlite over the wire protocol) serves one connection
   * at a time, so the API has to release it before this script can look at the
   * tables directly. Everything above ran against the API; this block is the only
   * one that touches the database itself, and it runs last.
   */
  if (child) {
    child.kill('SIGTERM')
    await new Promise((r) => { child.once('exit', r); setTimeout(r, 5000) })
    child = null
    await new Promise((r) => setTimeout(r, 400))
  }
  // The app's own client — same adapter and connection string the API uses,
  // rather than a second client that could be pointed somewhere else.
  const { default: prisma } = await import('../src/configs/prisma.js')
  try {
    const user = await prisma.user.findUnique({ where: { email: email('buyer') }, select: { id: true, passwordHash: true } })
    check(Boolean(user?.passwordHash?.startsWith('scrypt$')), 'the stored hash is scrypt, not plaintext', String(user?.passwordHash).split('$').slice(0, 4).join('$'))
    check(user?.passwordHash?.split('$')[4]?.length > 0, 'a per-user salt is present')

    const a = await prisma.user.findUnique({ where: { email: email('verifier') }, select: { passwordHash: true } })
    const b = await prisma.user.findUnique({ where: { email: email('leaver') }, select: { passwordHash: true } })
    check(a.passwordHash !== b.passwordHash || PASSWORD.length > 0 ? a.passwordHash.split('$')[4] !== b.passwordHash.split('$')[4] : false,
      'two accounts with the same password get different salts')

    const sessions = await prisma.session.findMany({ take: 5, select: { tokenHash: true } })
    check(sessions.every((s) => /^[a-f0-9]{64}$/.test(s.tokenHash)), 'session tokens are stored only as sha256 digests')

    const used = await prisma.authToken.findMany({ take: 5, select: { tokenHash: true, usedAt: true } })
    check(used.every((t) => /^[a-f0-9]{64}$/.test(t.tokenHash)), 'one-time tokens are hashed at rest too')

    // The token we hold must hash to a row — proving the digest, not the raw
    // value, is what the database keeps.
    const digest = createHash('sha256').update(buyerToken).digest('hex')
    const match = await prisma.session.findFirst({ where: { tokenHash: digest } })
    check(Boolean(match), 'the live bearer token exists only as a digest in the database')

    /* ---------------------------------------------------------- teardown --- */

    // This suite runs against the same database a developer then uses by hand,
    // so it takes its fixtures with it. Every address it creates is under
    // @authtest.dev and every throttle row is keyed by a digest of one, so the
    // purge cannot touch a real account — including the demo logins used above
    // to prove role gating, which are deliberately left alone.
    const fixtures = await prisma.user.findMany({
      where: { email: { endsWith: '@authtest.dev' } },
      select: { id: true, email: true },
    })
    const ids = fixtures.map((u) => u.id)

    // Throttle rows are keyed by a digest of the address, and the suite
    // deliberately throttles addresses that were never registered (that is how
    // the anti-enumeration guarantee is proven), so they cannot be found by
    // looking up users. Purge by the addresses the suite actually used.
    const addresses = ['buyer', 'verifier', 'leaver', 'changer', 'locktarget', 'ghost', 'nobody', 'never-registered']
      .flatMap((who) => [email(who), email(who).toUpperCase()])
    const attemptKeys = { in: addresses.map((a) => createHash('sha256').update(`login:${a}`).digest('hex')) }

    if (ids.length) {
      await prisma.session.deleteMany({ where: { userId: { in: ids } } })
      await prisma.authToken.deleteMany({ where: { userId: { in: ids } } })
      await prisma.user.deleteMany({ where: { id: { in: ids } } })
    }
    // Also sweep rows this run created for addresses we did not enumerate
    // above. Nothing else can write to this database while the suite runs (it
    // spawns its own API and the dev Postgres takes one connection), so the
    // timestamp is a reliable boundary.
    await prisma.loginAttempt.deleteMany({ where: { OR: [{ key: attemptKeys }, { firstAt: { gte: startedAt } }] } })
    const leftovers = await prisma.user.count({ where: { email: { endsWith: '@authtest.dev' } } })
    const stuck = await prisma.loginAttempt.count({ where: { key: attemptKeys } })
    check(leftovers === 0 && stuck === 0, 'the suite cleans up after itself',
      `${ids.length} fixture accounts and every throttle row removed`)
  } finally {
    await prisma.$disconnect()
  }
}

/* ---------------------------------------------------------------- report --- */

const total = results.length
console.log(failed === 0 ? `\n\x1b[32m\x1b[1mPASS\x1b[0m ${total}/${total} auth checks\n` : `\n\x1b[31m\x1b[1mFAIL\x1b[0m ${failed}/${total} auth checks failed\n`)
child?.kill('SIGTERM')
process.exit(failed === 0 ? 0 : 1)
