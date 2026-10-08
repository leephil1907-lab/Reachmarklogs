# Accounts, sessions and running the thing for real

Reachmark Logs ships first-party email + password accounts. There is no third-party auth provider in
the default path — Clerk stays available behind `CLERK_SECRET_KEY` for anyone who wants it, but the
shipped, tested path is `AUTH_MODE=local`.

## Run it locally

```bash
npm install                                     # installs the workspaces
npm run pg:local --workspace apps/api &         # embedded Postgres (no Docker, no install)
npm run db:push --workspace apps/api
npm run db:seed --workspace apps/api            # 23 users · 72 listings · 3 chats · 7 transactions
npm run dev                                     # web on :5173, proxies /api → :3000
node apps/api/server.js                         # API on :3000  (separate shell)
```

Open <http://localhost:5173>. Sign up with any address you own.

**Mail works two ways, and the difference is visible in `/api/auth/status` as `mailer`:**

| Mode | When | What happens to the link |
| --- | --- | --- |
| `log-only` | `SMTP_USER`/`SMTP_PASS` unset — a fresh clone, and CI | Printed to the API's stdout (`[auth] verify email → …`) and returned as `emailVerification.devUrl`, so the flow is completable with no mail account. |
| `smtp` | both set | Really delivered, and **neither** the log line nor the `devUrl` appears — the token exists only in the recipient's inbox. That is the point of configuring it. |

Configure Gmail with an **app password**, not the account password:

```bash
# 1. Turn on 2-step verification, then create an app password:
#    https://myaccount.google.com/apppasswords
# 2. Put it in apps/api/.env (gitignored):
SMTP_USER=you@gmail.com
SMTP_PASS=abcd efgh ijkl mnop     # spaces are fine — they are stripped for you

# 3. Prove it before trusting it:
npm run mail:verify --workspace apps/api                          # authenticate only
npm run mail:verify --workspace apps/api -- --to you@example.com  # …and deliver one
```

`mail:verify` reports the failure modes that otherwise surface three screens into a signup form: `535`
is a wrong or revoked app password, `534` means the account is still expecting the account password
because 2-step verification is off. Each delivered message logs one line —
`[mail] sent → … · 250 2.0.0 OK …` — because "did that signup mail actually go out?" is the first
question anyone asks when a user says they never received it.

For a provider other than Gmail, change `SMTP_HOST`/`SMTP_PORT`/`SMTP_SECURE`; nothing else moves.
`SENDER_EMAIL` must be the mailbox you authenticate as, or Gmail rewrites the header.

**`APP_URL` is what lands in the user's inbox.** Left at `localhost` in production, every real user
gets a mail pointing at their own machine.

#### What gets sent

Four messages, all rendered from `apps/api/src/services/mailTemplates.js` — table layout, inline
styles only, dark-mode-safe, each with a real `text/plain` alternative:

| Message | Trigger |
| --- | --- |
| Confirm your email | signup, and “resend verification” |
| Reset your password | “forgot password” |
| **Your password was changed** | any password change — reset *or* change-password, to the owner |
| Account notices | lifecycle events |

The password-changed notice is the one worth keeping: it turns a silent account takeover into a loud
one, because a user who did not do it finds out immediately from an address they trust rather than
when they next fail to sign in.

`npm run mail:preview --workspace apps/api` renders all four to `docs/mail-preview.html`, built from
the same templates the API sends, so a reviewed file cannot drift from production behaviour.

Mail is also **non-fatal by design**: a Gmail outage, a rate limit or a revoked password logs
`[mail] … failed: …` and lets signup succeed. An account that exists with no mail is a recoverable
state; a 500 on the signup form is not, and "resend verification" is the way back.

### Seeded logins

| Address | Role | Plan |
| --- | --- | --- |
| `ada@reachmarklogs.test` | seller | pro |
| `ada.buyer@reachmarklogs.test` | buyer | free |
| `ops@reachmarklogs.test` | admin | pro |

Password for all three: `reachmark-demo-2026` (override with `DEMO_PASSWORD` before seeding).

## Run it for real: one process, one origin

```bash
npm run build                                   # apps/web/dist, built in live mode
node apps/api/server.js                         # serves the API *and* the site on :3000
```

When `apps/web/dist/index.html` exists, the API serves the bundle itself: deep links like
`/logs/RM-4340` return the app shell, `/assets/*` are served with a one-year immutable cache, and
`index.html` is explicitly `no-cache` so a deploy never strands users on a stale bundle. API clients
still get JSON — a request that does not explicitly ask for `text/html` gets the service descriptor
at `/`, and unknown `/api/*` routes always get an honest JSON 404, never HTML with a 200.

`apps/web/.env.production` sets `VITE_API_MODE=live` with an empty `VITE_API_URL`, so the bundle
calls same-origin `/api`. No CORS, no second deploy target, no client/server version drift.

### Environment

`apps/api/.env` (gitignored — copy `.env.example`):

| Key | Default | Meaning |
| --- | --- | --- |
| `DATABASE_URL` | – | Postgres. A `*.neon.tech` host switches to the Neon serverless driver automatically. |
| `AUTH_MODE` | `local` | `local` = real accounts. `demo` synthesises a principal for fixtures; `clerk` defers to Clerk keys. |
| `SESSION_TTL_DAYS` | `30` | Session lifetime. |
| `SESSION_TTL_REMEMBER_DAYS` | `90` | Lifetime when the user ticks "remember me". |
| `AUTH_TOKEN_TTL_MINUTES` | `60` | Lifetime of email-verification and password-reset links. |
| `MAX_FAILED_LOGINS` | `8` | Failures before a lockout. |
| `LOCKOUT_MINUTES` | `15` | Lockout length. |
| `SESSION_COOKIE_NAME` | `reachmark_session` | httpOnly cookie name. |
| `APP_URL` | `http://localhost:5173` | Base for the links in verification / reset mail. **Set this to the public origin in production** — it is what lands in the user's inbox. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | `smtp.gmail.com` / `465` / `true` | Provider. 465 is implicit TLS, 587 upgrades — derived from the port unless `SMTP_SECURE` says otherwise. |
| `SMTP_USER` / `SMTP_PASS` | – | Both set ⇒ `mailer: smtp`. An app password; spaces are stripped. |
| `SENDER_EMAIL` / `MAIL_FROM` | `SMTP_USER` | From header. Must be the authenticated mailbox. |
| `SUPPORT_EMAIL` | – | Reply-To on every message. |
| `MAIL_LOG` | – | `quiet` stops the one-line-per-message delivery log. |
| `ADMIN_EMAILS` | `ops@reachmarklogs.test` | Comma-separated. These addresses reach `/admin` regardless of the role on the account. |
| `PG_POOL_MAX` | `1` | Keep at 1 against the embedded dev Postgres, which serves a single connection. |

## What the security model actually is

* **Passwords** — scrypt, `N=32768, r=8, p=1`, stored self-describing as `scrypt$N$r$p$salt$hash`, so
  parameters can be raised later and old hashes upgraded on next sign-in. Comparison is constant-time.
* **Sessions** — a 256-bit random token. Only its sha256 digest is stored, so a database leak does not
  hand over live sessions. Bearer token is primary (sandboxed preview iframes drop cookies) with an
  httpOnly cookie also set; either resolves to the same principal.
* **One-time tokens** — verification and reset tokens are hashed at rest and single-use. A password
  reset kills every existing session.
* **Throttling** — failed attempts live in their own `LoginAttempt` table keyed by
  `sha256('login:' + email)`, not on the user row. That is deliberate: it means an address that does
  **not** exist gets throttled, and worded, *identically* to one that does.
* **Account enumeration** — there is exactly one failure code, `invalid_credentials`, for every
  non-lockout failure, and unknown addresses run a decoy scrypt so response timing does not leak
  existence either. No failure response carries an attempt counter. `email_taken` on signup is the
  one deliberate exception, because a signup form that cannot say "that address is already
  registered" is unusable. Forgot-password returns the same body whether or not the address exists.

## Verification

Every claim above is asserted by a suite; run all four before shipping a change:

```bash
npm test                # all four, from the repo root
npm run test:api        # the three suites below
npm run test:web        # the route smoke test

npm run test:e2e      --workspace apps/api   # 102 checks — catalog, escrow, ops, auth gates, sign-out
npm run test:auth     --workspace apps/api   #  77 checks — signup, sessions, throttling, hashes at rest
npm run test:copilot  --workspace apps/api   #  36 checks — listing-copilot parity
npm run smoke         --workspace apps/web   #  20 routes render clean
```

The auth suite **blanks `SMTP_USER`/`SMTP_PASS` for the API it spawns**, and asserts
`mailer: log-only` in a preflight check. That is not incidental: it reads the single-use links out of
the API's log, which the API only prints when no mailer is configured. Inheriting real credentials
would mail every fixture address and lose the tokens the suite asserts on. **A test must not depend on
whose inbox happens to be wired up**, and the preflight makes that dependency fail loudly rather than
mysteriously.

The suites sign in as real seeded accounts and create real rows, so they clean up after themselves:
e2e signs both accounts back out (and asserts the tokens are dead), and the auth suite deletes every
`@authtest.dev` fixture, its sessions, its one-time tokens and every throttle row it wrote — including
the addresses it deliberately throttled without ever registering. Running `npm test` against the dev
database leaves it exactly as it found it: 23 users, 72 listings.

The auth suite spawns its own API on `:3422` and, because the embedded dev Postgres accepts exactly
one connection, deliberately terminates that child before it opens its own Prisma client to inspect
the database directly. Run it against an already-running API with `API_ORIGIN=http://127.0.0.1:3000`
only if that API can be stopped first — otherwise the second connection is refused.
