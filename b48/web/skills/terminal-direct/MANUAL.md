# Terminal Direct — MIND MANUAL entry (seed)

## What
Gives DRAGON SKULL direct use of:
1. **Neo Terminal** — `open -a Terminal` and allow-listed `hostexec` through ds-hostd on Neo (:8320).
2. **ЯVM terminal** — the in-page RISC-V Linux RVM (`skills/rvm-linux`), same as `/rvm`.

## How the model uses it (no typed command required)
Emit one of these markers in a reply (the web skill runs them after the reply):
- `[[term:open]]` — open Terminal.app on Neo
- `[[term:exec uname -a]]` — run an allow-listed command on Neo
- `[[rvm: boot]]` / `[[rvm: uname -a]]` / `[[rvm: stop]]` — ЯVM

Or call `window.DS_TERM.*` from the web console.

## Safety still on
- ds-hostd **allow-list** still blocks anything not listed.
- `hoststop` + Ctrl+Opt+Cmd+H still kill the bridge.
- Hash of every bridge write is logged add-only in `bridge.rscribe.jsonl`.
- No Face ID / approved.json step for delivering this skill (Decider DIRECT 2026-10-20).
- Never prints keys or tokens. Does not touch ЯCASKET/signing/private.

## Setup on Neo (once)
1. Install staged `host-allow.json` + `ds-hostd.py` (see APPLY.md).
2. Restart ds-hostd.
3. In Mac DRAGON SKULL web console: `DS_TERM.setNeo("[lan-ip]")` (or current LAN IP).
4. Test: `DS_TERM.openTerminal()` then `DS_TERM.rvmBoot()`.


## 0.2.0 — TERMINALTYPE (2026-10-20)
`TERMINALTYPE <any command>` in chat → ds-hostd `POST /hosttype {cmd}` → `osascript: tell application "Terminal" to do script "<cmd>"`. Opens Terminal on Neo, types the command and runs it in a new window. Respects hoststop. Model marker: `[[term:type <cmd>]]`. API: `DS_TERM.terminalType(cmd)`.
