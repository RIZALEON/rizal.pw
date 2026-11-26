#!/usr/bin/env node
// Rtor feed generator (rtor-feed-v1). Builds /rtor/feed.json from the real public files in this repo.
// FAIL-CLOSED BY CONSTRUCTION: no entry carries an `ed25519` field, so RTOR_VERIFY.verifyItem() refuses every
// entry ("UNSIGNED - refused") until Rizal's owner signature is published as <file>.sig.json next to the file.
// This script never signs, never holds keys, never writes GHOSTCHAIN/RTRACKR (it only reads/hashes files).
// The feed's top-level `signed` flag is COMPUTED, never hardcoded: the generator emits the SIGNED state only
// when a published feed self-sidecar (rtor/feed.json.sig.json) verifies against those exact bytes (size +
// sha256 + Ed25519 over the rlab-update-v1 message, owner key e5833fdfbbfe). Any change to the entries drops
// the feed back to PENDING until Rizal signs the new bytes. The flag therefore never lies in either direction.
// The Neo seeder claim is DERIVED from rtor/tracker-status.json (v3, 2026-11-20): the old hardcoded
// 'not running' string survived the seeder coming up on Nov 18, so the generator now reads the tracker's
// stable seeder fields (status/since/files/bytes/ports) and says 'state unknown' when the file is absent.
// Volatile fields (pid, generated, last_run) are never used, so the feed stays byte-stable across tracker
// refreshes and goes stale only when the seeder itself changes.
// Seated entries (tests/rtor/external-entries.json, seated 2026-11-22 on the owner's order): packages whose
// payloads live outside this repo's file walk — the frankensteinrizal IPFS entries and the webseed tree
// packages — ride in a durable INPUT seat, so regeneration emits them instead of silently dropping them
// (five hand-added entries, 29–33, failed CI for exactly that reason). The generator emits the seat's facts
// verbatim and FAILS CLOSED on any seated entry claiming signed:true, a foreign keyId, a sig field, or a
// status that does not say unsigned/record: it cannot verify a seated sidecar, so it will not emit one.
// Run:  node tests/rtor/make-feed.cjs                                    (writes rtor/feed.json; CI test fails if it is stale)
//       node tests/rtor/make-feed.cjs --sign-list                        (prints the rlab-update-v1 sign-request fields as JSON)
//       node tests/rtor/make-feed.cjs --sign-candidate [--assume-signed id,...]
//           (writes rtor/feed.sign-candidate.json — the SIGNED-state bytes for Rizal to sign; never feed.json.
//            --assume-signed marks listed entries as signed because their sidecars are in the same signing
//            packet; the candidate then equals what the generator produces once those sidecars land.)
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..', '..');
const HOST = fs.existsSync(path.join(ROOT, 'CNAME')) ? fs.readFileSync(path.join(ROOT, 'CNAME'), 'utf8').trim() : 'rizal.pw';
const PEER = HOST === 'rizal.pw' ? 'rizal.info' : 'rizal.pw';
const FEED_VERSION = '20261126-1'; // bump by hand when the feed content changes (entries, seeder claim, anything); every bump needs a new feed.json.sig.json
const KEY_ID = 'e5833fdfbbfe';
const PUBKEY_B64 = 'zs7M4OOB0zQhWOQw3SHpAY+XYxbZJvcPESy1y400Ti0='; // pinned owner Ed25519 public key (same as rtor/rtor-verify.js)
const FEED_ID = 'rtor-feed.rizal.pw';
const SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex'); // Ed25519 SPKI prefix for Node crypto.verify
const rd = (p) => fs.readFileSync(path.join(ROOT, p));
const has = (p) => fs.existsSync(path.join(ROOT, p));
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
function stamp(s) { const d = new Date(s); return isNaN(d) ? null : d.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z'); }
/** True only if the published feed self-sidecar verifies against these exact candidate bytes
 *  (keyId + kind + id + version + name + size + sha256 + Ed25519 over the rlab-update-v1 message). */
function feedSelfSigned(candidateText) {
  if (!has('rtor/feed.json.sig.json')) return false;
  let s; try { s = JSON.parse(rd('rtor/feed.json.sig.json')); } catch (e) { return false; }
  const b = Buffer.from(candidateText, 'utf8');
  if (s.keyId !== KEY_ID || s.kind !== 'web' || s.id !== FEED_ID || s.version !== FEED_VERSION || s.name !== 'feed.json') return false;
  if (s.size !== b.length || s.sha256 !== sha(b)) return false;
  const msg = Buffer.from('rlab-update-v1\n' + s.kind + '\n' + s.id + '\n' + s.version + '\n' + s.name + '\n' + s.size + '\n' + s.sha256, 'utf8');
  let key; try { key = crypto.createPublicKey({ key: Buffer.concat([SPKI_PREFIX, Buffer.from(PUBKEY_B64, 'base64')]), format: 'der', type: 'spki' }); } catch (e) { return false; }
  try { return crypto.verify(null, msg, key, Buffer.from(s.ed25519, 'base64')); } catch (e) { return false; }
}
/** Seated entries from tests/rtor/external-entries.json (see the header note). Emitted verbatim after the
 *  file-walk entries, in seat order. Fail-closed: anything the generator cannot stand behind is a build error. */
function seatedEntries() {
  const p = 'tests/rtor/external-entries.json';
  if (!has(p)) return [];
  const seat = JSON.parse(rd(p));
  return (seat.entries || []).map((e) => {
    if (!e || e.signed !== false || e.keyId !== KEY_ID || ('sig' in e) || ('ed25519' in e) || !/unsigned|record/i.test(String(e.status || '')))
      throw new Error('seated entry refused (fail-closed): ' + (e && e.id));
    return e;
  });
}
function list(assumeSigned) {
  const assume = assumeSigned instanceof Set ? assumeSigned : new Set();
  const out = [];
  const add = (p, kind, id, version, role) => { if (!has(p)) return; const b = rd(p); out.push({ kind, id, version: String(version), name: path.basename(p), size: b.length, sha256: sha(b), url: '/' + p, sig: '/' + p + '.sig.json', role }); };
  if (has('rdragon-version.json')) add('rdragon-version.json', 'web', 'rizal.pw-version', JSON.parse(rd('rdragon-version.json')).v, 'site version manifest (RDIAG in-page updater gate)');
  if (has('rwallet-v6/RWALLET.sha256')) add('rwallet-v6/RWALLET.sha256', 'web', 'rwallet-v6', has('rwallet-v6/RWALLET.version') ? rd('rwallet-v6/RWALLET.version').toString().trim() : 'unversioned', 'RWALLET v6 signed file list (drift check)');
  if (has('ALL-APPCASTS.json')) add('ALL-APPCASTS.json', 'appcast', 'all-appcasts', 'sha-' + sha(rd('ALL-APPCASTS.json')).slice(0, 12), 'appcast index');
  const casts = [];
  (function walk(d) { for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) { const r = d ? d + '/' + e.name : e.name;
    if (e.isDirectory()) { if (!/^(\.git|node_modules|tests)$/.test(e.name)) walk(r); } else if (e.name === 'appcast.json') casts.push(r); } })('');
  for (const p of casts.sort()) { let v; try { v = stamp(JSON.parse(rd(p)).updated); } catch (e) { v = null; }
    add(p, 'appcast', 'appcast.' + path.dirname(p).replace(/\//g, '.'), v || 'sha-' + sha(rd(p)).slice(0, 12), 'app update feed (catalog)'); }
  if (has('terraformya/updates/manifest.json')) { const m = JSON.parse(rd('terraformya/updates/manifest.json'));
    add('terraformya/updates/manifest.json', 'web', 'terraformya-updates', stamp(m.updated) || 'sha-' + sha(rd('terraformya/updates/manifest.json')).slice(0, 12), 'TerraformЯ / GIZMO update manifest (' + (m.channel || '?') + ' channel)');
    for (const pt of (m.patches || [])) if (pt.url && !/[\/:]/.test(pt.url)) add('terraformya/updates/' + pt.url, 'pck', pt.id, pt.version, 'TerraformЯ GIZMO pack listed in manifest.json'); }
  for (const f of ['rghostchain.json', 'rtoken.json', 'token-pool.json', 'economy-rates.json'])
    add('rtrackr/data/' + f, 'data', 'rtrackr.' + f.replace(/\.json$/, ''), 'sha-' + (has('rtrackr/data/' + f) ? sha(rd('rtrackr/data/' + f)).slice(0, 12) : ''), f === 'rghostchain.json' ? 'GHOSTCHAIN public copy (read-only; RMINT on Neo is the only writer)' : 'RTRACKR public data (read-only)');
  // Owner-command authorizations (rtor/owner-commands.json, Rizal 2026-11-18): bind one exact file (id+name+size+sha256). Not a signature.
  let oc = []; if (has('rtor/owner-commands.json')) { try { oc = JSON.parse(rd('rtor/owner-commands.json')).entries || []; } catch (x) { oc = []; } }
  const mapped = out.map((e) => { const sp = e.sig.slice(1); let s = null; if (has(sp)) { try { s = JSON.parse(rd(sp)); } catch (x) { s = null; } }
    if (s && s.keyId === KEY_ID && s.sha256 === e.sha256 && s.size === e.size && s.id === e.id && s.kind === e.kind) return Object.assign(e, { version: String(s.version), keyId: KEY_ID, signed: true, status: 'signed-by-owner' });
    if (assume.has(e.id)) return Object.assign(e, { keyId: KEY_ID, signed: true, status: 'signed-by-owner' });
    const o = oc.find((c) => c.authorization === 'owner-command' && c.ref && c.id === e.id && c.kind === e.kind && c.name === e.name && c.size === e.size && c.sha256 === e.sha256);
    if (o) return Object.assign(e, { keyId: KEY_ID, signed: false, authorization: 'owner-command', authorizationRef: o.ref, status: 'authorized-by-owner-command' });
    return Object.assign(e, { keyId: KEY_ID, signed: false, status: 'pending-owner-signature' }); });
  return mapped.concat(seatedEntries());
}
// The Neo seeder claim, derived from rtor/tracker-status.json (see the header note). Only stable
// seeder fields feed the string; anything missing or not-seeding yields an honest unknown/not-seeding
// claim instead of an asserted state we cannot see.
function seederString() {
  const unknown = 'state unknown — see rtor/tracker-status.json (unsigned telemetry)';
  let s; try { s = JSON.parse(rd('rtor/tracker-status.json')).seeder; } catch (e) { return unknown; }
  if (!s || typeof s !== 'object') return unknown;
  if (s.status !== 'seeding') return 'not seeding — see rtor/tracker-status.json (unsigned telemetry)';
  if (!s.since || typeof s.files !== 'number' || typeof s.bytes !== 'number') return unknown;
  const since = String(s.since).slice(0, 10) + ' ' + String(s.since).slice(11, 16);
  const mb = (s.bytes / 1e6).toFixed(2);
  const ports = (s.http_port && s.torrent_port) ? ', webseed :' + s.http_port + ' + WebTorrent :' + s.torrent_port : '';
  return 'seeding since ' + since + ' (' + s.files + ' files, ' + mb + ' MB' + ports + ')';
}
function feedObject(entries, signed) {
  return {
    schema: 'rtor-feed-v1', host: HOST, version: FEED_VERSION, signed: signed,
    status: signed
      ? 'SIGNED: this feed and every signed entry verify against owner key ' + KEY_ID + ' (owner-command, GHOSTKEY). Unsigned or tampered entries are still REFUSED. Bots never sign.'
      : 'PENDING: no owner signature for this feed version yet. Every entry is REFUSED until its .sig.json verifies against owner key ' + KEY_ID + ' (owner-command, GHOSTKEY). Bots never sign.',
    note: 'Generated by tests/rtor/make-feed.cjs. Entries carry kind/id/version/name/size/sha256 (rlab-update-v1 fields) but no ed25519; the signature lives only in the sidecar.',
    verify: { message: 'rlab-update-v1', keyId: KEY_ID, verifier: '/rtor/rtor-verify.js', python: 'rtor_verify.py <file> <file>.sig.json', sidecar: '<url>.sig.json', rule: 'unsigned, tampered, wrong key or size/sha256 mismatch = REFUSED (quarantine, keep old version)' },
    feed_sig: '/rtor/feed.json.sig.json',
    peer_feed: 'https://' + PEER + '/rtor/feed.json',
    join: '/rtor/join/',
    ghostchain: { url: '/rtrackr/data/rghostchain.json', mode: 'read-only', writer: 'RMINT hybrid service on Neo only; Rtor never writes the chain' },
    rtrackr: { url: '/rtrackr/', mode: 'read-only', note: 'bots never write rtrackr/registry.json' },
    webseed: { base: 'https://' + HOST + '/', tree: '/rtor/<app>/<version>/', status: 'not published' },
    seeders: { website: 'permanent HTTPS webseed', neo: seederString(), network: 'website is the only public endpoint; no tunnels, no public DHT or trackers' },
    entries: entries,
  };
}
function build(opts) {
  const o = opts || {};
  const entries = list(o.assume);
  if (o.forceSigned) return feedObject(entries, true);
  const signed = feedObject(entries, true);
  if (feedSelfSigned(JSON.stringify(signed, null, 1) + '\n')) return signed;
  return feedObject(entries, false);
}
module.exports = { build, list, feedSelfSigned, feedObject, FEED_VERSION, KEY_ID };
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--sign-list')) { console.log(JSON.stringify(list().map(({ kind, id, version, name, size, sha256, url, sig }) => ({ kind, id, version, name, size, sha256, url, sig })), null, 1)); }
  else if (args.includes('--sign-candidate')) {
    const ai = args.indexOf('--assume-signed');
    const assume = new Set(ai >= 0 && args[ai + 1] ? args[ai + 1].split(',').map((s) => s.trim()).filter(Boolean) : []);
    const out = JSON.stringify(build({ assume: assume, forceSigned: true }), null, 1) + '\n';
    fs.mkdirSync(path.join(ROOT, 'rtor'), { recursive: true }); fs.writeFileSync(path.join(ROOT, 'rtor/feed.sign-candidate.json'), out);
    console.log('wrote rtor/feed.sign-candidate.json', build({ assume: assume, forceSigned: true }).entries.length, 'entries,', Buffer.byteLength(out), 'bytes, sha256', sha(Buffer.from(out, 'utf8')), '(SIGNED-state bytes for Rizal to sign; NOT feed.json)');
  }
  else { const out = JSON.stringify(build(), null, 1) + '\n'; fs.mkdirSync(path.join(ROOT, 'rtor'), { recursive: true }); fs.writeFileSync(path.join(ROOT, 'rtor/feed.json'), out); console.log('wrote rtor/feed.json', build().entries.length, 'entries (signed where an owner sidecar matches)'); }
}
