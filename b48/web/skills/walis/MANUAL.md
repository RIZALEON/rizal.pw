# walis 0.1.0 (DRAGON SKULL skill, UNSIGNED, staged)
Type in DRAGON SKULL's chat box:
- `walis`: help.
- `walis scan`: read-only dry run on the Neo (`~/ЯLAB/TOOLS/walis-scan.sh`). It runs the app_dedupe dry run, the outside-zone ЯBOWZR report and the BUILDS output survey, and writes `LOGS/WALIS-SCAN-latest.txt`.
- `walis report`: shows the latest scan report.
- `walis apply`: gives a 6-character code valid for 5 minutes. You then type `walis apply <CODE>` and tap **Run**, and `walis-apply.sh --confirmed` runs `app_dedupe.py --apply` and `walis-old-rbowzr.sh --apply`. Both only move items to the Trash with Finder (`(POSIX file …) as alias`), check that each item is in ~/.Trash, never rm, and never empty the Trash.
Rules:
- Model replies cannot trigger walis.
- ds-hostd stays loopback-only (open_lan false).
- The host route needs the walis lines in `hostbridge-proposal/host-allow.walis.json` merged into ds-hostd's live allow-list. That step is NOT done; host commands stay off until Rizal and ЯBOWZR give the go.
Install (after signing, Rizal's go): copy `skills/walis/` into `Contents/Resources/web/skills/walis/` and load it with `<script src="./skills/walis/walis.js"></script>` after terminal-direct.
