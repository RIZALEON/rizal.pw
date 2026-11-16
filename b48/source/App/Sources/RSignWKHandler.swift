// RSignWKHandler.swift · 20261108-rwallet · ADD-ONLY · the WK "rsign" reply handler the web bundle (rmint-onetap.js / rmint-press.js) expects
// on iOS (17e RDRAGON / any WKWebView host). Read-only finding: the RDRAGON iOS app has NO "rsign" handler today, so its web wallet routes to
// TERAFORMR over RPIPE. To sign in-app: add RSignCore.swift + RSignOneOf.swift + this file to the app target and call
//   RSignWKHandler.install(on: webView)
// Ops: factors · pubkey · seal (Face ID, unchanged rule) · sealOneOf (Face ID OR ASSM password). No auto-sign path is used here.
import Foundation
import WebKit
final class RSignWKHandler: NSObject, WKScriptMessageHandlerWithReply {
    static func install(on web: WKWebView) { web.configuration.userContentController.addScriptMessageHandler(RSignWKHandler(), contentWorld: .page, name: "rsign") }
    func userContentController(_ u: WKUserContentController, didReceive m: WKScriptMessage, replyHandler: @escaping (Any?, String?) -> Void) {
        guard let b = m.body as? [String: Any] else { return replyHandler(nil, "bad body") }
        let core = RSignCore.shared
        if core.handleOneOfMessage(b, reply: { replyHandler($0, nil) }) { return }
        switch b["op"] as? String {
        case "pubkey":
            guard let k = core.seKey(), let p = SecKeyCopyPublicKey(k), let pb = core.pubB64(p) else { return replyHandler(["ok": false, "err": RSignCore.ERR_NO_RGHOSTKEY], nil) }
            replyHandler(["ok": true, "pubkey_spki_b64": pb, "device_id": RSignCore.deviceId(pb)], nil)
        case "seal": core.seal((b["entry"] as? String) ?? "") { replyHandler($0, nil) }
        default: replyHandler(["ok": false, "err": "unknown op"], nil)
        }
    }
}
