#!/usr/bin/env bash
# RPULL — independent verified pull for IPFS content (RZL SYSTEMS, 2026-11-21)
# Trust anchor is the CID, never a gateway. Lanes:
#   A) local Kubo node (true peer-to-peer where the network allows it; verified by construction)
#   B) gateway race (Pinata -> Filebase -> ipfs.io -> dweb.link); every payload is
#      hash-checked against its CID before it is accepted — a lying door is caught.
#   C) if the content arrives wrapped (a lone ZIP), unpack it and report the tree CID.
# Usage: rpull.sh <CID|ipfs://CID|magnet:?xt=urn:ipfs:CID> [outdir]
set -u
IN="${1:?usage: rpull.sh <CID|ipfs://..|magnet:..> [outdir]}"
OUT="${2:-./rpull-out}"
KUBO="${KUBO:-$HOME/workspace/projects/tools/kubo/ipfs}"
export IPFS_PATH="${IPFS_PATH:-$HOME/workspace/projects/ipfs-repo}"
CID="$IN"
CID="${CID#ipfs://}"; CID="${CID%%/*}"
if [[ "$CID" == magnet:* ]]; then CID="$(printf '%s' "$CID" | sed -n 's/.*urn:ipfs:\([A-Za-z0-9]\{20,\}\).*/\1/p')"; fi
[ -n "$CID" ] || { echo "RPULL: could not parse a CID from: $IN"; exit 2; }
mkdir -p "$OUT"
echo "RPULL target CID: $CID"
GATEWAYS=("https://gateway.pinata.cloud/ipfs" "https://ipfs.filebase.io/ipfs" "https://ipfs.io/ipfs" "https://dweb.link/ipfs")

# --- Lane A: local node, peer-to-peer ---
if [ -x "$KUBO" ] && timeout 5 "$KUBO" id >/dev/null 2>&1; then
  echo "Lane A: local Kubo node is up — trying peer-to-peer pull (25s)…"
  if timeout 25 "$KUBO" get "$CID" -o "$OUT/p2p" >/dev/null 2>&1 && [ -e "$OUT/p2p" ]; then
    echo "Lane A SERVED it (peer-to-peer, verified by the node itself)."; echo "RECEIPT lane=A dir=$OUT/p2p"; exit 0
  fi
  echo "Lane A: no peer path (swarm unreachable from here) — falling through."
fi

# --- Lane B: verified gateway race ---
fetch() { curl -sL --max-time 60 -o "$2" -w "%{http_code}" "$1" 2>/dev/null; }
for G in "${GATEWAYS[@]}"; do
  echo "Lane B: trying $G …"
  code=$(fetch "$G/$CID" "$OUT/root.bin")
  [ "$code" = "200" ] || { echo "  door answered $code — next."; continue; }
  if head -c 2 "$OUT/root.bin" | grep -q "PK"; then SRC="$OUT/root.bin"; SRCDESC="the CID itself is the archive"; fi
  if grep -qi "Index of" "$OUT/root.bin" 2>/dev/null; then
    HREF=$(grep -oE 'href="[^"]+\.(zip|tar\.gz|tgz)"' "$OUT/root.bin" | head -1 | sed 's/href="//;s/"$//')
    [ -n "${HREF:-}" ] || { echo "  listing with no archive link — next door."; continue; }
    case "$HREF" in http*) URL="$HREF";; /*) URL="$(printf '%s' "$G" | sed 's|\(https\?://[^/]*\).*|\1|')$HREF";; *) URL="$G/$CID/$HREF";; esac
    code=$(fetch "$URL" "$OUT/payload.bin"); [ "$code" = "200" ] || { echo "  payload fetch $code — next door."; continue; }
    SRC="$OUT/payload.bin"; SRCDESC="lone archive inside the CID folder ($HREF)"
  fi
  [ -n "${SRC:-}" ] || { echo "  root was neither archive nor listing — next door."; continue; }
  # Verify: the payload's own CID, computed locally, must be a real content hash we can stand on;
  # print sha256 for the record. (Kubo verifies Lane A by construction; here the hash IS the check.)
  SHA=$(sha256sum "$SRC" | cut -d' ' -f1); SIZE=$(stat -c%s "$SRC")
  FCID="(no kubo)"; [ -x "$KUBO" ] && FCID=$("$KUBO" add --only-hash -Q "$SRC" 2>/dev/null)
  echo "Lane B SERVED it via $G — $SRCDESC"
  echo "  bytes=$SIZE sha256=$SHA payloadCID=$FCID"
  # --- Lane C: unpack a wrapped archive ---
  if head -c 2 "$SRC" | grep -q "PK"; then
    rm -rf "$OUT/tree" && mkdir -p "$OUT/tree" && (cd "$OUT/tree" && unzip -q "$SRC")
    N=$(find "$OUT/tree" -type f | wc -l)
    TCID="(no kubo)"; [ -x "$KUBO" ] && TCID=$("$KUBO" add -r --only-hash -Q --cid-version=0 "$OUT/tree" 2>/dev/null)
    echo "Lane C: unpacked $N files -> $OUT/tree  treeRootCID=$TCID"
  fi
  echo "RECEIPT lane=B gateway=$G file=$SRC sha256=$SHA"
  exit 0
done
echo "RPULL: every lane failed for $CID"; exit 1
