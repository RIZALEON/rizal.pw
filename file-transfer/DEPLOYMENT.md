# Deploy Rizal.pw File Transfer

## Current repository
The portal frontend is committed in `RIZALEON/rizal.pw` at `file-transfer/index.html`. The intended URL is `https://Rizal.pw/file-transfer/`, provided the existing site deployment publishes repository subdirectories. The root site was not replaced.

## Website and DNS
- GitHub hosts the source code. GitHub Pages or the repository's existing hosting pipeline can serve the static portal.
- A subdirectory such as `/file-transfer/` requires no separate DNS record.
- Keep existing Unstoppable Domains DNS records unchanged. Do not repoint the domain or publish the iPhone IP.
- Confirm GitHub Pages/custom-domain configuration and HTTPS before announcing the URL.

## File storage and connectivity
The RKLOWD folder remains on the iPhone. The iOS app must obtain folder permission through Apple's document picker.

Local Wi-Fi: the iOS app runs an authenticated HTTP server and advertises `_http._tcp` using Bonjour. This is for same-LAN discovery only.

Remote access: use a VPS relay. The iPhone companion initiates an outbound TLS/WebSocket connection to the relay; the website calls the relay over HTTPS. The relay authenticates invited users and streams file operations to the connected iPhone. This avoids carrier NAT and browser mixed-content problems. NetBird may be used for private administration or peer testing, but do not assume inbound connections to an iPhone work on every carrier/network.

## Required relay API
- `GET /api/file-transfer/health`
- `GET /api/file-transfer/files`
- `GET /api/file-transfer/download/{opaqueFileId}`
- `POST /api/file-transfer/upload` (multipart `file`)
- authenticated WebSocket for iPhone agent registration and streaming transfer messages.

The relay must not persist file contents by default. Add per-user tokens, revocation, read-only/read-write scopes, upload size limits, rate limits, audit events, and strict opaque file IDs.

## iOS build
The SwiftUI folder-picker scaffold is in `ios/`. It is not yet a complete server or a signed installable app. Build/signing requires Xcode on a Mac. iOS may suspend apps in the background; the initial version should clearly require the app to remain open while serving files.

## Unstoppable Domains
Only configure DNS if changing the current site host. Use the current DNS values from the hosting provider's official setup instructions. Never point DNS at a private LAN address or a changing mobile IP.
