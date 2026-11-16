# RKRYPT + RGENERATOR fused — 2026-10-25 MT (SCOUT) · DRAFT · UNSIGNED BUNDLE
One file: `rkrypt.rzl.js` (111,624 bytes, sha256 f94c6c94399174c4ebbabf75b5da22214dca02841529dcd360a93048e70eaa08).
RGENERATOR is no longer a standalone piece: it lives inside RKRYPT as `RKRYPT.rgen`. No `rgenerator/` paths, no symlink.

## Embedded (byte-identical originals, each wrapped in an internal module loader)
| module | from | sha256 | status |
|---|---|---|---|
| mint.js (ЯMINT ledger, R Token / RTOKEN, Ghost Chain) | egg5 rgenerator.rzl | b66fafdcdda60e6a33cdb50e42a23a20fd85c5d6b004e0c75419a83831722775 | signed egg5 (matches egg5 MANIFEST.sha256, seq 258) |
| rkey0.js (RKEY profile 0) | egg5 rgenerator.rzl | 0c8cb38c2357a30f04283903b35456279c0e99158d512414ac31d497da4d0a8c | signed egg5 (matches MANIFEST) |
| rkey0-passkey.js | egg6-draft-UNSIGNED | 8503f2607cfe870ff4d7f4cb87c51333caab44334ccc51efe561d761c34b8942 | **UNSIGNED DRAFT** |
| rkrypt.js 0.1.0 | RKRYPT/files | aee4242dd5b1fa363dd937891b8834fa9c129749099b513f151ef67c48a39be9 | DRAFT UNSIGNED |
mint.js and rkey0.js have no other egg imports (only `crypto`); the full CLI (rgen-cli.js, distribute, rvm-*) is NOT embedded (Node/RVM tooling, not needed by app pages).

## API
`RKRYPT.rgen` = { fused, Mint, RKey0, RKey0Passkey, RTOKEN, profile0, manifest, verify(), cmd(line) }.
`RGEN verify` (via `RKRYPT.cmd`/`rgen.cmd`/`RKRYPT.rdos`) re-hashes each embedded source against the header hashes.
All existing commands unchanged: `rkrypt …`, `RGEN rkey0 [request|status]`.

## How apps embed it
Copy `rkrypt.rzl.js` (+ optional `rkrypt-hook.js`, already pointed at rkrypt.rzl.js) into the app's `rkrypt/` folder and load one script:
`<script src="rkrypt/rkrypt.rzl.js"></script>` → `window.RKRYPT` (browser) or `require('./rkrypt.rzl.js')` (Node).
Note: `sync/rkrypt-check` still looks for `rkrypt/rkrypt.js` + `rkrypt/rgenerator`; it must be updated to accept the fused file before rollout (not changed yet).
Pages here (index/login/profile0.html) load only rkrypt.rzl.js. Backup of the pre-fuse state: BONEPILE/replaced-rkrypt-20261025/.

## rev 2 (2026-10-25 ~18:57 MT) — rollout
rkrypt.rzl.js rev2 sha256 dd5d306f6fc80740eaf9cdaac809a562e6c445742ef696120f08e3bb88936730 (112,012 bytes): adds RDOS_EXT repoint (the `rkrypt` entry's run → fused RKRYPT.rdos, so `RGEN verify` via any shell's RDOS_EXT runs the fused check). rev1 kept in BONEPILE as rkrypt.rzl.js.rev1.
Live RKRYPT/files/ and all 11 live app web layers now carry rkrypt/rkrypt.rzl.js + rkrypt-hook.js only; old rkrypt.js + rgenerator moved to BONEPILE/replaced-rkrypt-20261025/rev2-moved/. ЯBOWZR web layer intentionally keeps plain rkrypt.js (no egg, by law).
Build gate sync/rkrypt-check rev2: accepts fused (runs RGEN verify headless), flags OLD LAYOUT, forbids fused file in ЯBOWZR no-egg targets. The sentence above about the gate needing an update is superseded.
