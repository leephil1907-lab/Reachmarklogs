#!/usr/bin/env node
/**
 * sync-harvest.mjs — bridge between the claw harvest stage and the web client.
 *
 * claw.py writes machine-readable manifests into packages/harvest/.
 * The Vite client imports them from src/data/harvest/, so this script keeps the
 * two in lockstep (run automatically by `npm run claw` and before every build).
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'packages', 'harvest')
const dest = join(root, 'apps', 'web', 'src', 'data', 'harvest')
const files = ['build-manifest.json', 'tool-catalog.json', 'repo-manifest.json']

mkdirSync(dest, { recursive: true })
let copied = 0
for (const f of files) {
  const from = join(src, f)
  if (!existsSync(from)) continue
  copyFileSync(from, join(dest, f))
  copied += 1
}
const manifest = JSON.parse(readFileSync(join(dest, 'build-manifest.json'), 'utf8'))
console.log(
  `harvest sync → ${copied} manifest(s) · ${manifest.totals.sourceFiles} source files · ` +
    `${manifest.totals.referenceTools} reference tools · fingerprint ${manifest.fingerprint}`,
)
