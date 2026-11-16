/* terminal-direct 0.2.2 · 2026-10-23 · XCODE · GHOST CURSOR / CLICK / PRESS BUTTON (hostmouse, hostui)
 * terminal-direct 0.2.1 · 2026-10-21 · FIX: clear "ds-hostd not reachable" error; [[term:*]] markers need a user tap.
 * terminal-direct 0.2.0 · 2026-10-20 · TERMTYPE (adds TERMINALTYPE <cmd>)
 * Neo Terminal via ds-hostd (direct-mode, no pairing) + in-page ЯVM.
 * Intercepts outgoing chat phrases before the model; defaults Neo to 127.0.0.1:8320 on Mac.
 * Backup markers [[term:open]] / [[term:exec …]] / [[rvm:…]] still work on model replies.
 * Native hostapp / HostBridge pairing path is left alone.
 */
(function (root) {
  "use strict";
  var CFG = {
    neoHost: "127.0.0.1",
    neoPort: 8320,
    openApp: "Terminal",
    logPath: "app:bridge-inbox/terminal-direct.jsonl"
  };

  function log(kind, text, ok) {
    var row = { ts: new Date().toISOString(), kind: kind, ok: !!ok, text: String(text || "").slice(0, 2000) };
    try { root.dispatchEvent(new CustomEvent("ds-term-log", { detail: row })); } catch (e) {}
    try { console.log("[DS_TERM]", kind, row.text); } catch (e) {}
  }

  function neoBase() {
    var h = CFG.neoHost || "127.0.0.1";
    try {
      var saved = root.localStorage.getItem("ds.term.neo");
      if (saved) h = saved;
    } catch (e) {}
    return "http://" + h + ":" + CFG.neoPort;
  }

  function neoPost(path, body) {
    return fetch(neoBase() + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {})
    }).then(function (r) {
      return r.json().then(function (j) { return { http: r.status, j: j }; });
    });
  }

  function unreachable(what, e) {
    var m = String(e || "");
    if (/load failed|failed to fetch|networkerror|refused/i.test(m)) return what + ": ds-hostd not reachable at " + neoBase() + " - run FIX";
    return what + " error: " + m;
  }

  function setNeo(ip) {
    CFG.neoHost = String(ip || "127.0.0.1").trim() || "127.0.0.1";
    try { root.localStorage.setItem("ds.term.neo", CFG.neoHost); } catch (e) {}
    log("setNeo", CFG.neoHost, true);
    return "DS_TERM: neo=" + CFG.neoHost;
  }

  function openTerminal() {
    return neoPost("/hostapp", { sub: "open", app: CFG.openApp }).then(function (r) {
      var ok = r.http === 200 && r.j && r.j.ok;
      log("hostapp-open", JSON.stringify(r.j).slice(0, 400), ok);
      return ok ? "Opened Terminal on Neo (direct-mode, no pairing)." : "hostapp failed: " + JSON.stringify(r.j);
    }).catch(function (e) { log("hostapp-open", String(e), false); return unreachable("hostapp", e); });
  }

  function hostexec(cmd) {
    cmd = String(cmd || "").trim();
    if (!cmd) return Promise.resolve("hostexec: need a command");
    return neoPost("/hostexec", { cmd: cmd }).then(function (r) {
      var ok = r.http === 200 && r.j && r.j.ok;
      var out = (r.j && (r.j.output || r.j.stdout || "")) || "";
      var err = (r.j && (r.j.stderr || r.j.error || "")) || "";
      log("hostexec", cmd + " → " + (ok ? "ok" : err || "fail"), ok);
      return "hostexec $ " + cmd + "\n" + (out || err || JSON.stringify(r.j)).slice(0, 16000);
    }).catch(function (e) { log("hostexec", String(e), false); return unreachable("hostexec", e); });
  }

  function terminalType(cmd) {
    cmd = String(cmd || "").trim();
    if (!cmd) return Promise.resolve("TERMINALTYPE: need a command");
    return neoPost("/hosttype", { cmd: cmd }).then(function (r) {
      var ok = r.http === 200 && r.j && r.j.ok;
      log("hosttype", cmd + " → " + (ok ? "ok" : JSON.stringify(r.j)), ok);
      return ok ? "TERMINALTYPE: typed and ran in Neo Terminal $ " + cmd : "hosttype failed: " + JSON.stringify(r.j);
    }).catch(function (e) { log("hosttype", String(e), false); return unreachable("TERMINALTYPE", e); });
  }

  function rvmHost() { return document.getElementById("ds-rvm-host"); }
  function rvmL() {
    try {
      var h = rvmHost(), v = h && h.contentDocument && h.contentDocument.getElementById("vm");
      return v && v.contentWindow && v.contentWindow.__RVM_LINUX;
    } catch (e) { return null; }
  }
  function rvmBooted() { var L = rvmL(); return !!(L && L.ready && L.send); }
  function rvmBoot() {
    if (rvmHost()) return Promise.resolve(rvmBooted() ? "RVM: already booted." : "RVM: still booting.");
    var f = document.createElement("iframe");
    f.id = "ds-rvm-host"; f.title = "ЯVM (terminal-direct)"; f.src = "./skills/rvm-linux/rvm-host.html";
    f.style.cssText = "position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;border:0";
    document.body.appendChild(f);
    log("rvm-boot", "iframe added", true);
    return Promise.resolve("RVM: booting. Wait ~10 s.");
  }
  function rvmStop() {
    var w;
    try { w = rvmHost().contentDocument.getElementById("vm").contentWindow; } catch (e) { return Promise.resolve("RVM not booted."); }
    return new Promise(function (done) {
      var to = setTimeout(function () { fin("RVM: stop timed out."); }, 8000), ok = false;
      function fin(msg) { if (ok) return; ok = true; clearTimeout(to); var h = rvmHost(); if (h && h.parentNode) h.parentNode.removeChild(h); log("rvm-stop", msg, true); done(msg); }
      function on(e) { if (e.data && e.data.t === "rvm.linux.stopped") fin("RVM: stopped (" + e.data.clean + ")."); }
      root.addEventListener("message", on, true);
      try { w.postMessage({ t: "rvm.linux.cmd", cmd: "stop", timeoutMs: 5000 }, "*"); } catch (e) { fin("RVM: stop post failed."); }
    });
  }
  function rvm(cmd) {
    cmd = String(cmd || "").trim();
    if (!cmd) return Promise.resolve("RVM: need a command");
    if (!rvmBooted()) return Promise.resolve(rvmHost() ? "RVM not booted yet." : "RVM not booted. Call DS_TERM.rvmBoot() first.");
    var L = rvmL(), nonce = Math.random().toString(36).slice(2, 10);
    return new Promise(function (done) {
      var from = L.out.length, t0 = Date.now(), iv = setInterval(function () {
        var m = String(L.out.slice(from)).match(new RegExp("__RVM_DONE_" + nonce + "__ (\\d+)"));
        if (!m) {
          if (Date.now() - t0 > 120000) { clearInterval(iv); try { L.send("\x03"); } catch (x) {} done("RVM: timed out"); }
          return;
        }
        clearInterval(iv);
        var pre = L.out.slice(from, from + m.index);
        var body = pre.replace(/\x1b\[[0-9;?]*[A-Za-z]|\x1b\][^\x07]*\x07|\x1b[()][A-Z0-9]/g, "").replace(/\r/g, "").split("\n");
        body.shift();
        var out = body.join("\n").replace(/\s+$/, "");
        log("rvm", cmd, true);
        done("RVM $ " + cmd + "\n" + (out || "(no output)") + "\n[exit " + m[1] + "]");
      }, 100);
      L.send(cmd + '; echo __RVM_"DONE"_' + nonce + "__ $?\n");
    });
  }

  /** Match user chat text → action. Returns null or { kind, cmd? }. */
  /* GROKBOT 2026-10-29: OPEN GROKBOT (open or front, one copy) · TYPEGROKBOT <msg> (wrap :8319 types + Return, clipboard fallback) */
  function openGrokBot() {
    return neoPost("/hostapp", { sub: "open", app: "Grok Bot" }).then(function (r) {
      var ok = r.http === 200 && r.j && r.j.ok;
      if (ok) neoPost("/hostapp", { sub: "front", app: "Grok Bot" }).catch(function () {});
      log("hostapp-grokbot", JSON.stringify(r.j).slice(0, 400), ok);
      return ok ? "Grok Bot is open and in front on Neo (one copy)." : "OPEN GROKBOT failed: " + JSON.stringify(r.j);
    }).catch(function (e) { log("hostapp-grokbot", String(e), false); return unreachable("OPEN GROKBOT", e); });
  }
  function typeGrokBot(msg) {
    msg = String(msg || "").trim();
    if (!msg) return Promise.resolve("TYPEGROKBOT: need a message");
    return fetch("http://127.0.0.1:8319/engine/v1/chat/completions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "TYPEGROKBOT " + msg }] })
    }).then(function (r) { return r.json(); }).then(function (j) {
      var a = j && j.choices && j.choices[0] && j.choices[0].message ? j.choices[0].message.content : JSON.stringify(j);
      log("typegrokbot", a.slice(0, 300), !/blocked|failed/i.test(a));
      return a;
    }).catch(function (e) { log("typegrokbot", String(e), false); return "TYPEGROKBOT error: " + e; });
  }

  function openXcode() {
    return neoPost("/hostapp", { sub: "open", app: "Xcode" }).then(function (r) {
      var ok = r.http === 200 && r.j && r.j.ok;
      log("hostapp-xcode", JSON.stringify(r.j).slice(0, 400), ok);
      return ok ? "Opened Xcode on Neo (direct-mode, no pairing)." : "hostapp failed: " + JSON.stringify(r.j);
    }).catch(function (e) { log("hostapp-xcode", String(e), false); return unreachable("XCODE", e); });
  }

  function ghostMove(x, y) {
    return neoPost("/hostmouse", { sub: "move", args: [x, y] }).then(function (r) {
      var ok = r.http === 200 && r.j && r.j.ok; log("hostmouse-move", JSON.stringify(r.j).slice(0, 300), ok);
      return ok ? "Ghost cursor moved to " + x + "," + y + " on Neo." : "hostmouse failed: " + JSON.stringify(r.j);
    }).catch(function (e) { log("hostmouse", String(e), false); return unreachable("GHOST CURSOR", e); });
  }
  function ghostClick(btn) {
    btn = btn === "right" ? "right" : "left";
    return neoPost("/hostmouse", { sub: "click", args: [btn] }).then(function (r) {
      var ok = r.http === 200 && r.j && r.j.ok; log("hostmouse-click", JSON.stringify(r.j).slice(0, 300), ok);
      return ok ? "Ghost cursor " + btn + "-clicked on Neo." : "hostmouse failed: " + JSON.stringify(r.j);
    }).catch(function (e) { log("hostmouse", String(e), false); return unreachable("CLICK", e); });
  }
  function ghostClickAt(x, y, btn) { return ghostMove(x, y).then(function (a) { return ghostClick(btn).then(function (b) { return a + " " + b; }); }); }
  function pressButton(app, button) {
    return neoPost("/hostui", { app: app, button: button }).then(function (r) {
      var ok = r.http === 200 && r.j && r.j.ok; log("hostui", JSON.stringify(r.j).slice(0, 300), ok);
      return ok ? "Pressed \"" + button + "\" in " + app + " on Neo." : "hostui failed: " + JSON.stringify(r.j);
    }).catch(function (e) { log("hostui", String(e), false); return unreachable("PRESS BUTTON", e); });
  }

  function matchUser(text) {
    var t = String(text || "").trim();
    if (!t) return null;
    var low = t.toLowerCase();
    var tt = t.match(/^terminaltype\s+([\s\S]+)$/i);
    if (tt) return { kind: "type", cmd: tt[1].trim() };
    var g = t.match(/^ghost\s*cursor\s+(-?\d+)[\s,]+(-?\d+)\s*$/i);
    if (g) return { kind: "gmove", x: +g[1], y: +g[2] };
    g = t.match(/^ghost\s*click\s+(-?\d+)[\s,]+(-?\d+)(\s+right)?\s*$/i);
    if (g) return { kind: "gclickat", x: +g[1], y: +g[2], btn: g[3] ? "right" : "left" };
    g = t.match(/^(?:ghost\s*)?click(\s+(left|right))?\s*$/i);
    if (g) return { kind: "gclick", btn: (g[2] || "left").toLowerCase() };
    g = t.match(/^press(?:\s+button)?\s+(.+?)\s+in\s+(.+?)\s*$/i);
    if (g) return { kind: "press", button: g[1].replace(/^["']|["']$/g, ""), app: g[2] };
    if (/^terminal\s*$/i.test(t)) return { kind: "open" };
    if (/^(open\s+)?grok\s*bot\s*$/i.test(t)) return { kind: "grokbot" };
    var gt = t.match(/^\/?typegrokbot\s+([\s\S]+)$/i);
    if (gt) return { kind: "typegrokbot", msg: gt[1] };
    if (/^xcode\s*$/i.test(t) || /^(please\s+)?(open|launch|start|show)\s+(the\s+)?xcode\b/.test(low)) return { kind: "xcode" };
    if (/^(please\s+)?(open|launch|start|show)\s+(the\s+)?terminal\b/.test(low)) return { kind: "open" };
    if (/^terminal\s*:\s*(.+)$/i.test(t)) return { kind: "exec", cmd: t.replace(/^terminal\s*:\s*/i, "").trim() };
    var m = t.match(/^run\s+(.+?)\s+in\s+(the\s+)?terminal\s*$/i);
    if (m) return { kind: "exec", cmd: m[1].trim() };
    m = t.match(/^\/?rvm\s+boot\s*$/i);
    if (m) return { kind: "rvm-boot" };
    m = t.match(/^\/?rvm\s+stop\s*$/i);
    if (m) return { kind: "rvm-stop" };
    m = t.match(/^\/?rvm\s+(.+)$/i);
    if (m) return { kind: "rvm", cmd: m[1].trim() };
    return null;
  }

  function runMatch(m) {
    if (m.kind === "type") return terminalType(m.cmd);
    if (m.kind === "open") return openTerminal();
    if (m.kind === "xcode") return openXcode();
    if (m.kind === "grokbot") return openGrokBot();
    if (m.kind === "typegrokbot") return typeGrokBot(m.msg);
    if (m.kind === "gmove") return ghostMove(m.x, m.y);
    if (m.kind === "gclick") return ghostClick(m.btn);
    if (m.kind === "gclickat") return ghostClickAt(m.x, m.y, m.btn);
    if (m.kind === "press") return pressButton(m.app, m.button);
    if (m.kind === "exec") return hostexec(m.cmd);
    if (m.kind === "rvm-boot") return rvmBoot();
    if (m.kind === "rvm-stop") return rvmStop();
    if (m.kind === "rvm") return rvm(m.cmd);
    return Promise.resolve("DS_TERM: unknown match");
  }

  function showBot(text) {
    if (typeof root.pushTurn === "function") {
      try { root.pushTurn("bot", text); return; } catch (e) {}
    }
    var logEl = document.getElementById("log");
    if (!logEl) return;
    var d = document.createElement("div");
    d.className = "turn bot";
    d.textContent = "DRAGON SKULL: " + text;
    logEl.appendChild(d);
    try { d.scrollIntoView(); } catch (e) {}
  }
  function showUser(text) {
    if (typeof root.pushTurn === "function") {
      try { root.pushTurn("user", text); return; } catch (e) {}
    }
    var logEl = document.getElementById("log");
    if (!logEl) return;
    var d = document.createElement("div");
    d.className = "turn user";
    d.textContent = "You: " + text;
    logEl.appendChild(d);
  }

  /* FIX 2026-10-21: a model reply may only PROPOSE a host action; it runs after a real user tap on Run. */
  function confirmHost(label, run) {
    return new Promise(function (resolve) {
      var logEl = document.getElementById("log");
      if (!logEl) { resolve("DS_TERM: blocked (no confirm surface): " + label); return; }
      var d = document.createElement("div"); d.className = "turn bot ds-term-confirm";
      var p = document.createElement("div"); p.textContent = "The model wants to run on this Mac: " + label;
      var yes = document.createElement("button"); yes.textContent = "Run"; yes.type = "button";
      var no = document.createElement("button"); no.textContent = "Cancel"; no.type = "button"; no.style.marginLeft = "8px";
      function done(v) { yes.disabled = no.disabled = true; resolve(v); }
      yes.addEventListener("click", function (e) {
        if (!e.isTrusted) return;
        done(run());
      });
      no.addEventListener("click", function (e) { if (e.isTrusted) done("DS_TERM: cancelled " + label); });
      d.appendChild(p); d.appendChild(yes); d.appendChild(no); logEl.appendChild(d);
      try { d.scrollIntoView(); } catch (e) {}
    });
  }

  function absorbAssistant(text) {
    var t = String(text || ""), jobs = [], m;
    if (/\[\[term:open\]\]/i.test(t)) jobs.push(confirmHost("open Terminal", openTerminal));
    var reExec = /\[\[term:exec\s+([^\]]+)\]\]/gi;
    while ((m = reExec.exec(t))) (function (c) { jobs.push(confirmHost("hostexec " + c, function () { return hostexec(c); })); })(m[1]);
    var reType = /\[\[term:type\s+([^\]]+)\]\]/gi;
    while ((m = reType.exec(t))) (function (c) { jobs.push(confirmHost("terminaltype " + c, function () { return terminalType(c); })); })(m[1]);
    var reRvm = /\[\[rvm:\s*([^\]]+)\]\]/gi;
    while ((m = reRvm.exec(t))) {
      var a = m[1].trim();
      jobs.push(a.toLowerCase() === "boot" ? rvmBoot() : a.toLowerCase() === "stop" ? rvmStop() : rvm(a));
    }
    if (!jobs.length) return Promise.resolve(null);
    return Promise.all(jobs).then(function (rs) {
      var side = rs.join("\n\n");
      showBot(side);
      return side;
    });
  }

  var TERM_HINT = " [If you need Neo's Terminal, emit exactly [[term:open]] or [[term:exec COMMAND]]. For ЯVM emit [[rvm: COMMAND]]. Do not give Spotlight steps.]";

  function installHooks() {
    if (root.__DS_TERM_HOOKED2) return;
    root.__DS_TERM_HOOKED2 = true;

    // (b) Intercept composer submit in capture phase for terminal phrases (before model / scout-app).
    // Note: dg-cmd already owns /^rvm /; we still handle open/launch/run-in-terminal here.
    document.addEventListener("submit", function (e) {
      var f = e.target;
      if (!f || f.id !== "composer") return;
      var inp = document.getElementById("message");
      var t = inp ? String(inp.value || "") : "";
      var m = matchUser(t);
      if (!m) return;
      // Let dg-cmd keep owning plain "rvm …" (it already runs ЯVM). We only steal terminal* phrases here,
      // plus rvm if dg-cmd somehow missed (match still recorded for ROS_SEND wrap).
      if (m.kind === "rvm" || m.kind === "rvm-boot" || m.kind === "rvm-stop") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (inp) inp.value = "";
      showUser(t.trim());
      runMatch(m).then(function (res) { showBot(res); log("intercept", t.trim(), true); })
        .catch(function (err) { showBot("DS_TERM error: " + err); });
    }, true);

    // Also wrap ROS_SEND so programmatic sends are intercepted.
    function wrapSend() {
      if (typeof root.ROS_SEND !== "function" || root.ROS_SEND.__ds_term) return;
      var origSend = root.ROS_SEND;
      var wrapped = async function (q) {
        q = String(q || "").trim();
        var m = matchUser(q);
        if (m && m.kind !== "rvm" && m.kind !== "rvm-boot" && m.kind !== "rvm-stop") {
          // ROS_SEND already shows user turn — detect by checking if we're inside orig path.
          // Our composer interceptor handles UI; this path is for direct ROS_SEND calls.
          showUser(q);
          var res = await runMatch(m);
          showBot(res);
          return res;
        }
        return origSend(q);
      };
      wrapped.__ds_term = true;
      root.ROS_SEND = wrapped;
    }
    wrapSend();
    setTimeout(wrapSend, 500);

    // (c) Wrap llama chat: few-shot hint for terminal-ish questions + absorb markers.
    function wrapChat() {
      if (!root.RZL_LLAMA_DIRECT || typeof root.RZL_LLAMA_DIRECT.chat !== "function") return false;
      if (root.RZL_LLAMA_DIRECT.chat.__ds_term) return true;
      var orig = root.RZL_LLAMA_DIRECT.chat;
      var wrapped = async function (bot, q) {
        var qq = String(q || "");
        if (/(terminal|shell|hostexec|uname|neo)/i.test(qq) && qq.indexOf("[[term:") < 0) qq = qq + TERM_HINT;
        var ans = await orig(bot, qq);
        try { await absorbAssistant(ans); } catch (e) {}
        return ans;
      };
      wrapped.__ds_term = true;
      root.RZL_LLAMA_DIRECT.chat = wrapped;
      log("hook", "wrapped RZL_LLAMA_DIRECT.chat + composer intercept", true);
      return true;
    }
    if (!wrapChat()) {
      var n = 0, iv = setInterval(function () {
        if (wrapChat() || ++n > 40) clearInterval(iv);
      }, 250);
    }
  }

  var api = {
    version: "0.2.1",
    terminalType: terminalType,
    setNeo: setNeo,
    openTerminal: openTerminal,
    openXcode: openXcode, openGrokBot: openGrokBot, typeGrokBot: typeGrokBot, ghostMove: ghostMove, ghostClick: ghostClick, ghostClickAt: ghostClickAt, pressButton: pressButton,
    hostexec: hostexec,
    rvmBoot: rvmBoot,
    rvmStop: rvmStop,
    rvm: rvm,
    matchUser: matchUser,
    absorbAssistant: absorbAssistant,
    installHooks: installHooks
  };
  root.DS_TERM = api;
  try { installHooks(); } catch (e) { log("boot", "hook fail " + e, false); }
  log("boot", "terminal-direct 0.2.0 ready neo=" + CFG.neoHost, true);
})(typeof self !== "undefined" ? self : this);
