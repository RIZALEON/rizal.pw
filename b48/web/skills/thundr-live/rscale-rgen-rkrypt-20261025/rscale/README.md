# ЯSYNC over RSCALE/RVPN + ЯNETWORK (staged 2026-10-25, nothing started)
Own components only: rscale-server (Headscale v0.29.5 fork), rscaled/rscale (RSCALE client, patched: no Tailscale log/control defaults), RDERP 901, rrelay, rsync-core/transponder/relays, plain node.
- Coordinator: Neo, home LAN (rscale.home.yaml). Away-from-home needs ONE publicly reachable host running rrelay hub (double NAT); Neo rrelay agent dials out.
- Apps (ЯBOT/ЯBOWZR/DRAGON SKULL) → http://neo.rscale.rlab:8799 over the mesh (in-app rscale-embed / rscalemobile, not built yet).
- Browser (rizal.pw) → only with a system-level mesh tunnel + a publicly trusted cert (see tls-front.js). Not available on iPhone without an in-app VPN (paid ADP).
- ACL: acl.rsync.hujson (tested: seat → 8799 only).
Steps: check-staged.sh (safe) → go-1 → mint key (his terminal) → go-2 → go-3 (Pixel) → phones (in-app builds).
