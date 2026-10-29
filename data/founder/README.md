# data/founder — founder recovery (public ciphertext only)

`recovery.json` (added by the founder, @chaserizal / ЯID-0001-3QQS) is a password-wrapped ЯCASKET:
format `rizalpw.founder-recovery.v1`, PBKDF2-SHA256 600,000 iterations (salt stored), AES-GCM-256, signed by the founder key.

- Made ONLY on the founder's own device: /login/options/ → "Make founder recovery (one time)" → Download.
- The login page uses it only when a browser has no login record for @chaserizal: IndexedDB → localStorage → this file → Nostr (#rizalpw-founder-v1).
  It is verified (founder signature + registered profile + package commitment) and opened in the browser with the typed password.
- Contains no plaintext and no password. Risk: anyone can copy it and guess passwords offline — its safety equals the password's strength. Use a long passphrase.
- Never delete; to rotate, replace with a newer file made the same way (the old one stays in git history / backups).

## bio-source.json (ya.bio-source.v1) — added 2026-10-29
Public bio record for @chaserizal / ЯID-0001-3QQS: social handles fused with the RIZAL DECIDER card, SUPER BOT CARD (BIOBOT profile card), the BIOBOT feed (by sha256) and the Я wallet. Mirrors the owner entry in RCRYPTOFORGE/RWALLET/rwallet/data/BioSource.json.
- Signed ONCE by Rizal with Face ID in ЯCASKET (same signature event as the wallet entry). The site never signs.
- Signature slot: `bio-source.sig.json` = {format:"rizalpw.bio-source-sig.v1", record_sha256, pub (raw P-256 b64), sig (ECDSA-P256-SHA256 raw r||s b64)} over the text `rizalpw.bio-source-sig.v1\n<record_sha256>`.
- Verified in the browser (rbiosource.js): sha256 of the file bytes must equal record_sha256 and profileIdFor(pub) must equal the registered founder profile. Shows "signed" or "pending ЯCASKET signature".
- Any edit to bio-source.json changes its hash and needs a new signature.
