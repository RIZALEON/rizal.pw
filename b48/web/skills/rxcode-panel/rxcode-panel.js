/* rxcode-panel 2026-11-07b / 20261115 size-cap: open RXCODE inside this app window (tfr-panel pattern). */
(function () {
  "use strict";
  if (window.DS_RXCODE_PANEL) return;
  var RX = /^\s*\/?rxcode(?:\s+(rthundr|rdragon|thundr))?[!.\s]*$/i;
  var ORIGIN = "http://127.0.0.1:8779/";
  var sc = document.currentScript;
  var AUTO = !!(window.RXCODE_AUTOOPEN) || !!(sc && sc.getAttribute("data-open") === "1");
  function hostDefault() {
    var t = ((document.title || "") + " " + location.href + " " + location.pathname).toLowerCase();
    if (/thundr|rthundr|float\.html/.test(t)) return "rthundr";
    return "rdragon";
  }
  function panelURL(project) {
    project = (project || hostDefault() || "rdragon").toLowerCase();
    if (project === "thundr") project = "rthundr";
    if (location.protocol === "file:") {
      try { return new URL("rxcode/index.html?from=" + encodeURIComponent(project), location.href).href; }
      catch (e) { return "rxcode/index.html?from=" + encodeURIComponent(project); }
    }
    return ORIGIN + "?from=" + encodeURIComponent(project);
  }
  function expandChat() {
    try { window.webkit.messageHandlers.float.postMessage({ op: "chat", open: true }); } catch (e) {}
  }
  function show(msg) {
    var log = document.getElementById("log") || document.querySelector("#th-chat .log");
    if (!log) return;
    var d = document.createElement("div");
    d.className = "turn bot dg-cmd";
    d.textContent = msg;
    log.appendChild(d);
    if (d.scrollIntoView) d.scrollIntoView();
  }
  function openPanel(project) {
    expandChat();
    project = (project || hostDefault() || "rdragon").toLowerCase();
    if (project === "thundr") project = "rthundr";
    var u = panelURL(project);
    var p = document.getElementById("ds-rxcode-panel");
    if (!p) {
      p = document.createElement("div");
      p.id = "ds-rxcode-panel";
      /* build 48: cap the panel so it does not cover the whole chat (was inset:4px fullscreen). */
      p.style.cssText = "position:fixed;right:8px;bottom:72px;top:auto;left:auto;width:min(440px,calc(100vw - 16px));height:min(70vh,calc(100vh - 96px));max-width:440px;max-height:70vh;z-index:2147483646;background:#101014;border:2px solid #7aa2ff;border-radius:10px;display:flex;flex-direction:column;overflow:hidden";
      var b = document.createElement("div");
      b.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:2px 8px;font:12px system-ui;color:#cfe;background:#1a1a22";
      b.textContent = "RXCODE · " + project.toUpperCase();
      var x = document.createElement("button");
      x.textContent = "✕";
      x.title = "Close RXCODE panel";
      x.style.cssText = "border:0;background:none;color:#fcc;cursor:pointer";
      x.onclick = function () { p.remove(); };
      b.appendChild(x);
      var fr = document.createElement("iframe");
      fr.style.cssText = "flex:1;border:0;width:100%;background:#101014";
      fr.allow = "clipboard-read; clipboard-write";
      p.appendChild(b);
      p.appendChild(fr);
      document.body.appendChild(p);
    } else {
      var title = p.querySelector("div");
      if (title) title.firstChild && (title.firstChild.textContent = "RXCODE · " + project.toUpperCase());
    }
    p.querySelector("iframe").src = u;
    return u;
  }
  function handle(text, ev) {
    var m = RX.exec(String(text || ""));
    if (!m) return false;
    if (ev) { ev.preventDefault(); ev.stopImmediatePropagation(); }
    var project = (m[1] || hostDefault()).toLowerCase();
    if (project === "thundr") project = "rthundr";
    show("You: " + String(text).trim());
    var u = openPanel(project);
    show("RXCODE: opening the " + project.toUpperCase() + " Xcode interface in this window");
    return true;
  }
  function clearIfMatch(el) {
    if (el && RX.test(String(el.value || ""))) el.value = "";
  }
  window.DS_RXCODE_PANEL = { open: openPanel };
  window.addEventListener("submit", function (e) {
    var el = document.getElementById("message") || document.querySelector("#th-chat input, #composer textarea, #composer input");
    if (handle(el ? el.value : "", e)) clearIfMatch(el);
  }, true);
  window.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" || e.shiftKey) return;
    var el = e.target;
    if (!el || (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA")) return;
    if (handle(el.value, e)) clearIfMatch(el);
  }, true);
  function addButtons() {
    var hd = document.querySelector("#th-chat .hd");
    if (hd && !hd.querySelector("[data-rxcode]")) {
      var b = document.createElement("button");
      b.setAttribute("data-rxcode", "1");
      b.textContent = "RXCODE";
      b.title = "Open RXCODE for RTHUNDR";
      b.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); openPanel("rthundr"); });
      hd.appendChild(b);
    }
    var comp = document.getElementById("composer");
    if (comp && !document.getElementById("rxcode-qbtn")) {
      var q = document.createElement("button");
      q.id = "rxcode-qbtn";
      q.type = "button";
      q.textContent = "RXCODE";
      q.title = "Open RXCODE for RDRAGON";
      q.style.cssText = "margin-left:6px";
      q.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); openPanel("rdragon"); });
      comp.appendChild(q);
    }
  }
  addButtons();
  setInterval(addButtons, 2000);
  function pollWanted() {
    if (location.protocol === "file:") return;
    var host = hostDefault();
    fetch(ORIGIN + "api/panel/wanted?from=" + encodeURIComponent(host))
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j && j.open) openPanel(j.project || host);
      })
      .catch(function () {});
  }
  if (location.protocol !== "file:") setInterval(pollWanted, 2000);
  if (AUTO) {
    expandChat();
    setTimeout(function () { openPanel(hostDefault()); }, 400);
  } else {
    pollWanted();
  }
})();
