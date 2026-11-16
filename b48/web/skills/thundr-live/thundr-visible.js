/* thundr-visible.js · THUNDR Live 0.4 · iOS/iPadOS visibility piece (superdragon 2.1.9.4, 2026-10-16 MT). Egg-only, offline, deletes nothing.
 * Root cause fixed: on phones the default screen is the chat list (body.listing hides <main>), and the 20px idle THUNDR under #composer
 * had empty text and no safe-area padding, so he was invisible. This piece: 32px on touch screens, an always-on "THUNDR ⚡ ready" idle label,
 * home-indicator padding, and a second THUNDR in the chat-list header (render only, mirrors the main one's state). */
(function () {
  "use strict";
  if (window.RL_THUNDR_VISIBLE) return;
  // 2.1.9.8 re-cut: never runs on macOS (iPadOS also says "Macintosh", so touch points decide)
  if (/Macintosh/.test(navigator.userAgent) && !(navigator.maxTouchPoints > 1)) { window.RL_THUNDR_VISIBLE = { version: "0.4-ios.3", off: "macos" }; return; }
  const touch = matchMedia("(max-width: 700px), (hover: none) and (pointer: coarse)").matches;
  const HERE = (document.currentScript && document.currentScript.src) ? document.currentScript.src.replace(/[^/]*$/, "") : "./skills/thundr-live/";
  let mini = null;
  function css() {
    if (document.getElementById("thundr-visible-css")) return;
    const s = document.createElement("style"); s.id = "thundr-visible-css";
    s.textContent = "";   // 2.1.9.8 re-cut: no bar padding, no idle label, no header copy
    document.head.appendChild(s);
  }
  function grow() { return true; }   // 2.1.9.8 re-cut: the pin is the one THUNDR; no resize of a 2nd figure
  function miniMount() { return true; }   // 2.1.9.8 re-cut: no 2nd THUNDR in #chatlist .cl-top

  // ЯSCRIBE on phones (2.1.9.5): rscribe.js puts its button in #bot-hero, which the phone thread view hides (body.thread #bot-hero
  // {display:none}). Mirror it into the thread header (#thread-head, next to ⚡); tapping it presses the real ЯSCRIBE button.
  function scribeMount() {
    if (document.getElementById("rscribe-thread")) return true;
    const head = document.getElementById("thread-head"), real = document.getElementById("rscribe-open");
    if (!head || !real) return false;
    const b = document.createElement("button"); b.id = "rscribe-thread"; b.type = "button"; b.textContent = "ЯSCRIBE";
    b.setAttribute("aria-label", "Open ЯSCRIBE (notes)");
    b.style.cssText = "font:600 12px system-ui,sans-serif;appearance:none;-webkit-appearance:none;background:transparent;border:none;box-shadow:none;padding:0 4px;color:#e8e8ee;margin-left:4px;text-shadow:0 1px 2px #000";
    b.addEventListener("click", () => { const r = document.getElementById("rscribe-open"); if (r) r.click(); });
    const bolt = head.querySelector(".th-bolt"); if (bolt) bolt.insertAdjacentElement("beforebegin", b); else head.appendChild(b);
    return true;
  }
  document.addEventListener("thundr-adapter", (ev) => { try { mini && mini.push && mini.push(ev.detail); } catch (x) {} });
  function tick() { css(); try { window.RL_THUNDR && window.RL_THUNDR.mount(); } catch (x) {} const a = grow(), m = true /* PROPOSED: no 2nd THUNDR in #chatlist .cl-top */, r = scribeMount(); return a && m && r; }
  function boot() { let n = 0; const iv = setInterval(() => { if (tick() || ++n > 240) clearInterval(iv); }, 250); }
  window.RL_THUNDR_VISIBLE = { version: "0.4-ios.3", touch, status: () => ({ bar: !!document.getElementById("thundr-bar"), mini: !!(mini && mini.isConnected), scribe: !!document.getElementById("rscribe-thread") }) };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
