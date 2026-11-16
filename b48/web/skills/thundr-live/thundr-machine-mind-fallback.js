/* thundr-machine-mind-fallback.js
   STAGED ONLY — do not ship, sign, or install without a separate GO (t38u, 2026-11-15).
   If the BATIBABOX tap / MACHINE MIND inbox route is unhealthy, capture visible
   ThundR / chat transcript text, redact secrets, and insert newest-first into
   the local ЯSCRIBE MACHINE MIND note. A 15-minute timer advertises new revs
   as a read-only RKAST/RPIPE payload for other devices and Neo to pull.
   This file is a new IIFE and does not replace thundr-ios.js. */
(function () {
  if (window.THUNDR_MM_FALLBACK) return;
  var INTERVAL_MS = (parseInt((window.THUNDR_MM_BROADCAST_SECS || "900"), 10) || 900) * 1000;
  var NOTE = "MACHINE-MIND";
  function nowStamp() {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZoneName: "short"
      }).format(new Date()).replace(/,/g, "");
    } catch (e) { return new Date().toISOString(); }
  }
  function redact(s) {
    s = String(s || "");
    s = s.replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, "[redacted-key]");
    s = s.replace(/\b(Bearer|Authorization:\s*\S+|sand-secrets|mnemonic)[^\n]*/gi, "[redacted]");
    s = s.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[redacted-addr]");
    s = s.replace(/\b[A-Za-z0-9.-]+:\d{2,5}\b/g, "[redacted-endpoint]");
    return s;
  }
  function visibleText() {
    var parts = [];
    try {
      var root = document.querySelector("#th-chat, #thundr-chat, [data-thundr-chat], .thundr-transcript, #transcript");
      if (root) parts.push(root.innerText || root.textContent || "");
      var ta = document.querySelector("#th-chat input, #th-chat textarea, [data-thundr-input]");
      if (ta && ta.value) parts.push("draft: " + ta.value);
    } catch (e) {}
    return redact(parts.join("\n").trim());
  }
  function routeHealthy() {
    /* Hosts that expose a status hook can set window.THUNDR_MM_ROUTE_OK = false to force fallback.
       Default: we still snapshot on the interval; the native helper decides whether to ingest. */
    if (typeof window.THUNDR_MM_ROUTE_OK === "boolean") return window.THUNDR_MM_ROUTE_OK;
    return false; /* web side cannot see Neo LaunchAgents; native helper must confirm */
  }
  function handoff(payload) {
    var msg = { type: "thundr-mm-fallback", note: NOTE, at: nowStamp(), text: payload };
    try {
      if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.thundrMmFallback) {
        window.webkit.messageHandlers.thundrMmFallback.postMessage(msg);
        return;
      }
    } catch (e) {}
    try { window.postMessage(msg, "*"); } catch (e2) {}
  }
  function tick() {
    if (routeHealthy()) return;
    var text = visibleText();
    if (!text) return;
    handoff(text);
  }
  setInterval(tick, INTERVAL_MS);
  window.THUNDR_MM_FALLBACK = { version: "0.1-staged", intervalMs: INTERVAL_MS, tick: tick, redact: redact };
})();
