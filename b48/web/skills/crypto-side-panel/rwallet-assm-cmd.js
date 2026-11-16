/* t55u RWALLET + ASSM composer commands (case-insensitive, optional leading /).
   RWALLET opens the wallet layer; ASSM opens the wallet then the login/signed-in strip at the bottom.
   Does not toggle the wallet closed if it is already open. No passwords, no chain writes. */
(function (w, d) {
  function kind(t) {
    t = String(t || "").trim();
    if (/^\/?rwallet\s*$/i.test(t)) return "rwallet";
    if (/^\/?assm\s*$/i.test(t)) return "assm";
    return "";
  }
  function run(k) {
    if (k === "rwallet" && w.CSP_OPEN_WALLET) return w.CSP_OPEN_WALLET();
    if (k === "assm" && w.CSP_OPEN_ASSM) return w.CSP_OPEN_ASSM();
    return false;
  }
  w.RWALLET_ASSM_CMD = { kind: kind, run: run };
  function take(raw) {
    var k = kind(raw);
    if (!k) return false;
    run(k);
    return true;
  }
  d.addEventListener("submit", function (e) {
    var f = e.target;
    if (!f || (f.id !== "composer" && !(f.classList && f.classList.contains("th-comm")))) return;
    var inp = (f.id === "composer")
      ? (d.getElementById("message") || f.querySelector("#message") || f.querySelector("input,textarea"))
      : f.querySelector("input,textarea");
    if (!inp) return;
    if (!take(inp.value)) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    inp.value = "";
  }, true);
  d.addEventListener("keydown", function (e) {
    if (!e || e.key !== "Enter" || e.isComposing) return;
    var el = e.target;
    if (!el) return;
    if (el.id !== "message" && !(el.closest && (el.closest("#composer") || el.closest(".th-comm") || el.closest("#th-chat")))) return;
    if (!take(el.value)) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    el.value = "";
  }, true);
})(window, document);
