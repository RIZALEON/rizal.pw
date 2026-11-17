// RGENERATR status card: renders status only; drops any field that could carry secret material.
(function () {
  const ALLOWED = ["native", "enrolled", "items", "rotation", "rid_tags"];
  function render(st) {
    const s = {}; ALLOWED.forEach(k => { if (st && k in st) s[k] = st[k]; });
    const key = !st ? "UNVERIFIED" : !s.native ? "native absent" : s.enrolled ? "enrolled" : "not enrolled";
    document.getElementById("rgen-key").textContent = key;
    document.getElementById("rgen-items").textContent = Number.isInteger(s.items) ? s.items : "–";
    document.getElementById("rgen-rot").textContent = Number.isInteger(s.rotation) ? s.rotation : "–";
  }
  window.addEventListener("message", e => { if (e.source === window.parent && e.data && e.data.type === "rgen-status") render(e.data.status); });
  render(window.RGEN_STATUS || null);
})();
