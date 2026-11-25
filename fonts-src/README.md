# fonts-src — drop a new RFONT TTF here

Updating the site font (after a GO to publish the generator output):

1. Drop the new `RFONT.ttf` (or `RFONT-*.ttf`) in this folder.
2. Run `python3 tools/rfont-publish.py` from the site root (uses fontTools + brotli).
   The script reads the version from the font name table, writes `/fonts/<version>/` (add-only),
   regenerates `/fonts/rfont-feed.json` and `/rfont.css`, and bumps `sw.js` together with `sw-precache.json`.
3. Pages that already include `/rfont-auto.js` pick up the new feed version and load the new faces
   without a full HTML redeploy.

This folder is a source inbox. Old published versions under `/fonts/<version>/` are never deleted.
The feed signature file stays unsigned until Rizal signs it. Bots never sign.
Do not push or merge to main without an explicit GO.
