// MiniUnzip.swift — tiny read-only ZIP reader for DRAGON SKULL web bundles (stored + deflate). Apple Compression only, no dependencies.
// Rejects ZIP64, encryption, and any method other than 0/8; checks CRC-32 of every file. Callers still verify paths and the signed SHA-256.
import Foundation
import Compression

enum MiniUnzip {
    struct Entry {
        let name: String, method: UInt16, flags: UInt16, crc: UInt32, compressedSize: Int, size: Int, localOffset: Int, externalAttr: UInt32
        var isSymlink: Bool { (externalAttr >> 16) & 0o170000 == 0o120000 }
    }
    static let maxEntrySize = 16 << 20

    private static func u16(_ b: [UInt8], _ o: Int) -> Int { Int(b[o]) | Int(b[o + 1]) << 8 }
    private static func u32(_ b: [UInt8], _ o: Int) -> Int { u16(b, o) | u16(b, o + 2) << 16 }

    static func entries(_ b: [UInt8]) throws -> [Entry] {
        guard b.count >= 22 else { throw SelfUpdateError("zip too short") }
        var eocd = -1
        var i = b.count - 22
        let stop = max(0, b.count - 22 - 65535)
        while i >= stop { if u32(b, i) == 0x06054b50 { eocd = i; break }; i -= 1 }
        guard eocd >= 0 else { throw SelfUpdateError("zip: no end-of-central-directory") }
        let count = u16(b, eocd + 10), cdSize = u32(b, eocd + 12), cdOff = u32(b, eocd + 16)
        guard count != 0xffff, cdSize != 0xffffffff, cdOff != 0xffffffff else { throw SelfUpdateError("zip64 not supported") }
        guard cdOff + cdSize <= eocd else { throw SelfUpdateError("zip: bad central directory") }
        var out: [Entry] = []
        var p = cdOff
        for _ in 0..<count {
            guard p + 46 <= eocd, u32(b, p) == 0x02014b50 else { throw SelfUpdateError("zip: bad central header") }
            let flags = UInt16(u16(b, p + 8)), method = UInt16(u16(b, p + 10))
            let nameLen = u16(b, p + 28), extraLen = u16(b, p + 30), commentLen = u16(b, p + 32)
            guard p + 46 + nameLen <= eocd else { throw SelfUpdateError("zip: bad name") }
            guard let name = String(bytes: b[(p + 46)..<(p + 46 + nameLen)], encoding: .utf8) else { throw SelfUpdateError("zip: name not UTF-8") }
            let e = Entry(name: name, method: method, flags: flags, crc: UInt32(u32(b, p + 16)), compressedSize: u32(b, p + 20),
                          size: u32(b, p + 24), localOffset: u32(b, p + 42), externalAttr: UInt32(u32(b, p + 38)))
            guard flags & 1 == 0 else { throw SelfUpdateError("zip: encrypted entry \(name)") }
            guard method == 0 || method == 8 else { throw SelfUpdateError("zip: method \(method) not supported (\(name))") }
            guard e.size <= maxEntrySize else { throw SelfUpdateError("zip: entry too large (\(name))") }
            out.append(e)
            p += 46 + nameLen + extraLen + commentLen
        }
        return out
    }

    static func extract(_ b: [UInt8], _ e: Entry) throws -> Data {
        let o = e.localOffset
        guard o + 30 <= b.count, u32(b, o) == 0x04034b50 else { throw SelfUpdateError("zip: bad local header (\(e.name))") }
        let start = o + 30 + u16(b, o + 26) + u16(b, o + 28)
        guard start + e.compressedSize <= b.count else { throw SelfUpdateError("zip: truncated (\(e.name))") }
        let src = Array(b[start..<(start + e.compressedSize)])
        var out: [UInt8]
        if e.method == 0 {
            guard e.compressedSize == e.size else { throw SelfUpdateError("zip: stored size mismatch (\(e.name))") }
            out = src
        } else if e.size == 0 {
            out = []
        } else {
            out = [UInt8](repeating: 0, count: e.size)
            let n = out.withUnsafeMutableBufferPointer { dst in
                src.withUnsafeBufferPointer { s in
                    compression_decode_buffer(dst.baseAddress!, e.size, s.baseAddress!, src.count, nil, COMPRESSION_ZLIB)   // raw DEFLATE
                }
            }
            guard n == e.size else { throw SelfUpdateError("zip: inflate failed (\(e.name))") }
        }
        guard crc32(out) == e.crc else { throw SelfUpdateError("zip: CRC mismatch (\(e.name))") }
        return Data(out)
    }

    private static let table: [UInt32] = (0..<256).map { n -> UInt32 in
        var c = UInt32(n)
        for _ in 0..<8 { c = (c & 1) != 0 ? 0xedb88320 ^ (c >> 1) : c >> 1 }
        return c
    }
    static func crc32(_ b: [UInt8]) -> UInt32 {
        var c: UInt32 = 0xffffffff
        for x in b { c = table[Int((c ^ UInt32(x)) & 0xff)] ^ (c >> 8) }
        return c ^ 0xffffffff
    }
}
