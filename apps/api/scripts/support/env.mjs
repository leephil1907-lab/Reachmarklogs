/**
 * Test processes never receive SMTP credentials.
 *
 * The auth suite reads its single-use links out of the API log, which the API
 * only prints in log-only mode — so blanking these is load-bearing there. More
 * importantly, a suite that signs accounts up must not be able to mail real
 * addresses: inherited credentials turn a test run into a small spam campaign to
 * fixture inboxes, and CI would do it on every push.
 *
 * Spread this over `process.env` wherever a suite spawns the API.
 */
export const withoutMailer = {
  SMTP_USER: '',
  SMTP_PASS: '',
  SENDER_EMAIL: '',
  MAIL_FROM: '',
}
