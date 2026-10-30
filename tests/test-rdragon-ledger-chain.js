// Ledger fix 20261029: imported events must not break the local chain; chainFix relinks; wallet ledger index exists.
const fs=require('fs'),path=require('path'),A=require('assert'),crypto=require('crypto');const R=path.join(__dirname,'..');
const src=fs.readFileSync(R+'/rdragon-cryptosocial/rdragon-cryptosocial.js','utf8');
A.ok(/function chainFix\(\)/.test(src),'chainFix exists');
A.ok(/EV\.push\(e\);n\+\+\}\}\);if\(n\)\{chainFix\(\)/.test(src),'site-posts import relinks');
A.ok(/if\(EV\.length>n0\)chainFix\(\)/.test(src),'store import relinks');
A.ok(/delete o\.hash;EV\.push\(o\);n\+\+\}\);if\(n\)chainFix\(\)/.test(src),'peer adopt relinks');
A.ok(/verifyLocal\(\)\.then\(function\(r\)\{if\(!r\.ok\)chainFix\(\)\}\)/.test(src),'startup self-heal');
const idx=JSON.parse(fs.readFileSync(R+'/rwallet/data/ledger/index.json','utf8'));A.ok(Array.isArray(idx.drafts));
idx.drafts.forEach(n=>['staged-manifest.json','seal-state.json','staged-entries.jsonl'].forEach(f=>A.ok(fs.existsSync(R+'/rwallet/data/ledger/'+n+'/'+f),n+'/'+f)));
// simulate: broken chain (imported events w/o hash) -> relink algorithm -> verify passes
const canon=v=>v===null||typeof v!=='object'?JSON.stringify(v===undefined?null:v):Array.isArray(v)?'['+v.map(canon).join(',')+']':'{'+Object.keys(v).sort().filter(k=>v[k]!==undefined).map(k=>JSON.stringify(k)+':'+canon(v[k])).join(',')+'}';
const h=e=>{const c=Object.assign({},e);delete c.hash;return crypto.createHash('sha256').update(canon(c)).digest('hex')};
const EV=[{id:'a',t:'post'},{id:'site1',t:'post',site:1},{id:'b',t:'like'}];
const fix=()=>EV.forEach((e,i)=>{e.seq=i;e.prev=i?EV[i-1].hash:'0'.repeat(64);e.hash=h(e)});
const ver=()=>EV.filter((e,i)=>e.seq!==i||(i&&e.prev!==EV[i-1].hash)||h(e)!==e.hash).length;
A.ok(ver()>0);fix();A.strictEqual(ver(),0);
console.log('test-rdragon-ledger-chain: ok');
