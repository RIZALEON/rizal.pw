# Rizal.pw transfer relay specification

The relay is required for reliable remote browser-to-iPhone transfer. The website is static; the iPhone remains the storage source.

## Connection model
1. The iOS companion selects RKLOWD and opens an outbound TLS/WebSocket connection to the relay.
2. It authenticates as a registered device and sends online presence/heartbeat messages.
3. An authorized browser connects to the HTTPS API with an individual bearer token.
4. The relay checks permissions and streams list/upload/download requests through the iPhone's outbound connection.
5. The relay does not store file contents by default; it may buffer bounded chunks in memory.

## API
- `GET /api/file-transfer/health`
- `GET /api/file-transfer/files`
- `GET /api/file-transfer/download/{opaqueFileId}`
- `POST /api/file-transfer/upload` multipart field `file`
- `WSS /device` for the iPhone agent.

## Security
- TLS only; validate device and user tokens independently.
- Never accept a filesystem path from the browser; use server-issued opaque file IDs.
- Support owner, read-only, and read-write roles; revocation must take effect immediately.
- Enforce upload size, request rate, concurrent stream, and idle timeout limits.
- Validate filenames, reject traversal and symlink escapes, and prevent overwrites unless confirmed.
- Log access metadata, not file contents or bearer tokens.
- Restrict browser CORS to the Rizal.pw origin.
- Require explicit user invitation; no public write access.

## Deployment
Run behind a reverse proxy with HTTPS on a VPS. Store only account/device metadata and token hashes. Do not expose the iPhone's private LAN address or advertise its mobile IP in public DNS.

## Status
This document is a specification only. No relay implementation or VPS deployment is included yet.