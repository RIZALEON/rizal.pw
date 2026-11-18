// Gate test (check / hot / force): RDIAG.update.* must refuse unsigned / wrong-key / tampered / other-file manifests, accept a correctly signed one.
// The accept case uses a THROWAWAY test key injected by this harness only (production pins the owner key).
const fs = require('fs'), vm = require('vm'), path = require('path'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..', '..');
const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519'); const tpub = publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64');
function entryFor(bytes, over) { const e = Object.assign({ kind: 'web', id: 'rizal.pw-version', version: '1', name: 'rdragon-version.json', size: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') }, over || {});
  e.ed25519 = crypto.sign(null, Buffer.from(`rlab-update-v1\n${e.kind}\n${e.id}\n${e.version}\n${e.name}\n${e.size}\n${e.sha256}`), privateKey).toString('base64'); return e; }
async function run(name, files, useTestKey, want, action) {
  let reloaded = false;
  const win = { console, atob, btoa, TextEncoder, TextDecoder, Promise, setTimeout, clearTimeout, crypto: globalThis.crypto, Uint8Array, JSON, Date, Error,
    location: { hostname: 'rizal.pw', pathname: '/', search: '', replace() { reloaded = true; } }, navigator: {}, document: { querySelector() { return null; }, querySelectorAll() { return []; }, scripts: [] },
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {}, key() { return null; }, length: 0 }, caches: { keys: async () => [], delete: async () => true },
    fetch: async (u) => { const p = String(u).replace(/\?.*$/, ''); if (!(p in files)) return { ok: false, status: 404 }; const b = Buffer.from(files[p]);
      return { ok: true, status: 200, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.length), json: async () => JSON.parse(b), text: async () => b.toString() }; } };
  win.self = win; win.window = win; vm.createContext(win);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'rtor/rtor-verify.js'), 'utf8'), win);
  if (useTestKey) { const R = win.RTOR_VERIFY, f = R.fetchVerified; win.RTOR_VERIFY = Object.assign({}, R, { fetchVerified: (u) => f(u, { pubKeyB64: tpub }) }); }
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'rdragon-cryptosocial/rdiag.js'), 'utf8'), win);
  const r = await (action === 'force' ? win.RDIAG.update.force() : action === 'hot' ? win.RDIAG.update.hot() : win.RDIAG.update.check());
  const accepted = !r.refused; let ok = accepted === want && !(action === 'force' && !want && reloaded);
  // A refusal must never be reported as "up to date" (hot() used to return upToDate:true on refuse) and must say why.
  if (!want && (r.upToDate !== false || r.status !== 'refused: signature missing/invalid' || !r.why)) ok = false;
  if (action === 'hot' && !want && ((r.hot || []).length || (r.needsReload || []).length)) ok = false;
  console.log((ok ? 'PASS ' : 'FAIL ') + name + ' -> ' + (accepted ? 'accepted' : 'refused: ' + r.why)); return ok;
}
(async () => {
  const man = fs.readFileSync(path.join(ROOT, 'rdragon-version.json')); const M = '/rdragon-version.json', S = M + '.sig.json';
  const good = JSON.stringify(entryFor(man)); const tampered = Buffer.from(man.toString().replace('"kind"', '"kind" ')); const res = [];
  res.push(await run('unsigned manifest refused', { [M]: man }, false, false));
  res.push(await run('unsigned manifest: force() refused, no reload', { [M]: man }, false, false, 'force'));
  res.push(await run('test-key signature refused under pinned owner key', { [M]: man, [S]: good }, false, false));
  res.push(await run('correctly signed TEST fixture accepted (harness test key)', { [M]: man, [S]: good }, true, true));
  res.push(await run('tampered manifest bytes refused', { [M]: tampered, [S]: good }, true, false));
  res.push(await run('unsigned manifest: hot() refused (not "up to date"), nothing loaded', { [M]: man }, false, false, 'hot'));
  res.push(await run('test-key signature: hot() refused under pinned owner key', { [M]: man, [S]: good }, false, false, 'hot'));
  res.push(await run('tampered manifest: hot() refused', { [M]: tampered, [S]: good }, true, false, 'hot'));
  res.push(await run('correctly signed TEST fixture: hot() accepted (harness test key)', { [M]: man, [S]: good }, true, true, 'hot'));
  res.push(await run('signature for another file refused', { [M]: man, [S]: JSON.stringify(entryFor(man, { id: 'other-app' })) }, true, false));
  const f = res.filter(x => !x).length; console.log(`GATE ${res.length - f} pass ${f} fail`); process.exit(f ? 1 : 0);
})();
