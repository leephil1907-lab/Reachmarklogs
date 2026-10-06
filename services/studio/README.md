# Proof Studio service (`services/studio`)

FastAPI render service for Reachmark Logs. This is **MoneyPrinterTurbo**, imported intact under
`services/studio/app` and re-pointed at marketplace proof assets instead of stock footage.

```
services/studio
├── main.py                  # upstream FastAPI entrypoint
├── cli.py                   # upstream CLI renderer
├── app/                     # upstream application package (router, services, models)
│   ├── router.py            #   POST /api/v1/videos, GET /api/v1/videos/{task_id}, ...
│   ├── services/            #   task pipeline, voice (TTS), subtitle, bgm, material
│   └── models/schema.py     #   request/response contracts
├── webui/                   # upstream Gradio studio UI
├── resource/                # fonts + BGM (sample MP3s pruned — add your own)
├── reachmark_proof.py       # NEW: adapter mapping a Reachmark listing -> render task
└── requirements.txt
```

## Why it is here

Reachmark listings convert ~2.4× better when they ship a narrated proof reel. The Studio page in the
web client composes the brief (script, voice, style preset, aspect, captions) and hands it to this
service, which does the actual ffmpeg work.

## What changed for Reachmark

| Area | Change |
| --- | --- |
| Source material | Upstream pulled stock footage from Pexels/Pixabay. Reachmark feeds it the listing's **proof artefacts** (analytics screenshots, audience exports) plus optional B-roll. |
| Script source | Upstream used an LLM topic prompt. `reachmark_proof.py` builds the script from listing facts (reach, engagement, age, region, escrow terms) so the numbers on screen match the proof vault. |
| Voice | Upstream edge-tts catalogue kept as-is; `en-NG-AbeoNeural` added to the picker for the Lagos desk. |
| Output naming | Renders are named `RM-<listingId>-<style>-<aspect>.mp4` and written back to `ProofArtifact.url`. |
| Sample media | The upstream repo shipped ~56 MB of BGM loops; they were pruned to keep the monorepo light. Drop your own licensed tracks into `resource/songs/`. |

## Run it

```bash
cd services/studio
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python3 main.py                 # API on :8501  (docs at /docs)

# or render straight from a listing with the adapter
python3 reachmark_proof.py --listing ../../apps/web/src/data/harvest/build-manifest.json --id RM-4200
```

The web client proxies `/studio-api/*` → `http://127.0.0.1:8501` (see `apps/web/vite.config.js`), so
`/studio` in the UI can post real jobs the moment this service is up. Until then the Studio page
runs a local simulation so the design is fully reviewable without Python.

## API surface (upstream)

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/v1/videos` | Create a render task (script, voice, aspect, captions, bgm) |
| GET | `/api/v1/videos/{task_id}` | Task state + progress + produced files |
| DELETE | `/api/v1/videos/{task_id}` | Cancel / delete a task |
| POST | `/api/v1/scripts` | Draft or rewrite a script |
| GET | `/api/v1/musics` | BGM catalogue from `resource/songs` |
| GET | `/api/v1/voices` | TTS voice list |
| GET | `/api/v1/terms` | Upstream UI strings |
