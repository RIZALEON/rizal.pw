# data/founder — founder recovery (public ciphertext only)

`recovery.json` (added by the founder, @chaserizal / ЯID-0001-3QQS) is a password-wrapped ЯCASKET:
format `rizalpw.founder-recovery.v1`, PBKDF2-SHA256 600,000 iterations (salt stored), AES-GCM-256, signed by the founder key.

- Made ONLY on the founder's own device: /login/options/ → "Make founder recovery (one time)" → Download.
- The login page uses it only when a browser has no login record for @chaserizal: IndexedDB → localStorage → this file → Nostr (#rizalpw-founder-v1).
  It is verified (founder signature + registered profile + package commitment) and opened in the browser with the typed password.
- Contains no plaintext and no password. Risk: anyone can copy it and guess passwords offline — its safety equals the password's strength. Use a long passphrase.
- Never delete; to rotate, replace with a newer file made the same way (the old one stays in git history / backups).
