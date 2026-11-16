// REBIRTH native handler 0.1 · 2026-10-19 · SCOUT (Decider go 22:03 MT "ios up install now").
// `REBIRTH` / `/rebirth` / `rebirth` (start of message, any case). Lists everything not yet executed:
//   pending eggs (<AppSupport>/eggs-pending/*), staged items (<AppSupport>/dragonskull-commands/rebirth-queue.json),
//   failed / unfinished rscribe jobs (<AppSupport>/rscribe-jobs/*.json with status failed|pending|running).
// rebirth run <n|all>      DRY RUN, nothing changes.
// rebirth run <n|all> go   each item runs ONLY if its sha256 is in DRAGONGATE approved.json AND the owner passes Face ID for that item.
// sign / delete / publish / autoresign are listed, never run. Anything erasing or writing into transcripts, MACHINE-MIND, backups,
// rscribe, .rzl, LOGS, BOTS, KEPT-FROM-CLEANUP is refused. No verb here deletes or overwrites a file. Log is add-only (rebirth.rscribe.jsonl).
import Foundation
import CryptoKit
#if canImport(LocalAuthentication)
import LocalAuthentication
#endif

final class DSRebirth: @unchecked Sendable {
    static let shared = DSRebirth()
    static let neverAuto: Set<String> = ["sign", "delete", "publish", "autoresign"]
    static let protectedRx: [String] = [#"(^|/)chat/"#, #"(^|/)mind/"#, "MACHINE-MIND", "transcript", #"(^|/)memory-backups/"#, #"(^|/)backups?[-/]"#,
                                        #"(^|/)rscribe/"#, #"\.rzl$"#, #"(^|/)LOGS?/"#, #"(^|/)BOTS/"#, "KEPT-FROM-CLEANUP", #"\.bak-"#, #"\.pre-"#]
    struct Item { var id, kind, category, title, sha256, action: String; var paths: [String]; var erases: Bool; var src: URL? }

    private let lock = NSLock(), fm = FileManager.default
    var base: URL { RlabData.appSupport }
    var cmdRoot: URL { base.appendingPathComponent("dragonskull-commands", isDirectory: true) }
    var queueURL: URL { cmdRoot.appendingPathComponent("rebirth-queue.json") }
    var doneURL: URL { cmdRoot.appendingPathComponent("rebirth-done.jsonl") }
    var logURL: URL { cmdRoot.appendingPathComponent("rebirth.rscribe.jsonl") }
    /// Platform confirm hook (default: LocalAuthentication, Face ID with passcode fallback). Must call back exactly once.
    var confirm: ((_ reason: String, _ done: @escaping (Bool) -> Void) -> Void)? = nil

    static func isCommand(_ text: String) -> Bool { text.range(of: #"^\s*/?rebirth(\s|$)"#, options: [.regularExpression, .caseInsensitive]) != nil }

    static func sha(_ u: URL) -> String {
        guard let h = try? FileHandle(forReadingFrom: u) else { return "" }
        defer { try? h.close() }
        var s = SHA256(); while let d = try? h.read(upToCount: 4 << 20), !d.isEmpty { s.update(data: d) }
        return s.finalize().map { String(format: "%02x", $0) }.joined()
    }
    static func isProtected(_ p: String) -> Bool { protectedRx.contains { p.range(of: $0, options: [.regularExpression, .caseInsensitive]) != nil } }

    // ---- add-only log ----
    func log(_ o: [String: Any]) {
        var o = o; o["t"] = ISO8601DateFormatter().string(from: Date())
        guard let d = try? JSONSerialization.data(withJSONObject: o, options: [.sortedKeys]) else { return }
        append(logURL, d + Data("\n".utf8))
    }
    private func append(_ u: URL, _ d: Data) {
        try? fm.createDirectory(at: u.deletingLastPathComponent(), withIntermediateDirectories: true)
        if !fm.fileExists(atPath: u.path) { fm.createFile(atPath: u.path, contents: nil) }
        guard let h = try? FileHandle(forWritingTo: u) else { return }
        h.seekToEndOfFile(); h.write(d); try? h.close()
    }
    private func doneIDs() -> Set<String> {
        Set(((try? String(contentsOf: doneURL, encoding: .utf8)) ?? "").split(separator: "\n").compactMap {
            (try? JSONSerialization.jsonObject(with: Data($0.utf8)) as? [String: Any])?["key"] as? String })
    }
    private func key(_ it: Item) -> String { it.kind + ":" + it.id + ":" + it.sha256 }
    func approved() -> [String] { ((DGGate.shared.core.policy()["approved"] as? [String]) ?? []).map { $0.lowercased() } }

    // ---- scan ----
    func scan() -> [Item] {
        var out: [Item] = []
        let eggDir = base.appendingPathComponent("eggs-pending", isDirectory: true)
        for n in ((try? fm.contentsOfDirectory(atPath: eggDir.path)) ?? []).sorted() where !n.hasPrefix(".") {
            let u = eggDir.appendingPathComponent(n)
            out.append(Item(id: n, kind: "egg", category: "install", title: "egg \(n)", sha256: Self.sha(u), action: "egg-install", paths: ["eggs/" + n], erases: false, src: u))
        }
        if let d = try? Data(contentsOf: queueURL), let j = try? JSONSerialization.jsonObject(with: d) as? [String: Any] {
            for (i, x) in ((j["items"] as? [[String: Any]]) ?? []).enumerated() {
                out.append(Item(id: (x["id"] as? String) ?? "q\(i + 1)", kind: "staged", category: ((x["category"] as? String) ?? "").lowercased(),
                                title: (x["title"] as? String) ?? "staged item \(i + 1)", sha256: ((x["sha256"] as? String) ?? "").lowercased(),
                                action: (x["action"] as? String) ?? "", paths: (x["paths"] as? [String]) ?? [], erases: (x["erases"] as? Bool) ?? false,
                                src: (x["from"] as? String).map { base.appendingPathComponent($0) }))
            }
        }
        let jobs = base.appendingPathComponent("rscribe-jobs", isDirectory: true)
        for n in ((try? fm.contentsOfDirectory(atPath: jobs.path)) ?? []).sorted() where n.hasSuffix(".json") {
            let u = jobs.appendingPathComponent(n)
            guard let d = try? Data(contentsOf: u), let x = try? JSONSerialization.jsonObject(with: d) as? [String: Any] else { continue }
            let st = ((x["status"] as? String) ?? "").lowercased()
            guard ["failed", "pending", "running", "unfinished"].contains(st) else { continue }
            out.append(Item(id: n, kind: "job", category: "rscribe-retry", title: "rscribe job \(n) (\(st))", sha256: Self.sha(u), action: "rscribe-requeue", paths: [], erases: false, src: u))
        }
        let done = doneIDs()
        return out.filter { !done.contains(key($0)) }
    }

    func classify(_ it: Item, _ ap: [String]) -> (ok: Bool, why: String) {
        if Self.neverAuto.contains(it.category) || Self.neverAuto.contains(it.action) { return (false, "category '\(it.category)' is never run by REBIRTH (Decider only)") }
        if it.erases || it.paths.contains(where: Self.isProtected) { return (false, "would touch transcripts / machine mind / backups / rscribe / logs / bots (HARD RULE)") }
        if it.sha256.range(of: "^[0-9a-f]{64}$", options: .regularExpression) == nil { return (false, "no sha256") }
        if !ap.contains(it.sha256) { return (false, "hash not owner-approved in DRAGONGATE approved.json") }
        if !["egg-install", "copy", "rscribe-requeue"].contains(it.action) { return (false, "action '\(it.action)' can't run on this device (listed only)") }
        return (true, "approved; needs your Face ID for this item")
    }

    // ---- executors (add-only, never overwrite, never delete) ----
    private func exec(_ it: Item) -> (Bool, String) {
        switch it.action {
        case "egg-install", "copy":
            guard let s = it.src, Self.sha(s) == it.sha256 else { return (false, "file changed since approval (sha256 mismatch)") }
            let rel = it.action == "egg-install" ? "eggs/" + it.id : (it.paths.first ?? "")
            guard !rel.isEmpty, !rel.contains(".."), !Self.isProtected(rel) else { return (false, "bad target") }
            let d = base.appendingPathComponent(rel)
            if fm.fileExists(atPath: d.path) { return (false, "target exists; REBIRTH never overwrites") }
            try? fm.createDirectory(at: d.deletingLastPathComponent(), withIntermediateDirectories: true)
            do { try fm.copyItem(at: s, to: d) } catch { return (false, "copy failed: \(error.localizedDescription)") }
            return (true, "copied to \(rel)")
        case "rscribe-requeue":
            guard let s = it.src, Self.sha(s) == it.sha256 else { return (false, "job file changed since approval") }
            let line = (try? JSONSerialization.data(withJSONObject: ["job": it.id, "sha256": it.sha256, "t": ISO8601DateFormatter().string(from: Date())])) ?? Data()
            append(base.appendingPathComponent("rscribe-jobs/requeue.jsonl"), line + Data("\n".utf8))
            return (true, "requeued (the RVM picks it up on next rscribe run)")
        default: return (false, "not runnable here")
        }
    }

    func handle(_ text: String) -> String {
        lock.lock(); defer { lock.unlock() }
        let a = text.trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: #"^/?rebirth\s*"#, with: "", options: [.regularExpression, .caseInsensitive])
            .lowercased().split(whereSeparator: { $0 == " " || $0 == "\t" }).map(String.init)
        let items = scan(), ap = approved()
        if a.isEmpty || a == ["ls"] || a == ["list"] { log(["ev": "rebirth.list", "n": items.count]); return listText(items, ap) }
        if a == ["help"] { return "REBIRTH: rebirth = numbered list · rebirth run <n|all> = dry run · rebirth run <n|all> go = run approved items, Face ID per item · rebirth log = recent log." }
        if a == ["log"] { return "REBIRTH log (last 20):\n" + (((try? String(contentsOf: logURL, encoding: .utf8)) ?? "").split(separator: "\n").suffix(20).joined(separator: "\n")) }
        guard a.first == "run", a.count >= 2, a.count <= 3, a.count == 2 || a[2] == "go" else { return "REBIRTH: use rebirth, rebirth run <n|all> [go], rebirth log." }
        let sel: [Int]
        if a[1] == "all" { sel = Array(items.indices) } else if let n = Int(a[1]), n >= 1, n <= items.count { sel = [n - 1] } else { return "REBIRTH: no item \(a[1])." }
        let dry = a.count == 2
        log(["ev": "rebirth.start", "target": a[1], "dry": dry])
        var out: [String] = [], ready: [(Int, Item)] = []
        for i in sel {
            let it = items[i], c = classify(it, ap)
            if !c.ok { out.append("\(i + 1). SKIP \(it.title): \(c.why)"); log(["ev": "rebirth.skip", "n": i + 1, "id": it.id, "why": c.why]); continue }
            if dry { out.append("\(i + 1). DRY RUN would run \(it.title)"); log(["ev": "rebirth.dry", "n": i + 1, "id": it.id, "sha256": it.sha256]); continue }
            ready.append((i + 1, it)); out.append("\(i + 1). WAITING for Face ID: \(it.title)")
        }
        if !ready.isEmpty { DispatchQueue.global().async { self.runConfirmed(ready) } }
        else { log(["ev": "rebirth.end"]) }
        return (dry ? "REBIRTH dry run (nothing ran):\n" : "REBIRTH:\n") + (out.isEmpty ? "nothing selected." : out.joined(separator: "\n"))
            + (ready.isEmpty ? "" : "\nConfirm each item with Face ID. Results: rebirth log")
    }

    private func runConfirmed(_ q: [(Int, Item)]) {
        guard let (n, it) = q.first else { log(["ev": "rebirth.end"]); return }
        ask("REBIRTH item \(n): \(it.title)") { yes in
            if !yes { self.log(["ev": "rebirth.declined", "n": n, "id": it.id]) }
            else {
                self.log(["ev": "rebirth.exec", "n": n, "id": it.id, "sha256": it.sha256])
                let (ok, msg) = self.exec(it)
                self.log(["ev": ok ? "rebirth.done" : "rebirth.fail", "n": n, "id": it.id, "msg": msg])
                if ok, let d = try? JSONSerialization.data(withJSONObject: ["key": self.key(it), "t": ISO8601DateFormatter().string(from: Date())]) { self.append(self.doneURL, d + Data("\n".utf8)) }
            }
            self.runConfirmed(Array(q.dropFirst()))
        }
    }
    private func ask(_ reason: String, _ done: @escaping (Bool) -> Void) {
        if let c = confirm { c(reason, done); return }
        #if canImport(LocalAuthentication)
        let ctx = LAContext(); var err: NSError?
        guard ctx.canEvaluatePolicy(.deviceOwnerAuthentication, error: &err) else { log(["ev": "rebirth.noauth", "err": err?.localizedDescription ?? "?"]); done(false); return }
        ctx.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { ok, _ in done(ok) }
        #else
        done(false)
        #endif
    }

    func listText(_ items: [Item], _ ap: [String]) -> String {
        if items.isEmpty { return "REBIRTH: nothing pending." }
        return "REBIRTH pending (\(items.count)):\n" + items.enumerated().map { i, it in
            let c = classify(it, ap); return "\(i + 1). [\(it.kind)/\(it.category.isEmpty ? "-" : it.category)] \(it.title) — \(c.ok ? "READY" : "HOLD"): \(c.why)"
        }.joined(separator: "\n") + "\nrebirth run <n> = dry run · add go to really run (Face ID per item)."
    }
}
