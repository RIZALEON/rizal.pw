# RCRYPTOFORGE — LIVE TRACK · downloadable edition (2026-11-22)

A remake of the RCRYPTOFORGE growth clock as a single downloadable folder —
the live stats page, the current shell, the RENJIN model source, and a Linux
tracker tool, in one tree that can be served, opened from disk, or loaded
into RTOR.

## What's inside

- `index.html` — the LIVE TRACK page. Re-reads the published sources every
  60 seconds, exactly like the Forge: corpus + build log + repo tree from
  GitHub (RIZALEON/RENJIN-CRYPTOBOT-AI), the GHOSTCHAIN export from RTRACKR
  (sha256 checked in-page against RTRACKR's published SHA256SUMS, block
  linkage walked in-page), and the RTOR feed. If a source is unreachable,
  the last verified figure stays up and its dot turns amber — no invented
  numbers.
- `shell/RSHELL-RENJIN.html` — the most recent shell (753,708 B), and
  `shell/RSHELL-RENJIN-MIN.html` — the minimized build (706,318 B).
  Both byte-identical to GitHub `main` (verified by hash 2026-11-22:
  store-v3.json, yaseed-core-v3.js, corpus-v2.txt and both shells match
  the repo blob-for-blob). The page's "01 Try the R:\> Shell" section runs
  this very file.
- `renjin/` — the RENJIN model source seat (Core v3 engine, store-v3.json
  549,222 B, corpus-v1/v2, builders, tests, LIVE-STATS.md, RZL format doc).
- `tools/renjin-track.sh` — the same growth clock as a live Linux tool.
- `SHA256SUMS.txt` — sha256 of every file in this tree.

## Run the page

Unzip anywhere and open `index.html` in a browser, or serve the folder
(any static host). It works offline for the shell; the track figures need
network to refresh and otherwise show the baked 2026-11-22 snapshot.

## Load it into RTOR

The tree is RTOR-shaped as it stands: `index.html` at the root, no build
step. Drop the unzipped folder into the webseed tree as
`rtor/rcryptoforge-live/20261122-v1/` (or seed the zip itself — the RZL
AUTO-UNPACK route opens a zip-rooted tree directly), and it rides the same
stream as the UD file and the rizal.info RTOR file: every copy keeps
re-reading the live chain, so an RTOR update anywhere is reflected on
every seat within a minute. Seating it as a numbered entry in the live
feed at rizal.pw/rtor/feed.json is a publish step on the owner's GO,
the same as feed entries 30 and 31.

## Run the Linux tool

```sh
tools/renjin-track.sh            # one live board, then exit
tools/renjin-track.sh --watch    # refresh every 60s (or --watch=30)
tools/renjin-track.sh --json     # machine-readable
```

Needs `curl` and `python3`. Read-only: it fetches and verifies, writes
nothing, signs nothing. Note: the GitHub commits API is rate-limited for
unauthenticated callers (60/hour per IP) — when limited, LAST PUSH shows
"—" and the board reports 4/5 sources; everything else is unaffected.

## Sources (all public, all read live)

- `api.github.com/repos/RIZALEON/RENJIN-CRYPTOBOT-AI` — repo tree + commits
- `raw.githubusercontent.com/RIZALEON/RENJIN-CRYPTOBOT-AI/main/…` — corpus, build log
- `rizal.pw/rtrackr/data/rghostchain.json` + `…/SHA256SUMS` — the living GHOSTCHAIN export
- `rizal.pw/rtor/feed.json` — the RTOR feed

The GHOSTCHAIN is live, real and true. This package verifies its published
export; it never writes the chain. RMINT on Neo is the only chain writer,
and signing is the owner's act alone.

🫈Providence & Provenance 🦇 / RZL CITATION FORMAT: Prof. Marcum,C.A.,III (26,Nov 19) /.RZL AI CRYPTOBOT ENJIN MODEL, / RIZAL.PW, MAPS (MASTER of American Asia Pacific Systems) TECH Series, Aetaneo Rizal. Chase Rizal.
