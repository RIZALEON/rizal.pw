# Applying the ThundR Design Standard

This pack is the look and interface for every app, the website, RVM,
LINUX RIZAL, Android, and iOS, going forward. It is a template. It
does not restyle a live build by itself.

## How it may land

- Signed incremental updates only. No complete rebuilds.
- An update may add functions. It may not remove them.
- Face ID alone signs, on a hard device. This pack never signs.

## Chrome that changed

The row of CHAT, ASSM, RMAIL, ЯWALLET, and >ThundR buttons that sat
just above the composer is not part of this standard and must not be
drawn. Those seats are still there as functions. Reach them from the
hamburger menu and from the GHOSTMACHINE tab (the vertical tab on the
right edge stays).

The composer stays: `+`, `R:\> Message your bot`, and the purple Send
button. RBOARD opens when the field is focused.

## LINUX RIZAL

Use this twilight look, not the older gold bezel. The bezel assets
stay on disk. Do not delete them.

## RFONT

Place the official `RFONT.ttf` or `RFONT.otf` in `fonts/`. Until then,
chat and terminal fall back to VT323, keys to IBM Plex Mono, pixel
wordmarks to Press Start 2P, and Baybayin to Noto Sans Tagalog. Those
are fallbacks, not RFONT.

## Files to take

| Seat | Take |
|---|---|
| Web, RVM WebView, LINUX RIZAL | `css/thundr-standard.css`, `css/rboard.css`, `js/starfield.js`, `js/rboard.js`, `fonts/`, `assets/` |
| Android (native colors) | `platforms/android-colors.xml`, plus the same CSS/JS if the seat is a WebView |
| Tokens for any seat | `tokens/thundr-design-tokens.json` |
| Live check | Open `specimen/index.html` offline |

## What not to do from this pack

- Do not push this look into a running RVM or a live store build as a
  full restyle tonight. Wait for a signed incremental update that
  carries only the pieces it changes.
- Do not print or read signing keys.
- Do not copy live bind IDs into a shareable specimen. The specimen
  uses placeholder copy only.
