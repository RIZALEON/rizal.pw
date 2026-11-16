# Build 48 — install instructions and commands

**Nothing below installs, signs, or publishes until Charles gives his own GO in chat.**
A relayed "yes" from another bot does not count. The fanout script and Xcode Play do not install to devices.

Live self-update feed the apps already poll (web bundles only, must be signed):

`https://raw.githubusercontent.com/RIZALEON/RZL-EGG/main/dragon-skull/ios-web/appcast.json`

`b48-fanout.sh` writes an **UNSIGNED** staging file under this package's `fanout/` folder. It does **not** change the live feed. SelfUpdate refuses unsigned entries.

## Current status (2026-11-15, 5:06 PM MT)

- Package is in RKLOWD (hardlinks). Approved RWALLET ghost2 files are in this package.
- Unsigned Xcode build 48 already attempted and **FAILED** (log: live tree `source/ios/build-20261115-b48-wallet-unsigned.log`). First error: `App.swift:60` — `main actor-isolated static property 'onRPipeUpdate' can not be mutated from a nonisolated context`. That compile error must be fixed before Play / an unsigned rebuild can succeed.
- Signing, publishing the appcast, and every device install still need a separate GO.
- Rollback remains `source/ios/build-b47-install` (1.0.6.0 build 47).

## 1. Neo (Mac) — unsigned rebuild (after the compile fix)

```sh
cd ~/R/ЯLAB/RCRYPTOFORGE/cryptoapp/RDRAGON/RDRAGONSKULL/source/ios
# Check free disk first (Neo is tight; leave room for derived data):
df -h /System/Volumes/Data

xcodebuild -project DragonSkull.xcodeproj -scheme DragonSkull \
  -configuration Release -sdk iphoneos \
  MARKETING_VERSION=1.0.6.0 CURRENT_PROJECT_VERSION=48 \
  CODE_SIGNING_ALLOWED=NO \
  -derivedDataPath build-b48-wallet-dd \
  build 2>&1 | tee build-20261115-b48-wallet-unsigned.log
```

Use the rXcode route if it is up. Do not sign in this step.

Optional, after a **successful** build, stamp the local UNSIGNED feed and copy the web version file into RKLOWD (still no sign, no install, no GitHub push):

```sh
# From the same source/ios directory, or as an Xcode scheme post-action:
B48_FANOUT=1 MARKETING_VERSION=1.0.6.0 CURRENT_PROJECT_VERSION=48 \
  SRCROOT="$(pwd)" \
  bash tools/b48-fanout.sh
```

Without `B48_FANOUT=1` the script is a no-op, so Play cannot fire it by surprise.

Mac RDRAGON / RVM wrap (already on Neo; not this iOS pbx):

`~/R/ЯLAB/RCRYPTOFORGE/cryptoapp/TERAFORMR/DRAGONSKULL-RVM-0.3.1-arm64-SIGNED-decider-Rizal/`

- Chat listener historically on `:8319`. RVM panel `:8321`, RKLOWD↔RVM bridge `:8324`.
- In-app: `/rvm <command>`, `rvm boot`, `rvm stop`.
- Canonical RKLOWD VM helper: `~/R/ЯLAB/RKLOWD/RKLWD VM/rklwd-vm` (`status`, `ubuntu`, `rvm`, `linux-rizal`).
- Do not copy the Ubuntu SSH private key (`RKLWD VM/ubuntu-24.04/id_ed25519_rizal`) anywhere, and do not push that key to GitHub.

## 2. iPhone 17e — signed install (GO + Face ID)

- UDID: `00008150-000238413E7A401C`
- Transport: `xcrun devicectl` (wireless after a prior USB pair). Clear the 17e auto-pair "already in progress" warning before installing.
- The `17e install` skill **refuses** installs. Use devicectl only after Charles's GO, and only on a **signed** product (the unsigned build cannot be installed on a device).
- Signing the native app is Charles's Face ID / development-team sign on the 17e / Neo. Do not run sign commands without GO. Do not touch Keychain, seeds, or wallet secrets.
- Web egg (ios-web) signing is separate: Face ID via the existing ЯCASKET / `rlab-phone-sign-egg` path, then a **separate GO** to publish to `RIZALEON/RZL-EGG` `main` `dragon-skull/ios-web/`.

List the device first:

```sh
xcrun devicectl list devices
```

Install the signed `.app` (path is the signed product, not the unsigned derived-data app):

```sh
xcrun devicectl device install app \
  --device 00008150-000238413E7A401C \
  "/PATH/TO/SIGNED/DRAGON SKULL.app"
```

Push of individual files into the app container (web overlays, notes, etc.): **one file at a time, never a whole folder.** List the remote path before and after. Use the existing `17e push` skill (it backs up a phone file to `phone-bak/` before overwrite). The skill skips secret-looking names.

Rollback on the phone: reinstall `build-b47-install` (still in the live tree) after a GO.

## 3. moto (Android) — adb (GO)

- Device: moto g 5G 2024 (Android 15)
- Serial: `ZN3223FVDH`
- TCP: `192.168.0.224:5555` (only if that LAN address is still valid; check first)
- There is **no build-48 APK in this package.** Do not invent one. An Android/Linux branch remains planned. Only install an APK that actually exists, after GO.

```sh
adb devices
# USB:
adb -s ZN3223FVDH install -r /PATH/TO/EXISTING.apk
# Wireless, if the device is listening and the address is current:
adb connect 192.168.0.224:5555
adb -s 192.168.0.224:5555 install -r /PATH/TO/EXISTING.apk
```

List the package before and after (`adb -s ZN3223FVDH shell pm path <package>`).

## 4. RVM

- Mac signed RVM/RDRAGON wrap: path in §1.
- Browser ЯVM 0.1.4: `~/R/ЯLAB/RKLOWD/RKLWD VM/rvm-0.1.4-browser/` (and `./rklwd-vm rvm` → `http://127.0.0.1:8765/`).
- Linux-Rizal / Ubuntu guests: `./rklwd-vm status` first. Do not ship guest SSH keys.
- To offer a signed web update inside RVM, publish the signed ios-web (or the matching host) egg to the live RZL-EGG feed after GO; hosts poll that feed. Unsigned staging in `fanout/` will be refused.

## 5. Integrated rizal.pw R command bot website

Public site repo: `https://github.com/RIZALEON/rizal.pw` (visibility: **public**). Default branch `main`.

This work lands on branch `b48-package-20261115` in folder `b48/` only. **Do not merge to `main` and do not open a PR** until Charles says so.

Site surfaces already in that repo include `rbot/`, `rwallet/`, `rtrackr/`, `rscribe/`, `rklowd/`, `dragon-skull/`, `embed/`. The R command bot lives with the site (`rbot/` and the integrated command UI).

Commands (after a local clone, on the package branch only):

```sh
gh repo view RIZALEON/rizal.pw --json name,visibility,url
git fetch origin
git checkout b48-package-20261115
# Inspect b48/README.md and b48/INSTALL.md
# Do not git push --force. Do not push to main.
```

Publishing site files to production (pages / rizal.pw) is a **separate GO**. A signed web egg is published to `RIZALEON/RZL-EGG` (also public), not by overwriting `main` from this branch.

## 6. What still needs Charles's GO

1. Fix the unsigned build failure, then a successful unsigned rebuild (or Play).
2. Sign the native 1.0.6.0 (48) product (Face ID / development sign).
3. Install signed RDRGN to the 17e (`devicectl device install app`). Clear auto-pair first.
4. Sign and publish any ios-web / RKAST egg to `RIZALEON/RZL-EGG` main (Face ID, then a publish GO).
5. Any ЯBOT rebuild/install (17e currently 2.2.0 / 2026111102; fused Xcode is newer; RBOARD-match `APPLY.sh` not run).
6. Any moto APK install, once a real APK exists.
7. Any RVM / Mac RDRAGON update, and any production deploy of rizal.pw `main`.
8. Enabling `B48_FANOUT=1` on Play after a successful build (stamps only; still no install).

See `HANDOFF.md` for scope, rules, and the finish checklist.
