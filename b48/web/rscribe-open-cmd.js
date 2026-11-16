/* rscribe-open-cmd.js · 2026-11-15 · DRAFT add-only, unsigned, not shipped.
 * Intercepts typo / alias ЯSCRIBE open-commands in RDRGN's main chat and the
 * ThundR · rOS panel BEFORE any model call, and opens the in-app ЯSCRIBE panel.
 *
 * Why a new file: dg-cmd.js is injected from the SIGNED app bundle
 * (Bundle.main .../web/dg-cmd.js, document-start), not from the web overlay, so a
 * web egg cannot replace that router. This script loads later from scout.html
 * (egg / ios-web feed) and only claims commands dg-cmd.js does not already stop:
 *   rcribe, open rscribe, open scribe, open rcribe, and (in ThundR rOS) also
 *   rscribe / scribe / ЯSCRIBE, which the rOS local parser currently ignores.
 *
 * Bare `rscribe` / `scribe` / `ЯSCRIBE` in the MAIN chat are already claimed by
 * rembed (if the 2026-11-13 rembed door is in the installed build) or by the
 * older RVM rscribeHandle. This file does not change that path.
 *
 * Opens via WK "rembed" {app:"rscribe"} (normalized id the native parse already
 * accepts). Falls back to rdragon://embed/rscribe. Does not use ://eggs links.
 * Does not auto-select the pinned RAGENT POLYTRANSCRIPT note: RScribeView has
 * no rembed note-id hook yet (needs a signed native change; see DELIVERY.md).
 */
(function (win, doc) {
  "use strict";
  if (win.__RSCRIBE_OPEN_CMD__) return;
  win.__RSCRIBE_OPEN_CMD__ = "2026-11-15";

  function norm(t) {
    t = String(t || "").trim();
    if (!t || t.length > 48) return "";
    t = t.toUpperCase().replace(/^(R:\\>|R:>|\/|>)/, "").replace(/Я/g, "R").replace(/[\s\-_.]/g, "");
    t = t.replace(/^OPEN/, "");
    return t;
  }

  function isOpenCmd(t) {
    var n = norm(t);
    return n === "RSCRIBE" || n === "SCRIBE" || n === "RCRIBE" || n === "YASCRIBE";
  }

  function openRscribe() {
    var h = win.webkit && win.webkit.messageHandlers && win.webkit.messageHandlers.rembed;
    if (h && h.postMessage) {
      try { h.postMessage({ app: "rscribe" }); return "rembed"; } catch (e) {}
    }
    try {
      if (win.webkit) { win.location.href = "rdragon://embed/rscribe"; return "url"; }
    } catch (e2) {}
    return null;
  }

  function note(role, text) {
    var log = doc.getElementById("log"); if (!log) return;
    var d = doc.createElement("div");
    d.className = "turn " + role + " dg-cmd";
    d.textContent = text;
    log.appendChild(d);
    if (d.scrollIntoView) d.scrollIntoView();
  }

  function interceptComposer(e) {
    var f = e.target; if (!f || f.id !== "composer") return;
    var m = doc.getElementById("message"), t = m ? String(m.value || "") : "";
    if (!isOpenCmd(t)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (m) m.value = "";
    var via = openRscribe();
    note("user", "You: " + String(t).trim());
    note("bot", via ? "ЯSCRIBE: opening inside this app" : "ЯSCRIBE: could not open (no rembed door and no rdragon:// handler on this build).");
  }

  // Window capture would run BEFORE dg-cmd.js (also window/capture, registered at
  // document-start) only if we registered first — we don't. Document capture runs
  // after window capture. For typo words dg-cmd does not stop, we still see the event.
  doc.addEventListener("submit", interceptComposer, true);

  function wrapThundr() {
    var T = win.THUNDR_IOS;
    if (!T || typeof T.chat !== "function" || T.__rscribeOpenWrapped) return false;
    var prev = T.chat;
    T.chat = function (text) {
      if (isOpenCmd(text)) {
        var via = openRscribe();
        return { ok: true, via: "rscribe", reply: via ? "Opening ЯSCRIBE in this app…" : "ЯSCRIBE: could not open from this panel." };
      }
      return prev.apply(this, arguments);
    };
    T.__rscribeOpenWrapped = true;
    return true;
  }
  wrapThundr();
  var n = 0, iv = setInterval(function () { if (wrapThundr() || ++n > 40) clearInterval(iv); }, 250);
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", wrapThundr);
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);
