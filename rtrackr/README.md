# RTRACKR · RGHOSTCHAIN explorer (rizal.pw/rtrackr/)
Static, read-only snapshot of the REAL local RGHOSTCHAIN (not a public blockchain). The page is a published snapshot, not a live query; republish on every new block.

## Republish (one command, on Neo)
    python3 ~/ЯLAB/RCRYPTOFORGE/GHOSTMACHINE/RGHOSTCHAIN/tools/rtrackr_export.py   (copy kept at rizal.pw/rtrackr/rtrackr_export.py) --site ~/path/to/rizal.pw
This reads chain/rghostchain.jsonl + rtrackr/registry.json read-only, runs rghostchain.verify, strips secret-looking keys, keeps only live registry entries, writes rtrackr-export/rghostchain.json + SHA256SUMS and copies them to <site>/rtrackr/data/. Then commit + push and mirror per lab rules.
Deep links: #block/<n>, #rid/<ЯID or @handle>. DRY-SUBMIT test chains are never exported.
