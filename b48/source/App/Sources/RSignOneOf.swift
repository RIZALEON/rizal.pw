// RSignOneOf.swift · 20261108-rwallet (Rizal t33u/t36u GO: "any ONE of Face ID or ASSM password") · ADD-ONLY extension of RSignCore.
// The existing Face-ID-only sign()/seal() (rule 20261102) is untouched. signOneOf/sealOneOf add the ASSM-password factor using the
// SAME Secure Enclave key, whose ACL is already [.privateKeyUsage, .biometryAny, .or, .applicationPassword] (enroll()).
//   factor "faceid"/"biometric" → identical to sign() (biometric context, no password box)
//   factor "assm"               → LAContext.setCredential(password, .applicationPassword); the Secure Enclave itself checks it.
// The password is used once in memory, never stored, logged or returned. Wrong password → SE refuses → {ok:false, assm_fail:true}.
// Local lockout mirrors submitd: 5 wrong tries → 15 minutes. NOT touched: RSignSealMint.swift autoSign (decision open).
import Foundation
import LocalAuthentication
import Security

extension RSignCore {
    static let oneOfFailKey = "rsign.oneof.assm.fails"
    static let oneOfLockKey = "rsign.oneof.assm.lockUntil"
    public func availableFactors() -> [String] {
        var f: [String] = []; let k = biometryKind(); if k != "none" { f.append(k == "faceID" || k == "faceid" ? "faceid" : (k == "touchID" || k == "touchid" ? "touchid" : "biometric")) }
        f.append("assm"); return f
    }
    func oneOfLockedSeconds() -> Int { let u = UserDefaults.standard.double(forKey: Self.oneOfLockKey); return max(0, Int(u - Date().timeIntervalSince1970)) }
    func oneOfFail() { let d = UserDefaults.standard; var n = d.integer(forKey: Self.oneOfFailKey) + 1
        if n >= 5 { d.set(Date().timeIntervalSince1970 + 15 * 60, forKey: Self.oneOfLockKey); n = 0 }; d.set(n, forKey: Self.oneOfFailKey) }
    func oneOfOk() { UserDefaults.standard.set(0, forKey: Self.oneOfFailKey) }

    /// Sign a 64-hex hash with ONE factor. password only for factor == "assm".
    public func signOneOf(_ hashHex: String, factor: String, password: [UInt8]? = nil, reason: String = "Seal RSIGN for @chaserizal", done: @escaping ([String: Any]) -> Void) {
        if factor != "assm" { return sign(hashHex, reason: reason, done: done) }     // biometric path = the existing Face ID rule
        guard hashHex.range(of: "^[0-9a-f]{64}$", options: .regularExpression) != nil else { return done(["ok": false, "err": "hash must be 64 hex"]) }
        let left = oneOfLockedSeconds(); if left > 0 { return done(["ok": false, "err": "ASSM password locked", "locked_s": left]) }
        guard var pw = password, !pw.isEmpty else { return done(["ok": false, "err": "ASSM password required"]) }
        let ctx = LAContext(); ctx.localizedReason = reason; ctx.interactionNotAllowed = true   // never show an OS password box
        _ = ctx.setCredential(Data(pw), type: .applicationPassword)
        for i in pw.indices { pw[i] = 0 }
        signWith(ctx, hashHex, reason: reason) { r in
            if r["ok"] as? Bool == true { self.oneOfOk(); done(r) }
            else { self.oneOfFail(); done(["ok": false, "err": "ASSM password refused by Secure Enclave", "assm_fail": true, "locked_s": self.oneOfLockedSeconds()]) }
        }
    }
    /// Same entry format as seal(): RID check, no auto-enroll, low-S sig, entry_json out.
    public func sealOneOf(_ entryJSON: String, factor: String, password: [UInt8]? = nil, done: @escaping ([String: Any]) -> Void) {
        if factor != "assm" { return seal(entryJSON, done: done) }
        guard var e = (try? JSONSerialization.jsonObject(with: Data(entryJSON.utf8))) as? [String: Any] else { return done(["ok": false, "err": "entry is not JSON"]) }
        guard let rid = ridState()["rid"] as? String, !rid.isEmpty, rid == e["owner_rid"] as? String else { return done(["ok": false, "err": "RID asset missing · ASSM sign-in first"]) }
        guard wrapPub() != nil else { return done(["ok": false, "err": Self.ERR_NO_RGHOSTKEY]) }
        guard let k = seKey(), let pub = SecKeyCopyPublicKey(k), let pb = pubB64(pub) else { return done(["ok": false, "err": "no RSIGN key · enroll first"]) }
        e["t"] = "rsign.seal"; e["v"] = 1; e["device_id"] = Self.deviceId(pb); e["pubkey"] = pb; e.removeValue(forKey: "sig")
        let h = Self.sha256hex(Self.canon(e))
        signOneOf(h, factor: "assm", password: password) { r in
            guard r["ok"] as? Bool == true, let s = r["sig_b64"] as? String else { return done(r) }
            e["sig"] = s
            let out = String(data: try! JSONSerialization.data(withJSONObject: e, options: [.sortedKeys, .withoutEscapingSlashes]), encoding: .utf8)!
            done(["ok": true, "entry_hash": h, "sig_b64": s, "entry_json": out, "pubkey_b64": pb, "factor": "assm"]); self.onSealed?(h)
        }
    }
    /// WK "rsign" reply-handler ops (add to the existing handler's switch): factors · sealOneOf. Returns nil for other ops.
    public func handleOneOfMessage(_ body: [String: Any], reply: @escaping ([String: Any]) -> Void) -> Bool {
        switch body["op"] as? String {
        case "factors": reply(["ok": true, "factors": availableFactors()]); return true
        case "sealOneOf":
            let f = (body["factor"] as? String) ?? "faceid"; let entry = (body["entry"] as? String) ?? ""
            let pw = (body["assm_password"] as? String).map { Array($0.utf8) }
            sealOneOf(entry, factor: f, password: pw, done: reply); return true
        default: return false
        }
    }
}
