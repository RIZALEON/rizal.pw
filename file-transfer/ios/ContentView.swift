import SwiftUI
import UniformTypeIdentifiers

struct ContentView: View {
    @State private var showingFolderPicker = false
    @State private var folderURL: URL?
    @State private var status = "Select your RKLOWD folder to begin."

    var body: some View {
        NavigationStack {
            Form {
                Section("RKLOWD storage") {
                    Text(folderURL?.lastPathComponent ?? "No folder selected")
                    Button("Choose RKLOWD folder") {
                        showingFolderPicker = true
                    }
                }
                Section("File server") {
                    Label("HTTP server not started", systemImage: "pause.circle")
                    Text("This source scaffold currently handles folder selection only. Add and test the authenticated HTTP server before enabling uploads or downloads.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                    Text(status).font(.footnote)
                }
                Section("Network discovery") {
                    Label("Bonjour discovery: planned", systemImage: "bonjour")
                    Text("The completed app will advertise an _http._tcp service while active and display its local IP and port.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Rizal File Transfer")
            .fileImporter(
                isPresented: $showingFolderPicker,
                allowedContentTypes: [.folder],
                allowsMultipleSelection: false
            ) { result in
                switch result {
                case .success(let urls):
                    guard let url = urls.first else { return }
                    let granted = url.startAccessingSecurityScopedResource()
                    folderURL = url
                    status = granted
                        ? "Folder access granted for this app session."
                        : "Folder selected. Reauthorize access if file operations fail."
                case .failure(let error):
                    status = "Folder selection failed: \(error.localizedDescription)"
                }
            }
        }
    }
}
