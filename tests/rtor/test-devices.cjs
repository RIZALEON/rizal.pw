// RTOR verify 1.1 lab-device sources (Rizal t176u, 2026-11-18). Throwaway in-memory TEST keys only (never written, never device keys).
const V = require('../../rtor/rtor-verify.js'); const fs = require('fs'); const nc = require('crypto'); const subtle = globalThis.crypto.subtle;
const owner = JSON.parse(fs.readFileSync(__dirname + '/owner-signed-items.json'));
const reg = JSON.parse(fs.readFileSync(__dirname + '/../../rtor/ghostkey.json'));
const bytes = fs.readFileSync(__dirname + '/payload.txt');
let pass = 0, fail = 0; const t = async (name, p, want) => { const r = await p; const ok = r.ok === want; ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name + ' -> ' + (r.ok ? 'accepted (' + r.signer + ')' : 'refused: ' + r.why)); };
const eq = (name, c) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + name); };
const b64 = (u) => Buffer.from(u).toString('base64'); const fpOf = (raw) => nc.createHash('sha256').update(raw).digest('hex').slice(0, 12);
async function testKey(device, ops, status) {
  const kp = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const raw = new Uint8Array(await subtle.exportKey('raw', kp.publicKey)); const fp = fpOf(raw);
  return { kp, d: { device, name: 'TEST ' + device, alg: 'p256', fp, pub: b64(raw), ops, status: status || 'ACTIVE' } };
}
async function sign(k, item, der) {
  const raw = new Uint8Array(await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, k.kp.privateKey, V.deviceMessage(item, k.d.fp)));
  let sig = raw; if (der) { const jwk = await subtle.exportKey('jwk', k.kp.privateKey); sig = nc.sign('sha256', Buffer.from(V.deviceMessage(item, k.d.fp)), { key: jwk, format: 'jwk', dsaEncoding: 'der' }); }
  return Object.assign({}, item, { device: k.d.fp, p256: b64(sig) });
}
(async () => {
  // pinned list == rtor-devices.json, fingerprints recompute, public keys only
  eq('pinned DEVICES match ghostkey.json members (' + V.DEVICES.length + ' keys)', JSON.stringify(V.DEVICES.map(d => [d.fp, d.pub, d.ops, d.status])) === JSON.stringify(reg.members.map(d => [d.fp, d.pub, d.ops, d.status])));
  for (const d of V.DEVICES) eq('pinned ' + d.device + ' ' + d.name + ' fp ' + d.fp + ' = sha256(pub)', fpOf(Buffer.from(d.pub, 'base64')) === d.fp && Buffer.from(d.pub, 'base64').length === 65);
  eq('three lab devices pinned (iphone-17e, macbook-neo, moto-android)', ['iphone-17e', 'macbook-neo', 'moto-android'].every(x => V.DEVICES.some(d => d.device === x)));
  eq('no private material in ghostkey.json', reg.members.every(k => Object.keys(k).every(n => !/priv|secret|^d$|seed$|mnemonic/i.test(n))));
  const item = { kind: 'data', id: 'test.device-source', version: '1', name: 'payload.txt', size: bytes.length, sha256: nc.createHash('sha256').update(bytes).digest('hex') };
  const neo = await testKey('macbook-neo', V.OPS), e17 = await testKey('iphone-17e', V.OPS), moto = await testKey('moto-android', V.OPS);
  const seedOnly = await testKey('moto-android', ['seed']), revoked = await testKey('iphone-17e', V.OPS, 'REVOKED'), stranger = await testKey('stranger', V.OPS);
  const list = [neo.d, e17.d, moto.d, seedOnly.d, revoked.d];
  for (const op of V.OPS) {
    for (const it of owner) await t('owner-signed ' + it.id + ' accepted for ' + op, V.verifyItemFrom(it, op), true);
    for (const k of [e17, neo, moto]) await t(k.d.device + '-signed (TEST key) accepted for ' + op, V.verifyItemBytesFrom(await sign(k, item), bytes, op, { devices: list }), true);
  }
  await t('device DER signature accepted (receive)', V.verifyItemBytesFrom(await sign(neo, item, true), bytes, 'receive', { devices: list }), true);
  await t('unknown device refused', V.verifyItemFrom(await sign(stranger, item), 'leech', { devices: list }), false);
  await t("label-only spoof {source:'neo'} refused", V.verifyItemFrom(Object.assign({}, item, { source: 'neo' }), 'receive', { devices: list }), false);
  await t('label-only spoof {device:<real Neo fp>} no sig refused (pinned list)', V.verifyItemFrom(Object.assign({}, item, { device: 'f905b7901a31', source: 'MacBook Neo' }), 'receive'), false);
  const forged = await sign(stranger, item); forged.device = 'f905b7901a31';
  await t('stranger key claiming the real Neo fp refused (pinned list)', V.verifyItemFrom(forged, 'receive'), false);
  await t('TEST key not accepted under the real pinned list', V.verifyItemFrom(await sign(neo, item), 'receive'), false);
  const s1 = await sign(e17, item);
  await t('device-signed, tampered sha256 refused', V.verifyItemFrom(Object.assign({}, s1, { sha256: 'f'.repeat(64) }), 'receive', { devices: list }), false);
  await t('device-signed, tampered version refused', V.verifyItemFrom(Object.assign({}, s1, { version: '2' }), 'receive', { devices: list }), false);
  const bad = Buffer.from(bytes); bad[0] ^= 1; await t('device-signed, altered bytes refused', V.verifyItemBytesFrom(s1, bad, 'receive', { devices: list }), false);
  await t('device-signed, wrong size refused', V.verifyItemBytesFrom(s1, Buffer.concat([bytes, Buffer.from('x')]), 'receive', { devices: list }), false);
  await t('unsigned refused', V.verifyItemFrom(item, 'leech', { devices: list }), false);
  await t('owner item with sig stripped refused', V.verifyItemFrom(Object.assign({}, owner[0], { ed25519: '' }), 'seed'), false);
  await t('op not allowed for device (seed-only key asked to send) refused', V.verifyItemFrom(await sign(seedOnly, item), 'send', { devices: list }), false);
  await t('seed-only key accepted for seed', V.verifyItemFrom(await sign(seedOnly, item), 'seed', { devices: list }), true);
  await t('REVOKED device refused', V.verifyItemFrom(await sign(revoked, item), 'receive', { devices: list }), false);
  await t('unknown op refused', V.verifyItemFrom(owner[0], 'mint'), false);
  await t('signature by 17e key presented as Neo fp refused', V.verifyItemFrom(Object.assign({}, s1, { device: neo.d.fp }), 'receive', { devices: list }), false);
  console.log(`JS devices ${pass} pass ${fail} fail`); process.exit(fail ? 1 : 0);
})();
