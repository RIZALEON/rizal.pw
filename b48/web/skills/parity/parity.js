/* parity 0.1.0 · 2026-10-22 · MEKANICA · STAGED, UNSIGNED. Add-only command parity skill for ЯBOWZR / ЯBOT / DRAGON SKULL.
 * Registry comes from parity-registry.js (window.RZL_PARITY_REG). Every listed command resolves to exactly one of:
 *   run     → a real in-page handler (read-only, or delegated to an existing skill such as DS_TERM / DS_PARTS)
 *   rebuild → honest reply "not in this build, needs a Rizal-approved rebuild" (never pretends to run)
 *   blocked → honest reply naming what is missing
 * Intercepts #composer submit in capture phase only for registry matches; never calls the model, never goes online
 * (except /version on DRAGON SKULL, which reads the app's own local /api/version). No keys, no signing, no installs. */
(function (root, factory) { var m = factory(root); if (typeof module === "object" && module.exports) module.exports = m; else root.RZL_PARITY = m; })(typeof self !== "undefined" ? self : this, function (root) {
  "use strict";
  var VERSION = "parity 0.1.0";
  function reg() { return (root && root.RZL_PARITY_REG) || { app: "?", commands: [] }; }
  function norm(t) { return String(t || "").trim().replace(/\s+/g, " "); }
  function find(text) {
    var t = norm(text), low = t.toLowerCase(), cs = reg().commands, best = null, bl = -1;
    for (var i = 0; i < cs.length; i++) {
      var c = cs[i], ms = c.match || [];
      for (var j = 0; j < ms.length; j++) {
        var m = String(ms[j]).toLowerCase(), slashOnly = !!c.slashOnly;
        var cand = slashOnly ? ["/" + m] : [m, "/" + m, ":" + m];
        for (var k = 0; k < cand.length; k++) {
          var p = cand[k];
          if ((low === p || low.indexOf(p + " ") === 0) && p.length > bl) { best = c; bl = p.length; }
        }
      }
    }
    return best;
  }
  var HANDLERS = {
    "parity.commands": function (c, t) {
      var r = reg(), by = { run: [], rebuild: [], blocked: [], native: [] };
      r.commands.forEach(function (x) { (by[x.status] || (by[x.status] = [])).push(x.id); });
      return Promise.resolve("COMMANDS · " + r.app + " · " + VERSION + "\nruns here (egg): " + by.run.join(", ") +
        "\nlisted, needs rebuild: " + by.rebuild.join(", ") + "\nlisted, blocked: " + by.blocked.join(", ") +
        (r.nativeNote ? "\nalready native in this build: " + r.nativeNote : ""));
    },
    "parity.help": function (c, t) { return HANDLERS["parity.commands"](c, t); },
    "parity.version": function () {
      if (typeof fetch !== "function") return Promise.resolve("version: no local /api/version in this page");
      return fetch("/api/version", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (v) {
        return "VERSION · " + (v.app || "?") + " " + (v.version || "?") + " (" + (v.build || "?") + ") · " + (v.platform || "?") + " · " + VERSION;
      }).catch(function (e) { return "version: /api/version not reachable (" + e + ")"; });
    },
    "parity.parts": function (c, t) {
      var P = root.DS_PARTS; if (!P) return Promise.resolve("parts: parts-guide skill not loaded");
      var arg = norm(t).replace(/^\/?parts\s*/i, "");
      return Promise.resolve(P.load ? P.load() : null).then(function () {
        return P.render(arg);
      });
    },
    "term.delegate": function (c, t) {
      var T = root.DS_TERM; if (!T || !T.matchUser) return Promise.resolve(c.id + ": terminal-direct skill not loaded");
      var m = T.matchUser(norm(t)); if (!m) return Promise.resolve(c.id + ": usage " + c.usage);
      var f = { type: T.terminalType, open: T.openTerminal, exec: T.hostexec, "rvm-boot": T.rvmBoot, "rvm-stop": T.rvmStop, rvm: T.rvm }[m.kind];
      return Promise.resolve(m.kind === "open" ? f() : f(m.cmd));
    }
  };
  function honest(c) {
    var s = c.status === "rebuild" ? "not in this build · needs a native rebuild Rizal approves" : "blocked";
    return c.id + " · " + s + "\nwhy: " + (c.reason || "?") + (c.availableIn && c.availableIn.length ? "\nruns today in: " + c.availableIn.join(", ") : "") + "\n(" + VERSION + ", nothing was run)";
  }
  function dispatch(text) {
    var c = find(text); if (!c) return null;
    if (c.status !== "run") return Promise.resolve(honest(c));
    var h = HANDLERS[c.handler]; if (!h) return Promise.resolve(c.id + ": handler " + c.handler + " missing in " + VERSION);
    return Promise.resolve().then(function () { return h(c, text); }).catch(function (e) { return c.id + " error: " + e; });
  }
  function show(role, text) {
    if (typeof root.pushTurn === "function") { root.pushTurn(role, text); if (typeof root.draw === "function") root.draw(); return; }
    var log = root.document && root.document.getElementById("log"); if (!log) return;
    var d = root.document.createElement("div"); d.className = "turn " + (role === "user" ? "user" : "bot"); d.textContent = text; log.appendChild(d);
  }
  function install() {
    if (!root.document || root.__RZL_PARITY_HOOKED) return; root.__RZL_PARITY_HOOKED = true;
    root.document.addEventListener("submit", function (e) {
      var f = e.target; if (!f || f.id !== "composer" || !e.isTrusted) return;
      var inp = root.document.getElementById("message"), t = inp ? String(inp.value || "") : "";
      var c = find(t); if (!c || c.defer) return;              /* defer = an existing skill/native path owns it */
      e.preventDefault(); e.stopImmediatePropagation(); if (inp) inp.value = "";
      show("user", norm(t)); dispatch(t).then(function (r) { show("bot", r); });
    }, true);
  }
  try { install(); } catch (e) {}
  return { version: VERSION, find: find, dispatch: dispatch, handlers: HANDLERS, install: install };
});
