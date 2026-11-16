// PUBLIC rid-roster 2.1.9.1-pub — ZERO seats. No ЯID of ours ships in any public download .
// One bot slot only: the install's own stock bot (the "local" row). Its ЯID is EMPTY here and is minted ON FIRST RUN by the
// GhostChain ЯID generator (to define) — original, never one of ours.
// The device's own roster (if any) is injected at runtime.
window.ROS_RID_LIST = {
 "schema": "rlab.ybowzr.rid-list.v1",
 "public": true,
 "scope": "public-egg",
 "rows": [],
 "groups": [],
 "slots": [
  {
   "slot": "self",
   "kind": "bot",
   "rid": null,
   "mint": "on-first-run",
   "generator": "ghostchain-rid-generator (to define)",
   "neverCollidesWith": "any private roster",
   "note": "empty until minted on this install"
  }
 ]
};

/*HOMOGLYPH-BEGIN 2026-10-16 (Latin and Cyrillic look-alike spellings are BOTH valid). Lookups fold Cyrillic look-alikes to Latin (Я kept)
  before comparing; displayed names are never changed; the ЯID stays the only authoritative key. */
(function () {
  "use strict";
  const MAP = { "А":"A","В":"B","Е":"E","К":"K","М":"M","Н":"H","О":"O","Р":"P","С":"C","Т":"T","Х":"X","У":"Y",
                "а":"a","в":"b","е":"e","к":"k","м":"m","н":"h","о":"o","р":"p","с":"c","т":"t","х":"x","у":"y" };
  const fold = (s) => String(s == null ? "" : s).normalize("NFC").replace(/[АВЕКМНОРСТХУавекмнорстху]/g, (c) => MAP[c]).trim().toUpperCase();
  const L = window.ROS_RID_LIST || { rows: [] };
  const SEATS = {}; // public: no seats ship; the device roster supplies rows at runtime
  const EXTRA = (L.extra || []); // runtime alias seats from the device roster ({rid,names,aliasIds})
  ((L.rows || []).concat((L.slots || []).filter((s) => s && s.rid))).forEach((r) => {
    if (!r || !r.rid) return;
    const a = new Set([...(r.aliases || []), r.name, r.rosterName, ...(SEATS[r.rid] || [])].filter(Boolean));
    r.aliases = [...a];
  });
  function lookup(q) {
    const s = String(q == null ? "" : q).trim(); if (!s) return null;
    if (/^ЯID-\d{4}-[0-9A-Z]{4}$/.test(s)) return s;
    const f = fold(s), rows = (L.rows || []).concat(L.slots || []).filter((r) => r && r.rid);
    for (const e of EXTRA) if (e.aliasIds.includes(s) || e.names.some((n) => fold(n) === f)) return e.rid;
    let hit = rows.find((r) => [r.name, r.rosterName].some((n) => n && fold(n) === f)); if (hit) return hit.rid;
    hit = rows.find((r) => (r.aliases || []).some((n) => fold(n) === f)); if (hit) return hit.rid;
    hit = rows.find((r) => (r.formerNames || []).some((n) => fold(n) === f)); return hit ? hit.rid : null;
  }
  const same = (a, b) => fold(a) === fold(b);
  window.ROS_FOLD = fold; window.ROS_NAME_SAME = same; window.ROS_LOOKUP = lookup;
})();
/*HOMOGLYPH-END*/
