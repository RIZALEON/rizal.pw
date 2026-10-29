// node tests: storage-optional mode, TEST-ONLY guest identity, LAYER 3 Nostr relay (mock), graceful degrade (20261028).
// Run: node tests/test-rdragon-nostore-relay.js — no network: WebSocket is a mock relay shared by two "visitors".
const fs=require('fs'),A=require('assert'),path=require('path'),vm=require('vm');
const ROOT=path.join(__dirname,'..'),E=p=>path.join(ROOT,'rdragon-cryptosocial',p);let n=0;const pass=m=>{n++;console.log('PASS',m)};
const NOSTR=fs.readFileSync(E('engine/vendor/nostr-tools.bundle.js'),'utf8');
// mock relay network: one shared event store, NIP-01 subset (EVENT/REQ/OK/EOSE)
function MockNet(){const store=[],conns=new Set();return {store,WS:class{constructor(url){this.url=url;this.readyState=0;conns.add(this);setTimeout(()=>{this.readyState=1;this.onopen&&this.onopen()},1)}
  send(s){const m=JSON.parse(s);if(m[0]==='EVENT'){store.push(m[1]);this.onmessage&&this.onmessage({data:JSON.stringify(['OK',m[1].id,true,''])});conns.forEach(c=>{if(c!==this&&c.sub)c.onmessage&&c.onmessage({data:JSON.stringify(['EVENT',c.sub,m[1]])})})}
   else if(m[0]==='REQ'){this.sub=m[1];const t=m[2]['#t'][0];store.filter(e=>e.tags.some(x=>x[0]==='t'&&x[1]===t)).forEach(e=>this.onmessage&&this.onmessage({data:JSON.stringify(['EVENT',m[1],e])}));this.onmessage&&this.onmessage({data:JSON.stringify(['EOSE',m[1]])})}}
  close(){conns.delete(this)}}}}
function win(o){o=o||{};const sb={console,URL,Promise,setTimeout,clearTimeout,setInterval:()=>0,clearInterval(){},__enc:s=>new TextEncoder().encode(s),__dec:b=>new TextDecoder().decode(Buffer.from(b)),crypto:{getRandomValues:a=>{a.set(globalThis.crypto.getRandomValues(new Uint8Array(a.length)));return a},subtle:globalThis.crypto.subtle},
  location:{search:o.search||'',hostname:'rizal.pw',protocol:'https:'},navigator:{onLine:true},
  document:{head:{appendChild(s){/* script loader: nostr lib is preloaded below */setTimeout(()=>s.onload&&s.onload(),0)}},createElement:()=>({})}};
  if(o.ls!==undefined)Object.defineProperty(sb,'localStorage',{configurable:true,get(){if(o.ls==='throw')throw new Error('SecurityError');return o.ls}});
  sb.indexedDB=o.idb===undefined?{open(){}}:o.idb;if(o.WS!==undefined)sb.WebSocket=o.WS;sb.window=sb;sb.self=sb;sb.globalThis=sb;vm.createContext(sb);vm.runInContext('window.TextEncoder=class{encode(s){const b=__enc(String(s));const a=new Uint8Array(b.length);a.set(b);return a}};window.TextDecoder=class{decode(b){return __dec(b)}}',sb);
  sb.load=f=>vm.runInContext(fs.readFileSync(E(f),'utf8'),sb,{filename:f});if(o.nostr)vm.runInContext(NOSTR+';window.NostrTools=NostrTools',sb);return sb}
function okLS(){const m={};return{getItem:k=>k in m?m[k]:null,setItem:(k,v)=>{m[k]=String(v)},removeItem:k=>{delete m[k]}}}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 // 1) ?nostore=1 forces memory mode; nothing throws; idb open fails async; caches stub rejects
 {const w=win({search:'?nostore=1',ls:okLS()});w.load('rstore.js');const st=w.RDRAGON_STORAGE;A.strictEqual(st.ok,false);A.strictEqual(st.mode,'memory');A.ok(st.forced);
  A.ok(w.localStorage.__memory);w.localStorage.setItem('a','1');A.strictEqual(w.localStorage.getItem('a'),'1');
  let err=0;const r=w.indexedDB.open('x',1);r.onerror=()=>err++;await wait(5);A.strictEqual(err,1);await w.caches.open('x').then(()=>A.fail('cache'),()=>0);
  w.load('rdragon-config.js');A.strictEqual(w.RDRAGON_CONFIG.edgeEngine,false);A.strictEqual(w.RDRAGON_CONFIG.preloadEngine,false);A.ok(w.RDRAGON_CONFIG.noStorage);pass('?nostore=1: memory storage, idb/caches stubs, granite skipped');}
 // 2) denied localStorage (getter throws) -> memory, no throw
 {const w=win({ls:'throw'});w.load('rstore.js');A.strictEqual(w.RDRAGON_STORAGE.reason,'localStorage denied');A.strictEqual(w.localStorage.getItem('z'),null);pass('denied localStorage -> in-memory fallback');}
 // 3) storage OK -> persistent, granite kept; quota error on setItem does not throw
 {const ls=okLS(),s0=ls.setItem;ls.setItem=(k,v)=>{if(k==='k')throw new Error('QuotaExceededError');s0(k,v)};const w=win({ls});w.load('rstore.js');A.strictEqual(w.RDRAGON_STORAGE.ok,true);w.localStorage.setItem('k','v');w.load('rdragon-config.js');A.notStrictEqual(w.RDRAGON_CONFIG.edgeEngine,false);pass('persistent mode keeps granite; quota error swallowed');}
 // 4) no-storage reply path: both voices from rdragon-open, larger answers pack, fresh fetch
 {const O=require(E('engine/rdragon-open.js'));const a=O.compose('Tell me a short joke'),b=O.compose2('Tell me a short joke');A.ok(a.text&&b.text&&a.text!==b.text);
  const pk=JSON.parse(fs.readFileSync(E('engine/answers.json'),'utf8'));A.ok(pk.answers.length>=60,'answers '+pk.answers.length);
  A.ok(/answers\.json\?v=3',\{cache:'no-store'\}/.test(fs.readFileSync(E('rdragon-bundle-shim.js'),'utf8')));
  const csp=fs.readFileSync(E('rdragon-cryptosocial.js'),'utf8');A.ok(/if\(CFG\.edgeEngine===false\)\{rdVoice2\(id,q\);return\}/.test(csp));
  A.ok(/RDRAGON_STORAGE&&!window\.RDRAGON_STORAGE\.ok\)&&'serviceWorker'/.test(fs.readFileSync(path.join(ROOT,'sw-register.js'),'utf8')));pass('no-storage: both voices at once, '+pk.answers.length+'-row answers.json no-store, SW skipped');}
 // 5) guest identity: per-session, in memory, TEST-ONLY, never owner/diag
 const net=MockNet();
 const VA=win({ls:okLS(),nostr:true,WS:net.WS});VA.load('rrelay.js');await VA.RRELAY.start();const g=VA.RRELAY.guest();
 A.ok(/^guest-[0-9a-f]{6}$/.test(g.handle)&&g.test_only&&g.session&&!g.owner&&!g.vault&&!g.biometric&&/^[0-9a-f]{64}$/.test(g.pubkey));A.ok(Object.isFrozen(g));
 A.ok(!/rdragon_diag|CHASERIZAL/i.test(JSON.stringify(g)));A.ok(!('sk' in g)&&!JSON.stringify(g).includes('secret'));
 const src=fs.readFileSync(E('rrelay.js'),'utf8');A.ok(!/localStorage|indexedDB/.test(src),'guest key never stored');
 const VB=win({ls:okLS(),nostr:true,WS:net.WS});VB.load('rrelay.js');await VB.RRELAY.start();A.notStrictEqual(VB.RRELAY.guest().pubkey,g.pubkey);
 {const W=win({WS:net.WS});W.document.head.appendChild=s=>setTimeout(()=>s.onerror&&s.onerror(),0);W.load('rrelay.js');A.strictEqual(await W.RRELAY.start(),false);A.ok(/^guest-[0-9a-f]{6}$/.test(W.RRELAY.guest().handle)&&W.RRELAY.guest().pubkey===null);}
 pass('guest identity: TEST-ONLY, per-session, memory-only, distinct per visitor, local guest if lib fails');
 // 6) relay publish/subscribe round trip between two visitors (mock), signatures verified, tampering rejected
 {const got=[];VB.RRELAY.subscribe((p,m)=>got.push([p,m]));await wait(10);
  await VA.RRELAY.publish({t:'comment',id:'c-test-1',parent:'p1',post:'p1',text:'TEST-ONLY hello from visitor A'});
  await VA.RRELAY.publish({t:'rdragon.reply',kind:'rdragon.reply',id:'rdr-c-test-1-open',post_id:'c-test-1',par:'c-test-1',status:'answered',tier:'open',text:'Hey! RDRAGON here.'});
  await VA.RRELAY.publish({t:'rdragon.reply',kind:'rdragon.reply',id:'rdr-c-test-1-voice2',post_id:'c-test-1',par:'c-test-1',status:'answered',tier:'open',voice:'DRAGOSKUL',text:'DRAGOSKUL here too.'});
  A.strictEqual(await VA.RRELAY.publish({t:'rdragon.reply',kind:'rdragon.reply',id:'x',par:'c',status:'offline',text:'RDRAGON is offline'}),null,'placeholders never published');
  await wait(20);A.strictEqual(got.length,3,'B received '+got.length);A.strictEqual(got[0][0].text,'TEST-ONLY hello from visitor A');A.strictEqual(got[0][1].author,g.handle);A.strictEqual(got[2][0].voice,'DRAGOSKUL');
  A.ok(net.store.every(e=>e.tags.some(t=>t[0]==='t'&&t[1]==='rizalpw-csp-v1')&&e.pubkey===g.pubkey));
  // late joiner gets history via REQ
  const VC=win({ls:okLS(),nostr:true,WS:net.WS});VC.load('rrelay.js');const g2=[];VC.RRELAY.subscribe(p=>g2.push(p));await wait(30);A.strictEqual(g2.length,3,'late joiner '+g2.length);
  // tampered content (bad sig) and foreign app are rejected
  const t=JSON.parse(JSON.stringify(net.store[0]));t.content=t.content.replace('hello','HACKED');t.id='f'.repeat(64);const ws=new net.WS('wss://x');await wait(5);
  const VD=win({ls:okLS(),nostr:true,WS:net.WS});VD.load('rrelay.js');const g3=[];VD.RRELAY.subscribe(p=>g3.push(p));await wait(30);const before=g3.length;ws.send(JSON.stringify(['EVENT',t]));await wait(10);A.strictEqual(g3.length,before,'tampered rejected');
  A.strictEqual(VA.RRELAY.valid({v:1,app:'evil',kind:'comment',id:'a',parent:'b',text:'x'}),false);A.strictEqual(VA.RRELAY.valid({v:1,app:'rizal.pw',kind:'comment',id:'a',parent:'b',text:'x'.repeat(601)}),false);
  pass('relay: publish/subscribe across visitors, history for late joiners, signatures verified, tampering/placeholders rejected');}
 // 7) graceful degrade: no WebSocket / WS throws / relay=0 -> no-op, never throws; local composer still answers
 {for(const WS of [undefined,class{constructor(){throw new Error('blocked')}}]){const W=win({nostr:true,WS});W.load('rrelay.js');const r=await W.RRELAY.publish({t:'comment',id:'a',parent:'b',text:'hi'});A.ok(r===null||typeof r==='object');}
  const W2=win({nostr:true,WS:net.WS,search:'?relay=0'});W2.load('rrelay.js');A.strictEqual(await W2.RRELAY.start(),false);
  const O=require(E('engine/rdragon-open.js'));A.ok(/Canberra/.test(O.compose('What is the capital of Australia?').text));pass('graceful degrade: relay unreachable/blocked/off -> no-op, local replies still work');}
 // 8) cryptosocial wiring
 {const csp=fs.readFileSync(E('rdragon-cryptosocial.js'),'utf8');
  A.ok(/if\(!ev\.relay&&window\.RRELAY&&\(ev\.t==="comment"\|\|\(ev\.kind==="rdragon\.reply"&&ev\.status==="answered"\)\)&&rdSafe/.test(csp),'publish hook');
  A.ok(/function rlIngest/.test(csp)&&/by:m\.author,relay:1/.test(csp),'ingest forces guest author');A.ok(/RRELAY\.subscribe\(rlIngest\)/.test(csp));
  A.ok(/var GU=!S\.me&&window\.RRELAY\?window\.RRELAY\.guest\(\):null;if\(!S\.me&&!GU\)return gate\(\);/.test(csp)&&/if\(GU\)\{cev\.by=GU\.handle;cev\.guest=1\}/.test(csp),'guest comment');
  const idx=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');A.ok(idx.indexOf('rstore.js?v=1')<idx.indexOf('rdragon-config.js?v=4')&&idx.search(/rrelay\.js\?v=\d+/)>0&&idx.search(/rrelay\.js\?v=\d+/)<idx.search(/rdragon-cryptosocial\.js\?v=\d+/));
  const all=['rrelay.js','rstore.js','rdragon-cryptosocial.js'].map(f=>fs.readFileSync(E(f),'utf8')).join('');A.ok(!/nsec1[0-9a-z]{20,}|ghp_[A-Za-z0-9]{20,}/.test(all),'no secrets shipped');pass('cryptosocial: publish hook, guarded ingest, guest commenting, load order, no secrets');}
 console.log('\n'+n+' passed');process.exit(0);
})().catch(e=>{console.error('FAIL',e);process.exit(1)});
