#!/usr/bin/env node
/**
 * mail:verify — proves the SMTP credentials work, without sending anything.
 *
 *   npm run mail:verify                          # authenticate and open the channel
 *   npm run mail:verify -- --to you@example.com  # …then actually deliver one message
 *
 * "Configured" and "working" are different claims, and only the second one
 * matters: 535 means the app password is wrong or revoked, 534 means the account
 * is still expecting the account password because 2-step verification is off.
 * Both of those otherwise surface as a silent failure three screens into a
 * signup form, so this reports them plainly.
 */
import 'dotenv/config'
import { verifyMailer, mailerConfigured, mailerFrom, sendEmail } from '../src/configs/nodemailer.js'

const args = process.argv.slice(2)
const toIndex = args.indexOf('--to')
const to = toIndex >= 0 ? args[toIndex + 1] : null

if (!mailerConfigured()) {
  console.error('\n\x1b[31m✗ SMTP is not configured.\x1b[0m')
  console.error('  Set SMTP_USER and SMTP_PASS in apps/api/.env, then run this again.')
  console.error('  Until then the API runs in log-only mode: it prints the links it would have emailed.\n')
  process.exit(1)
}

console.log(`\n\x1b[1mVerifying SMTP\x1b[0m`)
console.log(`  from : ${mailerFrom()}`)

const result = await verifyMailer()

if (!result.ok) {
  console.error(`\n\x1b[31m✗ Authentication failed\x1b[0m  host=${result.host}:${result.port}  code=${result.reason}`)
  console.error(`  ${result.message}`)
  if (String(result.reason) === '535' || /535/.test(String(result.message))) {
    console.error('\n  Gmail rejected the app password. Generate a fresh one at')
    console.error('  https://myaccount.google.com/apppasswords — it needs 2-step verification on,')
    console.error('  and the previous password is revoked the moment a new one is created.')
  }
  console.error('')
  process.exit(1)
}

console.log(`  host : ${result.host}:${result.port} · authenticated \x1b[32m✓\x1b[0m`)

if (!to) {
  console.log('\n\x1b[32m\x1b[1mPASS\x1b[0m credentials accepted (no message sent — pass --to <address> to deliver one)\n')
  process.exit(0)
}

const started = Date.now()
const info = await sendEmail({
  to,
  subject: 'Reachmark Logs — SMTP check',
  text: [
    'This is the Reachmark Logs mailer checking in.',
    '',
    `Sent from ${mailerFrom()} through Gmail SMTP.`,
    'If you are reading this, verification and password-reset mail will deliver.',
    '',
    `— Reachmark Logs, ${new Date().toISOString()}`,
  ].join('\n'),
})

console.log(`  sent : 1 message to ${to} in ${Date.now() - started}ms`)
console.log(`  id   : ${info.messageId}`)
console.log(`  reply: ${info.response}`)
console.log(`\n\x1b[32m\x1b[1mPASS\x1b[0m delivered — check the inbox for ${to}\n`)
