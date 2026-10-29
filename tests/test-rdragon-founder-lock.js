// t109u 20261029: LOCKED: do not remove — rlogin.founder-fallback.v1. Password login for @chaserizal must always reach the founder-recovery
// fallback (IndexedDB → localStorage → /data/founder/recovery.json → relays) and cache it into IndexedDB after a successful login. FAKE password only.
const fs=require('fs'),A=require('assert'),path=require('path'),vm=require('vm');
const ROOT=path.join(__dirname,'..'),R=p=>fs.readFileSync(path.join(ROOT,p),'utf8');let n=0;const pass=m=>{n++;console.log('PASS',m)};
const ids=html=>[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);const wait=ms=>new Promise(r=>setTimeout(r,ms));
const PW='Fake-Test-Passphrase-42!',ITER=1000;
function page(file,{idb:init={},ls:lsInit={},cfg={},site=null}={}){const html=R(file),E={};ids(html).forEach(i=>{E[i]={id:i,value:'',textContent:'',hidden:false,disabled:false,dataset:{},className:'',classList:{toggle(){}},style:{},firstChild:{style:{}},files:null,focus(){},onclick:null}});
 const m=new Map(Object.entries(init));const db={transaction(){const st={get(k){const r={};setTimeout(()=>{r.result=m.get(k);r.onsuccess&&r.onsuccess()},0);return r},getAllKeys(){const r={};setTimeout(()=>{r.result=[...m.keys()];r.onsuccess&&r.onsuccess()},0);return r},put(v,k){m.set(k,v)}};const t={objectStore:()=>st};setTimeout(()=>t.oncomplete&&t.oncomplete(),5);return t}};
 const L={...lsInit};const ls={getItem:k=>k in L?L[k]:null,setItem:(k,v)=>{L[k]=String(v)},removeItem:k=>{delete L[k]},key:i=>Object.keys(L)[i]||null,get length(){return Object.keys(L).length}};
 const sb={console,setTimeout,clearTimeout,setInterval:()=>0,Promise,TextEncoder,TextDecoder,URL,crypto:globalThis.crypto,atob,btoa,Uint8Array,ArrayBuffer,RFOUNDER_MIN_ITER:ITER,
  fetch:async u=>(String(u).includes('/data/founder/recovery.json')&&site?{ok:true,json:async()=>site}:{ok:false,json:async()=>null}),
  localStorage:ls,indexedDB:{open(){const q={result:db};setTimeout(()=>q.onsuccess&&q.onsuccess(),0);return q}},navigator:{platform:'test'},
  location:{href:'https://rizal.pw/login/',search:'',origin:'https://rizal.pw',hostname:'rizal.pw'},
  document:{body:{dataset:{}},getElementById:i=>E[i]||null,querySelectorAll:()=>[],querySelector:()=>null,createElement:()=>({style:{},dataset:{},classList:{toggle(){}}})},
  RDRAGON_CONFIG:Object.assign({noRedirect:true,founderRecoveryIter:ITER,founderRelayPublish:false,founderRelayLookup:false},cfg)};sb.window=sb;sb.self=sb;sb.globalThis=sb;vm.createContext(sb);
 vm.runInContext(R('rdragon-cryptosocial/rsync-core.js'),sb);vm.runInContext(R('rdragon-cryptosocial/rfounder.js'),sb);vm.runInContext(R('rdragon-cryptosocial/rlogin-page.js'),sb);return {sb,E,m,L,html}}
async function login(P,user,pw){P.E['l-user'].value=user;P.E['l-pass'].value=pw;P.E['b-login'].onclick();for(let i=0;i<500&&(P.E['b-login'].disabled||P.E.msg.textContent==='checking…');i++)await wait(20);await wait(30);return P.E.msg.textContent}
(async()=>{
 const src=R('rdragon-cryptosocial/rlogin-page.js'),cfg=R('rdragon-cryptosocial/rdragon-config.js');
 // 1) static lock: markers, layer order, guard, cache, config manifest note, both pages load rfounder before rlogin-page
 A.ok(/LOCKED: do not remove/.test(src)&&/rlogin\.founder-fallback\.v1/.test(src),'LOCKED marker in rlogin-page.js');
 const rr=src.slice(src.indexOf('function recoveryRec('));const ix=['RF.IDBK','RF.LSK','RF.fromSite(CFG.founderRecoveryUrl)','RF.fromRelay(RELAYS)'].map(k=>rr.indexOf(k));
 A.ok(ix.every(i=>i>0)&&ix.every((v,i)=>!i||v>ix[i-1]),'layer order idb → localStorage → site → relay');
 A.ok(/pwRec\(h\)\.then\(function\(x\)\{return x\|\|recoveryRec\(h,PW,F\)\}\)/.test(src),'password login falls through to recoveryRec');
 A.ok(/function lockCheck\(/.test(src)&&/function cacheFounder\(/.test(src)&&/cacheFounder\(h\)/.test(src)&&/out\.founderLock=lockCheck\(\)/.test(src),'guard + cache + self-check wired');
 A.ok(/founderFallbackLock=\{id:"rlogin\.founder-fallback\.v1",status:"LOCKED: do not remove"/.test(cfg)&&/founderRecoveryUrl=c\.founderRecoveryUrl\|\|"\/data\/founder\/recovery\.json"/.test(cfg),'config manifest note + default site URL');
 for(const f of ['login/index.html','login/options/index.html']){const h=R(f);const a=h.indexOf('rfounder.js'),b=h.indexOf('rlogin-page.js');A.ok(a>0&&b>a,f+' loads rfounder.js before rlogin-page.js')}
 A.ok(/LOCKED: do not remove/.test(R('data/founder/README.md')),'README lock note');
 pass('static lock: marker, layer order, password→recovery fall-through, guard/cache/self-check, config note, script order');
 // 2) runtime guard: lockCheck ok with founder config; reports missing pieces; config cannot switch the site layer off
 const B=page('login/index.html'),RS=B.sb.RSync,RF=B.sb.RFOUNDER;
 const w=await RS.passwordWrap(PW,{iter:ITER});const pid=await RS.profileIdFor(w.signer.pub);
 const pkg=await RS.casketPackage({profile:pid,card:{handle:'@chaserizal',name:'Rizal'},login:w.rec,devices:{},sessions:{},rid:'ЯID-0001-3QQS'},w.signer);
 const cm=await RS.packageCommitment(pkg);const founder={handle:'@chaserizal',rid:'ЯID-0001-3QQS',profile:pid,commitment:cm.sha256};
 const blob=await RF.wrap(pkg,PW,w.signer,{handle:'@chaserizal',rid:'ЯID-0001-3QQS',profile:pid},{iter:ITER});
 {const P=page('login/index.html',{cfg:{founder,founderRecoveryUrl:''}});await wait(30);const L=P.sb.RLOGIN_LOCK;A.ok(L.ok,JSON.stringify(L.missing));A.deepStrictEqual([...L.layers],['idb','localStorage','site','relay']);
  A.strictEqual(P.sb.RDRAGON_CONFIG.founderRecoveryUrl,'/data/founder/recovery.json','empty URL forced back to the site layer');
  const sc=await P.sb.RLOGIN_PAGE.selfCheck('chaserizal');A.ok(sc.founderLock&&sc.founderLock.ok,'self-check reports the lock');
  const N=page('login/index.html');await wait(30);A.ok(!N.sb.RLOGIN_LOCK.ok&&N.sb.RLOGIN_LOCK.missing.includes('RDRAGON_CONFIG.founder'),'guard reports missing founder config');
  pass('runtime guard: lock ok, layers fixed, site URL cannot be emptied, self-check shows it, missing pieces reported');}
 // 3) any fresh browser: password login reaches the site copy, then the record is cached in IndexedDB + localStorage
 {const P=page('login/index.html',{cfg:{founder},site:blob});await wait(50);const t=await login(P,'chaserizal',PW);A.ok(/signed in/.test(t),t);A.strictEqual(P.sb.RLOGIN_FOUNDER_VIA,'site');
  A.ok(P.m.get('founder.recovery')&&P.L['rdragon.csp.founder.recovery.v1'],'cached after login');
  // 3b) browser that already has a device login but no cached recovery: a normal password login caches it too
  const idb=Object.fromEntries([...P.m.entries()].filter(([k])=>k!=='founder.recovery'));
  const Q=page('login/index.html',{idb,cfg:{founder},site:blob});await wait(50);A.ok(/signed in/.test(await login(Q,'chaserizal',PW)));
  A.ok(Q.m.get('founder.recovery'),'device-login path also caches the recovery into IndexedDB');A.ok(['cached','idb'].includes(Q.sb.RLOGIN_FOUNDER_CACHED));
  A.strictEqual((await RF.verify(Q.m.get('founder.recovery'),founder,RS.profileIdFor)).ok,true,'cached copy is the verified founder record');
  // 3c) a foreign/tampered site copy is never cached
  const w2=await RS.passwordWrap('Other-Fake-Pass-77',{iter:ITER});const foreign=await RF.wrap(pkg,PW,w2.signer,{handle:'@chaserizal',rid:'ЯID-0001-3QQS',profile:pid},{iter:ITER});
  const Z=page('login/index.html',{idb,cfg:{founder},site:foreign});await wait(50);A.ok(/signed in/.test(await login(Z,'chaserizal',PW)));A.ok(!Z.m.get('founder.recovery'),'foreign copy not cached');
  const all=JSON.stringify([...Q.m.entries()])+JSON.stringify(Q.L);A.ok(!all.includes(PW),'password stored nowhere');
  pass('fresh browser reaches the site copy; device-login path caches the verified record into IndexedDB; foreign copy never cached; no password stored');}
 console.log(n+' passed');})().catch(e=>{console.error('FAIL',e);process.exit(1)});
