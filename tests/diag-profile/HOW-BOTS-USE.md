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

## Diagnose · Repair · Update · Upgrade from the bot account (20261028, rdiag 1.0)
Every bot can do all four with the public TEST-ONLY `@rdragon_diag` account. You don't need owner, vault or biometric access, and no token lives in the page.
Open **https://rizal.pw/?diag=1**. The red **@rdragon_diag bot console** appears bottom-right. From a script or console, call `window.RDIAG` (loaded on every page from `rdragon-cryptosocial/rdiag.js`).

### 1. DIAGNOSE — `await RDIAG.run()` → JSON report
| check | passes when |
|---|---|
| `versions` | every loaded `?v=` matches the live manifest **`/rdragon-version.json`** |
| `sw` | no stale `rizalpw-*` precache (current + `rizalpw-models` kept); no SW registered in a no-storage tab |
| `gate8811` | on rizal.pw `RPostMenu.sync.url()` is `''` (the 127.0.0.1:8811 probe cannot fire) |
| `storage` | reports `RDRAGON_STORAGE` mode (persistent / memory / forced by `?nostore=1`) |
| `relay` | `RRELAY.summary()` — connected/total, last publish ok/err, lastError, backoff |
| `engine` | quick (17+25=42), rdragon-open (ranked options), DRAGOSKUL voice2, learn stats, ranker, local card ladder; granite lazy/skipped |
| `ledger` | `RDRAGON_CSP.verify()` hash chain has no problems |
| `sanity_20` | every question the local ladder answers (from `/tests/fixtures/sanity_20.json`) is correct; the rest are listed as `needsGranite` |
`report.ok`, `report.failed[]` and `report.summary` give the headline. **Copy JSON** (`RDIAG.copy()`) puts it on the clipboard. **Publish diag note** (`RDIAG.publish()`) posts a signed TEST-ONLY Nostr note (`kind:"diag"`, tag `rizalpw-csp-v1`, signed by an ephemeral key for this tab).

### 2. REPAIR (browser-local, safe; each action snapshots state first → `RDIAG.backups()`, undo with `RDIAG.restore(id)`)
`RDIAG.repair.clearStaleCaches()` drops only stale site-shell caches (never models or user data) and re-registers or updates the SW. `resetLocalPeer()` clears the `rdragon.csp.localPeer` flag. `reimportDiag()` re-runs the installer, which keeps its own `device.bak-<ts>`. `restoreDiagBackup()`. `reweightLearned()` adds a quarantine down-mark to bad learned items and deletes **0**. `resyncRelay()` re-sends the relay subscription and reconnects.
Under `?nostore=1`, backups stay in memory only.

### 3. UPDATE
`RDIAG.update.check()` diffs loaded bundles against `/rdragon-version.json`. `update.hot()` hot-swaps newer engine modules (quick/open/learn) without a reload and lists what still needs one. `update.force()` drops site-shell caches, updates the SW and reloads with `?_u=<ts>` to bust caches.

### 4. UPGRADE (site code) — bots request, they never push
1. `await RDIAG.upgradeRequest({title, want})` posts a TEST-ONLY Nostr `upgrade-request` note and returns `issueUrl`, a prefilled GitHub issue using template **bot-upgrade-request.yml** in RIZALEON/rizal.pw with the compact diag report attached. The bot opens that URL with its own GitHub login (or a human does).
2. A maintainer, or a bot with its own `gh` auth **on Neo**, makes the change and runs **`tests/diag-profile/bot-upgrade.sh <branch> "<title>" [issue#]`**. The script runs: backup (`_bak/` + `BACKUPS/GHOSTMACHINE/`) → branch → `make-version-manifest.js` → syntax + all `tests/test-*.js` → commit/push → PR → merge → GHOSTMACHINE sync + backup → curl verify. `DRY_RUN=1` stops before pushing. A lock file allows only one run at a time.
3. CI: `.github/workflows/tests.yml` runs every suite and checks that the manifest is current on each PR.
Rules: no sudo; never 17e or 192.168.0.75; never clone RIZAL-VAULT; never put keys or tokens in an issue or note.

### Relay etiquette (rrelay 1.2)
Publishes use a token bucket (burst 4, then 1 per 2 s, exponential backoff after a rate-limit reject). 👍/👎/better votes are batched into ONE `learn` note per ~4 s (≤10 votes, latest vote wins, ≤40 per tab). Replies carry their `score`/`why` across the relay. Relay-driven re-renders run at most every 2 s and pause while someone is clicking or typing.
