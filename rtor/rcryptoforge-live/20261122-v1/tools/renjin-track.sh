#!/usr/bin/env bash
# renjin-track — RENJIN LIVE TRACK for Linux (the RCRYPTOFORGE growth clock, in a terminal)
# Re-reads the published sources live, exactly like the Forge page:
#   repo tree + last commit   api.github.com/repos/RIZALEON/RENJIN-CRYPTOBOT-AI
#   corpus + build log        raw.githubusercontent.com (renjin-complete-build)
#   GHOSTCHAIN export + sums  rizal.pw/rtrackr/data/  (sha256 vs published sums, linkage walk)
#   RTOR feed                 rizal.pw/rtor/feed.json
# Usage: renjin-track.sh [--watch [seconds]] [--json]
# Needs: curl, python3. Read-only: fetches and verifies; writes nothing, signs nothing.
set -u
REPO_API="https://api.github.com/repos/RIZALEON/RENJIN-CRYPTOBOT-AI"
RAW="https://raw.githubusercontent.com/RIZALEON/RENJIN-CRYPTOBOT-AI/main"
MODE="once"; INTERVAL=60; OUT="text"
for a in "$@"; do
  case "$a" in
    --watch) MODE="watch" ;;
    --watch=*) MODE="watch"; INTERVAL="${a#--watch=}" ;;
    --json) OUT="json" ;;
    -h|--help) grep '^#' "$0" | head -12; exit 0 ;;
  esac
done

run_once() {
  local T; T="$(mktemp -d)"
  curl -s --max-time 60 "$REPO_API/git/trees/main?recursive=1" -o "$T/tree.json" 2>/dev/null
  curl -s --max-time 30 "$REPO_API/commits?per_page=1"        -o "$T/commits.json" 2>/dev/null
  curl -s --max-time 30 "$RAW/renjin-complete-build/renjin/src/corpus-v2.txt"            -o "$T/corpus.txt" 2>/dev/null
  curl -s --max-time 30 "$RAW/renjin-complete-build/renjin/build-log-v3-persist.txt"      -o "$T/log.txt" 2>/dev/null
  curl -s --max-time 90 "https://rizal.pw/rtrackr/data/rghostchain.json" -o "$T/chain.json" 2>/dev/null
  curl -s --max-time 30 "https://rizal.pw/rtrackr/data/SHA256SUMS"       -o "$T/sums.txt" 2>/dev/null
  curl -s --max-time 30 "https://rizal.pw/rtor/feed.json"                 -o "$T/feed.json" 2>/dev/null
  OUT="$OUT" T="$T" python3 - <<'PYEOF'
import json, os, re, hashlib, sys
T, OUT = os.environ["T"], os.environ.get("OUT","text")
def load(name):
    p = os.path.join(T, name)
    try:
        with open(p, "rb") as f: return f.read()
    except Exception: return b""
def jload(name):
    try: return json.loads(load(name).decode("utf-8", "replace"))
    except Exception: return None

r = {"sources_live": 0, "sources_total": 5}

tree = jload("tree.json")
if tree and "tree" in tree:
    blobs = [t for t in tree["tree"] if t.get("type") == "blob"]
    by = {t["path"]: t.get("size", 0) for t in blobs}
    r["repo_files"] = len(blobs)
    r["repo_mb"] = round(sum(by.values()) / 1e6, 2)
    r["shell_bytes"] = by.get("renjin-complete-build/rshell/RSHELL-RENJIN.html")
    r["min_bytes"] = by.get("renjin-complete-build/rshell/RSHELL-RENJIN-MIN.html")
    r["store_bytes"] = by.get("renjin-complete-build/renjin/src/store-v3.json")
    r["sources_live"] += 1

commits = jload("commits.json")
if commits:
    try:
        r["last_push"] = commits[0]["commit"]["committer"]["date"]
        r["last_sha"] = commits[0]["sha"][:8]
        r["sources_live"] += 1
    except Exception: pass

corpus = load("corpus.txt").decode("utf-8", "replace")
log = load("log.txt").decode("utf-8", "replace")
if corpus:
    r["lessons"] = sum(1 for l in corpus.split("\n") if l.strip() and not l.strip().startswith("#"))
    m = re.search(r'"held_out":\s*([0-9.]+)', log);  r["held_out"] = float(m.group(1)) if m else None
    m = re.search(r'"loss_after":\s*([0-9.]+)', log); r["train_loss"] = float(m.group(1)) if m else None
    m = re.search(r'"steps":\s*(\d+)', log);          r["steps"] = int(m.group(1)) if m else None
    m = re.search(r'"loss":\s*([0-9.]+),\s*"chain_entries"', log); r["model_loss"] = float(m.group(1)) if m else None
    r["sources_live"] += 1

chain_raw = load("chain.json")
sums = load("sums.txt").decode("utf-8", "replace")
chain = jload("chain.json")
if chain_raw and chain:
    sha = hashlib.sha256(chain_raw).hexdigest()
    pinned = None
    for line in sums.split("\n"):
        if line.strip().endswith("rghostchain.json"):
            pinned = line.strip().split()[0]
    blocks = chain.get("blocks", [])
    link = all(blocks[i].get("prev_hash") == blocks[i-1].get("hash") for i in range(1, len(blocks)))
    r["chain_height"] = chain.get("height")
    r["chain_blocks"] = len(blocks)
    r["chain_tip"] = (chain.get("tip") or "")[:16]
    r["chain_exported_at"] = chain.get("exported_at")
    r["chain_sha256"] = sha
    r["chain_sha_match"] = (pinned is not None and sha == pinned)
    r["chain_linkage_ok"] = link
    r["chain_verify_ok"] = bool(chain.get("verify", {}).get("ok")) and link and r["chain_sha_match"]
    r["chain_assets"] = len(chain.get("assets", []))
    if r["chain_sha_match"]: r["sources_live"] += 1

feed = jload("feed.json")
if feed:
    r["feed_version"] = feed.get("version")
    r["feed_entries"] = len(feed.get("entries", []))
    r["feed_signed"] = feed.get("signed")
    r["sources_live"] += 1

if OUT == "json":
    print(json.dumps(r, indent=1)); sys.exit(0)

def g(k, dash="—"): 
    v = r.get(k); return dash if v is None else v
def kb(n): return "—" if n is None else f"{int(n/1000):,} KB"
print("=" * 68)
print("RENJIN LIVE TRACK — RCRYPTOFORGE growth clock (Linux)")
print("=" * 68)
print(f"MODEL     Core v3 · egg 0.1.11 · 49,152 ternary weights · tok.v1 (313)")
print(f"CORPUS    {g('lessons')} lessons (corpus-v2, counted live)")
print(f"LOSS      held-out {g('held_out')} · train {g('train_loss')} · {g('steps')} steps · model {g('model_loss')}")
print(f"REPO      {g('repo_files')} files · {g('repo_mb')} MB (working tree, live)")
print(f"LAST PUSH {g('last_push')} · {g('last_sha')}")
print(f"SHELL     RSHELL-RENJIN {kb(r.get('shell_bytes'))} · MIN {kb(r.get('min_bytes'))}")
print(f"STORE     store-v3.json {kb(r.get('store_bytes'))} · persistent, hash-verified")
cv = "✓ VERIFIED" if r.get("chain_verify_ok") else "✗ CHECK FAILED"
print(f"CHAIN     height {g('chain_height')} · {g('chain_blocks')} blocks · {g('chain_assets')} assets · tip {g('chain_tip')}…")
print(f"          sha256 {str(g('chain_sha256'))[:16]}… · sums {'match' if r.get('chain_sha_match') else 'MISMATCH'} · linkage {'OK' if r.get('chain_linkage_ok') else 'BROKEN'} · {cv}")
print(f"          exported {g('chain_exported_at')}")
sg = "true" if r.get("feed_signed") else "false — owner signing pass pending"
print(f"RTOR      feed {g('feed_version')} · {g('feed_entries')} entries · signed: {sg}")
print(f"SOURCES   {r['sources_live']}/{r['sources_total']} live")
PYEOF
  rm -rf "$T"
}

if [ "$MODE" = "watch" ]; then
  while true; do
    clear 2>/dev/null || true
    run_once
    echo
    echo "— re-checking every ${INTERVAL}s · Ctrl-C to stop —"
    sleep "$INTERVAL"
  done
else
  run_once
fi
