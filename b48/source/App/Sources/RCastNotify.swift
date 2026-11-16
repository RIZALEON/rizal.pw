// RCastNotify.swift · RWALLET 0.1.3 · 20261109 (Rizal t56u) · ADD-ONLY · iOS + macOS local notification + badge for the SIGN PROMPT CAST.
// WK message handler "rcast" (posted by ui/js/rmint-cast.js): notify{id,title,expires} · badge{n} · clear{id}.
// Tapping the notification calls window.RMINT_CAST.open(id) in the wallet WebView, which shows the card with the ONE button.
// DISPLAY ONLY: no signing, no key access, no auto-approve. The press still needs Rizal's unlock in RSignOneOf / RSignNeoAssm.
// Wiring (Rizal, one line where the wallet WKWebView is created):  RCastNotify.install(on: webView)
// Note: install() makes this object the UNUserNotificationCenter delegate; if the app already has one, forward to it instead.
import Foundation
import WebKit
import UserNotifications

final class RCastNotify: NSObject, WKScriptMessageHandler, UNUserNotificationCenterDelegate {
    static let shared = RCastNotify()
    weak var web: WKWebView?
    static func okId(_ s: String?) -> Bool { guard let s = s else { return false }; return s.range(of: "^[A-Za-z0-9._-]{3,80}$", options: .regularExpression) != nil }
    static func install(on web: WKWebView) {
        shared.web = web
        web.configuration.userContentController.add(shared, name: "rcast")
        UNUserNotificationCenter.current().delegate = shared
    }
    func userContentController(_ u: WKUserContentController, didReceive m: WKScriptMessage) {
        guard let b = m.body as? [String: Any], let op = b["op"] as? String else { return }
        let c = UNUserNotificationCenter.current()
        switch op {
        case "notify":
            let id = b["id"] as? String
            guard Self.okId(id), let id = id else { return }
            let body = String((b["title"] as? String ?? "Sign request").prefix(120))
            c.requestAuthorization(options: [.alert, .badge, .sound]) { ok, _ in
                guard ok else { return }
                let ct = UNMutableNotificationContent()
                ct.title = "Я MINT · SIGN"; ct.body = body; ct.userInfo = ["rcast_id": id]; ct.sound = .default
                c.add(UNNotificationRequest(identifier: "rcast-" + id, content: ct, trigger: nil))
            }
        case "badge":
            let n = (b["n"] as? Int) ?? Int((b["n"] as? Double) ?? 0)
            c.setBadgeCount(max(0, n))
        case "clear":
            let id = b["id"] as? String
            guard Self.okId(id), let id = id else { return }
            c.removeDeliveredNotifications(withIdentifiers: ["rcast-" + id]); c.removePendingNotificationRequests(withIdentifiers: ["rcast-" + id])
        default: break
        }
    }
    func userNotificationCenter(_ c: UNUserNotificationCenter, didReceive r: UNNotificationResponse, withCompletionHandler done: @escaping () -> Void) {
        let id = r.notification.request.content.userInfo["rcast_id"] as? String
        if Self.okId(id), let id = id {
            DispatchQueue.main.async { self.web?.evaluateJavaScript("window.RMINT_CAST&&window.RMINT_CAST.open('\(id)')", completionHandler: nil) }
        }
        done()
    }
    func userNotificationCenter(_ c: UNUserNotificationCenter, willPresent n: UNNotification, withCompletionHandler done: @escaping (UNNotificationPresentationOptions) -> Void) {
        done([.banner, .badge, .sound])
    }
}
