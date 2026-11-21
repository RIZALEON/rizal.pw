# RTOR / RVM — Offline Crypto Mesh Network

Focus document, 2026-11-20. Built from the verified record: the ЯSEED
egg, the RTOR RSYNC device test, the 2026-11-20 all-bots handoff, and
the RKLOWD / GHOSTMACHINE / RCODE inventories. No new live run was
done from the Muse VM — the Neo went offline just after the handoff
was copied.

## The point

The mesh is not a brand, a label, or a mark. It is a set of nodes
identified by their keys, carrying signed payloads, verified
fail-closed. A node is what its key and its chain say it is — not
what its app icon, its store name, or its device label says.

That is what "transverses beyond labels and marks" means here:
RTOR / RVM moves a signed update, a signed entry, or a signed app
across Neo, 17e, Moto, rizal.pw, rizal.info, and RMAIL — and a node
accepts it only if the signature, the size, and the key check out.
Anything else is refused.

## Layers

1. **RVM — the execution layer, offline.** Deterministic stack-bytecode
   VM, pure JS, no eval, own filesystem, job queue, caps, snapshots /
   rollback, fuel bound. Hosts: rbowzr / ybot, macOS / iOS / iPadOS.
   Optional Linux guest (TinyEMU RISC-V64 BusyBox) is a guest, not the
   device. No host shell — `host.exec` and `xcode.build` are forbidden
   in the ЯVM.
2. **Ghost Chain — the record layer.** Append-only SHA-256 hash chain,
   signed by the install's own WebCrypto ECDSA P-256 device key.
   Entry format `rzl.ghostchain.entry.v1`. No block was minted in the
   Nov 20 GO — block 5 is still open, and needs a dedicated GO.
3. **ЯMINT / Rghostchain — the ledger layer.** Local signed ledger on
   the Ghost Chain only. No public blockchain, no real money, no
   exchange, no transfer off-device, no network. R Token unit is R,
   never RDG.
4. **RTOR — the signed-update layer.** "RTOR is the signed-update
   system. Its feed carries the fleet appcasts and the RTRACKR data
   itself. RTOR verify is fail-closed: unsigned, tampered, wrong key
   or wrong size means refused." Feed `https://rizal.pw/rtor/feed.json`,
   version 20261118-5, 28 entries, sha256
   `f54159f9141b5ec9e4e7db00ed3159430166465ca5fbacfe041e3995e58db402`.
   Peer `https://rizal.info/rtor/feed.json` caught up today via PR #25,
   same sha, 28 entries. The top-level `status` string is still the
   stale "PENDING: no owner signatures published yet" text — open item.
5. **RSYNC / ЯSYNC — the entry layer.** Append-only signed entries.
   Fresh entry 2026-11-20 10:09 AM MT, `rsync-20261120-linktest-go-pt59u`,
   on rizal.pw via PR #72, authorized by owner command "Go" — NOT a
   cryptographic signature. The relay's 20 older entries (2026-10-26)
   are 20/20 signed and sealed, but carry no `prev_hash`, so hash-chain
   continuity cannot be verified from that file.
6. **RKLOWD / RNET-MESH / RPIPE — the transport layer.** Store-and-
   forward nodes for Neo, 17e, Moto, pw, rmail, BRIDGE-LANDING,
   SCRIBE-MASTER. Queues are `drop/` / `inbox/` / `sent/`, never
   executed or overwritten. RPIPE transponder on 127.0.0.1:8900.
   Seeder `info.rizal.rtor.seeder` is running on the Neo (199 seed
   files). Device-to-device torrent is **not yet proven** — devices
   must leech from each other, not only HTTPS from rizal.pw / rizal.info.
7. **Rghostkey — the identity layer.** Keys, certificates, and
   signatures magnetized to the Rghostkey, transferred over the
   Rghostchain. Per Chase 2026-11-20, ThundR holds them and navigates
   through RTOR to every space and every device. The ghostkey guard
   rules on record say keys never leave the device and bots never sign
   — the autosign rebuild therefore asks the Rghostkey for a fresh
   profile; it never copies a key into a script.

## Nodes, as of the 2026-11-20 handoff (10:22 AM MST)

- **Neo (hub):** linked, seeder up, disk 97% / ~7.62 Gi free — short of
  the 20 GB goal. Load under 20. Then went offline.
- **iPhone 17e:** connected. RDRAGON 1.0.6.8 bundle 59, RCODE 1.0 (14),
  ЯBOT 2.2.0 (2026111803).
- **Moto (moto g 5G 2024, Android 15, adb ZN3223FVDH):** offline this
  morning, not showing over USB. Last known: RDRAGON 1.0.6.2 / 37,
  RCODE 0.1.0-android, RBOARD 1.1.3-standard-v3 (Nov 19, 11:52 PM).
- **rizal.pw / rizal.info:** feed 20261118-5, same sha. pw
  `/api/rsync/entries` live is no longer null.
- **RMAIL:** back in the hub cycle, syncing again. 110 legacy RPIPE
  drop files still sitting — do not raw-move them into the live queue.
- **TP-Link LAN / BRIDGE-LANDING:** stale / unconfirmed — OpenWrt
  flash and the 4242 forward are instructions, not confirmed done.

## Broadcast signal — RVM anywhere, update through RTOR or RMAIL

A signal broadcast from a RVM, wherever it may be, is the update
trigger for the mesh:

- Any RVM node can broadcast a signed update signal — "a new version
  / a new entry / a new profile is ready" — with its key, its
  `rid.v1` id, and its Ghost Chain entry.
- The signal travels through **RTOR** (feed / appcast) or through
  **RMAIL** (hub mailbox map, `SHARED/RMAIL`), whichever path is
  live for that node. RMAIL is back in the hub cycle as of Nov 20;
  RTOR's feed is 20261118-5 on both pw and info.
- Every receiving node verifies fail-closed before it acts: signature,
  key, size, and chain entry must check out, or the signal is refused.
  A broadcast is a signal to check, not a command to install — the
  install itself still goes over the existing app, never uninstalling,
  and only on the owner's GO where a GO is required.
- Because the signal carries the key and the entry, not a label, it
  works the same from Neo, 17e, Moto, a site, a cryptogame, or any
  RVM — the receiving node does not need to know where the sender
  sits, only that its signature verifies.

## What is proven, what is not

Proven:
- GitHub / site mesh linked and current.
- Feed 20261118-5 identical on pw and info, 28 entries.
- Fresh RSYNC entry today, live API no longer null.
- RVM test 9/9 in Node; Ghost Chain verify; pack round-trip and
  tamper detection; VM arithmetic deterministic; fuel bound.
- RMAIL back in the sync cycle.

Not proven:
- Live device mesh from the Muse VM — no current heartbeat in any
  repo; queues are empty skeletons by design.
- Device-to-device torrent / leech between two attached devices.
- Hash-chain continuity for the RSYNC relay (no prev_hash).
- Public GHOSTCHAIN export — live jsonl verifies 5/5, the public
  export fails recompute on 4/5 (first break at index 1) because the
  published copy strips keys after hashing.
- GHOSTKEY ring sidecar — still 404 on every path tried.
- Heart on loopback :4879 — not listening (connection refused
  10:21 AM MST).

## What the mesh carries, in order

1. A signed RTOR feed entry (appcast / RTRACKR data).
2. A signed RSYNC entry (today's owner-command entry, or a
   signed-and-sealed relay entry).
3. A Ghost Chain entry (append-only, never rewritten).
4. A re-signed app, over the existing install, never uninstalling —
   that is the ThundR Autosign v1 job, over RTOR, for all devices,
   sites, cryptogames, RVM, and apps.

## Next proofs, in order

1. RBOARDKeyboard re-sign before Nov 21, 3:44:27 PM MST (17e, bundle 59).
2. A measured device-to-device leech between two attached devices,
   written add-only into a handoff.
3. A fresh signed RSYNC entry with a `prev_hash` / parent link, so
   chain continuity can be verified.
4. A public GHOSTCHAIN export that keeps a verifiable canonical
   payload or advertises a stripped-payload hash rule.
5. GHOSTKEY ring sidecar published and returning 200.
6. Heart :4879 up on loopback, or its callers retired.
