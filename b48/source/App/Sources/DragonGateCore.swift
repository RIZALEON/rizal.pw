// DRAGONGATE CORE 0.1.0 · staged 2026-10-18 by SCOUT · THIS IS THE CORE (Swift).
// Spec: docs/CORE-INTERFACE.md. No network. No private keys. No export/upload.
// Plugin gate = Rizal personal approval only (sha256 on approved.json). Signature does not grant entry; bots/agents cannot approve.
import Foundation
import CryptoKit

final class DragonGateCore: DGCore, @unchecked Sendable {
    static let version = "0.2.0"
    static let keyId = "e5833fdfbbfe"
    static let publicKeyB64 = "zs7M4OOB0zQhWOQw3SHpAY+XYxbZJvcPESy1y400Ti0="
    static let maxPart = 8 << 20

    let root: URL
    let app: String
    let head0: String
    private var p: [String: Any] = [:]
    private var hooks: [DGHook: [(String, (Any?) -> DGHookResult)]] = [:]
    private var seq = 0, head: String
    private let lock = NSLock()
    private let fm = FileManager.default

    init(root: URL, app: String) {
        self.root = root; self.app = app
        try? fm.createDirectory(at: root, withIntermediateDirectories: true)
        head0 = DGGate.sha("rzl.dragongate.v1|\(app)|DRAGONGATE"); head = head0
        loadPolicy(); consolidateTinyParts(); openPart(); loadHead()
    }

    private func switchURL() -> URL { root.appendingPathComponent("switch.json") }
    private func allowURL() -> URL { root.appendingPathComponent("allow.json") }
    private func approvedURL() -> URL { root.appendingPathComponent("approved.json") }
    /// gatefix 2026-10-19: part order is numeric (base "DRAGONGATE.blocks.jsonl" = 1, then -0002, -0003 …). The old lexical sort put the
    /// full base file last ("-" < "."), so every request re-listed + re-sorted the folder and opened a new 1-line part (16k files, hang).
    static func partIndex(_ name: String) -> Int {
        guard let r = name.range(of: #"\.blocks-(\d+)\.jsonl$"#, options: .regularExpression) else { return 1 }
        return Int(name[r].filter(\.isNumber)) ?? 1
    }
    private func chainParts() -> [URL] {   // read paths only (init, verify, report); record() never lists the folder
        let names = ((try? fm.contentsOfDirectory(atPath: root.path)) ?? [])
            .filter { $0.hasPrefix("DRAGONGATE.blocks") && $0.hasSuffix(".jsonl") }.sorted { Self.partIndex($0) < Self.partIndex($1) }
        return names.isEmpty ? [root.appendingPathComponent("DRAGONGATE.blocks.jsonl")] : names.map { root.appendingPathComponent($0) }
    }
    /// One-time: many tiny parts (left by the old bug) are MOVED into archive-<day>-gatefix/ and their lines appended, in order, to ONE
    /// consolidated part. Nothing is deleted; the hash chain text is byte-identical, only the file split changes.
    private func consolidateTinyParts() {
        let parts = chainParts().filter { Self.partIndex($0.lastPathComponent) > 1 }
        guard parts.count > 64 else { return }
        let arch = root.appendingPathComponent("archive-20261019-gatefix", isDirectory: true)
        try? fm.createDirectory(at: arch, withIntermediateDirectories: true)
        var moved: [URL] = []
        for u in parts { let d = arch.appendingPathComponent(u.lastPathComponent); if (try? fm.moveItem(at: u, to: d)) != nil { moved.append(d) } }
        let out = root.appendingPathComponent("DRAGONGATE.blocks-0002.jsonl")
        fm.createFile(atPath: out.path, contents: nil)
        guard let fh = try? FileHandle(forWritingTo: out) else { return }
        for u in moved { if var d = try? Data(contentsOf: u), !d.isEmpty { if d.last != 0x0A { d.append(0x0A) }; fh.write(d) } }
        try? fh.close()
        let note = "gatefix 2026-10-19: \(moved.count) one-line parts moved here (never deleted) and concatenated in order into ../DRAGONGATE.blocks-0002.jsonl\n"
        try? note.write(to: arch.appendingPathComponent("README.txt"), atomically: true, encoding: .utf8)
    }
    private var curPart: URL?, curSize = 0, partCount = 1
    private let writeQ = DispatchQueue(label: "info.rizal.dragonskull.gate.log")   // serial: appends leave the request path
    private var logFH: FileHandle?
    private func openPart() {
        let ps = chainParts(); curPart = ps.last; partCount = ps.count
        curSize = (try? fm.attributesOfItem(atPath: curPart!.path))?[.size] as? Int ?? 0
    }
    /// Wait for queued appends (verify / report read the files).
    private func flush() { writeQ.sync {} }
    private func loadJSON(_ u: URL) -> Any? {
        guard let d = try? Data(contentsOf: u) else { return nil }
        return try? JSONSerialization.jsonObject(with: d)
    }
    private func writeJSON(_ u: URL, _ o: Any) {
        guard JSONSerialization.isValidJSONObject(o), let d = try? JSONSerialization.data(withJSONObject: o, options: [.prettyPrinted, .sortedKeys]) else { return }
        try? d.write(to: u, options: .atomic)
    }
    private func loadPolicy() {
        let sw = (loadJSON(switchURL()) as? [String: Any]) ?? [:]
        p = ["gate": (sw["gate"] as? Bool) ?? true, "online": (sw["online"] as? Bool) ?? false, "kill": (sw["kill"] as? Bool) ?? false,
             "approval": (sw["approval"] as? String) == "signed" ? "signed" : "owner-approved",
             "devPlugins": (sw["devPlugins"] as? Bool) ?? false, "v": (sw["v"] as? Int) ?? 1,
             "allow": (loadJSON(allowURL()) as? [Any]) ?? [],
             "approved": ((loadJSON(approvedURL()) as? [String]) ?? []).map { $0.lowercased() }]
        if p["allow"] as? [Any] == nil { p["allow"] = [Any]() }
        // Build 48: default SelfUpdate hosts live in DGPolicy.defaultUpdateAllow and are merged at eval
        // time only. loadPolicy must not write allow.json or switch.json here, so a user's typed
        // `/gate allow` / `/gate deny` / online flag keep persisting exactly as written.
    }
    private func saveSwitch() {
        writeJSON(switchURL(), ["gate": p["gate"]!, "online": p["online"]!, "kill": p["kill"]!, "approval": p["approval"]!, "devPlugins": p["devPlugins"]!, "v": p["v"]!])
    }
    private func loadHead() {
        guard let last = curPart, let d = try? Data(contentsOf: last), let line = d.split(separator: 0x0A).last,
              let o = try? JSONSerialization.jsonObject(with: Data(line)) as? [String: Any],
              let s = o["seq"] as? Int, let h = o["hash"] as? String else { return }
        seq = s; head = h
    }

    func state() -> [String: Any] { ["gate": p["gate"]!, "online": p["online"]!, "kill": p["kill"]!, "approval": p["approval"]!, "devPlugins": p["devPlugins"]!] }
    func policy() -> [String: Any] { p }
    func decide(_ e: DGEvent) -> DGDecision { DGPolicy.eval(p, e) }

    @discardableResult func record(_ e: DGEvent, _ d: DGDecision) -> (seq: Int, hash: String)? {
        if (p["gate"] as? Bool) != true, d.allowed { return nil }
        lock.lock(); defer { lock.unlock() }
        let f = ISO8601DateFormatter(); f.timeZone = .current; f.formatOptions = [.withInternetDateTime]
        let ts = f.string(from: Date())
        var o = e.json(d); o["app"] = app; o["ts"] = ts; o["day"] = String(ts.prefix(10))
        guard let td = try? JSONSerialization.data(withJSONObject: o, options: [.sortedKeys, .withoutEscapingSlashes]) else { return nil }
        let text = String(decoding: td, as: UTF8.self), s = seq + 1, sh = DGGate.sha(text), h = DGGate.sha(head + sh + String(s))
        guard var line = try? JSONSerialization.data(withJSONObject: ["seq": s, "ts": ts, "prev": head, "sha256": sh, "hash": h, "text": text], options: [.sortedKeys, .withoutEscapingSlashes]) else { return nil }
        line.append(0x0A)
        // gatefix: cached current part + size, rotate at maxPart, append on a serial queue (no folder listing/sort per request)
        if curSize >= Self.maxPart {
            partCount += 1; curPart = root.appendingPathComponent(String(format: "DRAGONGATE.blocks-%04d.jsonl", partCount)); curSize = 0
            writeQ.async { [weak self] in try? self?.logFH?.close(); self?.logFH = nil }
        }
        let part = curPart!; curSize += line.count
        writeQ.async { [weak self] in
            guard let self else { return }
            if self.logFH == nil {
                if !self.fm.fileExists(atPath: part.path) { self.fm.createFile(atPath: part.path, contents: nil) }
                self.logFH = try? FileHandle(forWritingTo: part); _ = try? self.logFH?.seekToEnd()
            }
            if let fh = self.logFH { fh.write(line) } else { try? line.write(to: part) }
        }
        seq = s; head = h; return (s, h)
    }

    func hook(_ pt: DGHook, _ data: Any?, _ e: DGEvent) -> DGHookResult {
        if e.guarded || DGGuard.hit(e.source, e.dest, e.meta["path"] as? String, e.meta["call"] as? String) { return .init(action: "pass", data: data) }
        var cur = data, changed = false
        for (id, fn) in hooks[pt] ?? [] {
            let r = fn(cur)
            if r.action == "block" { return .init(action: "block", data: nil, plugin: id) }
            if r.action == "transform" { cur = r.data; changed = true }
        }
        return .init(action: changed ? "transform" : "pass", data: cur)
    }
    func registerHook(_ pt: DGHook, id: String, _ fn: @escaping (Any?) -> DGHookResult) { hooks[pt, default: []].append((id, fn)) }

    /// Plugin gate. "owner-approved" (default, Rizal 2026-10-19): allow iff sha256 ∈ approved.json; signature neither grants nor blocks.
    /// "signed" (only via the user-typed `/gate plugins signed`, 2026-10-19 11:11 AM MT): Rizal's approved.json still counts, and a valid
    /// ed25519 signature by the EXISTING update public key (e5833fdfbbfe, rlab-update-v1, kind gate-plugin) also admits. No new keys.
    func approvePlugin(_ i: DGPluginInfo) -> DGDecision {
        if DGGuard.hit(i.name, i.id) { return .deny("guard") }
        let sha = i.sha256.lowercased()
        if sha.isEmpty { return .deny("not-approved") }
        if ((p["approved"] as? [String]) ?? []).contains(sha) { return .allow("owner-approved") }
        if (p["approval"] as? String) == "signed", i.kind == "gate-plugin", Self.signatureOK(i) { return .allow("signed") }
        if (p["devPlugins"] as? Bool) == true { return .allow("dev-mode") }
        return .deny((p["approval"] as? String) == "signed" ? "unsigned" : "not-approved")
    }

    // MARK: user-typed chat commands (DGCommands) — the only writers besides the Decider switch. Atomic writes.
    func allowList() -> [String] {
        ((p["allow"] as? [Any]) ?? []).compactMap { r in ((r as? [String: Any])?["host"] as? String) ?? (r as? String) }.map { $0.lowercased() }
    }
    func setAllowList(_ hosts: [String]) { lock.lock(); p["allow"] = hosts; writeJSON(allowURL(), hosts); lock.unlock() }
    func setFlag(_ k: String, _ v: Any) {
        lock.lock()
        switch k {
        case "online", "kill": if let b = v as? Bool { p[k] = b }
        case "approval": if let s = v as? String, s == "signed" || s == "owner-approved" { p[k] = s }
        default: break
        }
        saveSwitch(); lock.unlock()
    }
    /// Gate event in the hash chain (commands: never the confirm code).
    func recordCommand(_ text: String, rule: String, allowed: Bool) {
        let e = DGGate.shared.makeEvent(.in, .local, source: "chat-input", dest: "gate:cmd", payload: Data(text.utf8))
        _ = record(e, allowed ? .allow(rule) : .deny(rule))
    }

    /// True only for Rizal's personal approval. Bots/agents/scripts/auto are denied.
    func isRizalApproval(_ meta: [String: Any]) -> Bool {
        let by = String(describing: meta["by"] ?? meta["approver"] ?? meta["who"] ?? "").trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let kind = String(describing: meta["kind"] ?? meta["source"] ?? meta["actor"] ?? meta["origin"] ?? "").trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let banned = ["bot", "agent", "script", "auto", "automation", "ci"]
        for b in banned {
            if by == b || by.contains(b) || kind == b || kind.contains(b) { return false }
        }
        if (meta["decider"] as? Bool) == true { return by.isEmpty || by == "rizal" }
        return by == "rizal"
    }

    /// Append one plugin sha256. Rizal personal approval only.
    @discardableResult
    func ownerApprove(_ shaIn: String, meta: [String: Any] = [:]) -> DGDecision {
        let sha = shaIn.lowercased()
        guard sha.count == 64, sha.allSatisfy({ $0.isHexDigit }) else { return .deny("bad-sha") }
        guard isRizalApproval(meta) else { return .deny("not-rizal") }
        lock.lock()
        var list = (p["approved"] as? [String]) ?? []
        if !list.contains(sha) {
            list.append(sha)
            p["approved"] = list
            writeJSON(approvedURL(), list)
        }
        lock.unlock()
        let payload = (try? JSONSerialization.data(withJSONObject: ["sha256": sha, "by": "rizal"])) ?? Data()
        let e = DGGate.shared.makeEvent(.in, .local, source: "rizal", dest: "gate:owner-approve", payload: payload)
        _ = record(e, .allow("owner-approved"))
        return .allow("owner-approved")
    }

    /// rlab-update-v1 message · kind gate-plugin · PUBLIC key e5833fdfbbfe only.
    static func message(_ i: DGPluginInfo) -> Data {
        Data("rlab-update-v1\n\(i.kind)\n\(i.id)\n\(i.version)\n\(i.name)\n\(i.size)\n\(i.sha256.lowercased())".utf8)
    }
    static func signatureOK(_ i: DGPluginInfo) -> Bool {
        guard let kd = Data(base64Encoded: publicKeyB64), let k = try? Curve25519.Signing.PublicKey(rawRepresentation: kd),
              let sigB = i.ed25519, let sig = Data(base64Encoded: sigB), sig.count == 64 else { return false }
        return k.isValidSignature(sig, for: message(i))
    }

    func setKill() { lock.lock(); p["kill"] = true; saveSwitch(); lock.unlock() }

    /// Decider-only. Never expose over a network route.
    func deciderSwitch(_ patch: [String: Any]) {
        lock.lock()
        if let v = patch["gate"] as? Bool { p["gate"] = v }
        if let v = patch["online"] as? Bool { p["online"] = v }
        if let v = patch["kill"] as? Bool { p["kill"] = v }
        if let v = patch["devPlugins"] as? Bool { p["devPlugins"] = v }
        if let v = patch["approval"] as? String, v == "signed" || v == "owner-approved" { p["approval"] = v }
        if let a = patch["allow"] as? [Any] { p["allow"] = a; writeJSON(allowURL(), a) }
        if let a = patch["approved"] as? [String] {
            if isRizalApproval(patch) {
                let x = a.map { $0.lowercased() }; p["approved"] = x; writeJSON(approvedURL(), x)
            }
            // else: bot/agent/script approval refused — approved.json unchanged
        }
        saveSwitch(); lock.unlock()
        let payload = (try? JSONSerialization.data(withJSONObject: patch)) ?? Data()
        let e = DGGate.shared.makeEvent(.in, .local, source: "decider", dest: "gate:switch", payload: payload)
        _ = record(e, .allow("decider-switch"))
    }

    func verify() -> (ok: Bool, n: Int, problem: String) {
        flush()
        var prev = head0, n = 0
        for part in chainParts() {
            guard let d = try? Data(contentsOf: part) else { if n == 0 && part.lastPathComponent == "DRAGONGATE.blocks.jsonl" { return (true, 0, "") }; return (false, n, "unreadable \(part.lastPathComponent)") }
            for line in d.split(separator: 0x0A) {
                guard let o = try? JSONSerialization.jsonObject(with: Data(line)) as? [String: Any], let s = o["seq"] as? Int, let t = o["text"] as? String,
                      let bs = o["sha256"] as? String, let pv = o["prev"] as? String, let h = o["hash"] as? String else { return (false, n, "bad line after #\(n)") }
                guard s == n + 1, pv == prev, bs == DGGate.sha(t), h == DGGate.sha(prev + bs + String(s)) else { return (false, n, "chain break at #\(s)") }
                prev = h; n = s
            }
        }
        return (true, n, "")
    }

    func report(day: String?) -> [String: Any] {
        flush()
        var per: [String: Int] = [:], perDay: [String: Int] = [:], allow = 0, deny = 0, total = 0, untrusted = 0, guarded = 0
        var denials: [[String: Any]] = [], dest: [String: Int] = [:]
        for part in chainParts() {
            guard let d = try? Data(contentsOf: part) else { continue }
            for line in d.split(separator: 0x0A) {
                guard let o = try? JSONSerialization.jsonObject(with: Data(line)) as? [String: Any], let t = o["text"] as? String,
                      let e = try? JSONSerialization.jsonObject(with: Data(t.utf8)) as? [String: Any] else { continue }
                if let day, (e["day"] as? String) != day { continue }
                total += 1
                per[e["channel"] as? String ?? "?", default: 0] += 1
                perDay[e["day"] as? String ?? "?", default: 0] += 1
                if (e["decision"] as? String) == "deny" {
                    deny += 1
                    denials.append(["ts": e["ts"] as Any, "channel": e["channel"] as Any, "dest": e["dest"] as Any, "rule": e["rule"] as Any])
                } else { allow += 1 }
                if (e["untrusted"] as? Bool) == true { untrusted += 1 }
                if (e["guarded"] as? Bool) == true { guarded += 1 }
                if (e["channel"] as? String) == "net", let destS = e["dest"] as? String { let h = String(destS.prefix(while: { $0 != "/" })); dest[h, default: 0] += 1 }
            }
        }
        let v = verify()
        return ["app": app, "total": total, "perChannel": per, "perDay": perDay, "decisions": ["allow": allow, "deny": deny],
                "denials": Array(denials.suffix(20)), "topDest": dest.sorted { $0.value > $1.value }.prefix(10).map { [$0.key, $0.value] as [Any] },
                "untrusted": untrusted, "guarded": guarded, "verify": ["ok": v.ok, "n": v.n, "problem": v.problem], "state": state(), "localOnly": true]
    }
}
