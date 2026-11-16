// 2026-11-04 (pt20u/t21u/t22u) · Neo-style THUNDR-FLOAT overlay for iOS.
// Runs the SAME THUNDR-FLOAT web/ (float.html + thundr-orb.js + sprites + meter/jobs bars) in NATIVE mode, exactly like the Mac
// THUNDR-FLOAT.app: a transparent WKWebView in a floating pass-through window, resized 68x58 (sprite) / 236x104 (status) / 440x316 (chat),
// messageHandlers.float ops dragstart/drag/dragend/chat/status/call/resize handled natively; calls + fetches to 127.0.0.1:8329/8323
// are proxied to RDOS on the Mac (ThundRStore.endpoints). Edge snap + saved position on dragend.
import UIKit
import WebKit
import SwiftUI

final class NFPassWindow: UIWindow {
    weak var float: UIView?
    override func hitTest(_ p: CGPoint, with e: UIEvent?) -> UIView? {
        guard let f = float, !f.isHidden, f.frame.contains(p) else { return nil }
        return super.hitTest(p, with: e)
    }
}
final class NFRootVC: UIViewController { override func loadView() { view = UIView(); view.backgroundColor = .clear } }

@MainActor final class ThundRNeoFloat: NSObject, WKScriptMessageHandler {
    static let shared = ThundRNeoFloat()
    var win: NFPassWindow?, box = UIView(), web: WKWebView!
    var dragOrigin = CGPoint.zero, chatOpen = false, statusOpen = false, custom: CGSize? = nil, rightSide = true, sheetUp = false
    let small = CGSize(width: 68, height: 58), big = CGSize(width: 440, height: 316), stat = CGSize(width: 236, height: 104)
    let d = UserDefaults.standard

    static let shim = """
    (function(){var vp=function(){if(document.querySelector('meta[name=viewport]'))return;var m=document.createElement('meta');m.name='viewport';m.content='width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no';(document.head||document.documentElement).appendChild(m)};vp();document.addEventListener('DOMContentLoaded',vp);var cs=function(){if(document.getElementById('nf-ios-css'))return;var st=document.createElement('style');st.id='nf-ios-css';st.textContent='#th-meter .t{display:none!important}#th-meter{margin-top:-6px!important}html.nf-right #thundr-pin{left:auto!important;right:2px!important}html.nf-right #th-jobs{left:auto!important;right:2px!important}html.nf-sheet #th-jobs{display:none!important}';(document.head||document.documentElement).appendChild(st)};document.addEventListener('DOMContentLoaded',cs);var rk=function(){var bs=[].slice.call(document.querySelectorAll('button'));if(bs.some(function(b){return b.dataset.nfRk}))return;var g=bs.filter(function(b){return /^\\s*gizmo\\s*$/i.test(b.textContent)})[0];if(!g)return;var c=document.createElement('button');c.className=g.className;c.textContent=g.textContent===g.textContent.toUpperCase()?'RKLOWD':'rklowd';c.dataset.nfRk='1';c.addEventListener('click',function(e){e.stopPropagation();e.preventDefault();window.webkit.messageHandlers.float.postMessage({op:'rklowd'})},true);g.after(c)};setInterval(rk,1500);window.__nfSide=function(r,sh){var h=document.documentElement;h.classList.toggle('nf-right',!!r);h.classList.toggle('nf-sheet',!!sh)};var X=0,Y=0;window.__nfOff=function(x,y){X=x;Y=y};
    try{Object.defineProperty(MouseEvent.prototype,'screenX',{get:function(){return this.clientX+X}});Object.defineProperty(MouseEvent.prototype,'screenY',{get:function(){return this.clientY+Y}})}catch(e){}
    var of=window.fetch,n=1,P={};window.__nfR=function(id,st,b){var p=P[id];if(!p)return;delete P[id];p(new Response(b,{status:st||200,headers:{'Content-Type':'application/json'}}))};
    window.fetch=function(u,o){var s=(typeof u==='string')?u:(u&&u.url)||'';if(/^https?:\\/\\/(127\\.0\\.0\\.1|localhost):83(29|23)\\//.test(s)){return new Promise(function(res){var id=n++;P[id]=res;window.webkit.messageHandlers.nfetch.postMessage({id:id,url:s,method:(o&&o.method)||'GET',body:(o&&typeof o.body==='string')?o.body:null,ct:(o&&o.headers&&(o.headers['Content-Type']||o.headers['content-type']))||''})})}return of.apply(this,arguments)};})();
    """

    func attach(scene: UIWindowScene, webFolder: URL) {
        guard win == nil else { return }
        let w = NFPassWindow(windowScene: scene)
        w.windowLevel = .alert + 1; w.backgroundColor = .clear
        let vc = NFRootVC(); w.rootViewController = vc
        let cfg = WKWebViewConfiguration()
        cfg.userContentController.add(self, name: "float")
        cfg.userContentController.add(self, name: "nfetch")
        cfg.userContentController.addUserScript(WKUserScript(source: Self.shim, injectionTime: .atDocumentStart, forMainFrameOnly: false))
        cfg.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")
        web = WKWebView(frame: CGRect(origin: .zero, size: small), configuration: cfg)
        web.isOpaque = false; web.backgroundColor = .clear; web.scrollView.backgroundColor = .clear
        web.scrollView.isScrollEnabled = false; web.scrollView.bounces = false
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.scrollView.minimumZoomScale = 1; web.scrollView.maximumZoomScale = 1   // 1 CSS px = 1 pt, as on the Mac
        web.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        box.backgroundColor = .clear; box.addSubview(web)
        vc.view.addSubview(box)
        let b = scene.screen.bounds
        let x = d.object(forKey: "nf2.x") as? Double ?? Double(b.width - small.width - 6)   // default: bottom-right edge
        let y = d.object(forKey: "nf2.y") as? Double ?? Double(b.height - small.height - 110)
        box.frame = CGRect(x: x, y: y, width: small.width, height: small.height)
        rightSide = box.frame.midX >= b.width / 2
        w.float = box; w.isHidden = false; win = w
        clamp(); pushOffset()
        web.loadFileURL(webFolder.appendingPathComponent("float.html"), allowingReadAccessTo: webFolder)
        Timer.scheduledTimer(withTimeInterval: 5, repeats: true) { [weak self] _ in Task { @MainActor in self?.syncChat(); self?.pushSide() } }
        Timer.scheduledTimer(withTimeInterval: 0.6, repeats: true) { [weak self] _ in Task { @MainActor in self?.checkSheet(scene) } }
    }

    func userContentController(_ c: WKUserContentController, didReceive m: WKScriptMessage) {
        guard let b = m.body as? [String: Any] else { return }
        if m.name == "nfetch" { proxyFetch(b); return }
        guard let op = b["op"] as? String else { return }
        switch op {
        case "dragstart": dragOrigin = box.frame.origin
        case "drag":
            let dx = (b["dx"] as? Double) ?? 0, dy = (b["dy"] as? Double) ?? 0
            box.frame.origin = CGPoint(x: dragOrigin.x + dx, y: dragOrigin.y + dy); pushOffset()
        case "dragend": snap()
        case "loaded": pushSide()
        case "chat": chatOpen = (b["open"] as? Bool) ?? false; custom = nil; resize(); if !chatOpen { syncChat() }
        case "status": statusOpen = (b["open"] as? Bool) ?? false; resize(); if !chatOpen { syncChat() }
        case "resize": custom = CGSize(width: (b["w"] as? Double) ?? 440, height: (b["h"] as? Double) ?? 316); resize()
        case "call": call(b)
        case "rklowd": presentRklowd()
        default: break
        }
    }

    func syncChat() {
        web?.evaluateJavaScript("!!(window.THUNDR_ORB&&window.THUNDR_ORB.state&&window.THUNDR_ORB.state().open)") { [weak self] r, _ in
            guard let self else { return }
            let open = (r as? Bool) == true
            if open != self.chatOpen { self.chatOpen = open; self.resize() }
        }
    }
    var bounds: CGRect { win?.bounds ?? UIScreen.main.bounds }
    var safe: UIEdgeInsets { win?.safeAreaInsets ?? .zero }
    // (c) collapse the job panel while any sheet / drawer (presented VC) covers the app; the sprite stays
    func checkSheet(_ scene: UIWindowScene) {
        var up = false
        for w in scene.windows where w !== win && !w.isHidden {
            if let p = w.rootViewController?.presentedViewController, !p.isBeingDismissed { up = true; break }
        }
        if up != sheetUp { sheetUp = up; resize() }
    }
    func pushSide() { web?.evaluateJavaScript("window.__nfSide&&window.__nfSide(\(rightSide && !chatOpen),\(sheetUp))") }
    // sprite rect on screen: the 68x58 sprite sits at the window's left (left edge) or right (right edge) corner
    var spriteOrigin: CGPoint { CGPoint(x: rightSide ? box.frame.maxX - small.width : box.frame.minX, y: box.frame.minY) }
    func resize() {
        var s = chatOpen ? (custom ?? big) : ((statusOpen && !sheetUp) ? stat : small)
        s.width = min(s.width, bounds.width - 8); s.height = min(s.height, bounds.height - safe.top - safe.bottom - 8)
        let o = spriteOrigin
        // (a) grow away from the snapped edge so the panel is always fully on-screen
        box.frame = CGRect(x: rightSide ? o.x + small.width - s.width : o.x, y: o.y, width: s.width, height: s.height); clamp(); pushSide(); pushOffset()
    }
    func clamp() {
        var f = box.frame, B = bounds, S = safe
        f.origin.x = max(S.left + 2, min(f.origin.x, B.width - S.right - f.width - 2))
        f.origin.y = max(S.top + 2, min(f.origin.y, B.height - S.bottom - f.height - 2))
        box.frame = f
    }
    func snap() {
        let B = bounds, S = safe, f = box.frame
        let left = f.midX < B.width / 2
        rightSide = !left; pushSide()
        UIView.animate(withDuration: 0.22, delay: 0, usingSpringWithDamping: 0.8, initialSpringVelocity: 0.4) {
            self.box.frame.origin.x = left ? S.left + 4 : B.width - S.right - f.width - 4; self.clamp()
        } completion: { _ in
            self.pushOffset()
            self.d.set(Double(self.box.frame.minX), forKey: "nf2.x"); self.d.set(Double(self.box.frame.minY), forKey: "nf2.y")
        }
    }
    // RKLOWD sheet over the app's top view controller (float window stays above it; job panel collapses via checkSheet)
    func presentRmail() {
        js("window.RMAIL_UI&&window.RMAIL_UI.open&&window.RMAIL_UI.open()")
    }
    func presentRklowd() {
        guard let scene = win?.windowScene ?? UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }).first else { return }
        guard var top = scene.windows.first(where: { $0 !== win && $0.isKeyWindow })?.rootViewController ?? scene.windows.first(where: { $0 !== win })?.rootViewController else { return }
        while let p = top.presentedViewController { top = p }
        if top is UIHostingController<RklowdView> { return }
        var hc: UIViewController?
        hc = UIHostingController(rootView: RklowdView(close: { hc?.dismiss(animated: true) }))
        top.present(hc!, animated: true)
    }
    func pushOffset() { web?.evaluateJavaScript("window.__nfOff&&window.__nfOff(\(box.frame.minX),\(box.frame.minY))") }

    func js(_ s: String) { DispatchQueue.main.async { self.web.evaluateJavaScript(s) } }
    func enc(_ o: Any) -> String { (try? JSONSerialization.data(withJSONObject: [o])).flatMap { String(data: $0, encoding: .utf8) }.map { String($0.dropFirst().dropLast()) } ?? "null" }

    func call(_ b: [String: Any]) {
        let id = (b["id"] as? Int) ?? 0, tool = (b["tool"] as? String) ?? "", text = (b["text"] as? String) ?? ""
        let allowed: Set<String> = ["thundr_chat", "casket_approve", "wallet", "wallet_cached", "casket", "casket_verify", "inventory", "status"]
        // 2026-11-14 pt341u: manual ЯSYNC transcript -> ЯSCRIBE ("rscribe save" / "save transcript" in ThundR chat). Local file + journal row only.
        if tool == "thundr_chat", ["rscribe save", "save transcript", "rscribe save transcript"].contains(text.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)) {
            let u = RAgentTranscript.saveToRScribe(app: "rdragon-ios", title: "RDRAGON · RAGENT transcript", text: RAgentTranscript.shareText(app: "rdragon-ios"))
            js("window.THUNDR_REPLY(\(id), \(enc(["ok": u != nil, "via": "rscribe-manual", "reply": u.map { "Saved to ЯSCRIBE: " + $0.lastPathComponent + " (rides ЯSYNC to the Neo)." } ?? "Nothing to save yet."])))"); return
        }
        guard allowed.contains(tool) else { js("window.THUNDR_REPLY(\(id), {\"ok\":false,\"error\":\"tool not allowed in THUNDR-FLOAT\"})"); return }
        let body = try? JSONSerialization.data(withJSONObject: ["text": text])
        Task {
            let t0 = Date()
            // 2026-11-13 (Rizal pt178u): RTHUNDR iOS folded into RDRGN (no 4th app slot). Plain ThundR talk -> Apple on-device first,
            // and every ThundR chat turn is journaled for CRYPTOHIVEMIND (RAgentJournal -> RAgentHiveSync -> Neo). Guarded/wallet text is never journaled.
            if tool == "thundr_chat", Self.isConversational(text), !RAgentEngine.isGuarded(text),
               let a = await RAgentEngine.apple(system: "You are ThundR, Rizal's offline assistant on this iPhone/iPad. Be brief and concrete. You never sign, mint, pay, approve or touch wallets.", prompt: text) {
                RAgentJournal.record(app: "rdragon-ios", source: "rdragon-thundr", user: text, reply: a, engine: "apple-on-device", secs: Date().timeIntervalSince(t0))
                js("window.THUNDR_REPLY(\(id), \(enc(["ok": true, "via": "apple-on-device", "reply": a])))"); return
            }
            for base in [RAgentNeoFront.base] + ThundRStore.endpoints {   // 2026-11-13 t181u: Neo LAN front (device token) first
                guard let u = URL(string: base + "/v1/call/\(tool)") else { continue }
                var r = URLRequest(url: u); r.httpMethod = "POST"; r.timeoutInterval = 150; r.httpBody = body
                r.setValue("application/json", forHTTPHeaderField: "Content-Type"); RAgentNeoFront.authorize(&r)   // t181u
                if let (d, resp) = try? await URLSession.shared.data(for: r), !(RAgentNeoFront.isFront(u) && (resp as? HTTPURLResponse)?.statusCode != 200), let j = try? JSONSerialization.jsonObject(with: d) {
                    if tool == "thundr_chat", !RAgentEngine.isGuarded(text), let o = j as? [String: Any] {   // pt178u: journal for CRYPTOHIVEMIND
                        RAgentJournal.record(app: "rdragon-ios", source: "rdragon-thundr", user: text, reply: (o["reply"] as? String) ?? "", engine: "neo-mcr:" + ((o["via"] as? String) ?? ""), secs: Date().timeIntervalSince(t0)) }
                    js("window.THUNDR_REPLY(\(id), \(enc(j)))"); return }
            }
            // pt178u: Neo away -> the phone's own Apple model still answers chat and `ragent <q>` (commands stay offline).
            if tool == "thundr_chat", !RAgentEngine.isGuarded(text), Self.isConversational(text) || text.lowercased().hasPrefix("ragent "),
               let a = await RAgentEngine.apple(system: "You are ThundR, Rizal's offline assistant on this iPhone/iPad. Be brief.", prompt: text.lowercased().hasPrefix("ragent ") ? String(text.dropFirst(7)) : text) {
                RAgentJournal.record(app: "rdragon-ios", source: "rdragon-thundr", user: text, reply: a, engine: "apple-on-device", secs: Date().timeIntervalSince(t0))
                js("window.THUNDR_REPLY(\(id), \(enc(["ok": true, "via": "apple-on-device (Neo away)", "reply": a])))"); return
            }
            js("window.THUNDR_REPLY(\(id), {\"ok\":false,\"via\":\"offline\",\"error\":\"RDOS endpoint on the Neo (:8329) not reachable from this iPhone.\"})")
        }
    }
    /// pt178u (same rule as RTHUNDR iOS pt173u): plain talk (not a ThundR command word) may go to the on-device model first.
    static func isConversational(_ t: String) -> Bool {
        let s = t.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let c = s.first, !"/!:@>".contains(c), s.count >= 2 else { return false }
        let w = s.lowercased().split(whereSeparator: { $0 == " " || $0 == "\n" }).first.map(String.init) ?? ""
        let cmds: Set<String> = ["ragent", "ask", "rxcode>", "gizmo", "status", "help", "commands", "command", "wallet", "rwallet", "casket", "balances",
            "scan", "models", "approve", "request", "sign", "mint", "rmail", "rklowd", "scroll", "open", "close", "quit", "terraformr", "teraformr",
            "terraformя", "rvm", "ros", "assm", "signin", "inventory", "update", "install", "test", "rscribe", "manual", "chalk", "chalkboard",
            "handoff", "qr", "link", "check", "bridge", "session", "panels", "rboard", "rdragon", "jobs", "job", "permissions", "done"]
        return !cmds.contains(w) && !w.hasPrefix("host")
    }
    func proxyFetch(_ b: [String: Any]) {
        let id = (b["id"] as? Int) ?? 0, url = (b["url"] as? String) ?? "", method = (b["method"] as? String) ?? "GET"
        guard let comps = URLComponents(string: url) else { return }
        let port = comps.port ?? 8329, tail = url.replacingOccurrences(of: #"^https?://[^/]+"#, with: "", options: .regularExpression)
        Task {
            if port == 8329 || port == 4990, RAgentNeoFront.serves(comps.path), let fu = URL(string: RAgentNeoFront.base + tail) {   // 2026-11-13 t181u: Neo LAN front first
                var r = URLRequest(url: fu); r.httpMethod = method; r.timeoutInterval = method == "GET" ? 8 : 120
                if let s = b["body"] as? String { r.httpBody = Data(s.utf8) }
                r.setValue("application/json", forHTTPHeaderField: "Content-Type"); RAgentNeoFront.authorize(&r)
                if let (d, resp) = try? await URLSession.shared.data(for: r), let st = (resp as? HTTPURLResponse)?.statusCode, st == 200 {
                    js("window.__nfR(\(id), \(st), \(enc(String(decoding: d, as: UTF8.self))))"); return }
            }
            for base in ThundRStore.endpoints {
                guard var bc = URLComponents(string: base) else { continue }
                bc.port = port
                guard let root = bc.url?.absoluteString, let u = URL(string: root + tail) else { continue }
                var r = URLRequest(url: u); r.httpMethod = method; r.timeoutInterval = method == "GET" ? 8 : 120
                if let s = b["body"] as? String { r.httpBody = Data(s.utf8) }
                r.setValue((b["ct"] as? String).flatMap { $0.isEmpty ? nil : $0 } ?? "application/json", forHTTPHeaderField: "Content-Type")
                if let (d, resp) = try? await URLSession.shared.data(for: r) {
                    let st = (resp as? HTTPURLResponse)?.statusCode ?? 200
                    js("window.__nfR(\(id), \(st), \(enc(String(decoding: d, as: UTF8.self))))"); return }
            }
            js("window.__nfR(\(id), 503, '{\"ok\":false,\"offline\":true}')")
        }
    }
}

/// Drop into the SwiftUI root: attaches the Neo float to this window's scene once.
struct ThundRNeoFloatAttach: UIViewRepresentable {
    let folder: String
    final class V: UIView {
        var folder = ""
        override func didMoveToWindow() {
            super.didMoveToWindow()
            guard let sc = window?.windowScene, let root = Bundle.main.resourceURL?.appendingPathComponent(folder) else { return }
            Task { @MainActor in ThundRNeoFloat.shared.attach(scene: sc, webFolder: root) }
        }
    }
    func makeUIView(context: Context) -> V { let v = V(); v.folder = folder; v.isUserInteractionEnabled = false; return v }
    func updateUIView(_ v: V, context: Context) {}
}
