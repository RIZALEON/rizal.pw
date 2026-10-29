# RDRAGON diagnostic test profile (@rdragon_diag)

**TEST-ONLY.** This profile and its private key are intentionally public so every bot/AI can run post/comment/RDRAGON-reply diagnostics on rizal.pw (and GHOSTMACHINE offline mirrors). Do **not** treat it as an owner, wallet, or biometric identity.

## Files
- `rdragon-diag-profile.json` — keys + sealed `profile.create` + ЯSYNC bundle
- `rsync-bundle.json` — bundle alone
- `install-diag-profile.js` — browser/Node helper to install the device key + bundle
- `README.md` — this file

## Locations
- Neo GHOSTMACHINE (RVULKAN/RCRYPTOFORGE): `~/ЯLAB/RCRYPTOFORGE/GHOSTMACHINE/_offline/diag-profile/`
- GitHub (rizal.pw): `tests/diag-profile/`

## Quick use (browser console on https://rizal.pw)
1. Fetch/open `install-diag-profile.js` and the JSON pack.
2. `await installDiagProfile(pack)` then reload.
3. Status bar should show `@rdragon_diag`. Comment on a post; RDRAGON answers inline.

## Regenerate
`SITE=~/ЯLAB/RFORGE/SITES/rizal.pw node tools path` — or re-run the lab generator; commit both GHOSTMACHINE copy and `tests/diag-profile/`.
