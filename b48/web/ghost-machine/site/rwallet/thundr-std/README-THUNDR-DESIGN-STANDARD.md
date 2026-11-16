# ThundR Design Standard

**THUNDR-DESIGN-STANDARD-20261111** · version 1.0.0 · 11 November 2026

This is the visual standard for every app, the website, RVM, LINUX RIZAL,
Android, and iOS. Colors were sampled from the 17e running ENGINE 1.0.4.35
through 1.0.4.37. Open `specimen/index.html` in a browser, offline, to
see the live specimen.

It is a template pack. Applying it to a live seat is a later signed
incremental update, not a complete rebuild.

## The look

Black twilight (`#000000`) with a sparse starfield — mostly white stars,
some phosphor green, a few dim purple, occasional plus-shaped glints.
Phosphor green `#39FF14` for chat, outlines, and the composer. Action
purple `#8A2BE2` (CSS BlueViolet) for Send, the user-bubble border, the
selected EN key, and return. ENGINE reads `#66CC66` when healthy and
`#EF4444` when it is alerting. The GHOSTMACHINE tab is `#117733` with
mint lettering `#CCFFEE`. Full values are in `tokens/thundr-design-tokens.json`.

RFONT is the named UI face. The official file is not in this pack; drop
it into `fonts/` as `RFONT.ttf` or `RFONT.otf`. Fallbacks shipped here
are VT323 (chat), IBM Plex Mono (keys), Press Start 2P (pixel wordmarks),
and Noto Sans Tagalog (Baybayin). See `fonts/LICENSES.md`.

## Chrome rules

- Header: green hamburger, app name in `#EEEEEE`, DRAGONSKULL portrait,
  ENGINE, version.
- User bubble: purple rim, fill `#1A0630`, ThundR sprite, `You: …`.
- Bot bubble: green rim, fill `#0A0A0A`, gold `ThundR · idle` (or awake)
  on the top-left rim.
- ThundR · iOS panel is optional and stays on top of the log. ThundR
  never approves by itself. Approve opens Face ID on a hard device.
- GHOSTMACHINE is a vertical tab on the right edge.
- Composer: `+`, `R:\> Message your bot`, purple Send. RBOARD opens on
  focus.
- **No row of CHAT, ASSM, RMAIL, ЯWALLET, or >ThundR buttons above the
  composer.** Those seats remain as functions, reached from the hamburger
  menu and the GHOSTMACHINE tab. (Owner, 11 November 2026, about 11:05 PM
  Mountain Time.)

RBOARD matches `assets/icons/rboard-reference.jpg`: purple frame, green-
outlined black keys, white letters, green Baybayin superscripts, purple
return and selected EN, blue globe, wide RBOARD space, `R:\>` block
cursor. It types into a local field only. Return never signs.

## LINUX RIZAL

This twilight look replaces the older gold bezel for LINUX RIZAL going
forward. The bezel assets themselves stay. Do not delete them.

The older YA-DESIGN-TOKENS-0.1 Stormclay pack is superseded for look.
Those files also stay.

## What's in the pack

```
tokens/thundr-design-tokens.json   colors, type, metrics, chrome
css/thundr-standard.css            shell, bubbles, panel, composer
css/rboard.css                     RBOARD
js/starfield.js                    twilight
js/rboard.js                       RBOARD (local input only)
fonts/                             fallbacks + LICENSES.md
assets/sprites/thundr.png          78×78, transparent
assets/sprites/rdragon-portrait.png
assets/icons/                      ЯWALLET, GHOSTMACHINE, RBOARD photo
specimen/                          live offline HTML
platforms/android-colors.xml
platforms/APPLY.md                 how a later update may carry this
```

## Law

Updates are signed and incremental. They may add functions and may not
remove them. This pack does not sign, does not read keys, and does not
change a running RVM or store build by itself. See `platforms/APPLY.md`.
