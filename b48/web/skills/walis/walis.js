/* walis 0.1.0 · 2026-10-22 · DRAGON SKULL skill: the WALIS broom (REQ-7) from the chat box.
 *   walis            -> help + status
 *   walis scan       -> READ-ONLY dry-run scan on the Neo (ds-hostd /hostexec, loopback 127.0.0.1:8320)
 *   walis report     -> READ-ONLY: latest scan report
 *   walis apply      -> issues a one-time confirm code; nothing runs yet
 *   walis apply <CODE> -> only if CODE matches (typed by the user, 5-min TTL), and only after a real tap on Run:
 *                       runs walis-apply.sh --confirmed (trash-only via Finder, verified in ~/.Trash, never rm, never empties Trash)
 * Host route needs the walis commands on ds-hostd's allow-list. That is STAGED, NOT ENABLED (host commands stay off until
 * Rizal + ЯBOWZR give the go). Until then scan/report/apply answer "host commands off" and nothing runs.
 * ds-hostd stays loopback-only, open_lan false. Model replies can never trigger walis (user-typed only).
 */
(function (root) {
  "use strict";
  var BASE = "http://127.0.0.1:8320";
  var T = "/Users/rizal/ЯLAB/TOOLS/";
  var CMD = { scan: T + "walis-scan.sh", report: T + "walis-scan.sh --report", apply: T + "walis-apply.sh --confirmed" };
  var pending = null; // { code, exp }

  function log(kind, text, ok) {
    try { console.log("[WALIS]", kind, String(text).slice(0, 400)); } catch (e) {}
    try { root.dispatchEvent(new CustomEvent("ds-walis-log", { detail: { ts: new Date().toISOString(), kind: kind, ok: !!ok, text: String(text).slice(0, 2000) } })); } catch (e) {}
  }
  function exec(cmd) {
    return fetch(BASE + "/hostexec", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cmd: cmd }) })
      .then(function (r) { return r.json().then(function (j) { return { http: r.status, j: j }; }); })
      .then(function (r) {
        var ok = r.http === 200 && r.j && r.j.ok;
        if (r.http === 403) return "WALIS: host commands are off for walis (not on ds-hostd's allow-list). Needs Rizal's and ЯBOWZR's go. Nothing ran.";
        var out = (r.j && (r.j.output || r.j.stdout || r.j.stderr || r.j.error)) || JSON.stringify(r.j);
        log("hostexec", cmd + " -> " + (ok ? "ok" : "fail"), ok);
        return out.slice(0, 16000);
      })
      .catch(function (e) { log("hostexec", String(e), false); return "WALIS: ds-hostd not reachable at " + BASE + " (loopback only). Nothing ran."; });
  }
  function code() {
    var a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", s = "", b = new Uint8Array(6);
    (root.crypto || {}).getRandomValues ? root.crypto.getRandomValues(b) : b.forEach(function (_, i) { b[i] = Math.random() * 256; });
    for (var i = 0; i < 6; i++) s += a[b[i] % a.length];
    return s;
  }
  function tapRun(label, run) {
    return new Promise(function (resolve) {
      var logEl = document.getElementById("log");
      if (!logEl) { resolve("WALIS: blocked (no confirm surface)"); return; }
      var d = document.createElement("div"); d.className = "turn bot ds-walis-confirm";
      var p = document.createElement("div"); p.textContent = "WALIS will move old builds to the Trash (Finder, recoverable): " + label;
      var y = document.createElement("button"); y.type = "button"; y.textContent = "Run";
      var n = document.createElement("button"); n.type = "button"; n.textContent = "Cancel"; n.style.marginLeft = "8px";
      function done(v) { y.disabled = n.disabled = true; resolve(v); }
      y.addEventListener("click", function (e) { if (e.isTrusted) done(run()); });
      n.addEventListener("click", function (e) { if (e.isTrusted) done("WALIS: cancelled."); });
      d.appendChild(p); d.appendChild(y); d.appendChild(n); logEl.appendChild(d);
      try { d.scrollIntoView(); } catch (e) {}
    });
  }
  var HELP = "WALIS (REQ-7 broom, trash-only):\n  walis scan    read-only dry run\n  walis report  latest scan report\n  walis apply   get a confirm code, then type: walis apply <CODE>\nNever rm, never empties the Trash; protects installed apps, keys, eggs, manuals, backups, memory.";
  function match(t) {
    var m = String(t || "").trim().match(/^\/?walis(?:\s+(scan|report|apply|help|status))?(?:\s+([A-Z0-9]{6}))?\s*$/i);
    if (!m) return null;
    return { sub: (m[1] || "help").toLowerCase(), code: m[2] ? m[2].toUpperCase() : null };
  }
  function run(m) {
    if (m.sub === "help" || m.sub === "status") return Promise.resolve(HELP);
    if (m.sub === "scan") return exec(CMD.scan);
    if (m.sub === "report") return exec(CMD.report);
    if (m.sub === "apply" && !m.code) {
      pending = { code: code(), exp: Date.now() + 5 * 60 * 1000 };
      log("apply-code", "issued", true);
      return Promise.resolve("WALIS apply: run 'walis scan' first to see what moves. To confirm, type exactly:\n  walis apply " + pending.code + "\n(valid 5 minutes, one use)");
    }
    if (m.sub === "apply") {
      var p = pending; pending = null;
      if (!p || Date.now() > p.exp || p.code !== m.code) { log("apply-code", "rejected", false); return Promise.resolve("WALIS apply: code wrong or expired. Nothing ran. Type 'walis apply' for a new code."); }
      return tapRun("app_dedupe --apply + walis-old-rbowzr --apply", function () { return exec(CMD.apply); });
    }
    return Promise.resolve(HELP);
  }
  function show(who, text) {
    if (typeof root.pushTurn === "function") { try { root.pushTurn(who, text); return; } catch (e) {} }
    var el = document.getElementById("log"); if (!el) return;
    var d = document.createElement("div"); d.className = "turn " + who; d.textContent = (who === "bot" ? "DRAGON SKULL: " : "You: ") + text; el.appendChild(d);
  }
  function install() {
    if (root.__DS_WALIS) return; root.__DS_WALIS = true;
    document.addEventListener("submit", function (e) {
      var f = e.target; if (!f || f.id !== "composer") return;
      var inp = document.getElementById("message"); var t = inp ? String(inp.value || "") : "";
      var m = match(t); if (!m) return;
      e.preventDefault(); e.stopImmediatePropagation(); if (inp) inp.value = "";
      show("user", t.trim());
      run(m).then(function (r) { show("bot", r); }).catch(function (err) { show("bot", "WALIS error: " + err); });
    }, true);
    log("boot", "walis 0.1.0 ready (host route staged, not enabled)", true);
  }
  root.DS_WALIS = { version: "0.1.0", match: match, run: run, install: install };
  try { install(); } catch (e) { log("boot", "hook fail " + e, false); }
})(typeof self !== "undefined" ? self : this);
