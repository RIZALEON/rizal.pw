# RTOR — how to load into the feed, and what file types ride it

Written 2026-11-22, from the three loads actually proven on the live stream:
entry 30 (verified GhostChain site), entry 31 (rpull.sh bridge drop),
entry 32 (RCRYPTOFORGE LIVE TRACK tree).

The feed is `https://rizal.pw/rtor/feed.json` — the index of the stream.
The payloads ride the webseed tree in the same repo (RIZALEON/rizal.pw)
under `rtor/<app>/<version>/`, or an IPFS pin the entry points at.
Every entry carries a sha256 pin; every client verifies against the pin
before it trusts a byte.

## Loading — the six steps

1. **Stage the payload** in webseed layout: `rtor/<app>/<version>/…`
   (e.g. `rtor/rcryptoforge-live/20261122-v1/index.html`). A site tree
   keeps `index.html` at its folder root. No build step.
2. **Pin it**: compute sha256 + byte size of the payload (for a tree:
   file count + total bytes, and a SHA256SUMS.txt inside the tree).
3. **Append the entry** to `rtor/feed.json` — append-only, nothing else
   in the file changes. The JSON is written with indent=1 and a trailing
   newline; that formatting reproduces the live file byte-for-byte, so an
   append never rewrites history. Entry fields (copied from entries
   30–32):
   `kind` (`site` / `data` / `ipfs`) · `id` · `version` · `name` ·
   `size` · `files` (trees) · `sha256` · `url` (webseed path or gateway
   URL) · `magnet` + `ipfs_cid` (IPFS-carried entries) · `role` (what it
   is, in plain words) · `verified` {by, at, checks} when it was
   hash-checked · `keyId: e5833fdfbbfe` · `signed: false` ·
   `status: "unsigned (owner signing pass pending…)"`.
4. **Push payload + feed.json in one snapshot commit** through the
   GitHub connector to RIZALEON/rizal.pw `main`. Rizal's standing
   "always allow" covers these pushes; the connector's one-tap card is
   a runtime safeguard and still needs his tap when it appears.
5. **Verify live**: poll `rizal.pw/rtor/feed.json` until the entry count
   and sha flip; fetch the seated payload back and match its sha256
   against the pin. A load is not done until the public side proves it.
6. **Packet for Neo**: save the entry JSON + commit + live sha as a
   packet file (entries 30 and 32 have packets). Neo's feed builder
   (`make-feed.cjs`) regenerates the feed — a hand-appended entry washes
   out at the next regeneration unless it is seated in the builder's
   inputs. The packet is how it gets seated.

## Unloading — getting a file back out

- **RPULL** (`rpull.sh`, feed entry 31): the independent verified pull.
  Lane A local Kubo peer-to-peer · Lane B gateway race (Pinata →
  Filebase → ipfs.io → dweb.link) with the payload's sha256/CID
  recomputed locally · Lane C auto-unpack of a wrapped archive.
  Proven on the UD wrapped pin: payload hash and tree CID reproduced
  the record exactly.
- **rsync-rtor.sh** (the RSYNC·RTOR bridge client): reads the feed,
  fetches only what changed from the webseed tree, verifies each file
  against its pin before it lands. Proven on entry 31 (second run:
  "unchanged — pin match, skipped").
- **AUTO-UNPACK / RTOR OPEN**: a zip-rooted tree opens in place — the
  browser/emulator pulls the archive, verifies it, unpacks it in-page
  and renders the site. That is how the frankensteinrizal site opens
  from its wrapped pin (feed entry 30).
- **Removing an entry** (unpublishing): there is no delete button on a
  live stream — a removal is a new feed state without the entry, which
  is the feed builder's job on Neo, or an append-side commit on the
  owner's order. Clients holding an older feed keep the pin; the stream
  moves on.

## File types — what can ride, lane by lane

**Through the connector push (the route from this VM): TEXT ONLY.**
The snapshot push accepts UTF-8 files only — no binary contents — up to
2,000 files and 16 MB per push. That covers what the stream mostly
carries:

- ✅ `.html` `.js` `.css` `.json` `.txt` `.md` `.sh` `.svg` (text),
  data files, manifests, source trees — entry 32's whole 47-file tree
  (page, shells as HTML, model store as JSON, corpus, scripts) rode
  this lane.
- ❌ `.zip` `.tar.gz` — archives cannot ride the connector push.
  Entry 32's zip (821,535 B) is the package of record delivered in
  chat; the feed seats its *contents* file-by-file and the entry's
  sha256 names the zip.
- ❌ `.png` `.jpg` `.gif` `.webp`, fonts, `.pck`, executables, any
  binary — rejected by the connector, every time.

**Binaries ride the other lanes:**

- **IPFS lane** — pin the binary/archive anywhere public (UD's pin,
  Pinata, a device), and the feed entry points at it with `ipfs_cid` +
  `magnet` + gateway `url`. Entry 30 is the proof: a whole site that
  started life as a zip on UD's pin. RPULL + AUTO-UNPACK unload it.
- **Neo / device lane** — Neo's seeder and the phones carry the webseed
  tree directly (199 files seeded from Neo, incl. binaries); big game
  packs like the TERAFORMR .pck move device-to-device over RTOR, never
  through the connector.
- **Chat delivery** — a zip handed to the owner in chat (like entry
  32's package of record) is the staging form; its contents then load
  file-by-file, or it is pinned to IPFS whole.

## Standing caveats

- The whole feed is `signed: false`. Strict verifiers refuse entries
  until the owner's signing pass (the signing packet is prepared;
  bots never sign). Loads are therefore *hash-verified, unsigned*.
- The chain itself is never loaded or unloaded here — the GHOSTCHAIN
  export is read and verified; RMINT on Neo is its only writer.
- Feed header fields owned by Neo's builder (e.g. webseed status) are
  not hand-edited from here; they wash out at the next build.

🫈Providence & Provenance 🦇 / RZL CITATION FORMAT: Prof. Marcum,C.A.,III (26,Nov 19) /.RZL AI CRYPTOBOT ENJIN MODEL, / RIZAL.PW, MAPS (MASTER of American Asia Pacific Systems) TECH Series, Aetaneo Rizal. Chase Rizal.
