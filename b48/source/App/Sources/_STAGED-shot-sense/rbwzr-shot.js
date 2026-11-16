// shot-sense 2.1.9-s1 · ЯBOWZR/RBWZR egg-side SHOT/SSHOT/SEE · ЯID-0003-P4M6 · ЯМАХ
// Loaded by the ЯBOWZR web layer (macOS seat). Calls DRAGOSKUL :8319 (loopback, CORS ok from :8319 origin;
// other origins fall back to the ЯBOT inbox bridge). Self-view capture: uses the native bridge if the
// WKWebView exposes window.webkit.messageHandlers.rbwzrSnapshot (staged native step), else Neo full screen.
(function (g) {
  const DS = "http://127.0.0.1:8319/api/ds/cmd";
  async function ds(text) {
    const r = await fetch(DS, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
    return (await r.json()).text;
  }
  function selfView() {
    const h = g.webkit && g.webkit.messageHandlers && g.webkit.messageHandlers.rbwzrSnapshot;
    if (!h) return null;
    return new Promise(res => { g.__rbwzrSnapDone = res; h.postMessage({ want: "jpg" }); });
  }
  g.RBWZR_SHOT = {
    SHOT: () => ds("SHOT"),
    SSHOT: () => ds("SSHOT"),
    SEE: (path) => ds(path ? "SEE " + path : "SEE"),
    "SSHOT SEE": () => ds("SSHOT SEE"),
    SELF: async () => (await selfView()) || ds("SSHOT"),
    route(t) { const k = String(t || "").trim().toUpperCase(); const m = k.match(/^SEE\s+(.+)$/);
      if (m) return this.SEE(String(t).trim().slice(4)); return this[k] ? this[k]() : null; }
  };
})(typeof window !== "undefined" ? window : globalThis);
