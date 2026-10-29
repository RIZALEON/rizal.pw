# rizal.pw lab laws

## LAW-PTS-1 — Profile Twin Sync (2026-10-29)
Any update or command that changes the bot (ЯBOT) profile or the rizal.pw site profile must update **both** the ASSM profile card (`data/founder/assm-profile.json`) and the bio bot card (`data/founder/bio-source.json`) in the same change.
- Site: `rdragon-cryptosocial/rassm.js` runs on every profile save (console `edit …`, plain-English edits, inline Save) and rewrites the live ASSM card from the same fields.
- Repo / bot: `node tools/profile-sync.js` rewrites both cards together; `tests/test-rdragon-assm-sync.js` fails if they drift.
- Wallet copy `RWALLET/rwallet/data/BioSource.json` is never trimmed by this law. Changing `bio-source.json` needs a fresh ЯCASKET signature.
