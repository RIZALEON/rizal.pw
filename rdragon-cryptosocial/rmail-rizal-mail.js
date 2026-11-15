/* rmail-rizal-mail.js v2 20261114 — present messenger @chaserizal and traditional email @rizal.pw as distinct identities.
   Does not merge or rename the @chaserizal inbox. Public addresses only; no keys, no hub addresses in this file.
   Identities come from rmail-mailboxes.json (byte-identical mirror of RKLOWD nodes/pw/mailboxes/index.json) next to this script,
   or window.RMAIL_MAILBOXES_URL. Hubs come only from the page's own config (window.RMAIL_HUBS / window.RSCALE_RKLOWD_BASE). */
(function (root) {
  "use strict";
  if (root.RMAIL_RIZAL_MAIL && root.RMAIL_RIZAL_MAIL.v) return;
  var KEY = "rmail.identity";
  var BOX = "rmail.box";
  var defaults = [
    { kind: "messenger", id: "@chaserizal", label: "Messenger @chaserizal", role: "direct-message" },
    { kind: "email", id: "ghost@rizal.pw", label: "Email ghost@rizal.pw", mailbox: "ghost@rizal.pw", role: "traditional-email" }
  ];
  function J(k, d) { try { return JSON.parse(root.localStorage.getItem(k)) || d; } catch (e) { return d; } }
  function W(k, v) { try { root.localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function cur() { try { return root.localStorage.getItem(KEY) || "messenger"; } catch (e) { return "messenger"; } }
  function setCur(id) { try { root.localStorage.setItem(KEY, id); } catch (e) {} }
  function isEmail(id) { id = id || cur(); return !!(id && id !== "messenger" && id !== "@chaserizal"); }
  function identities() {
    var L = (root.RMAIL_IDENTITIES && root.RMAIL_IDENTITIES.length) ? root.RMAIL_IDENTITIES : defaults;
    return L;
  }
  function book() {
    root.RSOCIAL_BOOK = root.RSOCIAL_BOOK || {};
    identities().forEach(function (x) {
      if (x && x.kind === "email" && x.id) root.RSOCIAL_BOOK[x.id] = x.mailbox || x.id;
    });
  }
  function seat() {
    try { if (root.RDRAGON_SEAT) return String(root.RDRAGON_SEAT); } catch (e) {}
    return "neo-rdragon";
  }
  function hubs() {
    var list = [], seen = {};
    function add(u) {
      var b = String(u || "").replace(/\/rmail\/drop\/?$/, "").replace(/\/drop\?.*$/, "").replace(/\/+$/, "");
      if (!b || seen[b]) return;
      seen[b] = 1; list.push(b);
    }
    try { (root.RMAIL_HUBS || []).forEach(add); } catch (e) {}
    try { add(root.RSCALE_RKLOWD_BASE); } catch (e) {}
    return list;
  }
  function fetchJson(url) {
    var opt = { method: "GET", mode: "cors", cache: "no-store", headers: { "X-RDRAGON-Seat": seat() } };
    return fetch(url, opt).then(function (r) { return r.ok ? r.json() : null; }, function () { return null; });
  }
  function applyIdentities(j) {
    if (!j || !Array.isArray(j.identities) || !j.identities.length) return;
    root.RMAIL_IDENTITIES = j.identities;
    book();
  }
  var SELF = (function () { try { return root.document.currentScript && root.document.currentScript.src; } catch (e) { return ""; } })();
  function loadShared() {
    var u = root.RMAIL_MAILBOXES_URL;
    if (!u) { try { u = new URL("rmail-mailboxes.json", SELF || root.location.href).href; } catch (e) { u = "rmail-mailboxes.json"; } }
    return fetch(u, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }, function () { return null; })
      .then(function (j) { if (j && j.ok) { root.RMAIL_MAILBOXES = j.mailboxes || {}; applyIdentities(j); } }, function () {});
  }
  function storeEmail(addr, msgs) {
    var box = J(BOX, {});
    var prev = box[addr] || [];
    var seen = {};
    prev.forEach(function (m) { if (m && m.id) seen[String(m.id)] = m; });
    (msgs || []).forEach(function (m) { if (m && m.id) seen[String(m.id)] = m; });
    box[addr] = Object.keys(seen).map(function (k) { return seen[k]; }).sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
    W(BOX, box);
    return box[addr];
  }
  function refreshBoxes() {
    var chain = Promise.resolve();
    hubs().forEach(function (b) {
      chain = chain.then(function () {
        return fetchJson(b + "/rmail/boxes").then(function (j) { if (j && j.ok) applyIdentities(j); });
      });
    });
    return chain;
  }
  function refreshMailbox(addr) {
    addr = addr || cur();
    if (!isEmail(addr)) return Promise.resolve([]);
    var chain = Promise.resolve([]);
    hubs().forEach(function (b) {
      chain = chain.then(function (got) {
        if (got && got.length) return got;
        return fetchJson(b + "/rmail/inbox?mailbox=" + encodeURIComponent(addr)).then(function (j) {
          var msgs = (j && (j.messages || j.inbox)) || [];
          if (j && j.ok && Array.isArray(msgs)) return storeEmail(addr, msgs);
          return got || [];
        });
      });
    });
    return chain;
  }
  function emailFolders(addr) {
    var L = (J(BOX, {})[addr] || []).slice().sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
    var rd = J("rmail.read", {});
    var inbox = L.filter(function (m) { return String(m.to_addr || m.to || "") === addr; });
    var sent = L.filter(function (m) { return String(m.from_addr || m.from || "") === addr && String(m.to_addr || "") !== addr; });
    return {
      inbox: { n: "Inbox", l: inbox.length ? inbox : L, u: inbox.filter(function (m) { return !rd[m.id]; }).length },
      outbox: { n: "Outbox", l: [] },
      sent: { n: "Sent", l: sent },
      chat: { n: "Chat", l: [], u: 0 },
      verified: { n: "✔ Verified", l: L.filter(function (m) { return m.verified; }) },
      guest: { n: "Guest / unverified", l: L.filter(function (m) { return !m.verified; }) }
    };
  }
  function paintSwitcher() {
    var top = root.document.querySelector("#rmail-ui .rmu-top");
    if (!top) return;
    var old = root.document.getElementById("rmu-ids");
    if (old) old.remove();
    var wrap = root.document.createElement("div");
    wrap.id = "rmu-ids";
    wrap.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;width:100%;order:2;margin:6px 0 0";
    identities().forEach(function (x) {
      var id = x.id;
      var on = (id === cur()) || (!isEmail() && (id === "messenger" || id === "@chaserizal"));
      var b = root.document.createElement("button");
      b.type = "button";
      b.className = "rmu-btn" + (on ? "" : " p");
      b.textContent = x.label || id;
      b.title = (x.kind === "email" ? "Traditional email" : "Direct messenger") + " · " + id;
      b.addEventListener("click", function (e) {
        e.preventDefault(); e.stopPropagation();
        setCur(x.kind === "email" ? (x.mailbox || x.id) : "messenger");
        refreshMailbox(cur()).then(function () { if (root.RMAIL_UI && root.RMAIL_UI.draw) root.RMAIL_UI.draw(); });
      });
      wrap.appendChild(b);
    });
    top.style.flexWrap = "wrap";
    top.appendChild(wrap);
    var to = root.document.getElementById("rmu-to");
    if (to) {
      var dl = root.document.getElementById("rmu-to-ids");
      if (!dl) { dl = root.document.createElement("datalist"); dl.id = "rmu-to-ids"; to.setAttribute("list", "rmu-to-ids"); to.parentNode.appendChild(dl); }
      dl.innerHTML = identities().map(function (x) { return '<option value="' + String(x.id).replace(/"/g, "&quot;") + '">' + String(x.label || x.id) + "</option>"; }).join("");
      if (isEmail() && !to.value) to.value = cur();
    }
  }
  function hook() {
    book();
    if (!root.RMAIL_UI || root.RMAIL_UI._rizalIdentities) return;
    root.RMAIL_UI._rizalIdentities = true;
    var origFolders = root.RMAIL_UI.folders;
    var origDraw = root.RMAIL_UI.draw;
    if (typeof origFolders === "function") {
      root.RMAIL_UI.folders = function () {
        if (isEmail()) return emailFolders(cur());
        return origFolders.apply(this, arguments);
      };
    }
    if (typeof origDraw === "function") {
      root.RMAIL_UI.draw = function () {
        origDraw.apply(this, arguments);
        paintSwitcher();
      };
    }
    var nk = root.RMAIL_NOKEY;
    if (nk && typeof nk.refresh === "function" && !nk._rizalWrapped) {
      var origRefresh = nk.refresh.bind(nk);
      nk._rizalWrapped = true;
      nk.refresh = function () {
        return Promise.resolve(origRefresh()).then(function (r) {
          return refreshBoxes().then(function () { return refreshMailbox(cur()); }).then(function () { return r; });
        });
      };
    }
  }
  function boot() {
    book();
    hook();
    loadShared().then(refreshBoxes).then(function () { return isEmail() ? refreshMailbox(cur()) : null; });
    try { root.document.addEventListener("DOMContentLoaded", hook); } catch (e) {}
    try { root.setInterval(function () { hook(); var u = root.document.getElementById("rmail-ui"); if (u && u.querySelector(".rmu-top") && !root.document.getElementById("rmu-ids")) paintSwitcher(); }, 2000); } catch (e) {}
  }
  root.RMAIL_RIZAL_MAIL = { v: 2, current: cur, identities: identities, refresh: function () { return refreshBoxes().then(function () { return refreshMailbox(cur()); }); } };
  boot();
})(window);
