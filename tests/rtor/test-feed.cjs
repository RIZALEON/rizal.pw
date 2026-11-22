// Rtor feed test: /rtor/feed.json must be current, point at real files with correct size/sha256, claim signed
// only when its self-sidecar verifies, carry no signatures inline, contain no tunnel/Cloudflare URLs or
// secrets, and every entry must be REFUSED by rtor-verify.js until an owner .sig.json exists. Also checks
// the /rtor/join/ page is secret-free and routes to ЯLOGIN option 3.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..', '..'); const V = require('../../rtor/rtor-verify.js'); const { build } = require('./make-feed.cjs');
let pass = 0, fail = 0; const t = (name, ok, why) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (why ? ' -> ' + why : '')); };
(async () => {
  const raw = fs.readFileSync(path.join(ROOT, 'rtor/feed.json'), 'utf8'); const feed = JSON.parse(raw);
  t('feed.json is current (node tests/rtor/make-feed.cjs)', raw === JSON.stringify(build(), null, 1) + '\n');
  t('feed is rtor-feed-v1', feed.schema === 'rtor-feed-v1');
  const selfPath = path.join(ROOT, 'rtor/feed.json.sig.json');
  const selfSig = fs.existsSync(selfPath) ? JSON.parse(fs.readFileSync(selfPath, 'utf8')) : null;
  const selfOk = selfSig ? (await V.verifyItemBytes(selfSig, Buffer.from(raw, 'utf8'))).ok : false;
  t('feed signed:true only with a verifying self-sidecar', feed.signed === false || selfOk === true, feed.signed ? 'self-sidecar verifies: ' + selfOk : 'signed:false, no claim made');
  t('feed signed:false carries the PENDING status', feed.signed === true || /^PENDING/.test(feed.status));
  t('feed signed:true carries the SIGNED status', feed.signed === false || /^SIGNED/.test(feed.status));
  t('feed has entries', feed.entries.length > 0, feed.entries.length + ' entries');
  for (const e of feed.entries) {
    const f = path.join(ROOT, e.url.replace(/^\//, '')); const b = fs.existsSync(f) ? fs.readFileSync(f) : null;
    if (!('sig' in e)) {
      // Seated entry (tests/rtor/external-entries.json): the payload is a package outside the repo file walk
      // (an IPFS pin or a webseed tree package); size/sha256 pin the package of record and the url names its
      // seat, so there is no local file to byte-match and no sidecar path to claim. What is checked instead:
      // fact consistency, an honest unsigned marking under the owner key, the Step-1 naming for the
      // frankensteinrizal pair (below the loop), and REFUSAL — the gates keep their teeth for seated entries.
      t(e.id + ' seated entry: unsigned, owner key, no inline signature, honest status', e.signed === false && e.keyId === feed.verify.keyId && !('ed25519' in e) && /unsigned|record/i.test(e.status));
      t(e.id + ' seated entry: facts well-formed (size, sha256, ipfs_cid forms)', Number.isInteger(e.size) && e.size > 0 && (e.sha256 === undefined || /^[0-9a-f]{64}$/.test(e.sha256)) && (e.ipfs_cid === undefined || /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(e.ipfs_cid)));
      if (/^https?:\/\//.test(e.url)) t(e.id + ' seated entry: url carries its ipfs_cid', !e.ipfs_cid || e.url.includes(e.ipfs_cid));
      else t(e.id + ' seated entry: seat file exists at url', !!b, e.url);
      const r = await V.verifyItem(e); t(e.id + ' seated entry refused by rtor-verify.js while unsigned', r.ok === false, r.why);
    } else {
    t(e.url + ' exists, size+sha256 match', !!b && b.length === e.size && crypto.createHash('sha256').update(b).digest('hex') === e.sha256);
    if (e.signed === true) {
      const sp = path.join(ROOT, e.sig.replace(/^\//, '')); const s = fs.existsSync(sp) ? JSON.parse(fs.readFileSync(sp, 'utf8')) : null;
      t(e.url + ' marked signed-by-owner, sidecar path set, no inline signature', e.status === 'signed-by-owner' && e.sig === e.url + '.sig.json' && !('ed25519' in e) && e.name === path.basename(e.url));
      const r = s ? await V.verifyItemBytes(s, b || Buffer.alloc(0)) : { ok: false, why: 'no sidecar' }; t(e.url + ' owner sidecar verifies against pinned key + real bytes', r.ok === true && s.version === e.version, r.why);
    } else if (e.status === 'authorized-by-owner-command') {
      const oc = JSON.parse(fs.readFileSync(path.join(ROOT, 'rtor/owner-commands.json'), 'utf8')).entries || [];
      const o = oc.find((c) => c.id === e.id && c.name === e.name && c.size === e.size && c.sha256 === e.sha256 && c.authorization === 'owner-command' && c.ref);
      t(e.url + ' owner-command authorization binds this exact size+sha256 (no signature claimed)', !!o && e.signed === false && e.authorization === 'owner-command' && e.authorizationRef === o.ref && !('ed25519' in e));
      const r = await V.verifyItem(e); t(e.url + ' still refused by rtor-verify.js as a signature (none exists)', r.ok === false, r.why);
    } else {
      t(e.url + ' marked unsigned/pending, sidecar path set, no inline signature', e.signed === false && e.status === 'pending-owner-signature' && e.sig === e.url + '.sig.json' && !('ed25519' in e) && e.name === path.basename(e.url));
      const r = await V.verifyItem(e); t(e.url + ' refused by rtor-verify.js while unsigned', r.ok === false, r.why);
    }
    }
    const rb = await V.verifyItemBytes(Object.assign({}, e, { ed25519: Buffer.alloc(64).toString('base64') }), b || Buffer.alloc(0)); t(e.url + ' forged signature refused', rb.ok === false, rb.why);
  }
  // Step 1 (owner decision, 2026-11-22): the frankensteinrizal entry NAMES the unpacked site — the tree that
  // actually renders — and the wrapped pins ride as record fields on it, never as the named hash.
  const namedSite = feed.entries.find((e) => e.id === 'frankensteinrizal.unstoppable-verified-site');
  const recordEntry = feed.entries.find((e) => e.id === 'frankensteinrizal.unstoppable-minimal-site');
  t('Step 1: the frankensteinrizal entry names the unpacked site', !!namedSite && namedSite.names === 'frankensteinrizal.unstoppable' && namedSite.ipfs_cid === 'QmTKiBqnbB42Ww2s6sNmUTkUp1naW6rX3t28MAxiTLJRso' && namedSite.url.includes(namedSite.ipfs_cid));
  t('Step 1: the wrapped pins ride as record fields on the named entry', !!namedSite && namedSite.wrapped_pin_cid === 'QmYfsPeLtgTguSVHkHwNVUh7j3y4FUtXGWW2WpRKy2LNh8' && namedSite.payload_cid === 'QmREKBj2h1QYCm5giRTVigwtqesz2ujpzJaqgjF7ZfUMr8' && namedSite.launched_wrapper_cid === 'QmXgK3Vp4j8y9bpay2vhzoLW8QCRvBcyqPuxg8rLsAVGKP');
  t('Step 1: the wrapped-pin entry is marked as the record of the named entry', !!recordEntry && !!namedSite && recordEntry.record_of === namedSite.id && recordEntry.ipfs_cid === namedSite.wrapped_pin_cid);
  t('no Cloudflare / tunnel / NetBird URLs in feed', !/trycloudflare|cloudflare|netbird|ngrok|tailscale/i.test(raw));
  t('no secret-looking material in feed', !/PRIVATE KEY|seed phrase|mnemonic|"password"|ghp_|github_pat_/i.test(raw));
  const jp = path.join(ROOT, 'rtor/join/index.html');
  if (fs.existsSync(jp)) { const j = fs.readFileSync(jp, 'utf8');
    t('/rtor/join/ routes to live ЯLOGIN option 3', /https:\/\/rizal\.pw\/login\/options\//.test(j));
    t('/rtor/join/ has no secrets, no tunnel, no auto-approve', !/trycloudflare|cloudflare|netbird|PRIVATE KEY|mnemonic|auto-?approv(e|al)\s*[:=]\s*true|localStorage\.setItem/i.test(j));
    t('/rtor/join/ names only approved devices', !/Pixel|iPad/.test(j)); }
  console.log(`FEED ${pass} pass ${fail} fail`); process.exit(fail ? 1 : 0);
})();
