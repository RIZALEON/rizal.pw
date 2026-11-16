import Foundation

// ЯBAT 2026-10-19 · rzl.rvm.rscribe-mirror.v1 — add-only secondary/tertiary copy of DRAGON SKULL transcripts + MACHINE-MIND notes
// inside the RVM guest at /data/rscribe/<botid>/YYYYMMDD.rzl (drive1). Foundation only: same file in the iOS and macOS apps.
//  - Host side is an OUTBOX only: <RVM engine store>/drives/rscribe-outbox/outbox.rzl (JSON lines, append-only, never rewritten,
//    truncated or deleted). The app's own files (memory/chat/*.jsonl, memory/mind/*.blocks*.jsonl, BATIBABOX-LOG.rzl) are KEEP:
//    this file never opens them; MemoryStore.mind() hands it a copy of each block AFTER the original is written.
//  - Guest side (boot.html "rzl-mirror" glue) reads the outbox from its own cursor (/data/rscribe/.cursor) and types the entries
//    into /data. If drive1/data is not mounted, nothing is lost: the outbox keeps everything and the next boot catches up.
//  - Served read-only, GET only: /skills/rvm-linux/drives/rscribe-outbox/off<12 digits>.rzl -> whole lines from that byte offset.
//  - Per-device data under Application Support (excluded from backup). Never bundled, so no personal data reaches a public build.
enum RlabMirror {
    static let dirRel = "drives/rscribe-outbox"
    static let fileName = "outbox.rzl"
    static let maxText = 4000, maxRead = 48 << 10, maxFile = 64 << 20
    static var root: URL = RlabData.engineRoot           // tests point this at a scratch dir
    static var url: URL { root.appendingPathComponent(dirRel, isDirectory: true).appendingPathComponent(fileName) }
    static var enabled = true
    private static let lock = NSLock()
    private static let q = DispatchQueue(label: "rzl.rvm.rscribe-mirror")

    static func safeBot(_ s: String) -> String {
        let t = s.lowercased().unicodeScalars.filter { $0.isASCII && (CharacterSet.alphanumerics.contains($0) || $0 == "-" || $0 == "_") }
        let b = String(String.UnicodeScalarView(t)).prefix(40); return b.isEmpty ? "dragonskull" : String(b)
    }
    /// Copy one (already redacted) block into the outbox. Async + never throws: a mirror failure can never block or alter the original.
    static func enqueue(id: String, ts: String, day: String, bot: String, topic: String, kind: String, text: String, sync: Bool = false) {
        guard enabled else { return }
        let d8 = day.filter { $0.isNumber }; guard d8.count == 8 else { return }
        let o: [String: Any] = ["rzl": "rzl.rvm.rscribe-mirror.v1", "id": id, "ts": ts, "day": d8, "bot": safeBot(bot), "topic": topic,
                                "kind": kind, "text": String(text.prefix(maxText)), "src": "dragonskull-host"]
        guard var line = try? JSONSerialization.data(withJSONObject: o, options: [.sortedKeys, .withoutEscapingSlashes]) else { return }
        line.append(0x0A)
        let work = {
            lock.lock(); defer { lock.unlock() }
            let fm = FileManager.default, u = url
            try? fm.createDirectory(at: u.deletingLastPathComponent(), withIntermediateDirectories: true)
            let sz = ((try? fm.attributesOfItem(atPath: u.path))?[.size] as? NSNumber)?.intValue ?? 0
            guard sz + line.count <= maxFile else { return }
            if let h = try? FileHandle(forWritingTo: u) { h.seekToEndOfFile(); h.write(line); try? h.synchronize(); try? h.close() }
            else { try? line.write(to: u, options: .withoutOverwriting); var v = URLResourceValues(); v.isExcludedFromBackup = true; var uu = u; try? uu.setResourceValues(v) }
        }
        if sync { work() } else { q.async(execute: work) }
    }
    /// Local-server hook (GET only). nil = not an outbox path. Body: {"size":N,"off":O,"end":E,"lines":"<whole JSON lines>"}.
    static func response(forPath path: String) -> (type: String, body: Data)? {
        let p = (path as NSString).standardizingPath
        guard let r = p.range(of: "/rvm-linux/\(dirRel)/") else { return nil }
        let name = String(p[r.upperBound...])
        guard name.count == 19, name.hasPrefix("off"), name.hasSuffix(".rzl"), name.dropFirst(3).prefix(12).allSatisfy({ $0 >= "0" && $0 <= "9" }),
              let off = UInt64(name.dropFirst(3).prefix(12)) else { return ("", Data()) }
        lock.lock(); defer { lock.unlock() }
        var size: UInt64 = 0, d = Data()
        if let h = try? FileHandle(forReadingFrom: url) {
            defer { try? h.close() }
            size = (try? h.seekToEnd()) ?? 0
            if off < size { try? h.seek(toOffset: off); d = h.readData(ofLength: maxRead); if let nl = d.lastIndex(of: 0x0A) { d = d[..<(nl + 1)] } else { d = Data() } }
        }
        let o: [String: Any] = ["size": size, "off": off, "end": off + UInt64(d.count), "lines": String(decoding: d, as: UTF8.self)]
        return ("application/json", (try? JSONSerialization.data(withJSONObject: o, options: [.sortedKeys])) ?? Data())
    }
}
