// t45u · live ЯSCRIBE notes as chat context (build 48, staged).
// Reads official Documents/ЯSCRIBE/NOTES heads already synced by the batibabox-rscribe helper.
// Add-only, read-only, size-capped, redacted. Does not touch Application Support/memory/.
// Does not use wantsRecall — short factual questions must still see these notes.
import Foundation

enum RscribeNotesContext {
    static let noteNames = ["MACHINE-MIND", "RAGENT-POLYTRANSCRIPT", "BATIBABOX", "CRYPTOCODE"]
    static let maxTotalChars = 3500
    static let maxPerNote = 900
    static let maxHits = 6

    static func notesRoot() -> URL? {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first?
            .appendingPathComponent("ЯSCRIBE/NOTES", isDirectory: true)
    }

    /// Latest official rzl head for a note directory (highest @N; skips LIVE-NEWEST).
    static func latestHead(in dir: URL) -> URL? {
        let fm = FileManager.default
        guard let names = try? fm.contentsOfDirectory(atPath: dir.path) else { return nil }
        var best: (Int, URL)? = nil
        for n in names {
            if n.contains("LIVE-NEWEST") { continue }
            guard n.hasSuffix(".rzl"), let at = n.lastIndex(of: "@") else { continue }
            let num = n[n.index(after: at)...].replacingOccurrences(of: ".rzl", with: "")
            guard let rev = Int(num) else { continue }
            if best == nil || rev > best!.0 { best = (rev, dir.appendingPathComponent(n)) }
        }
        return best?.1
    }

    static func redact(_ s: String) -> String {
        var t = s
        let patterns = [
            #"-----BEGIN [A-Z ]+-----[\s\S]+?-----END [A-Z ]+-----"#,
            #"(?i)(api[_-]?key|secret|token|password|private[_-]?key)\s*[:=]\s*\S+"#,
            #"\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b"#,
            #"(?i)\b[0-9a-f]{64}\b"#,  // raw hex fingerprints / long keys; keep short sha prefixes in prose
        ]
        for p in patterns {
            if let re = try? NSRegularExpression(pattern: p) {
                t = re.stringByReplacingMatches(in: t, range: NSRange(t.startIndex..., in: t), withTemplate: "[redacted]")
            }
        }
        return t
    }

    static func blockTexts(_ page: [String: Any]) -> [(head: String, text: String)] {
        let blocks = page["blocks"] as? [[String: Any]] ?? []
        var out: [(String, String)] = []
        var curHead = ""
        var cur: [String] = []
        func flush() {
            let body = cur.joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines)
            if !curHead.isEmpty || !body.isEmpty { out.append((curHead, body)) }
            cur = []; curHead = ""
        }
        for b in blocks {
            let typ = (b["type"] as? String) ?? (b["kind"] as? String) ?? ""
            let text = (b["text"] as? String) ?? (b["t"] as? String) ?? (b["content"] as? String) ?? ""
            if typ == "head" || typ == "heading" || typ == "h2" || text.hasPrefix("## ") {
                flush()
                curHead = text.replacingOccurrences(of: "^#+\\s*", with: "", options: .regularExpression)
            } else {
                if typ == "text" || typ == "list" || typ == "code" || typ.isEmpty { cur.append(text) }
            }
        }
        flush()
        return out
    }

    static func excerpt(query: String, from url: URL, name: String) -> String {
        guard let data = try? Data(contentsOf: url),
              let page = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return "" }
        let turns = blockTexts(page)
        let q = query.lowercased()
        let qw = Set(q.split { !$0.isLetter && !$0.isNumber }.map(String.init).filter { $0.count >= 3 })
        var scored: [(Int, String, String)] = []
        for (i, t) in turns.enumerated() {
            if t.head.uppercased() == name || t.head.uppercased().hasPrefix("THUNDR FALLBACK") { continue }
            let hay = (t.head + "\n" + t.text).lowercased()
            let hit = qw.reduce(0) { $0 + (hay.contains($1) ? 1 : 0) }
            // Prefer query hits; otherwise keep the first few newest-first dated turns (already at the top after the title).
            let recency = max(0, 8 - i)
            let score = hit * 10 + recency
            if hit > 0 || i < 5 { scored.append((score, t.head, String(t.text.prefix(400)))) }
        }
        scored.sort { $0.0 > $1.0 }
        var parts: [String] = []
        var used = 0
        for s in scored.prefix(maxHits) {
            let chunk = (s.1.isEmpty ? s.2 : s.1 + "\n" + s.2)
            let t = redact(String(chunk.prefix(maxPerNote)))
            if t.isEmpty { continue }
            if used + t.count > maxPerNote { break }
            parts.append(t)
            used += t.count
        }
        return parts.joined(separator: "\n…\n")
    }

    /// Always-safe prompt suffix. Empty string when the notes folder is missing (e.g. ЯBOT before the helper push).
    static func promptBlock(query: String) -> String {
        guard let root = notesRoot() else { return "" }
        var chunks: [String] = []
        var total = 0
        for name in noteNames {
            guard let url = latestHead(in: root.appendingPathComponent(name, isDirectory: true)) else { continue }
            let body = excerpt(query: query, from: url, name: name)
            if body.isEmpty { continue }
            let piece = "[\(name) · \(url.lastPathComponent)]\n" + body
            if total + piece.count > maxTotalChars { break }
            chunks.append(piece)
            total += piece.count
        }
        guard !chunks.isEmpty else { return "" }
        return "\n\nЯSCRIBE notes (live, newest first, on this device). Use them when they answer the question; otherwise ignore. Never reveal secrets, addresses, or identifiers from them.\n" + chunks.joined(separator: "\n\n")
    }
}
