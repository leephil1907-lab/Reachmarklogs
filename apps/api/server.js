import express from 'express'
import 'dotenv/config'
import cors from 'cors'
import { clerkMiddleware } from '@clerk/express'
import { serve } from 'inngest/express'

// Reachmark Logs API — merged from AccountsBazaar/server/server.js.
// Upstream routers now live under src/; the Reachmark surface adds catalog
// (live floor), copilot (LLM + deterministic fallback) and me (seller console).
import prisma, { transport } from './src/configs/prisma.js'
import { attachAuth, clerkConfigured } from './src/middlewares/authMiddleware.js'
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
app.use(cors({ origin: true, credentials: true }))

// Clerk session parsing — a no-op in demo mode, see authMiddleware.
if (clerkConfigured()) {
  app.use(clerkMiddleware())
}
app.use(attachAuth)

/* ------------------------------------------------------------------ health - */

app.get('/', (req, res) =>
  res.json({
    service: 'reachmark-api',
    version: '2.0.0',
    status: 'live',
    protocol: 'escrow',
    transports: { database: transport, auth: clerkConfigured() ? 'clerk' : 'demo', copilot: activeProvider() },
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
  }),
)

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
    auth: clerkConfigured() ? 'clerk' : 'demo',
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

/* ------------------------------------------------------------ error handler - */

app.use((req, res) => res.status(404).json({ ok: false, message: `No route ${req.method} ${req.originalUrl}` }))

app.use((error, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error('[api]', error)
  res.status(error.status ?? 500).json({ ok: false, message: error.message })
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(
    `Reachmark API live on :${PORT} · db=${transport} · auth=${clerkConfigured() ? 'clerk' : 'demo'} · copilot=${activeProvider()} · fee=${Number(process.env.REACHMARK_FEE_BPS ?? 750)}bps`,
  )
})

export default app
