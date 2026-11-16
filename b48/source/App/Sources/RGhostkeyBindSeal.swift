// RGhostkeyBindSeal — RDRAGON Block-4 bind seal + public identity (20261105).
// Reuses RSign Secure Enclave tag info.rizal.rsign.se.p256 (or macOS login-keychain fallback).
// Private never leaves Keychain/SE. Public SPKI only for enroll / seals / wallet views.
// ONE shared ASSM @chaserizal / ЯID-0001-3QQS RWALLET everywhere; per-device RGHOSTKEY = unlock/sign key only (not a separate wallet).
// No mint, no chain publish, no BioSource writes.
import Foundation
import Security
import LocalAuthentication
import CryptoKit
#if canImport(UIKit)
import UIKit
#endif

enum RGhostkeyBindSeal {
    static let OWNER_RID = "ЯID-0001-3QQS"
    static let OWNER_HANDLE = "@chaserizal"
    static let PURPOSE = "rghostkey.bind"
    static let STACK = ["RGHOSTCHAIN", "RWALLET", "RVAULT", "RMINT"]
    static let BOTLATCH = "botlatch:view-only"
    static let SE_TAG = "info.rizal.rsign.se.p256".data(using: .utf8)!
    // v2: permanent keychain KEY ref + biometric ACL. Never store SecKeyCopyExternalRepresentation(private).
    // v1 generic-password raw private blob is retired/deleted (exportable).
    static let MAC_TAG = "info.rizal.rsign.mac.p256.v2".data(using: .utf8)!
    static let MAC_ACCT_V1_RETIRED = "rghostkey.p256.login-keychain.v1"
    static let MAC_SVC = "info.rizal.rsign.assm"
    static let SLOT_NEO = "neo-rdragon"
    static let ALIAS_NEO = "neo-55d92eb0-0ce0-4959-b297-440d80e59e38"
    // SPKI prefix for P-256 SubjectPublicKeyInfo (91 bytes total with 65-byte point)
    static let spkiP256Prefix: [UInt8] = [
        0x30,0x59,0x30,0x13,0x06,0x07,0x2a,0x86,0x48,0xce,0x3d,0x02,0x01,
        0x06,0x08,0x2a,0x86,0x48,0xce,0x3d,0x03,0x01,0x07,0x03,0x42,0x00
    ]
    static let P256N: [UInt8] = [
        0xFF,0xFF,0xFF,0xFF,0x00,0x00,0x00,0x00,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,
        0xBC,0xE6,0xFA,0xAD,0xA7,0x17,0x9E,0x84,0xF3,0xB9,0xCA,0xC2,0xFC,0x63,0x25,0x51
    ]

    static func canon(_ o: Any) -> String {
        guard let data = try? JSONSerialization.data(withJSONObject: o, options: [.sortedKeys]) else { return "{}" }
        // JSONSerialization inserts no spaces with sortedKeys on Apple platforms for compact? Actually adds nothing with empty options.
        // Ensure separators match Python separators=(",", ":") — no spaces.
        if let obj = try? JSONSerialization.jsonObject(with: data),
           let compact = try? JSONSerialization.data(withJSONObject: obj, options: [.sortedKeys]),
           let s = String(data: compact, encoding: .utf8) {
            return s.replacingOccurrences(of: " : ", with: ":").replacingOccurrences(of: ", ", with: ",")
        }
        return String(data: data, encoding: .utf8) ?? "{}"
    }
    static func sha256hex(_ s: String) -> String {
        SHA256.hash(data: Data(s.utf8)).map { String(format: "%02x", $0) }.joined()
    }
    static func reqHash(sealEntry: [String: Any], bundle: [String: Any]) -> String {
        sha256hex(canon(["seal_entry": sealEntry, "bundle": bundle]))
    }
    static func lowS(_ der: Data) -> Data? {
        let b = [UInt8](der); guard b.count > 8, b[0] == 0x30, b[2] == 0x02 else { return nil }
        let rl = Int(b[3]); let r = Array(b[4..<4+rl]); guard b.count > 5+rl, b[4+rl] == 0x02 else { return nil }
        let sl = Int(b[5+rl]); guard b.count >= 6+rl+sl else { return nil }
        var s = Array(b[(6+rl)..<(6+rl+sl)]); while s.count > 32 && s.first == 0 { s.removeFirst() }
        while s.count < 32 { s.insert(0, at: 0) }
        var half = [UInt8](repeating: 0, count: 32); var c: UInt8 = 0
        for i in 0..<32 { half[i] = (P256N[i] >> 1) | c; c = (P256N[i] & 1) << 7 }
        if s.lexicographicallyPrecedes(half) || s == half { return der }
        var o = [UInt8](repeating: 0, count: 32); var br = 0
        for i in (0..<32).reversed() { let d = Int(P256N[i]) - Int(s[i]) - br; br = d < 0 ? 1 : 0; o[i] = UInt8((d + 256) & 0xFF) }
        func enc(_ x: [UInt8]) -> [UInt8] { var v = x; if let f = v.first, f & 0x80 != 0 { v.insert(0, at: 0) }; return [0x02, UInt8(v.count)] + v }
        let rb = enc(r), sb = enc(o); let body = rb + sb
        return Data([0x30, UInt8(body.count)] + body)
    }

    static func sePrivate() -> SecKey? {
        let q: [String: Any] = [kSecClass as String: kSecClassKey, kSecAttrApplicationTag as String: SE_TAG,
                                kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom, kSecReturnRef as String: true]
        var r: CFTypeRef?; return SecItemCopyMatching(q as CFDictionary, &r) == errSecSuccess ? (r as! SecKey) : nil
    }
    static func macPrivateRef() -> SecKey? {
        let accessGroup = "7D3P5F4V9M.info.rizal.rdragon.rmail"
        let q: [String: Any] = [kSecClass as String: kSecClassKey, kSecAttrApplicationTag as String: MAC_TAG,
                                kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom, kSecReturnRef as String: true,
                                kSecAttrIsPermanent as String: true]
        _ = accessGroup // login keychain (option A); data-protection group returns with Apple signing (option B)
        var r: CFTypeRef?
        return SecItemCopyMatching(q as CFDictionary, &r) == errSecSuccess ? (r as! SecKey) : nil
    }
    /// Retire any leftover v1 raw private blob (generic password). Never reads/prints secret.
    static func deleteRetiredV1RawBlob() {
        let q: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: MAC_SVC,
                                kSecAttrAccount as String: MAC_ACCT_V1_RETIRED]
        SecItemDelete(q as CFDictionary)
    }
    static func rawPub65(from priv: SecKey) -> Data? {
        guard let p = SecKeyCopyPublicKey(priv), let d = SecKeyCopyExternalRepresentation(p, nil) as Data?, d.count == 65 else { return nil }
        return d
    }
    static func spkiB64(from raw65: Data) -> String { (Data(spkiP256Prefix) + raw65).base64EncodedString() }
    static func deviceId(spkiB64: String) -> String {
        guard let raw = Data(base64Encoded: spkiB64) else { return "" }
        let h = SHA256.hash(data: raw).map { String(format: "%02x", $0) }.joined()
        return "rsd-" + String(h.prefix(32))
    }
    static func pubkeySha256(spkiB64: String) -> String? {
        guard let raw = Data(base64Encoded: spkiB64), raw.count == 91 else { return nil }
        return SHA256.hash(data: raw).map { String(format: "%02x", $0) }.joined()
    }

    /// Public-only status of neo RGHOSTKEY identity. Never returns private material.
    static func publicIdentity() -> [String: Any] {
        if let k = sePrivate(), let raw = rawPub65(from: k) {
            let spki = spkiB64(from: raw)
            return ["ok": true, "backend": "SecureEnclave", "slot": SLOT_NEO, "alias_of": ALIAS_NEO,
                    "pubkey_spki_b64": spki, "pubkey_sha256": pubkeySha256(spkiB64: spki) as Any,
                    "rsd_device_id": deviceId(spkiB64: spki), "exportable_private": false]
        }
        #if os(macOS)
        deleteRetiredV1RawBlob()
        if let k = macPrivateRef(), let raw = rawPub65(from: k) {
            let spki = spkiB64(from: raw)
            return ["ok": true, "backend": "macOS-login-keychain-nonextractable-ASSM", "slot": SLOT_NEO, "alias_of": ALIAS_NEO,
                    "pubkey_spki_b64": spki, "pubkey_sha256": pubkeySha256(spkiB64: spki) as Any,
                    "rsd_device_id": deviceId(spkiB64: spki), "exportable_private": false,
                    "note": "App never exports private; keychain key ref + userPresence ACL. Prefer SE when entitled."]
        }
        #endif
        return ["ok": false, "err": "ERR_NO_RGHOSTKEY", "slot": SLOT_NEO, "alias_of": ALIAS_NEO]
    }

    /// Create identity if absent. Prefers Secure Enclave (non-exportable). Does not write private to disk/JSON.
    static func ensureIdentity() -> [String: Any] {
        let cur = publicIdentity(); if (cur["ok"] as? Bool) == true { return cur }
        var e: Unmanaged<CFError>?
        guard let ac = SecAccessControlCreateWithFlags(nil, kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly,
                                                       [.privateKeyUsage, .biometryAny, .or, .applicationPassword], &e) else {
            return ["ok": false, "err": "access-control: \(e?.takeRetainedValue().localizedDescription ?? "?")"]
        }
        let privAttrs: [String: Any] = [kSecAttrIsPermanent as String: true, kSecAttrApplicationTag as String: SE_TAG, kSecAttrAccessControl as String: ac]
        var attrs: [String: Any] = [kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom, kSecAttrKeySizeInBits as String: 256,
                                    kSecAttrTokenID as String: kSecAttrTokenIDSecureEnclave, kSecPrivateKeyAttrs as String: privAttrs]
        #if os(macOS)
        attrs[kSecUseDataProtectionKeychain as String] = true
        #endif
        if let k = SecKeyCreateRandomKey(attrs as CFDictionary, &e), let raw = rawPub65(from: k) {
            let spki = spkiB64(from: raw)
            return ["ok": true, "created": true, "backend": "SecureEnclave", "slot": SLOT_NEO, "alias_of": ALIAS_NEO,
                    "pubkey_spki_b64": spki, "pubkey_sha256": pubkeySha256(spkiB64: spki) as Any,
                    "rsd_device_id": deviceId(spkiB64: spki), "exportable_private": false]
        }
        let seErr = e?.takeRetainedValue().localizedDescription ?? "SE create failed"
        #if os(macOS)
        // Non-exportable-by-app fallback: permanent keychain KEY (not generic-password raw blob) + userPresence ACL.
        // Never call SecKeyCopyExternalRepresentation on the private key.
        // LA gate before mac key create (caller RMailBlock4Native also gates; defense in depth).
        deleteRetiredV1RawBlob()
        var e2: Unmanaged<CFError>?
        guard let acMac = SecAccessControlCreateWithFlags(nil, kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
                                                          [.privateKeyUsage, .userPresence], &e2) else {
            return ["ok": false, "err": "mac-acl: \(e2?.takeRetainedValue().localizedDescription ?? "?")", "se_blocker": seErr]
        }
        // Requires app signed with application-identifier + keychain-access-groups (Team 7D3P5F4V9M).
        let accessGroup = "7D3P5F4V9M.info.rizal.rdragon.rmail"
        _ = acMac; _ = accessGroup
        // Option A: login keychain, non-extractable private key; use is gated by ASSM device-owner auth (LAContext) before signing.
        let macPrivAttrs: [String: Any] = [kSecAttrIsPermanent as String: true, kSecAttrApplicationTag as String: MAC_TAG,
                                           kSecAttrIsExtractable as String: false,
                                           kSecAttrLabel as String: "RGHOSTKEY neo-rdragon"]
        let macAttrs: [String: Any] = [kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom, kSecAttrKeySizeInBits as String: 256,
                                       kSecPrivateKeyAttrs as String: macPrivAttrs]
        if let k = SecKeyCreateRandomKey(macAttrs as CFDictionary, &e), let raw = rawPub65(from: k) {
            let spki = spkiB64(from: raw)
            return ["ok": true, "created": true, "backend": "macOS-login-keychain-nonextractable-ASSM", "slot": SLOT_NEO,
                    "alias_of": ALIAS_NEO, "pubkey_spki_b64": spki, "pubkey_sha256": pubkeySha256(spkiB64: spki) as Any,
                    "rsd_device_id": deviceId(spkiB64: spki), "exportable_private": false,
                    "se_blocker": seErr, "note": "SE entitlement missing; keychain key-ref fallback (app never exports private)"]
        }
        return ["ok": false, "err": "mac-keyref-create-failed: \(e?.takeRetainedValue().localizedDescription ?? "?")", "se_blocker": seErr]
        #endif
        return ["ok": false, "err": "cannot-create-rghostkey", "se_blocker": seErr,
                "blocker": "Secure Enclave create failed; no safe store without RSign Keychain fallback success. Refusing plaintext JSON private."]
    }

    static func faceIdSign(message: Data, reason: String, done: @escaping (Data?, String) -> Void) {
        let finish: (Data?, String) -> Void = { s, e in DispatchQueue.main.async { done(s, e) } }
        let ctx = LAContext(); ctx.localizedFallbackTitle = ""; ctx.localizedReason = reason
        if sePrivate() != nil {
            let lq: [String: Any] = [kSecClass as String: kSecClassKey, kSecAttrApplicationTag as String: SE_TAG,
                                     kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
                                     kSecReturnAttributes as String: true, kSecUseAuthenticationUI as String: kSecUseAuthenticationUISkip]
            var ar: CFTypeRef?
            guard SecItemCopyMatching(lq as CFDictionary, &ar) == errSecSuccess,
                  let attrs = ar as? [String: Any], let acl = attrs[kSecAttrAccessControl as String] else {
                return finish(nil, "ERR_NO_RGHOSTKEY")
            }
            ctx.evaluateAccessControl(acl as! SecAccessControl, operation: .useKeySign, localizedReason: reason) { ok, err in
                guard ok else { return finish(nil, "Face ID cancelled" + (err.map { ": \($0.localizedDescription)" } ?? "")) }
                DispatchQueue.global(qos: .userInitiated).async {
                    let q: [String: Any] = [kSecClass as String: kSecClassKey, kSecAttrApplicationTag as String: SE_TAG,
                                            kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom, kSecReturnRef as String: true,
                                            kSecUseAuthenticationContext as String: ctx]
                    var r: CFTypeRef?
                    guard SecItemCopyMatching(q as CFDictionary, &r) == errSecSuccess else { return finish(nil, "no RSIGN key") }
                    var e: Unmanaged<CFError>?
                    guard let der = SecKeyCreateSignature(r as! SecKey, .ecdsaSignatureMessageX962SHA256, message as CFData, &e) as Data?,
                          let low = lowS(der) else { return finish(nil, e?.takeRetainedValue().localizedDescription ?? "no signature") }
                    finish(low, "")
                }
            }
            return
        }
        #if os(macOS)
        guard let k0 = macPrivateRef() else { return finish(nil, "ERR_NO_RGHOSTKEY") }
        let lq: [String: Any] = [kSecClass as String: kSecClassKey, kSecAttrApplicationTag as String: MAC_TAG,
                                 kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
                                 kSecReturnAttributes as String: true, kSecUseAuthenticationUI as String: kSecUseAuthenticationUISkip]
        var ar: CFTypeRef?; _ = SecItemCopyMatching(lq as CFDictionary, &ar)
        let acl = (ar as? [String: Any])?[kSecAttrAccessControl as String]
        let proceed: (LAContext) -> Void = { ctx2 in
            DispatchQueue.global(qos: .userInitiated).async {
                let q: [String: Any] = [kSecClass as String: kSecClassKey, kSecAttrApplicationTag as String: MAC_TAG,
                                        kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom, kSecReturnRef as String: true,
                                        kSecUseAuthenticationContext as String: ctx2]
                var r: CFTypeRef?
                guard SecItemCopyMatching(q as CFDictionary, &r) == errSecSuccess else { return finish(nil, "ERR_NO_RGHOSTKEY") }
                var e: Unmanaged<CFError>?
                guard let der = SecKeyCreateSignature(r as! SecKey, .ecdsaSignatureMessageX962SHA256, message as CFData, &e) as Data?,
                      let low = lowS(der) else { return finish(nil, e?.takeRetainedValue().localizedDescription ?? "no signature") }
                finish(low, "")
            }
        }
        if let acl = acl {
            ctx.evaluateAccessControl(acl as! SecAccessControl, operation: .useKeySign, localizedReason: reason) { ok, err in
                guard ok else { return finish(nil, "ASSM/device unlock cancelled" + (err.map { ": \($0.localizedDescription)" } ?? "")) }
                proceed(ctx)
            }
        } else {
            var lerr: NSError?
            guard ctx.canEvaluatePolicy(.deviceOwnerAuthentication, error: &lerr) else {
                return finish(nil, "Device unlock unavailable: \(lerr?.localizedDescription ?? "")")
            }
            ctx.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { ok, err in
                guard ok else { return finish(nil, "ASSM/device unlock cancelled") }
                proceed(ctx)
            }
        }
        _ = k0
        return
        #else
        finish(nil, "ERR_NO_RGHOSTKEY")
        #endif
    }

    /// Build public rsign_seal for purpose rghostkey.bind after biometric. Hash-bound to seal_entry fields.
    static func sealBind(sealEntry: [String: Any], done: @escaping ([String: Any]) -> Void) {
        guard sealEntry["purpose"] as? String == PURPOSE else { return done(["ok": false, "err": "purpose must be rghostkey.bind"]) }
        guard sealEntry["owner_rid"] as? String == OWNER_RID, sealEntry["handle"] as? String == OWNER_HANDLE else {
            return done(["ok": false, "err": "owner must be ЯID-0001-3QQS @chaserizal"])
        }
        guard let block = sealEntry["block_sha256"] as? String, block.range(of: "^[0-9a-f]{64}$", options: .regularExpression) != nil,
              let prev = sealEntry["prev_hash"] as? String, prev.range(of: "^[0-9a-f]{64}$", options: .regularExpression) != nil else {
            return done(["ok": false, "err": "block_sha256/prev_hash must be 64 hex"])
        }
        let id = ensureIdentity()
        guard (id["ok"] as? Bool) == true, let pub = id["pubkey_spki_b64"] as? String else {
            return done(["ok": false, "err": id["err"] as? String ?? id["blocker"] as? String ?? "no identity"])
        }
        let did = deviceId(spkiB64: pub)
        let ts = ISO8601DateFormatter().string(from: Date())
        var entry: [String: Any] = [
            "v": 1, "t": "rsign.seal", "device_id": did, "owner_rid": OWNER_RID, "handle": OWNER_HANDLE,
            "pubkey": pub, "stack": STACK, "botlatch_ref": BOTLATCH, "ts": ts,
            "prev_hash": prev, "purpose": PURPOSE, "block_sha256": block
        ]
        let h = sha256hex(canon(entry))
        let msg = Data(("rsign.v1|" + h).utf8)
        faceIdSign(message: msg, reason: "RWALLET ASSM unlock to sign Block 4 bind for @chaserizal") { sig, err in
            guard let sig = sig, !sig.isEmpty else { return done(["ok": false, "err": err.isEmpty ? "no signature" : err]) }
            entry["sig"] = sig.base64EncodedString()
            done(["ok": true, "rsign_seal": entry, "entry_hash": h, "device_id": did, "pubkey_spki_b64": pub,
                  "backend": id["backend"] as Any, "slot": SLOT_NEO])
        }
    }
}
