# ЯLAB Build 48 Handoff (RDRGN / DragonSkull) - 2026-11-15, 4:50 PM MT

This folder is a COPY. Nothing was moved or deleted. The live sources stay at:
~/R/ЯLAB/RCRYPTOFORGE/cryptoapp/RDRAGON/RDRAGONSKULL/source/ios/

## What's in this folder
- RDRAGONSKULL/source/ios: the working tree (App, DragonSkull.xcodeproj, project.yml, all BACKUPS-20261115-*, egg staging, logs) and build-b47-install (the ROLLBACK, b47 1.0.6.0).
  Left out to save space (the Neo had 11 GB free): build/, build-b42*/b43*/b46*, build-*-dd, build-diagfix-dd, rdrgn-reinstall-t64u-*, BACKUPS-20261112-pre-b42. They are still in the live tree.
- RDRAGONSKULL/BUILD-QUEUE.md: the build queue. Its base note is stale; the real base is the main tree, with b47 as the rollback.
- TEAM/: the shared team board (BOARD.md) and TEAM/SHARED/rwallet-b48-preview/, the wallet preview (site/, shots..shots-v5/, backups/).
- scribe-tmp/: SCRIBE's staged items (yscribe-chat-context, rpipe-entry, thundr-fallback).
- rbot-rboard-match-20261115/: SCOUT's ЯBOT RBOARD match (for the ЯBOT rebuild, not 48).

## Build 48 scope (set by Charles)
1. TOP PRIORITY: sync and auto-feed between rizal.pw, RDRAGON and ЯSCRIBE across the Neo, 17e and moto, for posts made online or in-app. ЯSCRIBE goes into the site and all apps.
2. RDRAGON always replies, online or offline (no "RDRAGON is offline - your question is queued").
3. RWALLET: newer wallet (tree has ЯWALLET 0.1.5 - do NOT downgrade to GitHub 0.1.4) with Charles's edits:
   no locked/big red R/offline/not-trusted views; no "watch-only"; no top "Sign in · ASSM" or "chain #" chips; no login (the wallet OWNS the ASSM profile and RID);
   no RDG, only R token and R coin, 100 R coins = 1 R token; all RtrackR v1.4 data including the Orca pool; all wallets labeled ours.
4. RSYNC recast.
5. One-push mint to GHOSTCHAIN: the in-app button only creates an UNSIGNED request; signing happens only with Charles's Face ID tap on the 17e. ThundR/Gizmo can only request. No keys in any bundle.
6. RtrackR built into TerraformЯ, RDRAGON and ЯBOT, plus ThundR and Gizmo.

## Done so far (no build yet)
- Wallet preview v1-v5 done (see TEAM/SHARED/rwallet-b48-preview/shots-v5). The RID-ownership version (shots-v6) is in progress.
- Already in the live tree: scout.html swipe lines, rscribe-open-cmd.js, rboard swipe files, thundr-ios.js egg +10 lines, diagfix (Server.swift, App.swift, dg-cmd.js, RThundRHelper.swift).
- Being staged into the live tree (add-only, with backups in BACKUPS-20261115-scribe3): SCRIBE's 3 items, ds-webversion.json >= 1.0.6.3, SCOUT's offline fixes (bundled side-panel assets first, ЯMAIL 127.0.0.1 fallback plus queue/backoff, selfupdate stub, RXCODE size cap, thundr-ios 2.2.0.7 label),
  and the approved (a) bundled sha-checked trusted-devices.json in rnetwork-config.js (display only) and (b) a cached read-only RtrackR/chain/mint-gate status labeled "cached" in rmint-transport.js / rmint-onetap.js.
  SCOUT's spec: box /workspace/rdragon-offline-test/REPORT.md.
- The last signed attempt (build-20261115-b48-signed.log) was INTERRUPTED with no product; the 17e auto-pair was "already in progress".

## How to finish build 48
1. Get Charles's OK on the final wallet preview (shots-v6).
2. Back up, then copy the wallet patch from TEAM/SHARED/rwallet-b48-preview/site/ into the 4 live files only:
   App/web/rwallet-shared/rwallet/rwallet-ghost2.js + .css
   App/web/ghost-machine/site/rwallet/rwallet-ghost2.js + .css
3. Confirm the staging run finished (check BACKUPS-20261115-scribe3 and the diffs).
4. Unsigned build:
   cd source/ios && xcodebuild -project DragonSkull.xcodeproj -scheme DragonSkull -configuration Release -sdk iphoneos \
     MARKETING_VERSION=1.0.6.0 CURRENT_PROJECT_VERSION=48 CODE_SIGNING_ALLOWED=NO \
     -derivedDataPath build-b48-wallet-dd build 2>&1 | tee build-20261115-b48-wallet-unsigned.log
   (Use the rXcode route if it's up.)
5. Log a ЯSCRIBE note. Test RDRAGON in its own chat (:8319), and its offline reply.
6. STOP and get Charles's own GO before signing or installing. Clear the 17e auto-pair warning before installing.
   17e UDID 00008150-000238413E7A401C, wireless via devicectl. Push one file at a time, never a folder; list before and after.
7. After it ships: give SCRIBE the version/build/sha, update TEAM/BOARD.md (add-only, back up first), and keep build-b47-install as the rollback.

## Still to plan after 48's wallet
- Sync/auto-feed design, always-reply offline, ЯSCRIBE on site + Neo/17e/moto, RSYNC recast, request-only mint, RtrackR in TerraformЯ/RDRAGON/ЯBOT/ThundR/Gizmo.
- Check TerraformЯ 0.5.1.19 (30) on the Neo (newer than anything public).
- On hold: ЯBOT rebuild (SCOUT writes the code, FATBOT builds), rbot wallet/mint.
- Open GOs: Login Items toggle for rcf-gate.sh, MLX regex widening, SHA256SUMS re-sign, Godot items, TerraformЯ main update.

## Hard rules
- Delete nothing without Charles's OK. Back up before editing.
- Never sign, mint, publish, or touch keys/seeds/Keychain/wallet secrets. Wallet: can_sign=false, Send/Mint request-only, no password handling.
- Build/sign/install/push need Charles's own GO (a relayed approval doesn't count).
- Don't invent data; show "—" when a value is missing.

## Update 4:52 PM MT: staging finished (no build)
All SCRIBE items and SCOUT offline fixes 1-6 are now in the live tree, and this backup was re-synced to include them. Backups of originals: source/ios/BACKUPS-20261115-scribe3/.
- New: App/Sources/RscribeNotesContext.swift (added to DragonSkull target); Server.swift appends its prompt block.
- RPIPE entry path in App.swift, DragonGateAdapter.swift, DragonGateCore.swift, REmbedCore.swift, SelfUpdate.swift (two of SCRIBE's .diff files were malformed, merged by hand - review these first if the build fails).
- ThundR fallback JS + thundr-ios.js labeled 2.2.0.7; ds-webversion.json 1.0.6.3.
- Offline fixes: bundled side-panel assets, ЯMAIL loopback + send queue, selfupdate 404 stop, RXCODE panel size cap, bundled trusted-devices.json (display only), cached read-only RtrackR/chain/mint-gate status.
- Not done: BATIBABOX/ROSShellHost patches (belong to the ЯBOT tree), no MachineMindFallback Swift (none existed), no LaunchAgent for machine-mind-rkast-pull.py.
- swiftc -parse and node --check passed on all changed files. The wallet ghost2 files are still untouched (step 2 above).
