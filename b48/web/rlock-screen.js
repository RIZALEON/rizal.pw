/* rlock-screen.js · add-only 20261110
   Face ID / device-passcode gate for the RDRAGON UI. Never stores or prints a secret.
   Talks to webkit.messageHandlers.rlock (native LAContext, policy deviceOwnerAuthentication).
   If that handler is missing (older 1.0.4.25 native shell), this is a no-op and the page stays usable.
   A full lock also lives in App.swift and needs an Xcode install (team 7D3P5F4V9M) by Rizal. */
(function () {
  "use strict";
  var mh = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.rlock;
  if (!mh || typeof mh.postMessage !== "function") {
    window.RDRAGON_LOCK = { native: false, unlocked: true };
    return;
  }
  window.RDRAGON_LOCK = { native: true, unlocked: false };
  var cover = document.createElement("div");
  cover.id = "rdragon-lock";
  cover.setAttribute("role", "dialog");
  cover.setAttribute("aria-label", "Unlock DRAGON SKULL");
  cover.style.cssText = "position:fixed;inset:0;z-index:2147483646;background:#0b0710;color:#f4e9d4;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px;text-align:center";
  cover.innerHTML = '<div style="font:700 20px system-ui">DRAGON SKULL</div><div style="opacity:.85">Unlock with Face ID or your device passcode.</div><button type="button" id="rdragon-lock-btn" style="min-height:44px;padding:10px 18px;border-radius:12px;border:1px solid #a8864f;background:#392340;color:#efcf88">Unlock</button><div id="rdragon-lock-st" style="min-height:1.2em;font-size:13px;opacity:.8"></div>';
  function show() {
    if (!cover.isConnected) document.documentElement.append(cover);
    cover.style.display = "flex";
    window.RDRAGON_LOCK.unlocked = false;
  }
  function hide() {
    cover.style.display = "none";
    window.RDRAGON_LOCK.unlocked = true;
  }
  function ask() {
    var st = document.getElementById("rdragon-lock-st");
    if (st) st.textContent = "Waiting for Face ID…";
    try { mh.postMessage({ op: "unlock", reason: "Unlock DRAGON SKULL" }); }
    catch (e) { if (st) st.textContent = "Unlock failed."; }
  }
  window.RDRAGON_LOCK_RESULT = function (r) {
    if (r && r.ok) hide();
    else {
      show();
      var st = document.getElementById("rdragon-lock-st");
      if (st) st.textContent = (r && r.err) || "Try again.";
    }
  };
  function start() {
    show();
    var btn = cover.querySelector("#rdragon-lock-btn");
    if (btn) btn.onclick = ask;
    ask();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
