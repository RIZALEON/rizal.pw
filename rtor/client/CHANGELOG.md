# RTOR GHOSTCHAIN cryptoclient — changelog

## 0.2.2 — Nov 20, 2026 (MT)
- Files table: **Seeding ↑** and **Leeching ↓** columns side by side for every file, both always ON (no off state).
- Rates are measured from real byte counters over a 10 s window. Idle shows 0 B/s and says why. Nothing is estimated.
- Always-on keepalive per file: seed and leech run at 1.5 KB/s each way. Any configured throttle is floored at 1 KB/s.
- LAN peers: every RTOR listens on port 4985 (LAN only, uploads accepted only if the SHA-256 matches). Peer order Neo → Pixel → Moto; connects the moment it starts, re-checks every 15 s.
- Fallbacks: public RTRACKR (rizal.pw/rtrackr, download-only) when it lists the file's SHA-256, then the device's own drop folder.
- RTRACKR backside: the same RTOR runs on the Neo (launchd, starts at login) as the receiving peer.
- Autostart: Ubuntu Touch `rtor-ghostchain.service` (systemd --user, restarts itself); Android foreground service + start-at-boot.
- RE-SEED panel reads the live RGHOSTCHAIN every 60 s and clears to "RGHOSTKEY sealed · block 6" only when a properly signed block 6 meeting every seal condition is on the chain. A Face ID approval file alone only shows "pending Face ID".
- One-tap ADD RGHOSTCHAIN (accepted only if SHA-256 = 92d1572a…e81e37).
- Measured Nov 20, 2026 10:29 PM MT: Pixel ↔ Neo about 3 KB/s each way per file, every pass SHA-256 verified.
- Unsigned builds. The Android APK installs only after Rizal signs it.

## 0.2.1 — Nov 20, 2026
- ADD RGHOSTCHAIN one-tap button; Pixel ЯID-0026-C7MD drop space.

## 0.2.0 — Nov 20, 2026
- Android APK, Xcode RTORKit component + standalone app, Ubuntu Touch click; opens .rzl, crypto, .rtor and magnet files.
