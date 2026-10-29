# answers.json + intent-card-map.json

Thin race-pack hook (2026-10-28).

## Order (first strong hit wins)

1. local-cmd / MIND commands
2. **intent-card-map** → `rdragon-card.json` line (DENY/qcheck still apply)
3. **answers.json** normalized-q match
4. in-browser granite (350m)
5. ENJIN `:4979` with ~250 ms connect / ~1.5 s total budget (apps only; site never waits on Neo / never probes 17e)
6. offline local stub → card fallback

## Refill answers.json later

When Neo is up and ENJIN/IBM returns a **strong** hit that local granite or the pack missed:

1. Seal the Q→A (public-safe scrub: no IPs, keys, wallets, device names).
2. Normalize the question (`nq`: lowercase, strip punctuation, collapse spaces).
3. Append `{ "nq": ["…"], "a": "…", "src": "enjin|ibm|card:…" }` under `answers`.
4. Bump `version`, precache via `sw-precache.json`, bump `?v=` on engine assets in `index.html`.
5. Sync into `GHOSTMACHINE/rizal.pw/` and ship a Pages deploy.

Intent map: add an intent with distinctive `q` phrases and `cardKeys` that already exist in `rdragon-card.json`. Never add bare `ghost` or `chain` keys (PR #22).
