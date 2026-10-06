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
 * All three are fixed below. A no-op mode was also added: with no SMTP
 * credentials the mailer logs and resolves instead of throwing, so seeding,
 * verification and the E2E harness run without an SMTP account.
 */
import nodemailer from 'nodemailer'

const from = process.env.SENDER_EMAIL ?? process.env.MAIL_FROM ?? 'desk@reachmarklogs.test'
const configured = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS)

const transporter = configured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? 'smtp-relay.brevo.com',
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT ?? 587) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null

const sendEmail = async ({ to, subject, html, text, replyTo }) => {
  if (!to) throw new Error('sendEmail: `to` is required')

  if (!transporter) {
    console.log(`[mail:noop] → ${to} · ${subject} (set SMTP_USER/SMTP_PASS to actually deliver)`)
    return { accepted: [to], response: 'noop (SMTP not configured)', messageId: `noop-${Date.now()}` }
  }

  return transporter.sendMail({ from, to, subject, html, text, replyTo })
}

export const mailerConfigured = () => configured
export default sendEmail
