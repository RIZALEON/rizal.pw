// RGhostkeyAPI.swift · RWALLET 0.1.4 · 20261109 (Rizal t66u: "same functions across all devices") · ADD-ONLY.
// ONE rghostkey interface on every Apple platform (iOS 17e RDRAGON, Neo macOS RDRAGON). Same method names as
// android/RGhostkeyApi.java and ui/js/rghostkey-api.js:  status() · methods() · unlock(method) · sign(entry) · approve(requestId) · logout()
// RULES (enforced in code): uses ONLY the device's already-pinned key (RGhostkeyBindSeal.publicIdentity: Secure Enclave tag
// info.rizal.rsign.se.p256, or on Neo the non-extractable login-keychain key info.rizal.rsign.mac.p256.v2). NEVER creates, enrolls,
// exports, copies or syncs a key: no key, or a key whose pubkey_sha256 is not pinned → refused. Every signature needs one unlock on
// THIS device (Face ID / Touch ID / Mac password via the key's own ACL, or the ASSM password via RSignOneOf when the SE key's ACL has
// .applicationPassword). No held unlock context, no timer, no auto-approve. RSignSealMint / rghostkey.auto are not referenced.
// Wiring: RGhostkeyAppleWK.install(on: webView)  → WK "rghostkey" (with reply), used by ui/js/rghostkey-api.js.
import Foundation
import WebKit

public protocol RGhostkey {
    func status() -> [String: Any]
    func methods() -> [String]
    func unlock(_ method: String) -> [String: Any]
    func sign(_ entry: [String: Any], method: String, password: [UInt8]?, done: @escaping ([String: Any]) -> Void)
    func approve(_ requestId: String, entry: [String: Any], method: String, password: [UInt8]?, done: @escaping ([String: Any]) -> Void)
    func logout() -> [String: Any]
}

enum RGhostkeyPins {   // public pubkey_sha256 pins (bind/pending approve list, 20261109). Public hashes only.
    static let pinned: [String: String] = [
        "neo-rdragon": "5752020b5092d5e381ba30872b5e7d009e66d12d54d3ac1eea4246f6881c8782",
        "iphone17e-rdragon": "26431cd4ec8ede1dae476335b7562c1d2a45b656904728d574939dae7633b0eb",
        "moto-rdragon": "9acf9fbd0069bfa4993f0354caa2eaf46594af4ca33f3759dea4d3c2133bd54e",
    ]
}

final class RGhostkeyApple: RGhostkey {
    static let shared = RGhostkeyApple()
    static let API = "rghostkey-api 1.0"
    #if os(macOS)
    static let platform = "macos"
    #else
    static let platform = "ios"
    #endif

    func identity() -> [String: Any] { RGhostkeyBindSeal.publicIdentity() }      // read-only: never creates
    func pinnedSlot(_ id: [String: Any]) -> String? {
        guard (id["ok"] as? Bool) == true, let s = id["pubkey_sha256"] as? String else { return nil }
        return RGhostkeyPins.pinned.first { $0.value == s }?.key
    }
    func isSE(_ id: [String: Any]) -> Bool { (id["backend"] as? String) == "SecureEnclave" }

    func methods() -> [String] {
        let id = identity(); guard pinnedSlot(id) != nil else { return [] }
        let bio = RSignCore.shared.biometryKind()
        var m: [String] = []
        if bio != "none" { m.append(bio) }                          // faceid / touchid (key ACL)
        if isSE(id) { m.append("assm") }                            // SE ACL .applicationPassword → RSignOneOf
        #if os(macOS)
        if !isSE(id) { m.append("mac-password") }                   // login-keychain key: .userPresence (Touch ID or Mac password)
        #endif
        return m
    }
    func status() -> [String: Any] {
        let id = identity(); let slot = pinnedSlot(id)
        return ["ok": true, "api": Self.API, "platform": Self.platform, "has_key": (id["ok"] as? Bool) == true, "pinned": slot != nil,
                "slot": slot as Any, "backend": id["backend"] as Any, "pubkey_sha256": id["pubkey_sha256"] as Any,
                "methods": methods(), "locked_s": RSignCore.shared.oneOfLockedSeconds(), "tier": slot != nil ? "hard" : "none",
                "creates_keys": false, "auto_sign": false, "held_unlock": false]
    }
    func unlock(_ method: String) -> [String: Any] {
        let m = methods()
        guard m.contains(method) else { return ["ok": false, "err": "method not available here", "methods": m] }
        // No context is held: the unlock is performed by the key's own ACL at sign time (one prompt, one signature).
        return ["ok": true, "method": method, "at": "sign", "held_unlock": false]
    }
    func logout() -> [String: Any] {
        // Native holds no session token; the ASSM session lives in RMINT_SESSION (JS) and is revoked server-side by /assm/logout.
        return ["ok": true, "native_session": false, "next": "RMINT_SESSION.logout() → POST /assm/logout"]
    }

    func sign(_ entry: [String: Any], method: String, password: [UInt8]?, done: @escaping ([String: Any]) -> Void) {
        let id = identity()
        guard (id["ok"] as? Bool) == true else { return done(["ok": false, "err": "ERR_NO_RGHOSTKEY · enroll is human-only; this API never creates a key"]) }
        guard let slot = pinnedSlot(id) else { return done(["ok": false, "err": "key on this device is not pinned · refused"]) }
        guard methods().contains(method) else { return done(["ok": false, "err": "method not available here", "methods": methods()]) }
        if entry["purpose"] as? String == RGhostkeyBindSeal.PURPOSE {
            if method == "assm" { return bindWithAssm(entry, id: id, slot: slot, password: password, done: done) }
            // OS unlock via the key's own ACL (Face ID / Touch ID / Mac password). Identity already exists, so no key is created.
            return RGhostkeyBindSeal.sealBind(sealEntry: entry) { r in
                var o = r; if let s = r["rsign_seal"] { o["entry"] = s }; o["factor"] = method; o["slot"] = slot; done(o)
            }
        }
        // Non-bind items: the existing RSign seal format (RID check, low-S), same SE key, one factor.
        guard isSE(id), let js = try? JSONSerialization.data(withJSONObject: entry), let s = String(data: js, encoding: .utf8) else {
            return done(["ok": false, "err": "only rghostkey.bind is signable with this key backend"])
        }
        RSignCore.shared.sealOneOf(s, factor: method == "assm" ? "assm" : "biometric", password: password) { r in var o = r; o["slot"] = slot; done(o) }
    }

    /// Block bind with the ASSM password on the SAME pinned SE key (RSignOneOf.signOneOf → LAContext.setCredential). Same entry
    /// fields and message ("rsign.v1|" + sha256(canon(entry))) as RGhostkeyBindSeal.sealBind, so the chain verifies it identically.
    func bindWithAssm(_ se: [String: Any], id: [String: Any], slot: String, password: [UInt8]?, done: @escaping ([String: Any]) -> Void) {
        guard let pw = password, !pw.isEmpty else { return done(["ok": false, "err": "ASSM password required"]) }
        guard se["owner_rid"] as? String == RGhostkeyBindSeal.OWNER_RID, se["handle"] as? String == RGhostkeyBindSeal.OWNER_HANDLE,
              let block = se["block_sha256"] as? String, block.range(of: "^[0-9a-f]{64}$", options: .regularExpression) != nil,
              let prev = se["prev_hash"] as? String, prev.range(of: "^[0-9a-f]{64}$", options: .regularExpression) != nil,
              let pub = id["pubkey_spki_b64"] as? String else { return done(["ok": false, "err": "bad bind entry"]) }
        var entry: [String: Any] = ["v": 1, "t": "rsign.seal", "device_id": RGhostkeyBindSeal.deviceId(spkiB64: pub),
                                    "owner_rid": RGhostkeyBindSeal.OWNER_RID, "handle": RGhostkeyBindSeal.OWNER_HANDLE, "pubkey": pub,
                                    "stack": RGhostkeyBindSeal.STACK, "botlatch_ref": RGhostkeyBindSeal.BOTLATCH,
                                    "ts": ISO8601DateFormatter().string(from: Date()), "prev_hash": prev,
                                    "purpose": RGhostkeyBindSeal.PURPOSE, "block_sha256": block]
        let h = RGhostkeyBindSeal.sha256hex(RGhostkeyBindSeal.canon(entry))
        RSignCore.shared.signOneOf(h, factor: "assm", password: pw, reason: "RWALLET ASSM password to sign the block bind") { r in
            guard (r["ok"] as? Bool) == true, let sig = r["sig_b64"] as? String else { return done(r) }
            entry["sig"] = sig
            done(["ok": true, "rsign_seal": entry, "entry": entry, "entry_hash": h, "factor": "assm", "slot": slot, "backend": id["backend"] as Any])
        }
    }

    func approve(_ requestId: String, entry: [String: Any], method: String, password: [UInt8]?, done: @escaping ([String: Any]) -> Void) {
        guard requestId.range(of: "^[A-Za-z0-9._-]{3,80}$", options: .regularExpression) != nil else { return done(["ok": false, "err": "bad request id"]) }
        sign(entry, method: method, password: password) { r in var o = r; o["request_id"] = requestId; done(o) }
    }
}

/// WK "rghostkey" (with reply): {op: status|methods|unlock|sign|approve|logout, method, entry, request_id, assm_password}
final class RGhostkeyAppleWK: NSObject, WKScriptMessageHandlerWithReply {
    static let shared = RGhostkeyAppleWK()
    static func install(on w: WKWebView) { w.configuration.userContentController.addScriptMessageHandler(shared, contentWorld: .page, name: "rghostkey") }
    func userContentController(_ u: WKUserContentController, didReceive m: WKScriptMessage, replyHandler: @escaping (Any?, String?) -> Void) {
        let k = RGhostkeyApple.shared
        guard let b = m.body as? [String: Any], let op = b["op"] as? String else { return replyHandler(["ok": false, "err": "bad message"], nil) }
        let reply: ([String: Any]) -> Void = { r in DispatchQueue.main.async { replyHandler(r, nil) } }
        let method = b["method"] as? String ?? ""
        var pw: [UInt8]? = (b["assm_password"] as? String).map { Array($0.utf8) }
        let wipe = { if pw != nil { for i in pw!.indices { pw![i] = 0 }; pw = nil } }
        switch op {
        case "status": reply(k.status())
        case "methods": reply(["ok": true, "methods": k.methods()])
        case "unlock": reply(k.unlock(method))
        case "logout": reply(k.logout())
        case "sign", "approve":
            guard let e = b["entry"] as? [String: Any] else { return reply(["ok": false, "err": "entry required"]) }
            let p = pw; wipe()
            if op == "sign" { k.sign(e, method: method, password: p, done: reply) }
            else { k.approve(b["request_id"] as? String ?? "", entry: e, method: method, password: p, done: reply) }
        default: reply(["ok": false, "err": "unknown op"])
        }
    }
}
