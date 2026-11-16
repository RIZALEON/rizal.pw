# TEACH: CRYPTOSOCIAL LOGIN + RGENERATOR (RDRAGON / ThundR)
Command: `LOGIN` (aliases: /login, "how do I log in", "devices"). Site: https://rizal.pw/login/ . Status: live, TEST setup (owner public keys not filled, nothing written to Ghost Chain).
Login method order (try top first, password LAST):
1. Auto-login via ЯCASKET (challenge signed on device; adapter stub until ЯCASKET supports it).
2. Device approval: an already-logged-in device approves the new one by short code or QR (one-time enrollment).
3. Username + password = last resort only.
Per device:
- Log in ONCE per device; the device then remembers it (session cached locally).
- First password login on a new device: tap "Restore from file", pick FOUNDER-PACKAGE-chaserizal.json, wait for "verified", enter password, "Log in".
- Package is cached per device (IndexedDB) -> later logins = username + password only, works OFFLINE.
- Every login writes a device-signed `session.start` (RGEN egg4 seal) to ЯSYNC; it auto-syncs at the next connection (outbox: online, focus, visible, retry).
- Sync routes today: same-browser tabs (automatic); between devices only by Devices panel/ЯSYNC `export` -> `import` of a signed bundle file, until a peer is set in RDRAGON_CONFIG.peers.
Devices panel: lists enrolled devices + sessions. Buttons: log out THIS device / log out OTHERS / log out ALL (signed `session.end`).
Proof of a login: ЯSYNC bar `export` -> rsync-bundle-<time>.json; verify with `node verify-session.js <bundle...>` (seal, device sig, @chaserizal, founder key, ЯSYNC heads).
Founder profile:
- @chaserizal = founder + origin, RID ЯID-0001-3QQS, profile RP-f949699f8054dff9.
- Package commitment (sha256): 1df04d7329437b181c01af33f5c1656e00a6b02ac4e805f112666d4d11f5e530 (1df04d73…f5e530). Public site holds ONLY this commitment, never the file.
- Backups: ~/ЯLAB/RFORGE/IDENTITY/FOUNDER-PACKAGE-chaserizal.json and Google Drive (private, FOUNDER-PACKAGE-chaserizal.json).
- Cryptobot ThundR ЯID-0014-KREH is in the package: canSign=false, canSpend=false, canMoveFunds=false. ThundR never signs or spends.
RGENERATOR:
- Latest .RZL egg in apps: egg4 (RGENERATOR-2.1.9-egg4). egg5 (adds RKEY profile 0 keygen) signed+verified (Ghost Chain seq 258), not yet swapped in.
- Commands: `RGEN`, `RGEN egg3`, `RGEN egg4`, `RGEN verify` (= Ledger.verifyRecord on every entry; scope yaseed.mint).
- No-transfer rule: transfer/sell off-device refused (LIMITS.transferOffDevice:false). RGENERATOR holds no keys.
Keys:
- RKEY profile 0 = origin/root key. Created ONLY by ЯCASKET on Rizal's device; status PENDING (ЯCASKET rebuild needed). Bots never create or hold it.
- Owner keys (profile 0, e5833fdfbbfe): each is FULL POWER alone. No limits on Rizal's keys.
- Two owner keys co-signing = "dual-signed" = highest authority.
Rules:
1. NEVER ask for, show, store, log or sync the password. Only salt/KDF/verifier/wrapped key exist.
2. NEVER ask Rizal to re-sign anything he already signed. Check first; everything in ЯCASKET is signed.
3. Never open KEYS, ЯCASKET, SECRETS, hub-tokens.env. Never print tokens/keys. Bots never sign for him.
4. Never publish the founder package file (public site = commitment only).
5. No minting / Ghost Chain writes / opening network services without Decider GO.
