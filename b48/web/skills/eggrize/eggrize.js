/* eggrize 0.1.0 · EGGRIZE: restore any of Rizal's apps from ЯCASKET.
 * Law: add-only, never deletes · no secrets/keys · only items signed by release key e5833fdfbbfe on trust list seq 2
 * · every restore is a Decider proposal Rizal approves with Face ID / Touch ID · never auto-installs · no rebuilds. Lesson L065. */
(function (root, factory) { var m = factory(root); if (typeof module === 'object' && module.exports) module.exports = m; else root.DS_EGGRIZE = m; })(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';
  var VERSION = 'eggrize 0.1.0', KEY = 'e5833fdfbbfe', SEQ = '2';
  var APPS = { 'rbowzr': 'ЯBOWZR', 'rbowzr-test': 'ЯBOWZR TEST', 'ybot': 'ЯBOT', 'rcasket': 'ЯCASKET', 'dragonskull': 'DRAGON SKULL', 'rscribe': 'ЯSCRIBE' };
  var SECRET = /(secret|private|priv[-_]?key|\.key$|keys?[-_]tmp|token|password|passwd|recovery|seed[-_]?phrase|mnemonic|keychain|\.p12$|\.pem$|TestKeys|ipsw|gguf)/i;
  var subtle = root.crypto && root.crypto.subtle; var enc = new TextEncoder();
  function canon(v) { if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']'; if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(function (k) { return JSON.stringify(k) + ':' + canon(v[k]); }).join(',') + '}'; return JSON.stringify(v); }
  function hex(b) { return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
  function b64d(s) { if (typeof atob === 'function') { var r = atob(s), u = new Uint8Array(r.length); for (var i = 0; i < r.length; i++) u[i] = r.charCodeAt(i); return u; } return new Uint8Array(Buffer.from(s, 'base64')); }
  async function sha256(s) { return hex(await subtle.digest('SHA-256', typeof s === 'string' ? enc.encode(s) : s)); }
  function msgOf(e) { return 'rlab-update-v1\n' + e.kind + '\n' + e.id + '\n' + e.version + '\n' + e.name + '\n' + e.size + '\n' + String(e.sha256).toLowerCase(); }
  async function verifyEntry(e, trust) {
    var why = [];
    if (!trust || String(trust.seq) !== SEQ) why.push('trust list seq ' + (trust && trust.seq) + ' (needs seq ' + SEQ + ')');
    if (!e || !(e.ed25519 || e.sig)) { why.push('UNSIGNED: refused'); return { ok: false, why: why }; }
    if ((e.keyId || '') !== KEY) why.push('signed by ' + e.keyId + ', only release key ' + KEY + ' restores');
    var k = ((trust && trust.keys) || []).filter(function (x) { return x.keyId === KEY; })[0];
    if (!k || !k.ed25519) why.push('release key ' + KEY + ' not in trust list');
    if (!why.length) { try { var key = await subtle.importKey('raw', b64d(k.ed25519), { name: 'Ed25519' }, false, ['verify']);
      if (!(await subtle.verify({ name: 'Ed25519' }, key, b64d(e.ed25519 || e.sig), enc.encode(msgOf(e))))) why.push('signature does not verify'); } catch (x) { why.push('signature check failed: ' + x.message); } }
    return { ok: !why.length, why: why };
  }
  function scrub(o) { /* never carry secrets/keys: drop any key or path that looks like one */
    if (Array.isArray(o)) return o.filter(function (x) { return !(typeof x === 'string' && SECRET.test(x)); }).map(scrub);
    if (o && typeof o === 'object') { var r = {}; Object.keys(o).forEach(function (k) { if (SECRET.test(k)) return; var v = o[k]; if (typeof v === 'string' && SECRET.test(v) && /[\/\\]/.test(v)) return; r[k] = scrub(v); }); return r; }
    return o;
  }
  /* manifest is trusted only when its sha + size match a signed kind-egg entry id 'eggrize-manifest' */
  async function verifyManifest(m, signed, trust) {
    var why = [];
    if (!m || m.schema !== 'rzl.eggrize.manifest.v1') return { ok: false, why: ['no restore manifest'] };
    var body = canon(m), sha = await sha256(body), size = enc.encode(body).length;
    if (!signed) why.push('manifest UNSIGNED (needs ЯCASKET Face ID signature)');
    else { if (signed.id !== 'eggrize-manifest') why.push('signed entry is ' + signed.id + ', not eggrize-manifest');
      if (signed.sha256 !== sha) why.push('manifest changed after signing'); if (+signed.size !== size) why.push('manifest size differs');
      var v = await verifyEntry(signed, trust); why = why.concat(v.why); }
    return { ok: !why.length, why: why, sha256: sha, size: size };
  }
  function findApp(m, name) { var n = String(name || '').toLowerCase().replace(/[^a-zя0-9]/g, '');
    return (m.apps || []).filter(function (a) { return [a.key, a.name, a.bundleId].some(function (x) { return String(x || '').toLowerCase().replace(/[^a-zя0-9]/g, '') === n; }) || (n === 'rbowzrtest' && a.key === 'rbowzr-test'); })[0]; }
  async function planRestore(m, app, platform, trust, appcast) {
    var steps = [], refuse = [], items = [];
    var art = (app.artifacts || []).filter(function (a) { return a.platform === platform; });
    for (var i = 0; i < art.length; i++) { var a = art[i];
      if (!a.signedEntry) { refuse.push(a.kind + ' ' + a.path + ': no signed entry (refused, never unsigned)'); continue; }
      var v = await verifyEntry(a.signedEntry, trust); if (!v.ok) { refuse.push(a.path + ': ' + v.why.join('; ')); continue; }
      if (a.signedEntry.sha256 !== a.sha256) { refuse.push(a.path + ': sha differs from its signed entry'); continue; }
      items.push({ kind: a.kind, path: a.path, sha256: a.sha256 }); }
    var eggs = app.eggs || [];
    for (var j = 0; j < eggs.length; j++) { var g = eggs[j];
      var e = (appcast || []).filter(function (x) { return x.id === g.id && x.version === g.version && (!g.sha256 || x.sha256 === g.sha256); })[0];
      if (!e) { refuse.push('egg ' + g.id + ' ' + g.version + ': no signed appcast entry'); continue; }
      var ve = await verifyEntry(Object.assign({ kind: 'egg' }, e), trust); if (!ve.ok) { refuse.push('egg ' + g.id + ' ' + g.version + ': ' + ve.why.join('; ')); continue; }
      items.push({ kind: 'egg', id: g.id, version: g.version, sha256: e.sha256, name: e.name }); }
    if (platform === 'ios') {
      steps.push('iOS cannot let one app reinstall another, and a deleted app\'s data container is gone with it.');
      steps.push('1. EGGRIZE on the phone files a restore request; on the Neo `eggrize-neo restore ' + app.key + ' --platform ios` shows the plan.');
      steps.push('2. Rizal approves the restore with Face ID in ЯCASKET (one proposal).');
      steps.push('3. The Neo reinstalls the shell over USB: xcrun devicectl device install app --device <17e> "<signed IPA/.app from the manifest>" (signing profile must still be valid).');
      steps.push('4. Open the reinstalled app once: it takes the signed eggs + state snapshot from the casket as Decider proposals (Face ID).');
    } else {
      steps.push('Mac: the Neo copies the signed .app backup back with ditto into an EMPTY target only (add-only; an existing app is never overwritten, it gets restored beside it as "<name> (EGGRIZE).app").');
      steps.push('Then the signed eggs and state snapshot are offered as Decider proposals (Face ID / Touch ID).');
    }
    return { app: app.key, name: app.name, platform: platform, items: items, refused: refuse, steps: steps,
      proposal: { kind: 'restore', id: 'eggrize-' + app.key + '-' + platform, app: app.bundleId, version: app.version, build: app.build, items: items.length, needs: 'Face ID / Touch ID approval of a kind restore entry signed by ' + KEY, autoInstall: false } };
  }
  function snapshotOf(state) {
    state = state || {};
    return scrub({ schema: 'rzl.eggrize.snapshot.v1', app: state.app, name: state.name, platform: state.platform, device: state.device, version: state.version, build: state.build,
      eggs: (state.eggs || []).map(function (g) { return { id: g.id, version: g.version, sha256: g.sha256 }; }), commands: (state.commands || []).slice().sort(),
      skills: (state.skills || []).slice().sort(), manual: state.manual, updateSeq: state.updateSeq, at: new Date(state.now || Date.now()).toISOString() });
  }
  async function handle(line, ctx) {
    ctx = ctx || {}; var a = String(line || '').trim().split(/\s+/); if (a[0].toLowerCase() !== 'eggrize') return null;
    var sub = (a[1] || 'help').toLowerCase(), st = ctx.state || {}, plat = st.platform || 'macos';
    if (sub === 'help') return { text: ['EGGRIZE commands (' + VERSION + ', lesson L065):', 'eggrize status · is this app in the signed ЯCASKET restore manifest, and does it match?', 'eggrize snapshot · record this app (version, build, eggs, commands, skills) as a casket proposal; it joins the signed manifest only after Face ID', 'eggrize restore <app> · plan a restore of ' + Object.keys(APPS).map(function (k) { return APPS[k]; }).join(', ') + ' → one Face ID proposal; never auto-installs', 'eggrize help · this list', 'Only items signed by ' + KEY + ' (trust seq 2) restore. Add-only. No secrets or keys.'].join('\n') };
    var vm = await verifyManifest(ctx.manifest, ctx.manifestSigned, ctx.trust);
    if (sub === 'status') {
      var me = ctx.manifest && (findApp(ctx.manifest, st.key) || (ctx.manifest.apps || []).filter(function (x) { return x.bundleId === st.app; })[0]);
      var o = ['EGGRIZE status · ' + VERSION, 'manifest: ' + (vm.ok ? 'SIGNED PASS ' + KEY : 'NOT TRUSTED · ' + vm.why.join('; '))];
      if (!me) o.push('this app (' + (st.app || '?') + '): NOT in the manifest');
      else { o.push('this app: ' + me.name + ' ' + me.version + ' (' + me.build + ')');
        o.push('version/build: ' + (me.version === st.version && String(me.build) === String(st.build) ? 'SAME' : 'DIFFERENT (now ' + st.version + ' (' + st.build + '))'));
        var have = {}; (st.eggs || []).forEach(function (g) { have[g.id] = g.version; });
        var miss = (me.eggs || []).filter(function (g) { return have[g.id] !== g.version; }); o.push('eggs: ' + (miss.length ? miss.length + ' differ/missing: ' + miss.map(function (g) { return g.id + ' ' + g.version; }).join(', ') : 'SAME (' + (me.eggs || []).length + ')'));
        o.push('install artifacts here (' + plat + '): ' + (me.artifacts || []).filter(function (x) { return x.platform === plat; }).length); }
      (ctx.manifest && ctx.manifest.apps || []).forEach(function (x) { o.push('  · ' + x.name + ' ' + x.version + ' (' + x.build + ') · eggs ' + (x.eggs || []).length + ' · artifacts ' + (x.artifacts || []).length); });
      return { text: o.join('\n'), ok: vm.ok };
    }
    if (sub === 'snapshot') { var s = snapshotOf(st); var sh = await sha256(canon(s)); if (ctx.store) ctx.store.set('eggrize.snapshot.pending', s);
      return { text: 'EGGRIZE snapshot · ' + (s.name || s.app || '?') + ' ' + s.version + ' (' + s.build + ') · eggs ' + s.eggs.length + ' · commands ' + s.commands.length + ' · skills ' + s.skills.length + '\nsha256 ' + sh + '\nSaved as a PROPOSAL for ЯCASKET. It joins the restore manifest only after Rizal signs it with Face ID. Nothing deleted, no secrets kept.', snapshot: s, sha256: sh }; }
    if (sub === 'restore') {
      if (!a[2]) return { text: 'eggrize restore <app> · apps: ' + Object.keys(APPS).join(', ') };
      if (!vm.ok) return { text: 'EGGRIZE restore REFUSED · manifest not trusted: ' + vm.why.join('; ') };
      var app = findApp(ctx.manifest, a.slice(2).join(' ')); if (!app) return { text: 'EGGRIZE restore: ' + a.slice(2).join(' ') + ' is not in the signed manifest' };
      var p = await planRestore(ctx.manifest, app, plat, ctx.trust, ctx.appcast);
      if (ctx.store) ctx.store.set('eggrize.proposal', p.proposal);
      return { text: ['EGGRIZE restore plan · ' + app.name + ' on ' + plat + ' · PROPOSAL (Face ID required, nothing installed yet)', 'signed items: ' + p.items.length, p.refused.length ? 'refused: ' + p.refused.join(' | ') : 'refused: none'].concat(p.steps).join('\n'), plan: p };
    }
    return { text: 'unknown: eggrize ' + sub + ' · try eggrize help' };
  }
  return { VERSION: VERSION, KEY: KEY, APPS: APPS, canon: canon, sha256: sha256, msgOf: msgOf, verifyEntry: verifyEntry, verifyManifest: verifyManifest, planRestore: planRestore, snapshotOf: snapshotOf, scrub: scrub, findApp: findApp, handle: handle };
});
