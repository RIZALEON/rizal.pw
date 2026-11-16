/* parts-guide 0.1.0 · 2026-10-19 · ЯBOT. Answers "what is <part>" / "status of <part>" locally from parts.json.
 * Read-only: never goes online, never edits memory. window.DS_PARTS = { list, find, what, status, render }. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory;
  else root.DS_PARTS = factory(root);
})(typeof self !== "undefined" ? self : this, function (win) {
  "use strict";
  var DATA = null;
  function load() {
    if (DATA) return Promise.resolve(DATA);
    return fetch("./skills/parts-guide/parts.json").then(function (r) { return r.json(); }).then(function (j) { DATA = j.parts || []; return DATA; });
  }
  function norm(s) { return String(s || "").trim().toLowerCase().replace(/^\/+/, ""); }
  function find(q) {
    q = norm(q); if (!DATA || !q) return null;
    for (var i = 0; i < DATA.length; i++) { var p = DATA[i];
      if (norm(p.id) === q || norm(p.name) === q || (p.aliases || []).some(function (a) { return norm(a) === q; })) return p; }
    for (var j = 0; j < DATA.length; j++) if ((norm(DATA[j].name) + " " + (DATA[j].aliases || []).join(" ").toLowerCase()).indexOf(q) >= 0) return DATA[j];
    return null;
  }
  function list() {
    return (DATA || []).map(function (p) { return p.status + "\t" + p.id + " — " + p.name + " (" + p.version + ")"; }).join("\n");
  }
  function detail(p) {
    return p.name + " [" + p.status + "] " + p.version + "\nlayer: " + p.layer + " · owner: " + p.owner + "\n" + p.what +
      "\npath: " + p.path + (p.use.length ? "\nuse: " + p.use.join(" | ") : "") + "\ndepends on: " + (p.depends_on.join(", ") || "—");
  }
  function what(q) { var p = find(q); return p ? detail(p) : "No part named \"" + q + "\". Type /parts for the list."; }
  function status(q) { var p = find(q); return p ? p.name + " is " + p.status + " (" + p.version + ")." : "No part named \"" + q + "\"."; }
  function render(arg) { return arg ? what(arg) : "DRAGON SKULL parts (" + (DATA || []).length + "):\n" + list(); }
  /* question matcher for the assistant: returns a local answer or null */
  function answer(text) {
    var m = /^\s*what(?:'s| is)\s+the\s+status\s+of\s+(.+?)\??\s*$/i.exec(text) || /^\s*status\s+of\s+(.+?)\??\s*$/i.exec(text);
    if (m) return status(m[1]);
    m = /^\s*what\s+is\s+(.+?)\??\s*$/i.exec(text); if (m && find(m[1])) return what(m[1]);
    return null;
  }
  load().catch(function () {});
  return { load: load, find: find, list: list, what: what, status: status, render: render, answer: answer };
});
