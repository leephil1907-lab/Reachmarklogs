/**
 * Prisma client — dual-transport.
 *
 * Upstream AccountsBazaar pinned `PrismaNeon` + `@neondatabase/serverless`, which
 * only works against Neon over WebSockets. Reachmark needs the same code to run
 * against Neon in production *and* against any plain Postgres (Docker, CI, the
 * PGlite dev server) without a rewrite, so the adapter is chosen at boot:
 *
 *   DATABASE_URL host ends with neon.tech        → Neon serverless (WebSocket / fetch)
 *   everything else (localhost, RDS, Supabase…)  → node-postgres TCP pool
 *
 * Force a transport with PG_ADAPTER=neon|pg when the host is ambiguous.
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DATABASE_URL ?? ''

function pickTransport() {
  const forced = (process.env.PG_ADAPTER ?? '').toLowerCase()
  if (forced === 'neon' || forced === 'pg') return forced
  return /neon\.tech|neon\.build/.test(connectionString) ? 'neon' : 'pg'
}

async function buildAdapter(transport) {
  if (transport === 'neon') {
    // Loaded lazily so a plain-Postgres deployment never needs these packages.
    const [{ PrismaNeon }, { neonConfig }] = await Promise.all([
      import('@prisma/adapter-neon'),
      import('@neondatabase/serverless'),
    ])
    try {
      const ws = (await import('ws')).default
      neonConfig.webSocketConstructor = ws
    } catch {
      // Node 22+ ships a global WebSocket; nothing to wire up.
    }
    neonConfig.poolQueryViaFetch = true
    return new PrismaNeon({ connectionString })
  }
  return new PrismaPg({
    connectionString,
    max: Number(process.env.PG_POOL_MAX ?? 10),
    // The PGlite dev server is single-connection; keep idle churn low so schema
    // pushes and seeds do not collide.
    idleTimeoutMillis: Number(process.env.PG_IDLE_MS ?? 10_000),
  })
}

const transport = pickTransport()
const adapter = await buildAdapter(transport)

const prisma = globalThis.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma
}

if (process.env.NODE_ENV !== 'test') {
  const target = connectionString.replace(/:[^:@/]+@/, ':****@')
  console.log(`[prisma] transport=${transport} target=${target || '(unset)'}`)
}

export { transport }
export default prisma
