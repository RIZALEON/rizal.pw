/* RBOARD · RDRAGON mount (add-only 20261109-t145u). Transfers draft into #message; never submits. */
(function () {
  "use strict";
  function mount() {
    var input = document.getElementById("message");
    if (!input || !window.GhostrootKeyboard) return;
    if (input.dataset.rboardMounted === "1") return;
    input.dataset.rboardMounted = "1";
    try {
      input.setAttribute("inputmode", "none");
      window.RBOARD_API = window.GhostrootKeyboard.mount(input);
      var bar = input.parentElement;
      if (bar) bar.querySelectorAll(".grk-toggle").forEach(function (btn) { btn.remove(); });
    } catch (e) {
      console.warn("RBOARD mount failed", e);
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
