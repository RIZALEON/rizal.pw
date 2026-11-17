# /rtor — Rtor verify for rizal.pw (branch rtor-verify-20261117)
`rtor-verify.js` pins Rizal's release public key (keyId prefix e5833fdf, same key as RDRAGON SelfUpdate / rlab-sign / ЯCASKET).
Message format = rlab-update-v1, so ЯCASKET Face ID signatures verify directly. Fail-closed.

Gates added:
- `RDIAG.update.check/hot/force` only act on `/rdragon-version.json` when `/rdragon-version.json.sig.json`
  (kind web, id `rizal.pw-version`, name `rdragon-version.json`) verifies against the owner key + exact bytes.
- RWALLET v6 drift check also requires `RWALLET.sha256.sig.json` (name `RWALLET.sha256`); unsigned = warning.

## Rollout order (do not merge before step 2)
1. Regenerate `rdragon-version.json` (`node tests/diag-profile/make-version-manifest.js`).
2. Rizal commands ThundR to sign it: `~/R/ЯLAB/RTOR/tools/rtor-sign-request --signer thundr --app rizal.pw-version --version <v> --file rdragon-version.json --owner-command "<Rizal: rizal.pw-version <v> <sha12>>" --queue`,
   approve with Face ID on the 17e, copy the produced `rdragon-version.json.sig.json` next to the manifest. Same for `rwallet-v6/RWALLET.sha256`.
3. Merge to main (Rizal) → Pages deploys. Every later manifest change needs a new signature (CI does not sign).
