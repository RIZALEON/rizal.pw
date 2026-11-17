# iOS companion app starter

Open `RizalFileTransfer.xcodeproj` after generating an Xcode project from these source files, or create a new iOS App project and add `RizalFileTransferApp.swift` and `ContentView.swift`.

## Current scaffold
The SwiftUI screen requests selection of the RKLOWD folder through Apple's document picker and displays the selected folder name. It is deliberately not yet an HTTP server: the server implementation must be added and tested with a maintained dependency/fork before enabling network exposure.

## Required next implementation
- Embed a reviewed HTTP server library (GCDWebServer is BSD-licensed but upstream is archived; maintain a fork or choose a maintained alternative).
- Add token authentication and scoped read/write access.
- Implement `GET /api/health`, `GET /api/files`, `GET /api/download/{name}`, and `POST /api/upload`.
- Add Bonjour service registration `_http._tcp`, local network usage description, and Bonjour service declaration in Info.plist.
- Add strict path canonicalization, file size limits, rate limiting, and upload overwrite confirmation.

## iOS limitation
The app must remain foregrounded for dependable inbound serving. iOS may suspend it in the background. Background URLSession supports app-initiated transfers; it does not keep an inbound server running.
