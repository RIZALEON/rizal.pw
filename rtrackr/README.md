# RTRACKR · RGHOSTCHAIN explorer + R TOKEN (rizal.pw/rtrackr/)
Static, read-only snapshot of the REAL local RGHOSTCHAIN (not a public blockchain), plus a public **R TOKEN** section for the Solana mint.

## R TOKEN (Solana)
- Mint `BB9uA5BuacDnWyDf5Npc9nMb9yFbyThsNrQPBYJ5Q1Lv`
- Crown / mint authority `BwpVNk1Rtncpv5HMTLwxB4Yfjkfv6mFaBQUTpjneH1F9`
- Orca pool position `24uKAFYiLQaycBeiVCpKQgsjUwAn9XiKsuiMAZeoaRV7`
- Watched holder `12872Chwv88d9JcNnPPThtSQWJM296kpkDqm7tpBWB28` (R TOKEN account `BNFLK9bU7CJ4mY87DHpgZ8wj4a1atxwRVpmSuxBUsG8Z`)
- Snapshot: `data/rtoken.json` (links + recent events + holder balances)
- Live feed: browser calls `getSignaturesForAddress` on `https://api.mainnet-beta.solana.com` for mint, crown, pool, and the watched holder, and also reads the holder's SOL and R TOKEN balances; polls every 60s while the section is open; falls back to the snapshot / localStorage cache offline.
- Deep link: `#rtoken`

## Republish (one command, on Neo)
    python3 ~/ЯLAB/RCRYPTOFORGE/GHOSTMACHINE/RGHOSTCHAIN/tools/rtrackr_export.py   (copy kept at rizal.pw/rtrackr/rtrackr_export.py) --site ~/path/to/rizal.pw
This reads chain/rghostchain.jsonl + rtrackr/registry.json read-only, runs rghostchain.verify, strips secret-looking keys, keeps only live registry entries, writes rtrackr-export/rghostchain.json + SHA256SUMS and copies them to <site>/rtrackr/data/. Then commit + push and mirror per lab rules.
Deep links: #block/<n>, #rid/<ЯID or @handle>, #rtoken. DRY-SUBMIT test chains are never exported.
