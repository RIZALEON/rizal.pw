// t105u regression: the owner's device storage (IndexedDB "rdragon.csp.keys" + the real localStorage) must NEVER be
// stubbed or shadowed unless ?nostore=1 is explicitly set. Safari's full localStorage (QuotaExceeded) used to make
// rstore.js report "no storage" and replace indexedDB with a stub, so the device key was invisible and the site fell
// back to the ЯLOGIN page. No real keys are used: fake IDB/LS objects only.
const fs=require('fs'),A=require('assert'),path=require('path'),vm=require('vm');
const ROOT=path.join(__dirname,'..'),E=p=>path.join(ROOT,'rdragon-cryptosocial',p);let n=0;const pass=m=>{n++;console.log('PASS',m)};
const SRC=fs.readFileSync(E('rstore.js'),'utf8');
function realIDB(){return {open(){},__real:true}}
function LS(mode){const m={owner_marker:'x'};return {getItem:k=>{if(mode==='throwRead')throw new Error('SecurityError');return k in m?m[k]:null},
 setItem:(k,v)=>{if(mode==='quota')throw Object.assign(new Error('QuotaExceededError'),{name:'QuotaExceededError'});m[k]=String(v)},removeItem:k=>{delete m[k]},key:i=>Object.keys(m)[i]||null,get length(){return Object.keys(m).length},__real:true}}
function run(o){const idb=realIDB(),cs={keys:()=>Promise.resolve([]),__real:true},sb={console:{warn(){}},setTimeout,Promise,location:{search:o.search||''},indexedDB:idb,caches:cs};
 if(o.ls==='throw')Object.defineProperty(sb,'localStorage',{configurable:true,get(){throw new Error('SecurityError')}});else sb.localStorage=o.ls;
 sb.window=sb;vm.createContext(sb);vm.runInContext(SRC,sb);return {sb,idb,cs}}
// 1) Safari full quota: real IDB, real caches, real localStorage (reads still see existing data), ok=true
{const ls=LS('quota'),{sb,idb,cs}=run({ls});A.strictEqual(sb.indexedDB,idb);A.strictEqual(sb.caches,cs);A.ok(sb.localStorage.__real);
 A.strictEqual(sb.localStorage.getItem('owner_marker'),'x');A.strictEqual(sb.RDRAGON_STORAGE.ok,true);A.ok(sb.RDRAGON_STORAGE.quotaFull);A.ok(sb.RDRAGON_STORAGE.idbReal);
 sb.localStorage.setItem('a','b');pass('full localStorage (Safari quota) keeps REAL indexedDB/caches/localStorage; writes do not throw');}
// 2) normal: nothing replaced
{const ls=LS(),{sb,idb,cs}=run({ls});A.strictEqual(sb.indexedDB,idb);A.strictEqual(sb.caches,cs);A.strictEqual(sb.RDRAGON_STORAGE.mode,'persistent');pass('normal device: storage untouched');}
// 3) localStorage blocked (cookies off): memory localStorage only, IDB/caches still real
{const {sb,idb,cs}=run({ls:'throw'});A.strictEqual(sb.indexedDB,idb);A.strictEqual(sb.caches,cs);A.ok(sb.RDRAGON_STORAGE.ok);A.ok(sb.RDRAGON_STORAGE.lsMemory);pass('blocked localStorage never shadows IndexedDB');}
// 4) only ?nostore=1 stubs
{const {sb,idb}=run({ls:LS(),search:'?nostore=1'});A.notStrictEqual(sb.indexedDB,idb);A.ok(sb.indexedDB.__stub);A.strictEqual(sb.RDRAGON_STORAGE.ok,false);pass('?nostore=1 is the ONLY way to stub storage');}
{const {sb,idb}=run({ls:LS(),search:'?nostore=0&x=1'});A.strictEqual(sb.indexedDB,idb);pass('nostore=0 / other params do not stub');}
// 5) static: owner key store names unchanged and login page does not load rstore; probe is read-first; rdiag backups skip key-ish names
{const lp=fs.readFileSync(E('rlogin-page.js'),'utf8'),cs=fs.readFileSync(E('rdragon-cryptosocial.js'),'utf8'),rd=fs.readFileSync(E('rdiag.js'),'utf8');
 A.ok(lp.includes('indexedDB.open("rdragon.csp.keys",1)')&&cs.includes('indexedDB.open("rdragon.csp.keys",1)'),'same key DB');
 A.ok(!/rstore\.js/.test(fs.readFileSync(path.join(ROOT,'login','index.html'),'utf8')));
 A.ok(/def\("indexedDB"/.test(SRC)&&SRC.indexOf('def("indexedDB"')>SRC.indexOf('if(forced)')&&SRC.indexOf('def("indexedDB"')<SRC.indexOf('}else{'),'indexedDB stub only in forced branch');
 A.ok(/key\|device\|pkg\|casket\|session/.test(rd)&&/too big for localStorage/.test(rd),'rdiag backups exclude key-ish names and stay small');
 A.ok(/rstore\.js\?v=2/.test(fs.readFileSync(path.join(ROOT,'index.html'),'utf8')));pass('owner key DB, login page, forced-only stub, safe rdiag backups, cache-busted rstore');}
console.log(n+' passed');
