// Rtor feed test: /rtor/feed.json must be current, point at real files with correct size/sha256, never claim signed,
// carry no signatures inline, contain no tunnel/Cloudflare URLs or secrets, and every entry must be REFUSED by rtor-verify.js
// until an owner .sig.json exists. Also checks the /rtor/join/ page is secret-free and routes to ЯLOGIN option 3.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..', '..'); const V = require('../../rtor/rtor-verify.js'); const { build } = require('./make-feed.cjs');
let pass = 0, fail = 0; const t = (name, ok, why) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (why ? ' -> ' + why : '')); };
(async () => {
  const raw = fs.readFileSync(path.join(ROOT, 'rtor/feed.json'), 'utf8'); const feed = JSON.parse(raw);
  t('feed.json is current (node tests/rtor/make-feed.cjs)', raw === JSON.stringify(build(), null, 1) + '\n');
  t('feed is rtor-feed-v1 and signed:false', feed.schema === 'rtor-feed-v1' && feed.signed === false);
  t('feed has entries', feed.entries.length > 0, feed.entries.length + ' entries');
  for (const e of feed.entries) {
    const f = path.join(ROOT, e.url.replace(/^\//, '')); const b = fs.existsSync(f) ? fs.readFileSync(f) : null;
    t(e.url + ' exists, size+sha256 match', !!b && b.length === e.size && crypto.createHash('sha256').update(b).digest('hex') === e.sha256);
    t(e.url + ' marked unsigned/pending, sidecar path set, no inline signature', e.signed === false && e.status === 'pending-owner-signature' && e.sig === e.url + '.sig.json' && !('ed25519' in e) && e.name === path.basename(e.url));
    const r = await V.verifyItem(e); t(e.url + ' refused by rtor-verify.js while unsigned', r.ok === false, r.why);
    const rb = await V.verifyItemBytes(Object.assign({}, e, { ed25519: Buffer.alloc(64).toString('base64') }), b || Buffer.alloc(0)); t(e.url + ' forged signature refused', rb.ok === false, rb.why);
  }
  t('no Cloudflare / tunnel / NetBird URLs in feed', !/trycloudflare|cloudflare|netbird|ngrok|tailscale/i.test(raw));
  t('no secret-looking material in feed', !/PRIVATE KEY|seed phrase|mnemonic|"password"|ghp_|github_pat_/i.test(raw));
  const jp = path.join(ROOT, 'rtor/join/index.html');
  if (fs.existsSync(jp)) { const j = fs.readFileSync(jp, 'utf8');
    t('/rtor/join/ routes to live ЯLOGIN option 3', /https:\/\/rizal\.pw\/login\/options\//.test(j));
    t('/rtor/join/ has no secrets, no tunnel, no auto-approve', !/trycloudflare|cloudflare|netbird|PRIVATE KEY|mnemonic|auto-?approv(e|al)\s*[:=]\s*true|localStorage\.setItem/i.test(j));
    t('/rtor/join/ names only approved devices', !/Pixel|iPad/.test(j)); }
  console.log(`FEED ${pass} pass ${fail} fail`); process.exit(fail ? 1 : 0);
})();
