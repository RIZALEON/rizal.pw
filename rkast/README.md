# RKAST · website → own relays → devices (STAGED 2026-11-14, branch `web-rkast-rtrackr-mint-20261114`, not deployed)

RKAST (RappKAST) was the Neo's read-only appcast/eggcast drift transponder (`RCRYPTOFORGE/PIPE/rpipe_cast.py`, inside `rcryptopipe.py` on :8900).
This folder adds the **website side**: one feed every device app can read with **no Neo involved**.

| file | what |
|---|---|
| `rkast-core.js` | message format (`t:"rkast.msg"` ЯSYNC entries, content ids), bundle, RKRYPT-style sealed box for the public Nostr backup |
| `rkast-listen.js` | device listener for app WebViews / pages / Node: website feed → own device relays (ЯSYNC / RKLOWD / RMail bundle URLs from config) → Neo (optional, only if configured) → public Nostr (encrypted boxes only) |
| `rkast_build.py` | builds `feed.json` from `notices.json`, `/ALL-APPCASTS.json`, `/rtrackr/data/rghostchain.json` (sha-checked). Deterministic. Refuses to put DRY records in the public feed |
| `feed.json` + `SHA256SUMS` | the public feed (`rsync.bundle.v1`) |
| `notices.json` | website-originated notices (edit, rebuild, commit) |
| `index.html` | viewer (ThundR look) |
| `/rtrackr/dry.html` + `rtrackr-dry.js` | LOCAL test view of DRY TerraformЯ mints (`?api=<test submitd>`); not linked from `/rtrackr/` |

Kinds: `notice`, `appcast`, `eggcast`, `rtrackr.block`, `cryptoupdate`, `rtrackr.dry` (tests only).

Rules: display only (never signs, mints, installs, approves or moves funds). Own relays first. Nothing essential depends on the Neo.
Public Nostr relays carry only `rkrypt.aesgcm.pbkdf2.v1` boxes (PBKDF2-SHA256 310000 → AES-GCM-256, same scheme as `rkrypt.rzl.js`);
no channel key on a device = Nostr backup off. The channel passphrase is given to own devices at pairing; it is never in site code.

Wire into an app page: load `/rdragon-cryptosocial/rsync-core.js`, `/rkast/rkast-core.js`, `/rkast/rkast-listen.js`, then
`RKAST_LISTEN.create({onMsg: m => ...}).start(60000)`. Native apps may add a WK handler `rkast` (iOS/macOS) or `RKastNative.post` (Android) for a local notification.

Rebuild: `python3 rkast/rkast_build.py` (any machine; `--check` exits 1 if feed.json would change).
Tests: `RCRYPTOFORGE/HANDOFFS/WEB-RKAST-RTRACKR-MINT-20261114/test/run_e2e.py` (loopback, DRY only).
