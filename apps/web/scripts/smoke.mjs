#!/usr/bin/env node
/**
 * smoke.mjs — renders every route through Vite's SSR pipeline and reports
 * React/Redux errors plus the produced markup size. Catches the class of bug a
 * bundler build cannot: bad hook usage, undefined state paths, render throws.
 */
import { createServer } from 'vite'

const server = await createServer({
  appType: 'custom',
  logLevel: 'error',
  server: { middlewareMode: true, hmr: false },
})

let failures = 0
try {
  const mod = await server.ssrLoadModule('/scripts/smoke-entry.jsx')
  const results = await mod.run()
  const pad = (s, n) => String(s).padEnd(n)
  console.log('\n  route                      result      bytes')
  console.log('  ' + '─'.repeat(56))
  for (const r of results) {
    if (!r.ok) failures += 1
    console.log(
      `  ${pad(r.path, 25)} ${pad(r.ok ? '✓ rendered' : '✗ failed', 12)} ${pad(r.length.toLocaleString(), 9)} ${r.marker}`,
    )
    if (!r.ok) for (const e of r.errors.slice(0, 4)) console.log(`      ↳ ${e.split('\n')[0]}`)
  }
  console.log('  ' + '─'.repeat(56))
  console.log(`  ${results.length - failures}/${results.length} routes rendered clean\n`)
} finally {
  await server.close()
}
process.exit(failures ? 1 : 0)
