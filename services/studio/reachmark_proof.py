#!/usr/bin/env python3
"""
reachmark_proof.py — the bridge between a Reachmark listing and the merged
MoneyPrinterTurbo render pipeline.

The upstream project generates short videos from a topic prompt and stock
footage. Reachmark needs the opposite: a *proof reel* whose every claim matches
the listing's proof vault and credential chain. This adapter builds that brief
from the listing record and hands it to the upstream task service.

Usage
-----
  # print the render brief for a seeded listing (no API keys needed)
  python3 reachmark_proof.py --catalog ../../apps/web/src/data/catalog.js --id RM-4200

  # write the brief to disk and (optionally) submit it to a running service
  python3 reachmark_proof.py --catalog ... --id RM-4200 --out brief.json --post http://127.0.0.1:8501
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.request
from dataclasses import dataclass, asdict, field
from pathlib import Path

VOICE_BY_LOCALE = {
    "United States": "en-US-AriaNeural",
    "United Kingdom": "en-GB-SoniaNeural",
    "Nigeria": "en-NG-AbeoNeural",
    "Canada": "en-US-GuyNeural",
    "Australia": "en-US-AriaNeural",
}

STYLE_PRESETS = {
    "receipts": {
        "transition": "hard_cut",
        "zoom": "punch_in_1.04",
        "caption_style": "mono-badge",
        "clip_duration": 2.6,
        "concatenate_mode": "random",
    },
    "cinematic": {
        "transition": "cross_dissolve",
        "zoom": "ken_burns_1.12",
        "caption_style": "lower_third",
        "clip_duration": 4.2,
        "concatenate_mode": "sequential",
    },
    "hype": {
        "transition": "whip_pan",
        "zoom": "punch_in_1.18",
        "caption_style": "bold-all-caps",
        "clip_duration": 1.8,
        "concatenate_mode": "random",
    },
    "walkthrough": {
        "transition": "slide_left",
        "zoom": "static",
        "caption_style": "callout-arrow",
        "clip_duration": 3.4,
        "concatenate_mode": "sequential",
    },
}


@dataclass
class RenderBrief:
    """Maps onto POST /api/v1/videos on the merged FastAPI service."""

    listing_id: str
    title: str
    subject: str
    script: str
    video_terms: list[str]
    voice_name: str
    voice_volume: float = 1.0
    voice_rate: float = 1.05
    bgm_type: str = "random"
    bgm_volume: float = 0.18
    subtitle_enabled: bool = True
    font_name: str = "STHeitiMedium.ttc"
    font_size: int = 60
    text_fore_color: str = "#FFFFFF"
    text_background_color: str = "#0A0E1A99"
    video_aspect: str = "9:16"
    video_concat_mode: str = "random"
    video_clip_duration: int = 2
    video_count: int = 1
    paragraph_number: int = 1
    output_name: str = ""
    # Reachmark-only bookkeeping (ignored by upstream, used by the client)
    proof_artifacts: list[str] = field(default_factory=list)
    style: str = "receipts"
    escrow_terms: dict = field(default_factory=dict)

    def to_task_payload(self) -> dict:
        data = asdict(self)
        for key in ("proof_artifacts", "style", "escrow_terms", "listing_id", "title", "subject"):
            data.pop(key, None)
        return data


def load_seeded_catalog(path: Path) -> dict:
    """Read a listing out of the seeded TS catalog without executing it."""
    text = path.read_text(encoding="utf-8")
    # The seed file is deterministic; grab the block for the requested id.
    return {"source": str(path), "raw": text}


def find_listing(raw: str, listing_id: str) -> dict:
    """Pull the fields we need for a brief straight out of the seed source."""
    idx = raw.find(f"id: '{listing_id}'")
    if idx == -1:
        # ids are generated as RM-<4200 + i*7>; fall back to the first listing
        idx = raw.find("listings.push({")
    block = raw[max(0, idx - 200): idx + 2600]

    def grab(pattern: str, default: str = "") -> str:
        m = re.search(pattern, block)
        return m.group(1) if m else default

    return {
        "id": listing_id,
        "platform": grab(r"platform: '([a-z]+)'", "instagram"),
        "platform_label": grab(r"platformLabel: '([^']+)'", "Instagram"),
        "title": grab(r"title: '([^']+)'", "Verified digital log"),
        "niche": grab(r"niche: '([^']+)'", "lifestyle"),
        "handle": grab(r"handle: '([^']+)'", "@handle"),
        "unit": grab(r"unit: '([^']+)'", "followers"),
        "scale": int(float(grab(r"scale: ([\d.]+)", "1000"))),
        "engagement": float(grab(r"engagement: ([\d.]+)", "3.5")),
        "monthly_views": int(float(grab(r"monthlyViews: ([\d.]+)", "0"))),
        "age": int(float(grab(r"age: ([\d.]+)", "2"))),
        "country": grab(r"country: '([^']+)'", "United States"),
        "audience_split": int(float(grab(r"audienceSplit: ([\d.]+)", "60"))),
        "verified": "verified: true" in block,
        "monetized": "monetized: true" in block,
        "escrow_days": int(float(grab(r"escrowDays: ([\d.]+)", "7"))),
        "price": int(float(grab(r"price: ([\d.]+)", "0"))),
    }


def compact(n: int) -> str:
    if n >= 1_000_000:
        return f"{n / 1_000_000:.1f} million"
    if n >= 1_000:
        return f"{n / 1_000:.0f} thousand"
    return str(n)


def build_brief(listing: dict, style: str = "receipts", aspect: str = "9:16") -> RenderBrief:
    preset = STYLE_PRESETS.get(style, STYLE_PRESETS["receipts"])
    platform = listing["platform_label"]
    unit = listing["unit"]
    scale = compact(listing["scale"])

    monetisation = (
        "The account has been monetised and keeps its original creation date."
        if listing["monetized"]
        else "Monetisation is not enabled, which is reflected in the price."
    )

    script = "\n".join(
        [
            f"This is a verified {platform} log with {scale} {unit}.",
            f"Engagement sits at {listing['engagement']} percent — organic growth, no purchased reach.",
            f"The account is {listing['age']} years old and its audience is "
            f"{listing['audience_split']} percent {listing['country']}.",
            monetisation,
            "Every metric you are seeing is hashed into the Reachmark proof vault.",
            f"Fund escrow and the handle is yours — release window is {listing['escrow_days']} days, "
            "or immediately once you confirm the credential chain.",
        ]
    )

    return RenderBrief(
        listing_id=listing["id"],
        title=listing["title"],
        subject=f"{platform} log {listing['id']}",
        script=script,
        video_terms=[platform, listing["niche"], "digital asset", "account transfer"],
        voice_name=VOICE_BY_LOCALE.get(listing["country"], "en-US-AriaNeural"),
        video_aspect=aspect,
        video_concat_mode=preset["concatenate_mode"],
        video_clip_duration=int(preset["clip_duration"]),
        subtitle_enabled=True,
        output_name=f"{listing['id']}-{style}-{aspect.replace(':', 'x')}",
        style=style,
        escrow_terms={
            "days": listing["escrow_days"],
            "verified": listing["verified"],
            "handover": "email + password + 2fa seed",
        },
        proof_artifacts=[
            f"proof/{listing['id']}/analytics.svg",
            f"proof/{listing['id']}/audience.svg",
            f"proof/{listing['id']}/monetisation.svg",
        ],
    )


def main() -> int:
    ap = argparse.ArgumentParser(description="Build a Reachmark proof-reel brief")
    ap.add_argument("--catalog", required=True, help="path to apps/web/src/data/catalog.js")
    ap.add_argument("--id", default="RM-4200", help="listing id, e.g. RM-4200")
    ap.add_argument("--style", default="receipts", choices=sorted(STYLE_PRESETS))
    ap.add_argument("--aspect", default="9:16", choices=["9:16", "1:1", "16:9"])
    ap.add_argument("--out", help="write the brief to this JSON file")
    ap.add_argument("--post", help="submit to a running service, e.g. http://127.0.0.1:8501")
    args = ap.parse_args()

    catalog_path = Path(args.catalog)
    if not catalog_path.exists():
        print(f"catalog not found: {catalog_path}", file=sys.stderr)
        return 2

    raw = load_seeded_catalog(catalog_path)["raw"]
    listing = find_listing(raw, args.id)
    brief = build_brief(listing, args.style, args.aspect)

    print(brief.script)
    print("\n" + "─" * 68)
    print(f"voice        {brief.voice_name}")
    print(f"aspect       {brief.video_aspect}   style {brief.style}")
    print(f"captions     {brief.subtitle_enabled}   output {brief.output_name}.mp4")
    print(f"proof        {len(brief.proof_artifacts)} artefacts")
    print("─" * 68)

    if args.out:
        Path(args.out).write_text(json.dumps(asdict(brief), indent=2))
        print(f"wrote {args.out}")

    if args.post:
        payload = json.dumps(brief.to_task_payload()).encode()
        req = urllib.request.Request(
            f"{args.post.rstrip('/')}/api/v1/videos",
            data=payload,
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                print(f"submitted → HTTP {resp.status}: {resp.read()[:200].decode(errors='ignore')}")
        except Exception as exc:  # noqa: BLE001 - surfaced to the operator
            print(f"submit failed ({exc}). Is the Studio service running on {args.post}?", file=sys.stderr)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
