#!/usr/bin/env python3
"""
claw.py — the Reachmark Logs harvest engine.

Merged from claw-code's agent-harness scripts (scripts/dogfood-probe.py,
scripts/port_manifest.py, scripts/validate_cc2_board.py) and re-pointed at the
Reachmark Logs build pipeline.

"Clawing" in this project means: walk the source trees, extract every artefact
that is actually useful for building Reachmark Logs (schemas, design tokens,
component inventory, service contracts), and persist it as machine-readable
manifests that the web app imports at build time.

Sub-commands
------------
  scan    Claw the four upstream repositories into packages/harvest/repo-manifest.json
  probe   Claw the 50 reference sites into packages/harvest/tool-catalog.json
  merge   Fuse both manifests into packages/harvest/build-manifest.json
  all     scan + probe + merge
  doctor  Preflight: report repo state, manifest freshness, coverage

Usage
-----
  python3 tools/claw/claw.py all
  python3 tools/claw/claw.py scan --only AccountsBazaar
"""

from __future__ import annotations

import argparse
import concurrent.futures as futures
import hashlib
import json
import os
import re
import socket
import ssl
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

ROOT = Path(__file__).resolve().parents[2]
REPOS = Path(os.environ.get("REACHMARK_UPSTREAM", ROOT / "upstream"))
HARVEST = ROOT / "packages" / "harvest"
SCHEMA_REF = ROOT / "docs" / "harvest-schema.json"

UPSTREAMS = {
    "AccountsBazaar": "Full-stack PERN social-account marketplace (prisma schema, chat, admin)",
    "ui-builder": "OpenZeppelin UI Builder (shadcn/tailwind design system, wizard + form engine)",
    "MoneyPrinterTurbo_": "Python/FastAPI short-video generation service (task pipeline, subtitles, TTS)",
    "claw-code": "Agent harness + repository clawing utilities (probe/manifest/roadmap scripts)",
}

# Directories that are noise for a build manifest.
IGNORE_DIRS = {
    ".git", "node_modules", "__pycache__", ".next", "dist", "build", "target",
    ".venv", "venv", ".mypy_cache", ".pytest_cache", ".turbo", "coverage",
    ".husky", ".github", ".vscode", ".cursor", ".specify", ".omx", ".port_sessions",
    ".claude", ".claw", ".sandbox-home", ".omc",
}
CODE_EXT = {
    ".py", ".js", ".jsx", ".ts", ".tsx", ".rs", ".css", ".scss", ".json",
    ".toml", ".prisma", ".sql", ".md", ".yml", ".yaml", ".html",
}


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #
def utcnow() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def human(n: float) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if abs(n) < 1024:
            return f"{n:.1f}{unit}"
        n /= 1024
    return f"{n:.1f}TB"


def walk_files(root: Path, limit: int = 200_000) -> Iterable[Path]:
    count = 0
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]
        for name in filenames:
            yield Path(dirpath) / name
            count += 1
            if count > limit:
                return


def count_lines(path: Path) -> int:
    try:
        with path.open("r", encoding="utf-8", errors="ignore") as fh:
            return sum(1 for _ in fh)
    except OSError:
        return 0


def read_text(path: Path, max_bytes: int = 400_000) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="ignore")[:max_bytes]
    except OSError:
        return ""


# --------------------------------------------------------------------------- #
# scan
# --------------------------------------------------------------------------- #
@dataclass
class RepoReport:
    name: str
    purpose: str
    path: str = ""
    present: bool = False
    files: int = 0
    bytes: int = 0
    code_lines: int = 0
    languages: dict[str, int] = field(default_factory=dict)
    top_level: list[str] = field(default_factory=list)
    entrypoints: list[str] = field(default_factory=list)
    dependencies: dict[str, list[str]] = field(default_factory=dict)
    extracted: dict[str, Any] = field(default_factory=dict)
    harvested_at: str = ""


def find_entrypoints(root: Path, files: list[Path]) -> list[str]:
    interesting = re.compile(
        r"(^|/)(main|server|app|index|cli|manage|router|schema|config)"
        r"\.(py|js|jsx|ts|tsx|rs|toml|prisma)$"
    )
    out = []
    for f in files:
        rel = f.relative_to(root).as_posix()
        if interesting.search(rel) and len(rel.split("/")) <= 3:
            out.append(rel)
    return sorted(out)[:24]


def parse_package_json(path: Path) -> dict[str, list[str]]:
    data = json.loads(read_text(path) or "{}")
    return {
        "runtime": sorted((data.get("dependencies") or {}).keys()),
        "dev": sorted((data.get("devDependencies") or {}).keys()),
    }


def parse_requirements(path: Path) -> list[str]:
    out = []
    for line in read_text(path).splitlines():
        line = line.strip()
        if line and not line.startswith("#") and not line.startswith("-"):
            out.append(re.split(r"[<>=!\[]", line)[0].strip())
    return out


def parse_prisma_models(path: Path) -> list[dict[str, Any]]:
    """Extract model + enum blocks from a prisma schema — the DB contract."""
    text = read_text(path)
    models, enums = [], []
    for match in re.finditer(r"model\s+(\w+)\s*\{(.*?)\n\}", text, re.S):
        name, body = match.group(1), match.group(2)
        fields = []
        for line in body.splitlines():
            line = line.strip()
            if not line or line.startswith("//") or line.startswith("@@"):
                continue
            parts = line.split()
            if len(parts) >= 2:
                fields.append({
                    "name": parts[0],
                    "type": parts[1],
                    "attributes": " ".join(parts[2:]),
                })
        models.append({"name": name, "fieldCount": len(fields), "fields": fields})
    for match in re.finditer(r"enum\s+(\w+)\s*\{(.*?)\n\}", text, re.S):
        values = [v.strip() for v in match.group(2).split() if v.strip() and not v.startswith("//")]
        enums.append({"name": match.group(1), "values": values})
    return models


# --- design tokens (from ui-builder + AccountsBazaar css) ------------------- #
def extract_css_tokens(css: str) -> dict[str, Any]:
    tokens: dict[str, Any] = {
        "cssVariables": {},
        "classes": [],
        "keyframes": re.findall(r"@keyframes\s+([\w-]+)", css),
        "fonts": sorted(set(re.findall(r"font-family:\s*'([^']+)'", css))),
        "mediaQueries": len(re.findall(r"@media", css)),
    }
    for name, value in re.findall(r"(--[\w-]+)\s*:\s*([^;]+);", css):
        tokens["cssVariables"][name] = value.strip()
    tokens["classes"] = sorted(set(re.findall(r"\.([a-z][\w-]{2,})\s*\{", css)))
    return tokens


def extract_tailwind_theme(cfg: str) -> dict[str, Any]:
    theme: dict[str, Any] = {"colors": [], "animations": [], "fontFamily": []}
    for block, bucket in (("colors", "colors"), ("animation", "animations"), ("fontFamily", "fontFamily")):
        m = re.search(rf"{block}\s*:\s*\{{", cfg)
        if not m:
            continue
        depth, i = 0, m.end() - 1
        while i < len(cfg):
            if cfg[i] == "{":
                depth += 1
            elif cfg[i] == "}":
                depth -= 1
                if depth == 0:
                    break
            i += 1
        body = cfg[m.end():i]
        keys = re.findall(r"['\"]?([\w-]+)['\"]?\s*:", body)
        theme[bucket] = sorted(set(keys))[:60]
    return theme


@dataclass
class ComponentInfo:
    name: str
    path: str
    lines: int
    kind: str
    exports: list[str] = field(default_factory=list)


def classify_component(rel: str) -> str:
    low = rel.lower()
    for key in ("admin", "chat", "listing", "credential", "withdraw", "filter",
                "hero", "plans", "card", "field", "wizard", "step", "export",
                "sidebar", "navbar", "footer", "form", "table", "modal", "chart"):
        if key in low:
            return key
    return "general"


def extract_jsx_exports(text: str) -> list[str]:
    names = set(re.findall(r"export\s+(?:default\s+)?function\s+(\w+)", text))
    names |= set(re.findall(r"export\s+const\s+(\w+)", text))
    names |= set(re.findall(r"const\s+(\w+)\s*=\s*\([^)]*\)\s*=>", text))
    return sorted(names)[:8]


def scan_repo(name: str, purpose: str) -> RepoReport:
    root = REPOS / name
    rep = RepoReport(name=name, purpose=purpose, path=str(root), present=root.exists(), harvested_at=utcnow())
    if not rep.present:
        return rep

    rep.top_level = sorted(
        p.name for p in root.iterdir() if p.name not in IGNORE_DIRS and not p.name.startswith(".")
    )[:40]

    all_files: list[Path] = []
    for path in walk_files(root):
        all_files.append(path)
        try:
            rep.bytes += path.stat().st_size
        except OSError:
            pass
        ext = path.suffix.lower()
        if ext in CODE_EXT:
            rep.languages[ext] = rep.languages.get(ext, 0) + 1

    rep.files = len(all_files)
    code_files = [f for f in all_files if f.suffix.lower() in CODE_EXT and f.stat().st_size < 400_000]
    for f in code_files:
        rep.code_lines += count_lines(f)
    rep.entrypoints = find_entrypoints(root, code_files)

    # -- dependencies ------------------------------------------------------ #
    for pkg in root.rglob("package.json"):
        if "node_modules" in pkg.parts:
            continue
        try:
            rep.dependencies[str(pkg.relative_to(root))] = parse_package_json(pkg)
        except (json.JSONDecodeError, OSError):
            continue
    for req in list(root.glob("requirements.txt")) + list(root.glob("pyproject.toml")):
        rep.dependencies[str(req.relative_to(root))] = {"python": parse_requirements(req)}

    # -- prisma schema ----------------------------------------------------- #
    models = []
    for sch in root.rglob("*.prisma"):
        models.extend(parse_prisma_models(sch))
    if models:
        rep.extracted["prismaModels"] = models
        rep.extracted["modelNames"] = [m["name"] for m in models]

    # -- design system ----------------------------------------------------- #
    css_blob = "\n".join(read_text(f) for f in code_files if f.suffix.lower() in {".css", ".scss"})
    if css_blob.strip():
        rep.extracted["designTokens"] = extract_css_tokens(css_blob)
    tw = [f for f in code_files if f.name.startswith("tailwind.config")]
    if tw:
        rep.extracted["tailwindTheme"] = extract_tailwind_theme(read_text(tw[0]))

    # -- component inventory ---------------------------------------------- #
    comps: list[ComponentInfo] = []
    for f in code_files:
        if f.suffix.lower() in {".jsx", ".tsx"} and "test" not in f.parts:
            text = read_text(f)
            rel = f.relative_to(root).as_posix()
            comps.append(ComponentInfo(
                name=f.stem,
                path=rel,
                lines=text.count("\n") + 1,
                kind=classify_component(rel),
                exports=extract_jsx_exports(text),
            ))
    if comps:
        rep.extracted["components"] = [asdict(c) for c in sorted(comps, key=lambda c: -c.lines)]

    # -- feature surface (routes / api routers / services) ---------------- #
    features: dict[str, list[str]] = {}
    for pattern, bucket in (
        (r"src/pages/.*\.jsx$", "pages"),
        (r"(controllers)/.*\.(js|py)$", "controllers"),
        (r"(routes)/.*\.js$", "routes"),
        (r"(services)/.*\.py$", "services"),
        (r"(tools|scripts)/.*\.(py|sh)$", "harnessScripts"),
    ):
        hits = [f.relative_to(root).as_posix() for f in code_files if re.search(pattern, f.relative_to(root).as_posix())]
        if hits:
            features[bucket] = sorted(hits)[:40]
    rep.extracted["features"] = features

    return rep


# --------------------------------------------------------------------------- #
# probe (reference sites)
# --------------------------------------------------------------------------- #
UA = "Mozilla/5.0 (compatible; ReachmarkClaw/1.0; +https://github.com/leephil1907-lab)"
TITLE_RE = re.compile(r"<title[^>]*>(.*?)</title>", re.S | re.I)
DESC_RE = re.compile(r'<meta[^>]+(?:name|property)=["\'](?:description|og:description)["\'][^>]+content=["\'](.*?)["\']', re.S | re.I)
ICON_RE = re.compile(r'<link[^>]+rel=["\'][^"\']*icon[^"\']*["\'][^>]+href=["\']([^"\']+)["\']', re.I)
THEME_RE = re.compile(r'<meta[^>]+name=["\']theme-color["\'][^>]+content=["\']([^"\']+)["\']', re.I)


def http_get(url: str, timeout: float = 12.0) -> tuple[int, str, str]:
    req = urllib.request.Request(url, headers={
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
    })
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
        raw = resp.read(220_000)
        charset = resp.headers.get_content_charset() or "utf-8"
        return resp.status, raw.decode(charset, errors="ignore"), resp.geturl()
    return 0, "", url


def probe_site(entry: dict[str, Any]) -> dict[str, Any]:
    url = entry["url"]
    out = {
        **entry,
        "status": "unreachable",
        "httpStatus": 0,
        "finalUrl": url,
        "title": "",
        "metaDescription": "",
        "favicon": "",
        "themeColor": "",
        "latencyMs": 0,
        "probedAt": utcnow(),
    }
    t0 = time.time()
    try:
        status, html, final = http_get(url)
        out["httpStatus"] = status
        out["finalUrl"] = final
        out["latencyMs"] = int((time.time() - t0) * 1000)
        title = TITLE_RE.search(html)
        desc = DESC_RE.search(html)
        icon = ICON_RE.search(html)
        theme = THEME_RE.search(html)
        out["title"] = (title.group(1).strip()[:160] if title else "")
        out["metaDescription"] = (desc.group(1).strip()[:240] if desc else "")
        out["themeColor"] = theme.group(1) if theme else ""
        if icon:
            href = icon.group(1)
            if href.startswith("//"):
                href = "https:" + href
            elif href.startswith("/"):
                m = re.match(r"https?://[^/]+", final)
                href = (m.group(0) if m else url) + href
            out["favicon"] = href[:220]
        out["status"] = "ok" if 200 <= status < 400 else "blocked"
    except urllib.error.HTTPError as exc:
        out["httpStatus"] = exc.code
        out["status"] = "blocked"
        out["latencyMs"] = int((time.time() - t0) * 1000)
    except (urllib.error.URLError, socket.timeout, ssl.SSLError, TimeoutError, OSError):
        out["status"] = "unreachable"
        out["latencyMs"] = int((time.time() - t0) * 1000)
    return out


# --------------------------------------------------------------------------- #
# build manifest
# --------------------------------------------------------------------------- #
def build_capability_matrix(reports: list[RepoReport]) -> list[dict[str, Any]]:
    """Map every harvested asset to the Reachmark Logs surface it powers."""
    matrix = [
        {"capability": "Auth & identity", "source": "AccountsBazaar (Clerk) + local demo adapter",
         "reachmarkSurface": "Sign-in, account hub, role gating (buyer / seller / admin)"},
        {"capability": "Marketplace inventory", "source": "AccountsBazaar Listing model + filters",
         "reachmarkSurface": "Reachmark Logs catalog: social + gaming/streaming + aged SaaS logs"},
        {"capability": "Listing workflow", "source": "AccountsBazaar listingController",
         "reachmarkSurface": "Sell a log wizard: platform → metrics → proof → pricing → review"},
        {"capability": "Proof & media", "source": "AccountsBazaar ImageKit/Multer + ui-builder media fields",
         "reachmarkSurface": "Proof vault, ownership test, screenshot reels, credential chain"},
        {"capability": "Credential handover", "source": "AccountsBazaar Credential model + admin verify flow",
         "reachmarkSurface": "Escrow credential chain: submitted → verified → changed"},
        {"capability": "Messaging", "source": "AccountsBazaar Chat + PlatformMessage",
         "reachmarkSurface": "Buyer↔seller threads with Reachmark guard bot + unread badges"},
        {"capability": "Payments & payouts", "source": "AccountsBazaar Transaction/Withdrawal",
         "reachmarkSurface": "Escrow ledger, seller balance, withdrawal requests"},
        {"capability": "Admin console", "source": "AccountsBazaar admin pages + ui-builder wizard shell",
         "reachmarkSurface": "Ops dashboard: revenue, verification queue, payout approvals"},
        {"capability": "Design system", "source": "ui-builder (shadcn new-york, Radix, tailwind tokens)",
         "reachmarkSurface": "Radix-grade primitives, dark glass surfaces, gradient auroras"},
        {"capability": "Form engine", "source": "ui-builder StepFormCustomization + field registry",
         "reachmarkSurface": "Dynamic sell-form generator driven by packages/harvest manifests"},
        {"capability": "Motion layer", "source": "New for Reachmark (Framer Motion + custom CSS)",
         "reachmarkSurface": "Page transitions, scroll reveals, magnetic cards, aurora backdrops"},
        {"capability": "Studio / proof reels", "source": "MoneyPrinterTurbo (FastAPI) + JS reel port",
         "reachmarkSurface": "Auto-generate proof reels & launch videos for listings"},
        {"capability": "Harvest manifests", "source": "claw-code harness scripts (claw.py)",
         "reachmarkSurface": "Build-time manifests powering the reference-tool library & docs"},
    ]
    return matrix


def repo_to_dict(rep: RepoReport) -> dict:
    """camelCase the dataclass keys — the web client reads this JSON directly."""
    raw = asdict(rep)
    return {
        "name": raw["name"],
        "purpose": raw["purpose"],
        "path": raw["path"],
        "present": raw["present"],
        "files": raw["files"],
        "bytes": raw["bytes"],
        "codeLines": raw["code_lines"],
        "languages": raw["languages"],
        "topLevel": raw["top_level"],
        "entrypoints": raw["entrypoints"],
        "dependencies": raw["dependencies"],
        "extracted": raw["extracted"],
        "harvestedAt": raw["harvested_at"],
    }


def cmd_scan(args) -> int:
    HARVEST.mkdir(parents=True, exist_ok=True)
    targets = [(n, p) for n, p in UPSTREAMS.items() if not args.only or n in args.only]
    reports = []
    for name, purpose in targets:
        print(f"  claw → {name} …", end=" ", flush=True)
        rep = scan_repo(name, purpose)
        reports.append(rep)
        print(f"{rep.files} files / {human(rep.bytes)} / {rep.code_lines:,} LOC"
              if rep.present else "MISSING")
    payload = {
        "$schema": "harvest-schema.json#/definitions/repoManifest",
        "generatedBy": "tools/claw/claw.py scan",
        "generatedAt": utcnow(),
        "repoCount": len(reports),
        "presentCount": sum(1 for r in reports if r.present),
        "totalFiles": sum(r.files for r in reports),
        "totalBytes": sum(r.bytes for r in reports),
        "totalCodeLines": sum(r.code_lines for r in reports),
        "repos": [repo_to_dict(r) for r in reports],
    }
    out = HARVEST / "repo-manifest.json"
    out.write_text(json.dumps(payload, indent=2))
    print(f"\n  wrote {out.relative_to(ROOT)}  ({human(out.stat().st_size)})")
    return 0


def cmd_probe(args) -> int:
    HARVEST.mkdir(parents=True, exist_ok=True)
    catalog = json.loads((ROOT / "docs" / "reference-sites.json").read_text())
    sites = catalog["sites"]
    if args.limit:
        sites = sites[: args.limit]
    print(f"  claw → probing {len(sites)} reference sites (concurrency={args.concurrency})")
    results: list[dict[str, Any]] = []
    with futures.ThreadPoolExecutor(max_workers=args.concurrency) as pool:
        for res in pool.map(probe_site, sites):
            icon = {"ok": "✓", "blocked": "▲", "unreachable": "✗"}[res["status"]]
            print(f"    {icon} {res['httpStatus']:>3}  {res['slug']:<26} {res['latencyMs']:>5}ms")
            results.append(res)
    ok = sum(1 for r in results if r["status"] == "ok")
    payload = {
        "$schema": "harvest-schema.json#/definitions/toolCatalog",
        "generatedBy": "tools/claw/claw.py probe",
        "generatedAt": utcnow(),
        "probed": len(results),
        "reachable": ok,
        "categories": sorted({r["category"] for r in results}),
        "sites": results,
    }
    out = HARVEST / "tool-catalog.json"
    out.write_text(json.dumps(payload, indent=2))
    print(f"\n  {ok}/{len(results)} reachable → wrote {out.relative_to(ROOT)}")
    return 0


def cmd_merge(args) -> int:
    repo_manifest = json.loads((HARVEST / "repo-manifest.json").read_text())
    tool_catalog = json.loads((HARVEST / "tool-catalog.json").read_text())
    reports = repo_manifest["repos"]

    designs, schemas, components = [], [], []
    for r in reports:
        ex = r.get("extracted") or {}
        if ex.get("designTokens"):
            designs.append({"repo": r["name"], "tokens": ex["designTokens"]})
        if ex.get("tailwindTheme"):
            designs.append({"repo": r["name"], "tailwind": ex["tailwindTheme"]})
        if ex.get("modelNames"):
            schemas.append({"repo": r["name"], "models": ex["modelNames"],
                            "detail": ex.get("prismaModels")})
        for c in ex.get("components", []):
            components.append({"repo": r["name"], **c})

    components.sort(key=lambda c: -c["lines"])
    payload = {
        "$schema": "harvest-schema.json#/definitions/buildManifest",
        "generatedBy": "tools/claw/claw.py merge",
        "generatedAt": utcnow(),
        "project": "Reachmark Logs",
        "tagline": "The verified marketplace for social, gaming and aged digital logs.",
        "sources": [
            {"repo": r["name"], "purpose": r["purpose"], "files": r["files"],
             "loc": r["codeLines"], "bytes": r["bytes"]}
            for r in reports
        ],
        "totals": {
            "sourceFiles": repo_manifest["totalFiles"],
            "sourceLoc": repo_manifest["totalCodeLines"],
            "componentsDiscovered": len(components),
            "designSystems": len(designs),
            "dataModels": sum(len(s["models"]) for s in schemas),
            "referenceTools": tool_catalog["probed"],
            "referenceToolsReachable": tool_catalog["reachable"],
        },
        "capabilityMatrix": build_capability_matrix(reports),
        "designSystems": designs,
        "dataModels": schemas,
        "components": components[:120],
        "reusableComponents": [c for c in components if c["lines"] > 60][:40],
        "referenceToolCategories": tool_catalog["categories"],
        "referenceTools": [
            {k: s.get(k) for k in ("slug", "name", "url", "category", "whatItIs",
                                   "reachmarkUse", "status", "title", "themeColor", "favicon")}
            for s in tool_catalog["sites"]
        ],
        "fingerprint": hashlib.sha256(
            json.dumps([r["name"] for r in reports] + tool_catalog["categories"]).encode()
        ).hexdigest()[:16],
    }
    out = HARVEST / "build-manifest.json"
    out.write_text(json.dumps(payload, indent=2))
    print(f"  merged → {out.relative_to(ROOT)}  ({human(out.stat().st_size)})")
    print(f"  components={payload['totals']['componentsDiscovered']} "
          f"models={payload['totals']['dataModels']} tools={payload['totals']['referenceTools']}")
    return 0


def cmd_doctor(args) -> int:
    print("claw doctor — Reachmark Logs preflight\n")
    ok = True
    for name in UPSTREAMS:
        p = REPOS / name
        state = "present" if p.exists() else "MISSING"
        if not p.exists():
            ok = False
        print(f"  [{state:>7}] upstream/{name}")
    for f in ("repo-manifest.json", "tool-catalog.json", "build-manifest.json"):
        p = HARVEST / f
        age = ""
        if p.exists():
            age = f" ({(time.time() - p.stat().st_mtime) / 60:.1f} min old)"
        else:
            ok = False
        print(f"  [{'present' if p.exists() else 'MISSING':>7}] packages/harvest/{f}{age}")
    for f in ("reference-sites.json", "harvest-schema.json"):
        p = ROOT / "docs" / f
        print(f"  [{'present' if p.exists() else 'MISSING':>7}] docs/{f}")
    print(f"\n  python {sys.version.split()[0]} · platform {sys.platform} · {utcnow()}")
    print("  status:", "healthy" if ok else "incomplete — run `python3 tools/claw/claw.py all`")
    return 0 if ok else 1


def main() -> int:
    ap = argparse.ArgumentParser(prog="claw", description="Reachmark Logs harvest engine")
    sub = ap.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("scan", help="claw the upstream repositories")
    s.add_argument("--only", nargs="*", help="restrict to these repo names")
    s.set_defaults(fn=cmd_scan)

    p = sub.add_parser("probe", help="claw the reference sites")
    p.add_argument("--limit", type=int, default=0)
    p.add_argument("--concurrency", type=int, default=12)
    p.set_defaults(fn=cmd_probe)

    sub.add_parser("merge", help="fuse manifests").set_defaults(fn=cmd_merge)
    sub.add_parser("doctor", help="preflight check").set_defaults(fn=cmd_doctor)

    a = sub.add_parser("all", help="scan + probe + merge")
    a.add_argument("--limit", type=int, default=0)
    a.add_argument("--concurrency", type=int, default=12)
    a.add_argument("--only", nargs="*")
    a.set_defaults(fn=None)

    args = ap.parse_args()
    if args.cmd == "all":
        cmd_scan(args)
        cmd_probe(args)
        return cmd_merge(args)
    return args.fn(args)


if __name__ == "__main__":
    raise SystemExit(main())
