// node tests: RDRAGON local-first comment ladder (20261028).
// Run: node tests/test-rdragon-local-first.js (from repo root). No network: fetch is stubbed from disk; any 127.0.0.1 call is recorded.
const fs=require('fs'),A=require('assert'),path=require('path'),vm=require('vm');
const ROOT=path.join(__dirname,'..'),E=p=>path.join(ROOT,'rdragon-cryptosocial',p);
let n=0;const pass=name=>{n++;console.log('PASS',name)};
function sandbox(href,ls){const u=new URL(href),calls=[],store=Object.assign({},ls||{});
  const fetch=(url,o)=>{url=String(url);calls.push(url);if(/^https?:\/\/(127\.0\.0\.1|localhost)/.test(url))return Promise.reject(new TypeError('ERR_CONNECTION_REFUSED'));
    const f=path.join(ROOT,url.replace(/^https?:\/\/[^/]+/,'').split('?')[0]);if(!fs.existsSync(f))return Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({})});
    const t=fs.readFileSync(f,'utf8');return Promise.resolve({ok:true,status:200,headers:{get:()=>null},json:()=>Promise.resolve(JSON.parse(t)),text:()=>Promise.resolve(t)})};
  const sb={console,URL,Promise,setTimeout,clearTimeout,setInterval:()=>0,clearInterval:()=>{},AbortController,fetch,
    location:{href,hostname:u.hostname,search:u.search,protocol:u.protocol,reload(){}},
    localStorage:{getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)}},
    navigator:{onLine:true},document:{head:{appendChild(){}},createElement:()=>({}),addEventListener(){},readyState:'complete',documentElement:{}},
    module:undefined};
  sb.self=sb;sb.window=sb;sb.globalThis=sb;vm.createContext(sb);
  const load=f=>vm.runInContext(fs.readFileSync(E(f),'utf8'),sb,{filename:f});
  return {sb,calls,load,loop:()=>calls.filter(c=>/127\.0\.0\.1|localhost/.test(c))}}

(async()=>{
// 1) public origin never probes 127.0.0.1 (even signed-in, localPeer=1), ?local=1 / localhost opt back in
{const S=sandbox('https://rizal.pw/',{'rdragon.csp.localPeer':'1'});S.load('rpostmenu.js');
 A.strictEqual(S.sb.RPostMenu.sync.url(),'');A.strictEqual(S.sb.RPostMenu.sync.start(()=>{}),false);
 await S.sb.RPostMenu.sync.send({id:'x'});A.deepStrictEqual(S.loop(),[]);pass('rizal.pw + localPeer=1: no :8811 poll/send');}
{const S=sandbox('https://rizal.pw/?local=1',{'rdragon.csp.localPeer':'1'});S.load('rpostmenu.js');A.strictEqual(S.sb.RPostMenu.sync.url(),'http://127.0.0.1:8811');pass('?local=1 opts in to :8811');}
{const S=sandbox('http://127.0.0.1:8080/',{});S.load('rpostmenu.js');A.strictEqual(S.sb.RPostMenu.sync.url(),'http://127.0.0.1:8811');pass('localhost origin keeps :8811');}
{const src=fs.readFileSync(E('rdragon-cryptosocial.js'),'utf8');A.ok(/localPeer"\)==="1"&&\(\/\^\(localhost/.test(src),'rdPeers loopback gated');pass('rdPeers loopback peers gated to localhost/?local=1');}

// 2) 17+25 -> 42 via the local ladder, fast, no loopback
const S=sandbox('https://rizal.pw/',{'rdragon.csp.localPeer':'1'});S.load('engine/rdragon-quick.js');S.load('rdragon-reply.rzl.js');S.load('rdragon-bundle-shim.js');
const C=S.sb.RDRAGON_CARD,Q='What is 17 + 25? Reply with just the number.';
let t0=process.hrtime.bigint();const r=await C.localAnswer(Q);const ms=Number(process.hrtime.bigint()-t0)/1e6;
A.strictEqual(r.text,'42');A.strictEqual(r.tier,'quick');A.ok(ms<50,'local answer in '+ms.toFixed(2)+'ms');pass('17+25 -> 42 in '+ms.toFixed(2)+' ms (tier quick)');
const rr=await S.sb.RDRAGON.reply(Q);A.strictEqual(rr.text,'42');pass('RDRAGON.reply(17+25) -> 42 tier '+rr.tier);

// 3) all of sanity_20 through the offline ladder
const SAN=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/sanity_20.json'),'utf8'));let ok=0;
for(const it of SAN){const a=await C.localAnswer(it.q);const good=a&&it.a.some(re=>new RegExp(re,'i').test(a.text));
 console.log((good?'  ok ':'  MISS ')+JSON.stringify(it.q)+' -> '+JSON.stringify(a&&a.text)+' ['+(a&&a.tier)+']');if(good)ok++}
A.strictEqual(ok,SAN.length,'sanity_20 '+ok+'/'+SAN.length);pass('sanity_20 '+ok+'/'+SAN.length+' via local ladder (no model, no Neo)');
A.deepStrictEqual(S.loop(),[],'no loopback fetch on public origin: '+S.loop().join(','));pass('no 127.0.0.1 fetch during sanity_20 on rizal.pw');

// 4) evaluator is safe: rejects code, keeps precedence, no false positives on prose
const QK=S.sb.RDRAGON_QUICK;A.strictEqual(QK.calc('2+3*4'),14);A.strictEqual(QK.calc('(2+3)*4'),20);A.strictEqual(QK.calc('alert(1)'),null);A.strictEqual(QK.calc('1/0'),null);
A.strictEqual(QK.quick('What is the Ghost Chain?'),null);A.strictEqual(QK.quick('Why were elongated skulls practiced in the Philippines?'),null);A.strictEqual(QK.quick('constructor.constructor("x")()'),null);
pass('safe arithmetic evaluator (no eval, precedence, misses prose)');

// 5) public-site ENJIN is skipped; apps get a single 300 ms try
A.strictEqual(S.sb.RDRAGON.ENJIN_MS,300);A.strictEqual(S.sb.RDRAGON.ENJIN_CONNECT_MS,300);A.strictEqual(S.sb.RDRAGON.onSite(),true);pass('ENJIN budget 300 ms, rizal.pw counted as site (no ENJIN)');

// 6) comment path: local ladder runs before the offline placeholder and before the engine/model load
{const src=fs.readFileSync(E('rdragon-cryptosocial.js'),'utf8');const w=src.indexOf('function rdWriteQueued'),lw=src.indexOf('rdLocal(id,q).then',w),off=src.indexOf('"-offline"',w);
 A.ok(lw>w&&off>lw,'offline written after local miss');const ed=src.indexOf('function rdEdge(');A.ok(src.indexOf('rdLocal(id,q).then(function(lr)',ed)>ed&&src.indexOf('rdLocal(id,q).then(function(lr)',ed)<src.indexOf('rdEngine()',ed),'edge: local before engine');
 A.ok(!/eng\.load\?eng\.load\(null/.test(src),'no blocking pre-load before answer');pass('comment ladder order: local -> offline/edge; no model pre-load gate');}

// 7) diag installer writes rdragon.csp.keys in the site shape, backs up, keeps legacy, TEST-ONLY gate
{const dbs={};function idbOpen(name){const req={};setTimeout(()=>{let fresh=!dbs[name];if(fresh){dbs[name]={k:new Map()};req.result=mk(name);req.onupgradeneeded&&req.onupgradeneeded()}req.result=mk(name);req.onsuccess&&req.onsuccess()},0);return req}
 function mk(name){return{createObjectStore(){dbs[name].k=dbs[name].k||new Map()},close(){},transaction(){const t={};const st={get(k){const r={};r.result=dbs[name].k.get(k);return r},put(v,k){dbs[name].k.set(k,v)},getAllKeys(){const r={};r.result=[...dbs[name].k.keys()];return r}};t.objectStore=()=>st;setTimeout(()=>t.oncomplete&&t.oncomplete(),0);return t}}}
 const store={};const sb={console,crypto:require('crypto').webcrypto,atob:s=>Buffer.from(s,'base64').toString('binary'),indexedDB:{open:idbOpen},localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>{store[k]=v}},
  location:{hostname:'rizal.pw',search:'',reload(){}},fetch:()=>{throw Error('no fetch')}};sb.self=sb;sb.globalThis=sb;vm.createContext(sb);
 vm.runInContext(fs.readFileSync(path.join(__dirname,'diag-profile/install-diag-profile.js'),'utf8'),sb);
 const pack=JSON.parse(fs.readFileSync(path.join(__dirname,'diag-profile/rdragon-diag-profile.json'),'utf8'));
 await A.rejects(sb.installDiagProfile(pack,{reload:false}),/TEST-ONLY/);pass('installer refuses on rizal.pw without ?diag=1');
 sb.location.search='?diag=1';const owner={kp:{privateKey:'OWNER'},me:{handle:'@rbatboxtest'}};
 await new Promise(ok=>{const q=idbOpen('rdragon.csp.keys');q.onupgradeneeded=()=>{};q.onsuccess=()=>{dbs['rdragon.csp.keys'].k.set('device',owner);ok()}});
 const res=await sb.installDiagProfile(pack,{reload:false});
 const site=dbs['rdragon.csp.keys'].k.get('device');A.ok(site.kp&&site.kp.privateKey&&site.kp.publicKey,'kp pair');A.strictEqual(site.me.handle,'@rdragon_diag');A.strictEqual(site.me.pub,pack.pub);A.strictEqual(site.me.profile,pack.profile);A.strictEqual(site.test_only,true);
 A.ok(res.backup&&/^device\.bak-/.test(res.backup));A.strictEqual(dbs['rdragon.csp.keys'].k.get(res.backup),owner);A.ok(dbs['rdragon.device.v1'].k.get('device').me.handle==='@rdragon_diag','legacy mirror');
 const led=JSON.parse(store['rdragon.csp.rsync.v1']);A.ok(led.some(e=>e.t==='profile.create'&&e.handle==='@rdragon_diag'&&e.rgen&&e.cid),'signed profile.create seeded unchanged');
 pass('installer -> rdragon.csp.keys/device {kp,me,test_only} + backup '+res.backup+' + device.v1 mirror + ledger seed');
 const un=await sb.restoreDiagBackup({reload:false});A.strictEqual(dbs['rdragon.csp.keys'].k.get('device'),owner);pass('restoreDiagBackup puts '+un.restored+' back');}

console.log('\n'+n+' passed');})().catch(e=>{console.error('FAIL',e&&e.stack||e);process.exit(1)});
