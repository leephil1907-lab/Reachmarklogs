# `@reachmark/harvest`

Machine-readable output of the claw harness. Three manifests, written by
`tools/claw/claw.py`, consumed by the web client.

| Manifest | Written by | What is inside |
| --- | --- | --- |
| `repo-manifest.json` | `claw.py scan` | Per-repo inventory: file counts, size, LOC, languages, entrypoints, dependency graph, extracted Prisma models, CSS design tokens, Tailwind theme, component inventory and feature surface. |
| `tool-catalog.json` | `claw.py probe` | The 50 reference sites with live HTTP status, latency, probed title, theme colour, favicon and the curated "how Reachmark uses it" note. |
| `build-manifest.json` | `claw.py merge` | The fused view: totals, capability matrix (source repo → Reachmark surface), design systems, data models, ranked component list and the reference-tool index. |

## Regenerate

```bash
npm run claw             # scan + probe + merge  (also syncs into apps/web)
npm run claw:doctor      # preflight: repos present, manifests fresh
```

## How the client reads it

`tools/sync-harvest.mjs` copies the manifests into `apps/web/src/data/harvest/`, where they are
imported directly as JSON modules:

```js
import BUILD from '@/data/harvest/build-manifest.json'
import CATALOG from '@/data/harvest/tool-catalog.json'
```

That powers three surfaces:

* **`/docs`** — the build manifest explorer (repo stats, capability matrix, data models, component table).
* **`/tools`** — the reference tool library, including live probe status per site.
* **⌘K command palette** — searching across listings *and* the harvest.

The `fingerprint` field is a hash of the source repo set and tool categories; it is displayed in the
footer and on the manifest page so you can tell at a glance which harvest a build was made from.
