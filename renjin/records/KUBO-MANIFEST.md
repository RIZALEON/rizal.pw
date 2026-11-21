# RENJIN KUBO — .rzl Kubo file

Format: rzl.fused.v1, Kubo/IPFS-ready test file for RTOR back-and-forth testing
with the new Renjin Torrent integration.
Built 2026-11-20, America/Denver. Authorized-by-owner-command, NOT a
cryptographic signature, no ghostkey accessed.

## Contents — most complete blocks, chains, keys on record

- BLOCKS: RGHOSTCHAIN blocks 0-4 (record, in the shell/OS record);
  Core v3 chain entries 0-8 (9 entries, chain_ok true) in renjin/src/store-v3.json
- CHAINS: Core v3 STATE 16f9dd002f25a26ddc7df8a6d2ef39ea898326df1414f6139663416ec9eb9b08;
  PKG SHA-256 3a19e054d6d3718d4f4a87a863dc97b691a7da578f820b8906197820400069c6;
  38 files, 856 KB, corpus-v2 158 lessons, loss 27.631 -> 3.26, held-out 3.246, PURE
- KEYS (public identifiers only — no secret key material in this file):
  Owner Rizal CHIEF ЯID-0001-3QQS; ThundR ЯID-0014-KREH; TerraformR ЯID-0015-0HJP;
  Gizmo RID Я-DEVICE-1PYZ7VG0Z1-ZE; KROG ЯID-BOT-0001; ThundR bot ЯID-BOT-0002;
  signature record RZL111682 (authorized-by-owner-command);
  transcript ledger seal SHA256 8c635f4f…09c
- SEED: the store seed hex present in the Neo package was REMOVED from this file
  (flagged for rotation). Re-seed on a trusted device with RGHOSTKEY tap.
- SHELL: rshell/R-SHELL-MERGED.html — live chain, torrent panel, RTOR activity feed
- TORRENT: rtorrent/renjin-torrent.html — old-school torrent interface opening into Renjin,
  magnet link built from the PKG SHA-256 + STATE hash, RMAIL share (relay_8797)
- OS: run-linux.sh serves the shell on 127.0.0.1:4984 (--check exit 0)
- GIZMO: RGENERATR-GIZMO.rzl (RGENERATR 2.1.9, RID minted 2026-11-20)
- STAMP: docs/PURE-RZL-STAMP.rzl — PURE .RZL, .rzl only, first of its class

## RTOR test

Test back and forth on the RTOR system with the new integration: shell <-> torrent
<-> RMAIL <-> RWALLET <-> RTRACKR <-> rizal.pw. No live device swarm is claimed;
no measured RTOR speed exists yet. No real money, no live device chain.
