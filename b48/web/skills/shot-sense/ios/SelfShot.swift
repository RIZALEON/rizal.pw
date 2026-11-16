// STAGED native source (needs an approved iOS build) · shot-sense 2.1.9-s1 · ЯID-0003-P4M6 · ЯМАХ
// iOS can only capture its OWN app window (no whole-screen capture). UIGraphicsImageRenderer of the key window.
#if canImport(UIKit)
import UIKit
enum SelfShot {
    /// Returns a JPEG of this app's key window, or nil.
    @MainActor static func capture(quality: CGFloat = 0.6) -> Data? {
        guard let scene = UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }).first(where: { $0.activationState == .foregroundActive }),
              let win = scene.windows.first(where: { $0.isKeyWindow }) ?? scene.windows.first else { return nil }
        let r = UIGraphicsImageRenderer(bounds: win.bounds)
        let img = r.image { _ in win.drawHierarchy(in: win.bounds, afterScreenUpdates: false) }
        return img.jpegData(compressionQuality: quality)
    }
    /// Saves into the seat folder and returns the file URL.
    @MainActor static func save(to dir: URL) -> URL? {
        guard let d = capture() else { return nil }
        let f = DateFormatter(); f.dateFormat = "yyyyMMdd-HHmmss"
        let u = dir.appendingPathComponent("SELFSHOT-\(f.string(from: Date())).jpg")
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return (try? d.write(to: u)) != nil ? u : nil
    }
}
#endif
