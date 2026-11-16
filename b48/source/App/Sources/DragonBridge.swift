// DragonBridge 0.1 · 2026-10-19 · SCOUT. vulnfix 22:0x: X-DS-Origin header no longer skips the token; the in-app chat carries the token in dg-cmd.js closure only. Terminal → DRAGON SKULL, loopback 127.0.0.1:8319 only.
// Same file for Mac (main.swift) and iOS (Server.swift). Gate: bridge-allow.json (off by default) + rtoken session token
// + DRAGONGATE owner-approved hash for update (a signature never replaces approval) + rscribe add-only log + kill switch.
// HARDCODE law: no delete verb exists; neverWrite covers transcripts/logs/bots/notes/MACHINE-MIND/signing/wallet.
import Foundation
import CryptoKit

final class DragonBridge {
    static let shared = DragonBridge()
    private let lock = NSLock()
    var root: URL { RlabData.appSupport.appendingPathComponent("dragongate/bridge", isDirectory: true) }
    var allowURL: URL { root.appendingPathComponent("bridge-allow.json") }
    var tokenURL: URL { root.appendingPathComponent("session.token") }      // 0600, rotated each app launch
    var logURL: URL { root.appendingPathComponent("bridge.rscribe.jsonl") }  // add-only
    private(set) var token = ""

    func boot() {
        try? FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        var b = [UInt8](repeating: 0, count: 32); _ = SecRandomCopyBytes(kSecRandomDefault, b.count, &b)
        token = b.map { String(format: "%02x", $0) }.joined()
        try? Data(token.utf8).write(to: tokenURL, options: .atomic)
        try? FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: tokenURL.path)
    }

    func allow() -> [String: Any] {
        (try? Data(contentsOf: allowURL)).flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] } ?? ["enabled": false]
    }

    // ---- matcher (mirror of web/bridge-match.js) ----
    static func g2r(_ g: String) -> String {
        var s = "^", it = Array(g), i = 0
        while i < it.count { let c = it[i]
            if c == "*" && i + 1 < it.count && it[i + 1] == "*" { s += ".*"; i += 2; continue }
            s += c == "*" ? "[^/]*" : NSRegularExpression.escapedPattern(for: String(c)); i += 1 }
        return s + "$"
    }
    static func any(_ l: Any?, _ p: String) -> Bool {
        ((l as? [String]) ?? []).contains { p.range(of: g2r($0), options: .regularExpression) != nil }
    }
    static func bad(_ p: String) -> Bool { p.isEmpty || p.contains("\0") || p.split(separator: "/").contains("..") }
    func live(_ a: [String: Any]) -> Bool { (a["enabled"] as? Bool) == true && (a["kill"] as? Bool) != true }
    func canRead(_ a: [String: Any], _ p: String) -> Bool { live(a) && !Self.bad(p) && Self.any(a["read"], p) }
    func canWrite(_ a: [String: Any], _ p: String, _ n: Int) -> Bool {
        live(a) && !Self.bad(p) && !Self.any(a["neverWrite"], p) && Self.any(a["write"], p) && n <= ((a["maxWriteBytes"] as? Int) ?? 0)
    }

    // "app:x" → app support; "mac:~/ЯLAB/x" → home (Mac only)
    func resolve(_ p: String) -> URL? {
        if p.hasPrefix("app:") { return RlabData.appSupport.appendingPathComponent(String(p.dropFirst(4))).standardizedFileURL }
        #if os(macOS)
        if p.hasPrefix("mac:~/") { return URL(fileURLWithPath: NSHomeDirectory()).appendingPathComponent(String(p.dropFirst(6))).standardizedFileURL }
        #endif
        return nil
    }

    func log(_ verb: String, _ arg: String, _ code: Int) {
        lock.lock(); defer { lock.unlock() }
        let line = "{\"t\":\"\(ISO8601DateFormatter().string(from: Date()))\",\"verb\":\"\(verb)\",\"code\":\(code),\"arg_sha\":\"\(SHA256.hash(data: Data(arg.utf8)).map { String(format: "%02x", $0) }.joined())\"}\n"
        if let h = try? FileHandle(forWritingTo: logURL) { h.seekToEndOfFile(); h.write(Data(line.utf8)); try? h.close() }
        else { try? Data(line.utf8).write(to: logURL) }
    }

    /// Route /bridge/v1/<verb>. Returns (code, json). Caller must only call this from the 127.0.0.1 listener.
    func handle(method: String, path: String, headers: [String], body: Data) -> (Int, [String: Any]) {
        let verb = String(path.dropFirst("/bridge/v1/".count))
        let a = allow()
        let hv = headers.first { $0.lowercased().hasPrefix("x-ds-bridge-token:") }.map { String($0.split(separator: ":", maxSplits: 1)[1]).trimmingCharacters(in: .whitespaces) } ?? ""
        let req = (try? JSONSerialization.jsonObject(with: body) as? [String: Any]) ?? [:]
        let arg = (req["arg"] as? String) ?? ""
        func out(_ c: Int, _ o: [String: Any]) -> (Int, [String: Any]) { log(verb, arg, c); return (c, o) }
        if method != "POST" { return out(405, ["ok": false, "error": "POST only"]) }
        if verb == "status" { return out(200, ["ok": true, "enabled": live(a), "lan": a["lan"] as? Bool ?? false, "version": "0.1"]) }
        if !live(a) { return out(403, ["ok": false, "error": "bridge disabled or killed (bridge-allow.json)"]) }
        guard !token.isEmpty && hv == token else { return out(401, ["ok": false, "error": "bad session token"]) }
        switch verb {
        case "read":
            guard canRead(a, arg), let u = resolve(arg), let d = try? Data(contentsOf: u) else { return out(403, ["ok": false, "error": "read denied"]) }
            return out(200, ["ok": true, "path": arg, "sha256": SHA256.hash(data: d).map { String(format: "%02x", $0) }.joined(), "b64": d.prefix(1 << 20).base64EncodedString()])
        case "write":
            let p = (req["path"] as? String) ?? "", d = Data(base64Encoded: (req["b64"] as? String) ?? "") ?? Data()
            guard canWrite(a, p, d.count), let u = resolve(p) else { return out(403, ["ok": false, "error": "write denied"]) }
            let fm = FileManager.default
            if fm.fileExists(atPath: u.path) {   // backup-before-write, never overwrite a backup
                let bak = u.path + ".bak-bridge-" + String(Int(Date().timeIntervalSince1970))
                guard (try? fm.copyItem(atPath: u.path, toPath: bak)) != nil else { return out(500, ["ok": false, "error": "backup failed"]) }
            }
            try? fm.createDirectory(at: u.deletingLastPathComponent(), withIntermediateDirectories: true)
            guard (try? d.write(to: u, options: .atomic)) != nil else { return out(500, ["ok": false, "error": "write failed"]) }
            return out(200, ["ok": true, "path": p, "bytes": d.count])
        case "diag":
            return out(200, ["ok": true, "drive1": RlabData.url.path, "bridgeLog": logURL.path, "allow": allowURL.path])
        case "exec":
            #if os(macOS)
            return out(501, ["ok": false, "error": "exec: Mac uses dbridge exec → allow-listed Process (see PLAN.md step 4); not wired in 0.1"])
            #else
            return out(501, ["ok": false, "error": "iOS has no shell: use chat `bridge diag`, `rvm <cmd>`, drive1 via /data"])
            #endif
        case "update":
            return out(202, ["ok": true, "staged": false, "note": "update stages an egg only; apply needs DRAGONGATE owner-approved sha256 (/gate confirm). Not wired in 0.1"])
        case "repair":
            return out(202, ["ok": true, "note": "repair = restore newest *.bak-*/.pre-* copy after owner approval. Not wired in 0.1"])
        default:
            return out(404, ["ok": false, "error": "unknown verb"])
        }
    }
}
