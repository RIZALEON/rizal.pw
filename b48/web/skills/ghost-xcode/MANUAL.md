# L063 · Ghost cursor + Xcode commands · 2026-10-24 02:46 MT
Stamp: ЯID-0003-P4M6 · ЯМАХ. For DRAGOSKUL and ThundR (all seated bots read). Decider: Rizal ЯID-0001-3QQS (said YES 2026-10-24).
Taught the same way as XCODE / TERMINAL / TERMINALTYPE (L-file + COMMANDS-MASTER + manual line + egg piece).

## Commands (type in DRAGOSKUL chat, ThundR chat, or POST 127.0.0.1:8319/api/ds/cmd {"text": ...})
| command | does | ds-hostd :8320 |
|---|---|---|
| XCODE / TERMINAL | open the app | /hostapp {sub:open} |
| TERMINALTYPE <cmd> | type and run in Terminal | /hosttype {cmd} |
| GHOST CURSOR X Y | move the cursor, no click | /hostmouse {sub:move,args:[x,y]} |
| CLICK [LEFT|RIGHT] | click where the cursor is | /hostmouse {sub:click} |
| GHOST CLICK X Y [RIGHT] | move, then click | both |
| PRESS BUTTON <name> IN <app> | click a named *button* (not menus) | /hostui {app,button} |
| KEY <combo> | shortcut, e.g. cmd+shift+n | /hostkey {sub:shortcut} |
| TYPE <text> | type ≤500 chars | /hostkey {sub:type} |
| MENU <app> > <Menu> > <Item> | mapped menu items → shortcut (Xcode File>New>Project = cmd+shift+n) | /hostkey |
| SHOT | screenshot → ~/ЯLAB/HANDOFF/shots/*.jpg (small) | /hostshot |
| XNEW <name> | XCODE → wait → KEY cmd+shift+n → SHOT → STOP at template chooser | macro |
| GHOST LOG | last 12 steps | — |

## Rules
- One bot on the Neo keyboard at a time. Don't drive while Rizal is typing (input idle under 45s).
- Never delete anything, never sign, never publish. XNEW stops at the template chooser; finishing a project is a separate, reviewed step.
- Every step logs ok/FAIL to ~/ЯLAB/HANDOFF/shots/ghost-log.jsonl. A step that can't reach ds-hostd retries once after 2s, and that retry is logged too. The ThundR STATUS inline bar shows ghost steps and XNEW progress. No pop-ups.
- Not yet supported: real menu clicks (proposed ds-hostd /hostmenu), XBUILD, XRUN.
- Code: DRAGOSKUL bin/ghostcmd.py (reloaded per call). Hooked from dscmd.py and ThundR thundr_chat.py.
