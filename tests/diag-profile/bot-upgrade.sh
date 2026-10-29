#!/usr/bin/env bash
# bot-upgrade.sh — the ONLY path for a site-code upgrade requested by a bot (TEST-ONLY @rdragon_diag issue or Nostr
# "upgrade-request" note). Run on Neo by a maintainer, or a bot that has its own gh auth there. The public diag account
# never pushes. No sudo. Never touches 17e or 192.168.0.75. One instance (lock file). Never deletes: backups only grow.
#
#   tests/diag-profile/bot-upgrade.sh <branch-name> "<PR title>" [issue-number]
#   1) make the code change in the repo first (or let the bot's agent do it), then run this script:
#      backup -> branch -> version manifest -> syntax + all test suites -> commit -> push -> PR -> merge -> GHOSTMACHINE sync + backup -> curl verify
set -euo pipefail
REPO_DIR="${REPO_DIR:-$HOME/ЯLAB/RFORGE/SITES/rizal.pw}"
GM="${GM:-$HOME/ЯLAB/RCRYPTOFORGE/GHOSTMACHINE/rizal.pw}"
BAK_SITE="${BAK_SITE:-$HOME/ЯLAB/RFORGE/SITES/_bak}"
BAK_GM="${BAK_GM:-$HOME/ЯLAB/BACKUPS/GHOSTMACHINE}"
BR="${1:?branch name}"; TITLE="${2:?PR title}"; ISSUE="${3:-}"
DRY="${DRY_RUN:-0}"   # DRY_RUN=1: everything up to (not including) push/PR/merge/sync
LOCK="/tmp/rizalpw-bot-upgrade.lock"
exec 9>"$LOCK"; if command -v flock >/dev/null; then flock -n 9 || { echo "another bot-upgrade is running"; exit 1; }; else [ -e "$LOCK.pid" ] && kill -0 "$(cat "$LOCK.pid")" 2>/dev/null && { echo "another bot-upgrade is running"; exit 1; }; echo $$ > "$LOCK.pid"; fi
cd "$REPO_DIR"
command -v gh >/dev/null || { echo "gh not installed"; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "gh is not authenticated on this machine — stop (the public diag account never pushes)"; exit 1; }
T=$(date +%Y%m%d-%H%M%S)
echo "== 1. backup ($T)"; mkdir -p "$BAK_SITE" "$BAK_GM"
rsync -a --exclude .git ./ "$BAK_SITE/rizal.pw-$T/"; rsync -a --exclude .git "$GM/" "$BAK_GM/rizal.pw-$T/"
echo "== 2. branch $BR"; git fetch -q origin; git checkout -B "$BR"
echo "== 3. version manifest"; node tests/diag-profile/make-version-manifest.js
echo "== 4. syntax + tests"; for f in rdragon-cryptosocial/*.js rdragon-cryptosocial/engine/*.js tests/diag-profile/*.js; do node --check "$f"; done
for f in tests/test-*.js; do echo "-- $f"; node "$f" | tail -1; done
if [ "$DRY" = "1" ]; then echo "DRY_RUN: stop before commit/push"; exit 0; fi
echo "== 5. commit + push + PR + merge"; git add -A; git commit -qm "$TITLE${ISSUE:+ (closes #$ISSUE)}" || echo "nothing to commit"
git push -qu origin "$BR"
URL=$(gh pr create --title "$TITLE" --body "Bot upgrade via tests/diag-profile/bot-upgrade.sh.${ISSUE:+ Closes #$ISSUE.} All test suites passed locally; CI (tests.yml) runs them again." | tail -1)
echo "PR: $URL"; gh pr merge "$URL" --merge; git checkout -q main; git pull -q
echo "== 6. GHOSTMACHINE sync + backup"; rsync -a --exclude .git --exclude _bak ./ "$GM/"; rsync -a --exclude .git "$GM/" "$BAK_GM/rizal.pw-$(date +%Y%m%d-%H%M%S)-post-$BR/"
echo "== 7. live verify (Pages needs ~1 min)"; sleep 60
curl -s "https://rizal.pw/rdragon-version.json?x=$RANDOM" | head -c 200; echo
echo "merged sha: $(git log -1 --format=%H)"
