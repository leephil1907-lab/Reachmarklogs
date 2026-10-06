# claw — the Reachmark harvest harness

`claw.py` walks the four upstream repositories and the operator's reference-site list, then writes the
build manifests the Reachmark client imports at runtime. It is descended from **claw-code**'s
agent-harness scripts (`dogfood-probe.py`, `port_manifest.py`, `validate_cc2_board.py`), re-targeted
from agent maintenance to product build analysis.

```
tools/claw
├── claw.py              # the harness (dependency-free: stdlib only)
├── sync-harvest.mjs     # bridges packages/harvest → apps/web/src/data/harvest
├── reference/           # upstream claw-code docs kept for context
├── roadmap-check-ids.sh # upstream board validators, kept as-is
├── dogfood-*.sh|py      # upstream probe scripts, kept as-is
└── scripts/*.py         # upstream CC2 board generators, kept as-is
```

## Commands

```bash
python3 tools/claw/claw.py doctor                        # preflight everything
python3 tools/claw/claw.py all --concurrency 14           # scan + probe + merge
python3 tools/claw/claw.py scan --only ui-builder         # one repo
python3 tools/claw/claw.py probe --limit 10               # first 10 sites
python3 tools/claw/claw.py merge                          # refuse manifests
```

Output (all written to `packages/harvest/`):

```
  claw → AccountsBazaar … 84 files / 1.9MB / 16,056 LOC
  claw → ui-builder … 536 files / 11.1MB / 57,197 LOC
  claw → MoneyPrinterTurbo_ … 149 files / 3.7MB / 47,216 LOC
  claw → claw-code … 315 files / 10.7MB / 110,833 LOC

    ✓ 200  futuretools-io               697ms
    ▲ 403  leonardo-ai                   115ms      # bot-walled, recorded as such
    ✗   0  sitemaps                      125ms      # unreachable, still catalogued

  merged → packages/harvest/build-manifest.json  (81.8 KB)
  components=125 models=8 tools=50
```

## What it extracts, and why

| Stage | Extraction | Feeds |
| --- | --- | --- |
| `scan` | Prisma models (fields, types, attributes) | `/docs` data-model explorer; the API schema extension |
| `scan` | CSS custom properties, Tailwind theme keys, keyframes, utility class names | the Reachmark design system (`styles/index.css`) |
| `scan` | `.jsx/.tsx` component inventory with line counts + inferred kind | `/docs` component table; tells you what to port first |
| `scan` | Routes, controllers, services, harness scripts | capability matrix rows |
| `probe` | HTTP status, latency, title, theme colour, favicon per site | `/tools` library, including honest "bot-walled"/"offline" states |
| `merge` | Capability matrix, ranked reusable components, fingerprint | `/docs`, footer provenance badge, ⌘K search |

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `REACHMARK_UPSTREAM` | `./upstream` | Where the imported repositories live. Point it elsewhere to harvest a different tree. |

## Design notes

* **Stdlib only.** No `requests`, no `aiohttp` — `urllib` plus a thread pool keeps the harness portable
  enough to run in CI or a fresh sandbox.
* **Idempotent.** Re-running always rewrites the three manifests; nothing is appended blindly.
* **Honest about failure.** A site that returns 403 is recorded as `blocked` with its status code rather
  than being dropped, so the library never silently shrinks.
* **Fingerprint.** The merged manifest carries a short hash of the inputs so a build can be tied back to
  a specific harvest run.
