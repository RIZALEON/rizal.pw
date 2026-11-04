#!/bin/bash
# Installs rns/lxmf/nomadnet in a venv and stages the config. Does NOT start anything.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
VENV="$HOME/.rlab-reticulum/venv"
python3 -m venv "$VENV"
"$VENV/bin/pip" install --upgrade pip rns lxmf nomadnet
mkdir -p "$HOME/.reticulum"
if [ -f "$HOME/.reticulum/config" ]; then
  echo "Existing ~/.reticulum/config kept; template at $HERE/config.template"
else
  cp "$HERE/config.template" "$HOME/.reticulum/config"
fi
sed "s#__VENV__#$VENV#g; s#__HOME__#$HOME#g" "$HERE/com.rlab.rnsd.plist.template" > "$HOME/.rlab-reticulum/com.rlab.rnsd.plist"
echo "Done. Start manually:  $VENV/bin/rnsd -v"
echo "Optional autostart:    cp ~/.rlab-reticulum/com.rlab.rnsd.plist ~/Library/LaunchAgents/ && launchctl load ~/Library/LaunchAgents/com.rlab.rnsd.plist"
