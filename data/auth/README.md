# rsite-auth vault (ciphertext only)
`vault.json` (format `rsite-auth.vault.v1`) is created ONLY by Rizal on his own device with `tools/rsite-auth-make.js`.
Entries: SHA-256 handle id + PBKDF2-SHA256 (≥600k) / AES-GCM ciphertext of the login record. Whole file Ed25519-signed by the site key;
browsers refuse it unless the signature matches `RDRAGON_CONFIG.siteAuth.pub`. No passwords, no private keys here — ever.
