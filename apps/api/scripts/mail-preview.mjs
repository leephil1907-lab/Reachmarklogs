#!/usr/bin/env node
/**
 * mail:preview — renders every transactional mail to a single HTML page.
 *
 * Mail is the one surface you cannot Ctrl-R. Reviewing it normally means sending
 * yourself four messages and opening each one, so this renders the same templates
 * the API sends into docs/mail-preview.html where they can be read side by side
 * and diffed in review.
 *
 * The page is built from the templates themselves — not a copy — so a change to
 * a subject line or a button label shows up here immediately. Sample links are
 * deliberately fake and inert.
 *
 *   npm run mail:preview
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { verifyEmailMail, passwordResetMail, passwordChangedMail, noticeMail } from '../src/services/mailTemplates.js'

const here = dirname(fileURLToPath(import.meta.url))
const out = resolve(here, '../../../docs/mail-preview.html')

const APP = 'https://reachmarklogs.example'

const messages = [
  { key: 'verify', when: 'on signup, and on “resend verification”', mail: verifyEmailMail({ name: 'Ada Okonjo', url: `${APP}/auth/verify?token=SAMPLE-token-not-real` }) },
  { key: 'reset', when: 'on “forgot password”', mail: passwordResetMail({ name: 'Ada Okonjo', url: `${APP}/auth/reset?token=SAMPLE-token-not-real`, ip: '102.89.34.19' }) },
  { key: 'changed', when: 'after any password change, to the account owner', mail: passwordChangedMail({ name: 'Ada Okonjo', when: new Date('2026-10-08T16:06:00Z'), ip: '102.89.34.19' }) },
  {
    key: 'notice',
    when: 'account lifecycle notices',
    mail: noticeMail({
      heading: 'Your account was deactivated',
      preheader: 'Your listings are hidden until you sign back in.',
      intro: 'Hi Ada — your Reachmark Logs account has been deactivated, as requested.',
      paragraphs: [
        'Your listings are hidden from the catalog and no new orders can be placed against them. Escrow on orders already in progress still settles normally — deactivating does not cancel a trade.',
        'Signing in again restores the account exactly as you left it.',
      ],
    }),
  },
]

/** Pulls the inner body out of a full email document so several can sit on one
 *  page. The templates carry all their styling inline, so nothing depends on the
 *  <head> being preserved. */
const bodyOf = (html) => (html.match(/<body[^>]*>([\s\S]*)<\/body>/) ?? [, html])[1]

const card = ({ key, when, mail }) => `
  <section style="margin:0 0 34px;">
    <header style="display:flex;flex-wrap:wrap;gap:10px;align-items:baseline;margin:0 0 10px;padding:0 2px;">
      <code style="font-size:12px;color:#22d3ee;background:#101728;border:1px solid #232a41;border-radius:6px;padding:3px 8px;">${key}</code>
      <strong style="font-size:14px;color:#e8ecf6;">${mail.subject.replace(/</g, '&lt;')}</strong>
      <span style="font-size:12px;color:#7c869d;">${when}</span>
    </header>
    <!-- The email's own body, inline styles intact. -->
    <div style="border:1px solid #232a41;border-radius:14px;overflow:hidden;">${bodyOf(mail.html)}</div>
    <details style="margin:10px 2px 0;">
      <summary style="cursor:pointer;font-size:12px;color:#7c869d;">text/plain alternative, as the recipient’s client sees it</summary>
      <pre style="margin:8px 0 0;padding:12px 14px;background:#0d1220;border:1px solid #1c2338;border-radius:10px;color:#aab4c9;font-size:12px;line-height:18px;white-space:pre-wrap;word-break:break-word;">${mail.text.replace(/</g, '&lt;')}</pre>
    </details>
  </section>`

const page = `<!doctype html>
<html lang="en" class="dark">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Reachmark Logs — transactional mail</title>
</head>
<body style="margin:0;background:#080b14;color:#e8ecf6;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:760px;margin:0 auto;padding:40px 22px 60px;">
    <div style="font-size:22px;font-weight:700;letter-spacing:-0.3px;">Reachmark<span style="color:#7c5cff;">Logs</span> <span style="font-weight:400;color:#7c869d;">· transactional mail</span></div>
    <p style="margin:10px 0 6px;color:#aab4c9;font-size:14px;line-height:22px;">
      Rendered from <code style="color:#22d3ee;">apps/api/src/services/mailTemplates.js</code> — the same functions the API calls when it sends.
      Every link below is a placeholder.
    </p>
    <p style="margin:0 0 32px;color:#7c869d;font-size:12px;">
      Regenerate with <code>npm run mail:preview</code>. Layout is table-based with inline styles only, so it survives
      Outlook, Gmail and dark-mode inversion; each message ships a real <code>text/plain</code> part, shown under each preview.
    </p>
    <div style="height:1px;background:#1c2338;margin:0 0 32px;"></div>
    ${messages.map(card).join('\n')}
  </div>
</body>
</html>`

mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, page)
console.log(`\n  rendered ${messages.length} messages → docs/mail-preview.html\n`)
