// t106u regression: if the TEST-ONLY diag installer replaced this browser's owner "device" record, the ЯLOGIN page
// must put the newest non-test "device.bak-<ts>" back (diag record set aside as "device.diag-<ts>", nothing deleted),
// and username+password must find the owner's password record even before that. Fake IDB + placeholder records only.
const fs=require('fs'),A=require('assert'),path=require('path'),vm=require('vm');
const ROOT=path.join(__dirname,'..'),SRC=fs.readFileSync(path.join(ROOT,'rdragon-cryptosocial/rlogin-page.js'),'utf8');let n=0;const pass=m=>{n++;console.log('PASS',m)};
// pull the real functions out of rlogin-page.js: idb/get/getK/putK/put + the owner guard + pwRec
const pick=(a,b)=>{const i=SRC.indexOf(a),j=SRC.indexOf(b,i);A.ok(i>0&&j>i,'slice '+a);return SRC.slice(i,j)};
const code=pick('function idb(){','/* ---- registered founder')+pick('function pwRec(h)','function login(){');
function env(init){const m=new Map(Object.entries(init));const db={transaction(){const st={get(k){const r={};setTimeout(()=>{r.result=m.get(k);r.onsuccess&&r.onsuccess()},0);return r},
  getAllKeys(){const r={};setTimeout(()=>{r.result=[...m.keys()];r.onsuccess&&r.onsuccess()},0);return r},put(v,k){m.set(k,v)}};const t={objectStore:()=>st};setTimeout(()=>t.oncomplete&&t.oncomplete(),1);return t},createObjectStore(){}};
 const sb={setTimeout,Promise,indexedDB:{open(name){A.strictEqual(name,'rdragon.csp.keys');const q={result:db};setTimeout(()=>q.onsuccess&&q.onsuccess(),0);return q}},PEND:{},J:()=>({}),PKK:'x',
  H:h=>{h=String(h||'').trim();if(h&&h[0]!=='@')h='@'+h;return h.toLowerCase()}};vm.createContext(sb);vm.runInContext(code+';this.api={get,ownerRestore,pwRec,isTest}',sb);return {m,api:sb.api}}
const OWNER={kp:'OWNER-KP-PLACEHOLDER',profile:'RP-owner',pw:{salt:'PLACEHOLDER'},handle:'@chaserizal'};
const DIAG={kp:'DIAG',me:{handle:'@rdragon_diag'},diag:true,test_only:true};
(async()=>{
 // 1) diag active + owner backup -> owner restored, diag set aside, nothing deleted
 {const {m,api}=env({'device':DIAG,'device.bak-20261028T190000':OWNER});const pre=await api.pwRec('@chaserizal');A.strictEqual(pre.rec,OWNER.pw,'password record found in backup before restore');
  const r=await api.ownerRestore();A.ok(r.restored);A.strictEqual(r.from,'device.bak-20261028T190000');A.strictEqual(m.get('device'),OWNER);
  const aside=[...m.keys()].filter(k=>/^device\.diag-/.test(k));A.strictEqual(aside.length,1);A.strictEqual(m.get(aside[0]),DIAG);A.ok(m.has('device.bak-20261028T190000'),'backup kept');
  const x=await api.pwRec('@chaserizal');A.strictEqual(x.rec,OWNER.pw);A.strictEqual(x.pid,'RP-owner');pass('diag record replaced owner -> owner restored, diag set aside, backup kept, password record found');}
 // 2) newest NON-test backup wins; test-only backups ignored
 {const old={...OWNER,profile:'RP-old'};const {m,api}=env({'device':DIAG,'device.bak-20261020T000000':old,'device.bak-20261028T000000':OWNER,'device.bak-20261029T000000':DIAG});
  await api.ownerRestore();A.strictEqual(m.get('device'),OWNER);pass('newest owner backup chosen, test-only backups skipped');}
 // 3) owner already active -> untouched
 {const {m,api}=env({'device':OWNER,'device.bak-1':DIAG});const r=await api.ownerRestore();A.ok(!r.restored);A.strictEqual(m.get('device'),OWNER);A.strictEqual(m.size,2);pass('owner record active -> nothing changes');}
 // 4) diag-only browser (bot) -> stays diag
 {const {m,api}=env({'device':DIAG});const r=await api.ownerRestore();A.ok(!r.restored);A.strictEqual(m.get('device'),DIAG);A.strictEqual(await api.pwRec('@chaserizal'),null);pass('bot browser without owner backup keeps diag');}
 // 5) static: guard runs before the page wires login; installer v3 refuses owner overwrite; cache-busted
 {const g=SRC.indexOf('ownerRestore().then'),w=SRC.indexOf('$("b-login").onclick=login');A.ok(g>0&&g<w);
  const inst=fs.readFileSync(path.join(ROOT,'tests/diag-profile/install-diag-profile.js'),'utf8');A.ok(/if \(!opt\.ownerOverwrite\) throw/.test(inst));
  A.ok(/rlogin-page\.js\?v=1[789]/.test(fs.readFileSync(path.join(ROOT,'login/index.html'),'utf8')));A.ok(/install-diag-profile\.js\?v=3/.test(fs.readFileSync(path.join(ROOT,'tests/diag-profile/diag-import-ui.js'),'utf8')));
  A.ok(!/deleteDatabase|\.delete\(/.test(code),'guard never deletes');pass('guard wired before login, installer refuses owner overwrite, versions bumped, no deletes');}
 console.log(n+' passed');
})().catch(e=>{console.error('FAIL',e);process.exit(1)});
