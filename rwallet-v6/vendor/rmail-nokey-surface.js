/* rmail-nokey-surface.js — KUBO NOKEY lane v2 (20261105) + persisted-id dedup
 * Shared RMAIL/MESSAGE/RWALLET surface for ASSM @chaserizal (guest default).
 * No device-key APIs, unlock dialogs, enroll, sign, or chain-seal.
 * Public owner address is content routing only — never authority.
 * Dedup: skip receive when id already exists in localStorage rmail.box arrays or rmail.outbox
 * (rsocial keep() appends without id filter; refreshes must not duplicate).
 *
 * Feeds (optional, explicit):
 *  1) window.RMAIL_PUBLIC_INDEX — URL returning either
 *       {kind:"rmail.index.v1",public:true,boxes:{<addr>:n}}
 *       then messages from window.RMAIL_PUBLIC_BOX_BASE + "/" + addr + "/" (objects), OR
 *       {ok:true,addr,messages:[...full public rmail objects...]}  // preferred /api/rmail/public?addr=
 *  2) RKLOWD_RMAIL_FETCH=1 + existing bridge token — GET /rklowd/list then /rklowd/obj/<64hex>
 *       only names matching /^rmail-[A-Za-z0-9_-]+\.json$/; sha must match; utf8 JSON body.
 * Guest / no-token => local-only truth. Block4 / purpose-bind objects are rejected early.
 */
(function (root) {
  "use strict";
  if (root.RMAIL_NOKEY && root.RMAIL_NOKEY.v >= 2) return;

  var OWNER_HANDLE = "@chaserizal";
  var OWNER_RID = "ЯID-0001-3QQS";
  var OWNER_ADDR = "BwpVNk1Rtncpv5HMTLwxB4Yfjkfv6mFaBQUTpjneH1F9";
  var BOX = "rmail.box";
  var OUTBOX = "rmail.outbox";
  var RMAIL_NAME_RE = /^rmail-[A-Za-z0-9_-]+\.json$/;
  var SHA_RE = /^[0-9a-f]{64}$/;
  var STATE = {
    mode: "nokey",
    authority: false,
    enrolled: false,
    signable: false,
    local: 0,
    synced: 0,
    rejected: 0,
    remote: "local-only",
    detail: "Unsigned request only · Key unavailable"
  };

  function lsGet(k, d) {
    try { return JSON.parse(root.localStorage.getItem(k)) || d; } catch (e) { return d; }
  }
  function isOwnerTarget(m) {
    if (!m || typeof m !== "object") return false;
    var to = String(m.to || "").trim();
    var ta = String(m.to_addr || "").trim();
    if (ta === OWNER_ADDR) return true;
    if (/^@?chaserizal$/i.test(to)) return true;
    return false;
  }
  function isBlock4OrAuthority(raw) {
    if (!raw || typeof raw !== "object") return true;
    var schema = String(raw.schema || "");
    var purpose = String(raw.purpose || (raw.seal_entry && raw.seal_entry.purpose) || "");
    var auth = String(raw.authority || "");
    var type = String(raw.type || "");
    if (/block4|bind\.request|rghostkey|rmint_route/i.test(schema)) return true;
    if (/rghostkey\.bind|rmint_route/i.test(purpose)) return true;
    if (/rmint_route|bind/i.test(auth)) return true;
    if (raw.seal_entry || raw.req_hash || raw.rsign_seal) return true;
    if (type === "rmail.block4.bind.request.v1") return true;
    if (raw.trusted_internal === true) return true;
    // bare "owner" as to without public addr is typed/internal — reject in NOKEY
    if (String(raw.to || "").toLowerCase() === "owner" && !isOwnerTarget(raw)) return true;
    return false;
  }
  function ensurePublicIdentity() {
    if (!root.RSOCIAL_ME) root.RSOCIAL_ME = "guest";
    root.RSOCIAL_OWNER_ADDR = root.RSOCIAL_OWNER_ADDR || OWNER_ADDR;
    root.RSOCIAL_BOOK = root.RSOCIAL_BOOK || {};
    if (!root.RSOCIAL_BOOK[OWNER_HANDLE]) root.RSOCIAL_BOOK[OWNER_HANDLE] = OWNER_ADDR;
    if (!root.RSOCIAL_BOOK["chaserizal"]) root.RSOCIAL_BOOK["chaserizal"] = OWNER_ADDR;
    if (!root.RWALLET_UNIFIED || typeof root.RWALLET_UNIFIED.addresses !== "function") {
      root.RWALLET_UNIFIED = root.RWALLET_UNIFIED || {};
      root.RWALLET_UNIFIED.addresses = function () {
        return [{ name: "CROWN @chaserizal", chain: "solana", publicAddress: OWNER_ADDR, rid: OWNER_RID, handle: OWNER_HANDLE }];
      };
    }
  }
  function countLocal() {
    var box = lsGet(BOX, {});
    var owner = box[OWNER_ADDR] || [];
    STATE.local = Array.isArray(owner) ? owner.length : 0;
    return STATE.local;
  }
  /** Collect every known message id from persisted box arrays + outbox (no overwrite). */
  function persistedIds() {
    var ids = Object.create(null);
    var box = lsGet(BOX, {});
    if (box && typeof box === "object") {
      Object.keys(box).forEach(function (k) {
        var arr = box[k];
        if (!Array.isArray(arr)) return;
        arr.forEach(function (x) {
          if (x && x.id) ids[String(x.id)] = true;
        });
      });
    }
    var ob = lsGet(OUTBOX, []);
    if (Array.isArray(ob)) {
      ob.forEach(function (x) {
        if (x && x.id) ids[String(x.id)] = true;
      });
    }
    return ids;
  }
  function utf8FromB64(b64) {
    var bin = root.atob(String(b64 || ""));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    if (typeof TextDecoder !== "undefined") return new TextDecoder("utf-8").decode(bytes);
    // escape/decodeURIComponent path for older engines (emoji-safe)
    var s = "";
    for (var j = 0; j < bytes.length; j++) s += "%" + ("00" + bytes[j].toString(16)).slice(-2);
    return decodeURIComponent(s);
  }
  /* 20261111-rbowzr: carry the rmail.approve v2 block (SCROLLS/RMAIL-APPROVE-DENY-SPEC-20261111.md) — data only, never authority */
  var KEEP_SECRET = /(priv|secret|password|passwd|mnemonic|seed|recovery|token|apikey|api_key|credential|signature|^sig$|^key$|xprv|keystore)/i;
  function keepStr(v, n) { return String(v == null ? "" : v).replace(/<[^>]*>/g, "").slice(0, n); }
  function keepSecretish(o, d) { d = d || 0; if (d > 8) return true;
    if (Array.isArray(o)) return o.some(function (v) { return keepSecretish(v, d + 1); });
    if (o && typeof o === "object") return Object.keys(o).some(function (k) { return KEEP_SECRET.test(k) || keepSecretish(o[k], d + 1); });
    if (typeof o === "string") return /PRIVATE KEY|BEGIN [A-Z ]*KEY/.test(o); return false; }
  function keepNotice(raw) { var n = raw && raw.notice; if (!n || typeof n !== "object") return undefined;
    return { req_id: keepStr(n.req_id, 64), type: keepStr(n.type, 40), status: keepStr(n.status, 40), needs: keepStr(n.needs, 80),
             source: keepStr(n.source, 60), command: keepStr(n.command, 40) }; }
  function keepApprove(raw) { var a = raw && raw.approve;
    if (!a || typeof a !== "object" || a.v !== 2 || raw.signed !== false || keepSecretish(a)) return undefined;
    var out = { v: 2, kind: keepStr(a.kind, 8), summary: keepStr(a.summary, 300), app: keepStr(a.app, 60), req_id: keepStr(a.req_id, 64),
                nonce: keepStr(a.nonce, 16), expires: Number(a.expires) || 0, buttons: [], reply: {} };
    (Array.isArray(a.buttons) ? a.buttons : []).slice(0, 2).forEach(function (b) { if (!b || typeof b !== "object") return;
      var o = { id: keepStr(b.id, 16), label: keepStr(b.label, 40), does: keepStr(b.does, 24) };
      if (b.open != null) { if (!/^rwallet:\/\/approve\?/.test(String(b.open))) return; o.open = keepStr(b.open, 300); }
      out.buttons.push(o); });
    if (a.reply && typeof a.reply === "object") out.reply = { node: keepStr(a.reply.node, 40), app: keepStr(a.reply.app, 60) };
    try { if (JSON.stringify(out).length > 4096) return undefined; } catch (e) { return undefined; }
    return out; }
  function normalizePublicMsg(raw) {
    if (!raw || typeof raw !== "object") return null;
    if (isBlock4OrAuthority(raw)) return null;
    var kind = raw.kind || raw.schema;
    var isRmail = kind === "rmail" || kind === "rmail.guest.v1" || raw.schema === "rmail.guest.v1";
    if (!isRmail) return null;
    // ALWAYS require actual owner target — guest.v1 does not bypass
    if (!isOwnerTarget(raw)) return null;
    var id = String(raw.id || "").trim();
    if (!id || /^hub-/i.test(id)) return null; // refuse fabricated / stale hub ids
    var text = String(raw.text || "");
    if (!text) {
      var sub = String(raw.subject || "").trim();
      var body = String(raw.body || "").trim();
      text = sub && body ? (sub + "\n\n" + body) : (sub || body);
    }
    text = String(text).slice(0, 4000);
    if (!text) return null;
    var from = String(raw.from || "guest");
    var fromAddr = String(raw.from_addr || from || "guest");
    var guestish = /^guest/i.test(from) || /^guest/i.test(fromAddr);
    return {
      v: 2,
      kind: "rmail",
      id: id,
      from: from,
      from_addr: fromAddr,
      to: String(raw.to || OWNER_HANDLE),
      to_addr: String(raw.to_addr || OWNER_ADDR),
      text: text,
      ts: Number(raw.ts) || Date.now(),
      via: raw.via || "public-index",
      verified: false, // never trust inbound flag; RSOCIAL.receive re-verifies
      trust: guestish ? "guest-unverified" : "unverified",
      origin: raw.origin || "public",
      signed: raw.signed === false ? false : undefined,   // 20261111-rbowzr
      notice: keepNotice(raw),
      approve: keepApprove(raw)
    };
  }
  function receiveOne(m) {
    if (!m) { STATE.rejected++; return Promise.resolve(null); }
    var id = String(m.id || "").trim();
    if (!id) { STATE.rejected++; return Promise.resolve(null); }
    // Persisted-id gate BEFORE receive — RSOCIAL.keep appends without id filter.
    // Existing id in rmail.box or rmail.outbox: skip (no overwrite / no duplicate append).
    if (persistedIds()[id]) {
      return Promise.resolve(null);
    }
    var recv = root.RSOCIAL && typeof root.RSOCIAL.receive === "function" ? root.RSOCIAL.receive : null;
    if (!recv) {
      // local fallback keep unverified (no crypto path); still refuse conflicting id
      var box = lsGet(BOX, {});
      var k = m.to_addr || OWNER_ADDR;
      var arr = box[k] || [];
      if (arr.some(function (x) { return x && x.id === id; })) return Promise.resolve(null);
      box[k] = arr.concat([m]);
      try { root.localStorage.setItem(BOX, JSON.stringify(box)); } catch (e) {}
      return Promise.resolve(m);
    }
    // strip any claimed verified before receive
    m.verified = false;
    return Promise.resolve(recv(m)).then(function (x) { return x; }, function () { return null; });
  }
  function bannerHTML() {
    return '<div id="rmail-nokey-banner" style="margin:8px 0 10px;padding:8px 10px;border:1px solid #3a4555;border-radius:10px;background:#121821;color:#c9d4e0;font:12px -apple-system,system-ui,sans-serif">'
      + '<b style="color:#ffd28a">NOKEY</b> · ' + STATE.detail
      + ' · authority=<b>false</b> · enroll=<b>false</b> · signable=<b>false</b>'
      + '<br><span style="opacity:.85">local ' + STATE.local + ' · synced ' + STATE.synced
      + (STATE.rejected ? (' · rejected ' + STATE.rejected) : '')
      + ' · remote: ' + STATE.remote
      + ' · ' + OWNER_HANDLE + ' / ' + OWNER_RID + ' · ' + OWNER_ADDR.slice(0, 8) + '…</span>'
      + '<div style="margin-top:6px">'
      + '<button type="button" data-nokey="open-rmail" style="margin-right:6px;padding:6px 10px;border:0;border-radius:8px;background:#3dd68c;color:#062;font-weight:700;cursor:pointer">RMAIL</button>'
      + '<button type="button" data-nokey="open-rmail" style="margin-right:6px;padding:6px 10px;border:0;border-radius:8px;background:#3a4555;color:#e8eef7;cursor:pointer">MESSAGE</button>'
      + '<button type="button" data-nokey="open-rmail" style="margin-right:6px;padding:6px 10px;border:0;border-radius:8px;background:#3a4555;color:#e8eef7;cursor:pointer">ASSM / RWALLET</button>'
      + '<button type="button" data-nokey="refresh" style="padding:6px 10px;border:0;border-radius:8px;background:#2a3544;color:#9aa8b8;cursor:pointer">Refresh status</button>'
      + '</div><div id="rlogin-strip-host"></div></div>';
  }
  function paintBanner() {
    countLocal();
    if (!root.document) return;
    var rmail = root.document.getElementById("rmail-ui");
    var roster = root.document.getElementById("roster");
    var existing = root.document.getElementById("rmail-nokey-banner");
    var html = bannerHTML();
    if (existing) { existing.outerHTML = html; try{ if(root.RLOGIN_STRIP) root.RLOGIN_STRIP.mount(); root.dispatchEvent(new CustomEvent("rmail-nokey-painted")); }catch(e){} return; }
    var wrap = root.document.createElement("div");
    wrap.innerHTML = html;
    var node = wrap.firstChild;
    if (!node) return;
    if (rmail && rmail.firstChild) rmail.insertBefore(node, rmail.firstChild);
    else if (rmail) rmail.appendChild(node);
    else if (roster && roster.firstChild) roster.insertBefore(node, roster.firstChild);
    else if (roster) roster.appendChild(node);
    try{ if(root.RLOGIN_STRIP) root.RLOGIN_STRIP.mount(); root.dispatchEvent(new CustomEvent("rmail-nokey-painted")); }catch(e){}
  }
  function openShared() {
    ensurePublicIdentity();
    // Shared ASSM Message/RMAIL surface only — never a separate NOKEY window.
    if (root.RMAIL_UI && typeof root.RMAIL_UI.open === "function") root.RMAIL_UI.open();
    setTimeout(paintBanner, 50);
  }
  function tokenFromBridge() {
    try {
      if (root.RMAIL_SYNC_TOKEN && String(root.RMAIL_SYNC_TOKEN).indexOf("rbt_") === 0) return String(root.RMAIL_SYNC_TOKEN);
      if (root.RKLOWD_NODE && root.RKLOWD_NODE.token) return String(root.RKLOWD_NODE.token);
      var t = root.localStorage.getItem("rklowd.pw.tok") || root.localStorage.getItem("rpipe.token") || "";
      if (/^rbt_/.test(t)) return t;
    } catch (e) {}
    return "";
  }
  function plat() {
    try {
      if (root.DSNative) return "android";
      var NEO = String(root.navigator && root.navigator.platform || "").indexOf("Mac") === 0 && !("ontouchend" in root.document);
      if (root.webkit && root.webkit.messageHandlers && !NEO) return "ios";
    } catch (e) {}
    return "neo";
  }
  function seat() {
    try { if (root.RDRAGON_SEAT) return String(root.RDRAGON_SEAT); } catch (e) {}
    return { ios: "iphone17e-rdragon", android: "moto-rdragon", neo: "neo-rdragon" }[plat()] || "neo-rdragon";
  }
  function nodeSlot() {
    try {
      if (root.RKLOWD_NODE && root.RKLOWD_NODE.slot) return String(root.RKLOWD_NODE.slot);
    } catch (e) {}
    return { ios: "17e", android: "moto", neo: "neo" }[plat()] || "neo";
  }
  function blockedHub(u) { var b = (root.RKLOWD_BLOCKED_HUBS || []); u = String(u || ""); for (var i = 0; i < b.length; i++) { if (b[i] && u.indexOf(b[i]) >= 0) return true; } return false; } /* RWALLET-STRIP: LAN block list moved to runtime config */
  function defaultHubs() {
    var lan = String(root.RKLOWD_LAN_HUB || "http://127.0.0.1"); /* RWALLET-STRIP: LAN IP -> runtime config */
    var trans = ":8797/rscale/rmail/drop";
    var moto = String(root.RKLOWD_MOTO_HUB || "http://127.0.0.1") + trans; /* RWALLET-STRIP */
    var neoT = lan + trans;
    if (plat() === "neo") {
      return [
        "http://127.0.0.1:8319/rscale/rmail/drop",
        "http://127.0.0.1:8797/rscale/rmail/drop",
        "http://127.0.0.1:8339/rscale/rmail/drop",
        "http://127.0.0.1:8900/rscale/rmail/drop",
        "http://127.0.0.1:8799/rscale/rmail/drop",
        neoT,
        lan + ":8799/rscale/rmail/drop",
        moto,
        "http://127.0.0.1:8324/drop?name=rmail-guest.json"
      ];
    }
    return [
      "http://127.0.0.1:8319/rscale/rmail/drop",
      "http://127.0.0.1:8797/rscale/rmail/drop",
      neoT,
      lan + ":8900/rscale/rmail/drop",
      lan + ":8799/rscale/rmail/drop",
      moto,
      lan + ":8324/drop?name=rmail-guest.json"
    ];
  }
  function dropHubs() {
    var list = [];
    try { if (root.RMAIL_HUBS && root.RMAIL_HUBS.length) list = root.RMAIL_HUBS.slice(); } catch (e) {}
    if (!list.length) list = defaultHubs();
    return list.filter(function (u) { return u && !blockedHub(u); });
  }
  function hubBases() {
    var out = [], seen = {};
    dropHubs().forEach(function (u) {
      var b = String(u || "").replace(/\/rmail\/drop\/?$/, "").replace(/\/drop\?.*$/, "");
      if (!b || seen[b] || blockedHub(b)) return;
      seen[b] = 1; out.push(b.replace(/\/+$/, ""));
    });
    return out;
  }
  function rklowdEnabled() {
    try {
      if (root.RKLOWD_RMAIL_FETCH === false || root.RKLOWD_RMAIL_FETCH === 0) return false;
      if (root.RKLOWD_RMAIL_FETCH === true || root.RKLOWD_RMAIL_FETCH === 1 || root.RKLOWD_RMAIL_FETCH === "1") return true;
      if (/(?:\?|&)RKLOWD_RMAIL_FETCH=1(?:&|$)/.test(String(root.location && root.location.search || ""))) return true;
      var h = String(root.location && root.location.hostname || "");
      if (/rizal\.(pw|info)$/i.test(h)) return false;
    } catch (e) {}
    try { if (root.DSNative) return true; } catch (e) {}
    try { if (root.webkit && root.webkit.messageHandlers) return true; } catch (e) {}
    try {
      var h2 = String(root.location && root.location.hostname || "");
      if (h2 === "127.0.0.1" || h2 === "localhost") return true;
    } catch (e) {}
    return false;
  }
  function listBase() {
    var bases = hubBases();
    if (bases.length) return bases[0];
    var base = root.RKLOWD_LIST_BASE || root.RSCALE_RKLOWD_BASE || "";
    if (!base) {
      try { base = root.localStorage.getItem("rklowd.pw.lan") || ""; } catch (e) {}
    }
    if (!base) base = plat() === "neo" ? "http://127.0.0.1:8799/rscale" : "http://127.0.0.1:8799/rscale" /* RWALLET-STRIP: LAN IP removed */;
    return String(base).replace(/\/+$/, "");
  }
  function idbOpen() {
    return new Promise(function (ok, no) {
      if (!root.indexedDB) return no(new Error("no-idb"));
      var r = root.indexedDB.open("rdragon-rmail", 1);
      r.onupgradeneeded = function () {
        var d = r.result;
        if (!d.objectStoreNames.contains("inbox")) d.createObjectStore("inbox", { keyPath: "id" });
      };
      r.onsuccess = function () { ok(r.result); };
      r.onerror = function () { no(r.error); };
    });
  }
  function cachePut(m) {
    if (!m || !m.id) return Promise.resolve(m);
    return idbOpen().then(function (d) {
      return new Promise(function (ok) {
        var t = d.transaction("inbox", "readwrite");
        t.objectStore("inbox").put(m);
        t.oncomplete = function () { ok(m); };
        t.onerror = function () { ok(m); };
      });
    }).catch(function () { return m; });
  }
  function loadCache() {
    return idbOpen().then(function (d) {
      return new Promise(function (ok) {
        var req = d.transaction("inbox", "readonly").objectStore("inbox").getAll();
        req.onsuccess = function () {
          var arr = req.result || [], p = Promise.resolve();
          arr.forEach(function (m) { p = p.then(function () { return receiveOne(m); }); });
          p.then(function () { ok(arr.length); });
        };
        req.onerror = function () { ok(0); };
      });
    }).catch(function () { return 0; });
  }
  function ingestList(msgs) {
    var got = 0;
    var chain = Promise.resolve();
    (msgs || []).forEach(function (raw) {
      chain = chain.then(function () {
        var n = normalizePublicMsg(raw);
        if (!n) { STATE.rejected++; return null; }
        return receiveOne(n).then(function (x) {
          if (x) { got++; return cachePut(x); }
          return cachePut(n);
        });
      });
    });
    return chain.then(function () {
      STATE.synced = got;
      countLocal();
      return { ok: true, synced: got };
    });
  }
  function fetchInboxFrom(base) {
    var headers = { "X-RDRAGON-Seat": seat(), "X-RKLOWD-Node": nodeSlot() };
    var tok = tokenFromBridge();
    if (tok) headers.Authorization = "Bearer " + tok;
    var opt = { method: "GET", mode: "cors", headers: headers, cache: "no-store" };
    try { if (root.AbortSignal && typeof root.AbortSignal.timeout === "function") opt.signal = root.AbortSignal.timeout(5000); } catch (e) {}
    return fetch(String(base).replace(/\/+$/, "") + "/rmail/inbox", opt).then(function (r) {
      if (!r.ok) return { ok: false, reason: "http-" + r.status, base: base };
      return r.json().then(function (j) {
        if (!j || j.ok !== true || !Array.isArray(j.messages)) return { ok: false, reason: "bad-shape", base: base };
        STATE.remote = "rmail inbox " + (j.node || base);
        return ingestList(j.messages).then(function (res) { res.base = base; res.node = j.node; return res; });
      });
    });
  }

  function paintFolder(oks) {
    if (!root.document) return;
    var el = root.document.getElementById("rklowd-folder-list");
    var st = root.document.getElementById("rklowd-folder-stat");
    if (!el) return;
    var lines = [];
    (oks || []).forEach(function (r) {
      lines.push((r.node || r.base || "") + " · synced " + (r.synced || 0));
    });
    fetchProfileFolder().then(function (info) {
      if (st) st.textContent = info.line || st.textContent;
      if (info.list) el.textContent = info.list;
    });
  }
  function fetchProfileFolder() {
    var bases = hubBases();
    var headers = { "X-RDRAGON-Seat": "web-rwallet", "X-RKLOWD-Node": "pw" };
    function next(i) {
      if (i >= bases.length) return Promise.resolve({ line: "no hub reachable for rklowd.pw", list: "" });
      var opt = { method: "GET", mode: "cors", headers: headers, cache: "no-store" };
      try { if (root.AbortSignal && typeof root.AbortSignal.timeout === "function") opt.signal = root.AbortSignal.timeout(5000); } catch (e) {}
      return fetch(String(bases[i]).replace(/\/+$/, "") + "/rmail/inbox", opt).then(function (r) {
        if (!r.ok) return next(i + 1);
        return r.json().then(function (j) {
          if (!j || j.ok !== true || !Array.isArray(j.messages)) return next(i + 1);
          var msgs = j.messages.slice(0, 12);
          var list = msgs.map(function (m) {
            return (m.id || "?") + "  sha=" + String(m.sha || m.sha256 || "").slice(0, 16);
          }).join("\n");
          return { line: "rklowd.pw inbox " + (j.count || msgs.length) + " via " + (j.node || bases[i]), list: list };
        });
      }, function () { return next(i + 1); });
    }
    return next(0);
  }
  function fetchInboxHubs() {
    var bases = hubBases();
    if (!bases.length) return Promise.resolve({ ok: false, reason: "no-hubs" });
    STATE.remote = "fetching-rmail-inbox";
    return Promise.all(bases.map(function (b) {
      return fetchInboxFrom(b).then(function (r) { return r; }, function (e) {
        return { ok: false, reason: (e && e.message) || "network", base: b };
      });
    })).then(function (reports) {
      var oks = (reports || []).filter(function (r) { return r && r.ok; });
      if (!oks.length) return reports[0] || { ok: false, reason: "no-hub" };
      var synced = 0;
      oks.forEach(function (r) { synced += (r.synced || 0); });
      STATE.remote = "rmail inbox " + oks.map(function (r) { return r.node || r.base; }).join(" + ");
      STATE.synced = synced;
      try { paintFolder(oks); } catch (e) {}
      return { ok: true, synced: synced, hubs: oks.length, reports: oks };
    });
  }
  function fetchPublicIndex() {
    var url = root.RMAIL_PUBLIC_INDEX || "";
    if (!url) return Promise.resolve({ ok: false, reason: "no-public-index" });
    STATE.remote = "fetching-public-index";
    return fetch(String(url), { method: "GET", mode: "cors", cache: "no-store" }).then(function (r) {
      if (!r.ok) {
        STATE.remote = "local-only (public-index http-" + r.status + ")";
        return { ok: false, reason: "http-" + r.status };
      }
      return r.json().then(function (j) {
        if (j && Array.isArray(j.messages)) {
          STATE.remote = "public-index messages";
          return ingestList(j.messages);
        }
        // index.v1 with boxes — only owner addr; need BOX_BASE for objects
        if (j && j.kind === "rmail.index.v1" && j.public === true && j.boxes) {
          var n = Number(j.boxes[OWNER_ADDR] || 0);
          var boxBase = root.RMAIL_PUBLIC_BOX_BASE || "";
          if (!boxBase) {
            // truthful: we know count but cannot fetch objects without endpoint
            STATE.remote = "public-index boxes only · owner count " + n + " (no BOX_BASE/API yet)";
            STATE.synced = 0;
            countLocal();
            return { ok: true, synced: 0, index_count: n };
          }
          // Preferred companion contract once RDRAGON adds it:
          // GET /api/rmail/public?addr=<OWNER_ADDR> -> {ok:true,addr,messages:[...]}
          var api = String(boxBase).replace(/\/+$/, "") + "/api/rmail/public?addr=" + encodeURIComponent(OWNER_ADDR);
          if (String(boxBase).indexOf("/api/rmail/public") >= 0) api = String(boxBase);
          return fetch(api, { method: "GET", mode: "cors", cache: "no-store" }).then(function (r2) {
            if (!r2.ok) {
              STATE.remote = "local-only (public-box http-" + r2.status + ")";
              return { ok: false, reason: "box-http-" + r2.status };
            }
            return r2.json().then(function (j2) {
              var msgs = (j2 && (j2.messages || j2.items)) || [];
              STATE.remote = "public-box";
              return ingestList(msgs);
            });
          });
        }
        STATE.remote = "local-only (public-index shape unknown)";
        return { ok: false, reason: "bad-shape" };
      });
    }).catch(function () {
      STATE.remote = "local-only (public-index unreachable)";
      return { ok: false, reason: "network" };
    });
  }
  function fetchRklowdListObj() {
    var base = listBase();
    if (!base) return Promise.resolve({ ok: false, reason: "rklowd-disabled" });
    var tok = tokenFromBridge();
    if (!tok) {
      STATE.remote = "local-only (no sync token · 401 path)";
      return Promise.resolve({ ok: false, reason: "no-token" });
    }
    var headers = { "X-RKLOWD-Node": nodeSlot(), Authorization: "Bearer " + tok };
    STATE.remote = "fetching-rklowd-list";
    return fetch(base + "/rklowd/list", { method: "GET", mode: "cors", headers: headers, cache: "no-store" }).then(function (r) {
      if (r.status === 401 || r.status === 403) {
        STATE.remote = "local-only (hub " + r.status + ")";
        STATE.synced = 0;
        return { ok: false, reason: "auth-" + r.status };
      }
      if (!r.ok) {
        STATE.remote = "local-only (hub http-" + r.status + ")";
        return { ok: false, reason: "http-" + r.status };
      }
      return r.json().then(function (j) {
        // Actual contract: {ok, folder, files:[{sha256,name,size,origin,t,via}, ...]}
        if (!j || j.ok !== true || !Array.isArray(j.files)) {
          STATE.remote = "local-only (list shape mismatch)";
          return { ok: false, reason: "bad-list" };
        }
        var files = j.files.filter(function (f) {
          return f && SHA_RE.test(String(f.sha256 || "")) && RMAIL_NAME_RE.test(String(f.name || ""));
        });
        var msgs = [];
        var chain = Promise.resolve();
        files.forEach(function (f) {
          chain = chain.then(function () {
            return fetch(base + "/rklowd/obj/" + f.sha256, { method: "GET", mode: "cors", headers: headers, cache: "no-store" }).then(function (r2) {
              if (!r2.ok) { STATE.rejected++; return null; }
              return r2.json().then(function (o) {
                if (!o || o.ok !== true || o.sha256 !== f.sha256 || !o.b64) { STATE.rejected++; return null; }
                var text;
                try { text = utf8FromB64(o.b64); } catch (e) { STATE.rejected++; return null; }
                var raw;
                try { raw = JSON.parse(text); } catch (e) { STATE.rejected++; return null; }
                var n = normalizePublicMsg(raw);
                if (!n) { STATE.rejected++; return null; }
                msgs.push(n);
                return n;
              });
            }).catch(function () { STATE.rejected++; return null; });
          });
        });
        return chain.then(function () {
          STATE.remote = "rklowd list/obj";
          // already normalized; receive directly
          var got = 0;
          var p = Promise.resolve();
          msgs.forEach(function (m) {
            p = p.then(function () { return receiveOne(m).then(function (x) { if (x) got++; }); });
          });
          return p.then(function () {
            STATE.synced = got;
            countLocal();
            return { ok: true, synced: got };
          });
        });
      });
    }).catch(function () {
      STATE.remote = "local-only (hub unreachable/CORS)";
      STATE.synced = 0;
      return { ok: false, reason: "network" };
    });
  }
  function refreshAll() {
    STATE.rejected = 0;
    function finish(r) {
      countLocal();
      return r;
    }
    return loadCache().then(function () {
      if (!rklowdEnabled()) {
        if (root.RMAIL_PUBLIC_INDEX) return fetchPublicIndex();
        STATE.remote = "local-only";
        return { ok: false, reason: "local-only" };
      }
      return fetchInboxHubs().then(function (r) {
        if (r && r.ok) return r;
        if (root.RMAIL_PUBLIC_INDEX) return fetchPublicIndex();
        if (tokenFromBridge()) return fetchRklowdListObj();
        if (r && r.reason) STATE.remote = "local-only (" + r.reason + ")";
        else STATE.remote = STATE.remote || "local-only";
        return r || { ok: false, reason: "local-only" };
      });
    }).then(finish).finally(paintBanner);
  }
  function bindHubRetries() {
    if (root.__rmailHubRetry) return;
    root.__rmailHubRetry = 1;
    try { root.addEventListener("online", function () { refreshAll(); }); } catch (e) {}
    try { root.addEventListener("focus", function () { refreshAll(); }); } catch (e) {}
    try {
      if (root.document) root.document.addEventListener("visibilitychange", function () {
        if (!root.document.hidden) refreshAll();
      });
    } catch (e) {}
    try { root.setInterval(function () { refreshAll(); }, 30000); } catch (e) {}
  }
  function bindClicks() {
    if (!root.document || !root.document.addEventListener) return;
    root.document.addEventListener("click", function (e) {
      var t = e.target && e.target.closest && e.target.closest("[data-nokey]");
      if (!t) return;
      var a = t.getAttribute("data-nokey");
      if (a === "open-rmail") { e.preventDefault(); openShared(); }
      if (a === "refresh") { e.preventDefault(); refreshAll(); }
    }, true);
    root.document.addEventListener("click", function (e) {
      var hit = e.target && e.target.closest && e.target.closest('.csp-msgbtn,[data-a="dm"],[data-rmail],[data-a="nav"][data-n="msgs"],[data-a="wallet"],.csp-bw');
      if (!hit) return;
      setTimeout(function () {
        ensurePublicIdentity();
        paintBanner();
        if (root.RMAIL_UI && root.RMAIL_UI.draw) try { root.RMAIL_UI.draw(); } catch (err) {}
      }, 80);
    }, true);
  }
  function boot() {
    ensurePublicIdentity();
    countLocal();
    bindClicks();
    paintBanner();
    bindHubRetries();
    refreshAll();
    if (typeof root.MutationObserver === "function" && root.document && root.document.documentElement) {
      try {
        var obs = new root.MutationObserver(function () {
          if (root.document.getElementById("rmail-ui") && !root.document.getElementById("rmail-nokey-banner")) paintBanner();
        });
        obs.observe(root.document.documentElement, { childList: true, subtree: true });
      } catch (e) {}
    }
  }

  var api = {
    v: 2,
    mode: "nokey",
    owner: { handle: OWNER_HANDLE, rid: OWNER_RID, publicAddress: OWNER_ADDR },
    status: function () { countLocal(); return Object.assign({}, STATE); },
    open: openShared,
    refresh: refreshAll,
    normalizePublicMsg: normalizePublicMsg, // test seam
    persistedIds: function () { return Object.keys(persistedIds()); },
    isOwnerTarget: isOwnerTarget,
    isBlock4OrAuthority: isBlock4OrAuthority,
    canEnroll: function () { return false; },
    canSign: function () { return false; },
    canSealChain: function () { return false; },
    // Suggested native contract (RDRAGON implements; JS already consumes):
    // GET /api/rmail/public?addr=BwpVNk1Rtncpv5HMTLwxB4Yfjkfv6mFaBQUTpjneH1F9
    // -> {ok:true, public:true, addr, messages:[{kind:"rmail",id,from,from_addr,to,to_addr,text,ts,verified:false,...}]}
    suggestedPublicApi: "/api/rmail/public?addr=" + encodeURIComponent(OWNER_ADDR)
  };
  ensurePublicIdentity();
  countLocal();
  root.RMAIL_NOKEY = api;
  if (root.document && root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", boot);
  else setTimeout(boot, 0);
})(typeof window !== "undefined" ? window : globalThis);
