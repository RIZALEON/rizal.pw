/* rdrive.js 1.0 (t131u) — window.RDrive: MICRO DISK / cryptodrive read+write for the web layer (native: RDriveAccess.swift).
 * RDrive.status() -> {connected, state, name}   state "drive not connected" when the drive is unplugged
 * RDrive.pick()   -> folder picker (choose the drive root once; bookmark is saved)
 * RDrive.list(path) · RDrive.read(path, {base64}) · RDrive.write(path, text|base64, {base64}) · RDrive.forget()
 * Paths are relative to the picked root. Secrets (ЯCASKET, keys, wallets, master.json, .run) are refused natively. */
(function () {
  if (window.RDrive) return;
  var H = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.rdrive;
  function call(body) { if (!H) return Promise.reject(new Error("drive bridge unavailable")); return H.postMessage(body); }
  window.RDrive = {
    version: "1.0",
    available: !!H,
    status: function () { return H ? call({ op: "status" }) : Promise.resolve({ connected: false, state: "drive bridge unavailable" }); },
    pick: function () { return call({ op: "pick" }); },
    forget: function () { return call({ op: "forget" }); },
    list: function (path) { return call({ op: "list", path: String(path || "") }); },
    read: function (path, o) { return call({ op: "read", path: String(path || ""), encoding: o && o.base64 ? "base64" : "utf8" }); },
    write: function (path, data, o) { return call({ op: "write", path: String(path || ""), data: String(data == null ? "" : data), encoding: o && o.base64 ? "base64" : "utf8" }); }
  };
  try { document.dispatchEvent(new CustomEvent("rdrive:ready")); } catch (e) {}
})();
