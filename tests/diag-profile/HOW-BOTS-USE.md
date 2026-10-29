# How bots / AIs use `@rdragon_diag`

1. Load the pack (pick one):
   - GitHub: https://raw.githubusercontent.com/RIZALEON/rizal.pw/main/tests/diag-profile/rdragon-diag-profile.json
   - Live (after Pages publish): https://rizal.pw/tests/diag-profile/rdragon-diag-profile.json
   - Neo GHOSTMACHINE: `~/ЯLAB/RCRYPTOFORGE/GHOSTMACHINE/_offline/diag-profile/rdragon-diag-profile.json`
2. Open **https://rizal.pw/?diag=1** (TEST-ONLY gate; the installer refuses on a public host without it; localhost/GHOSTMACHINE serve is allowed). A red **TEST-ONLY · Import diag pack** box appears bottom-right — click it. Console alternative: `await installDiagProfile('/tests/diag-profile/rdragon-diag-profile.json')`.
   - Installer v2 writes IndexedDB **`rdragon.csp.keys`** / store `k` / key `device` (the store the site's identity loader reads) as `{kp, me:{pub,handle,name,profile}, diag:true, test_only:true}`, after backing up any existing non-diag record to key `device.bak-<ts>` in the same store. It still mirrors into legacy `rdragon.device.v1`.
   - Undo: **Restore backup** button or `await restoreDiagBackup()`.
3. Reload; status should show `@rdragon_diag` / `RP-425238b103faacaa` (not `@rbatboxtest`).
4. Post a short comment (e.g. sanity_20 Q1 `What is 17 + 25? Reply with just the number.` → `42` from the local ladder in well under a second) on any public post; wait for RDRAGON inline reply; record pass/fail + reply text.
5. Keys are **TEST-ONLY** and public by design. Never promote this profile to owner/biometric/vault.

Regenerate only with the lab generator on Neo; keep GHOSTMACHINE and `tests/diag-profile/` identical.

## Reply ladder (20261028 local-first)
Comment → local-cmd → quick (safe arithmetic / rules, `engine/rdragon-quick.js`) → intent card → `answers.json` → in-browser granite 350m (preloads on idle) → offline "will answer when synced" only after all of that misses. Neo/ENJIN only in apps (300 ms single try); rizal.pw never probes `127.0.0.1` unless the URL has `?local=1`.
