/**
 * Mailer — fixed and hardened during the merge.
 *
 * The upstream AccountsBazaar file had three defects that made it unusable:
 *   1. `ro,` inside the sendMail payload — an undeclared identifier, so every
 *      send threw a ReferenceError.
 *   2. `to` was destructured but never passed to sendMail, so nothing addressed
 *      the message.
 *   3. `from: "process.env.SENDER_EMAIL"` was a string literal, not the env var.
 *
 * All three are fixed below. Two modes remain, and the difference is visible in
 * `/api/auth/status` as `mailer: 'smtp' | 'log-only'`:
 *
 *   - **smtp** — SMTP_USER + SMTP_PASS are set, so mail is really delivered.
 *   - **log-only** — no credentials (a fresh clone, or the test suites), so the
 *     mailer logs and resolves instead of throwing. That keeps seeding, the E2E
 *     harness and CI runnable without an email account, and it is why the auth
 *     controllers print dev links only when this mode is active.
 */
import nodemailer from 'nodemailer'

const user = process.env.SMTP_USER?.trim()
// Gmail shows app passwords as four space-separated groups for legibility. The
// protocol wants them without spaces, and pasting them as-displayed is the most
// common way this breaks — so normalise rather than trusting the input.
const pass = process.env.SMTP_PASS?.replace(/\s+/g, '')

const configured = Boolean(user && pass)

const host = process.env.SMTP_HOST ?? 'smtp.gmail.com'
const port = Number(process.env.SMTP_PORT ?? 465)

/**
 * Prefer an explicit MAIL_FROM/SENDER_EMAIL, but fall back to the authenticated
 * mailbox. Sending as anything other than the account you authenticated as gets
 * Gmail to rewrite the header (or refuse outright), which makes the mismatch
 * look like a client bug rather than a configuration one.
 */
const from =
  process.env.SENDER_EMAIL ??
  process.env.MAIL_FROM ??
  (user ? `Reachmark Logs <${user}>` : 'desk@reachmarklogs.test')

const transporter = configured
  ? nodemailer.createTransport({
      host,
      port,
      // 465 is implicit TLS; 587 starts plaintext and upgrades. Deriving it from
      // the port unless SMTP_SECURE says otherwise avoids the classic
      // "wrong version number" handshake error from getting this backwards.
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
      auth: { user, pass },
      // A hung SMTP connection must not hold an HTTP request open forever — a
      // signup that cannot send its welcome mail should still create the
      // account quickly and let the user resend.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
      pool: true,
      maxConnections: 2,
    })
  : null

export const sendEmail = async ({ to, subject, html, text, replyTo }) => {
  if (!to) throw new Error('sendEmail: `to` is required')

  if (!transporter) {
    console.log(`[mail:noop] → ${to} · ${subject} (set SMTP_USER/SMTP_PASS to actually deliver)`)
    return { accepted: [to], response: 'noop (SMTP not configured)', messageId: `noop-${Date.now()}` }
  }

  const info = await transporter.sendMail({ from, to, subject, html, text, replyTo: replyTo ?? process.env.SUPPORT_EMAIL })

  // "Did that signup mail actually go out?" is the first question anyone asks
  // when a user says they never got it, and the API log otherwise stays silent
  // on success precisely because the mailer used to be a no-op. One line per
  // message, including Gmail's own acceptance response, makes it answerable.
  // (Set MAIL_LOG=quiet to suppress at volume.)
  if (process.env.MAIL_LOG !== 'quiet') {
    console.log(`[mail] sent → ${to} · ${subject} · ${info.messageId} · ${info.response}`)
  }

  return info
}

export const mailerConfigured = () => configured

/** Where mail claims to come from — surfaced by /api/auth/status so an operator
 *  can see the real sender without reading the environment by hand. */
export const mailerFrom = () => from

/**
 * Proves the credentials actually work rather than merely being present.
 * Called by `npm run mail:verify`; never on the request path, because an SMTP
 * round-trip on every boot would make the API's startup depend on Gmail being
 * reachable.
 */
export const verifyMailer = async () => {
  if (!transporter) return { ok: false, reason: 'not-configured' }
  try {
    await transporter.verify()
    return { ok: true, host, port, from }
  } catch (error) {
    // Gmail's auth failures land here: 535 for a bad app password, and 534 when
    // the account requires an app password and was given the account password.
    return { ok: false, reason: error.code ?? 'error', message: error.message, host, port }
  }
}

export default sendEmail
