import SwiftUI
import UniformTypeIdentifiers
import GCDWebServer

@MainActor
final class TransponderModel: ObservableObject {
    @Published var folderURL: URL?
    @Published var isRunning = false
    @Published var status = "Select the RKLOWD folder to begin."
    @Published var token = UUID().uuidString + UUID().uuidString
    @Published var port: UInt = 8787
    private let server = GCDWebServer()

    func start() {
        guard let folderURL else { status = "Select RKLOWD first."; return }
        guard !isRunning else { return }
        let root = folderURL
        let secret = token

        server.addDefaultHandler(forMethod: "GET", request: GCDWebServerRequest.self) { _ in
            return GCDWebServerDataResponse(text: "Rizal.pw iPhone file server")
        }

        server.addHandler(forMethod: "GET", path: "/api/health", request: GCDWebServerRequest.self) { [weak self] request in
            guard self?.authorized(request, secret: secret) == true else {
                return GCDWebServerDataResponse(statusCode: 401)
            }
            return GCDWebServerDataResponse(jsonObject: ["status": "ok", "service": "Rizal.pw"])
        }

        server.addHandler(forMethod: "GET", path: "/api/files", request: GCDWebServerRequest.self) { [weak self] request in
            guard self?.authorized(request, secret: secret) == true else {
                return GCDWebServerDataResponse(statusCode: 401)
            }
            let files = (try? FileManager.default.contentsOfDirectory(at: root, includingPropertiesForKeys: [.fileSizeKey], options: [.skipsHiddenFiles])) ?? []
            let rows = files.map { url -> [String: Any] in
                let size = (try? url.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0
                return ["name": url.lastPathComponent, "size": size]
            }
            return GCDWebServerDataResponse(jsonObject: ["files": rows])
        }

        server.addHandler(forMethod: "GET", pathRegex: "^/api/download/([^/]+)$", request: GCDWebServerRequest.self) { [weak self] request in
            guard self?.authorized(request, secret: secret) == true else {
                return GCDWebServerDataResponse(statusCode: 401)
            }
            let name = (request.path as NSString).lastPathComponent.removingPercentEncoding ?? ""
            guard self?.safeName(name) == true else { return GCDWebServerDataResponse(statusCode: 400) }
            let url = root.appendingPathComponent(name)
            guard FileManager.default.fileExists(atPath: url.path) else { return GCDWebServerDataResponse(statusCode: 404) }
            return GCDWebServerFileResponse(file: url.path, isAttachment: true)
        }

        server.addHandler(forMethod: "POST", path: "/api/upload", request: GCDWebServerMultiPartFormRequest.self) { [weak self] request in
            guard self?.authorized(request, secret: secret) == true else {
                return GCDWebServerDataResponse(statusCode: 401)
            }
            guard let form = request as? GCDWebServerMultiPartFormRequest,
                  let file = form.files.first,
                  self?.safeName(file.fileName) == true else {
                return GCDWebServerDataResponse(statusCode: 400)
            }
            let destination = root.appendingPathComponent(file.fileName)
            guard !FileManager.default.fileExists(atPath: destination.path) else {
                return GCDWebServerDataResponse(statusCode: 409)
            }
            do {
                try FileManager.default.copyItem(atPath: file.temporaryPath, toPath: destination.path)
                return GCDWebServerDataResponse(jsonObject: ["uploaded": file.fileName])
            } catch {
                return GCDWebServerDataResponse(statusCode: 500)
            }
        }

        let options: [String: Any] = [
            GCDWebServerOption_Port: port,
            GCDWebServerOption_BindToLocalhost: false,
            GCDWebServerOption_AutomaticallySuspendInBackground: true
        ]
        do {
            try server.start(options: options)
            isRunning = true
            status = "Server running on port \\(server.port). Keep this app open while sharing."
        } catch {
            status = "Could not start server: \\(error.localizedDescription)"
        }
    }

    func stop() {
        server.stop()
        isRunning = false
        status = "Server stopped."
    }

    func authorized(_ request: GCDWebServerRequest, secret: String) -> Bool {
        return request.headers["authorization"] == "Bearer \\(secret)"
    }

    func safeName(_ name: String) -> Bool {
        return !name.isEmpty && name != "." && name != ".." &&
            !name.contains("/") && !name.contains("\\\\") &&
            !name.hasPrefix(".")
    }
}

struct ContentView: View {
    @StateObject private var model = TransponderModel()
    @State private var selectingFolder = false

    var body: some View {
        NavigationView {
            Form {
                Section("RKLOWD folder") {
                    Text(model.folderURL?.lastPathComponent ?? "No folder selected")
                    Button("Choose RKLOWD Folder") { selectingFolder = true }
                }
                Section("File server") {
                    Text(model.status)
                    HStack {
                        Button("Start Server") { model.start() }.disabled(model.isRunning || model.folderURL == nil)
                        Button("Stop") { model.stop() }.disabled(!model.isRunning)
                    }
                    Text("Port: \\(model.port)")
                    if model.isRunning {
                        Text("Access token (keep private):")
                        Text(model.token).font(.caption).textSelection(.enabled)
                    }
                }
                Section("Network") {
                    Text("Local discovery: Bonjour _http._tcp (configure app Info.plist).")
                    Text("Remote access: connect through an approved private overlay and test inbound reachability. Do not publish this server directly.")
                }
            }
            .navigationTitle("Rizal.pw Transponder")
            .fileImporter(isPresented: $selectingFolder, allowedContentTypes: [.folder], allowsMultipleSelection: false) { result in
                switch result {
                case .success(let urls):
                    guard let url = urls.first, url.startAccessingSecurityScopedResource() else {
                        model.status = "Could not access selected folder."; return
                    }
                    model.folderURL = url
                    model.status = "Selected \\(url.lastPathComponent)."
                case .failure(let error):
                    model.status = error.localizedDescription
                }
            }
        }
    }
}
