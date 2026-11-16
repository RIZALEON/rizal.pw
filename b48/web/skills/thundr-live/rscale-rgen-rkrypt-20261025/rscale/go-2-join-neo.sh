#!/bin/sh
# GO-2 (Rizal, Neo terminal). Joins the Neo as neo.rscale.rlab with RSCALE's own client (rscaled, userspace).
# Mint the key yourself first:  rscale-server -c rscale.home.yaml preauthkeys create --user <id> --expiration 15m
# The key is read silently here, used once, never written anywhere.
set -e; [ "$1" = GO ] || { echo "usage: $0 GO"; exit 1; }
B=$HOME/ЯLAB/RFORGE/BONEPILE/COMPONENTS/RSCALE/bin/darwin-arm64; S=$HOME/.rscale/neo; mkdir -p "$S" && chmod 700 "$S"
nohup "$B"/rscaled --tun=userspace-networking --socket=$S/rscaled.sock --statedir=$S --port=41741 --socks5-server=127.0.0.1:1055 >> $HOME/ЯLAB/LOGS/rscaled.log 2>&1 &
sleep 2; printf "pre-auth key (hidden): "; stty -echo; read K; stty echo; echo
"$B"/rscale --socket=$S/rscaled.sock up --login-server http://192.168.0.113:8080 --auth-key "$K" --hostname neo; unset K
"$B"/rscale --socket=$S/rscaled.sock status
