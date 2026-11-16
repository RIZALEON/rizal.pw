/* qr-pair 0.2.4 · qr-pair-host.js · add-only page dispatcher for ЯBOWZR / ЯBOT (Mac + iOS). Data-only, no eval, no network beyond
 * same-folder reads (./.overlay.json, ./BASE-COMMANDS.json, ./SHELL-FUNCTIONS.json, ./skills/qr-pair/trust.json).
 * Routes `qr…`, `link…`, `check` and pasted pair links to DS_QRPAIR.handle BEFORE the fixed BASE-COMMANDS reply, through the page's
 * existing async hook (window.RZL_NOTES.tryRespond, chained so notes-reader keeps working). Anything the page cannot read is UNKNOWN. */
(function () {
  'use strict';
  var VERSION = 'qr-pair 0.2.5 host', PFX = 'rzl.qrpair.';
  var store = { get: function (k) { try { return JSON.parse(localStorage.getItem(PFX + k)); } catch (e) { return null; } },
                set: function (k, v) { try { localStorage.setItem(PFX + k, JSON.stringify(v)); } catch (e) {} } };
  function mine(t) { t = String(t || '').trim(); if (/^\/?(qr|link)(\s|$)/i.test(t) || /^\/?check$/i.test(t)) return true;
    try { return !!(window.DS_QRPAIR && window.DS_QRPAIR.isPairText(t)); } catch (e) { return false; } }
  async function j(u) { try { var r = await fetch(u, { cache: 'no-store' }); if (!r.ok) return null; return await r.json(); } catch (e) { return null; } }
  function isIOS() { var n = navigator; return /iPhone|iPad|iPod/.test(n.userAgent) || (/Macintosh/.test(n.userAgent) && n.maxTouchPoints > 1); }
  function ids(x) { if (!x) return []; var a = Array.isArray(x) ? x : Object.keys(x).map(function (k) { return Object.assign({ id: k }, typeof x[k] === 'object' ? x[k] : {}); });
    var out = {}; a.forEach(function (c) { var id = c && (c.token || c.id || c.name || c.cmd); if (id) out[String(id).toLowerCase()] = 1; }); return Object.keys(out).sort(); }
  async function readState() {
    var ov = await j('./.overlay.json'), bc = await j('./BASE-COMMANDS.json'), sf = await j('./SHELL-FUNCTIONS.json'), unknown = [];
    var m = ov && /^([^()]+)\(([^)]+)\)/.exec(String(ov.base || ''));
    var app = /RBOWSER-web\.bundle|rbowzr-classic/.test(String(location.pathname)) ? 'ybot' : 'rbowzr';
    var st = { app: app, platform: isIOS() ? 'ios' : 'macos', device: isIOS() ? 'iPhone 17e' : 'Neo',
               version: m ? m[1] : 'UNKNOWN', build: m ? m[2] : 'UNKNOWN',
               commands: bc ? ids(bc.commands) : [], components: sf ? ids(sf.functions) : [],
               eggs: ov && Array.isArray(ov.eggs) ? ov.eggs.map(function (e) { return { id: e.id, version: String(e.version) }; }) : [] };
    if (!m) unknown.push('version/build (no ./.overlay.json base)'); if (!bc) unknown.push('commands (no ./BASE-COMMANDS.json)');
    if (!sf) unknown.push('functions (no ./SHELL-FUNCTIONS.json)'); if (!ov) unknown.push('eggs (no ./.overlay.json)');
    st.source = { overlayBuilt: ov ? ov.built : null, device: 'platform default (the page cannot read the device name)' };
    return { state: st, unknown: unknown };
  }
  var TRUST = null;
  async function run(text) {
    if (!window.DS_QRPAIR) return 'qr-pair: DS_QRPAIR not loaded on this page';
    var s = await readState(); if (!TRUST) TRUST = await j('./skills/qr-pair/trust.json');
    var r; try { r = await window.DS_QRPAIR.handle(text, { state: s.state, trust: TRUST, store: store, keyId: null }); } catch (e) { return 'qr-pair error: ' + (e && e.message || e); }
    if (r && r.ghost) { var g = store.get('ghost') || []; g.push(r.ghost); store.set('ghost', g.slice(-20)); }
    var head = s.unknown.length ? 'UNKNOWN: ' + s.unknown.join('; ') + '\n' : '';
    return head + (r && r.text ? r.text : 'qr-pair: no reply for that command');
  }
  function post(text, reply) {
    try { if (typeof seedTurn === 'function') { seedTurn('turn-user', text); seedTurn('turn-bot', reply); } } catch (e) {}
    try { if (typeof pushTurn === 'function') pushTurn('bot', reply); } catch (e) {}
    window.RZL_QRPAIR_LAST = reply;
  }
  function hook() {
    var prev = window.RZL_NOTES; if (prev && prev.__qrpair) return;
    var w = Object.assign({}, prev || {});
    w.__qrpair = VERSION;
    w.tryRespond = async function (text) {
      if (mine(text)) { var reply = await run(text); post(text, reply); return true; }
      return prev && typeof prev.tryRespond === 'function' ? prev.tryRespond(text) : false;
    };
    window.RZL_NOTES = w;
  }
  // 0.2.5: the bot-window skill (BOTWIN) runs before RZL_NOTES and sends non-/ text to the Heart; let qr/link/check/pair links through.
  function hookBotwin() { var B = window.RL_BOTWIN; if (!B || B.__qrpair || typeof B.handle !== 'function') return; var h = B.handle;
    B.handle = async function (text) { if (mine(text)) return false; return h.apply(this, arguments); }; B.__qrpair = VERSION; }
  function hookAll() { hook(); hookBotwin(); }
  hookAll(); document.addEventListener('DOMContentLoaded', hookAll); window.addEventListener('load', hookAll); setTimeout(hookAll, 1500); setTimeout(hookAll, 5000);
  window.RZL_QRPAIR_HOST = { VERSION: VERSION, readState: readState, run: run };
})();
