# ASSM rsync feed (`/api/rsync`)

Public, read-only feed that RCODE's ASSM sign-in polls for device approvals.
rizal.pw is GitHub Pages (static files only), so this folder is a **static mirror**.
Live approvals happen on the ASSM rsync API (the `live` URL below), which runs on Rizal's Mac.

## URLs
| URL | Content-Type | Notes |
|---|---|---|
| `https://rizal.pw/api/rsync/entries` | application/octet-stream | Path RCODE polls by default (`ASSMEnrollEntriesPath`). Same JSON as below. |
| `https://rizal.pw/api/rsync/entries.json` | application/json | Same JSON, correct content type. |

## Schema (version 1)
```json
{
  "version": 1,
  "mode": "static",
  "updated": "2026-11-16T07:40:00Z",
  "live": "https://<live-api-host>" ,
  "entries_path": "/api/rsync/entries",
  "entries": []
}
```
- `version` — schema version (integer). Clients must ignore unknown fields.
- `mode` — `"static"` here; the live API answers the same shape with `"mode": "live"`.
- `updated` — ISO-8601 UTC time this file was last written.
- `live` — base URL of the live ASSM rsync API, or `null` when it is off. Clients that cannot reach their configured live URL read this field to discover the current one (quick-tunnel URLs change when the tunnel restarts).
- `entries` — sealed rsync entries (see `rdragon-cryptosocial/rsync-core.js`). Only `device.enroll` approvals are published:
  `{id, t:"device.enroll", profile, device, nonce, req_ts, req_sig, device_name, ts, signer, cid, rgen:{scope, msg, pub, value}}`.
  `device` and `rgen.pub` are **public** P-256 keys; `req_sig` / `rgen.value` are signatures. Clients must verify them; this file is not trusted on its own.

## Rules
- Public data only: no private keys, tokens, passwords, device UDIDs/serials, or personal contact info.
- Approvals are signed by an ACTIVE trusted ASSM device on Rizal's own devices. Bots never sign.
- The static mirror is normally empty; live approvals expire after 5 minutes and do not need to be mirrored.
