# Deploy Rizal.pw File Transfer portal

1. This directory is in the existing `RIZALEON/rizal.pw` repository. GitHub Pages must be enabled for the repository's existing deployment configuration.
2. The portal path will be `https://Rizal.pw/file-transfer/` once the Pages build publishes the commit.
3. The website is static HTML. It does not host file bytes or run an upload API.
4. In Unstoppable Domains DNS, preserve the current Rizal.pw records. Do not change apex or www records for this subdirectory. A subdirectory needs no DNS record.
5. For iPhone access, build/install the SwiftUI companion app and select RKLOWD using the iOS document picker.
6. For same-Wi-Fi use, the app advertises Bonjour and shows its local address.
7. For invited remote users, connect devices to the same NetBird private network and use the iPhone's overlay address only after confirming inbound connectivity. If the iPhone cannot accept inbound peer traffic, implement a VPS relay before remote use.

GitHub Pages documentation: https://docs.github.com/en/pages
Unstoppable Domains DNS help: https://support.unstoppabledomains.com/
