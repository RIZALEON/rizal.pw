// Rtor feeds gate test (rtor/rtor-feeds.js): appcasts, ALL-APPCASTS, the TerraformЯ/GIZMO manifest and /rtor/feed.json are used
// only when their .sig.json verifies under the owner key for that exact file. Accept cases use a THROWAWAY test key from this harness.
const fs = require('fs'), vm = require('vm'), path = require('path'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..', '..');
const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519'); const tpub = publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64');
let pass = 0, fail = 0; const t = (name, ok, why) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (why ? ' -> ' + why : '')); };
function sidecar(bytes, over) { const e = Object.assign({ kind: 'appcast', version: '1', size: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') }, over);
  e.ed25519 = crypto.sign(null, Buffer.from(`rlab-update-v1\n${e.kind}\n${e.id}\n${e.version}\n${e.name}\n${e.size}\n${e.sha256}`), privateKey).toString('base64'); return JSON.stringify(e); }
function world(files, opts) {
  const win = { console, atob, btoa, TextEncoder, TextDecoder, Promise, URL, crypto: globalThis.crypto, Uint8Array, JSON, Date, Error, location: { href: 'https://' + (opts.host || 'rizal.pw') + '/rtor/' },
    fetch: async (u) => { const p = new URL(String(u), 'https://' + (opts.host || 'rizal.pw') + '/').pathname; if (!(p in files)) return { ok: false, status: 404 }; const b = Buffer.from(files[p]);
      return { ok: true, status: 200, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.length), json: async () => JSON.parse(b) }; } };
  win.self = win; win.window = win; vm.createContext(win);
  if (opts.verifier !== false) { vm.runInContext(fs.readFileSync(path.join(ROOT, 'rtor/rtor-verify.js'), 'utf8'), win);
    if (opts.testKey) { const R = win.RTOR_VERIFY, f = R.fetchVerified; win.RTOR_VERIFY = Object.assign({}, R, { fetchVerified: (u) => f(u, { pubKeyB64: tpub }) }); } }
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'rtor/rtor-feeds.js'), 'utf8'), win); return win.RTOR_FEEDS;
}
(async () => {
  const feed = JSON.parse(fs.readFileSync(path.join(ROOT, 'rtor/feed.json'), 'utf8')); const F0 = world({}, { host: feed.host });
  for (const e of feed.entries) { if (e.kind === 'pck') continue; const x = F0.expectFor('https://' + feed.host + e.url);
    t('expected id matches feed/sign-request id for ' + e.url, !!x && x.id === e.id && x.name === e.name, x && x.id); }
  t('expected id for /rtor/feed.json is rtor-feed.' + feed.host, F0.expectFor('https://' + feed.host + '/rtor/feed.json').id === 'rtor-feed.' + feed.host);
  const targets = [['/thundr-float/macos/appcast.json', 'appcast.thundr-float.macos', 'appcast.json'], ['/terraformya/updates/manifest.json', 'terraformya-updates', 'manifest.json']];
  if (fs.existsSync(path.join(ROOT, 'ALL-APPCASTS.json'))) targets.push(['/ALL-APPCASTS.json', 'all-appcasts', 'ALL-APPCASTS.json']);
  for (const [u, id, name] of targets) {
    const b = fs.readFileSync(path.join(ROOT, u.slice(1))); const good = sidecar(b, { id, name });
    let r = await world({ [u]: b }, {}).fetchVerifiedJSON(u); t(u + ': unsigned refused', r.refused && r.status === 'refused: signature missing/invalid' && !r.json, r.why);
    r = await world({ [u]: b }, { verifier: false }).fetchVerifiedJSON(u); t(u + ': no verifier loaded = refused', r.refused && !r.json, r.why);
    r = await world({ [u]: b, [u + '.sig.json']: good }, {}).fetchVerifiedJSON(u); t(u + ': test-key signature refused under pinned owner key', r.refused, r.why);
    r = await world({ [u]: b, [u + '.sig.json']: good }, { testKey: true }).fetchVerifiedJSON(u); t(u + ': correctly signed TEST fixture accepted', r.ok && r.json && typeof r.json === 'object', r.why);
    const tam = Buffer.concat([b, Buffer.from(' ')]); r = await world({ [u]: tam, [u + '.sig.json']: good }, { testKey: true }).fetchVerifiedJSON(u); t(u + ': tampered bytes refused', r.refused, r.why);
    r = await world({ [u]: b, [u + '.sig.json']: sidecar(b, { id: 'other-app', name }) }, { testKey: true }).fetchVerifiedJSON(u); t(u + ': signature for another file refused', r.refused && /another file/.test(r.why), r.why);
  }
  // Static wiring checks: every in-site consumer goes through the gate.
  const rd = (p) => fs.existsSync(path.join(ROOT, p)) ? fs.readFileSync(path.join(ROOT, p), 'utf8') : null;
  const rt = rd('rtor/index.html'); t('/rtor/ loads rtor-feeds.js and checks every feed entry', /rtor-feeds\.js/.test(rt) && /fetchVerifiedBytes\(e\.url/.test(rt));
  const up = rd('terraformya/updates/index.html'); if (up) t('terraformya/updates/ lists patches only after fetchVerifiedJSON', /fetchVerifiedJSON\('manifest\.json'\)/.test(up) && !/fetch\('manifest\.json'\)\.then/.test(up));
  const pl = rd('terraformya/play/index.html'); if (pl) t('TerraformЯ egg allows patches only from a verified manifest', /rtor-verify\.js/.test(pl) && /entry\.id !== "terraformya-updates"/.test(pl) && /V\.verifyItemBytes\(entry/.test(pl));
  const nt = rd('download/notices.js'); if (nt) t('download/notices.js uses only owner-signed appcasts', /F\.fetchVerifiedJSON\(/.test(nt) && !/return r\.json\(\);/.test(nt));
  console.log(`FEEDS ${pass} pass ${fail} fail`); process.exit(fail ? 1 : 0);
})();
