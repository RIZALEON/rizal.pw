# Rizal.pw iPhone File Transponder

Experimental iOS companion app + web portal for sharing only a user-selected RKLOWD folder. This branch is isolated from the existing site.

## Features in this starter
- SwiftUI folder selection through Files document picker.
- Embedded HTTP server with bearer-token protection.
- File listing, multipart upload, and download endpoints.
- Web portal that connects to the iPhone server.
- Bonjour discovery is declared; add the Bonjour service type `_http._tcp` and Local Network usage string in the app target Info.plist.

## Important limitations
This is a development starter, not an App Store-ready signed app. Build with Xcode on macOS. iOS can suspend apps in the background; keep the app open while accepting inbound file requests. Local Wi-Fi connections work when devices share a LAN. Remote access requires a tested private overlay or a relay; do not expose the phone's HTTP server directly to the public internet.

GCDWebServer is used as a dependency and is archived upstream. Review/fork and pin a reviewed version before production: https://github.com/swisspol/GCDWebServer

## Build
1. Install CocoaPods on a Mac.
2. Run `pod install` in this folder.
3. Open `RizalTransponder.xcworkspace` after adding an Xcode iOS app target named `RizalTransponder` and adding `Sources/ContentView.swift` to it.
4. Set bundle identifier/signing team and add Info.plist keys:
   - `NSLocalNetworkUsageDescription`: `Rizal.pw uses your local network to share files with devices you authorize.`
   - `NSBonjourServices`: `_http._tcp`
5. Run on your iPhone, tap Choose RKLOWD Folder, select the folder, then Start Server.
6. Use the displayed URL and generated token in `website/index.html`.

The source file is a starter component; this repo does not include a signed IPA or provisioning profile.
