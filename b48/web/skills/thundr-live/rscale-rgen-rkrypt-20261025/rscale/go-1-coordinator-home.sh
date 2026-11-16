#!/bin/sh
# GO-1 (Rizal runs this himself on the Neo, after saying GO). Starts RSCALE on the home LAN only.
set -e; [ "$1" = GO ] || { echo "usage: $0 GO"; exit 1; }
B=$HOME/ЯLAB/RFORGE/BONEPILE/COMPONENTS/RSCALE/bin/darwin-arm64; H=$HOME/ЯLAB/RFORGE/RSYNC/rscale
mkdir -p ~/.rscale/server && chmod 700 ~/.rscale ~/.rscale/server
nohup "$B"/rscale-server serve -c "$H/rscale.home.yaml" >> $HOME/ЯLAB/LOGS/rscale-server.log 2>&1 &
sleep 3; curl -s http://192.168.0.113:8080/health; echo
"$B"/rscale-server -c "$H/rscale.home.yaml" users create rizal || true
