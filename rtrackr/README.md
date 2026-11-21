# RTRACKR · RGHOSTCHAIN explorer + R TOKEN (rizal.pw/rtrackr/)
Static, read-only snapshot of the REAL local RGHOSTCHAIN (not a public blockchain), plus a public **R TOKEN** section for the Solana mint.

## R TOKEN (Solana)
- Mint `BB9uA5BuacDnWyDf5Npc9nMb9yFbyThsNrQPBYJ5Q1Lv`
- Crown / mint authority `BwpVNk1Rtncpv5HMTLwxB4Yfjkfv6mFaBQUTpjneH1F9`
- Orca pool position `24uKAFYiLQaycBeiVCpKQgsjUwAn9XiKsuiMAZeoaRV7`
- Watched holder `12872Chwv88d9JcNnPPThtSQWJM296kpkDqm7tpBWB28` (R TOKEN account `BNFLK9bU7CJ4mY87DHpgZ8wj4a1atxwRVpmSuxBUsG8Z`)
- Orca Я/SOL whirlpool `HSroUxVkVKv6kX9e7dpoJtbFqKcL76BzrkuuRfAGxs9s` (tracking only, no swap/liquidity code). Live: `getAccountInfo` (whirlpool layout) + `getTokenAccountBalance` on both vaults via the same RPC fallback. Offline: `data/token-pool.json`, written by `RGHOSTCHAIN/tools/pool_snapshot.py` (copy at rtrackr/pool_snapshot.py), which also refreshes `data/SHA256SUMS`. GhostChain record: `RGHOSTCHAIN/rtrackr/pools.json` (metadata, not a sealed block). Deep link `#pool`.
- Я wallets: every holder of the mint (lab roster `RGHOSTCHAIN/rtrackr/wallets.json` with labels, plus on-chain holders found by `getProgramAccounts`). Live balances via `getMultipleAccounts`; offline `data/token-wallets.json` (same snapshot script). Deep link `#wallets`. Public addresses only.
- CRYPTOGAME pair Rcoin/Я (Rizal GO 2026-11-14 9:15 PM MT): **100 Rcoins = 1 Rtoken**, rounded down, minimum 100 Rcoins, cap 100 Rtoken per person per day; supersedes 10:1. Panel above the pool shows the rate, cap, a Rcoins→Rtoken calculator, and the Orca Я/SOL price for reference only. Data: `data/economy-rates.json` (v2) + `data/pairs.json` (copy of GhostChain `RGHOSTCHAIN/rtrackr/pairs.json`, metadata, not a sealed block). Deep link `#pair`.
- Snapshot: `data/rtoken.json` (links + recent events + holder balances)
- Live feed: browser polls every 60s while the section is open. Holder SOL and R TOKEN balances are read live via `https://solana-rpc.publicnode.com` (`getBalance` + `getAccountInfo` on the token account), falling back to `https://api.mainnet-beta.solana.com`. Signature lists use the same RPC fallback and merge into this snapshot if an RPC is blocked or returns no signatures.
- Deep link: `#rtoken`

## Republish (one command, on Neo)
    python3 ~/ЯLAB/RCRYPTOFORGE/GHOSTMACHINE/RGHOSTCHAIN/tools/rtrackr_export.py   (copy kept at rizal.pw/rtrackr/rtrackr_export.py) --site ~/path/to/rizal.pw
This reads chain/rghostchain.jsonl + rtrackr/registry.json read-only, runs rghostchain.verify, strips secret-looking keys, keeps only live registry entries, writes rtrackr-export/rghostchain.json + SHA256SUMS and copies them to <site>/rtrackr/data/. Then commit + push and mirror per lab rules.
Deep links: #block/<n>, #rid/<ЯID or @handle>, #rtoken. DRY-SUBMIT test chains are never exported.


## Live RTOR TrackR
Live, read-only RTOR status on this site:
- Section: `https://rizal.pw/rtrackr/#rtor`
- Standalone page: `https://rizal.pw/rtrackr/rtor/`
- Snapshot: `data/rtor-live.json` (schema `rzl.rtrackr.rtor-live.v1`)

The page polls the snapshot every 15 seconds and shows a last-seen / offline state. Neo publishes a sanitized snapshot at most every 2 minutes (`RGHOSTCHAIN/tools/rtor_live_publish.py`, LaunchAgent `pw.rizal.rtrackr-rtor-live`), with a no-op when unchanged. The snapshot includes the official RGHOSTCHAIN height and tip, RTOR listener and ghostchain status, the seeder file table (name, sha256, size, up/down rates, SEED/MAGNET), and peers. Private IPs, tokens, keys, mailbox contents, and filesystem paths are stripped before publish.

## RTOR ↔ ASSM network (2026-11-21, Decider pt256u)
Read-only panel on the home page and at `https://rizal.pw/rtrackr/#assm` (also `#network`, `#devices`; search `assm`).
- Snapshot: `data/rtor-assm.json` (schema `rzl.rtrackr.rtor-assm.v1`), rendered by `rtor-assm.js`.
- Shows the ASSM profile @chaserizal ЯID-0001-3QQS (sha256 db3535091e3e…) and where it matches (Neo, iPhone 17e, Pixel, Moto), device versions, every RTOR space ЯID (0017–0028), and the rizal.info feed / ASSM link / ЯWALLET service status, with a last-updated time in MT.
- Public fields only; no keys, tokens, private IPs or paths. Creates no GhostChain blocks or mints. Additive: no existing panel was changed.
