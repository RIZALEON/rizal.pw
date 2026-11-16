// RSignCore 0.1 · native core for the Godot 'RSign' singleton (iOS + macOS). Pure Swift, no Godot types.
// - Secure Enclave P-256 key: kSecAttrTokenIDSecureEnclave, .privateKeyUsage + .biometryCurrentSet, ThisDeviceOnly, never exportable.
// - Signing calls SecKeyCreateSignature; iOS itself shows Face ID. This code never answers or skips the prompt.
// - ASSM login = rizal.pw rsite-auth 1.0 (GET https://rizal.pw/data/auth/vault.json, Ed25519 site signature, PBKDF2-SHA256 (iter as signed by the vault; no minimum, 310k kept), AES-GCM).
//   Ported from rlogin-page.js login() + rsync-core 0.3.2 (passwordCheck, sessionId, rateLimit). Session = RSync session.start id "ss-…-seq".
// - Offline: Keychain (ThisDeviceOnly, not synced) holds session id + RID only. The RSync verifier triple {salt, iter, verifier} is
//   password-equivalent: online success hands it out ONCE as "offline_verifier" and the GDScript bridge stores it immediately via
//   RGENERATR RG.store_offline_verifier (RGHOSTKEY blob, label rgen.assm.verifier.v1|<handle>). Offline login reads it back through
//   offlineVerifier (RG.load_offline_verifier → native unwrap → OS biometric prompt). Never stored plain, never the password.
// - Fix 20261030 (RDRAGON review of 10924c2): iter is REQUIRED (no default); no 600k minimum (Rizal: keep 310k, no vault re-issue).
//   A bad vault.json signature/format is a HARD error (no offline fallback). Only network-unreachable may go offline.
import Foundation
import Security
import LocalAuthentication
import CryptoKit
import CommonCrypto

// Injection seams (tests use a software P-256 key + in-memory store + fake network; production = Secure Enclave + Keychain + URLSession).
public protocol RGKKeys { func publicKey() -> SecKey?; func privateKey(reason: String) -> SecKey? }
// A key provider that can create its own key at the RGHOSTKEY ceremony and names its backend honestly.
public protocol RGKBackend: RGKKeys { var alg: String { get }; var backend: String { get }; func create() -> String? }
public protocol RSignStore { func get(_ k: String) -> Data?; func set(_ k: String, _ d: Data?) }
public enum VaultFetch { case data(Data, Int); case unreachable(String) }

public final class RSignCore {
    public static let shared: RSignCore = {
        let c = RSignCore()
        #if os(macOS)
        // Fix 20261030 (login): on macOS a Secure Enclave key needs the data-protection keychain → keychain-access-groups +
        // application-identifier entitlements + a macOS provisioning profile. Neo has only iOS profiles, so
        // SecKeyCreateRandomKey(SE) fails (errSecMissingEntitlement -34018). Unless an SE key already exists, use the
        // clearly-labelled login-keychain fallback (Touch ID gated by the app).
        if c.seKey() == nil { c.keys = MacLoginKeychainKeys() }
        #endif
        return c
    }()
    public var keys: RGKKeys? = nil          // nil = Secure Enclave RSIGN/RGHOSTKEY key
    public var store: RSignStore? = nil      // nil = Keychain
    public var fetchVault: ((@escaping (VaultFetch) -> Void) -> Void)? = nil   // nil = URLSession GET vault.json
    public var offlineVerifier: ((String) -> [String: Any]?)? = nil              // handle → {salt, iter, verifier} via RG.load_offline_verifier
    public init() {}
    static let rgkMagic: [UInt8] = [0x52, 0x47, 0x4B]   // "RGK"
    static let rgkV1: UInt8 = 1
    static let rgkAlgSEECIES: UInt8 = 1                 // eciesEncryptionCofactorVariableIVX963SHA256AESGCM, P-256 Secure Enclave
    static let rgkAlg = "SE-ECIES-P256-COFACTOR-X963SHA256-AESGCM"
    static let rgkAlgSoft = "SOFT-P256-ECIES-TEST"     // tests only (software key provider)
    public static let ERR_NO_RGHOSTKEY = "ERR_NO_RGHOSTKEY"
    static let tag = "info.rizal.rsign.se.p256".data(using: .utf8)!
    static let svc = "info.rizal.rsign.assm"
    static let vaultURL = URL(string: "https://rizal.pw/data/auth/vault.json")!
    static let sitePub = "aYMlpc7bKdjcCUp1bwVdfSx5SeVqHOv91JTTKDG2F8k="   // public Ed25519 key pinned in rdragon-config.js siteAuth.pub
    static let ridMap = ["@chaserizal": "ЯID-0001-3QQS"]               // rid-link.js RWALLET_RID_LINK.owner
    public var onSealed: ((String) -> Void)?
    public var sitePubB64 = RSignCore.sitePub   // tests inject a fixture vault key; production = pinned rizal.pw key

    // MARK: Secure Enclave key
    func seKey() -> SecKey? {
        let q: [String: Any] = [kSecClass as String: kSecClassKey, kSecAttrApplicationTag as String: Self.tag,
                                kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom, kSecReturnRef as String: true]
        var r: CFTypeRef?; return SecItemCopyMatching(q as CFDictionary, &r) == errSecSuccess ? (r as! SecKey) : nil
    }
    func pubB64(_ k: SecKey) -> String? {
        guard let p = SecKeyCopyPublicKey(k), let d = SecKeyCopyExternalRepresentation(p, nil) as Data? else { return nil }
        return d.base64EncodedString()   // raw 65-byte 0x04||X||Y (public only)
    }
    static func deviceId(_ pub: String) -> String {
        let h = SHA256.hash(data: Data(base64Encoded: pub)!); return "rsd-" + h.map { String(format: "%02x", $0) }.joined().prefix(32)
    }
    // Called ONLY by Rizal's explicit one-time RGHOSTKEY enrollment ceremony (rsign_bridge.rghostkey_ceremony), never by
    // sign-in or seal. password: only passed right after the rsite verifier accepted it; it becomes the SE key's
    // .applicationPassword alternative to Touch/Face ID inside the Secure Enclave. Never stored or logged here.
    public func enroll(password: [UInt8]? = nil) -> [String: Any] {
        if let b = keys as? RGKBackend {
            if b.publicKey() == nil, let err = b.create() { return ["ok": false, "err": err] }
            guard let pk = b.publicKey(), let d = SecKeyCopyExternalRepresentation(pk, nil) as Data? else { return ["ok": false, "err": "RGHOSTKEY key unavailable (\(b.backend))"] }
            let p = d.base64EncodedString(); return ["ok": true, "device_id": Self.deviceId(p), "pubkey_b64": p, "backend": b.backend]
        }
        if let k = seKey(), let p = pubB64(k) { return ["ok": true, "device_id": Self.deviceId(p), "pubkey_b64": p] }
        var e: Unmanaged<CFError>?
        guard let ac = SecAccessControlCreateWithFlags(nil, kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly, [.privateKeyUsage, .biometryAny, .or, .applicationPassword], &e) else {   // Rizal 13:09: Touch/Face ID OR ASSM password
            return ["ok": false, "err": "access control: \(e!.takeRetainedValue())"] }
        let a: [String: Any] = [kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom, kSecAttrKeySizeInBits as String: 256,
            kSecAttrTokenID as String: kSecAttrTokenIDSecureEnclave,
            kSecPrivateKeyAttrs as String: [kSecAttrIsPermanent as String: true, kSecAttrApplicationTag as String: Self.tag, kSecAttrAccessControl as String: ac]
                .merging(password.map { pw -> [String: Any] in let c = LAContext(); _ = c.setCredential(Data(pw), type: .applicationPassword); return [kSecUseAuthenticationContext as String: c] } ?? [:]) { a, _ in a }]
        guard let k = SecKeyCreateRandomKey(a as CFDictionary, &e), let p = pubB64(k) else { return ["ok": false, "err": "Secure Enclave key: \(e?.takeRetainedValue().localizedDescription ?? "unavailable")"] }
        return ["ok": true, "device_id": Self.deviceId(p), "pubkey_b64": p]
    }
    // sign(hash_hex): message = "rsign.v1|"+hash_hex, ECDSA P-256 SHA-256 (X9.62 DER). Face ID is shown by iOS for .biometryCurrentSet.
    public func sign(_ hashHex: String, reason: String = "Seal RSIGN for @chaserizal", done: @escaping ([String: Any]) -> Void) {
        guard hashHex.range(of: "^[0-9a-f]{64}$", options: .regularExpression) != nil else { return done(["ok": false, "err": "hash must be 64 hex"]) }
        let ctx = LAContext(); ctx.localizedReason = reason; ctx.interactionNotAllowed = false
        ctx.localizedFallbackTitle = ""   // 20261102 faceidonly: no "Enter Password" button
        #if os(iOS)
        // 20261102 Rizal: Face ID ONLY, never a password. Evaluate biometrics first; the SAME key's ACL (biometryAny .or
        // applicationPassword) is then satisfied by this authenticated context, so iOS never shows the password box.
        var lerr: NSError?
        guard ctx.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &lerr) else {
            return done(["ok": false, "err": "Face ID unavailable: \(lerr?.localizedDescription ?? "not enrolled")"]) }
        // 20261102 harden: evaluate the KEY's own ACL for .useKeySign with this biometric-only context (no fallback
        // button), then sign with that same context, so the (biometry OR applicationPassword) ACL is already satisfied.
        let lq: [String: Any] = [kSecClass as String: kSecClassKey, kSecAttrApplicationTag as String: Self.tag, kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
                                 kSecReturnAttributes as String: true, kSecUseAuthenticationUI as String: kSecUseAuthenticationUISkip]
        var ar: CFTypeRef?; _ = SecItemCopyMatching(lq as CFDictionary, &ar)
        let acl = (ar as? [String: Any])?[kSecAttrAccessControl as String].map { $0 as! SecAccessControl }
        let bsem = DispatchSemaphore(value: 0); var bok = false; var berr = ""
        if let acl = acl {
            ctx.evaluateAccessControl(acl, operation: .useKeySign, localizedReason: reason) { r, e in bok = r; berr = e?.localizedDescription ?? ""; bsem.signal() }
        } else {
            ctx.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason) { r, e in bok = r; berr = e?.localizedDescription ?? ""; bsem.signal() }
        }
        DispatchQueue.global(qos: .userInitiated).async {
            bsem.wait()
            guard bok else { return DispatchQueue.main.async { done(["ok": false, "err": "Face ID cancelled" + (berr.isEmpty ? "" : ": " + berr)]) } }
            self.signWith(ctx, hashHex, reason: reason, done: done)
        }
        return
        #else
        signWith(ctx, hashHex, reason: reason, done: done)
        #endif
    }
    func signWith(_ ctx: LAContext, _ hashHex: String, reason: String, done: @escaping ([String: Any]) -> Void) {
        let q: [String: Any] = [kSecClass as String: kSecClassKey, kSecAttrApplicationTag as String: Self.tag, kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
                                kSecReturnRef as String: true, kSecUseAuthenticationContext as String: ctx]
        DispatchQueue.global(qos: .userInitiated).async {
            if let k = self.keys {
                guard let pk = k.privateKey(reason: reason) else { return DispatchQueue.main.async { done(["ok": false, "err": "Touch ID cancelled or no RGHOSTKEY · enroll first"]) } }
                var e: Unmanaged<CFError>?
                let sig = SecKeyCreateSignature(pk, .ecdsaSignatureMessageX962SHA256, Data(("rsign.v1|" + hashHex).utf8) as CFData, &e) as Data?
                return DispatchQueue.main.async { done(sig != nil ? ["ok": true, "sig_b64": sig!.base64EncodedString()] : ["ok": false, "err": e?.takeRetainedValue().localizedDescription ?? "sign failed"]) }
            }
            var r: CFTypeRef?; guard SecItemCopyMatching(q as CFDictionary, &r) == errSecSuccess else { return DispatchQueue.main.async { done(["ok": false, "err": "no RSIGN key · enroll first"]) } }
            var e: Unmanaged<CFError>?
            let sig = (SecKeyCreateSignature(r as! SecKey, .ecdsaSignatureMessageX962SHA256, Data(("rsign.v1|" + hashHex).utf8) as CFData, &e) as Data?).flatMap(Self.lowS)
            DispatchQueue.main.async { done(sig != nil ? ["ok": true, "sig_b64": sig!.base64EncodedString()] : ["ok": false, "err": e?.takeRetainedValue().localizedDescription ?? "Face ID cancelled"]) }
        }
    }
    // 20261102 faceidonly: X9.62 DER ECDSA -> low-S DER (s > n/2 => n - s). Same signature validity; RGHOSTCHAIN refuses high-S.
    static let P256N: [UInt8] = [0xFF,0xFF,0xFF,0xFF,0x00,0x00,0x00,0x00,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xBC,0xE6,0xFA,0xAD,0xA7,0x17,0x9E,0x84,0xF3,0xB9,0xCA,0xC2,0xFC,0x63,0x25,0x51]
    static func lowS(_ der: Data) -> Data? {
        let b = [UInt8](der); guard b.count > 8, b[0] == 0x30, b[2] == 0x02 else { return nil }
        let rl = Int(b[3]); let r = Array(b[4..<4+rl]); guard b.count > 5+rl, b[4+rl] == 0x02 else { return nil }
        let sl = Int(b[5+rl]); guard b.count >= 6+rl+sl else { return nil }
        var s = Array(b[(6+rl)..<(6+rl+sl)]); while s.count > 32 && s.first == 0 { s.removeFirst() }
        while s.count < 32 { s.insert(0, at: 0) }
        var half = [UInt8](repeating: 0, count: 32); var c: UInt8 = 0   // n >> 1
        for i in 0..<32 { half[i] = (P256N[i] >> 1) | c; c = (P256N[i] & 1) << 7 }
        if s.lexicographicallyPrecedes(half) || s == half { return der }
        var o = [UInt8](repeating: 0, count: 32); var br = 0
        for i in (0..<32).reversed() { let d = Int(P256N[i]) - Int(s[i]) - br; br = d < 0 ? 1 : 0; o[i] = UInt8((d + 256) & 0xFF) }
        while o.count > 1 && o[0] == 0 && o[1] < 0x80 { o.removeFirst() }
        if o[0] >= 0x80 { o.insert(0, at: 0) }
        let body = [0x02, UInt8(r.count)] + r + [0x02, UInt8(o.count)] + o
        return Data([0x30, UInt8(body.count)] + body)
    }
    // MARK: canonical entry hash (same canon() as rsign-verify.js / rsite-auth.js)
    static func canon(_ o: Any) -> String {
        if let a = o as? [Any] { return "[" + a.map(canon).joined(separator: ",") + "]" }
        if let d = o as? [String: Any] { return "{" + d.keys.sorted().map { js($0) + ":" + canon(d[$0]!) }.joined(separator: ",") + "}" }
        if let s = o as? String { return js(s) }
        if let b = o as? Bool { return b ? "true" : "false" }
        if let n = o as? NSNumber { return n.stringValue }
        return "null"
    }
    static func js(_ s: String) -> String { String(data: try! JSONSerialization.data(withJSONObject: [s], options: [.withoutEscapingSlashes]), encoding: .utf8)!.dropFirst().dropLast().description }
    static func sha256hex(_ s: String) -> String { SHA256.hash(data: Data(s.utf8)).map { String(format: "%02x", $0) }.joined() }
    // seal(entry): fills device_id/pubkey/v/t, refuses without the RID asset, hashes, signs with Face ID, fires onSealed.
    public func seal(_ entryJSON: String, done: @escaping ([String: Any]) -> Void) {
        guard var e = (try? JSONSerialization.jsonObject(with: Data(entryJSON.utf8))) as? [String: Any] else { return done(["ok": false, "err": "entry is not JSON"]) }
        guard let rid = ridState()["rid"] as? String, !rid.isEmpty, rid == e["owner_rid"] as? String else { return done(["ok": false, "err": "RID asset missing · ASSM sign-in first"]) }
        guard wrapPub() != nil else { return done(["ok": false, "err": Self.ERR_NO_RGHOSTKEY]) }   // no auto-enroll
        let en = enroll(); guard en["ok"] as? Bool == true else { return done(en) }
        e["t"] = "rsign.seal"; e["v"] = 1; e["device_id"] = en["device_id"]; e["pubkey"] = en["pubkey_b64"]; e.removeValue(forKey: "sig")
        let h = Self.sha256hex(Self.canon(e))
        sign(h) { r in
            guard r["ok"] as? Bool == true, let s = r["sig_b64"] as? String else { return done(["ok": false, "err": r["err"] ?? "sign failed"]) }
            e["sig"] = s
            let out = String(data: try! JSONSerialization.data(withJSONObject: e, options: [.sortedKeys, .withoutEscapingSlashes]), encoding: .utf8)!
            done(["ok": true, "entry_hash": h, "sig_b64": s, "entry_json": out, "pubkey_b64": en["pubkey_b64"] ?? ""]); self.onSealed?(h)
        }
    }

    // Biometric unlock (Face ID on iPhone/Mac, Touch ID on Mac): only after one password sign-in enrolled this device.
    // Signs "rsign.unlock.v1|"+nonce with the Secure Enclave key (the OS shows the biometric prompt) and starts a new
    // RSync session.start for the SAME RID/profile. Same session format as password sign-in.
    public func unlockBiometric(done: @escaping ([String: Any]) -> Void) {
        let s = state()
        guard let rid = s["rid"] as? String, !rid.isEmpty, wrapPub() != nil else {
            return done(["ok": false, "err": "RGHOSTKEY not enrolled · sign in with your ASSM password, then tap ENROLL RGHOSTKEY"]) }
        var n = [UInt8](repeating: 0, count: 16); _ = SecRandomCopyBytes(kSecRandomDefault, 16, &n)
        let nonce = Self.sha256hex(Data(n).base64EncodedString())
        sign(nonce) { r in
            guard r["ok"] as? Bool == true, let ss = self.sessionStart((s["profile"] as? String) ?? "") else { return done(["ok": false, "err": r["err"] ?? "biometric unlock failed"]) }
            var st = self.state(); st["session"] = ss["id"]; st["session_seq"] = ss["session_seq"]; st["mode"] = "biometric"; self.saveState(st)
            var e = ss; e["unlock"] = ["method": "biometric", "nonce": nonce, "sig": r["sig_b64"]!]
            let sj = String(data: try! JSONSerialization.data(withJSONObject: e, options: [.sortedKeys]), encoding: .utf8)!
            done(["ok": true, "rid": rid, "mode": "biometric", "verified_at": s["verified_at"] ?? "", "session": ss["id"]!, "session_entry": sj])
        }
    }
    public func biometryKind() -> String {
        let c = LAContext(); var e: NSError?; guard c.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &e) else { return "none" }
        switch c.biometryType { case .faceID: return "faceid"; case .touchID: return "touchid"; default: return "none" }
    }
    // MARK: RGHOSTKEY wrap/unwrap (native AEAD; raw keys never leave native code). Contract = docs/RGENERATR-RGHOSTKEY.md.
    // blob = ASCII "v1|<alg>|<sha256hex(label)>|" + ECIES ciphertext (ephemeral pub || AES-GCM ct || tag).
    // Label = AAD: Apple's ECIES API has no AAD parameter, so sha256(label) is also the first 32 plaintext bytes and is
    // checked after the GCM tag verifies (AAD-equivalent binding). Decrypt uses the private SE key → OS biometric prompt.
    // No key before RGHOSTKEY enrollment → ERR_NO_RGHOSTKEY (never auto-enrolls here).
    static func labelHash(_ label: String) -> [UInt8] { Array(SHA256.hash(data: Data(label.utf8))) }
    static func hex(_ b: [UInt8]) -> String { b.map { String(format: "%02x", $0) }.joined() }
    func algName() -> String { (keys as? RGKBackend)?.alg ?? (keys == nil ? Self.rgkAlg : Self.rgkAlgSoft) }
    func header(_ label: String) -> Data { Data("v1|\(algName())|\(Self.hex(Self.labelHash(label)))|".utf8) }
    func wrapPub() -> SecKey? { if let k = keys { return k.publicKey() }; return seKey().flatMap { SecKeyCopyPublicKey($0) } }
    func wrapPriv(_ reason: String) -> SecKey? {
        if let k = keys { return k.privateKey(reason: reason) }
        let ctx = LAContext(); ctx.localizedReason = reason
        let q: [String: Any] = [kSecClass as String: kSecClassKey, kSecAttrApplicationTag as String: Self.tag, kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
                                kSecReturnRef as String: true, kSecUseAuthenticationContext as String: ctx]
        var r: CFTypeRef?; return SecItemCopyMatching(q as CFDictionary, &r) == errSecSuccess ? (r as! SecKey) : nil
    }
    public func rghostkeyStatus() -> [String: Any] { ["enrolled": wrapPub() != nil, "alg": algName(), "backend": (keys as? RGKBackend)?.backend ?? (keys == nil ? "secure-enclave" : "TEST-ONLY software key")] }
    public func rghostkeyWrap(_ bytes: Data, label: String) -> [String: Any] {
        guard !label.isEmpty else { return ["ok": false, "err": "label required"] }
        guard let pub = wrapPub() else { return ["ok": false, "err": Self.ERR_NO_RGHOSTKEY] }
        var pt = Self.labelHash(label) + Array(bytes); defer { pt.resetBytes() }
        var e: Unmanaged<CFError>?
        guard let ct = SecKeyCreateEncryptedData(pub, .eciesEncryptionCofactorVariableIVX963SHA256AESGCM, Data(pt) as CFData, &e) as Data? else {
            return ["ok": false, "err": "wrap failed: \(e?.takeRetainedValue().localizedDescription ?? "?")"] }
        return ["ok": true, "blob": header(label) + ct]
    }
    public func rghostkeyUnwrap(_ blob: Data, label: String, reason: String = "Unlock your RGHOSTKEY") -> [String: Any] {
        let h = header(label)
        guard blob.count > h.count + 65, blob.prefix(3) == Data("v1|".utf8) else { return ["ok": false, "err": "ERR_BLOB_FORMAT"] }
        guard blob.prefix(h.count) == h else { return ["ok": false, "err": "ERR_LABEL_OR_ALG_MISMATCH"] }
        guard let priv = wrapPriv(reason) else { return ["ok": false, "err": Self.ERR_NO_RGHOSTKEY] }
        var e: Unmanaged<CFError>?
        guard let pt = SecKeyCreateDecryptedData(priv, .eciesEncryptionCofactorVariableIVX963SHA256AESGCM, blob.dropFirst(h.count) as CFData, &e) as Data? else {
            return ["ok": false, "err": "ERR_AUTH: \(e?.takeRetainedValue().localizedDescription ?? "auth cancelled or blob altered")"] }
        var p = Array(pt); defer { p.resetBytes() }
        guard p.count >= 32, Self.ctEq(Array(p[0..<32]), Self.labelHash(label)) else { return ["ok": false, "err": "ERR_AUTH"] }
        return ["ok": true, "bytes": Data(p[32...])]
    }
    // RGHOSTKEY command signature (Rizal 13:08 rule): ECDSA P-256 SHA-256 over label|0x00|bytes with the biometric-gated SE key.
    // Returns the X9.63 public key so the caller can match it against the approved-device keys in rghostkey.master.
    public func rghostkeySign(_ bytes: Data, label: String, reason: String = "Sign TerraformR command") -> [String: Any] {
        guard !label.isEmpty else { return ["ok": false, "err": "label required"] }
        guard let pub = wrapPub(), let pd = SecKeyCopyExternalRepresentation(pub, nil) as Data? else { return ["ok": false, "err": Self.ERR_NO_RGHOSTKEY] }
        guard let priv = wrapPriv(reason) else { return ["ok": false, "err": Self.ERR_NO_RGHOSTKEY] }
        var e: Unmanaged<CFError>?
        guard let sig = SecKeyCreateSignature(priv, .ecdsaSignatureMessageX962SHA256, (Data(label.utf8) + Data([0]) + bytes) as CFData, &e) as Data? else {
            return ["ok": false, "err": "ERR_AUTH: \(e?.takeRetainedValue().localizedDescription ?? "sign cancelled")"] }
        return ["ok": true, "sig": sig, "pub": pd, "alg": "P256-SHA256-DER"]
    }
    static func verifyP256(pub: Data, msg: Data, sig: Data) -> Bool {
        guard let k = SecKeyCreateWithData(pub as CFData, [kSecAttrKeyType: kSecAttrKeyTypeECSECPrimeRandom, kSecAttrKeyClass: kSecAttrKeyClassPublic] as CFDictionary, nil) else { return false }
        return SecKeyVerifySignature(k, .ecdsaSignatureMessageX962SHA256, msg as CFData, sig as CFData, nil)
    }
    func loadVerifier(_ h: String) -> (salt: Data, iter: Int, ver: String)? {
        guard let o = offlineVerifier?(h), let sa = (o["salt"] as? String).flatMap({ Data(base64Encoded: $0) }),
              let it = (o["iter"] as? Int) ?? (o["iter"] as? NSNumber)?.intValue, it > 0, let v = o["verifier"] as? String else { return nil }
        return (sa, it, v)
    }

    // MARK: Keychain (generic password items, ThisDeviceOnly, not synchronizable)
    func kcSet(_ acct: String, _ d: Data) {
        if let st = store { return st.set(acct, d) }
        let q: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: Self.svc, kSecAttrAccount as String: acct]
        SecItemDelete(q as CFDictionary); var a = q; a[kSecValueData as String] = d
        a[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly; a[kSecAttrSynchronizable as String] = false
        SecItemAdd(a as CFDictionary, nil)
    }
    func kcGet(_ acct: String) -> Data? {
        if let st = store { return st.get(acct) }
        let q: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: Self.svc, kSecAttrAccount as String: acct, kSecReturnData as String: true]
        var r: CFTypeRef?; return SecItemCopyMatching(q as CFDictionary, &r) == errSecSuccess ? r as? Data : nil
    }
    func state() -> [String: Any] { (kcGet("state").flatMap { try? JSONSerialization.jsonObject(with: $0) } as? [String: Any]) ?? [:] }
    func saveState(_ s: [String: Any]) { kcSet("state", try! JSONSerialization.data(withJSONObject: s)) }
    public func ridState() -> [String: Any] {
        let s = state(); return ["rid": s["rid"] ?? "", "handle": s["handle"] ?? "", "linked": s["rid"] != nil, "session": s["session"] ?? "", "mode": s["mode"] ?? "", "verified_at": s["verified_at"] ?? ""]
    }
    // MARK: PBKDF2 / constant time
    static func pbkdf2(_ pw: inout [UInt8], _ salt: [UInt8], _ iter: UInt32, _ len: Int = 32) -> [UInt8] {
        var out = [UInt8](repeating: 0, count: len)
        pw.withUnsafeBufferPointer { p in _ = CCKeyDerivationPBKDF(CCPBKDFAlgorithm(kCCPBKDF2), UnsafeRawPointer(p.baseAddress!).assumingMemoryBound(to: Int8.self), p.count, salt, salt.count, CCPseudoRandomAlgorithm(kCCPRFHmacAlgSHA256), iter, &out, len) }
        return out
    }
    static func ctEq(_ a: [UInt8], _ b: [UInt8]) -> Bool { guard a.count == b.count else { return false }; var d: UInt8 = 0; for i in 0..<a.count { d |= a[i] ^ b[i] }; return d == 0 }
    static func normH(_ h: String) -> String { let t = h.trimmingCharacters(in: .whitespacesAndNewlines).lowercased(); return t.hasPrefix("@") ? t : "@" + t }   // = rsite-auth.js H()
    // MARK: ASSM login (online first, offline fallback after one online success). pw bytes are zeroed before return.
    public func assmLogin(_ user: String, _ pass: String, done: @escaping ([String: Any]) -> Void) {
        var pw = Array(pass.utf8); let h = Self.normH(user)
        guard let rid = Self.ridMap[h] else { pw.resetBytes(); return done(["ok": false, "err": "no ЯID linked to \(h)"]) }
        let fetch = fetchVault ?? { cb in
            var req = URLRequest(url: Self.vaultURL); req.cachePolicy = .reloadIgnoringLocalCacheData; req.timeoutInterval = 10
            URLSession.shared.dataTask(with: req) { data, resp, err in
                if let u = err as? URLError, [.notConnectedToInternet, .networkConnectionLost, .cannotFindHost, .cannotConnectToHost, .timedOut, .dnsLookupFailed, .internationalRoamingOff, .dataNotAllowed].contains(u.code) {
                    return cb(.unreachable(u.localizedDescription)) }
                if err != nil { return cb(.data(Data(), -1)) }   // TLS/other errors are NOT "offline"
                cb(.data(data ?? Data(), (resp as? HTTPURLResponse)?.statusCode ?? -1))
            }.resume()
        }
        fetch { f in
            var r: [String: Any]
            switch f {
            case .unreachable: r = self.offline(h, rid, &pw)                       // the ONLY offline path
            case .data(let d, 200): r = self.online(d, h, rid, &pw)
            case .data(_, let code): r = ["ok": false, "hard": true, "err": "rizal.pw sign-in service error (HTTP \(code)) · not falling back to offline"]
            }
            pw.resetBytes()
            DispatchQueue.main.async { done(r) }
        }
    }
    // Port of rlogin-page.js method 3 (username + password) with its record source rsite-auth.rec(), and rsync-core 0.3.2:
    //   rec = rsite-auth.open(vault, @handle, pw).rec  →  RSync.passwordCheck(rec, pw): PBKDF2-SHA256(pw, rec.salt, rec.iter) → 64 bytes,
    //   [0,32) AES key (unused here: we do NOT unwrap the profile key), [32,64) verifier == rec.verifier.
    //   session id = RSync.sessionId(devicePub, seq) = "ss-" + sha256hex("rsync-session-v1\n"+pub)[0,20] + "-" + seq; entry t:"session.start".
    //   Rate limit = RSync.rateLimit: 5 fails, then 30s * 2^(fails-5).
    static func pwDerive(_ pw: inout [UInt8], _ salt: [UInt8], _ iter: UInt32) -> (key: [UInt8], verifier: String) {
        var b = pbkdf2(&pw, salt, iter, 64); defer { b.resetBytes() }
        return (Array(b[0..<32]), Data(b[32..<64]).base64EncodedString())
    }
    static func ctEqS(_ a: String, _ b: String) -> Bool { ctEq(Array(a.utf8), Array(b.utf8)) }
    func rateWait(_ s: [String: Any]) -> Double { max(0, ((s["until"] as? Double) ?? 0) - Date().timeIntervalSince1970) }
    func rateFail(_ s: inout [String: Any]) { let f = ((s["fails"] as? Int) ?? 0) + 1; s["fails"] = f
        if f >= 5 { s["until"] = Date().timeIntervalSince1970 + 30 * pow(2, Double(f - 5)) } }
    func sessionStart(_ pid: String) -> [String: Any]? {
        // Before the RGHOSTKEY ceremony there is no device key: a random per-install id (public, not a secret) stands in so
        // the ASSM password session needed BY the ceremony can exist. After enrollment the RGHOSTKEY pubkey is used.
        var pub: String
        if let pk = wrapPub(), let pd = SecKeyCopyExternalRepresentation(pk, nil) as Data? { pub = pd.base64EncodedString() }
        else if let a = kcGet("anon_dev") { pub = String(decoding: a, as: UTF8.self) }
        else { var n = [UInt8](repeating: 0, count: 32); _ = SecRandomCopyBytes(kSecRandomDefault, 32, &n); pub = "anon:" + Data(n).base64EncodedString(); kcSet("anon_dev", Data(pub.utf8)) }
        let seq = ((state()["session_seq"] as? Int) ?? 0) + 1
        let sid = "ss-" + Self.sha256hex("rsync-session-v1\n" + pub).prefix(20) + "-\(seq)"
        return ["id": sid, "t": "session.start", "profile": pid, "device": pub, "session_seq": seq, "ts": ISO8601DateFormatter().string(from: Date())]
    }
    func online(_ data: Data, _ h: String, _ rid: String, _ pw: inout [UInt8]) -> [String: Any] {
        var s = state(); if s["handle"] as? String != h { s = ["handle": h] }
        if rateWait(s) > 0 { return ["ok": false, "err": "locked out for \(Int(ceil(rateWait(s))))s after too many wrong passwords — wait, then try again"] }
        guard let v = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any], v["format"] as? String == "rsite-auth.vault.v1",
              let entries = v["entries"] as? [[String: Any]], let sig = (v["sig"] as? String).flatMap({ Data(base64Encoded: $0) }),
              !entries.contains(where: { $0["kdf"] as? String != "PBKDF2-SHA256" || (($0["iter"] as? Int) ?? 0) <= 0 }),
              let pk = try? Curve25519.Signing.PublicKey(rawRepresentation: Data(base64Encoded: sitePubB64) ?? Data()),
              pk.isValidSignature(sig, for: Data(Self.canon(["format": v["format"]!, "entries": entries]).utf8)) else {
            return ["ok": false, "hard": true, "err": "SECURITY: rizal.pw vault.json signature/format check FAILED · sign-in blocked (no offline fallback)"] }
        let id = Self.sha256hex("rsite-auth.v1|" + h)
        guard let e = entries.first(where: { $0["id"] as? String == id }), let iter = e["iter"] as? Int,
              let salt = (e["salt"] as? String).flatMap({ Data(base64Encoded: $0) }), let iv = (e["iv"] as? String).flatMap({ Data(base64Encoded: $0) }),
              let ct = (e["ct"] as? String).flatMap({ Data(base64Encoded: $0) }), ct.count > 16 else { return ["ok": false, "err": "no login record for \(h)"] }
        var k = Self.pbkdf2(&pw, Array(salt) + Array(h.utf8), UInt32(iter)); defer { k.resetBytes() }
        guard let box = try? AES.GCM.SealedBox(nonce: AES.GCM.Nonce(data: iv), ciphertext: ct.dropLast(16), tag: ct.suffix(16)),
              var plain = try? AES.GCM.open(box, using: SymmetricKey(data: k), authenticating: Data(id.utf8)) else {
            rateFail(&s); saveState(s); return ["ok": false, "err": "login record found for \(h), but this password does not match it"] }
        defer { plain.resetBytes() }
        guard let p = (try? JSONSerialization.jsonObject(with: plain)) as? [String: Any], let rec = p["rec"] as? [String: Any],
              let rs = (rec["salt"] as? String).flatMap({ Data(base64Encoded: $0) }), let ri = rec["iter"] as? Int, let rv = rec["verifier"] as? String else {
            return ["ok": false, "err": "password matches, but the login record could not be opened"] }
        guard ri > 0 else { return ["ok": false, "hard": true, "err": "login record has no iteration count · refused"] }
        var d = Self.pwDerive(&pw, Array(rs), UInt32(ri)); d.key.resetBytes()
        guard Self.ctEqS(d.verifier, rv) else { rateFail(&s); saveState(s); return ["ok": false, "err": "login record found for \(h), but this password does not match it"] }
        let pid = (p["pid"] as? String) ?? ((p["pkg"] as? [String: Any])?["profile"] as? String) ?? ""
        guard let ss = sessionStart(pid) else { return ["ok": false, "err": "Secure Enclave key unavailable"] }
        let now = ISO8601DateFormatter().string(from: Date())
        // the RSync verifier triple is password-equivalent → handed out once, the bridge wraps it via RG (RGHOSTKEY); never kept here
        s = ["rid": rid, "handle": h, "profile": pid, "session": ss["id"]!, "session_seq": ss["session_seq"]!, "mode": "online", "verified_at": now,
             "fails": 0, "until": 0.0]
        saveState(s)
        let sj = String(data: try! JSONSerialization.data(withJSONObject: ss, options: [.sortedKeys]), encoding: .utf8)!
        return ["ok": true, "rid": rid, "handle": h, "mode": "online", "verified_at": now, "session": ss["id"]!, "session_entry": sj,
                "offline_verifier": ["salt": rec["salt"]!, "iter": ri, "verifier": rv]]
    }
    func offline(_ h: String, _ rid: String, _ pw: inout [UInt8], why: String = "offline") -> [String: Any] {
        var s = state()
        guard s["handle"] as? String == h else { return ["ok": false, "err": "\(why) · sign in online once on this device first"] }
        if rateWait(s) > 0 { return ["ok": false, "err": "locked out for \(Int(ceil(rateWait(s))))s after too many wrong passwords — wait, then try again"] }
        guard let v = loadVerifier(h) else { return ["ok": false, "err": "\(why) · no unlocked offline record (sign in online once, or RGHOSTKEY unlock cancelled)"] }
        var d = Self.pwDerive(&pw, Array(v.salt), UInt32(v.iter)); d.key.resetBytes()
        guard Self.ctEqS(d.verifier, v.ver) else { rateFail(&s); saveState(s); return ["ok": false, "err": "this password does not match the saved login record"] }
        guard let ss = sessionStart((s["profile"] as? String) ?? "") else { return ["ok": false, "err": "Secure Enclave key unavailable"] }
        s["fails"] = 0; s["until"] = 0.0; s["mode"] = "offline-verified"; s["session"] = ss["id"]; s["session_seq"] = ss["session_seq"]; saveState(s)
        let sj = String(data: try! JSONSerialization.data(withJSONObject: ss, options: [.sortedKeys]), encoding: .utf8)!
        return ["ok": true, "rid": rid, "mode": "offline-verified", "verified_at": s["verified_at"] ?? "", "session": ss["id"]!, "session_entry": sj]
    }
}
#if os(macOS)
// FALLBACK (no macOS SE profile): permanent keychain KEY ref + userPresence ACL.
// App NEVER calls SecKeyCopyExternalRepresentation on the private key.
// v1 generic-password raw private blob (rghostkey.p256.login-keychain.v1) is retired.
public final class MacLoginKeychainKeys: RGKBackend {
    public let alg = "KEYCHAIN-P256-KEYREF-USERPRESENCE"
    public let backend = "macOS keychain key-ref · biometric ACL (fallback, NOT Secure Enclave)"
    static let tag = "info.rizal.rsign.mac.p256.v2".data(using: .utf8)!
    static let retiredAcct = "rghostkey.p256.login-keychain.v1"
    static let retiredSvc = "info.rizal.rsign.assm"
    public init() { Self.deleteRetiredV1() }
    static func deleteRetiredV1() {
        let q: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: retiredSvc, kSecAttrAccount as String: retiredAcct]
        SecItemDelete(q as CFDictionary)
    }
    func load() -> SecKey? {
        let q: [String: Any] = [kSecClass as String: kSecClassKey, kSecAttrApplicationTag as String: Self.tag,
                                kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom, kSecReturnRef as String: true]
        var r: CFTypeRef?; return SecItemCopyMatching(q as CFDictionary, &r) == errSecSuccess ? (r as! SecKey) : nil
    }
    public func publicKey() -> SecKey? { load().flatMap { SecKeyCopyPublicKey($0) } }
    public func privateKey(reason: String) -> SecKey? {
        // Neo: no Touch ID — ASSM/passcode via deviceOwnerAuthentication (not biometrics-only).
        let c = LAContext(); c.localizedReason = reason
        let qAttr: [String: Any] = [kSecClass as String: kSecClassKey, kSecAttrApplicationTag as String: Self.tag,
                                    kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
                                    kSecReturnAttributes as String: true, kSecUseAuthenticationUI as String: kSecUseAuthenticationUISkip]
        var ar: CFTypeRef?; _ = SecItemCopyMatching(qAttr as CFDictionary, &ar)
        let acl = (ar as? [String: Any])?[kSecAttrAccessControl as String]
        var ok = false; let sem = DispatchSemaphore(value: 0)
        if let acl = acl {
            c.evaluateAccessControl(acl as! SecAccessControl, operation: .useKeySign, localizedReason: reason) { r, _ in ok = r; sem.signal() }
        } else {
            var err: NSError?
            guard c.canEvaluatePolicy(.deviceOwnerAuthentication, error: &err) else { return nil }
            c.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { r, _ in ok = r; sem.signal() }
        }
        sem.wait(); guard ok else { return nil }
        let q: [String: Any] = [kSecClass as String: kSecClassKey, kSecAttrApplicationTag as String: Self.tag,
                                kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom, kSecReturnRef as String: true,
                                kSecUseAuthenticationContext as String: c]
        var r: CFTypeRef?; return SecItemCopyMatching(q as CFDictionary, &r) == errSecSuccess ? (r as! SecKey) : nil
    }
    public func create() -> String? {
        Self.deleteRetiredV1()
        if load() != nil { return nil }
        var e: Unmanaged<CFError>?
        guard let ac = SecAccessControlCreateWithFlags(nil, kSecAttrAccessibleWhenUnlockedThisDeviceOnly, [.privateKeyUsage, .userPresence], &e) else {
            return "access control: \(e?.takeRetainedValue().localizedDescription ?? "?")"
        }
        let priv: [String: Any] = [kSecAttrIsPermanent as String: true, kSecAttrApplicationTag as String: Self.tag, kSecAttrAccessControl as String: ac]
        let a: [String: Any] = [kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom, kSecAttrKeySizeInBits as String: 256, kSecPrivateKeyAttrs as String: priv]
        // Do NOT export private representation — permanent keychain item holds the key.
        guard SecKeyCreateRandomKey(a as CFDictionary, &e) != nil else {
            return "RGHOSTKEY key create failed: \(e?.takeRetainedValue().localizedDescription ?? "?")"
        }
        return nil
    }
}
#endif

extension Array where Element == UInt8 { mutating func resetBytes() { for i in indices { self[i] = 0 } } }
extension Data { mutating func resetBytes() { resetBytes(in: 0..<count) } }
