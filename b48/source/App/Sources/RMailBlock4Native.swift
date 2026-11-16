// RMailBlock4Native — WK handlers rghostkeySign + rghostkeyQueue (20261105).
// Offline-first: local req_hash recompute, one outstanding approval, public durable queue.
// Shared RWALLET identity @chaserizal/ЯID-0001-3QQS; device RGHOSTKEY unlock only.
// No mint/publish here. Production requires the host single-method signer; no pseudo-signing path.
import Foundation
import WebKit
import LocalAuthentication
#if canImport(UIKit)
import UIKit   // 20261111-rbowzr: RMailDecisionNative opens rwallet://approve
#endif
#if canImport(AppKit)
import AppKit
#endif

final class RMailBlock4Native: NSObject, WKScriptMessageHandler {
    static let shared = RMailBlock4Native()
    static let OP = "rghostkey.signBind"
    static let OWNER_RID = "ЯID-0001-3QQS"
    static let OWNER_HANDLE = "@chaserizal"
    static let PURPOSE = "rghostkey.bind"
    static let STATE_OFFLINE = "offline_seal_pending_chain"
    weak var webView: WKWebView?
    private let lock = NSLock()
    private var outstandingReqHash: String?
    private var handlerInstalled = false
    var singleMethodSigner: (([String:Any], String, @escaping ([String:Any])->Void)->Void)?
    var queuedSealValidator: (([String:Any])->Bool)?
    var statusProvider: (()->[String:Any])?
    var hostCallback: ((String,[String:Any])->Void)?
    /// 20261107 Rizal: MINT registers the Neo PUBLIC key first when missing (existing ASSM enroll path, one method).
    func requestNeoEnroll() { handleEnroll(["op":"rghostkey.enroll","device_id":RGhostkeyBindSeal.SLOT_NEO]) }
    func requestUserSign(_ p:[String:Any]) {
        guard p["op"] as? String == Self.OP else{return cb("onError",["err":"host signing entry accepts only the fixed bind action"])}
        if let h=p["req_hash"] as? String,let existing=pendingPublicRecords().first(where:{$0["req_hash"] as? String == h}) {
            return cb("onSeal",["ok":true,"rsign_seal":existing["rsign_seal"] ?? [:],"queued":true,"duplicate":true,"minted":false,"published":false])
        }
        handleSign(p)
    }
    func preparedPublic() -> [String:Any]? { loadLocalTyped() }
    func recordDeliveryStatus(_ hash:String,_ publicStatus:[String:Any]) {
        guard hash.range(of:"^[0-9a-f]{64}$",options:.regularExpression) != nil,!secretish(publicStatus),JSONSerialization.isValidJSONObject(publicStatus),let d=try? JSONSerialization.data(withJSONObject:publicStatus,options:[.sortedKeys]) else{return}
        try? d.write(to:queueDir.appendingPathComponent("delivery-"+hash+".json"),options:.atomic)
    }

    func deliveryPublicStatuses() -> [[String:Any]] {
        let files=(try? FileManager.default.contentsOfDirectory(at:queueDir,includingPropertiesForKeys:nil)) ?? []
        return files.filter{$0.lastPathComponent.hasPrefix("delivery-") && $0.pathExtension == "json"}.compactMap { u in
            guard let d=try? Data(contentsOf:u),let r=(try? JSONSerialization.jsonObject(with:d)) as? [String:Any],!secretish(r) else{return nil};return r
        }
    }
    func pendingPublicRecords() -> [[String:Any]] {
        let files=(try? FileManager.default.contentsOfDirectory(at:queueDir,includingPropertiesForKeys:nil)) ?? []
        return files.filter{$0.pathExtension == "json"}.compactMap { u in
            guard let d=try? Data(contentsOf:u),let r=(try? JSONSerialization.jsonObject(with:d)) as? [String:Any],queuedSealValidator?(r) == true else{return nil}
            if let h=r["req_hash"] as? String,let d=try? Data(contentsOf:queueDir.appendingPathComponent("delivery-"+h+".json")),let status=(try? JSONSerialization.jsonObject(with:d)) as? [String:Any],let state=status["state"] as? String,["canonical-local-chain-confirmed-awaiting-tracker-and-destination-acks","stale-or-conflicting-needs-reconciliation"].contains(state){return nil}
            return r
        }
    }


    static func install(on w: WKWebView) {
        let s = shared
        s.lock.lock(); defer { s.lock.unlock() }
        guard !s.handlerInstalled else { return } // JS handler exactly once
        s.handlerInstalled = true
        s.webView = w
        let uc = w.configuration.userContentController
        uc.add(s, name: "rghostkeySign")
        uc.add(s, name: "rghostkeyQueue")
    }

    /// Canonical store is the app RKLOWD folder. The previous Application Support
    /// RDRAGON/rmail-block4-* folders are left in place (read if present, never deleted).
    private var queueDir: URL {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let d = docs.appendingPathComponent("ЯLAB/RKLOWD/nodes/17e/outbox", isDirectory: true)
        try? FileManager.default.createDirectory(at: d, withIntermediateDirectories: true)
        return d
    }
    private var localProposalURL: URL {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let d = docs.appendingPathComponent("ЯLAB/RKLOWD/nodes/17e/drop", isDirectory: true)
        try? FileManager.default.createDirectory(at: d, withIntermediateDirectories: true)
        return d.appendingPathComponent("typed-request.public.json")
    }
    private var legacyQueueDir: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        return base.appendingPathComponent("RDRAGON/rmail-block4-outbox", isDirectory: true)
    }
    private var legacyProposalURL: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        return base.appendingPathComponent("RDRAGON/rmail-block4-local/typed-request.public.json")
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        let name = message.name
        let body = message.body
        DispatchQueue.global(qos: .userInitiated).async {
            if name == "rghostkeySign" { self.handleSign(body) }
            else if name == "rghostkeyQueue" { self.handleQueue(body) }
        }
    }

    private func cb(_ fn: String, _ obj: [String: Any]) {
        let data = (try? JSONSerialization.data(withJSONObject: obj, options: [])) ?? Data("{}".utf8)
        let json = String(data: data, encoding: .utf8) ?? "{}"
        let js = "(function(){var N=window.RMAIL_BLOCK4_NATIVE||(window.RMAIL_BLOCK4_NATIVE={});if(typeof N.\(fn)==='function'){N.\(fn)(\(json));}})();"
        DispatchQueue.main.async { self.hostCallback?(fn,obj);self.webView?.evaluateJavaScript(js, completionHandler: nil) }
    }

    private func asDict(_ body: Any) -> [String: Any]? {
        if let d = body as? [String: Any] { return d }
        if let s = body as? String, let data = s.data(using: .utf8),
           let o = try? JSONSerialization.jsonObject(with: data) as? [String: Any] { return o }
        return nil
    }

    private func handleQueue(_ body: Any) {
        guard let d = asDict(body) else { return cb("onError", ["err": "queue: bad payload"]) }
        let op = d["op"] as? String ?? ""
        if op == "listPending" { return cb("onStatus",["state":"approved-offline-awaiting-chain-confirmation","records":pendingPublicRecords(),"minted":false]) }
        if op == "enqueueSeal" {
            guard let rec = d["record"] as? [String: Any] else { return cb("onError", ["err": "queue: missing record"]) }
            if secretish(rec) || queuedSealValidator?(rec) != true { return cb("onError", ["err": "queue: untrusted, changed or secret-looking record refused"]) }
            let (ok, why) = enqueuePublic(rec)
            cb("onStatus", ["state": ok ? "queued" : "queue-reject", "detail": why])
            return
        }
        cb("onError", ["err": "queue: unknown op"])
    }

    private func secretish(_ o: Any) -> Bool {
        let bad = try! NSRegularExpression(pattern: "priv|secret|seed|mnemonic|password|passphrase|d_b64|private", options: .caseInsensitive)
        func walk(_ x: Any, path: String) -> Bool {
            if let d = x as? [String: Any] {
                for (k, v) in d {
                    if bad.firstMatch(in: k, range: NSRange(k.startIndex..., in: k)) != nil { return true }
                    if walk(v, path: path + "/" + k) { return true }
                }
            } else if let a = x as? [Any] {
                for (i, v) in a.enumerated() { if walk(v, path: "\(path)[\(i)]") { return true } }
            }
            return false
        }
        return walk(o, path: "")
    }

    private func enqueuePublic(_ rec: [String: Any]) -> (Bool, String) {
        guard let dedup = rec["dedup"] as? String, dedup.range(of:"^[A-Za-z0-9|._:-]+$",options:.regularExpression) != nil else { return (false, "missing dedup") }
        guard rec["rsign_seal"] is [String: Any] else { return (false, "missing public rsign_seal") }
        if secretish(rec) { return (false, "secret fields") }
        let path = queueDir.appendingPathComponent(dedup.replacingOccurrences(of: "|", with: "_") + ".json")
        if FileManager.default.fileExists(atPath: path.path) { return (true, "dedup-exists") }
        var out = rec
        out["state"] = Self.STATE_OFFLINE
        out["published"] = false
        out["ui_label"] = out["ui_label"] as? String ?? "signed queued"
        guard let data = try? JSONSerialization.data(withJSONObject: out, options: [.prettyPrinted]),
              (try? data.write(to: path, options: .atomic)) != nil else { return (false, "disk-write-failed") }
        do { let f=try FileHandle(forWritingTo:path);try f.synchronize();try f.close() }
        catch { return (false,"durability-flush-failed") }
        return (true, "enqueued")
    }

    /// Load locally stored validated public typed request (no network).
    private func loadLocalTyped() -> [String: Any]? {
        guard let data = try? Data(contentsOf: localProposalURL),
              let o = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
        return o
    }

    /// Persist public typed proposal after transport validation (called by host when inbox delivers).
    func storeLocalTypedPublic(_ typed: [String: Any]) -> [String: Any] {
        if secretish(typed) { return ["ok": false, "err": "secret fields refused"] }
        guard typed["type"] as? String == "rmail.block4.bind.request.v1",
              typed["authority"] as? String == "rmint_route.bind",
              typed["trusted_internal"] as? Bool == true else {
            return ["ok": false, "err": "not validated transport typed request"]
        }
        guard let se = typed["seal_entry"] as? [String: Any], let bundle = typed["bundle"] as? [String: Any] else {
            return ["ok": false, "err": "missing seal_entry/bundle"]
        }
        let h = RGhostkeyBindSeal.reqHash(sealEntry: se, bundle: bundle)
        guard let claimed = typed["req_hash"] as? String, claimed == h else {
            return ["ok": false, "err": "req_hash mismatch on store"]
        }
        let pub = typed
        // strip anything not needed
        guard let data = try? JSONSerialization.data(withJSONObject: pub, options: [.prettyPrinted]),
              (try? data.write(to: localProposalURL, options: .atomic)) != nil else {
            return ["ok": false, "err": "local store failed"]
        }
        return ["ok": true, "req_hash": h, "path": localProposalURL.path]
    }


    /// RMAIL Accept → RWALLET ASSM username/password verified → nonexportable key → public SPKI POST.
    /// Neo has no Touch ID. Password typed in NSSecureTextField only; never logged; bytes zeroed after use.
    private func handleEnroll(_ p: [String: Any]) {
        cb("onStatus", ["state": "awaiting-assm", "detail": "RWALLET ASSM sign-in for neo-rdragon (no Touch ID on Neo)"])
        #if os(macOS)
        DispatchQueue.main.async {
            self.promptASSMThenEnroll(deviceId: p["device_id"] as? String ?? RGhostkeyBindSeal.SLOT_NEO)
        }
        #else
        // iOS keeps Face ID path elsewhere; Neo macOS is ASSM-only for this host.
        cb("onError", ["err": "ASSM enroll panel is macOS/Neo path; use Face ID host on iPhone"])
        #endif
    }

    #if os(macOS)
    private func promptASSMThenEnroll(deviceId: String) {
        let alert = NSAlert()
        alert.messageText = "RWALLET · ASSM sign-in"
        alert.informativeText = "Neo has no Touch ID. After RMAIL Accept, sign in with your ASSM username and password. Credentials stay in this dialog — never logged, never sent to bots."
        let userField = NSTextField(frame: NSRect(x: 0, y: 32, width: 280, height: 24))
        userField.stringValue = "@chaserizal"
        userField.placeholderString = "ASSM username"
        let passField = NSSecureTextField(frame: NSRect(x: 0, y: 0, width: 280, height: 24))
        passField.placeholderString = "ASSM password"
        let box = NSView(frame: NSRect(x: 0, y: 0, width: 280, height: 60))
        box.addSubview(userField); box.addSubview(passField)
        alert.accessoryView = box
        alert.addButton(withTitle: "Sign in & Enroll")
        alert.addButton(withTitle: "Cancel")
        let resp = alert.runModal()
        let user = userField.stringValue
        var pass = passField.stringValue
        passField.stringValue = ""
        guard resp == .alertFirstButtonReturn else {
            pass = ""
            return cb("onCancel", ["err": "ASSM sign-in cancelled"])
        }
        guard !user.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, !pass.isEmpty else {
            pass = ""
            return cb("onError", ["err": "ASSM username and password required"])
        }
        cb("onStatus", ["state": "verifying-assm", "detail": "verifying ASSM via RSignCore (password not logged)"])
        RSignCore.shared.assmLogin(user, pass) { [weak self] login in
            // Zero password ASAP on main/callback path
            pass = ""
            guard let self else { return }
            guard (login["ok"] as? Bool) == true else {
                let err = (login["err"] as? String) ?? "ASSM login failed"
                // never echo password-related input
                return self.cb("onError", ["err": err, "assm": false])
            }
            self.cb("onStatus", ["state": "assm-ok", "detail": "ASSM verified · creating nonexportable RGHOSTKEY"])
            DispatchQueue.global(qos: .userInitiated).async {
                let id = RGhostkeyBindSeal.ensureIdentity()
                guard (id["ok"] as? Bool) == true, let spki = id["pubkey_spki_b64"] as? String else {
                    return self.cb("onError", id)
                }
                if (id["exportable_private"] as? Bool) == true {
                    return self.cb("onError", ["err": "refusing exportable private key backend"])
                }
                var req = URLRequest(url: URL(string: "http://127.0.0.1:8741/rghostchain/bind/enroll")!)
                req.httpMethod = "POST"
                req.setValue("application/json", forHTTPHeaderField: "Content-Type")
                req.timeoutInterval = 5
                let body: [String: Any] = ["device_id": deviceId, "pubkey_spki_b64": spki]
                req.httpBody = try? JSONSerialization.data(withJSONObject: body)
                let sem = DispatchSemaphore(value: 0)
                var post: [String: Any] = [:]
                URLSession.shared.dataTask(with: req) { data, resp, err in
                    let code = (resp as? HTTPURLResponse)?.statusCode ?? -1
                    var parsed: Any = NSNull()
                    if let data, let j = try? JSONSerialization.jsonObject(with: data) { parsed = j }
                    post = ["http": code, "body": parsed, "err": err?.localizedDescription as Any, "private": false]
                    sem.signal()
                }.resume()
                _ = sem.wait(timeout: .now() + 6)
                var out = id
                out["op"] = "enrollment"
                out["assm_verified"] = true
                out["post_enroll"] = post
                out["private"] = false
                _ = self.enqueuePublic([
                    "schema": "rmail.block4.enroll.v1",
                    "dedup": "enroll|\(deviceId)|\(id["pubkey_sha256"] as? String ?? "")",
                    "state": "public_enroll_attempted",
                    "published": false,
                    "rsign_seal": ["pubkey_spki_b64": spki, "device_id": deviceId, "backend": id["backend"] as Any],
                    "post_enroll": post,
                    "ui_label": "enroll receipt public"
                ])
                self.cb("onSeal", out)
                self.cb("onStatus", ["state": "enroll-done", "detail": "ASSM ok · public SPKI posted=\(post["http"] ?? -1)"])
            }
        }
    }
    #endif

    private func handleSign(_ body: Any) {
        guard let p = asDict(body) else { return cb("onError", ["err": "bad payload"]); }
        let op = p["op"] as? String ?? ""
        if op == "rghostkey.onStatus" || op == "onStatus" {
            var id = statusProvider?() ?? ["ok":false,"err":"native policy not installed"]
            id["op"] = "onStatus"
            return cb("onStatus", id)
        }
        if op == "rghostkey.enroll" || op == "enrollment" {
            return handleEnroll(p)
        }
        // Reject arbitrary/malformed
        let allowed: Set<String> = ["op","v","req_id","req_hash","mode","offline_ok","seal_entry","methods","label","bundle_public","bundle","device_id"]
        let extra = Set(p.keys).subtracting(allowed)
        if !extra.isEmpty { return cb("onError", ["err": "unexpected fields: \(extra.sorted().joined(separator: ","))"]) }
        guard op == Self.OP else { return cb("onError", ["err": "op must be rghostkey.signBind|rghostkey.enroll|rghostkey.onStatus"]) }
        guard (p["v"] as? Int) == 1 || (p["v"] as? NSNumber)?.intValue == 1 else { return cb("onError", ["err": "v must be 1"]) }
        guard let se = p["seal_entry"] as? [String: Any] else { return cb("onError", ["err": "missing seal_entry"]) }
        guard se["purpose"] as? String == Self.PURPOSE else { return cb("onError", ["err": "purpose must be rghostkey.bind"]) }
        guard se["owner_rid"] as? String == Self.OWNER_RID, se["handle"] as? String == Self.OWNER_HANDLE else {
            return cb("onError", ["err": "owner/handle mismatch"])
        }
        guard let reqHash = p["req_hash"] as? String, reqHash.range(of: "^[0-9a-f]{64}$", options: .regularExpression) != nil else {
            return cb("onError", ["err": "req_hash must be 64 hex"])
        }

        guard let methods=p["methods"] as? [String],methods.count == 1,
              ["assm","fingerprint","faceid"].contains(methods[0]) else {return cb("onError",["err":"exactly one supported method must be selected"])}
        let method=methods[0]
        guard let sign=singleMethodSigner else{return cb("onError",["err":"no single-method signer installed"])}
        // Local compare — no network before RWALLET unlock
        guard let local = loadLocalTyped() else {
            return cb("onError", ["err": "no local validated typed request; store public proposal first"])
        }
        guard let lse = local["seal_entry"] as? [String: Any], let bundle = local["bundle"] as? [String: Any] else {
            return cb("onError", ["err": "local typed incomplete"])
        }
        // Recompute req_hash from trusted local seal_entry+bundle
        let recomputed = RGhostkeyBindSeal.reqHash(sealEntry: lse, bundle: bundle)
        if recomputed != reqHash || recomputed != (local["req_hash"] as? String) {
            return cb("onError", ["err": "req_hash mismatch vs local canonical seal_entry+bundle"])
        }
        // Seal entry in payload must match local trusted
        for k in ["purpose","owner_rid","handle","block_sha256","prev_hash"] {
            if "\(se[k] ?? "")" != "\(lse[k] ?? "")" {
                return cb("onError", ["err": "seal_entry.\(k) changed vs local trusted"])
            }
        }

        lock.lock()
        if outstandingReqHash != nil {
            lock.unlock()
            return cb("onError", ["err": "one outstanding approval only"])
        }
        outstandingReqHash = reqHash
        lock.unlock()

        cb("onStatus", ["state": "awaiting-unlock", "detail": "offline ok · RWALLET ASSM / device unlock"])

        sign(lse, method) { result in
            if (result["ok"] as? Bool) != true {
                self.lock.lock(); self.outstandingReqHash = nil; self.lock.unlock()
                let err = result["err"] as? String ?? "seal failed"
                if err.lowercased().contains("cancel") { self.cb("onCancel", ["err": err]) }
                else { self.cb("onError", ["err": err]) }
                return
            }
            guard let seal = result["rsign_seal"] as? [String: Any] else {
                self.lock.lock(); self.outstandingReqHash = nil; self.lock.unlock()
                return self.cb("onError", ["err": "missing rsign_seal"])
            }
            self.finishSeal(reqHash: reqHash, reqId: p["req_id"] as? String, mode: p["mode"] as? String ?? "dry",
                            seal: seal, testPseudo: false, typed: local)
        }
    }

    private func finishSeal(reqHash: String, reqId: String?, mode: String, seal: [String: Any], testPseudo: Bool, typed: [String:Any]) {
        let deviceId = seal["device_id"] as? String ?? "unknown"
        let dedup = "\(reqId ?? "-")|\(reqHash)|\(deviceId)"
        let rec: [String: Any] = [
            "schema": "rmail.block4.native.v1",
            "state": Self.STATE_OFFLINE,
            "ui_label": "signed queued",
            "published": false,
            "req_id": reqId ?? "",
            "typed_request": typed,
            "req_hash": reqHash,
            "device_id": deviceId,
            "dedup": dedup,
            "mode": mode,
            "rsign_seal": seal,
            "ts": Int(Date().timeIntervalSince1970 * 1000),
            "test_pseudo": testPseudo
        ]
        guard queuedSealValidator?(rec) == true else {
            lock.lock();outstandingReqHash=nil;lock.unlock();return cb("onError",["err":"native seal or immutable queued payload verification failed"])
        }
        let (ok, why) = enqueuePublic(rec)
        lock.lock(); outstandingReqHash = nil; lock.unlock()
        guard ok else {return cb("onError",["err":"signature was not durably queued; not approved offline","detail":why])}
        // onSeal does NOT wait for enroll/network
        cb("onSeal", ["ok": true, "rsign_seal": seal, "queued": ok, "queue_detail": why,
                      "ui_label": "approved offline / awaiting chain confirmation", "published": false, "offline": true, "minted":false])
        cb("onStatus", ["state": "signed-queued", "detail": why])
    }

    /// RBATIBA: is_signable — false until pending ready / no missing keys. Offline queue path distinct.
    static func isSignable(ev: [String: Any], pendingView: [String: Any]?) -> (Bool, String, String) {
        // returns (signable_for_live_mint, reason, path) path = live|offline_queue|reject
        guard let pendingView = pendingView else { return (false, "no pending_view", "offline_queue") }
        let ready = pendingView["ready"] as? Bool ?? false
        let missing = pendingView["missing_pubkeys"] as? [String] ?? []
        if !ready || !missing.isEmpty {
            return (false, "not ready: missing pubkeys " + missing.joined(separator: ","), "offline_queue")
        }
        return (true, "ready for owner Sign/Mint in RDRAGON", "live")
    }
}

// ===== 20261111-rbowzr: RMAIL Approve/Deny decision bridge (appended here so the XcodeGen project needs no regenerate) =====
// RMailDecisionNative.swift · 20261111-rbowzr · native leg of rmail-approve-v2.js (RENDERER ONLY; format = MEKANICA's
// SCROLLS/RMAIL-APPROVE-DENY-SPEC-20261111.md). WK handler "rmailDecision":
//   {op:"write", id, node, decision}  → writes the BARE rmail.decision JSON (whole file) to
//        Documents/ЯLAB/RKLOWD/nodes/<node>/inbox/rmail-dec-<req_id>.json  (first decision wins; never overwrites)
//   {op:"open", url:"rwallet://approve?…"} → opens ASSM ЯWALLET Face ID. Never signs, never mints, holds no key.
// Reply: window.RMAIL_DECISION_RESULT({id, ok, err?, path?}). Seat injected as window.RMAIL_SEAT (@chaserizal/<seat>).
#if canImport(UIKit)
#endif

final class RMailDecisionNative: NSObject, WKScriptMessageHandler {
    static let shared = RMailDecisionNative()
    #if os(macOS)
    static var seat = "@chaserizal/neo"
    #else
    static var seat = "@chaserizal/17e"
    #endif
    static let DKEYS: Set<String> = ["schema", "v", "id", "ref", "req_id", "nonce", "decision", "ts", "by", "app", "to_node", "signed"]
    static let SECRET = try! NSRegularExpression(pattern: "(priv|secret|password|passwd|mnemonic|seed|recovery|token|apikey|api_key|credential|signature|^sig$|^key$|xprv|keystore)", options: [.caseInsensitive])

    /// Call once per WKWebViewConfiguration (before the web view is created) or on an existing web view.
    static func install(config cfg: WKWebViewConfiguration) {
        let ucc = cfg.userContentController
        ucc.removeScriptMessageHandler(forName: "rmailDecision")
        ucc.add(shared, name: "rmailDecision")
        ucc.addUserScript(WKUserScript(source: "window.RMAIL_SEAT=\(js(seat));", injectionTime: .atDocumentStart, forMainFrameOnly: false))
    }
    static func install(on w: WKWebView) {
        install(config: w.configuration)
        w.evaluateJavaScript("window.RMAIL_SEAT=\(js(seat));", completionHandler: nil)
    }
    private static func js(_ s: String) -> String {
        let d = (try? JSONSerialization.data(withJSONObject: [s])) ?? Data("[\"\"]".utf8)
        return String(String(data: d, encoding: .utf8)!.dropFirst().dropLast())
    }

    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let m = message.body as? [String: Any], let op = m["op"] as? String else { return }
        let wv = message.webView
        switch op {
        case "write":
            let id = String(((m["id"] as? String) ?? "").prefix(80))
            let r = Self.write(node: (m["node"] as? String) ?? "rvm", decision: m["decision"] as? [String: Any])
            var out: [String: Any] = ["id": id, "ok": r.err == nil]
            if let e = r.err { out["err"] = e }; if let p = r.path { out["path"] = p }
            reply(wv, out)
        case "open":
            guard let s = m["url"] as? String, s.hasPrefix("rwallet://approve?"), let u = URL(string: s) else { return }
            #if canImport(UIKit) && !os(watchOS)
            DispatchQueue.main.async {
                UIApplication.shared.open(u, options: [:]) { ok in
                    if !ok { NotificationCenter.default.post(name: .init("RWalletApproveRequested"), object: nil, userInfo: ["url": s]) }
                }
            }
            #else
            NotificationCenter.default.post(name: .init("RWalletApproveRequested"), object: nil, userInfo: ["url": s])
            #endif
        default: return
        }
    }

    /// Receiver-side checks mirrored from spec §4 (signed false, whitelisted keys, ≤ 4 KB, Rizal's seat, approve|deny).
    static func write(node: String, decision d: [String: Any]?) -> (path: String?, err: String?) {
        guard let d else { return (nil, "no decision") }
        guard d["schema"] as? String == "rmail.decision", (d["v"] as? NSNumber)?.intValue == 1 else { return (nil, "not rmail.decision v1") }
        guard let signed = d["signed"] as? NSNumber, CFGetTypeID(signed) == CFBooleanGetTypeID(), signed.boolValue == false else { return (nil, "signed is not false") }
        guard Set(d.keys).isSubset(of: DKEYS) else { return (nil, "unexpected fields") }
        guard let dec = d["decision"] as? String, dec == "approve" || dec == "deny" else { return (nil, "bad decision") }
        guard let by = d["by"] as? String, by.hasPrefix("@chaserizal/") else { return (nil, "by is not Rizal's seat") }
        guard let rid = d["req_id"] as? String, rid.range(of: "^[A-Za-z0-9_-]{1,64}$", options: .regularExpression) != nil else { return (nil, "bad req_id") }
        for v in d.values { if let s = v as? String, s.contains("PRIVATE KEY") || s.range(of: "BEGIN [A-Z ]*KEY", options: .regularExpression) != nil { return (nil, "secret-like content") } }
        guard let data = try? JSONSerialization.data(withJSONObject: d, options: [.sortedKeys]), data.count <= 4096 else { return (nil, "over 4 KB") }
        let n = node.filter { $0.isLetter || $0.isNumber || $0 == "-" || $0 == "_" }
        guard !n.isEmpty, let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else { return (nil, "no node") }
        let dir = docs.appendingPathComponent("ЯLAB/RKLOWD/nodes/\(n)/inbox", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let f = dir.appendingPathComponent("rmail-dec-\(rid).json")
        if FileManager.default.fileExists(atPath: f.path) { return (nil, "already-decided") }
        do { try data.write(to: f, options: [.atomic, .withoutOverwriting]) } catch { return (nil, "write failed") }
        return ("ЯLAB/RKLOWD/nodes/\(n)/inbox/rmail-dec-\(rid).json", nil)
    }

    private func reply(_ wv: WKWebView?, _ o: [String: Any]) {
        guard let wv, let d = try? JSONSerialization.data(withJSONObject: o), let s = String(data: d, encoding: .utf8) else { return }
        DispatchQueue.main.async { wv.evaluateJavaScript("window.RMAIL_DECISION_RESULT&&window.RMAIL_DECISION_RESULT(\(s))", completionHandler: nil) }
    }
}
