TERAFORMR CRYPTOGAME — Linux, current build AS IS (2026-11-22)
================================================================

WHAT THIS IS
------------
The TERAFORMR CRYPTOGAME space exactly as it stands now, as ONE
self-contained HTML file: the playable demo at the top plus the full
site page under it. Everything is inlined into the single file —
24 assets, no external dependencies, works fully offline.

  File:   teraformr-cryptogame.html
  Size:   6,825,394 bytes
  SHA256: 31d8f4622aecd9fe63af6897e0c47c0da8a6fa05a001c44cbabe52a14ad381b7

The demo inside is a hand-written JavaScript re-creation of one slice
of TerraformR, drawn with the game's REAL art extracted from the
verified b33 pack (TERAFORMR 0.5.1.21-b33-village-market-20261121):
the genuine tiles.png atlas, REZAL's real sprite, the crashed UFO,
the BOTLATCH portal, and the game's own joystick art. It is not
Godot and it is not the .pck — the real game is the 54.7 MB b33 .pck,
which runs under Godot 4.7.2.

INSTALL
-------
There is no install. The file IS the app.

1. Copy teraformr-cryptogame.html onto the Linux device any way you
   like — this zip, USB, download, or an RTOR load.
2. (Optional) verify it arrived intact. In a terminal, in the folder
   holding the file:

       sha256sum teraformr-cryptogame.html

   The sum must read:
       31d8f4622aecd9fe63af6897e0c47c0da8a6fa05a001c44cbabe52a14ad381b7

OPEN IT
-------
Any modern browser on Linux opens it (Firefox, Chromium, Chrome,
Brave). Pick one:

A. File manager: double-click teraformr-cryptogame.html.

B. Terminal:
       xdg-open teraformr-cryptogame.html
   or name your browser:
       firefox ./teraformr-cryptogame.html
       chromium ./teraformr-cryptogame.html

C. Local server (best if your browser restricts full-screen on
   file:// pages). In the folder holding the file:
       python3 -m http.server 8000
   then open in the browser:
       http://localhost:8000/teraformr-cryptogame.html
   Stop the server with Ctrl+C when done.

PLAY THE DEMO
-------------
- Two touch sticks on the game screen, Terraria-style, and only
  these two: LEFT stick moves REZAL (push up to jump, up again
  mid-air for the double jump, down to climb down / drop through);
  RIGHT stick carries the equipped tool — push it to aim and use
  the tool that way (dig, place, plant, harvest, real 5-tile reach).
- Mouse works too: drag the sticks, or click a tile directly.
- Keyboard (desktop): A/D or arrow keys move · W / Up / Space jump ·
  S / Down down · keys 1-0 switch the equipped item (shown on the
  right stick).
- FULL WIDE SCREEN button on the screen (or double-click it): the
  demo goes full wide screen and auto-rotates to landscape,
  following your device; Esc or the same button exits.
- MERKADO trades are DRY-RUN: they write to the demo's SHA-256
  hash-chained ledger at the real 100 RCOIN = 1 RTOKEN pair
  (100/day cap) and never touch a real wallet.

ALSO IN THIS BUNDLE — RENJIN, MOST UP TO DATE
---------------------------------------------
The folder renjin-complete-build/ carries the current RENJIN build,
verified byte-for-byte identical to the newest on GitHub
(checked 2026-11-22):

  Model:   Core v3 — renjin/src/yaseed-core-v3.js (78,999 B)
  Store:   renjin/src/store-v3.json (549,222 B, sha256 e2fb3c5c…)
  Corpus:  corpus-v2, 162 lessons · knowledge base 45 entries
  Shells:  rshell/RSHELL-RENJIN.html (753,708 B) and the minimized
           rshell/RSHELL-RENJIN-MIN.html (706,318 B)
  Chain:   RGHOSTCHAIN height 5 · 6 blocks · 7 assets

Open the shell on Linux the same way — any browser:
    xdg-open renjin-complete-build/rshell/RSHELL-RENJIN.html
or serve the folder:  python3 -m http.server 8000
    http://localhost:8000/rshell/RSHELL-RENJIN.html
A Linux seat for the RCODE host ships inside the build at
renjin/adapters/linux/ (see RCODE-LINUX-SEAT.md and run.sh there).

NOTES
-----
- Fully offline: once you have the file, no network is needed.
- Nothing is saved between opens except what your browser keeps;
  each open starts the demo fresh at Day 1.
- This is a snapshot of the build as of 2026-11-22. Later edits to
  the space do not change this file.
