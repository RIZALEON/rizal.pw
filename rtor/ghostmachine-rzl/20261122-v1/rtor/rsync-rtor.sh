#!/usr/bin/env bash
# RSYNC-RTOR — the RSYNC leg of the RTOR stream (RZL SYSTEMS, 2026-11-21)
# rsync semantics over the stream's own transport (HTTPS from the website
# endpoint, the feed's only public door): compare local files against the
# feed's sha256 pins, fetch ONLY what is missing or changed, verify every
# fetched byte against its pin before it lands. Unchanged = skipped.
# Usage: rsync-rtor.sh <entry-id|rtor-tree> [destdir] [feed-url]
set -u
ID="${1:?usage: rsync-rtor.sh <entry-id|rtor-tree> [destdir] [feed-url]}"
DEST="${2:-./rtor-sync}"
FEEDURL="${3:-https://rizal.pw/rtor/feed.json}"
HOST="https://rizal.pw"
mkdir -p "$DEST"
TMP="$(mktemp -d)"
curl -sL --max-time 60 -o "$TMP/feed.json" "$FEEDURL" || { echo "RSYNC-RTOR: cannot fetch feed $FEEDURL"; exit 1; }
python3 - "$TMP/feed.json" "$ID" > "$TMP/rows.tsv" <<'PY'
import json,sys
d=json.load(open(sys.argv[1])); want=sys.argv[2]
for e in d['entries']:
    url=e.get('url',''); sha=e.get('sha256')
    if not sha or not url: continue
    if want=='rtor-tree' and url.startswith('/rtor/'):
        print(f"{e['id']}\t{url}\t{sha}\t{e.get('size','')}")
    elif e['id']==want:
        print(f"{e['id']}\t{url}\t{sha}\t{e.get('size','')}")
PY
[ -s "$TMP/rows.tsv" ] || { echo "RSYNC-RTOR: no pinned entry matches '$ID'"; exit 1; }
FETCHED=0; SKIPPED=0; FAILED=0
while IFS=$'\t' read -r EID URL SHA SIZE; do
  REL="${URL#/}"; OUT="$DEST/$REL"
  mkdir -p "$(dirname "$OUT")"
  if [ -f "$OUT" ] && [ "$(sha256sum "$OUT" | cut -d' ' -f1)" = "$SHA" ]; then
    echo "  = $EID unchanged (pin match, skipped)"; SKIPPED=$((SKIPPED+1)); continue
  fi
  case "$URL" in http*) SRC="$URL";; *) SRC="$HOST$URL";; esac
  if curl -sL --max-time 120 -o "$OUT.tmp" "$SRC" && [ "$(sha256sum "$OUT.tmp" | cut -d' ' -f1)" = "$SHA" ]; then
    mv "$OUT.tmp" "$OUT"; echo "  ↓ $EID fetched + pin-verified (${SIZE} B)"; FETCHED=$((FETCHED+1))
  else
    rm -f "$OUT.tmp"; echo "  ✕ $EID FAILED (fetch or pin mismatch)"; FAILED=$((FAILED+1))
  fi
done < "$TMP/rows.tsv"
rm -rf "$TMP"
echo "RSYNC-RTOR done: $FETCHED fetched · $SKIPPED unchanged · $FAILED failed -> $DEST"
[ "$FAILED" = "0" ]
