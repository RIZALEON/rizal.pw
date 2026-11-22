# THE TOE SYSTEM — FULL SUMMARY & INSTRUCTIONAL
## RMAIL · RTOR · TERAFORMR · RWALLET · RTRACKR · ASSM — one living system on the GHOSTCHAIN

Written 2026-11-22, from the verified record. Figures are as of this date;
anything reported from Neo-side sessions and not verified from here is
marked REPORTED.

---

## 1 · WHAT THE TOE SYSTEM IS

The TOE system is the whole RZL organism working as one body, built
hub-to-hub: **every device and every site is a hub — and the living
GHOSTCHAIN itself is a hub**, not a passive file underneath. Six systems
(RMAIL, RTOR, TERAFORMR, RWALLET, RTRACKR, ASSM) read and write through
the chain-hub and ride one shared transport, RTOR. Every hub carries the
full picture, serves it, verifies it the same way (hash against the
published checksums) and relays it onward — so the system can update,
deliver, diagnose and repair itself continuously from any hub, online or
offline, and every hub converges on the same truth.

The seats a person actually touches:
- **GHOSTMACHINE** — the gated console (one ASSM login) where the site,
  RMAIL, RWALLET and TERAFORMR run framed together.
- **R Shell** — the command seat (R:\>), the RBOTLoadR base of the pure
  RZL operating system.
- **The two domains** — rizal.info and frankensteinrizal.unstoppable,
  both hubs in their own right, linking with the live RTOR GhostChain —
  neither is the other's source (the Three-Layer Model).

## 2 · THE BACKBONE — THE LIVING GHOSTCHAIN (RGHOSTCHAIN)

- **State (verified 2026-11-20 export, still current 2026-11-22):**
  height 5 · 6 blocks · 7 assets · tip
  `4006b570883c31aff44891971dd1935a3a58a822293f919ace27e59d8cf0bb5b` ·
  export 6,956,800 B, sha256 `d55fcd36b299726b…`, exported
  2026-11-20T14:43:28-07:00 · average block interval ≈ 1 block / 4.3 days.
- **The chain is a hub, not a vault:** every device and site links WITH
  it, reads it, carries it and serves it onward. Writes seal through
  RMINT on Neo — any hub can originate a command or request (a mint
  starts as a tap in a game on a phone), and RMINT is the one seal that
  commits it; the moment it seals, the chain-hub itself carries the
  result to every other hub. Origination is everywhere; sealing is
  singular; no hub is a dead end, and no hub is a single point of
  failure for carrying, serving or verifying.
- **Player mints write the real chain** (owner's amended law, 2026-11-19):
  a player's recorded command mints automatically — no per-mint signature,
  no Face ID. Rate: **100 RCOIN = 1 RTOKEN**, cap 100 RTOKEN/person/day.
  Proof on chain: Block 5 — `krog-test-mint-001`, minted by @krog via
  player-mint/1.1.0, holder @chaserizal, asset ЯID-3003-1RCQ, serial 3.
- **GHOSTKEY ring:** 6 members, all ACTIVE (moto-android, iphone-17e,
  macbook-neo, and the three RCODE seats); root ed25519 keyId
  `e5833fdfbbfe`. The ring's own sidecar signature is still pending the
  owner's signing pass — the signatures are the owner's act alone; bots
  never sign.
- **Trust rule for the whole system:** a chain state is believed only when
  its sha256 matches the published SHA256SUMS. Until the signing pass,
  hash cross-check stands in for the signature everywhere.

## 3 · THE ORGANS

### RTOR — transport & distribution
- The feed (`rizal.pw/rtor/feed.json`) — 31 entries, the system's table of
  contents: every published thing (sites, eggs, updates, the chain entry)
  is named here with its hash. Feed itself is `signed: false`, chain entry
  `pending-owner-signature` until the signing pass.
- The webseed — seeding continuously since 2026-11-18 23:31 MST
  (Webseed :8977, WebTorrent :8978), torrent infohash
  `8dfd6869850e5aea29e70dc657201afd5cdee09d`. The leech side REFUSES the
  chain entry until it verifies — unverified chain data is never served.
- The ASSM peer mesh (port 4985) — hub-to-hub: Neo⇄Pixel and Neo⇄Moto
  flowing, SHA-verified both ways; the 17e joins by the same door. The
  mobile devices (17e, Moto, Pixel Ubuntu Touch) are the MAIN relays
  (owner's ruling) — each one a full hub: it carries, serves, verifies
  and relays; it does not merely receive.
- **Resync is RTOR's heartbeat:** on reconnect, a copy re-reads the feed,
  re-reads the chain, flushes its outbox. Offline copies keep working and
  catch up when signal returns — the owner's offline-always law.
- RMAGNET is RTOR's address book: every deliverable also carries a magnet
  identity, so any RTOR version can fetch it by hash alone.

### RTRACKR — the chain's public face & verification seat
- Read-only published view at `rizal.pw/rtrackr`: the live export, the
  asset registry, and `rtrackr/data/SHA256SUMS` — the checksum seat every
  other part verifies against.
- It is the Layer 2 source in the Three-Layer Model: any copy of the site,
  anywhere, can fetch the fresh export from RTRACKR and verify it by hash
  before believing it.
- A daily watcher (09:30 MST) re-downloads the export and compares hash,
  height and date: a new export raises "refresh the model's chain seat";
  an export 14+ days old raises "republish from Neo". Silence means the
  chain seat is current.

### ASSM — identity & the one login
- The vault (`rsite-auth.vault.v1`): PBKDF2-SHA256, 600,000 iterations;
  the login's Ed25519 signature verifies TRUE against the pinned public
  key. **The password is never saved, logged or sent** — only a
  verified-login record is kept on-device (owner's ASSM law).
- Trusted-devices registry: 7 devices, 3 HARD (Moto, iPhone 17e, Neo).
- On verified sign-in, ASSM hands the framed site its owner session
  (`RMINT_SESSION`): that single act is what unlocks the owner's RMAIL,
  RWALLET and photo seats inside GHOSTMACHINE. Sign-out clears only the
  session keys; the verified record stays.
- Every system carries an RID (owner's all-systems law); ASSM is where
  identity and RID meet — the wallet header itself reads
  "@chaserizal · ЯID-0001-3QQS".

### RMAIL — mail that rides the wallet and the mesh
- RMAIL is the site's own in-tree module — not bolted on. Its address is
  the wallet: From `BwpVNk1Rtncpv5HMTLwxB4YfjKfv6mFaBQUTpjneH1F9`
  (the Crown/RWALLET address); you write to a wallet address or an
  @handle.
- Folders: Inbox (~148 messages live) · Outbox · Sent · ✓ Verified ·
  Guest. Messages carry trust badges (verified / unverified / guest)
  from the ASSM layer — you can see *who the system believes sent it*.
- Delivery is RTOR-shaped: compose anywhere, and if the route isn't
  reachable the message **queues in the Outbox and is counted honestly**,
  never marked sent. On resync it flushes. In the framed copy today the
  queue is real and the count is shown in the R⚡️tor line's sync segment.
- One button, one function (owner's law): every mail seat in the
  interface — nav icon, profile Message button, the wallet's ✉ badge —
  opens this same RMAIL.

### RWALLET — the wallet that requests, never signs
- Identity: ЯID-0001-3QQS · RGHOSTCHAIN R-address = the ЯID itself ·
  Solana-side address `BwpVNk1R…` shared with RMAIL.
- Cards: 1,000,000 Я genesis card · RCOIN balance card · Send/Receive ·
  BOTLATCH. Receive shows "RGHOSTCHAIN · R address ЯID-0001-3QQS".
- **Mint is request-only by design:** Я MINT stops at the trust gate
  ("no trust snapshot yet: connect once to any link") and produces an
  *unsigned* `rzl.casket.request.v1` preview. Sealing a request into a
  real mint is the owner's act, via RMINT on Neo — the wallet holds no
  keys and can sign nothing. This is the safety shape of the whole
  system: every seat can ask; only the owner + RMINT can commit.
- Its RTRACKR section reads the live chain (height, tip, assets) and
  verifies it against SHA256SUMS before display.
- R TOKEN on Solana (mint `BB9uA5BuacDnWyDf5Npc9nMb9yFbyThsNrQPBYJ5Q1Lv`)
  is **tracking only** — wallets are watch-only; Crown figure
  899,989 / 1,000,000 as of 2026-11-14.

### TERAFORMR (TerraformЯ) — the game that feeds the chain
- Current build: **0.5.1.21-b33-village-market** — Godot .pck,
  54,726,996 B, sha256 `706205e57c1d9e87f…` (verified on arrival).
  Actual b33 gameplay confirmed in the GHOSTMACHINE frame: RWALLET LIVE,
  Life 100/100, village biome, the ENTER BOTLATCH portal, ThundR
  companion awake.
- The game is an economic front-end of the chain: the MERKADO ledger
  trades at the same 100:1 pair (dry-run in the demo slice), and player
  mints that begin as gameplay commands land as real blocks through
  RMINT — Block 5's first automatic player mint is the proof of the
  whole circuit: game → command → RMINT → chain → RTRACKR → every copy.
- Distribution rides the same rails: the build travels in the RGENERATR
  fused pack across Neo, the 17e and the Moto, hash-matched on arrival.

## 4 · THE CONTINUOUS LOOP — UPDATE · DELIVER · DIAGNOSE · REPAIR

1. **UPDATE.** A change can start at ANY hub — a player mint begins as a
   command on a phone in TERAFORMR, a request begins in a wallet, a
   build is published from a site seat. The chain side of it seals
   through RMINT (the chain's one seal), the export and feed regenerate,
   and the chain-hub itself becomes the source every other hub pulls
   from. Origination is everywhere; sealing is singular; distribution
   is every hub's job.
2. **DELIVER.** RTOR carries it: the feed names it, the webseed serves
   it, the mesh gossips it. Every site copy — GHOSTMACHINE, rizal.info,
   frankensteinrizal.unstoppable — runs the **three-layer loader**
   (`rtrackr/ghostchain-loader.js`, seated in both packages 2026-11-22):
   Layer 1 the seated snapshot (offline truth) → Layer 2 the live
   RTRACKR fetch → Layer 3 the live RTOR GhostChain both domains link
   with. Any RTOR version can activate it (`RTOR_GHOSTCHAIN.activate()`);
   it also wakes on the window `online` resync signal.
3. **DIAGNOSE.** Health is always visible, never guessed: the R⚡️tor
   line shows site size · live build · chain speed · sync state
   (offline / syncing / synced + queued-mail count) from live sources
   only — a missing source shows "—", never an invented number. The
   daily export watcher and the 30-minute UD watch run in the
   background. The loader reports which layer it settled on and whether
   it verified.
4. **REPAIR.** The loop closes itself wherever it can: an unverified or
   stale layer is discarded and the next layer down serves instead
   (the page never breaks and the chain never blanks); a reconnect
   fires a resync pass; queued mail flushes; a package that drifts is
   rebuilt and re-verified by hash before it ships (every zip in this
   system carries a recorded sha256). What the loop cannot do is the
   owner's alone: sign (the signing packet sits prepared — feed payload
   re-cut to the live 31-entry feed, sha `9ae92fe4…`), and tap UD's
   buttons when UD itself is locked.

**Precedence rule (the whole diagnosis in one line):** freshest
*verified* wins; unverified is ignored; absent shows the seated truth
or a dash — never a guess.

## 5 · INSTRUCTIONAL — RUNNING IT

**Publish a chain update (Neo):** let RMINT write → regenerate the
export + feed → the watchers and loaders do the rest. The model's
chain seat (corpus, shell embed) refreshes on the owner's word only.

**Deliver a website update:** rebuild the package from the current
tree → record its sha256 → upload the files UNZIPPED via UD's Upload
Website Files (UD pins the tree; a zipped folder is a download, not a
website) or Link Website with the unpacked tree's CID → verify by
fetching the domain's hash and reading a file from inside it.

**Read the health:** GHOSTMACHINE's R⚡️tor line (build + chain speed +
sync state) · RTRACKR for the chain itself · the loader's settled layer
in any copy (`RTOR_GHOSTCHAIN.get()`).

**Symptom → diagnosis → repair:**
- *Chain view empty/stale* → the copy is on Layer 1 or offline →
  reconnect; resync re-reads feed + chain and promotes the verified
  newest. If every copy is stale, the export itself is old — republish
  from Neo.
- *Mail won't send* → no reachable route → it sits in the Outbox,
  counted. Restore signal; the resync flush carries it. Never re-send
  by hand — duplicates.
- *A copy shows a chain nobody else has* → it failed verification
  somewhere → trust SHA256SUMS, not the copy; re-seat from the verified
  export.
- *Domain serves a file listing* → the domain's hash is a wrapper
  folder → relaunch with the unpacked tree (see Deliver, above).
- *Mint won't complete* → the trust gate is doing its job → the request
  is an unsigned preview until the owner seals it; that step is his
  alone, by law.

## 6 · THE LAWS THE SYSTEM RUNS UNDER

- **ONE RULE:** never erase or remove a skill or memory.
- **HUB LAW:** every device and site is a hub — including the live
  GHOSTCHAIN itself. (Owner's ruling, 2026-11-22.)
- Authorization is the owner's recorded command. Face ID's necessity
  was removed; bots never sign.
- The GHOSTCHAIN is live, real and true.
- The RENJIN model stays pure .RZL, always. Every shell wears the
  starfield.
- Every system carries an RID; numbers issue from the owner's registry.
- The site functions always — offline included — and syncs back via
  RTOR when signal returns.
- One button, one function, wherever it appears.

## 7 · STATE TODAY (2026-11-22) & OPEN ITEMS

- Chain seat current (height 5 export, 1.8 days old at last watch).
- Three-layer magnetized loader seated in both standalone packages and
  execution-tested (live → Layer 3 verified; offline → Layer 1).
- frankensteinrizal.unstoppable: website LAUNCHED account-side with the
  newest build's contents — but as a wrapper folder (hash
  `QmXgK3Vp4j8y9bpay2…`). Relaunch with the unpacked tree is the one
  remaining step, waiting on UD's Pending Changes banner clearing;
  a 30-minute watch is on the public side.
- Signing packet prepared and current (feed payload matches the live
  31-entry feed); the signing pass itself is the owner's.
- Archive auto-populate is PAUSED at the owner's order (the loader
  pause self-lifts if the real tweets archive — 52 files, 10,137,382 B —
  is seated; basic form then totals 19,563,170 B, still under UD's cap).
