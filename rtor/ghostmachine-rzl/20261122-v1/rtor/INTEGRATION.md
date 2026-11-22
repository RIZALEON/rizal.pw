# RSYNC · RTOR · PIXEL-UBUNTU — integration (RZL SYSTEMS, 2026-11-21)

Owner's ask: "integrate RSYNC Rtor and the actual UBUNTU OS ON PIXEL VIA RTOR."
Found way, built on the stream's own architecture — no new doors.

## The three layers
- **RTOR is the stream.** Its index is the feed (rizal.pw/rtor/feed.json);
  its public transport is HTTPS from the website — the feed itself says so:
  seeders.network = "website is the only public endpoint; no tunnels, no
  public DHT or trackers". The mesh (Neo :8977/:8978, device peers) rides
  behind that endpoint.
- **RSYNC is the sync method.** Not the rsync daemon — rsync semantics:
  a sha256-pinned manifest (the feed), compare local vs pin, transfer only
  the delta, verify every byte against its pin before it lands. This is
  the pattern the 2026-11-19 RSYNC test proved (28/28 files matched pins).
  Client: `rsync-rtor.sh` (this folder) — portable bash, runs on this VM
  and unchanged on the Pixel's Ubuntu Touch (bash + curl + sha256sum).
- **The Pixel's Ubuntu OS is the endpoint client.** Pixel = peer
  rtor-linux-ubuntu-phablet (RTOR 0.2.5, node rklowd.pixel, reachable in
  the mesh). Its client leeches feed entries over the website endpoint and
  pin-verifies them — the same check rsync-rtor.sh runs.

## The two legs
- **Down (VM -> Pixel):** publish a file into the webseed tree
  /rtor/<app>/<version>/ in the rizal.pw repo + a feed entry carrying its
  sha256 pin. The Pixel's next leech picks it up and verifies it.
  FIRST DROP (2026-11-21): RPULL itself — rtor/rpull/20261121-v1/rpull.sh,
  feed entry 31 `rtor.rpull-ubuntu-touch`. The stream delivers the tool
  that pulls the stream's verified site out of UD.
- **Up (Pixel -> VM):** the Pixel seeds its files/reports into the mesh;
  what reaches the website seat (feed, rtrackr data, live reports) is what
  this VM reads and pin-verifies over HTTPS. Pixel-specific report seats
  surface in the RTOR files list when the Pixel publishes them.

## Honest limits
- This VM cannot join the swarm directly (proven 2026-11-21: Kubo daemon
  bootstrap found 0 peers — the sandbox blocks raw peer connections).
  HTTPS to the website endpoint is the VM's lane, and it is the stream's
  own public lane, not a workaround.
- The last hop — the Pixel's client actually leeching a drop — is
  confirmed on the Pixel's screen or by its next live report, not from
  this VM.
- Feed entries added from here (30, 31) wash out at Neo's next feed
  regeneration unless seated in make-feed.cjs inputs; entry JSON packets
  are kept in ~/workspace/your_files/rbowzr/ for Neo. The feed header's
  webseed.status still reads "not published" (builder-owned field) even
  though the tree now serves its first file.
