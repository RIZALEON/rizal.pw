# Rizal.pw File Transfer

Open the portal at `https://Rizal.pw/file-transfer/` after GitHub Pages publishes this repository.

## What is included
- `index.html`: browser portal for connecting to the iPhone companion server.
- `ios/`: SwiftUI starter project source and setup notes.
- `DEPLOYMENT.md`: GitHub Pages, DNS, and safe remote-access instructions.

## Architecture
The iPhone remains the source of truth for files in the user-selected RKLOWD folder. The website is only a static client; it cannot directly read iPhone storage. The iPhone companion app must be running in the foreground to accept inbound HTTP requests. Bonjour advertises the service on local Wi-Fi. For remote authorized users, use a private overlay such as NetBird and test inbound peer reachability on the actual iPhone. Do not publish the phone's IP in public DNS.

## Status
This is an initial source scaffold. It has not been compiled, signed, installed, or connected to the live iPhone. A Mac with Xcode is required to build and sign the iOS app. iOS background execution restrictions mean the inbound server is not guaranteed to remain available when the app is suspended.

## Security
- Do not expose the iPhone server to the public internet.
- Use per-user high-entropy bearer tokens and read-only/read-write scopes.
- Restrict CORS to `https://Rizal.pw`.
- Canonicalize all paths and prevent traversal/symlink escapes.
- Use HTTPS for the portal and a private encrypted network for remote access.
