// 2026-11-04 · Floating CryptoBot outside the app: Live Activity start/refresh, background refresh, rdragon://thundr deep links + native ThundR chat.
import SwiftUI
import WidgetKit
import ActivityKit
import BackgroundTasks

let thundrRefreshTaskID = "info.rizal.dragonskull.thundr.refresh"

@MainActor final class ThundRLive: ObservableObject {
    static let shared = ThundRLive()
    private var timer: Timer?
    func start() {
        tick(); timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: 30, repeats: true) { _ in Task { @MainActor in ThundRLive.shared.tick() } }
        ThundRLive.scheduleRefresh()
    }
    func tick() { Task { await ThundRLive.refreshOnce() } }
    static func refreshOnce() async {
        let s = await ThundRStore.refresh()
        WidgetCenter.shared.reloadAllTimelines()
        if #available(iOS 16.2, *) { await updateActivity(s) }
    }
    @available(iOS 16.2, *)
    static func updateActivity(_ s: ThundRSnapshot) async {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
        let content = ActivityContent(state: s.activityState, staleDate: Date().addingTimeInterval(20 * 60))
        let acts = Activity<ThundRActivityAttributes>.activities
        if let a = acts.first {
            await a.update(content)
            for extra in acts.dropFirst() { await extra.end(nil, dismissalPolicy: .immediate) }
        } else { _ = try? Activity.request(attributes: ThundRActivityAttributes(), content: content, pushType: nil) }
    }
    nonisolated static func scheduleRefresh() {
        let r = BGAppRefreshTaskRequest(identifier: thundrRefreshTaskID)
        r.earliestBeginDate = Date().addingTimeInterval(15 * 60)
        try? BGTaskScheduler.shared.submit(r)
    }
}

/// rdragon://thundr[/rmail|balances|rwallet|casket|scan|models|gizmo]
final class ThundRRouter: ObservableObject {
    static let shared = ThundRRouter()
    @Published var open = false
    @Published var query = ""
    static let map = ["balances": "wallet balances", "rwallet": "rwallet unified", "casket": "casket status", "scan": "scan", "models": "list models", "gizmo": "TERAFORMR"]
    func handle(_ url: URL) {
        guard url.scheme == "rdragon", url.host == "thundr" else { return }
        let v = url.pathComponents.dropFirst().first?.lowercased() ?? ""
        if v == "rklowd" { Task { @MainActor in ThundRNeoFloat.shared.presentRklowd() }; return }   // rdragon://thundr/rklowd
        if v == "rmail" || v == "message" { Task { @MainActor in ThundRNeoFloat.shared.presentRmail() }; return }
        query = ThundRRouter.map[v] ?? ""; open = true
    }
    func consumePendingFromWidget() {
        let d = UserDefaults(suiteName: "group.info.rizal.rthundr")
        guard let v = d?.string(forKey: "rthundr.pending"), !v.isEmpty else { return }
        d?.removeObject(forKey: "rthundr.pending")
        handle(URL(string: "rdragon://thundr/\(v)") ?? URL(string: "rdragon://thundr/rmail")!)
    }
}

struct ThundRChatView: View {
    @ObservedObject var router = ThundRRouter.shared
    @State private var input = ""
    @State private var log: [(Bool, String)] = []
    @State private var busy = false
    var body: some View {
        VStack(spacing: 8) {
            HStack {
                Image("ThundRAvatar").resizable().frame(width: 36, height: 36).clipShape(RoundedRectangle(cornerRadius: 8))
                Text("⚡ THUNDR · RDOS").font(.system(.headline, design: .monospaced)).foregroundColor(.yellow)
                Spacer()
                Button("✕") { router.open = false }.foregroundColor(.white)
            }
            ScrollView { VStack(alignment: .leading, spacing: 6) {
                ForEach(Array(log.enumerated()), id: \.offset) { _, m in
                    Text(m.1).font(.system(size: 12, design: .monospaced)).foregroundColor(m.0 ? .cyan : .white).frame(maxWidth: .infinity, alignment: .leading)
                }
            } }
            ScrollView(.horizontal, showsIndicators: false) { HStack {
                ForEach(["balances", "rwallet", "casket", "scan", "models", "gizmo"], id: \.self) { k in
                    Button(k.uppercased()) { send(ThundRRouter.map[k] ?? k) }.font(.system(size: 11, weight: .bold, design: .monospaced))
                        .padding(.horizontal, 8).padding(.vertical, 5).background(Color.purple.opacity(0.5)).clipShape(Capsule()).foregroundColor(.white)
                }
            } }
            HStack {
                TextField("ask ThundR…", text: $input).textFieldStyle(.roundedBorder).onSubmit { send(input) }
                Button(busy ? "…" : "Send") { send(input) }.disabled(busy)
            }
        }.padding().background(Color(red: 18/255, green: 14/255, blue: 30/255).ignoresSafeArea())
        .onAppear { if !router.query.isEmpty { send(router.query); router.query = "" } }
        .onChange(of: router.query) { q in if !q.isEmpty { send(q); router.query = "" } }
    }
    func send(_ q: String) {
        let q = q.trimmingCharacters(in: .whitespaces); guard !q.isEmpty else { return }
        input = ""; log.append((true, "› " + q)); busy = true
        Task {
            var reply = "RDOS not reachable (Neo offline or off-LAN)"
            for base in ThundRStore.endpoints {
                guard let u = URL(string: base + "/v1/call/thundr_chat") else { continue }
                var r = URLRequest(url: u); r.httpMethod = "POST"; r.timeoutInterval = 20
                r.setValue("text/plain", forHTTPHeaderField: "Content-Type")
                r.httpBody = try? JSONSerialization.data(withJSONObject: ["text": q])
                if let (d, _) = try? await URLSession.shared.data(for: r), let j = try? JSONSerialization.jsonObject(with: d) as? [String: Any] {
                    reply = (j["reply"] as? String) ?? (j["error"] as? String) ?? String(data: d, encoding: .utf8) ?? "?"; break
                }
            }
            await MainActor.run { log.append((false, reply)); busy = false }
        }
    }
}
