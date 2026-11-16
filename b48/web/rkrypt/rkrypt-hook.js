/* RKRYPT RDOS hook 20261025 — built-in wallet/profile commands for scout-style shells (#composer/#message). Lines starting "rkrypt" or "rgen" go to RKRYPT.rdos; everything else falls through untouched. No keys, no network. */
(function () {
  if (window.RKRYPT_HOOK) return; window.RKRYPT_HOOK = "20261025";
  var base = (document.currentScript && document.currentScript.src || "").replace(/rkrypt-hook\.js.*$/, "") || "rkrypt/";
  function out(role, t) { var log = document.getElementById("log"); if (!log) { console.log("[RKRYPT]", t); return; } var d = document.createElement("div"); d.className = "turn " + role + " rkrypt"; d.textContent = t; log.appendChild(d); if (d.scrollIntoView) d.scrollIntoView(); }
  function load(cb) { if (window.RKRYPT) return cb(); var s = document.createElement("script"); s.src = base + "rkrypt.rzl.js"; s.onload = cb; s.onerror = function () { out("bot", "RKRYPT · rkrypt.js not found"); }; document.head.appendChild(s); }
  window.addEventListener("submit", function (e) {
    var f = e.target; if (!f || f.id !== "composer") return; var m = document.getElementById("message"), t = m ? String(m.value || "").trim() : "";
    if (!/^\/?(rkrypt|rgen)\b/i.test(t)) return; // RKRYPT.rdos hook 20261025
    e.preventDefault(); e.stopImmediatePropagation(); m.value = "";
    out("user", "You: " + t.replace(/^(\/?rkrypt\s+(unlock|password|setpass\w*)\s+).*/i, "$1****"));
    load(function () { window.RKRYPT.rdos(t, function (h) { out("bot", new DOMParser().parseFromString(String(h), "text/html").body.textContent); }); });
  }, true);
})();
