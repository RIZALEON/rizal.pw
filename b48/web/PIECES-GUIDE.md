# DRAGOSKUL UI PIECES GUIDE (DS-IDs)
For: DRAGOSKUL (the app bot) and RBATIBA (the user). Pack: dragoskul-ui-pack 2026-10-23.

## 1. The registry: components.json
`components.json` is one JSON array. Each row is `[ID, Name, What it does, File, States]`.
- **ID** is permanent. Never reuse or rename an ID. To retire a piece, mark it `(retired)` in its Name and keep the row.
- **File** is where the piece's behavior lives. All looks live in `ds-components.css`, and all colors live in `theme.css`.
- **States** are the values the piece can show, either via `data-state` (chips) or via classes/aria (`aria-current`, `ds-nav-open`, `ds-nav-collapsed`, `[disabled]`).
The README legend table and the demo labels both come from this file. Edit this file first.

## 2. How one DS-ID maps to HTML, CSS and JS
| Layer | How to find it |
|---|---|
| HTML | `data-ds-id="DS-XXX-NN" data-ds-name="Name"` on the element (scout.html / demo.html). Legacy ids are kept: #roster #log #composer #message #ds-status #ds-mind #ds-net #ds-db2 #ds-gate #ds-estop |
| CSS | `ds-components.css` has a comment header `/* DS-XXX-NN Name */` above the class (`.ds-nav`, `.ds-bar-top`, `.ds-chip`, `.ds-btn`, `.ds-log`, `.turn`, `.ds-qcmd`, `.ds-input`, `.ds-field`, `.ds-gate`, `.ds-tabs`, `.ds-scrim`) |
| JS | `ds-components.js` selects pieces with `[data-ds-id="…"]`, never by position. `ds-history.js` is DS-HIST-01 and tags turns DS-MSG-01/02 |
To find every use: `grep -rn "DS-CHIP-03" web/`.

## 3. Assembling a layout
The page is a CSS grid on `body.ds`, with these areas:
- `nav` (DS-NAV-01)
- `bar` (DS-BAR-01)
- `log` (DS-LIST-02)
- `qcmd` (DS-BAR-04)
- `input` (DS-BAR-03)
- `gate` (DS-BAR-02)
- `tabs` (DS-NAV-02, mobile only)

To build a new layout:
1. Copy the pieces you want from `demo.html`. Each piece is one element with its `data-ds-id`.
2. Rearrange the areas with `grid-template-areas` inside a media query in a new file, e.g. `ds-layout-<name>.css`, loaded after ds-components.css.
3. Breakpoints: ≥901px means a docked sidebar. ≤900px means a drawer and scrim. ≤600px means the tab bar, 44px tap targets and a sticky input.

## 4. Editing pieces
- **Colors and fonts:** change only the variables in `theme.css` (`--ds-accent`, `--ds-blue`, etc.). For a new theme, add a `[data-ds-theme="name"]{…}` block, then add the name to the DS-BTN-06 toggle in ds-components.js.
- **Add a button:** `<button class="ds-btn" type="button" data-ds-id="DS-BTN-08" data-ds-name="My Button">Label</button>`. Use the variants `.primary`, `.plus`, `.stop` or `.icon`. Wire it in JS with `document.querySelector('[data-ds-id="DS-BTN-08"]').onclick=…`.
- **Add a chip:** `<small class="ds-chip" data-ds-id="DS-CHIP-07" data-ds-name="X" data-state="warn">X</small>`. In `poll()`, add `get("/path").then(j=>set("DS-CHIP-07", ok?"ok":"warn")).catch(()=>set("DS-CHIP-07","err"))`. Chips must use GET only.
- **Add a quick command:** add `<button class="ds-btn" type="button" data-cmd="TEXT" data-ds-id="DS-QCMD-06" data-ds-name="TEXT">TEXT</button>` inside DS-BAR-04. It submits through #composer, so existing gates still apply. Never add a command that bypasses the Approval Gate.
- After any change, add or update the row in components.json and the README legend.

## 5. Naming rules for new IDs
- Format: `DS-<TYPE>-<NN>`, where NN is two digits and the next free number.
- Types: THEME, BAR, BTN, CHIP, NAV, LIST, MSG, FLD, ROW/QCMD, OVL, HIST, SW, FIX.
- Each ID is unique, and the same string is used in data-ds-id, the CSS comment header, components.json and the README.
- Names are short Title Case words. Never reuse a retired number.

## 6. Test and roll back
- **Test:** open `demo.html?labels=1` (or press 🏷) and check that every piece shows its tag. Then check http://127.0.0.1:8319 at widths of 1280 and 390, and confirm history still loads (`GET /api/history?since=0`).
- **Not part of this pack:** DRAGONGATE, dragonbridge.js and the gate/estop logic. Never edit them from here.
- **Backups:** the format is `<file>.bak-YYYYMMDD-HHMM`. Never overwrite an existing backup.
- **Roll back:** copy each `.bak-*` back over its file, then reload or relaunch. The pack's own new files (theme.css, ds-components.*) can stay, because nothing loads them once scout.html is restored.

## 7. In the installed app
- `ds-app.css` (DS-APP-00) adapts the pack to the real scout.html (aside#roster + main).
- The existing `#ds-menu-btn` (ds-mobile.js) is DS-BTN-05, and `#rbs-plus` (bot-sidebar) is DS-BTN-02.
- `ds-components.js` tags the elements dragonbridge.js injects (#ds-mind, #ds-net, #ds-db2, #ds-gate, #ds-estop) with classes and IDs only; their handlers are unchanged.
- Re-apply the patch idempotently with `python3 patch_scout.py <web>/scout.html`.
