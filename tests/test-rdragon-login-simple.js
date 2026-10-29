// t107u: simple login page + specific non-secret failure reasons + re-seed when the ledger lost the profile.
// Runs the REAL rlogin-page.js + rsync-core.js in a vm with a fake DOM / IndexedDB / localStorage. Test password only.
const fs=require('fs'),A=require('assert'),path=require('path'),vm=require('vm');
const ROOT=path.join(__dirname,'..'),R=p=>fs.readFileSync(path.join(ROOT,p),'utf8');let n=0;const pass=m=>{n++;console.log('PASS',m)};
const ids=html=>[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function page(file,{idb:init={},ls:lsInit={}}={}){const html=R(file),E={};ids(html).forEach(i=>{E[i]={id:i,value:'',textContent:'',hidden:false,disabled:false,dataset:{},className:'',classList:{toggle(){}},style:{},firstChild:{style:{}},files:null,focus(){},onclick:null}});
 const m=new Map(Object.entries(init));const db={transaction(){const st={get(k){const r={};setTimeout(()=>{r.result=m.get(k);r.onsuccess&&r.onsuccess()},0);return r},getAllKeys(){const r={};setTimeout(()=>{r.result=[...m.keys()];r.onsuccess&&r.onsuccess()},0);return r},put(v,k){m.set(k,v)}};const t={objectStore:()=>st};setTimeout(()=>t.oncomplete&&t.oncomplete(),1);return t},createObjectStore(){}};
 const L={...lsInit};const ls={getItem:k=>k in L?L[k]:null,setItem:(k,v)=>{L[k]=String(v)},removeItem:k=>{delete L[k]},key:i=>Object.keys(L)[i]||null,get length(){return Object.keys(L).length}};
 const sb={console,setTimeout,clearTimeout,setInterval:()=>0,Promise,TextEncoder,TextDecoder,URL,crypto:globalThis.crypto,atob,btoa,Uint8Array,ArrayBuffer,
  localStorage:ls,indexedDB:{open(){const q={result:db};setTimeout(()=>q.onsuccess&&q.onsuccess(),0);return q}},navigator:{platform:'test'},
  location:{href:'https://rizal.pw/login/',search:'',origin:'https://rizal.pw',hostname:'rizal.pw'},
  document:{body:{dataset:{}},getElementById:i=>E[i]||null,querySelectorAll:()=>[],querySelector:()=>null,createElement:()=>({style:{},dataset:{},classList:{toggle(){}}})},
  RDRAGON_CONFIG:{noRedirect:true}};sb.window=sb;sb.self=sb;sb.globalThis=sb;vm.createContext(sb);
 vm.runInContext(R('rdragon-cryptosocial/rsync-core.js'),sb);vm.runInContext(R('rdragon-cryptosocial/rlogin-page.js'),sb);return {sb,E,m,L,html}}
async function login(P,user,pw){P.E['l-user'].value=user;P.E['l-pass'].value=pw;P.E['b-login'].onclick();for(let i=0;i<300&&(P.E['b-login'].disabled||P.E.msg.textContent==='checking…');i++)await wait(20);await wait(30);return P.E.msg.textContent}
(async()=>{
 // 1) simple page: only username/password/Log in + Create account + Other options; options page keeps every old control
 {const s=R('login/index.html'),o=R('login/options/index.html');const si=ids(s);
  ['l-user','l-pass','b-login','a-create','a-options','msg'].forEach(i=>A.ok(si.includes(i),i));['b-auto','f-pkg','b-pkg','b-rgen','b-req','t-signup'].forEach(i=>A.ok(!si.includes(i),'simple has no '+i));
  A.ok(/href="\/login\/options\/\?tab=signup"[^>]*>Create account/.test(s)&&/href="\/login\/options\/"[^>]*>Other options/.test(s));
  const oi=ids(o);['b-auto','f-pkg','b-pkg','b-file','b-rgen','b-req','b-imp','t-signup','s-user','s-pass','b-signup','b-dlpkg','rg-status','owners','p0','founder-st','auto-note','b-selfcheck','selfcheck','l-user','l-pass','b-login'].forEach(i=>A.ok(oi.includes(i),'options keeps '+i));
  A.ok(/rlogin-page\.js\?v=19/.test(s)&&/rlogin-page\.js\?v=19/.test(o)&&/rsync-core\.js\?v=16/.test(s));pass('simple login page + options page (nothing removed, self-check added)');}
 // 2) no record anywhere -> specific reason, no lockout increment
 {const P=page('login/index.html');await wait(50);const t=await login(P,'chaserizal','Correct-Horse-9!');A.ok(/no login record for @chaserizal on this browser/.test(t),t);A.strictEqual(P.sb.RLOGIN_LAST_FAIL,'no-record');
  A.ok(!('rdragon.csp.rl.v1' in P.L)||!JSON.parse(P.L['rdragon.csp.rl.v1'])['@chaserizal']||!JSON.parse(P.L['rdragon.csp.rl.v1'])['@chaserizal'].fails,'no lockout count');pass('no record -> "no login record … Restore from file once", no lockout');}
 // 3) device login record present, ledger EMPTY (profile lost) -> correct password re-seeds and signs in; username case/@ insensitive
 const RS0=page('login/index.html').sb.RSync;const w=await RS0.passwordWrap('Correct-Horse-9!',{iter:1000});const pid=await RS0.profileIdFor(w.signer.pub);
 const dev={pw:w.rec,handle:'@chaserizal',profile:pid};
 {const P=page('login/index.html',{idb:{device:dev}});await wait(50);const t=await login(P,'ChaseRizal','wrong-password-1');A.ok(/login record found for @chaserizal, but this password does not match/.test(t),t);
  A.strictEqual(JSON.parse(P.L['rdragon.csp.rl.v1'])['@chaserizal'].fails,1,'mismatch counts once');
  const t2=await login(P,'@CHASERIZAL','Correct-Horse-9!');A.ok(/signed in/.test(t2),t2);A.strictEqual(P.sb.document.body.dataset.signedIn,'@chaserizal');
  const led=JSON.parse(P.L['rdragon.csp.rsync.v1']);A.ok(led.some(e=>e.t==='profile.create'&&e.profile===pid&&e.rgen),'profile re-seeded (signed)');A.ok(P.m.get('device').kp,'device key kept on this device');
  pass('wrong password -> "record found, password does not match" (+1 lockout); correct password with empty ledger -> re-seeded and signed in; case/@ insensitive');}
 // 4) self-check lists names/kinds only, never values
 {const P=page('login/options/index.html',{idb:{device:dev,'device.bak-20261028T1':{kp:'x',me:{handle:'@rdragon_diag'},test_only:true}},ls:{'rdragon.csp.rsync.v1':'[]'}});await wait(50);
  const r=await P.sb.RLOGIN_PAGE.selfCheck('chaserizal');const js=JSON.stringify(r);A.strictEqual(r.verdict,'device login record present');A.ok(r.idb.device.hasPasswordRecord&&r.idb.device.forThisHandle);A.ok(r.idb['device.bak-20261028T1'].testOnly);
  A.ok(!js.includes(w.rec.salt)&&!js.includes(w.rec.verifier)&&!js.includes(w.rec.wrapped),'no values leaked');A.ok(P.E.selfcheck.textContent.includes('verdict'));pass('self-check: store names + record kinds, no secret values');}
 // 5) lockout message is specific
 {const P=page('login/index.html',{idb:{device:dev},ls:{'rdragon.csp.rl.v1':JSON.stringify({'@chaserizal':{fails:9,until:Date.now()+60000}})}});await wait(50);const t=await login(P,'chaserizal','x-any-pass');A.ok(/locked out for \d+s/.test(t),t);pass('lockout -> "locked out for Ns"');}
 console.log(n+' passed');process.exit(0);
})().catch(e=>{console.error('FAIL',e);process.exit(1)});
