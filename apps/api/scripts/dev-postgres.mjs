#!/usr/bin/env node
/**
 * dev-postgres.mjs — a real PostgreSQL server with no installation.
 *
 * PGlite is Postgres compiled to WebAssembly; `@electric-sql/pglite-socket`
 * puts the actual Postgres wire protocol in front of it. That means Prisma,
 * `psql`, or any Postgres client can connect to 127.0.0.1:5432 and get genuine
 * Postgres semantics — enough to run migrations, seed and exercise the API
 * offline, then switch DATABASE_URL to Neon for production with zero code
 * changes.
 *
 *   npm run pg:local                 # serve on 127.0.0.1:5432, data in .pgdata
 *   npm run pg:local -- --port 5543  # different port
 *   npm run pg:local -- --memory     # throwaway database (no disk)
 *
 * The data directory is a plain Postgres data dir, so you can also open it with
 * a real postgres binary later if you prefer.
 */
import { mkdirSync, existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const argv = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i === -1 ? fallback : argv[i + 1] ?? true
}

const port = Number(flag('port', 5432))
const host = String(flag('host', '127.0.0.1'))
const memory = argv.includes('--memory')
const dataDir = String(flag('data', join(root, '.pgdata')))
const dbName = String(flag('db', 'reachmark'))

// Read DATABASE_URL so the script can tell the operator exactly what to use.
let url = process.env.DATABASE_URL ?? ''
if (!url && existsSync(join(root, '.env'))) {
  const line = readFileSync(join(root, '.env'), 'utf8').split('\n').find((l) => l.startsWith('DATABASE_URL='))
  if (line) url = line.slice('DATABASE_URL='.length).trim()
}

const [{ PGlite }, { PGLiteSocketServer }] = await Promise.all([
  import('@electric-sql/pglite'),
  import('@electric-sql/pglite-socket'),
])

if (!memory) mkdirSync(dataDir, { recursive: true })

const db = memory ? new PGlite() : new PGlite(dataDir)
await db.waitReady

// Prisma connects with a database name in the URL; PGlite has a single implicit
// database, so create a matching alias when the name is not the default.
if (dbName && dbName !== 'postgres') {
  try {
    await db.exec(`CREATE DATABASE ${JSON.stringify(dbName)}`)
  } catch {
    /* already exists — fine */
  }
}

const server = new PGLiteSocketServer({ db, port, host })
await server.start()

const shown = url || `postgresql://postgres:postgres@${host}:${port}/${dbName}`
console.log(`
  Reachmark dev Postgres is up
  ────────────────────────────────────────────
  listening   ${host}:${port}
  database    ${memory ? '(in-memory, discarded on exit)' : dataDir}
  DATABASE_URL ${shown}

  Next:
    npm run prisma:push     # apply the schema
    npm run db:seed         # insert the 72-log catalog + sellers + threads
    npm run dev             # boot the API on :3000
    npm run test:e2e        # or run the whole cycle automatically
`)

const shutdown = async () => {
  await server.stop().catch(() => {})
  await db.close().catch(() => {})
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
