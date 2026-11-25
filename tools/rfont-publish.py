#!/usr/bin/env python3
"""RFONT feed publisher for rizal.pw (staging).

Reads a RFONT TTF, writes an add-only versioned folder, regenerates
/fonts/rfont-feed.json and /rfont.css, and bumps sw.js + sw-precache.json
together. Never deletes old versions. Never signs. Never publishes.

Usage:
  python3 tools/rfont-publish.py [--site DIR] [--ttf PATH] [--no-sw-bump]

Default --ttf, first existing:
  $RFONT_TTF
  <site>/fonts-src/RFONT.ttf
  <site>/fonts-src/RFONT-*.ttf (newest)
  ~/Library/Fonts/RFONT.ttf
  ~/HANDOFFS/RFONT-1.2.ttf
  <site>/fonts/RIZAL-Regular.ttf
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

try:
    from fontTools.ttLib import TTFont
except ImportError:
    sys.exit("fontTools is required (pip install fonttools brotli)")

TZ = ZoneInfo("America/Denver")
SCHEMA = "rfont-feed-v1"
SIG_SCHEMA = "rfont-feed-sig-v1"
FAMILIES = ["RIZAL", "RIZAL Mono", "RFONT"]
FALLBACK_STACK = (
    'RIZAL, RFONT, "Noto Sans Tagalog", "Noto Sans Mayan Numerals", '
    '"BabelStone Mayan Numerals"'
)
MONO_STACK = (
    '"RIZAL Mono", RIZAL, RFONT, "Noto Sans Tagalog", '
    '"Noto Sans Mayan Numerals", "BabelStone Mayan Numerals"'
)
BAK_SFX = ".bak-rfont-feed-20261125"

FALLBACKS = [
    {
        "name": "RIZAL-POLYCODE-placeholders",
        "families": ["RIZAL", "RFONT"],
        "unicode_range": "U+F0000-U+F00FF",
        "role": "polycode-placeholder",
    },
    {
        "name": "RIZALMono-POLYCODE-placeholders",
        "families": ["RIZAL Mono"],
        "unicode_range": "U+F0000-U+F00FF",
        "role": "polycode-placeholder",
    },
    {
        "name": "NotoSansTagalog-Regular",
        "families": ["Noto Sans Tagalog"],
        "unicode_range": "U+1700-171F, U+1735-1736",
        "role": "baybayin-fallback",
        "css_family": "Noto Sans Tagalog",
    },
    {
        "name": "NotoSansMayanNumerals-Regular",
        "families": ["Noto Sans Mayan Numerals"],
        "unicode_range": "U+1D2E0-1D2F3",
        "role": "mayan-fallback",
        "css_family": "Noto Sans Mayan Numerals",
    },
    {
        "name": "BabelStoneMayanNumerals",
        "families": ["BabelStone Mayan Numerals"],
        "unicode_range": "U+1D2E0-1D2F3",
        "role": "mayan-fallback",
        "css_family": "BabelStone Mayan Numerals",
    },
]


def sha256(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def bak(path: Path) -> None:
    if not path.exists():
        return
    dest = Path(str(path) + BAK_SFX)
    if not dest.exists():
        shutil.copy2(path, dest)


def find_ttf(site: Path, explicit: str | None) -> Path:
    if explicit:
        p = Path(explicit).expanduser()
        if not p.is_file():
            sys.exit(f"TTF not found: {p}")
        return p
    env = os.environ.get("RFONT_TTF")
    cands: list[Path] = []
    if env:
        cands.append(Path(env).expanduser())
    cands.append(site / "fonts-src" / "RFONT.ttf")
    srcdir = site / "fonts-src"
    if srcdir.is_dir():
        cands.extend(sorted(srcdir.glob("RFONT*.ttf"), key=lambda p: p.stat().st_mtime, reverse=True))
    cands.extend(
        [
            Path.home() / "Library/Fonts/RFONT.ttf",
            Path.home() / "HANDOFFS/RFONT-1.2.ttf",
            site / "fonts" / "RIZAL-Regular.ttf",
        ]
    )
    seen = set()
    for p in cands:
        if p in seen:
            continue
        seen.add(p)
        if p.is_file():
            return p
    sys.exit("No RFONT TTF found. Pass --ttf PATH or drop a file in fonts-src/.")


def read_font_info(ttf: Path) -> dict:
    font = TTFont(str(ttf))
    version_raw = ""
    family = ""
    for rec in font["name"].names:
        try:
            val = rec.toUnicode().strip()
        except Exception:
            continue
        if rec.nameID == 5 and (rec.platformID == 3 or not version_raw):
            version_raw = val
        if rec.nameID == 1 and (rec.platformID == 3 or not family):
            family = val
    m = re.search(r"(\d+\.\d+)", version_raw or "")
    if not m:
        font.close()
        sys.exit(f"Cannot parse font version from name table: {version_raw!r}")
    version = m.group(1)
    cmap = font.getBestCmap() or {}
    cps = sorted(cmap)
    def count(lo, hi):
        return sum(1 for c in cps if lo <= c <= hi)
    info = {
        "version": version,
        "version_raw": version_raw,
        "family": family or "RFONT",
        "codepoints": len(cps),
        "glyphs": len(font.getGlyphOrder()),
        "isFixedPitch": bool(font["post"].isFixedPitch) if "post" in font else None,
        "latin": count(0x20, 0x7E),
        "baybayin": count(0x1700, 0x171F),
        "mayan": count(0x1D2E0, 0x1D2F3),
        "polycode": count(0xF0000, 0xF00FF),
    }
    font.close()
    return info


def to_woff2(ttf: Path, dest: Path) -> None:
    font = TTFont(str(ttf))
    font.flavor = "woff2"
    dest.parent.mkdir(parents=True, exist_ok=True)
    font.save(str(dest))
    font.close()


def version_dir_name(version: str, ttf_sha: str, fonts: Path) -> str:
    """Add-only: reuse /fonts/<ver>/ if empty or same hash; never overwrite a different TTF."""
    base = version
    d = fonts / base
    existing = d / "RIZAL-Regular.ttf"
    if not d.exists() or not existing.is_file():
        return base
    if sha256(existing) == ttf_sha:
        return base
    # conflict: keep the old folder, use a unique sibling
    alt = f"{version}-{ttf_sha[:8]}"
    n = 2
    while (fonts / alt).exists() and sha256(fonts / alt / "RIZAL-Regular.ttf") not in (ttf_sha,):
        if not (fonts / alt / "RIZAL-Regular.ttf").exists():
            break
        alt = f"{version}-{ttf_sha[:8]}-r{n}"
        n += 1
    return alt


def fallback_entries(site: Path) -> list[dict]:
    out = []
    fonts = site / "fonts"
    for fb in FALLBACKS:
        files = []
        for ext, fmt in (("woff2", "woff2"), ("ttf", "truetype")):
            p = fonts / f"{fb['name']}.{ext}"
            if not p.is_file():
                continue
            files.append(
                {
                    "name": p.name,
                    "format": fmt,
                    "size": p.stat().st_size,
                    "sha256": sha256(p),
                    "url": f"/fonts/{p.name}",
                }
            )
        if not files:
            continue
        entry = {
            "name": fb["name"],
            "role": fb["role"],
            "families": fb["families"],
            "unicode_range": fb["unicode_range"],
            "files": files,
        }
        if fb.get("css_family"):
            entry["css_family"] = fb["css_family"]
        out.append(entry)
    return out


def render_css(feed: dict) -> str:
    lines = [
        "/* rfont.css — generated from /fonts/rfont-feed.json by tools/rfont-publish.py",
        "   Staging only. Do not publish without the Decider's GO.",
        f"   Primary: RFONT {feed.get('version')} ({', '.join(feed.get('families') or FAMILIES)}).",
        "   URLs are versioned so a feed bump cache-busts automatically.",
        "*/",
    ]
    primary = [f for f in feed.get("files") or [] if f.get("role") == "primary"]
    # woff2 first
    primary.sort(key=lambda f: (0 if f.get("format") == "woff2" else 1, f.get("name", "")))

    def src_block(files):
        parts = []
        for f in files:
            fmt = "woff2" if f.get("format") == "woff2" else "truetype"
            parts.append(f'url("{f["url"]}") format("{fmt}")')
        return ",\n       ".join(parts)

    src = src_block(primary)
    for fam in feed.get("families") or FAMILIES:
        lines += [
            "@font-face {",
            f'  font-family: "{fam}";',
            f"  src: {src};",
            "  font-weight: 100 900;",
            "  font-style: normal;",
            "  font-display: swap;",
            "}",
        ]
    for fb in feed.get("fallbacks") or []:
        files = fb.get("files") or []
        if not files:
            continue
        fams = fb.get("families") or []
        ur = fb.get("unicode_range") or ""
        fsrc = src_block(sorted(files, key=lambda f: (0 if f.get("format") == "woff2" else 1)))
        for fam in fams:
            lines += [
                "@font-face {",
                f'  font-family: "{fam}";',
                f"  src: {fsrc};",
                "  font-weight: 400;",
                "  font-style: normal;",
                "  font-display: swap;",
            ]
            if ur:
                lines.append(f"  unicode-range: {ur};")
            lines.append("}")
    lines += [
        "",
        ":root {",
        f"  --rfont-sans: {FALLBACK_STACK}, system-ui, -apple-system, \"Segoe UI\", \"Helvetica Neue\", Helvetica, Arial, sans-serif;",
        f"  --rfont-mono: {MONO_STACK}, ui-monospace, \"SF Mono\", Menlo, Consolas, monospace;",
        f"  --gm-font: {MONO_STACK}, \"Menlo\", \"SF Mono\", ui-monospace, \"Consolas\", \"Courier New\", monospace;",
        "}",
        "",
        "html {",
        f"  font-family: {FALLBACK_STACK}, system-ui, -apple-system, \"Helvetica Neue\", Helvetica, Arial, sans-serif;",
        "}",
        "code, kbd, samp, tt, pre {",
        f"  font-family: {MONO_STACK}, ui-monospace, Menlo, Consolas, monospace;",
        "}",
        "",
    ]
    return "\n".join(lines)


def bump_sw(site: Path, feed: dict, extra_urls: list[str]) -> str:
    precache = site / "sw-precache.json"
    sw = site / "sw.js"
    data = json.loads(precache.read_text(encoding="utf-8"))
    old_v = data.get("v") or ""
    new_v = f"rtoken20261105-race-pack-rfont-feed-{feed['version']}"
    data["v"] = new_v
    files = list(data.get("files") or [])
    for url in extra_urls:
        if url not in files:
            files.append(url)
    data["files"] = files
    bak(precache)
    precache.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    if sw.is_file():
        text = sw.read_text(encoding="utf-8")
        m = re.search(r"var SWV='([^']*)'", text)
        if m and m.group(1) != new_v:
            bak(sw)
            text = text.replace(f"var SWV='{m.group(1)}'", f"var SWV='{new_v}'")
            sw.write_text(text, encoding="utf-8")
        elif not m:
            print("WARNING: could not find var SWV in sw.js", file=sys.stderr)
    return new_v


def publish(site: Path, ttf: Path, bump_sw_flag: bool) -> dict:
    site = site.resolve()
    fonts = site / "fonts"
    fonts.mkdir(exist_ok=True)
    info = read_font_info(ttf)
    ttf_sha = sha256(ttf)
    folder = version_dir_name(info["version"], ttf_sha, fonts)
    dest_dir = fonts / folder
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_ttf = dest_dir / "RIZAL-Regular.ttf"
    dest_woff = dest_dir / "RIZAL-Regular.woff2"
    wrote_new = False
    if not dest_ttf.is_file() or sha256(dest_ttf) != ttf_sha:
        shutil.copy2(ttf, dest_ttf)
        wrote_new = True
    # reuse existing woff2 at /fonts/RIZAL-Regular.woff2 if it was built from the same TTF
    legacy_woff = fonts / "RIZAL-Regular.woff2"
    legacy_ttf = fonts / "RIZAL-Regular.ttf"
    if not dest_woff.is_file():
        if legacy_ttf.is_file() and legacy_woff.is_file() and sha256(legacy_ttf) == ttf_sha:
            shutil.copy2(legacy_woff, dest_woff)
        else:
            to_woff2(dest_ttf, dest_woff)
        wrote_new = True
    sums = []
    for p in sorted(dest_dir.iterdir()):
        if p.is_file() and p.name != "SHA256SUMS":
            sums.append(f"{sha256(p)}  {p.name}")
    (dest_dir / "SHA256SUMS").write_text("\n".join(sums) + "\n", encoding="utf-8")

    now = datetime.now(TZ)
    files = [
        {
            "name": "RIZAL-Regular.woff2",
            "role": "primary",
            "format": "woff2",
            "size": dest_woff.stat().st_size,
            "sha256": sha256(dest_woff),
            "url": f"/fonts/{folder}/RIZAL-Regular.woff2",
            "families": FAMILIES,
        },
        {
            "name": "RIZAL-Regular.ttf",
            "role": "primary",
            "format": "truetype",
            "size": dest_ttf.stat().st_size,
            "sha256": sha256(dest_ttf),
            "url": f"/fonts/{folder}/RIZAL-Regular.ttf",
            "families": FAMILIES,
        },
    ]
    coverage = {
        "notes": (
            f"{info['family']} {info['version_raw']}: {info['codepoints']} codepoints, "
            f"{info['glyphs']} glyphs, monospaced={info['isFixedPitch']}. "
            "Latin / Cyrillic / Baybayin / Mayan numerals as present in the face. "
            + (
                "POLYCODE U+F0000–U+F00FF is not in this face; placeholder glyphs come from the fallback range face."
                if info["polycode"] == 0
                else f"POLYCODE placeholders present ({info['polycode']} codepoints)."
            )
        ),
        "codepoints": info["codepoints"],
        "glyphs": info["glyphs"],
        "latin_basic": info["latin"],
        "baybayin_block": info["baybayin"],
        "mayan_numerals": info["mayan"],
        "polycode_p15": info["polycode"],
        "isFixedPitch": info["isFixedPitch"],
        "source_family": info["family"],
        "source_version": info["version_raw"],
    }
    feed = {
        "schema": SCHEMA,
        "version": info["version"],
        "folder": f"/fonts/{folder}/",
        "updated": now.isoformat(timespec="seconds"),
        "families": FAMILIES,
        "coverage": coverage,
        "files": files,
        "fallbacks": fallback_entries(site),
        "css": "/rfont.css",
        "auto": "/rfont-auto.js",
        "signature": {
            "status": "unsigned",
            "url": "/fonts/rfont-feed.json.sig.json",
            "note": "Bots never sign. Rizal signs this later with his owner key.",
        },
    }
    feed_path = fonts / "rfont-feed.json"
    bak(feed_path)
    feed_bytes = (json.dumps(feed, indent=2, ensure_ascii=False) + "\n").encode("utf-8")
    feed_path.write_bytes(feed_bytes)
    feed_sha = hashlib.sha256(feed_bytes).hexdigest()
    sig = {
        "schema": SIG_SCHEMA,
        "status": "unsigned",
        "version": info["version"],
        "feed": "/fonts/rfont-feed.json",
        "feed_sha256": feed_sha,
        "alg": None,
        "pub": None,
        "sig": None,
        "note": "UNSIGNED slot. Bots never sign. Rizal signs later with his owner key.",
    }
    sig_path = fonts / "rfont-feed.json.sig.json"
    bak(sig_path)
    sig_path.write_text(json.dumps(sig, indent=2) + "\n", encoding="utf-8")

    css_path = site / "rfont.css"
    bak(css_path)
    css_path.write_text(render_css(feed), encoding="utf-8")

    extra = [
        "/rfont.css",
        "/rfont-auto.js",
        "/fonts/rfont-feed.json",
        "/fonts/rfont-feed.json.sig.json",
        f"/fonts/{folder}/RIZAL-Regular.woff2",
        f"/fonts/{folder}/RIZAL-Regular.ttf",
        f"/fonts/{folder}/SHA256SUMS",
    ]
    swv = None
    if bump_sw_flag:
        swv = bump_sw(site, feed, extra)

    print(
        f"RFONT feed {info['version']} → {dest_dir} "
        f"(ttf {ttf_sha[:16]}… woff2 {sha256(dest_woff)[:16]}… "
        f"new_files={wrote_new} swv={swv})"
    )
    return feed


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--site", type=Path, default=None, help="Site root (default: parent of tools/)")
    ap.add_argument("--ttf", type=Path, default=None, help="RFONT TTF to publish")
    ap.add_argument("--no-sw-bump", action="store_true", help="Do not touch sw.js / sw-precache.json")
    args = ap.parse_args(argv)
    site = (args.site or Path(__file__).resolve().parent.parent).resolve()
    ttf = find_ttf(site, str(args.ttf) if args.ttf else None)
    publish(site, ttf, bump_sw_flag=not args.no_sw_bump)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
