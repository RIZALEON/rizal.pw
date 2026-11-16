#!/bin/sh
# Read-only check: binaries + configtest in a throwaway dir. Starts nothing, opens nothing.
B=${B:-$HOME/ЯLAB/RFORGE/BONEPILE/COMPONENTS/RSCALE/bin/darwin-arm64}; H=$(cd "$(dirname "$0")" && pwd)
shasum -a 256 "$B"/rscale-server "$B"/rscaled "$B"/rscale
T=$(mktemp -d); sed -e "s#/Users/rizal/.rscale/server#$T#g" -e "s#listen_addr: 192.168.0.113:8080#listen_addr: 127.0.0.1:18080#" -e "s#stun_listen_addr: 192.168.0.113:3478#stun_listen_addr: 127.0.0.1:13478#" -e "s#policy: {mode: file, path: .*}#policy: {mode: file, path: $H/acl.rsync.hujson}#" "$H/rscale.home.yaml" > "$T/c.yaml"
"$B"/rscale-server configtest -c "$T/c.yaml" && echo "configtest OK (temp state in $T; contains only a throwaway test noise key)"
