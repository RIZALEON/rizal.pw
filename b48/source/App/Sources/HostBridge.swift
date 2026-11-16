// HostBridge 1.0 · 2026-10-19 · RVM→Neo host access client (Mac + iOS identical).
// Talks to Neo's ds-hostd over LAN only. Stores rtoken secret at 0600; never logs or prints it.
// Commands are honored only via DGCommands typed-chat path (existing DRAGONGATE gate unchanged).
import Foundation
import CryptoKit

final class HostBridge {
    static let shared = HostBridge()
    private let lock = NSLock()
    private var host: String = "127.0.0.1"
    private var port: Int = 8320
    private var tokenId: String = ""
    private var secret: Data?

    private var root: URL {
        #if os(macOS)
        return RlabData.appSupport.appendingPathComponent("dragongate/hostbridge", isDirectory: true)
        #else
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        return base.appendingPathComponent("dragongate/hostbridge", isDirectory: true)
        #endif
    }
    private var secretURL: URL { root.appendingPathComponent("rtoken.secret") }
    private var cfgURL: URL { root.appendingPathComponent("client.json") }

    private init() {
        try? FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        load()
    }

    private func load() {
        if let d = try? Data(contentsOf: secretURL), !d.isEmpty { secret = d }
        if let cfg = (try? Data(contentsOf: cfgURL)).flatMap({ try? JSONSerialization.jsonObject(with: $0) as? [String: Any] }) {
            if let h = cfg["host"] as? String, !h.isEmpty { host = h }
            if let p = cfg["port"] as? Int { port = p }
            if let t = cfg["token_id"] as? String { tokenId = t }
        }
    }

    private func saveCfg() {
        let obj: [String: Any] = ["host": host, "port": port, "token_id": tokenId]
        if let d = try? JSONSerialization.data(withJSONObject: obj, options: [.prettyPrinted]) {
            try? d.write(to: cfgURL, options: .atomic)
            try? FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: cfgURL.path)
        }
    }

    private func saveSecret(_ s: Data) {
        try? s.write(to: secretURL, options: .atomic)
        try? FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: secretURL.path)
        secret = s
    }

    /// Chat entry: never echo secrets.
    func handle(_ raw: String) -> String {
        let t = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        let parts = t.split(whereSeparator: { $0 == " " || $0 == "\t" || $0 == "\n" }).map(String.init)
        guard let f0 = parts.first else { return usage() }
        let slash = f0.hasPrefix("/")
        let word = (slash ? String(f0.dropFirst()) : f0).lowercased()
        let args = Array(parts.dropFirst())
        let rest = String(t.dropFirst(f0.count)).trimmingCharacters(in: .whitespacesAndNewlines)
        switch word {
        case "hostpair": return pair(args.first ?? "")
        case "hostconnect": return connect(args)
        case "hoststatus": return status()
        case "hostreq": return hostreq(args.first ?? "")
        case "hostexec": return hostexec(rest)
        case "hostshot": return hostshot()
        case "hostmouse": return hostmouse(args)
        case "hostkey": return hostkey(args, rest: rest)
        case "hostui": return hostui(args)
        case "hostapp": return hostapp(args)
        case "hoststop": return hoststop(args.first ?? "on")
        case "hostallow": return hostallow()
        default: return usage()
        }
    }

    private func usage() -> String {
        """
        HOSTBRIDGE commands (typed in chat; Neo helper must be running):
        • hostconnect <lan-ip> [port] — point this app at Neo (iPhone needs this; Mac defaults to 127.0.0.1)
        • hostpair <CODE> — finish one-time pairing (Neo: python3 ~/ЯLAB/DRAGONSKULL/hostbridge/ds-hostd.py pair)
        • hoststatus — helper reachability, paired?, stopped?
        • hostreq <action> — Face ID / Touch ID on Neo for that action
        • hostexec <cmd> — run an allow-listed command on Neo; output returns here
        • hostshot — screenshot Neo (needs Screen Recording)
        • hostmouse move <x> <y> | click [left|right] | drag <x1> <y1> <x2> <y2>
        • hostkey type <text> | hostkey shortcut cmd+s
        • hostui click \"App\" \"Button\"
        • hostapp open|quit|front <App>
        • hoststop [clear] — emergency stop (or Ctrl+Opt+Cmd+H on Neo)
        • hostallow — show allow-list path + summary
        Secrets and rtoken material are never shown in chat.
        """
    }

    private func connect(_ args: [String]) -> String {
        guard let ip = args.first, !ip.isEmpty else { return "hostconnect: need Neo LAN IP, e.g. hostconnect 192.168.0.113" }
        // private only
        let parts = ip.split(separator: ".").compactMap { Int($0) }
        let ok = ip == "127.0.0.1" || (parts.count == 4 && (parts[0] == 10 || (parts[0] == 172 && (16...31).contains(parts[1])) || (parts[0] == 192 && parts[1] == 168)))
        guard ok else { return "hostconnect: refused — only private LAN / loopback addresses." }
        host = ip
        if args.count >= 2, let p = Int(args[1]), (1...65535).contains(p) { port = p }
        saveCfg()
        return "hostconnect: using \(host):\(port). Next: hostpair <CODE> from Neo."
    }

    private func pair(_ code: String) -> String {
        let c = code.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        guard c.count == 6 else { return "hostpair: need the 6-character code from Neo (python3 ds-hostd.py pair)." }
        #if os(iOS)
        if host == "127.0.0.1" {
            return "hostpair: on iPhone first run hostconnect <Neo-LAN-IP> (Mac can use 127.0.0.1)."
        }
        #endif
        let body: [String: Any] = ["code": c, "label": "dragonskull-\(platform())"]
        guard let raw = try? JSONSerialization.data(withJSONObject: body) else { return "hostpair: encode failed" }
        let r = http("POST", "/pair", body: raw, signed: false)
        guard r.ok, let j = r.json else { return "hostpair: \(r.error ?? "failed")" }
        guard let tid = j["token_id"] as? String, let b64 = j["secret"] as? String, let sec = Data(base64Encoded: b64) else {
            return "hostpair: bad reply (no secret delivered — window may have closed)"
        }
        if let h = j["host"] as? String, !h.isEmpty, host == "127.0.0.1" { host = h }
        if let p = j["port"] as? Int { port = p }
        tokenId = tid
        saveSecret(sec)
        saveCfg()
        return "hostpair: PASS · token_id=\(tid) · host=\(host):\(port). rtoken stored (never shown). Try hoststatus."
    }

    private func status() -> String {
        let r = http("GET", "/status", body: nil, signed: false)
        let local = "client: host=\(host):\(port) paired_local=\(secret != nil) token_id=\(tokenId.isEmpty ? "(none)" : tokenId)"
        if !r.ok { return "hoststatus: helper unreachable at \(host):\(port) — \(r.error ?? "error")\n\(local)\nStart on Neo: python3 ~/ЯLAB/DRAGONSKULL/hostbridge/ds-hostd.py" }
        guard let j = r.json else { return "hoststatus: bad json\n\(local)" }
        return """
        hoststatus:
        · service \(j["service"] ?? "?") on lan=\(j["lan"] ?? "?") port=\(j["port"] ?? port)
        · helper paired=\(j["paired"] ?? false) stopped=\(j["stopped"] ?? false) pair_window=\(j["pair_open"] ?? false)
        · allow \(j["allow"] ?? "?")
        · session \(j["session"] ?? "?")
        · \(local)
        """
    }

    private func hostreq(_ action: String) -> String {
        guard !action.isEmpty else { return "hostreq: need an action name, e.g. hostreq exec" }
        let body = try! JSONSerialization.data(withJSONObject: ["action": action.lowercased()])
        let r = http("POST", "/hostreq", body: body, signed: true)
        if !r.ok { return "hostreq: \(r.error ?? "failed")" }
        let ttl = (r.json?["ttl_sec"] as? Int) ?? 60
        return "hostreq: APPROVED · action=\(action.lowercased()) · ticket \(ttl)s on Neo (Touch ID / password)."
    }

    private func hostexec(_ cmd: String) -> String {
        guard !cmd.isEmpty else { return "hostexec: need a command (must be on Neo host-allow.json)" }
        let body = try! JSONSerialization.data(withJSONObject: ["cmd": cmd])
        let r = http("POST", "/hostexec", body: body, signed: true)
        if !r.ok { return "hostexec: \(r.error ?? "failed")" }
        let exit = r.json?["exit"] as? Int ?? -1
        let out = r.json?["output"] as? String ?? ""
        return "hostexec $ \(cmd)\n\(out)\n[exit \(exit)]"
    }

    private func hostshot() -> String {
        let body = try! JSONSerialization.data(withJSONObject: [:] as [String: Any])
        let r = http("POST", "/hostshot", body: body, signed: true)
        if !r.ok { return "hostshot: \(r.error ?? "failed")" }
        let path = r.json?["path"] as? String ?? "?"
        let bytes = r.json?["bytes"] as? Int ?? 0
        return "hostshot: saved on Neo · \(path) (\(bytes) bytes). Open it on Neo; chat does not embed the image."
    }

    private func hostmouse(_ args: [String]) -> String {
        guard let sub = args.first else { return "hostmouse: move|click|drag …" }
        let rest = Array(args.dropFirst())
        let body = try! JSONSerialization.data(withJSONObject: ["sub": sub, "args": rest])
        let r = http("POST", "/hostmouse", body: body, signed: true)
        if !r.ok { return "hostmouse: \(r.error ?? "failed")" }
        return "hostmouse: \(r.json?["output"] as? String ?? "ok")"
    }

    private func hostkey(_ args: [String], rest: String) -> String {
        guard let sub = args.first else { return "hostkey: type <text> | shortcut cmd+s" }
        var obj: [String: Any] = ["sub": sub]
        if sub == "type" {
            var t = rest
            if let r = rest.range(of: #"^type\s+"#, options: [.regularExpression, .caseInsensitive]) {
                t = String(rest[r.upperBound...])
            }
            obj["text"] = t
        } else {
            obj["args"] = Array(args.dropFirst())
        }
        let body = try! JSONSerialization.data(withJSONObject: obj)
        let r = http("POST", "/hostkey", body: body, signed: true)
        if !r.ok { return "hostkey: \(r.error ?? "failed")" }
        return "hostkey: \(r.json?["output"] as? String ?? "ok")"
    }

    private func hostui(_ args: [String]) -> String {
        // hostui click "App" "Button"  OR  hostui click App Button
        guard args.count >= 3, args[0].lowercased() == "click" else {
            return "hostui: click \"App\" \"Button\""
        }
        // re-parse quoted form from original is hard; accept unquoted App Button or strip quotes
        let app = args[1].trimmingCharacters(in: CharacterSet(charactersIn: "\""))
        let button = args.dropFirst(2).joined(separator: " ").trimmingCharacters(in: CharacterSet(charactersIn: "\""))
        let body = try! JSONSerialization.data(withJSONObject: ["app": app, "button": button])
        let r = http("POST", "/hostui", body: body, signed: true)
        if !r.ok { return "hostui: \(r.error ?? "failed")" }
        return "hostui: clicked \(button) in \(app)"
    }

    private func hostapp(_ args: [String]) -> String {
        guard args.count >= 2 else { return "hostapp: open|quit|front <App>" }
        let sub = args[0].lowercased()
        let app = args.dropFirst().joined(separator: " ").trimmingCharacters(in: CharacterSet(charactersIn: "\""))
        let body = try! JSONSerialization.data(withJSONObject: ["sub": sub, "app": app])
        let r = http("POST", "/hostapp", body: body, signed: true)
        if !r.ok { return "hostapp: \(r.error ?? "failed")" }
        return "hostapp: \(sub) \(app) ok"
    }

    private func hoststop(_ op: String) -> String {
        let body = try! JSONSerialization.data(withJSONObject: ["op": op.lowercased()])
        let r = http("POST", "/hoststop", body: body, signed: true)
        if !r.ok { return "hoststop: \(r.error ?? "failed")" }
        let st = r.json?["stopped"] as? Bool ?? (op.lowercased() != "clear")
        return st ? "hoststop: STOPPED — all host actions blocked until hoststop clear (Touch ID on Neo)." : "hoststop: cleared — bridge live again."
    }

    private func hostallow() -> String {
        let r = http("GET", "/allow", body: nil, signed: false)
        if !r.ok { return "hostallow: \(r.error ?? "failed")" }
        let path = r.json?["path"] as? String ?? "?"
        let allow = r.json?["allow"] as? [String: Any] ?? [:]
        let cmds = (allow["commands"] as? [Any])?.count ?? 0
        let apps = (allow["apps"] as? [Any])?.count ?? 0
        return "hostallow: \(path)\n· \(cmds) exact commands, \(apps) apps, screen=\(allow["screen"] ?? [:])\nEdit on Neo only; everything else is blocked."
    }

    private func platform() -> String {
        #if os(macOS)
        return "mac"
        #else
        return "ios"
        #endif
    }

    private struct HR {
        var ok: Bool
        var json: [String: Any]?
        var error: String?
    }

    private func http(_ method: String, _ path: String, body: Data?, signed: Bool) -> HR {
        lock.lock(); defer { lock.unlock() }
        guard let url = URL(string: "http://\(host):\(port)\(path)") else {
            return HR(ok: false, json: nil, error: "bad url")
        }
        var req = URLRequest(url: url, timeoutInterval: 90)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: ContentType)
        let payload = body ?? Data()
        if method != "GET" { req.httpBody = payload }
        if signed {
            guard let secret = secret, !tokenId.isEmpty else {
                return HR(ok: false, json: nil, error: "not paired — run hostpair <CODE> first")
            }
            let ts = String(Int(Date().timeIntervalSince1970))
            let nonce = UUID().uuidString.replacingOccurrences(of: "-", with: "").prefix(16).lowercased()
            var msg = Data("\(ts)|\(nonce)|\(method)|\(path)|".utf8)
            msg.append(payload)
            let mac = HMAC<SHA256>.authenticationCode(for: msg, using: SymmetricKey(data: secret))
            let sig = Data(mac).map { String(format: "%02x", $0) }.joined()
            req.setValue("DS-HMAC \(tokenId) \(ts) \(nonce) \(sig)", forHTTPHeaderField: "Authorization")
        }
        let sem = DispatchSemaphore(value: 0)
        var out = HR(ok: false, json: nil, error: "no response")
        URLSession.shared.dataTask(with: req) { data, resp, err in
            defer { sem.signal() }
            if let err = err { out = HR(ok: false, json: nil, error: err.localizedDescription); return }
            let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
            let j = data.flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] }
            if (200..<300).contains(code) {
                out = HR(ok: true, json: j, error: nil)
            } else {
                let e = (j?["error"] as? String) ?? "HTTP \(code)"
                out = HR(ok: false, json: j, error: e)
            }
        }.resume()
        _ = sem.wait(timeout: .now() + 95)
        return out
    }

    private let ContentType = "Content-Type"
}

enum HostBridgeCmd {
    static let words: Set<String> = [
        "hostpair", "hostconnect", "hoststatus", "hostreq", "hostexec", "hostshot",
        "hostmouse", "hostkey", "hostui", "hostapp", "hoststop", "hostallow"
    ]
    static func isCommand(_ text: String) -> Bool {
        let t = text.trimmingCharacters(in: .whitespacesAndNewlines)
        let parts = t.split(whereSeparator: { $0 == " " || $0 == "\t" || $0 == "\n" }).map(String.init)
        guard let f0 = parts.first else { return false }
        let w = (f0.hasPrefix("/") ? String(f0.dropFirst()) : f0).lowercased()
        return words.contains(w)
    }
}
