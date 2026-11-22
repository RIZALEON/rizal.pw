#!/usr/bin/env bash
# VERIFY.sh — verify this .rzl package, locally and against the live stream.
# Any person or AI system can run this: bash VERIFY.sh [--live]
#   local : every file in the package against SHA256SUMS.txt / manifest.json
#   --live: also re-checks the living systems — RTOR feed (rizal.pw/rtor/feed.json),
#           GHOSTCHAIN export vs RTRACKR's published SHA256SUMS + block linkage,
#           and the ghostkey ring pin. Read-only; needs curl + python3 for --live.
set -u
cd "$(dirname "$0")"
FAIL=0
echo "== LOCAL PACKAGE =="
if sha256sum -c SHA256SUMS.txt --quiet 2>/dev/null; then
  echo "PASS  all files match SHA256SUMS.txt ($(grep -c . SHA256SUMS.txt) files)"
else
  echo "FAIL  package contents differ from SHA256SUMS.txt"; sha256sum -c SHA256SUMS.txt 2>/dev/null | grep -v ': OK' | head; FAIL=1
fi
python3 - <<'PYEOF' || FAIL=1
import json, sys
m = json.load(open("manifest.json"))
assert m["format"] == ".rzl" and m["name"] == "GHOSTMACHINE-RTOR", "manifest identity"
assert m["assm"]["password_stored"] is False, "ASSM law: password must never be stored"
print(f"PASS  manifest: {m['name']} {m['version']} · owner {m['owner']} · parts listed: {len(m['parts'])}")
PYEOF
grep -q "e5833fdfbbfe" ghostkey/ghostkey.json && echo "PASS  RGHOSTKEY public ring present (keyId e5833fdfbbfe)" || { echo "FAIL  ghostkey ring missing/altered"; FAIL=1; }
PAYLOAD="ghostmachine rtor renjin ghostkey projects"
if grep -rq -- "-----BEGIN [A-Z ]*PRIVATE KEY-----" $PAYLOAD || grep -rqE '"(private_key|privateKey|secret_key|secretKey)"\s*:\s*"[^"]+"' --include="*.json" --include="*.js" $PAYLOAD ; then
  echo "FAIL  credential material detected in package payload (PEM block or assigned private-key field)"; FAIL=1
else
  echo "PASS  no private-key material in the package payload (no PEM blocks, no assigned private-key fields)"
fi

if [ "${1:-}" = "--live" ]; then
  echo "== LIVE STREAM =="
  T="$(mktemp -d)"
  curl -s --max-time 60 "https://rizal.pw/rtor/feed.json" -o "$T/feed.json" 2>/dev/null
  curl -s --max-time 90 "https://rizal.pw/rtrackr/data/rghostchain.json" -o "$T/chain.json" 2>/dev/null
  curl -s --max-time 30 "https://rizal.pw/rtrackr/data/SHA256SUMS" -o "$T/sums.txt" 2>/dev/null
  T="$T" python3 - <<'PYEOF'
import json, os, hashlib, sys
T = os.environ["T"]; bad = 0
try:
    feed = json.load(open(f"{T}/feed.json"))
    print(f"FEED   {len(feed['entries'])} entries · version {feed.get('version')} · signed: {feed.get('signed')} (owner signing pass pending)")
    ids = [e.get('id') for e in feed['entries']]
    print("FEED   entry 32 rcryptoforge-live-track:", "PRESENT" if 'rcryptoforge-live-track' in ids else "ABSENT")
except Exception:
    print("FEED   unreachable"); bad = 1
try:
    raw = open(f"{T}/chain.json", "rb").read()
    sha = hashlib.sha256(raw).hexdigest()
    pinned = None
    for line in open(f"{T}/sums.txt").read().split("\n"):
        if line.strip().endswith("rghostchain.json"): pinned = line.strip().split()[0]
    d = json.loads(raw)
    blocks = d.get("blocks", [])
    link = all(blocks[i].get("prev_hash") == blocks[i-1].get("hash") for i in range(1, len(blocks)))
    ok = (sha == pinned) and link and d.get("verify", {}).get("ok")
    print(f"CHAIN  height {d.get('height')} · tip {str(d.get('tip'))[:12]}… · sha256 vs published sums: {'match' if sha==pinned else 'MISMATCH'} · linkage: {'OK' if link else 'BROKEN'} · {'VERIFIED' if ok else 'CHECK FAILED'}")
    if not ok: bad = 1
except Exception:
    print("CHAIN  unreachable"); bad = 1
sys.exit(bad)
PYEOF
  [ $? -ne 0 ] && FAIL=1
  rm -rf "$T"
fi
echo "== RESULT: $([ $FAIL -eq 0 ] && echo ALL CHECKS PASSED || echo FAILURES ABOVE) =="
exit $FAIL
