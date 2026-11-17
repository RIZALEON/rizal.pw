# STAGED: full RWALLET v6 (0.1.5) behind ASSM sign-in, for rizal.pw and rizal.info

Prepared 2026-11-16 (America/Denver) for Rizal's t264u: "regarding the website they get full build wallet of course only accessible when logged in".
**Nothing was pushed, deployed or published.** Publishing needs Rizal's own separate go.

## What is in this folder (add-only overlay on the site root)
| Path | What |
|---|---|
| `wallet/index.html` | New page. Logged-out visitors get a sign-in prompt. After ASSM sign-in as @chaserizal (ЯID-0001-3QQS) it opens the full wallet. |
| `wallet/rassm-site-gate.js` | The gate. It uses the same ASSM sign-in RCODE uses (ASSMKit ASSMProvider, ported from rsync-core.js): this browser's own non-extractable P-256 device key, a signed `device.request`, then `POST /api/rsync/request` returns an 8-digit code that Rizal approves on a trusted device. The gate then polls `GET /api/rsync/device-status?pub=` until the key is enrolled to the owner profile or is trusted. It also accepts a same-origin ЯLOGIN session for @chaserizal (rizal.pw `/login`). |
| `rwallet-v6/` | Copy of `APPS/RWALLET-V6-UNIFIED-20261116/rwallet` (0.1.5). In this copy only, the LAN host and IP entries in `rmint-transport.js` were removed (backup in `SITES-STAGED/BACKUPS-20261116-assm-signin/`). So `RWALLET.sha256` in this copy needs regenerating, which is RBOT's item. |

Existing site files were not changed. Linking `/wallet/` from the site menu is a one-line edit, left for publish time.

## Read this first: a client-side gate is not real protection
Both sites are static GitHub Pages. Any file there can be fetched by anyone who knows its URL, including `/rwallet-v6/*`. The gate hides the wallet UI. It does **not** protect it.
- The page holds **no secrets**: no private keys, passwords, tokens, vault data or LAN addresses.
- Every signature (mint, trade, swap, buy, sell, device approvals) stays on Rizal's own device, in RWALLET/RGHOSTKEY behind his single unlock. The site never signs.
- `assm-server-url` is the placeholder `https://ASSM_SERVER_URL`. Until the real server is live, only the ЯLOGIN path works, and only on rizal.pw.

## What a real server-side gate needs (this is the ASSM server item)
1. An always-on ASSM-RSYNC host (KROG-ASSM-SERVER-PACK `server/`: VPS + Caddy TLS, `assm-rsync.service`). It needs Rizal's go and no tunnels.
2. A session endpoint: after `device-status` shows the device is enrolled to the owner profile, the server issues a short-lived HttpOnly, Secure, SameSite=Strict cookie bound to that device key, with a signed nonce challenge on every session start.
3. The wallet bundle served **only** by that server, behind the session check (for example Caddy `forward_auth` to `/api/rsync/session/check`), and **not** from GitHub Pages. The static sites then hold just the sign-in page and a link.
4. Server-side rate limits, plus audit entries appended to the RSYNC log.
5. `trusted-devices.json` kept on the server, edited only by Rizal.

## Note for SCRIBE's pack
In `clients/web/assm-web-client.js`, `owner.deviceStatus()` sends `?device=`, but `server.py` reads `?pub=`. It returned 400 in a local test on 2026-11-16. These files use `?pub=`.
