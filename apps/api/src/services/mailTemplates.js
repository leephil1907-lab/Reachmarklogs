/**
 * Mail templates.
 *
 * These are product surfaces, not plumbing: the first thing a new seller sees is
 * the confirmation mail, and the only thing a locked-out user sees is the reset
 * mail. They were plain `text:` one-liners while the mailer was log-only; now
 * that real messages land in real inboxes they get the same dark / electric
 * treatment as the app.
 *
 * Rules this file obeys, because mail clients are not browsers:
 *   - Table layout with inline styles only. No flexbox, no grid, no <style>
 *     block that a client may strip, no external stylesheet.
 *   - A button that survives Outlook: an <a> inside a table cell with a
 *     background colour, not a CSS-styled box.
 *   - Dark card on a dark page, but light text on both — several clients force
 *     inverted colours, and a message that becomes unreadable is worse than one
 *     that looks plain.
 *   - Every message ships a real text/plain alternative. Spam filters weigh on
 *     HTML-only mail, and text is what shows in a watch notification.
 */

const ACCENT = '#7c5cff'
const ACCENT_SOFT = '#22d3ee'
const INK = '#0b0e17'
const CARD = '#141929'
const LINE = '#252c42'
const BODY = '#c8cfe0'
const DIM = '#8b95ad'

const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

/**
 * One layout, three messages. `cta` is optional; without it the message is a
 * notice (something happened to your account) rather than a request to act.
 */
function layout({ preheader, heading, intro, paragraphs = [], cta, note, footer }) {
  const body = paragraphs.map((p) => `<p style="margin:0 0 14px;color:${BODY};font-size:15px;line-height:23px;">${p}</p>`).join('')

  const button = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 8px;">
        <tr><td align="center" bgcolor="${ACCENT}" style="border-radius:10px;">
          <a href="${esc(cta.url)}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${esc(cta.label)}</a>
        </td></tr>
      </table>
      <p style="margin:0 0 18px;color:${DIM};font-size:12px;line-height:19px;word-break:break-all;">Button not working? Paste this into your browser:<br /><a href="${esc(cta.url)}" style="color:${ACCENT_SOFT};text-decoration:none;">${esc(cta.url)}</a></p>`
    : ''

  const noteBlock = note
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 0;border-top:1px solid ${LINE};">
        <tr><td style="padding-top:16px;color:${DIM};font-size:13px;line-height:20px;">${note}</td></tr>
      </table>`
    : ''

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="dark light" />
  <meta name="supported-color-schemes" content="dark light" />
  <title>${esc(heading)}</title>
</head>
<body style="margin:0;padding:0;background:${INK};">
  <!-- Shown next to the subject line in most inboxes; hidden in the body. -->
  <div style="display:none;font-size:1px;color:${INK};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${esc(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${INK};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${CARD};border:1px solid ${LINE};border-radius:16px;">
        <tr><td style="padding:28px 30px 8px;">
          <div style="font-size:17px;font-weight:700;color:#ffffff;letter-spacing:-0.2px;">
            Reachmark<span style="color:${ACCENT};">Logs</span>
          </div>
          <div style="margin-top:4px;font-size:12px;color:${DIM};letter-spacing:0.3px;text-transform:uppercase;">Escrow-protected digital logs</div>
        </td></tr>
        <tr><td style="padding:18px 30px 30px;">
          <h1 style="margin:6px 0 14px;font-size:22px;line-height:30px;color:#ffffff;font-weight:700;">${esc(heading)}</h1>
          <p style="margin:0 0 14px;color:${BODY};font-size:15px;line-height:23px;">${intro}</p>
          ${body}
          ${button}
          ${noteBlock}
        </td></tr>
        <tr><td style="padding:18px 30px 26px;border-top:1px solid ${LINE};color:${DIM};font-size:12px;line-height:19px;">
          ${footer ?? 'You are receiving this because someone used this address at Reachmark Logs.'}
        </td></tr>
      </table>
      <div style="max-width:560px;margin:14px auto 0;color:${DIM};font-size:11px;line-height:17px;text-align:center;">
        Reachmark Logs · escrow-protected marketplace for digital logs
      </div>
    </td></tr>
  </table>
</body>
</html>`
}

const mins = (m) => (m >= 60 ? `${Math.round(m / 60)} hour${m >= 120 ? 's' : ''}` : `${m} minutes`)
const hours = (m) => (m >= 60 ? `${Math.round(m / 60)} hour${m >= 120 ? 's' : ''}` : `${m} minutes`)

/** Sent on signup and on resend. */
export function verifyEmailMail({ name, url, ttlMinutes = 60 }) {
  const who = name?.split(' ')[0] || 'there'
  return {
    subject: 'Confirm your Reachmark Logs account',
    html: layout({
      preheader: `One tap to confirm ${who === 'there' ? 'your' : `${who}'s`} email and start selling.`,
      heading: 'Confirm your email',
      intro: `Welcome aboard, ${esc(who)}.`,
      paragraphs: [
        'Confirm this address to unlock listing, buying and payouts. Accounts that stay unconfirmed can browse, but cannot trade.',
        'This link can only be used once.',
      ],
      cta: { label: 'Confirm email address', url },
      note: `The link expires in ${mins(ttlMinutes)}. If you did not create a Reachmark Logs account, ignore this message — nothing was activated.`,
    }),
    text: `Welcome to Reachmark Logs, ${who}.

Confirm your email to unlock selling and payouts:
${url}

This link can only be used once and expires in ${mins(ttlMinutes)}.

If you did not create an account, ignore this message — nothing was activated.
`,
  }
}

/** Sent by forgot-password. */
export function passwordResetMail({ name, url, ttlMinutes = 60, ip }) {
  const who = name?.split(' ')[0] || 'there'
  return {
    subject: 'Reset your Reachmark Logs password',
    html: layout({
      preheader: 'A single-use link to set a new password. Expires shortly.',
      heading: 'Set a new password',
      intro: `Hi ${esc(who)} — someone asked to reset the password on this account.`,
      paragraphs: [
        'Choose a new one with the link below. For safety, using it signs out every device that is currently signed in.',
      ],
      cta: { label: 'Choose a new password', url },
      note: `The link expires in ${mins(ttlMinutes)} and works once.${ip ? ` Requested from ${esc(ip)}.` : ''} If this was not you, no action is needed — your password has not changed, and you can ignore this message.`,
    }),
    text: `Hi ${who},

Someone asked to reset the password on your Reachmark Logs account.

Choose a new one here (single use, expires in ${mins(ttlMinutes)}):
${url}

Using this link signs out every device currently signed in.
${ip ? `\nRequested from ${ip}.` : ''}
If this was not you, no action is needed — your password has not changed.
`,
  }
}

/**
 * Sent after a password actually changes (reset or change-password). This is the
 * message that turns a silent account takeover into a loud one: a user who did
 * not do this has somewhere to go, and the mail itself is the alarm.
 */
export function passwordChangedMail({ name, when, ip, resetUrl }) {
  const who = name?.split(' ')[0] || 'there'
  const stamp = when instanceof Date ? when.toUTCString() : String(when ?? '')
  return {
    subject: 'Your Reachmark Logs password was changed',
    html: layout({
      preheader: 'If this was you, nothing to do. If not, secure the account now.',
      heading: 'Your password was changed',
      intro: `Hi ${esc(who)} — the password on your Reachmark Logs account was just changed.`,
      paragraphs: [
        `When: <strong style="color:#ffffff;">${esc(stamp)}</strong>${ip ? `<br />From: <strong style="color:#ffffff;">${esc(ip)}</strong>` : ''}`,
        'Every device that was signed in has been signed out, so you will need the new password next time.',
      ],
      note: `If this was you, you can ignore this message. If it was not, reset the password immediately — that will also sign out whoever made this change.`,
    }),
    text: `Hi ${who},

The password on your Reachmark Logs account was just changed.
When: ${stamp}${ip ? `\nFrom: ${ip}` : ''}

Every device that was signed in has been signed out, so you will need the new password next time.

If this was you, ignore this message. If it was not, reset your password immediately${resetUrl ? `: ${resetUrl}` : ''} — that will also sign out whoever made this change.
`,
  }
}

/** Notices that carry no link and no action — kept separate so they read as
 *  informational rather than alarming. */
export function noticeMail({ heading, preheader, intro, paragraphs = [], footer }) {
  const plain = `${heading}\n\n${intro}\n\n${paragraphs.map((p) => p.replace(/<[^>]+>/g, '')).join('\n\n')}\n`
  return {
    subject: heading,
    html: layout({ heading, preheader, intro, paragraphs, footer }),
    text: plain,
  }
}

export const _internal = { layout, hours }
export default { verifyEmailMail, passwordResetMail, passwordChangedMail, noticeMail }
