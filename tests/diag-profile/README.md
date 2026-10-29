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

## Quick use (https://rizal.pw/?diag=1)
1. Open the site with `?diag=1` (TEST-ONLY gate) and click **Import diag pack**, or in the console `await installDiagProfile('/tests/diag-profile/rdragon-diag-profile.json')`.
2. It backs up the current `rdragon.csp.keys` `device` record to `device.bak-<ts>`, writes the diag identity there (`test_only:true`), mirrors legacy `rdragon.device.v1`, appends the pack's signed `profile.create` to the ЯSYNC ledger, then reloads. Undo: `await restoreDiagBackup()`.
3. Status bar should show `@rdragon_diag`. Comment on a post; RDRAGON answers inline.

## Regenerate
`SITE=~/ЯLAB/RFORGE/SITES/rizal.pw node tools path` — or re-run the lab generator; commit both GHOSTMACHINE copy and `tests/diag-profile/`.

## Ledger recovery (ЯSYNC `rdragon.csp.rsync.v1`)
Symptom: after clearing/retrying, the status bar shows e.g. **1 signed · 4 rejected** and `@rdragon_diag` is not recognized.
1. **Back up first:** in the console `copy(localStorage.getItem('rdragon.csp.rsync.v1'))` and save it as `rsync-ledger-bak-<ts>.json` (or use the site's ЯSYNC export). Never clear the ledger again until the steps below are done.
2. **Keep the 1 good signed entry** exactly as is (it is the anchor). Do not edit or re-sign it.
3. **Quarantine the rejected entries — never re-sign them.** Move them out of the live ledger into `localStorage['rdragon.csp.rsync.quarantine.<ts>']` (or a file next to the backup) for later review against the PR #22 DENY/qcheck rules. Re-signing would launder bad entries into the chain; only GHOSTMACHINE (source of truth) may ever reseal, and owner entries are never re-signed by bots.
4. **Re-seed from the pack:** run `installDiagProfile(pack)` again (with `?diag=1`). It only *appends* the pack's already-signed `profile.create` (`pc-RP-425238b103faacaa`, fields `cid`+`rgen`) if its id is missing; it signs nothing.
5. Reload, confirm the device policy recognizes `@rdragon_diag`, then rerun sanity_20.
