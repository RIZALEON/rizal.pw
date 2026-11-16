/* thundr-rwallet.js · STAGED 20261026 · ThundR ⇄ RWALLET UNIFIED hook. Watch-only.
   Load after rwallet-guard.js + rkrypt.rzl.js + rwallet-unified.js. window.THUNDR_RWALLET(q) → Promise<string> for "rwallet …" text, else null.
   Gated functions (send/sign/mint/revoke/seal/publish…) return a ЯCASKET Face ID REQUEST PREVIEW only: nothing is signed, sent or dispatched. */
(function (root) {
  if (root.THUNDR_RWALLET) return;
  root.THUNDR_RWALLET = function (q) {
    q = String(q || "").trim(); if (!/^rwallet\b/i.test(q)) return null;
    var U = root.RWALLET_UNIFIED; if (!U) return Promise.resolve("RWALLET UNIFIED not loaded in this window.");
    var parts = q.split(/\s+/).slice(1), fn = parts.shift();
    return U.ready.then(function () {
      if (!fn || fn === "list") { var g = {}; U.funcs.forEach(function (x) { (g[x.where] = g[x.where] || []).push(x.id + (x.casket ? "🔒" : "")); });
        return "RWALLET " + U.version + " · " + U.funcs.length + " functions · watch-only (🔒 = ЯCASKET Face ID request)\n" + Object.keys(g).map(function (k) { return k + ": " + g[k].join(" "); }).join("\n"); }
      return U.run(fn, parts.join(" ")).then(function (r) { return "[" + r.status + "] " + (typeof r.out === "string" ? r.out : JSON.stringify(r.out, null, 1)); });
    });
  };
})(window);
