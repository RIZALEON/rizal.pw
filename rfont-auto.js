/* rfont-auto.js — RFONT feed auto-update for rizal.pw
   Staging only (2026-11-25). Fetches /fonts/rfont-feed.json network-first,
   falls back to the rfont-feed cache offline. If the feed version differs
   from the last seen version, loads the new faces with the FontFace API so
   the page can switch without a full HTML redeploy. Bots never sign the feed.
*/
(function (root) {
  var FEED = "/fonts/rfont-feed.json";
  var KEY = "rfont-feed-version";
  var CACHE = "rfont-feed";

  function loadFeed() {
    return fetch(FEED, { cache: "no-cache", credentials: "same-origin" })
      .then(function (r) {
        if (!r.ok) throw new Error("feed " + r.status);
        if (root.caches) {
          var clone = r.clone();
          caches.open(CACHE).then(function (c) { return c.put(FEED, clone); }).catch(function () {});
        }
        return r.json();
      })
      .catch(function () {
        if (!root.caches) return Promise.reject(new Error("feed unavailable"));
        return caches.open(CACHE).then(function (c) {
          return c.match(FEED, { ignoreSearch: true });
        }).then(function (h) {
          if (!h) throw new Error("feed offline");
          return h.json();
        });
      });
  }

  function decide(prev, feed) {
    if (!feed || feed.schema !== "rfont-feed-v1" || !feed.version) {
      return { action: "ignore", reason: "bad-feed" };
    }
    if (prev == null || prev === "") {
      return { action: "seed", version: feed.version };
    }
    if (prev === feed.version) {
      return { action: "keep", version: feed.version };
    }
    return { action: "update", version: feed.version, previous: prev };
  }

  function primarySrc(feed) {
    var files = (feed.files || []).filter(function (f) { return f.role === "primary"; });
    files.sort(function (a, b) {
      return (a.format === "woff2" ? 0 : 1) - (b.format === "woff2" ? 0 : 1);
    });
    return files.map(function (f) {
      var fmt = f.format === "woff2" ? "woff2" : "truetype";
      return 'url("' + f.url + '") format("' + fmt + '")';
    }).join(", ");
  }

  function remember(version) {
    try { root.localStorage.setItem(KEY, version); } catch (e) {}
  }

  function readPrev() {
    try { return root.localStorage.getItem(KEY); } catch (e) { return null; }
  }

  function cacheUrls(urls) {
    if (!root.caches || !urls || !urls.length) return;
    caches.open(CACHE).then(function (c) {
      urls.forEach(function (u) { c.add(u).catch(function () {}); });
    }).catch(function () {});
  }

  function loadFaces(feed) {
    var src = primarySrc(feed);
    if (!src || typeof root.FontFace !== "function" || !root.document || !root.document.fonts) {
      return Promise.resolve({ loaded: false, reason: "no-fontface" });
    }
    var families = feed.families || ["RIZAL", "RIZAL Mono", "RFONT"];
    var ops = families.map(function (fam) {
      var face = new FontFace(fam, src, { weight: "100 900", style: "normal", display: "swap" });
      return face.load().then(function (f) { root.document.fonts.add(f); return fam; });
    });
    (feed.fallbacks || []).forEach(function (fb) {
      var files = fb.files || [];
      if (!files.length) return;
      files = files.slice().sort(function (a, b) {
        return (a.format === "woff2" ? 0 : 1) - (b.format === "woff2" ? 0 : 1);
      });
      var fsrc = files.map(function (f) {
        var fmt = f.format === "woff2" ? "woff2" : "truetype";
        return 'url("' + f.url + '") format("' + fmt + '")';
      }).join(", ");
      var ur = fb.unicode_range;
      (fb.families || []).forEach(function (fam) {
        var opts = { weight: "400", style: "normal", display: "swap" };
        if (ur) opts.unicodeRange = ur;
        var face = new FontFace(fam, fsrc, opts);
        ops.push(face.load().then(function (f) { root.document.fonts.add(f); return fam; }).catch(function () {}));
      });
    });
    var urls = (feed.files || []).concat([]).map(function (f) { return f.url; }).filter(Boolean);
    (feed.fallbacks || []).forEach(function (fb) {
      (fb.files || []).forEach(function (f) { if (f.url) urls.push(f.url); });
    });
    cacheUrls(urls);
    return Promise.all(ops).then(function () { return { loaded: true, version: feed.version }; });
  }

  function apply(feed) {
    var prev = readPrev();
    var d = decide(prev, feed);
    if (d.action === "ignore") return Promise.resolve(d);
    if (d.action === "keep" || d.action === "seed") {
      remember(feed.version);
      return Promise.resolve(d);
    }
    return loadFaces(feed).then(function (r) {
      remember(feed.version);
      d.loaded = !!(r && r.loaded);
      return d;
    });
  }

  function start() {
    return loadFeed().then(apply).catch(function () { return { action: "error" }; });
  }

  var api = {
    FEED: FEED,
    KEY: KEY,
    CACHE: CACHE,
    loadFeed: loadFeed,
    decide: decide,
    apply: apply,
    start: start,
    primarySrc: primarySrc
  };
  root.RfontAuto = api;
  if (root.document && !root.RFONT_AUTO_NO_START) {
    if (root.document.readyState === "loading") {
      root.document.addEventListener("DOMContentLoaded", function () { start(); });
    } else {
      start();
    }
  }
})(typeof window !== "undefined" ? window : globalThis);
