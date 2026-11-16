// RDriveAccess.swift 1.0 (t131u, Decider GO t130u) — MICRO DISK / cryptodrive read+write for iOS web layers.
// UIDocumentPicker folder pick -> saved security-scoped bookmark -> start/stopAccessingSecurityScopedResource around every op.
// JS bridge (WKScriptMessageHandlerWithReply "rdrive"): status · pick · list · read · write · forget  (see rdrive.js -> window.RDrive).
// States: connected | "drive not connected" (bookmark missing/stale/unreachable — e.g. drive unplugged) | "no drive picked".
// Safety: paths are relative to the picked root only (no "..", no absolute, no symlink escape); 8 MB per read/write;
// secrets are never served or written: ЯCASKET / casket, keys, wallets, master.json, *.key, *.pem, .run/ are refused.
// Hook (one line, in the web view factory next to the other installs): RDriveAccess.install(on: w)   [RTHUNDR-IOS: RDriveAccess.install(on: w, script: "www/rdrive.js")]
import Foundation
import UIKit
import WebKit
import UniformTypeIdentifiers

final class RDriveAccess: NSObject, WKScriptMessageHandlerWithReply, UIDocumentPickerDelegate {
    static let shared = RDriveAccess()
    private let bookmarkKey = "rdrive.bookmark.v1"
    private let maxBytes = 8 * 1024 * 1024
    private var pickReply: ((Any?, String?) -> Void)?

    /// Install the "rdrive" handler + window.RDrive shim (from bundled web/rdrive.js) on a web view. Main frame only.
    /// script: bundled path of rdrive.js — "web/rdrive.js" (RDRGN / DRAGON SKULL) or "www/rdrive.js" (RTHUNDR-IOS).
    static func install(on w: WKWebView, script: String = "web/rdrive.js") {
        let uc = w.configuration.userContentController
        uc.addScriptMessageHandler(shared, contentWorld: .page, name: "rdrive")
        if let u = Bundle.main.resourceURL?.appendingPathComponent(script), let js = try? String(contentsOf: u, encoding: .utf8) {
            uc.addUserScript(WKUserScript(source: js, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        }
    }

    // MARK: bookmark / root
    private func resolveRoot() -> (URL?, String) {
        guard let data = UserDefaults.standard.data(forKey: bookmarkKey) else { return (nil, "no drive picked") }
        var stale = false
        guard let url = try? URL(resolvingBookmarkData: data, options: [], relativeTo: nil, bookmarkDataIsStale: &stale) else {
            return (nil, "drive not connected")
        }
        if stale, url.startAccessingSecurityScopedResource() {   // refresh the bookmark while we still can
            defer { url.stopAccessingSecurityScopedResource() }
            if let fresh = try? url.bookmarkData(options: [], includingResourceValuesForKeys: nil, relativeTo: nil) {
                UserDefaults.standard.set(fresh, forKey: bookmarkKey)
            }
        }
        return (url, "ok")
    }

    /// Runs body with security-scoped access to the root; reports "drive not connected" when unreachable.
    private func withRoot<T>(_ body: (URL) throws -> T) -> Result<T, RDError> {
        let (root, why) = resolveRoot()
        guard let root else { return .failure(.state(why)) }
        let ok = root.startAccessingSecurityScopedResource()
        defer { if ok { root.stopAccessingSecurityScopedResource() } }
        var isDir: ObjCBool = false
        guard FileManager.default.fileExists(atPath: root.path, isDirectory: &isDir), isDir.boolValue else { return .failure(.state("drive not connected")) }
        do { return .success(try body(root)) } catch let e as RDError { return .failure(e) } catch { return .failure(.io(error.localizedDescription)) }
    }

    enum RDError: Error { case state(String), refused(String), io(String)
        var text: String { switch self { case .state(let s): return s; case .refused(let s): return "refused: " + s; case .io(let s): return "io: " + s } } }

    private static let secret = try! NSRegularExpression(pattern: #"(^|/)(\.run|ЯCASKET|casket|keys?|wallets?|master\.json)(/|$)|\.(key|pem|p12)$"#, options: [.caseInsensitive])

    private func target(_ root: URL, _ rel: String) throws -> URL {
        let r = rel.trimmingCharacters(in: .whitespaces)
        if r.hasPrefix("/") || r.split(separator: "/").contains("..") { throw RDError.refused("path must be relative to the drive root") }
        if RDriveAccess.secret.firstMatch(in: r, range: NSRange(r.startIndex..., in: r)) != nil { throw RDError.refused("secrets are not exposed to the web layer") }
        let base = root.standardizedFileURL.resolvingSymlinksInPath()
        let u = (r.isEmpty ? base : base.appendingPathComponent(r)).standardizedFileURL
        let check = FileManager.default.fileExists(atPath: u.path) ? u.resolvingSymlinksInPath() : u
        guard check.path == base.path || check.path.hasPrefix(base.path + "/") else { throw RDError.refused("path escapes the drive root") }
        return u
    }

    // MARK: JS bridge
    func userContentController(_ c: WKUserContentController, didReceive m: WKScriptMessage, replyHandler: @escaping (Any?, String?) -> Void) {
        guard m.frameInfo.isMainFrame, let b = m.body as? [String: Any], let op = b["op"] as? String else { replyHandler(nil, "bad request"); return }
        let path = (b["path"] as? String) ?? ""
        func done<T>(_ r: Result<T, RDError>) { switch r { case .success(let v): replyHandler(v, nil); case .failure(let e): replyHandler(nil, e.text) } }
        switch op {
        case "status":
            let (root, why) = resolveRoot()
            if root == nil { replyHandler(["connected": false, "state": why], nil); return }
            switch withRoot({ $0.lastPathComponent }) {
            case .success(let name): replyHandler(["connected": true, "state": "connected", "name": name], nil)
            case .failure(let e): replyHandler(["connected": false, "state": e.text], nil)
            }
        case "pick":
            DispatchQueue.main.async { self.presentPicker(replyHandler) }
        case "forget":
            UserDefaults.standard.removeObject(forKey: bookmarkKey); replyHandler(["connected": false, "state": "no drive picked"], nil)
        case "list":
            done(withRoot { root -> [[String: Any]] in
                let dir = try self.target(root, path)
                let keys: [URLResourceKey] = [.isDirectoryKey, .fileSizeKey, .contentModificationDateKey]
                let items = try FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: keys, options: [.skipsHiddenFiles])
                return items.prefix(2000).compactMap { u in
                    let rel = (path.isEmpty ? "" : path + "/") + u.lastPathComponent
                    if RDriveAccess.secret.firstMatch(in: rel, range: NSRange(rel.startIndex..., in: rel)) != nil { return nil }
                    let v = try? u.resourceValues(forKeys: Set(keys))
                    return ["name": u.lastPathComponent, "path": rel, "dir": v?.isDirectory ?? false, "size": v?.fileSize ?? 0,
                            "mtime": (v?.contentModificationDate?.timeIntervalSince1970 ?? 0)]
                }
            })
        case "read":
            let b64 = (b["encoding"] as? String) == "base64"
            done(withRoot { root -> [String: Any] in
                let u = try self.target(root, path)
                var data = Data(); var err: NSError?
                NSFileCoordinator().coordinate(readingItemAt: u, options: [], error: &err) { url in data = (try? Data(contentsOf: url)) ?? Data() }
                if let err { throw RDError.io(err.localizedDescription) }
                if data.count > self.maxBytes { throw RDError.refused("file larger than 8 MB") }
                if b64 { return ["path": path, "encoding": "base64", "data": data.base64EncodedString(), "size": data.count] }
                guard let s = String(data: data, encoding: .utf8) else { throw RDError.io("not UTF-8; read with encoding: base64") }
                return ["path": path, "encoding": "utf8", "data": s, "size": data.count]
            })
        case "write":
            let raw = (b["data"] as? String) ?? ""
            let data: Data? = (b["encoding"] as? String) == "base64" ? Data(base64Encoded: raw) : raw.data(using: .utf8)
            guard let data else { replyHandler(nil, "bad data"); return }
            guard data.count <= maxBytes else { replyHandler(nil, "refused: larger than 8 MB"); return }
            done(withRoot { root -> [String: Any] in
                let u = try self.target(root, path)
                try FileManager.default.createDirectory(at: u.deletingLastPathComponent(), withIntermediateDirectories: true)
                var werr: Error?; var cerr: NSError?
                NSFileCoordinator().coordinate(writingItemAt: u, options: [.forReplacing], error: &cerr) { url in
                    do { try data.write(to: url, options: [.atomic]) } catch { werr = error }
                }
                if let e = cerr ?? (werr as NSError?) { throw RDError.io(e.localizedDescription) }
                return ["path": path, "written": data.count]
            })
        default:
            replyHandler(nil, "unknown op")
        }
    }

    // MARK: picker
    private func presentPicker(_ reply: @escaping (Any?, String?) -> Void) {
        let p = UIDocumentPickerViewController(forOpeningContentTypes: [UTType.folder], asCopy: false)
        p.allowsMultipleSelection = false
        p.delegate = self
        pickReply = reply
        let scene = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first
        var top = scene?.windows.first(where: { $0.isKeyWindow })?.rootViewController ?? scene?.windows.first?.rootViewController
        while let n = top?.presentedViewController { top = n }
        guard let top else { reply(nil, "no window to present the picker"); pickReply = nil; return }
        top.present(p, animated: true)
    }
    func documentPicker(_ c: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        guard let u = urls.first else { pickReply?(["connected": false, "state": "no drive picked"], nil); pickReply = nil; return }
        let ok = u.startAccessingSecurityScopedResource()
        defer { if ok { u.stopAccessingSecurityScopedResource() } }
        do {
            let bm = try u.bookmarkData(options: [], includingResourceValuesForKeys: nil, relativeTo: nil)
            UserDefaults.standard.set(bm, forKey: bookmarkKey)
            pickReply?(["connected": true, "state": "connected", "name": u.lastPathComponent], nil)
        } catch { pickReply?(nil, "bookmark failed: \(error.localizedDescription)") }
        pickReply = nil
    }
    func documentPickerWasCancelled(_ c: UIDocumentPickerViewController) {
        pickReply?(["connected": resolveRoot().0 != nil, "state": "cancelled"], nil); pickReply = nil
    }
}
