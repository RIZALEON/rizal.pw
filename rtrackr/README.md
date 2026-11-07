# RTRACKR · RGHOSTCHAIN explorer + R TOKEN (rizal.pw/rtrackr/)
Static, read-only snapshot of the REAL local RGHOSTCHAIN (not a public blockchain), plus a public **R TOKEN** section for the Solana mint.

## R TOKEN (Solana)
- Mint `BB9uA5BuacDnWyDf5Npc9nMb9yFbyThsNrQPBYJ5Q1Lv`
- Crown / mint authority `BwpVNk1Rtncpv5HMTLwxB4Yfjkfv6mFaBQUTpjneH1F9`
- Orca pool position `24uKAFYiLQaycBeiVCpKQgsjUwAn9XiKsuiMAZeoaRV7`
- Watched holder `12872Chwv88d9JcNnPPThtSQWJM296kpkDqm7tpBWB28` (R TOKEN account `BNFLK9bU7CJ4mY87DHpgZ8wj4a1atxwRVpmSuxBUsG8Z`)
- Snapshot: `data/rtoken.json` (links + recent events + holder balances)
- Live feed: browser polls every 60s while the section is open. Holder SOL and R TOKEN balances are read live via `https://solana-rpc.publicnode.com` (`getBalance` + `getAccountInfo` on the token account), falling back to `https://api.mainnet-beta.solana.com`. Signature lists use the same RPC fallback and merge into this snapshot if an RPC is blocked or returns no signatures.
- Deep link: `#rtoken`

## Republish (one command, on Neo)
    python3 ~/ЯLAB/RCRYPTOFORGE/GHOSTMACHINE/RGHOSTCHAIN/tools/rtrackr_export.py   (copy kept at rizal.pw/rtrackr/rtrackr_export.py) --site ~/path/to/rizal.pw
This reads chain/rghostchain.jsonl + rtrackr/registry.json read-only, runs rghostchain.verify, strips secret-looking keys, keeps only live registry entries, writes rtrackr-export/rghostchain.json + SHA256SUMS and copies them to <site>/rtrackr/data/. Then commit + push and mirror per lab rules.
Deep links: #block/<n>, #rid/<ЯID or @handle>, #rtoken. DRY-SUBMIT test chains are never exported.
