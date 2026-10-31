#!/usr/bin/env python3
"""RTRACKR export v1 (20261030). Read-only: REAL chain + registry -> rtrackr-export/rghostchain.json + SHA256SUMS.
Never reads key material. Usage: python3 rtrackr_export.py [--site /path/to/rizal.pw]"""
import json, os, re, sys, hashlib, shutil, datetime
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # .../RGHOSTCHAIN
CHAIN = os.path.join(ROOT, "chain", "rghostchain.jsonl")
REG = os.path.join(ROOT, "rtrackr", "registry.json")
OUT = os.path.join(ROOT, "rtrackr-export")
BAD = re.compile(r"pass|secret|private|seed|mnemonic|apikey|api_key|keychain", re.I)
def strip(o, path="", hits=None):
    if isinstance(o, dict):
        r = {}
        for k, v in o.items():
            if BAD.search(str(k)): hits.append(path + "/" + k); continue
            r[k] = strip(v, path + "/" + k, hits)
        return r
    if isinstance(o, list): return [strip(v, path, hits) for v in o]
    return o
def main():
    if "DRY" in CHAIN.upper(): sys.exit("refusing: not the real chain")
    sys.path.insert(0, ROOT)
    verify = {"ok": False, "errors": ["verify not run"]}
    try:
        import rghostchain as rc
        fn = getattr(rc, "verify", None) or getattr(rc, "verify_chain")
        try: res = fn(CHAIN)
        except TypeError: res = fn()
        if isinstance(res, dict): verify = res
        elif isinstance(res, tuple): verify = {"ok": bool(res[0]), "errors": list(res[1]) if len(res) > 1 and isinstance(res[1], (list, tuple)) else ([] if res[0] else [str(res[1:])])}
        else: verify = {"ok": bool(res), "errors": []}
    except Exception as e:
        verify = {"ok": False, "errors": ["verify error: %s" % e]}
    hits = []
    raw = [json.loads(l) for l in open(CHAIN, encoding="utf-8") if l.strip()]
    blocks = []
    for i, b in enumerate(raw):
        b = strip(b, "/block%d" % i, hits)
        blocks.append({"index": b.get("index", b.get("height", i)), "hash": b.get("hash", ""), "prev_hash": b.get("prev_hash", b.get("prev", "")),
                       "ts": b.get("ts", b.get("timestamp", "")), "type": b.get("type", b.get("kind", "")),
                       "payload": b.get("payload", b.get("data", {k: v for k, v in b.items() if k not in ("index", "height", "hash", "prev_hash", "ts", "type")}))})
    reg = strip(json.load(open(REG, encoding="utf-8")), "/registry", hits) if os.path.exists(REG) else {}
    ents = reg.get("entries", reg.get("assets", reg)) if isinstance(reg, dict) else reg
    if isinstance(ents, dict): ents = [dict(v, asset_id=v.get("asset_id", k)) if isinstance(v, dict) else {"asset_id": k, "status": v} for k, v in ents.items()]
    hashes = {b["hash"] for b in blocks}
    assets = []
    for e in ents or []:
        if not isinstance(e, dict) or str(e.get("status", "")).lower() != "live" or e.get("dry"): continue
        bh = (e.get("block") or {}).get("hash") if isinstance(e.get("block"), dict) else e.get("block_hash")
        if bh and bh not in hashes: continue  # only entries backed by the real chain
        assets.append(e)
    now = datetime.datetime.now().astimezone().isoformat(timespec="seconds")
    doc = {"schema": "rzl.rtrackr.export.v1", "pending": False, "exported_at": now, "chain": "RGHOSTCHAIN (local, not public)",
           "source": "GHOSTMACHINE/RGHOSTCHAIN/chain/rghostchain.jsonl", "verify": verify, "height": len(blocks) - 1,
           "tip": blocks[-1]["hash"] if blocks else None, "blocks": blocks, "assets": assets, "stripped_keys": hits}
    os.makedirs(OUT, exist_ok=True)
    p = os.path.join(OUT, "rghostchain.json")
    data = json.dumps(doc, ensure_ascii=False, indent=1).encode()
    open(p, "wb").write(data)
    s = hashlib.sha256(data).hexdigest()
    open(os.path.join(OUT, "SHA256SUMS"), "w").write("%s  rghostchain.json\n" % s)
    print("blocks", len(blocks), "assets", len(assets), "verify", verify.get("ok"), "stripped", len(hits), "sha256", s)
    if "--site" in sys.argv:
        d = os.path.join(os.path.expanduser(sys.argv[sys.argv.index("--site") + 1]), "rtrackr", "data")
        os.makedirs(d, exist_ok=True)
        for f in ("rghostchain.json", "SHA256SUMS"): shutil.copy2(os.path.join(OUT, f), d)
        print("copied to", d)
if __name__ == "__main__": main()
