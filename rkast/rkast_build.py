#!/usr/bin/env python3
"""rkast_build.py 1.0 · 20261114 (pt345u) · STAGED · builds the WEBSITE side of RKAST: /rkast/feed.json (an rsync.bundle.v1).
Inputs (read-only): <site>/rkast/notices.json (website-originated notices), <site>/ALL-APPCASTS.json (appcasts),
<site>/rtrackr/data/rghostchain.json checked against rtrackr/data/SHA256SUMS (live RGHOSTCHAIN blocks incl. cryptoupdate).
Output: <site>/rkast/feed.json + <site>/rkast/SHA256SUMS. Deterministic: same inputs -> same ids/bytes (no wall clock).
Runs anywhere with Python 3 (GitHub Actions, any device, the Neo is NOT required). Never signs, never touches keys, never
contacts a chain. --dry-assets <url|file> (local tests only) adds rtrackr.dry messages and REFUSES to write into <site>/rkast/feed.json.
Message ids match rkast-core.js message(): id = "rk-" + sha256(canon(entry without id))[:24]."""
import argparse, hashlib, json, os, sys, urllib.request

def canon(v):
    if isinstance(v, list): return "[" + ",".join(canon(x) for x in v) + "]"
    if isinstance(v, dict): return "{" + ",".join(json.dumps(k, ensure_ascii=False) + ":" + canon(v[k]) for k in sorted(v) if v[k] is not None) + "}"
    return json.dumps(v, ensure_ascii=False)

def msg(kind, title, text="", ref="", ts="", src="rizal.pw", dry=False, data=None):
    e = {"t": "rkast.msg", "kind": kind, "title": str(title)[:140], "text": str(text)[:2000], "ref": str(ref)[:300], "src": src[:60], "ts": str(ts)}
    if dry: e["dry"] = True
    if data: e["data"] = data
    e["id"] = "rk-" + hashlib.sha256(canon(e).encode()).hexdigest()[:24]
    return e

def sha(p): return hashlib.sha256(open(p, "rb").read()).hexdigest()

def rtrackr_messages(site, warn):
    d = os.path.join(site, "rtrackr", "data"); jp = os.path.join(d, "rghostchain.json"); sp = os.path.join(d, "SHA256SUMS")
    if not os.path.exists(jp): return [], None
    want = {}
    if os.path.exists(sp):
        for ln in open(sp, encoding="utf-8"):
            p = ln.split()
            if len(p) == 2: want[p[1]] = p[0]
    if want.get("rghostchain.json") != sha(jp):
        warn.append("rtrackr/data/rghostchain.json sha256 does not match SHA256SUMS: RTRACKR messages skipped"); return [], None
    doc = json.load(open(jp, encoding="utf-8")); out = []
    for b in doc.get("blocks", []):
        typ = str(b.get("type", "")); kind = "cryptoupdate" if typ == "cryptoupdate" else "rtrackr.block"
        p = b.get("payload") or {}
        label = p.get("label") or p.get("asset_name") or p.get("name") or p.get("version") or typ
        out.append(msg(kind, "RGHOSTCHAIN #%s · %s" % (b.get("index"), label), "%s block %s… on the real RGHOSTCHAIN (RTRACKR snapshot)." % (typ, str(b.get("hash", ""))[:12]),
                       "/rtrackr/#block/%s" % b.get("index"), b.get("ts", ""), data={"index": b.get("index"), "hash": b.get("hash"), "type": typ, "live": True}))
    return out, doc.get("exported_at")

def appcast_messages(site, as_of):
    p = os.path.join(site, "ALL-APPCASTS.json")
    if not os.path.exists(p): return []
    out = []
    for k, v in sorted(json.load(open(p, encoding="utf-8")).items()):
        if not isinstance(v, dict): continue
        h = hashlib.sha256(canon(v).encode()).hexdigest()
        out.append(msg("appcast", "%s · %s %s" % (v.get("product", k), v.get("platform", ""), v.get("lineVersion", "")), str(v.get("note", ""))[:300],
                       "/ALL-APPCASTS.json#" + k, as_of or "", data={"key": k, "signed": bool(v.get("signed")), "sha256": h}))
    return out

def notice_messages(site):
    p = os.path.join(site, "rkast", "notices.json")
    if not os.path.exists(p): return []
    return [msg("notice", n.get("title", ""), n.get("text", ""), n.get("ref", ""), n.get("ts", "")) for n in json.load(open(p, encoding="utf-8")).get("notices", [])]

def dry_messages(src):
    raw = urllib.request.urlopen(src, timeout=10).read() if src.startswith("http") else open(src, "rb").read()
    out = []
    for a in json.loads(raw).get("assets", []):
        if a.get("status") == "live" or a.get("on_chain"): continue
        out.append(msg("rtrackr.dry", "DRY · %s" % a.get("label", a.get("rid")), "DRY TEST record on a test chain. NOT minted, not on the real RGHOSTCHAIN.",
                       "/rtrackr/dry.html#rid/%s" % a.get("rid"), a.get("ts", ""), src="local-test", dry=True,
                       data={"rid": a.get("rid"), "block_index": a.get("block_index"), "block_hash": a.get("block_hash"), "status": "dry", "not_minted": True, "via": a.get("via")}))
    return out

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--site", default=os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")))
    ap.add_argument("--out"); ap.add_argument("--dry-assets"); ap.add_argument("--check", action="store_true", help="exit 1 if feed.json would change")
    o = ap.parse_args(); site = os.path.abspath(o.site); public = os.path.join(site, "rkast", "feed.json"); out = os.path.abspath(o.out or public)
    if o.dry_assets and out == public: sys.exit("refused: --dry-assets never writes the public feed; pass --out <test file>")
    warn = []; rt, exported = rtrackr_messages(site, warn)
    entries = notice_messages(site) + appcast_messages(site, exported) + rt + (dry_messages(o.dry_assets) if o.dry_assets else [])
    seen = set(); entries = [e for e in entries if not (e["id"] in seen or seen.add(e["id"]))]
    entries.sort(key=lambda e: (e["ts"], e["id"]))
    srcs = {r: sha(os.path.join(site, r)) for r in ("ALL-APPCASTS.json", "rtrackr/data/rghostchain.json", "rkast/notices.json") if os.path.exists(os.path.join(site, r))}
    b = {"format": "rsync.bundle.v1", "version": "rkast-1.0", "entries": entries,
         "rkast": {"schema": "rzl.rkast.feed.v1", "as_of": exported, "sources_sha256": srcs, "counts": {k: sum(1 for e in entries if e["kind"] == k) for k in sorted({e["kind"] for e in entries})},
                   "rule": "display only; own relays first; public Nostr backup only as RKRYPT-encrypted boxes", "dry_included": bool(o.dry_assets), "warnings": warn}}
    data = (json.dumps(b, ensure_ascii=False, indent=1) + "\n").encode()
    if o.check:
        cur = open(out, "rb").read() if os.path.exists(out) else b""
        print("unchanged" if cur == data else "changed"); sys.exit(0 if cur == data else 1)
    os.makedirs(os.path.dirname(out), exist_ok=True); tmp = out + ".tmp"; open(tmp, "wb").write(data); os.replace(tmp, out)
    if out == public: open(os.path.join(site, "rkast", "SHA256SUMS"), "w").write("%s  feed.json\n" % hashlib.sha256(data).hexdigest())
    print(json.dumps({"out": out, "entries": len(entries), "counts": b["rkast"]["counts"], "warnings": warn, "sha256": hashlib.sha256(data).hexdigest()}))

if __name__ == "__main__": main()
