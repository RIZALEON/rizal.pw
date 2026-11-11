/* RKLOWD browser node "rklowd.pw" (20261104). Static, no secrets in this file.
   Hub API (PIPE/rscale/rklowd.py): GET {hub}/rklowd · GET {hub}/rklowd/list · GET {hub}/rklowd/obj/<sha256> · POST {hub}/rklowd/put {node,name,b64}
   Headers: X-RKLOWD-Node, Authorization: Bearer rbt_… (token only from localStorage). LAN hub URL only from localStorage. */
(function () {
  "use strict";
  var NODE_ID = "rklowd.pw", SLOT = "pw", LS = "rklowd.pw.", INAPP = "http://127.0.0.1:8799/rscale";
  var MAXO = 8000000; /* hub cap: rklowd.py MAXO = 8_000_000 bytes (decoded file), checked here before any upload */
  var $ = function (i) { return document.getElementById(i); };
  var cfg = function (k, d) { try { return localStorage.getItem(LS + k) || d; } catch (e) { return d; } };
  var setc = function (k, v) { try { v ? localStorage.setItem(LS + k, v) : localStorage.removeItem(LS + k); } catch (e) {} };
  var log = function (s) { var l = $("log"); if (l) l.textContent = new Date().toLocaleTimeString() + " " + s + "\n" + l.textContent.slice(0, 4000); };
  var status = function (s, bad) { var e = $("status"); if (e) { e.textContent = s; e.className = bad ? "bad" : "ok"; } log(s); };
  var enc = new TextEncoder();
  function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ("0" + b.toString(16)).slice(-2); }).join(""); }
  function sha256(data) { return crypto.subtle.digest("SHA-256", typeof data === "string" ? enc.encode(data) : data).then(hex); }
  function b64(u8) { var s = "", i; for (i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
  function hubs() {
    var h = [INAPP], lan = cfg("lan", ""), peers = cfg("peers", "");
    if (lan) h.push(lan.replace(/\/+$/, ""));
    peers.split(",").map(function (x) { return x.trim().replace(/\/+$/, ""); }).filter(Boolean).forEach(function (p) { if (h.indexOf(p) < 0) h.push(p); });
    return h;
  }
  function headers(json) {
    var h = { "X-RKLOWD-Node": SLOT }, t = cfg("tok", "");
    if (json) h["Content-Type"] = "application/json";
    if (/^rbt_/.test(t)) h.Authorization = "Bearer " + t;
    return h;
  }
  function tfetch(url, opt, ms) {
    var c = new AbortController(), t = setTimeout(function () { c.abort(); }, ms || 4000);
    opt = opt || {}; opt.signal = c.signal; opt.mode = "cors";
    return fetch(url, opt).finally(function () { clearTimeout(t); });
  }
  var HUB = null;
  function probe() {
    var list = hubs(), i = 0;
    function next() {
      if (i >= list.length) { HUB = null; show(); return Promise.resolve(null); }
      var u = list[i++];
      return tfetch(u + "/rklowd", { headers: headers(false) }, 8000).then(function (r) { if (!r.ok) throw 0; HUB = u; show(); return u; }).catch(next);
    }
    return next();
  }
  function show() { var e = $("hub"); if (!e) return; e.textContent = HUB ? HUB.replace(/^https?:\/\/(?!127\.0\.0\.1)[^/]+/, "lan-hub") : "offline (queueing)"; e.className = HUB ? "ok" : "bad"; }
  /* IndexedDB: store "q" = hash-chained put queue, store "o" = encrypted RMAIL outbox */
  var dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise(function (res, rej) {
      var r = indexedDB.open("rklowd.pw", 1);
      r.onupgradeneeded = function () { var d = r.result; d.createObjectStore("q", { keyPath: "seq" }); d.createObjectStore("o", { keyPath: "seq" }); d.createObjectStore("meta"); };
      r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); };
    });
    return dbp;
  }
  function tx(store, mode, fn) { return db().then(function (d) { return new Promise(function (res, rej) { var t = d.transaction(store, mode), s = t.objectStore(store), out; out = fn(s); t.oncomplete = function () { res(out instanceof IDBRequest ? out.result : out); /* 20261105: a missing key returns undefined, not the IDBRequest */ }; t.onerror = function () { rej(t.error); }; }); }); }
  function all(store) { return tx(store, "readonly", function (s) { return s.getAll(); }); }
  function append(store, rec) {
    return all(store).then(function (rows) {
      return tx("meta", "readonly", function (m) { return m.get(store + ".tip"); }).then(function (tip) {
        tip = tip || { seq: 0, sha: "0".repeat(64) };
        if (rows.length) { var last = rows[rows.length - 1]; if (last.seq >= tip.seq) tip = { seq: last.seq, sha: last.sha }; }
        rec.seq = tip.seq + 1; rec.prev = tip.sha; rec.node = NODE_ID; rec.t = new Date().toISOString();
        return sha256(JSON.stringify([rec.seq, rec.prev, rec.name, rec.content_sha, rec.t])).then(function (h) {
          rec.sha = h;
          return tx(store, "readwrite", function (s) { s.put(rec); }).then(function () { return tx("meta", "readwrite", function (m) { m.put({ seq: rec.seq, sha: rec.sha }, store + ".tip"); }); }).then(function () { return rec; });
        });
      });
    });
  }
  function verifyChain(rows) { /* checks seq/prev links among queued rows */
    for (var i = 1; i < rows.length; i++) if (rows[i].prev !== rows[i - 1].sha) return false; return true;
  }
  function counts() { all("q").then(function (r) { $("q").textContent = r.length; }); all("o").then(function (r) { $("o").textContent = r.length; }); }
  function putNow(name, b64data) {
    return tfetch(HUB + "/rklowd/put", { method: "POST", headers: headers(true), body: JSON.stringify({ node: SLOT, name: name, b64: b64data }) }, 120000)
      .then(function (r) { return r.json().then(function (j) { if (!r.ok || !j.ok) throw new Error((j && j.err) || ("HTTP " + r.status)); return j; }); });
  }
  function queuePut(name, u8) {
    return sha256(u8).then(function (cs) { return append("q", { kind: "put", name: name, content_sha: cs, b64: b64(u8) }); });
  }
  var flushing = false;
  function flush() {
    if (flushing) return Promise.resolve(); flushing = true;
    return probe().then(function (h) {
      if (!h) { all("q").then(function (r) { if (r.length) status("queued offline: " + r.length + " item(s) wait here until a hub is reachable", true); }); return; }
      return all("q").then(function (rows) {
        if (!verifyChain(rows)) log("warning: local queue chain broken, flushing anyway (hub re-hashes every object)");
        return rows.reduce(function (p, row) {
          return p.then(function () { status("uploading " + row.name + " (single request, " + row.b64.length + " B base64)…"); return putNow(row.name, row.b64).then(function (j) {
            if (j.sha256 !== row.content_sha) throw new Error("hub sha " + String(j.sha256).slice(0, 12) + " does not match " + row.name + "; kept queued");
            var to = j.offered_to || [];
            status("stored on hub " + row.name + " → " + j.sha256.slice(0, 12) + " · offered to " + to.length + " node(s)" + (to.length ? " (" + to.join(", ") + "); they receive it on their next sync" : "")); return tx("q", "readwrite", function (s) { s.delete(row.seq); });
          }); });
        }, Promise.resolve());
      }).then(function () {
        return all("o").then(function (rows) {
          return rows.reduce(function (p, row) {
            return p.then(function () { return openRow(row).then(function (pb) { return putNow(row.name, pb); }).then(function (j) { var to = j.offered_to || []; status("RMAIL sent: hub acked " + row.name + " → " + j.sha256.slice(0, 12) + " · offered to " + to.length + " node(s); recipients get it on their next sync"); return tx("o", "readwrite", function (s) { s.delete(row.seq); }); }); });
          }, Promise.resolve());
        });
      });
    }).catch(function (e) { status("upload stopped: " + e.message + " (item stays queued)", true); }).finally(function () { flushing = false; counts(); });
  }
  function putFile(f) {
    if (!f) return;
    if (f.size > MAXO) { status("refused before upload: " + f.name + " is " + f.size.toLocaleString() + " B, over the hub's " + MAXO.toLocaleString() + " B cap. Nothing was sent.", true); return; }
    var name = (f.name).replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 80);
    f.arrayBuffer().then(function (ab) { return queuePut(name, new Uint8Array(ab)); }).then(function (rec) { status("queued " + name + " (#" + rec.seq + ")"); return flush(); });
  }
  /* RMAIL: encrypted at rest in the outbox (AES-GCM, key non-extractable in this browser's IndexedDB).
     Delivered only to a reachable hub; the hub's rmail_rklowd bridge takes it from there. No public relays. */
  function outboxKey() {
    return tx("meta", "readonly", function (m) { return m.get("okey"); }).then(function (k) {
      if (k) return k;
      return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]).then(function (nk) { return tx("meta", "readwrite", function (m) { m.put(nk, "okey"); }).then(function () { return nk; }); });
    });
  }
  function rmail(from, subj, body) {
    var id = "pw" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    var msg = { id: id, to: "@chaserizal", from: String(from || "visitor").slice(0, 120), subject: String(subj || "").slice(0, 200), body: String(body || "").slice(0, 6000), ts: new Date().toISOString(), via: NODE_ID };
    var raw = enc.encode(JSON.stringify(msg));
    if (raw.length > 8192) { log("RMAIL 8 KB cap"); return Promise.resolve(); }
    return outboxKey().then(function (k) {
      var iv = crypto.getRandomValues(new Uint8Array(12));
      return crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, k, raw).then(function (ct) {
        /* stored encrypted; decrypted only at flush time, sent straight to the owner's hub */
        return sha256(raw).then(function (cs) { return append("o", { kind: "rmail", name: "rmail-" + id + ".json", content_sha: cs, iv: b64(iv), ct: b64(new Uint8Array(ct)) }); });
      });
    }).then(function (rec) { log("RMAIL queued (encrypted) " + rec.name); counts(); return flush(); });
  }
  function u8of(x) { return Uint8Array.from(atob(x), function (c) { return c.charCodeAt(0); }); }
  function openRow(r) { return outboxKey().then(function (k) { return crypto.subtle.decrypt({ name: "AES-GCM", iv: u8of(r.iv) }, k, u8of(r.ct)); }).then(function (pt) { return b64(new Uint8Array(pt)); }); }
  function list() {
    return probe().then(function (h) {
      if (!h) { $("files").textContent = "offline"; return; }
      return tfetch(h + "/rklowd/list", { headers: headers(false) }).then(function (r) { return r.json(); }).then(function (j) {
        $("files").textContent = (j.files || []).map(function (f) { return f.sha256.slice(0, 12) + "  " + f.size + "  " + f.name; }).join("\n") || JSON.stringify(j);
      });
    });
  }
  function get(sha) { return probe().then(function (h) { return tfetch(h + "/rklowd/obj/" + sha, { headers: headers(false) }).then(function (r) { return r.json(); }); }); }
  window.RKLOWD = { node: NODE_ID, maxBytes: MAXO, probe: probe, flush: function () { return flush(); }, put: function (n, t) { return queuePut(n, enc.encode(t)).then(function () { return flush(); }); }, get: get, list: list, rmail: rmail, hubs: hubs };
  document.addEventListener("DOMContentLoaded", function () {
    $("cfgLan").value = cfg("lan", ""); $("cfgPeers").value = cfg("peers", "");
    $("cfgSave").onclick = function () { setc("lan", $("cfgLan").value.trim()); setc("peers", $("cfgPeers").value.trim()); var t = $("cfgTok").value.trim(); if (t) setc("tok", t); $("cfgTok").value = ""; log("saved"); probe(); };
    $("cfgForget").onclick = function () { setc("tok", ""); log("token forgotten"); };
    $("put").onclick = function () { putFile($("file").files[0]); };
    $("list").onclick = list; $("flush").onclick = function () { flush(); };
    $("mSend").onclick = function () { rmail($("mFrom").value, $("mSubj").value, $("mBody").value).then(function () { $("mBody").value = ""; }); };
    counts(); flush();
  });
  window.addEventListener("online", function () { flush(); });
  setInterval(function () { if (!HUB) flush(); }, 30000);
})();
