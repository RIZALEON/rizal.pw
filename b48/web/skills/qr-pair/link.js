/* qr-pair 0.2.0 · link.js · LINK commands (add-only on top of qr-pair 0.1.1). Data-only egg skill, rzl.v1. UNSIGNED until Rizal signs.
 * Commands: link · link <pair link> · link status · link sync [<offer bundle json>] · link peers · link help
 * Rule set ("ALIGNMENT LOCK"): once two apps are paired through qr or link they must stay on the same
 *   build · manual version · update number · commands · functions (components) · eggs.
 * Each app checks the other (both directions, every link / link status). The Neo is the reference version.
 * A paired app may PASS a newer SIGNED egg or manual to a peer. The peer only turns it into a Decider proposal after:
 *   trust-list signer + ed25519/p256 signature over rlab-update-v1 message + size + sha256 + strictly newer (never a downgrade).
 * NEVER: install by itself, accept unsigned, accept a downgrade, hold or read a key, touch the network, change a build number. */
(function (root, factory) { var m = factory(root); if (typeof module === 'object' && module.exports) module.exports = m; else root.DS_LINK = m; })(typeof self !== 'undefined' ? self : globalThis, function (root) {
  'use strict';
  var VERSION = 'qr-pair 0.2.5 link', SCHEMA = 'rzl.link.v1';
  var Q = root.DS_QRPAIR || (typeof require === 'function' ? require('./qr-pair.js') : null);
  var FIELDS = ['build', 'manual', 'updates', 'commands', 'functions', 'eggs'];
  function vcmp(a, b) { var x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (var i = 0; i < Math.max(x.length, y.length); i++) { var d = (x[i] || 0) - (y[i] || 0); if (d) return d < 0 ? -1 : 1; } return 0; }
  function isNeo(x) { return x && (x.keyId === 'e5833fdfbbfe' || /\bneo\b/i.test(x.device || '')); }
  function manualOf(s) { return s.manual && s.manual.version ? String(s.manual.version) : null; }
  function updatesOf(s) { return s.updateSeq !== undefined && s.updateSeq !== null ? String(s.updateSeq) : null; }

  // link block rides inside the qr payload (covered by the same device signature)
  async function linkBlock(state) {
    var f = await Q.fingerprint(state);
    return { v: SCHEMA, lock: true, manual: manualOf(state), manualId: (state.manual && state.manual.id) || null, updates: updatesOf(state),
             reference: isNeo(state) ? 'self' : 'neo', fpFunctions: f.components.slice(0, Q.FP_LEN),
             eggs: (state.eggs || []).map(function (g) { return { id: g.id, version: String(g.version) }; }) };
  }
  async function makeLinkPayload(state, ctx) {
    ctx = ctx || {};
    var p = await Q.makePayload(state, { keyId: ctx.keyId, now: ctx.now });   // unsigned first
    p.link = await linkBlock(state);
    if (ctx.store && ctx.store.get('link.shared')) p.link.shared = ctx.store.get('link.shared');   // 0.2.3
    delete p.sig;
    if (typeof ctx.signer === 'function') { if (!p.keyId) throw new Error('signer present but ctx.keyId missing'); var s = await ctx.signer(Q.signedBytes(p)); p.sig = { alg: s.alg, b64: s.sig }; } else p.sig = null;
    return p;
  }

  // one row per locked field: SAME / AHEAD (I am newer: I may offer) / BEHIND (I need a signed egg/manual) / REBUILD (binary) / UNKNOWN
  async function align(local, localKeyId, peer) {
    var lf = await Q.fingerprint(local), pl = peer.link || {}, rows = [];
    var L = { device: local.device || (local.platform === 'macos' ? 'Neo' : local.platform === 'ios' ? 'iPhone 17e' : local.app), keyId: localKeyId, version: String(local.version), build: String(local.build) };
    var localIsRef = isNeo(L) && !isNeo(peer) ? true : (isNeo(peer) && !isNeo(L) ? false : vcmp(L.version + '.' + L.build, peer.version + '.' + peer.build) >= 0);
    function row(f, state, why, fix) { rows.push({ field: f, state: state, why: why, fix: fix || '' }); }
    var vb = vcmp(L.version, peer.version) || vcmp(L.build, peer.build);
    /* 0.2.3 (Rizal 3:35 AM MT): same version + different native build → ALIGN (lockable); different version → REBUILD */
    var vv = vcmp(L.version, peer.version), bst = vb === 0 ? 'SAME' : vv === 0 ? 'ALIGN' : 'REBUILD';
    row('build', bst, 'native build ' + L.version + ' (' + L.build + ') vs ' + peer.version + ' (' + peer.build + ')', bst === 'SAME' ? '' : bst === 'ALIGN' ? 'same version: an attested lock adopts one shared link version/build on both sides; the native CFBundle build stays until a Rizal-approved rebuild' : 'version differs: needs a Rizal-approved rebuild of ' + (vv < 0 ? 'this app' : 'the peer'));
    function numRow(f, a, b, what) {
      if (a === null || b === null || b === undefined) return row(f, 'UNKNOWN', (a || 'not declared') + ' vs ' + (b || 'not declared'), 'declare it in state.json (' + what + ')');
      var c = vcmp(a, b); row(f, c === 0 ? 'SAME' : c > 0 ? 'AHEAD' : 'BEHIND', a + ' vs ' + b, c === 0 ? '' : c > 0 ? 'link sync: offer my signed ' + f + ' to the peer' : 'link sync: ask the peer for its signed ' + f);
    }
    numRow('manual', manualOf(local), pl.manual === undefined ? undefined : pl.manual, 'manual.version');
    numRow('updates', updatesOf(local), pl.updates === undefined ? undefined : pl.updates, 'updateSeq');
    function fpRow(f, a, b, n1, n2) { var same = b && a.slice(0, b.length) === b; row(f, same ? 'SAME' : 'DIFFERENT', same ? 'same ' + a.slice(0, 12) : a.slice(0, 12) + ' vs ' + String(b || '?').slice(0, 12) + ' (' + n1 + ' vs ' + (n2 === undefined ? '?' : n2) + ')', same ? '' : 'link sync: the ' + (localIsRef ? 'peer takes the Neo/reference set from me' : 'reference (' + peer.device + ') passes its signed eggs to me')); }
    fpRow('commands', lf.commands, peer.fp && peer.fp.commands, (local.commands || []).length, (peer.counts || {}).commands);
    fpRow('functions', lf.components, pl.fpFunctions || (peer.fp && peer.fp.components), (local.components || []).length, (peer.counts || {}).components);
    fpRow('eggs', lf.eggs, peer.fp && peer.fp.eggs, (local.eggs || []).length, (peer.counts || {}).eggs);
    var locked = rows.every(function (r) { return r.state === 'SAME' || r.state === 'ALIGN'; });
    return { rows: rows, locked: locked, reference: localIsRef ? L.device + ' (this device)' : peer.device + ' (peer)', localIsRef: localIsRef, peerLinkAware: !!peer.link };
  }
  function alignText(title, a, verify) {
    var o = [title];
    if (verify) o.push('signer: ' + (verify.ok ? 'PASS trusted ' + verify.payload.keyId : 'FAIL ' + verify.reasons.join('; ')));
    if (!a.peerLinkAware) o.push('note: peer runs qr-pair < 0.2.0 (no link block): manual/updates UNKNOWN until it gets 0.2.0');
    a.rows.forEach(function (r) { o.push(r.state + '  ' + r.field + ': ' + r.why + (r.fix ? '  → ' + r.fix : '')); });
    o.push('reference: ' + a.reference + ' (Neo is the reference version)');
    o.push(a.locked ? 'LOCKED: same build, manual, update number, commands, functions and eggs.' : 'DRIFT: not aligned. Run link sync. Only SIGNED, NEWER eggs/manuals are passed; each becomes a Face ID / Touch ID proposal. Build drift needs a rebuild.');
    return o.join('\n');
  }

  // incoming offers. bundle = { from: keyId, offers: [ { entry: <signed rlab-update-v1 appcast entry>, bytesB64 } ] }
  // kind 'egg' → current = installed egg version; kind 'manual' → current = state.manual.version
  async function receive(bundle, local, trust, peers) {
    var out = [];
    if (!bundle || !Array.isArray(bundle.offers)) return [{ verdict: 'refuse', why: ['not a link offer bundle'] }];
    if (!peers[bundle.from]) return [{ verdict: 'refuse', why: ['sender ' + bundle.from + ' is not a paired peer: pair with qr or link first'] }];
    for (var i = 0; i < bundle.offers.length; i++) {
      var o = bundle.offers[i], e = o.entry || {}, why = [];
      if (e.kind !== 'egg' && e.kind !== 'manual') { out.push({ id: e.id, verdict: 'refuse', why: ['kind ' + e.kind + ' not allowed over link (eggs and manuals only)'] }); continue; }
      if (!e.sig && !e.ed25519) { out.push({ id: e.id, version: e.version, verdict: 'refuse', why: ['UNSIGNED: refused (never unsigned)'] }); continue; }
      var cur = e.kind === 'manual' ? manualOf(local) : ((local.eggs || []).filter(function (g) { return g.id === e.id; }).map(function (g) { return g.version; })[0] || null);
      var ent = Object.assign({}, e, { alg: e.alg || (e.ed25519 ? 'ed25519' : e.alg), sig: e.sig || e.ed25519, keyId: e.keyId || bundle.keyId });
      var bytes = o.bytesB64 ? (typeof Buffer !== 'undefined' ? new Uint8Array(Buffer.from(o.bytesB64, 'base64')) : Uint8Array.from(atob(o.bytesB64), function (c) { return c.charCodeAt(0); })) : null;
      var ev = await Q.evaluateOffer(ent, bytes, cur, trust);
      if (ev.proposal) { ev.proposal.kind = e.kind + '-install'; ev.proposal.via = 'link from ' + peers[bundle.from].device; ev.proposal.replaces = cur; }
      out.push({ id: e.id, kind: e.kind, version: e.version, current: cur, verdict: ev.verdict, why: ev.why, proposal: ev.proposal });
    }
    return out;
  }
  // outgoing: from my local SIGNED catalog (ctx.catalog = [{entry, bytesB64}]) pick what each peer is behind on
  function outgoing(catalog, peerRec, keyId) {
    var pe = {}; (peerRec.eggs || []).forEach(function (g) { pe[g.id] = g.version; });
    var offers = (catalog || []).filter(function (c) { var e = c.entry || {}; if (!(e.sig || e.ed25519)) return false;
      if (e.kind === 'manual') return peerRec.link && peerRec.link.manual ? vcmp(e.version, peerRec.link.manual) > 0 : false;
      return e.kind === 'egg' && (!pe[e.id] || vcmp(e.version, pe[e.id]) > 0); });
    return { schema: 'rzl.link.offers.v1', from: keyId, offers: offers };
  }

  /* ---- qr-pair 0.2.1 (add-only): link-attest. No rebuild needed: the Neo's release key e5833fdfbbfe signs (Face ID via ЯCASKET)
   * an rlab-update-v1 message with kind 'link' covering sha256(canon(payload)) + both device ids. Accepted as SIGNED only if:
   * signature verifies against trust list seq 2 · every egg in the link matches a signed appcast entry · single-use nonce + supersede (0.2.5: no time limit). */
  var ATTEST_SCHEMA = 'rzl.link-attest.v1', ATTEST_PREFIX = 'RZLATT1:', ATTEST_KEY = 'e5833fdfbbfe', ATTEST_SEQ = '2', ATTEST_MAX_MS = 10 * 60 * 1000, ATTEST_SKEW_MS = 2 * 60 * 1000;
  var aenc = new TextEncoder();
  function slug(s) { return String(s || '?').replace(/[^A-Za-z0-9.-]+/g, '-'); }
  function devName(s) { return s.device || s.deviceName || (s.platform === 'macos' ? 'Neo' : s.platform === 'ios' ? 'iPhone 17e' : s.platform === 'android' ? 'Android' : null) || s.app; }
  function devId(s) { return slug(devName(s)) + '.' + slug(s.app); }
  /* 0.2.3: one shared link version/build for an attested pair; same inputs → same numbers on both sides */
  function deriveShared(local, pp, mine) {
    var pair = [devId(local), devId(pp)].sort().join('~'), ps = (pp.link && pp.link.shared) || null;
    if (ps && ps.pair === pair && (!mine || mine.pair !== pair || ps.n >= mine.n)) return Object.assign({}, ps, { adopted: true });
    if (mine && mine.pair === pair && (!ps || mine.n >= ps.n)) return mine;
    var n = Math.max(mine ? mine.n : 0, ps ? ps.n : 0) + 1, day = String(pp.ts || '').slice(0, 10).replace(/-/g, '');
    return { pair: pair, n: n, version: String(local.version) + '-L' + n, build: day + ('0' + n).slice(-2), at: pp.ts };
  }
  function sharedText(sh, local, peer) { return 'LINK VERSION ' + sh.version + ' (link build ' + sh.build + ') shared by both' + (sh.adopted ? ' (adopted from peer)' : '') + ' · native build ' + local.build + (peer ? ' / peer ' + peer.build : '') + ' (CFBundle: unchanged until a rebuild)'; }
  function attestName(p, to) { return devId(p) + '~' + devId(to) + '.link'; }
  function b64uDec(s) { s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return typeof Buffer !== 'undefined' ? Buffer.from(s, 'base64').toString('utf8') : decodeURIComponent(escape(atob(s))); }
  function b64uEnc(s) { var b = typeof Buffer !== 'undefined' ? Buffer.from(s, 'utf8').toString('base64') : btoa(unescape(encodeURIComponent(s))); return b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  // what the Neo hands rlab-phone-sign-egg: one unsigned rlab-update-v1 entry per link (kind 'link'); to = receiving device {device, app}
  async function attestEntry(p, to) {
    var bytes = aenc.encode(Q.canon(p));
    return { kind: 'link', id: 'link-attest', version: p.nonce, name: attestName(p, to), size: bytes.length, sha256: await Q.sha256(Q.canon(p)), keyId: ATTEST_KEY, alg: 'ed25519' };
  }
  function attestMessage(e) { return 'rlab-update-v1\n' + e.kind + '\n' + e.id + '\n' + e.version + '\n' + e.name + '\n' + e.size + '\n' + String(e.sha256).toLowerCase(); }
  function encodeAttest(att) { return ATTEST_PREFIX + b64uEnc(Q.canon(Object.assign({ v: ATTEST_SCHEMA }, att))); }
  function decodeAttest(t) { t = String(t || '').trim(); if (t.indexOf(ATTEST_PREFIX) !== 0) return null; try { return JSON.parse(b64uDec(t.slice(ATTEST_PREFIX.length))); } catch (e) { return null; } }
  /* 0.2.2 (add-only, egg-only): hosts pass no ctx.appcast (native call sites), so the egg loads its own signed snapshot
   * skills/qr-pair/appcast-signed.json (every entry re-verified here against the trust list) unless the host passes ctx.appcast. */
  var SELF_EGG = '0.2.5', SNAP = null;
  async function loadAppcast(ctx) {
    if (ctx && Array.isArray(ctx.appcast)) return ctx.appcast; if (SNAP) return SNAP;
    try { if (typeof module === 'object' && module.exports && typeof require === 'function' && typeof __dirname === 'string') SNAP = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, 'appcast-signed.json'), 'utf8')).eggs;
          else { var r = await fetch('./skills/qr-pair/appcast-signed.json', { cache: 'no-store' }); SNAP = (await r.json()).eggs; } } catch (e) { SNAP = []; }
    return SNAP || [];
  }
  async function verifyAttest(p, att, local, trust, appcast, now) {
    var why = [];
    if (!att) return { ok: false, why: ['no link-attest'] };
    if (att.v !== ATTEST_SCHEMA || att.kind !== 'link' || att.id !== 'link-attest') why.push('not a rzl.link-attest.v1 kind link entry');
    if (att.keyId !== ATTEST_KEY) why.push('attest signer ' + att.keyId + ' is not the release key ' + ATTEST_KEY);
    if (!trust || String(trust.seq) !== ATTEST_SEQ) why.push('trust list seq ' + (trust && trust.seq) + ' (needs seq ' + ATTEST_SEQ + ')');
    if (att.version !== p.nonce) why.push('attest is for another link (nonce)');
    if (att.name !== attestName(p, local)) why.push('attest names ' + att.name + ', not this pair ' + attestName(p, local));
    var t = Date.parse(p.ts), n = now || Date.now();
    if (!(t > 0)) why.push('bad link timestamp'); else if (t - n > ATTEST_SKEW_MS) why.push('link timestamp in the future');
    var ev = await Q.evaluateOffer({ kind: 'link', id: att.id, version: att.version, name: att.name, size: att.size, sha256: att.sha256, keyId: att.keyId, alg: att.alg || 'ed25519', sig: att.sig || '' }, aenc.encode(Q.canon(p)), null, trust);
    ev.why.forEach(function (w) { why.push(/sha256|size/.test(w) ? 'link payload was changed after signing (' + w + ')' : w); });
    // eggs the peer claims must each be a SIGNED appcast entry (same id + version, signature checked)
    var eggs = (p.link && p.link.eggs) || [], ac = (appcast || []).map(function (x) { return x.entry || x; });
    for (var i = 0; i < eggs.length; i++) {
      var g = eggs[i]; if (g.id === 'qr-pair' && String(g.version) === SELF_EGG) continue;   // this egg itself: signed after the snapshot; the Face ID attestation covers it
      var e = ac.filter(function (x) { return x.kind === 'egg' && x.id === g.id && String(x.version) === String(g.version); })[0];
      if (!e) { why.push('egg ' + g.id + ' ' + g.version + ' has no signed appcast entry'); continue; }
      var ee = Object.assign({}, e, { alg: e.alg || 'ed25519', sig: e.sig || e.ed25519, keyId: e.keyId || ATTEST_KEY });
      var r = await Q.evaluateOffer(ee, null, null, trust);
      if (r.why.some(function (w) { return /signature|not in trust/.test(w); })) why.push('appcast entry for ' + g.id + ' ' + g.version + ' does not verify');
    }
    return { ok: why.length === 0, why: why };
  }

  async function handle(line, ctx) {
    var raw = String(line || '').trim().replace(/^\/+/, ''), a = raw.split(/\s+/), sub = (a[1] || '').toLowerCase();
    if (a[0].toLowerCase() !== 'link') return null;
    var store = ctx.store || Q.memStore(), state = ctx.state, peers = store.get('link.peers') || {};
    if (!sub) {
      var p = await makeLinkPayload(state, Object.assign({}, ctx, { store: store })), t = Q.encode(p), q = Q.qrSvg(t);
      return { text: 'LINK for ' + p.device + ' · ' + p.app + ' ' + p.version + ' (' + p.build + ') · manual ' + (p.link.manual || 'not declared') + ' · updates ' + (p.link.updates || 'not declared') + (p.sig ? ' · signed ' + p.keyId : ' · UNSIGNED (no device signer in this build: peers will refuse to lock)') + '\nScan with the other device or paste into its chat, then type link there:\n' + t, svg: q.svg, payload: t };
    }
    if (sub === 'help') return { text: ['LINK commands (qr-pair 0.2.5):', 'link · show this app\'s LINK QR / link (same as qr plus manual + update number)', 'link <pair link> · verify the peer, store it, print the LOCK report (both directions: then show your link back)', 'link status · re-check every linked peer: SAME / AHEAD / BEHIND / DIFFERENT / REBUILD per field', 'link sync · list what I must offer each peer and what I must ask for', 'link sync <offer bundle json> · check signed eggs/manuals a peer passed me → Decider proposals (never unsigned, never a downgrade, never auto-install)', 'link peers · list linked peers', 'link help · this list. Lesson: L064 ALIGNMENT LOCK.'].join('\n') };
    if (sub === 'peers') return { text: Object.keys(peers).map(function (k) { var x = peers[k]; return k + '  ' + x.device + '  ' + x.app + ' ' + x.version + ' (' + x.build + ')  manual ' + ((x.link || {}).manual || '?') + '  updates ' + ((x.link || {}).updates || '?') + '  ' + (x.locked ? 'LOCKED' : 'DRIFT') + (x.shared ? '  link ' + x.shared.version + ' (' + x.shared.build + ')' : '') + '  last ' + x.lastSeen; }).join('\n') || 'link: no linked peers. Type link on one app and paste its link into the other.' };
    if (sub === 'status' || sub === 'check') {
      var shS = store.get('link.shared'), shLine = shS ? sharedText(shS, state) : 'link version: none yet (needs an attested LOCK) · native build ' + state.build;
      var ids = Object.keys(peers); if (!ids.length) return { text: shLine + '\nlink status: no linked peers.' };
      var out = [];
      for (var i = 0; i < ids.length; i++) { var r = peers[ids[i]], al = await align(state, ctx.keyId, Object.assign({ keyId: ids[i] }, r)); r.locked = al.locked; out.push(alignText('LINK STATUS vs ' + r.device + ' (record ' + r.lastSeen + '; fresh link for a live check)', al)); }
      store.set('link.peers', peers); return { text: shLine + '\n\n' + out.join('\n\n') };
    }
    if (sub === 'sync') {
      var arg = raw.replace(/^link\s+sync\s*/i, '');
      if (arg) { var b; try { b = JSON.parse(arg); } catch (x) { return { text: 'link sync: paste a rzl.link.offers.v1 bundle as JSON' }; }
        var res = await receive(b, state, ctx.trust, peers);
        return { text: res.map(function (x) { return (x.verdict === 'propose' ? 'PROPOSAL ' : 'REFUSED  ') + (x.kind || '') + ' ' + (x.id || '?') + ' ' + (x.version || '') + (x.current ? ' (have ' + x.current + ')' : '') + (x.verdict === 'propose' ? ': verified; Rizal confirms on this device with Face ID / Touch ID. NOT installed.' : ': ' + x.why.join('; ')); }).join('\n'), results: res }; }
      var ids2 = Object.keys(peers); if (!ids2.length) return { text: 'link sync: no linked peers.' };
      var lines = [], bundles = {};
      for (var j = 0; j < ids2.length; j++) { var pr = peers[ids2[j]], al2 = await align(state, ctx.keyId, Object.assign({ keyId: ids2[j] }, pr));
        var ob = outgoing(ctx.catalog, pr, ctx.keyId); bundles[ids2[j]] = ob;
        lines.push('SYNC with ' + pr.device + ': ' + (al2.locked ? 'already LOCKED' : al2.rows.filter(function (r) { return r.state !== 'SAME'; }).map(function (r) { return r.field + ' ' + r.state; }).join(', ')) + ' · I can pass ' + ob.offers.length + ' signed item(s)' + (ob.offers.length ? ': ' + ob.offers.map(function (o) { return o.entry.kind + ' ' + o.entry.id + ' ' + o.entry.version; }).join(', ') : '')); }
      return { text: lines.join('\n') + '\nSend a bundle to the peer and run link sync <bundle> there. Nothing is installed here.', bundles: bundles };
    }
    // link <pair link>
    var rest = raw.replace(/^link\s+/i, '').split(/\s+/), attTok = rest.filter(function (x) { return x.indexOf(ATTEST_PREFIX) === 0; })[0], linkTok = rest.filter(function (x) { return x.indexOf(ATTEST_PREFIX) !== 0; }).join('');
    var v = await Q.verifyPayload(linkTok, ctx.trust, { now: ctx.now, seen: store.get('link.seen') || {}, latest: store.get('link.latest') || {} });
    if (!v.ok && v.payload && attTok) { var only = v.reasons.every(function (x) { return /UNSIGNED|no signer keyId|not in trust list/.test(x); });
      var av = await verifyAttest(v.payload, decodeAttest(attTok), state, ctx.trust, await loadAppcast(ctx), ctx.now);
      if (av.ok && only) { v = { ok: true, signed: true, attested: true, reasons: [], payload: Object.assign({}, v.payload, { keyId: v.payload.keyId || ('att:' + devId(v.payload)) }) }; }
      else v.reasons = v.reasons.concat(av.why.map(function (w) { return 'link-attest: ' + w; })); }
    else if (!v.ok && v.payload && !attTok) v.reasons.push('no link-attest: ask the Neo for a Face ID attestation (RZLATT1:…) and paste it after the link');
    if (!v.payload) return { text: 'link: FAIL ' + v.reasons.join('; ') + '\n' + 'type link help for the commands' };
    if (v.ok) { var seen = store.get('link.seen') || {}; seen[v.payload.nonce] = 1; store.set('link.seen', seen); var ll = store.get('link.latest') || {}, dl = String(v.payload.device) + '|' + String(v.payload.app); if (!(Date.parse(ll[dl] || '') >= Date.parse(v.payload.ts))) ll[dl] = v.payload.ts; store.set('link.latest', ll); }
    var al3 = await align(state, ctx.keyId, v.payload);
    if (!v.ok) return { text: alignText('link: NOT LINKED (peer not stored, nothing locked)', al3, v), align: al3 };
    var pp = v.payload; peers[pp.keyId] = { device: pp.device, app: pp.app, platform: pp.platform, version: pp.version, build: pp.build, fp: pp.fp, counts: pp.counts || {}, link: pp.link || null, eggs: (pp.link && pp.link.eggs) || [], linkedAt: (peers[pp.keyId] || {}).linkedAt || pp.ts, lastSeen: pp.ts, locked: al3.locked };
    store.set('link.peers', peers);
    var qp = store.get('qr.peers') || {}; if (!qp[pp.keyId]) { qp[pp.keyId] = { device: pp.device, app: pp.app, platform: pp.platform, version: pp.version, build: pp.build, fp: pp.fp, counts: pp.counts || {}, pairedAt: pp.ts, lastSeen: pp.ts }; store.set('qr.peers', qp); }
    var shared = null, ghost = null;
    if (v.attested && al3.locked) { shared = deriveShared(state, pp, store.get('link.shared')); store.set('link.shared', shared); peers[pp.keyId].shared = shared; store.set('link.peers', peers);
      ghost = { event: 'link-locked', pair: shared.pair, n: shared.n, linkVersion: shared.version, linkBuild: shared.build, nativeBuild: String(state.build), peerNativeBuild: String(pp.build), nonce: pp.nonce, ts: new Date(ctx.now || Date.now()).toISOString() }; }
    if (shared) return { text: alignText('LINK REPORT with ' + pp.device + ' (attested)', al3, v) + '\n' + sharedText(shared, state, pp) + '\n\nBOTH WAYS: now type link here and paste it on ' + pp.device + '.', align: al3, shared: shared, ghost: ghost, offerBack: true };
    return { text: alignText('LINK REPORT with ' + pp.device, al3, v) + '\n\nBOTH WAYS: now type link here and scan/paste it on ' + pp.device + '.', align: al3, offerBack: true };
  }
  return { deriveShared: deriveShared, loadAppcast: loadAppcast, attestEntry: attestEntry, attestMessage: attestMessage, encodeAttest: encodeAttest, decodeAttest: decodeAttest, verifyAttest: verifyAttest, attestName: attestName, VERSION: VERSION, SCHEMA: SCHEMA, FIELDS: FIELDS, makeLinkPayload: makeLinkPayload, align: align, alignText: alignText, receive: receive, outgoing: outgoing, handle: handle };
});
