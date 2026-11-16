# RDRGN / ЯLAB build 48 package

Branch-only drop for RDRAGON (RDRGN) build 48 (marketing version 1.0.6.0).  
This is **not** on `main` and is **not** a live update feed. Apps poll the signed appcast at:

`https://raw.githubusercontent.com/RIZALEON/RZL-EGG/main/dragon-skull/ios-web/appcast.json`

`fanout/appcast-b48-UNSIGNED.json` is local staging only. SelfUpdate refuses unsigned entries. Do not merge this branch to `main` or publish the unsigned feed without Charles's own GO and a Face ID signature.

## Contents

- `INSTALL.md` — per-device commands (Neo, iPhone 17e, moto Android, RVM, rizal.pw R command bot site). Every install/sign/publish step is GO-gated.
- `HANDOFF.md` — full build-48 scope, what is done, how to finish, hard rules.
- `tools/b48-fanout.sh` — after a successful Xcode build, stamps the unsigned feed and copies the web version file into RKLOWD. **No-op unless `B48_FANOUT=1`.** Does not sign, does not install, does not `devicectl`, does not push to GitHub.
- `web/` — filtered RDRGN web bundle (approved RWALLET ghost2 files included).
- `source/` — `App/Sources` plus `project.yml`.
- `wallet-preview/` — preview site and screenshots (including shots-v6, wallet as owner of the ASSM profile and RID).
- `WALLET-APPROVED-SHA256.txt` — hashes of the approved ghost2 files.

## Omitted from this public folder (on purpose)

- Build products, `.app`, derived data, `.mobileprovision`, keys, `.pem` / `.p8` / `.p12`, `.env`, SSH keys, and filenames matching `*seed*` / `*secret*`.
- `ghost-machine/site/rdragon-cryptosocial/` (~304 MB media; already on this repo's site tree).
- `tfr/blobs/`, `.mp4`, `.wasm`, and any file over 8 MiB.
- `ghost-machine/site/tests/test-rdragon-mind.js` (a unit test contains a dummy PEM header string; left out of the public tree).
- The live signed RZL-EGG appcast and zip products.

The full hardlink package on the Neo (not in this repo) is:

`~/R/ЯLAB/RKLOWD/RDRAGON/B48-PACKAGE-20261115`  
`~/R/ЯLAB/RKLOWD/RBOT/B48-PACKAGE-20261115`

## Status when this branch was cut (2026-11-15, 5:10 PM MT)

An unsigned Xcode build 48 had already **failed** (`App.swift:60`, main-actor isolation on `onRPipeUpdate`). Signing and device installs were not run. See `INSTALL.md` for the remaining GO list.
