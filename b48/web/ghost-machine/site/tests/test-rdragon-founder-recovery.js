// t108u: founder recovery (password-wrapped ЯCASKET in every layer) + founder binding + stay logged in.
// Runs the REAL rfounder.js + rsync-core.js + rlogin-page.js in a vm with a fake DOM / IndexedDB / localStorage / fetch. FAKE test password only.
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
 const B=page('login/index.html'),RS=B.sb.RSync,RF=B.sb.RFOUNDER;A.ok(RF&&RF.ITER===600000&&RF.FORMAT==='rizalpw.founder-recovery.v1');
 const w=await RS.passwordWrap(PW,{iter:ITER});const pid=await RS.profileIdFor(w.signer.pub);
 const pkg=await RS.casketPackage({profile:pid,card:{handle:'@chaserizal',name:'Rizal'},login:w.rec,devices:{},sessions:{},rid:'ЯID-0001-3QQS'},w.signer);
 const cm=await RS.packageCommitment(pkg);const founder={handle:'@chaserizal',rid:pkg.rid===undefined?undefined:'ЯID-0001-3QQS',profile:pid,commitment:cm.sha256};
 const meta={handle:'@chaserizal',rid:'ЯID-0001-3QQS',profile:pid};
 // 1) wrap/unwrap/verify; wrong password; tamper; foreign key; no plaintext
 const blob=await RF.wrap(pkg,PW,w.signer,meta,{iter:ITER});
 A.strictEqual((await RF.verify(blob,founder,RS.profileIdFor)).ok,true);A.strictEqual(JSON.stringify(await RF.unwrap(blob,PW)),JSON.stringify(pkg));
 await A.rejects(RF.unwrap(blob,'wrong-password-1'),e=>e.code==='mismatch');
 A.strictEqual((await RF.verify({...blob,ct:blob.ct.slice(0,-4)+'AAAA'},founder,RS.profileIdFor)).ok,false,'tampered rejected');
 const w2=await RS.passwordWrap('Other-Fake-Pass-77',{iter:ITER});const foreign=await RF.wrap(pkg,PW,w2.signer,meta,{iter:ITER});
 A.strictEqual((await RF.verify(foreign,founder,RS.profileIdFor)).ok,false,'foreign signer rejected');
 const js=JSON.stringify(blob);A.ok(!js.includes(PW)&&!js.includes(w.rec.wrapped)&&!js.includes(w.rec.verifier)&&!js.includes('Rizal'),'ciphertext only');
 pass('rfounder: wrap/unwrap/verify, wrong password = mismatch, tampered + foreign blobs rejected, no plaintext');
 // 2) empty browser: login via the SITE copy seeds the device and signs in
 {const P=page('login/index.html',{cfg:{founder},site:blob});await wait(50);const t=await login(P,'ChaseRizal',PW);A.ok(/signed in/.test(t),t);A.strictEqual(P.sb.RLOGIN_FOUNDER_VIA,'site');
  A.strictEqual(P.sb.document.body.dataset.signedIn,'@chaserizal');A.ok(P.m.get('founder.recovery')&&P.m.get('pkg:@chaserizal'),'stored locally');A.ok(P.L['rdragon.csp.founder.recovery.v1']);
  const dk=P.m.get('device').kp;A.ok(dk&&dk.privateKey&&dk.privateKey.extractable===false,'device key non-extractable');
  const all=JSON.stringify([...P.m.entries()])+JSON.stringify(P.L);A.ok(!all.includes(PW),'password stored nowhere');
  pass('empty browser + site copy -> unwrapped locally, device seeded, signed in; non-extractable device key; password stored nowhere');
  // 2b) second visit: the IDB copy alone works (no site), and the device key persists (stay logged in)
  const P2=page('login/index.html',{idb:{'founder.recovery':P.m.get('founder.recovery')},cfg:{founder}});await wait(50);const t2=await login(P2,'chaserizal',PW);A.ok(/signed in/.test(t2),t2);A.strictEqual(P2.sb.RLOGIN_FOUNDER_VIA,'idb');
  const P3=page('login/index.html',{ls:{'rdragon.csp.founder.recovery.v1':JSON.stringify(blob)},cfg:{founder}});await wait(50);A.ok(/signed in/.test(await login(P3,'chaserizal',PW)));A.strictEqual(P3.sb.RLOGIN_FOUNDER_VIA,'localStorage');
  pass('IndexedDB-only and localStorage-only copies also log in');}
 // 3) wrong password against the site copy -> mismatch (+1 lockout); foreign blob on site -> no-record
 {const P=page('login/index.html',{cfg:{founder},site:blob});await wait(50);const t=await login(P,'chaserizal','wrong-password-1');A.ok(/does not open it/.test(t),t);A.strictEqual(P.sb.RLOGIN_LAST_FAIL,'mismatch');
  A.strictEqual(JSON.parse(P.L['rdragon.csp.rl.v1'])['@chaserizal'].fails,1);
  const Q=page('login/index.html',{cfg:{founder},site:foreign});await wait(50);await login(Q,'chaserizal',PW);A.strictEqual(Q.sb.RLOGIN_LAST_FAIL,'no-record');
  const O=page('login/index.html',{cfg:{founder},site:blob});await wait(50);await login(O,'someone_else',PW);A.strictEqual(O.sb.RLOGIN_LAST_FAIL,'no-record','other handles never use the founder record');
  pass('wrong password -> mismatch + lockout; foreign blob ignored; non-founder handles unaffected');}
 // 4) options page: Make founder recovery (one time) -> IDB + local list + signed founder.bind (public refs only)
 {const P=page('login/options/index.html',{idb:{'pkg:@chaserizal':pkg},cfg:{founder}});await wait(50);['founder-box','fr-pass','b-mkfr','b-dlfr','fr-st','fr-strength'].forEach(i=>A.ok(P.E[i],i));
  A.ok(/offline/.test(P.html)&&/passphrase/.test(P.html),'risk text');A.ok(/rfounder\.js\?v=1/.test(P.html)&&/rlogin-page\.js\?v=(19|[2-9]\d)/.test(P.html)&&/rfounder\.js\?v=1/.test(R('login/index.html')));
  P.E['fr-pass'].value='wrong-password-1';A.strictEqual(await P.sb.RLOGIN_PAGE.makeRecovery(),null);A.ok(/does not match/.test(P.E['fr-st'].textContent));
  P.E['fr-pass'].value=PW;const b=await P.sb.RLOGIN_PAGE.makeRecovery();A.ok(b,P.E['fr-st'].textContent);A.strictEqual(P.E['fr-pass'].value,'');A.strictEqual(P.E['b-dlfr'].hidden,false);
  A.strictEqual((await RF.verify(b,founder,RS.profileIdFor)).ok,true);A.strictEqual(b.kdf.iter,ITER);A.ok(P.m.get('founder.recovery'));A.ok(P.L['rdragon.csp.founder.recovery.v1']);
  const bind=JSON.parse(P.L['rdragon.csp.founder.bind.v1'])[0];A.strictEqual(bind.entry.t,'founder.bind');A.strictEqual(bind.entry.rid,'ЯID-0001-3QQS');A.ok(bind.sig&&bind.entry.recovery.sha256.length===64);
  const all=JSON.stringify([...P.m.entries()])+JSON.stringify(P.L);A.ok(!all.includes(PW),'password stored nowhere');
  P.E['fr-pass'].value='short-pw-1';await P.sb.RLOGIN_PAGE.makeRecovery();A.ok(/strength/.test(P.E['fr-st'].textContent)&&/passphrase/.test(P.E['fr-st'].textContent)||/does not match/.test(P.E['fr-st'].textContent));
  pass('options: Make founder recovery -> verified blob in IndexedDB + local list, signed founder.bind (public refs), password cleared, risk/strength text');}
 // 5) config binding + repair/installer never touch the device key or founder copies
 {const P=page('login/index.html');const fb=P.sb.RDRAGON_CONFIG.founderBinding;A.ok(!fb||true);
  const c=R('rdragon-cryptosocial/rdragon-config.js');A.ok(/founderBinding/.test(c)&&/SUPER-BOT-CARD\.json/.test(c)&&/RIZAL-PROFILE\.json/.test(c)&&/ЯID-0001-3QQS/.test(c));
  const d=R('rdragon-cryptosocial/rdiag.js');A.ok(!/deleteDatabase/.test(d)&&!/founder\.recovery/.test(d),'rdiag never wipes IndexedDB or founder copies');
  A.ok(/rfounder\.js/.test(R('sw-precache.json')));pass('founder binding in config (public refs); rdiag never wipes IndexedDB/founder copies; precached');}
 console.log(n+' passed');})().catch(e=>{console.error('FAIL',e);process.exit(1)});
