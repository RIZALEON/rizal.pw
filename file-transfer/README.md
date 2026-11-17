# Rizal.pw File Transfer

The portal frontend is at `index.html` and is intended to be published at `https://Rizal.pw/file-transfer/` by the repository's existing website deployment.

## Architecture
- **Storage:** RKLOWD folder selected on the iPhone using Apple's document picker.
- **Website:** static browser interface in this repository.
- **Local access:** iPhone companion app runs an authenticated HTTP server and advertises `_http._tcp` through Bonjour on the same Wi-Fi.
- **Remote access:** recommended VPS relay. The iPhone makes an outbound encrypted TLS/WebSocket connection; the website communicates with the relay over HTTPS. The relay streams authenticated uploads/downloads to the iPhone.
- **Domain:** Unstoppable Domains DNS continues to point at the website host. Never publish the phone's LAN or mobile IP in public DNS.

## Status
- [x] Frontend committed.
- [x] Architecture and deployment instructions committed.
- [ ] iOS companion app server, authentication, and Bonjour implementation.
- [ ] Remote relay/API implementation and VPS deployment.
- [ ] GitHub Pages/custom-domain publishing verification.
- [ ] iOS app compilation, signing, and on-device testing.

The existing SwiftUI code is a folder-picker scaffold, not yet a working file server. The web upload/download controls require the relay API and iOS agent before transfers will function.

## Security
Use HTTPS, individual high-entropy revocable tokens, read-only/read-write scopes, folder-scoped file access, file-size/rate limits, and path traversal/symlink protection. No anonymous public uploads. iOS background execution is restricted; keep the companion app foregrounded for the initial inbound-serving implementation.

See [DEPLOYMENT.md](DEPLOYMENT.md) and [ios/README.md](ios/README.md).
