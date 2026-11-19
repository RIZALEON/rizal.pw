// GHOSTKEY (rtor-verify 1.2, Rizal t177u). Throwaway in-memory TEST keys only (never written; not lab keys).
const V = require('../../rtor/rtor-verify.js'); const fs = require('fs'); const nc = require('crypto'); const subtle = globalThis.crypto.subtle;
const owner = JSON.parse(fs.readFileSync(__dirname + '/owner-signed-items.json')); const ring = JSON.parse(fs.readFileSync(__dirname + '/../../rtor/ghostkey.json'));
const alias = JSON.parse(fs.readFileSync(__dirname + '/../../rtor/rtor-devices.json')); const bytes = fs.readFileSync(__dirname + '/payload.txt');
let pass = 0, fail = 0; const t = async (name, p, want, chk) => { const r = await p; const ok = r.ok === want && (!chk || chk(r)); ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name + ' -> ' + (r.ok ? 'accepted (' + (r.signer || 'ring ' + (r.ring && r.ring.version)) + (r.authorization ? ', authorization ' + r.authorization : '') + ')' : 'refused: ' + r.why)); };
const eq = (name, c) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + name); };
const b64 = u => Buffer.from(u).toString('base64'); const sha = b => nc.createHash('sha256').update(b).digest('hex');
async function member(device, ops) { const kp = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']); const raw = new Uint8Array(await subtle.exportKey('raw', kp.publicKey)); return { kp, d: { device, name: 'TEST ' + device, alg: 'p256', fp: sha(raw).slice(0, 12), pub: b64(raw), ops: ops || V.OPS, status: 'ACTIVE' } }; }
async function msign(m, it) { const s = await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, m.kp.privateKey, V.deviceMessage(it, m.d.fp)); return Object.assign({}, it, { device: m.d.fp, p256: b64(new Uint8Array(s)) }); }
function rootKey() { const { publicKey, privateKey } = nc.generateKeyPairSync('ed25519'); return { priv: privateKey, pub: Buffer.from(publicKey.export({ format: 'jwk' }).x, 'base64url').toString('base64') }; }
function rsign(rk, it) { return Object.assign({}, it, { ed25519: nc.sign(null, Buffer.from(V.message(it)), rk.priv).toString('base64') }); }
(async () => {
  eq('ring file is ghostkey-ring-v1, root e5833fdfbbfe, 6 members', ring.schema === 'ghostkey-ring-v1' && ring.root.keyId === 'e5833fdfbbfe' && ring.members.length === 6);
  eq('pinned GHOSTKEY ring == ghostkey.json (root + members)', V.GHOSTKEY.root.pub === ring.root.pub && JSON.stringify(V.GHOSTKEY.members.map(m => [m.fp, m.pub, m.ops, m.status])) === JSON.stringify(ring.members.map(m => [m.fp, m.pub, m.ops, m.status])));
  eq('members are the six registered keys', ['772af9d72bb8', 'cd8e3026fe33', 'f905b7901a31', '75b0428a4d67', '5e110f5d1b4c', 'da2a35874ca0'].every(f => V.GHOSTKEY.members.some(m => m.fp === f)));
  eq('rtor-devices.json is an alias of ghostkey.json', alias.alias_of === '/rtor/ghostkey.json');
  eq("aliases: owner-command -> ghostkey, authorized-by-owner-command -> authorized-by-ghostkey", V.authOf({ authorization: 'owner-command' }) === 'ghostkey' && V.authOf({ status: 'authorized-by-owner-command' }) === 'authorized-by-ghostkey');
  for (const op of V.OPS) await t('GHOSTKEY root (real owner-signed) accepted for ' + op, V.verifyGhostkey(owner[0], op), true, r => /^GHOSTKEY root e5833fdfbbfe/.test(r.signer));
  const item = { kind: 'data', id: 'test.ghostkey', version: '1', name: 'payload.txt', size: bytes.length, sha256: sha(bytes) };
  const m1 = await member('macbook-neo'), m2 = await member('iphone-17e'), m3 = await member('moto-android'), out = await member('stranger');
  for (const m of [m1, m2, m3]) for (const op of V.OPS) await t('ring member ' + m.d.device + ' accepted for ' + op, V.verifyGhostkeyBytes(await msign(m, item), bytes, op, { devices: [m1.d, m2.d, m3.d] }), true, r => /^GHOSTKEY member/.test(r.signer));
  await t("bare 'ghostkey' label refused", V.verifyGhostkey(Object.assign({}, item, { authorization: 'ghostkey', status: 'authorized-by-ghostkey' }), 'leech'), false);
  await t("bare 'owner-command' label refused (alias)", V.verifyGhostkey(Object.assign({}, item, { authorization: 'owner-command', authorizationRef: 'Rizal 15:35' }), 'leech'), false);
  await t("bare status 'authorized-by-owner-command' refused", V.verifyGhostkey(Object.assign({}, item, { status: 'authorized-by-owner-command' }), 'receive'), false);
  await t('legacy owner-command entry WITH root signature accepted via alias', V.verifyGhostkey(Object.assign({}, owner[0], { authorization: 'owner-command', status: 'authorized-by-owner-command' }), 'leech'), true, r => r.authorization === 'ghostkey');
  await t('ghostkey-labeled member-signed entry accepted', V.verifyGhostkey(Object.assign(await msign(m1, item), { authorization: 'ghostkey' }), 'send', { devices: [m1.d] }), true);
  await t('unsigned refused', V.verifyGhostkey(item, 'seed'), false);
  await t('non-member (stranger) refused', V.verifyGhostkey(await msign(out, item), 'leech', { devices: [m1.d] }), false);
  await t('ghostkey-labeled, tampered sha256 refused', V.verifyGhostkey(Object.assign({}, owner[0], { authorization: 'ghostkey', sha256: 'f'.repeat(64) }), 'leech'), false);
  const bad = Buffer.from(bytes); bad[0] ^= 1; await t('member-signed, altered bytes refused', V.verifyGhostkeyBytes(await msign(m1, item), bad, 'leech', { devices: [m1.d] }), false);
  // root-signed ring (TEST root): replaces the pinned ring only when the root signature verifies
  const rk = rootKey(); const ringDoc = { schema: 'ghostkey-ring-v1', version: 'test-2', root: { keyId: 'test', pub: rk.pub }, members: [m1.d, Object.assign({}, m2.d, { status: 'REVOKED' })] };
  const rb = Buffer.from(JSON.stringify(ringDoc)); const side = rsign(rk, { kind: 'ghostkey', id: 'ghostkey-ring', version: 'test-2', name: 'ghostkey.json', size: rb.length, sha256: sha(rb) });
  const rr = await V.ringFromSigned(rb, side, { pubKeyB64: rk.pub }); await t('root-signed ring accepted', Promise.resolve(rr), true);
  await t('member of root-signed ring accepted', V.verifyGhostkey(await msign(m1, item), 'receive', { ring: rr.ring }), true);
  await t('member REVOKED in root-signed ring refused', V.verifyGhostkey(await msign(m2, item), 'receive', { ring: rr.ring }), false);
  await t('ring signed by a non-root key refused (pinned root)', V.ringFromSigned(rb, side), false);
  const rb2 = Buffer.from(JSON.stringify(Object.assign({}, ringDoc, { members: [m1.d, out.d] }))); await t('ring with a member added after signing refused', V.ringFromSigned(rb2, side, { pubKeyB64: rk.pub }), false);
  await t('unsigned ring sidecar refused', V.ringFromSigned(rb, Object.assign({}, side, { ed25519: '' }), { pubKeyB64: rk.pub }), false);
  await t('wrong sidecar id refused', V.ringFromSigned(rb, Object.assign({}, side, { id: 'other' }), { pubKeyB64: rk.pub }), false);
  console.log(`JS ghostkey ${pass} pass ${fail} fail`); process.exit(fail ? 1 : 0);
})();
