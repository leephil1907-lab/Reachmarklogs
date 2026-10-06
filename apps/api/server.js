import express from 'express'
import { join, resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
import 'dotenv/config'
import cors from 'cors'
import { clerkMiddleware } from '@clerk/express'
import { serve } from 'inngest/express'

// Reachmark Logs API — merged from AccountsBazaar/server/server.js.
// Upstream routers now live under src/; the Reachmark surface adds catalog
// (live floor), copilot (LLM + deterministic fallback) and me (seller console).
import prisma, { transport } from './src/configs/prisma.js'
import { attachAuth, clerkConfigured, authMode } from './src/middlewares/authMiddleware.js'
import authRoutes from './src/routes/authRoutes.js'
import { inngest, functions } from './src/inngest/index.js'
import listingRouter from './src/routes/listingRoutes.js'
import chatRouter from './src/routes/chatRoutes.js'
import adminRouter from './src/routes/adminRoutes.js'
import catalogRouter from './src/routes/catalogRoutes.js'
import copilotRouter from './src/routes/copilotRoutes.js'
import meRouter from './src/routes/meRoutes.js'
import { stripeWebhook } from './src/controllers/stripeWebhook.js'
import { activeProvider } from './src/services/copilot.js'

const app = express()

// Stripe needs the raw body; everything else gets JSON.
app.use('/api/stripe', express.raw({ type: 'application/json' }), stripeWebhook)

app.use(express.json({ limit: '2mb' }))
app.use(cors({ origin: true, credentials: true, exposedHeaders: ['x-reachmark-auth'] }))

// Clerk session parsing. Only mounted when Clerk keys exist; otherwise
// attachAuth resolves Reachmark's own session tokens (see authMiddleware).
if (clerkConfigured()) {
  app.use(clerkMiddleware())
}
app.use(attachAuth)

// Accounts. Mounted before the product routers so /api/auth/* is never shadowed.
app.use('/api/auth', authRoutes)

/* ------------------------------------------------- static web client (prod) - */

const webDist = resolve(__dirname, '../web/dist')
const hasWebBuild = existsSync(join(webDist, 'index.html'))

/**
 * Browsers announce an explicit text/html preference; curl, fetch and the test
 * suites send a wildcard or nothing at all. Matching on the explicit substring
 * keeps the JSON service descriptor and honest JSON 404s for API clients while
 * still handing a real person the app shell.
 *
 * (Note the wildcard is described in prose rather than written literally: the
 * star-slash-star sequence would terminate this comment.)
 */
const wantsHtml = (req) => /text\/html/i.test(req.headers.accept ?? '')

/* ------------------------------------------------------------------ health - */

app.get('/', (req, res, next) => {
  // A browser gets the product; an API client (curl, the test suites) keeps the
  // JSON service descriptor it has always had.
  if (hasWebBuild && wantsHtml(req)) return res.sendFile(join(webDist, 'index.html'))
  return res.json({
    service: 'reachmark-api',
    version: '2.0.0',
    status: 'live',
    protocol: 'escrow',
    transports: { database: transport, auth: authMode(), copilot: activeProvider() },
    endpoints: [
      '/api/catalog',
      '/api/copilot',
      '/api/me',
      '/api/listing',
      '/api/chat',
      '/api/admin',
      '/api/inngest',
      '/api/health',
    ],
  })
})

app.get('/api/health', async (req, res) => {
  let database = { ok: false }
  try {
    const [listings, users, chain] = await Promise.all([
      prisma.listing.count(),
      prisma.user.count(),
      prisma.credentialEvent.count(),
    ])
    database = { ok: true, listings, users, credentialEvents: chain }
  } catch (error) {
    database = { ok: false, error: error.message }
  }
  res.status(database.ok ? 200 : 503).json({
    ok: database.ok,
    uptime: Math.round(process.uptime()),
    env: process.env.NODE_ENV ?? 'development',
    database,
    auth: authMode(),
    // Object form: the web header badge shows the engine and whether an LLM key
    // is actually present, so the UI never claims to be running a model it isn't.
    copilot: { engine: activeProvider(), configured: activeProvider() !== 'local', llm: activeProvider() !== 'local' },
    feeBps: Number(process.env.REACHMARK_FEE_BPS ?? 750),
    escrowDefaultDays: Number(process.env.ESCROW_DEFAULT_DAYS ?? 7),
    time: new Date().toISOString(),
  })
})

/* ------------------------------------------------------------------ routes - */

// Upstream AccountsBazaar surface (unchanged shapes).
app.use('/api/listing', listingRouter)
app.use('/api/chat', chatRouter)
app.use('/api/admin', adminRouter)

// Reachmark additions.
app.use('/api/catalog', catalogRouter)
app.use('/api/copilot', copilotRouter)
app.use('/api/me', meRouter)

app.use('/api/inngest', serve({ client: inngest, functions }))

/* ------------------------------------------------- static web client (prod) - */

/**
 * When a web build exists the API also serves it, so one process on one origin
 * is the entire product: no CORS, no second deploy target, and no way for the
 * client and server to drift onto different versions. apps/web/.env.production
 * sets `VITE_API_MODE=live` with an empty `VITE_API_URL`, which makes the bundle
 * call same-origin `/api`.
 *
 * The mount deliberately sits *after* every API route so it can never shadow
 * one, and is skipped entirely when there is no build — a dev checkout, where
 * Vite proxies /api instead.
 */
if (hasWebBuild) {
  app.use(express.static(webDist, {
    index: false, // '/' is handled above so the JSON descriptor survives for API clients
    maxAge: '1h',
    setHeaders: (res, filePath) => {
      // Hashed assets are immutable; index.html must never be cached, or a
      // deploy leaves returning users on a stale bundle.
      if (filePath.endsWith('index.html')) res.setHeader('cache-control', 'no-cache')
    },
  }))
}

/* ------------------------------------------------------------ error handler - */

/**
 * Unknown GETs that are not API calls get the app shell, so a deep link like
 * /logs/RM-4340 works on a cold load in production. Anything under /api, or any
 * non-GET, still gets an honest JSON 404 — an API client must never be handed
 * HTML with a 200.
 */
app.use((req, res, next) => {
  if (hasWebBuild && req.method === 'GET' && !req.path.startsWith('/api') && wantsHtml(req)) {
    return res.sendFile(join(webDist, 'index.html'))
  }
  next()
})

app.use((req, res) => res.status(404).json({ ok: false, message: `No route ${req.method} ${req.originalUrl}` }))

app.use((error, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error('[api]', error)
  res.status(error.status ?? 500).json({ ok: false, message: error.message })
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(
    `Reachmark API live on :${PORT} · db=${transport} · auth=${authMode()} · copilot=${activeProvider()} · fee=${Number(process.env.REACHMARK_FEE_BPS ?? 750)}bps`,
  )
})

export default app
