// node tests: RDIAG diagnose / repair / update / upgrade-request, relay throttle + vote batching, relay scores kept,
// render throttle, version manifest, CI workflow + bot upgrade path (20261028). No network: fetch reads the repo, WebSocket is a mock.
const fs=require('fs'),A=require('assert'),path=require('path'),vm=require('vm');
const ROOT=path.join(__dirname,'..'),E=p=>path.join(ROOT,'rdragon-cryptosocial',p);let n=0;const pass=m=>{n++;console.log('PASS',m)};
const NOSTR=fs.readFileSync(E('engine/vendor/nostr-tools.bundle.js'),'utf8'),IDX=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const J=x=>JSON.stringify(x),eq=(a,b,m)=>A.strictEqual(J(a),J(b),m);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function MockNet(o){o=o||{};const store=[],conns=new Set();let sent=0;return {store,conns,get sent(){return sent},WS:class{constructor(url){this.url=url;this.readyState=0;conns.add(this);setTimeout(()=>{this.readyState=1;this.onopen&&this.onopen()},1)}
  send(s){const m=JSON.parse(s);if(m[0]==='EVENT'){sent++;const rej=o.reject&&o.reject(m[1]);this.onmessage&&this.onmessage({data:JSON.stringify(['OK',m[1].id,!rej,rej||''])});if(rej)return;store.push(m[1]);conns.forEach(c=>{if(c!==this&&c.sub)c.onmessage&&c.onmessage({data:JSON.stringify(['EVENT',c.sub,m[1]])})})}
   else if(m[0]==='REQ'){this.sub=m[1];this.reqs=(this.reqs||0)+1;store.forEach(e=>this.onmessage&&this.onmessage({data:JSON.stringify(['EVENT',m[1],e])}))}}close(){conns.delete(this)}}}}
function win(o){o=o||{};const store=Object.assign({},o.ls||{}),cacheNames=(o.caches||[]).slice(),calls=[];
 const fetch=(url)=>{url=String(url);calls.push(url);if(/127\.0\.0\.1|localhost/.test(url))return Promise.reject(new TypeError('refused'));const f=path.join(ROOT,url.replace(/^https?:\/\/[^/]+/,'').split('?')[0]);
  if(!fs.existsSync(f))return Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({})});const t=fs.readFileSync(f,'utf8');return Promise.resolve({ok:true,status:200,json:()=>Promise.resolve(JSON.parse(t)),text:()=>Promise.resolve(t)})};
 const scripts=[...IDX.matchAll(/(?:src|href)="(\/[^"?#]+\?v=[\w.-]+)"/g)].map(m=>m[1]).map(u=>o.patch?o.patch(u):u).map(u=>({_u:u,getAttribute(k){return /src|href/.test(k)?this._u:null},setAttribute(k,v){this._u=v}}));
 const swState={regs:o.regs||0,updated:0,registered:0};
 const sb={console,Promise,setTimeout,clearTimeout,setInterval:()=>0,clearInterval(){},URL,fetch,Date,
  __enc:s=>new TextEncoder().encode(s),__dec:b=>new TextDecoder().decode(Buffer.from(b)),crypto:{getRandomValues:a=>{a.set(globalThis.crypto.getRandomValues(new Uint8Array(a.length)));return a},subtle:globalThis.crypto.subtle},
  location:{href:'https://rizal.pw/'+(o.search||''),pathname:'/',search:o.search||'',hostname:'rizal.pw',protocol:'https:',replace(u){sb.__replaced=u}},
  localStorage:{get length(){return Object.keys(store).length},key:i=>Object.keys(store)[i],getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}},
  caches:{keys:()=>Promise.resolve(cacheNames.slice()),delete:k=>{const i=cacheNames.indexOf(k);if(i>=0)cacheNames.splice(i,1);return Promise.resolve(i>=0)}},
  navigator:{onLine:true,userAgent:'node-test',clipboard:{writeText:t=>{sb.__clip=t;return Promise.resolve()}},serviceWorker:{controller:null,getRegistrations:()=>Promise.resolve(Array.from({length:swState.regs},()=>({update:()=>{swState.updated++;return Promise.resolve()}}))),register:()=>{swState.registered++;swState.regs++;return Promise.resolve({})}}},
  document:{head:{appendChild(s){const f=String(s.src).split('?')[0].replace(/^\//,'');setTimeout(()=>{try{if(/rdragon-cryptosocial\/engine\//.test(f)){vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),sb);sb.__hot=(sb.__hot||[]).concat(f)}s.onload&&s.onload()}catch(e){s.onerror&&s.onerror(e)}},0)}},
   createElement:()=>({}),querySelectorAll:()=>scripts,querySelector:q=>{const m=q.match(/\^="([^"]+)"/);return m?scripts.find(s=>s._u.indexOf(m[1])===0)||null:null},addEventListener(){},readyState:'complete'}};
 if(o.WS)sb.WebSocket=o.WS;if(o.storage)sb.RDRAGON_STORAGE=o.storage;
 sb.window=sb;sb.self=sb;sb.globalThis=sb;vm.createContext(sb);vm.runInContext('window.TextEncoder=class{encode(s){const b=__enc(String(s));const a=new Uint8Array(b.length);a.set(b);return a}};window.TextDecoder=class{decode(b){return __dec(b)}}',sb);
 sb.load=f=>vm.runInContext(fs.readFileSync(E(f),'utf8'),sb,{filename:f});if(o.nostr)vm.runInContext(NOSTR+';window.NostrTools=NostrTools',sb);
 return {sb,store,cacheNames,calls,swState,scripts}}
function full(o){const W=win(o),s=W.sb;s.RDRAGON_CONFIG={};['engine/rdragon-quick.js','engine/rdragon-learn.js','engine/rdragon-open.js','rdragon-reply.rzl.js','rdragon-bundle-shim.js','rpostmenu.js','rrelay.js','rdiag.js'].forEach(f=>s.load(f));return W}
const PC=JSON.parse(fs.readFileSync(path.join(ROOT,'sw-precache.json'),'utf8')),CUR='rizalpw-'+PC.v;
(async()=>{
 // 1) DIAGNOSE: every check runs and the report is copyable JSON
 {const net=MockNet(),W=full({WS:net.WS,nostr:1,caches:[CUR,'rizalpw-models'],regs:1}),R=W.sb.RDIAG;await W.sb.RRELAY.start();await wait(20);
  const r=await R.run();['versions','sw','gate8811','storage','relay','engine','ledger','sanity_20'].forEach(k=>A.ok(r.checks[k],k));
  A.strictEqual(r.checks.versions.pass,true,JSON.stringify(r.checks.versions));A.ok(r.checks.versions.ok>=20);A.strictEqual(r.checks.gate8811.pass,true);A.strictEqual(r.checks.gate8811.transponder,'');
  A.strictEqual(r.checks.sw.pass,true);A.strictEqual(r.checks.sw.hasCurrent,true);A.strictEqual(r.checks.engine.pass,true,JSON.stringify(r.checks.engine));A.strictEqual(r.checks.relay.pass,true);
  const s=r.checks.sanity_20;A.strictEqual(s.total,20);A.ok(s.answeredLocally>=5,'local ladder answers several');A.strictEqual(s.correct,s.answeredLocally,'every local answer correct: '+s.wrong);
  A.strictEqual(r.checks.ledger.pass,null);A.ok(r.ok,r.summary);A.ok(/^PASS all · sanity \d+\/\d+ local of 20/.test(r.summary),r.summary);A.strictEqual(r.test_only,true);
  await R.copy(r);A.strictEqual(JSON.stringify(JSON.parse(W.sb.__clip).checks.gate8811),JSON.stringify(r.checks.gate8811));A.ok(!/private_key|"d":|nsec/.test(W.sb.__clip));
  const ev=await R.publish(r);A.ok(ev&&ev.id);const note=net.store.find(e=>e.id===ev.id);const p=JSON.parse(note.content);A.strictEqual(p.kind,'diag');A.ok(p.test_only&&/TEST-ONLY diag/.test(p.text));A.ok(JSON.parse(p.report).checks.versions);
  A.ok(!W.calls.some(u=>/127\.0\.0\.1|8811/.test(u)));pass('diagnose: versions, SW/caches, :8811 gate, storage, relay, engine/quick/open/learn, ledger, sanity_20 -> copyable JSON + TEST-ONLY diag note');}
 // 2) DIAGNOSE detects problems: stale bundle, stale cache, loopback transponder
 {const W=full({caches:[CUR,'rizalpw-old1','rizalpw-models'],patch:u=>u.replace(/rdragon-open\.js\?v=\d+/,'rdragon-open.js?v=1')});W.sb.location.search='?local=1';W.store['rdragon.csp.localPeer']='1';
  const r=await W.sb.RDIAG.run({sanity:false});A.strictEqual(r.ok,false);A.ok(r.failed.includes('versions')&&r.failed.includes('sw')&&r.failed.includes('gate8811'),r.failed);
  eq(r.checks.sw.stale,['rizalpw-old1']);A.ok(r.checks.versions.stale.some(x=>/rdragon-open/.test(x.file)));pass('diagnose flags stale bundle, stale cache and an armed :8811 probe');}
 // 3) REPAIR: each action backs up first; nothing deleted except stale re-fetchable caches; restore works
 {const net=MockNet(),W=full({WS:net.WS,nostr:1,caches:[CUR,'rizalpw-old1','rizalpw-old2','rizalpw-models'],regs:0,ls:{'rdragon.csp.localPeer':'1','rdragon.other':'x'}}),R=W.sb.RDIAG;
  let x=await R.repair.resetLocalPeer();A.ok(x.ok&&x.backup);A.strictEqual(W.store['rdragon.csp.localPeer'],undefined);A.strictEqual(JSON.parse(W.store[x.backup]).ls['rdragon.csp.localPeer'],'1');
  x=await R.repair.clearStaleCaches();A.ok(x.ok);eq(x.cachesDropped.sort(),['rizalpw-old1','rizalpw-old2']);eq(W.cacheNames.sort(),[CUR,'rizalpw-models'].sort());A.strictEqual(W.swState.registered,1);
  const L=W.sb.RDRAGON_LEARN;L.record('bad q here','bad answer text.','open',{reply:'b'});L.signal('b','down');L.record('good q here','good answer text.','open',{reply:'g'});L.signal('g','up');const before=L.stats().items;
  x=await R.repair.reweightLearned();A.ok(x.ok&&x.reweighted===1&&x.deleted===0);A.strictEqual(L.stats().items,before);A.ok(L.get(L.keyOf('bad q here','bad answer text.')).quarantined);A.ok(L.lookup('good q here'));
  await W.sb.RRELAY.start();await wait(20);x=await R.repair.resyncRelay();A.ok(x.ok&&x.resync);await wait(5);A.ok([...net.conns].some(c=>c.reqs>=2),'REQ re-sent');
  W.sb.installDiagProfile=()=>Promise.resolve({handle:'@rdragon_diag'});W.sb.restoreDiagBackup=()=>Promise.resolve({restored:1});x=await R.repair.reimportDiag();A.ok(x.ok&&x.installed);x=await R.repair.restoreDiagBackup();A.ok(x.ok&&x.restored);
  const bks=R.backups();A.ok(bks.length>=6,'one backup per action');const first=bks.find(b=>b.action==='resetLocalPeer');const rr=await R.restore(first.id);A.ok(rr.ok);A.strictEqual(W.store['rdragon.csp.localPeer'],'1');A.strictEqual(W.store['rdragon.other'],'x');
  pass('repair: reset localPeer, clear stale caches + re-register SW, reweight learned (0 deleted), re-sync relay, re-import/restore diag, each backed up + restorable');}
 // 4) REPAIR under ?nostore: backups stay in memory, SW not registered
 {const W=full({storage:{ok:false,mode:'memory'},caches:[]});const x=await W.sb.RDIAG.repair.clearStaleCaches();A.ok(x.ok&&/skipped/.test(x.sw));A.ok(!Object.keys(W.store).some(k=>/^rdiag\.bak\./.test(k)));A.strictEqual(W.sb.RDIAG.backups().length,1);pass('repair under no-storage: memory-only backups, no SW');}
 // 5) UPDATE: check live manifest, hot-reload engine modules, force update busts cache (no reload in test)
 {const W=full({caches:[CUR,'rizalpw-models'],regs:1,patch:u=>u.replace(/rdragon-learn\.js\?v=\d+/,'rdragon-learn.js?v=0').replace(/rdragon-cryptosocial\.js\?v=\d+/,'rdragon-cryptosocial.js?v=1')}),U=W.sb.RDIAG.update;
  const c=await U.check();A.strictEqual(c.upToDate,false);eq(c.hotable,['rdragon-cryptosocial/engine/rdragon-learn.js']);
  const h=await U.hot();eq(h.hot,['rdragon-cryptosocial/engine/rdragon-learn.js']);eq(h.needsReload,['rdragon-cryptosocial/rdragon-cryptosocial.js']);A.ok(h.backup);
  const c2=await U.check();eq(c2.newer.map(x=>x.file),['rdragon-cryptosocial/rdragon-cryptosocial.js']);
  const f=await U.force({reload:false});A.ok(/^\/\?_u=\d+$/.test(f.reloadTo),f.reloadTo);eq(W.cacheNames,['rizalpw-models']);A.strictEqual(W.swState.updated,1);A.strictEqual(W.sb.__replaced,undefined);
  const f2=await U.force();A.ok(W.sb.__replaced&&/_u=/.test(W.sb.__replaced));pass('update: live manifest check, hot-reload engine modules, force update (cache bust + SW update + reload)');}
 // 6) UPGRADE: request only (issue URL + TEST-ONLY Nostr note); the page never pushes
 {const net=MockNet(),W=full({WS:net.WS,nostr:1,caches:[CUR]});await W.sb.RRELAY.start();await wait(20);
  const u=await W.sb.RDIAG.upgradeRequest({title:'quick math misses percent',want:'"What is 15% of 80?" should answer 12 locally',sanity:false});
  A.ok(u.issueUrl.indexOf('https://github.com/RIZALEON/rizal.pw/issues/new?template=bot-upgrade-request.yml')===0);A.ok(/bot-upgrade\.sh/.test(u.body)&&/TEST-ONLY/.test(u.body));A.ok(u.nostr);
  const p=JSON.parse(net.store.find(e=>e.id===u.nostr).content);A.strictEqual(p.kind,'upgrade-request');A.ok(/15% of 80/.test(p.text));
  const src=fs.readFileSync(E('rdiag.js'),'utf8');A.ok(!/api\.github\.com|Authorization|ghp_|github_pat_|private_key/.test(src),'no token / push path in the page');pass('upgrade: TEST-ONLY upgrade-request note + prefilled issue; no push path or secret in the client');}
 // 7) relay throttle + vote batching + rate-limit backoff
 {const net=MockNet(),W=win({WS:net.WS,nostr:1});W.sb.RDRAGON_CONFIG={relayGapMs:200,relayVoteBatchMs:50};W.sb.load('rrelay.js');const R=W.sb.RRELAY;await R.start();await wait(20);
  const ps=[];for(let i=0;i<8;i++)ps.push(R.publish({t:'comment',id:'c'+i,parent:'p',post:'p',text:'hello '+i}));await wait(30);A.strictEqual(R.status().published,4,'burst of 4');A.strictEqual(R.status().queued,4);
  await Promise.all(ps);A.strictEqual(R.status().published,8,'rest drained at the throttle rate');
  const before=net.store.length;for(let i=0;i<6;i++)R.vote('q'+i,'a'+i,1);R.vote('q0','a0',-1);await wait(400);const notes=[...new Map(net.store.slice(before).map(e=>[e.id,e])).values()].map(e=>JSON.parse(e.content));A.strictEqual(notes.length,1,'6 votes -> one batched note');
  const all=[{q:notes[0].q,a:notes[0].text,vote:notes[0].vote}].concat(notes[0].votes.map(x=>({q:x.q,a:x.a,vote:x.vote})));A.strictEqual(all.length,6);A.strictEqual(all.find(x=>x.q==='q0').vote,-1,'latest vote wins');A.ok(R.valid(notes[0]));
  const net2=MockNet({reject:()=>'rate-limited: slow down'}),W2=win({WS:net2.WS,nostr:1});W2.sb.RDRAGON_CONFIG={relayGapMs:50};W2.sb.load('rrelay.js');const R2=W2.sb.RRELAY;await R2.start();await wait(20);await R2.publish({t:'comment',id:'x',parent:'p',post:'p',text:'hi'});await wait(10);
  A.ok(R2.status().backoffMs>=4000,'backoff after rate-limit');A.ok(/rate-limited/.test(R2.summary().line));pass('relay: token-bucket throttle, batched vote notes (latest wins), backoff after a rate-limit reject');}
 // 8) scores survive the relay; batched votes ingested; render throttle wired
 {const W=win({nostr:1});W.sb.load('rrelay.js');const p=W.sb.RRELAY.payloadOf({kind:'rdragon.reply',status:'answered',id:'r1',post_id:'p',text:'hi there',tier:'pack',score:0.8,why:'pack 0.8'});A.strictEqual(p.score,0.8);A.strictEqual(p.why,'pack 0.8');A.ok(W.sb.RRELAY.valid(p));A.ok(!W.sb.RRELAY.valid(Object.assign({},p,{score:7})));
  const src=fs.readFileSync(E('rdragon-cryptosocial.js'),'utf8');A.ok(/score:typeof p\.score==="number"\?p\.score:undefined/.test(src));A.ok(/\(p\.votes\|\|\[\]\)\.forEach/.test(src));A.ok(/RLMIN=CFG\.relayRenderMs\|\|2000/.test(src)&&/rlBusy\(\)/.test(src)&&/if\(rlT\)return/.test(src));
  A.ok(/window\.RRELAY\.vote\(q,text\|\|b\.text,vote\)/.test(src));pass('relay replies keep score/why; batched votes ingested; relay renders throttled (≥2 s, paused while clicking/typing)');}
 // 9) manifest current, precache + load order, CI workflow, issue template, upgrade script, docs
 {const build=require(path.join(ROOT,'tests/diag-profile/make-version-manifest.js'));eq(JSON.parse(fs.readFileSync(path.join(ROOT,'rdragon-version.json'),'utf8')),JSON.parse(JSON.stringify(build())));
  A.ok(/rdiag\.js/.test(JSON.stringify(PC.files))&&/rdragon-version\.json/.test(JSON.stringify(PC.files)));A.ok(IDX.search(/rdiag\.js\?v=\d+/)>IDX.search(/rdragon-bundle-shim\.js\?v=\d+/));
  const wf=fs.readFileSync(path.join(ROOT,'.github/workflows/tests.yml'),'utf8');A.ok(/pull_request/.test(wf)&&/tests\/test-\*\.js/.test(wf)&&!/secrets\./.test(wf));A.ok(fs.existsSync(path.join(ROOT,'.github/ISSUE_TEMPLATE/bot-upgrade-request.yml')));
  const sh=fs.readFileSync(path.join(ROOT,'tests/diag-profile/bot-upgrade.sh'),'utf8');['backup','checkout -B','make-version-manifest','tests/test-','gh pr create','gh pr merge','GHOSTMACHINE'].forEach(k=>A.ok(sh.indexOf(k)>=0,k));A.ok(sh.indexOf('backup')<sh.indexOf('git push'));A.ok(!/sudo |192\.168\.0\.75|ghp_/.test(sh.split("\n").filter(l=>!/^\s*#/.test(l)).join("\n")));
  const how=fs.readFileSync(path.join(ROOT,'tests/diag-profile/HOW-BOTS-USE.md'),'utf8');['DIAGNOSE','REPAIR','UPDATE','UPGRADE'].forEach(k=>A.ok(how.indexOf(k)>=0,k));
  pass('version manifest current; precache + load order; CI workflow; issue template; bot-upgrade.sh; HOW-BOTS-USE guide');}
 console.log('\n'+n+' passed');process.exit(0)
})().catch(e=>{console.error('FAIL',e);process.exit(1)});
