# Security notes

- This is an early prototype. Do not expose it directly to the public internet.
- The HTTP bearer token is sent in cleartext on plain HTTP. Use only on a trusted LAN or encrypted private overlay until TLS/relay support is implemented.
- The iOS app must keep the selected folder's security-scoped access alive for the server lifetime; this prototype needs lifecycle hardening and persistent bookmark handling before real use.
- Add file size limits, upload quotas, per-user scopes, audit logs, rate limiting, CORS allowlisting, and robust path canonicalization before production.
- iOS background suspension means inbound serving is not guaranteed while the app is backgrounded.
- Never commit access tokens, private keys, provisioning profiles, or personal files.
