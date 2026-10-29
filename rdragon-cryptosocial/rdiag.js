/* rdiag.js · DIAGNOSE · REPAIR · UPDATE · UPGRADE for bots on the TEST-ONLY @rdragon_diag account · 20261028
 * window.RDIAG.run()            -> JSON report of every in-browser self-test (versions vs live manifest, SW + caches,
 *                                  :8811 gate, storage mode, relay, engine/quick/open/learn health, ledger, sanity_20 local subset)
 * window.RDIAG.copy(report)     -> clipboard;  RDIAG.publish(report) -> signed TEST-ONLY Nostr "diag" note (ephemeral guest key)
 * window.RDIAG.repair.<action>()-> browser-local, safe; every action snapshots state first (RDIAG.backups(), RDIAG.restore(id))
 * window.RDIAG.update.check()/hot()/force() -> live manifest /rdragon-version.json, hot-reload engine modules, cache-busting reload
 * window.RDIAG.upgradeRequest({title,want}) -> TEST-ONLY "upgrade-request" Nostr note + prefilled GitHub issue URL.
 *   Bots never push code with the public diag account; a maintainer/bot with gh auth on Neo opens the PR
 *   (tests/diag-profile/bot-upgrade.sh). Nothing here deletes user data, keys, posts or learned items.
 * The ?diag=1 panel (tests/diag-profile/diag-import-ui.js) is a thin UI over this API. No secrets in this file. */
(function(w){"use strict";
var VER="rdiag 1.1 20261028",MAN="/rdragon-version.json",SAN="/tests/fixtures/sanity_20.json",REPO="RIZALEON/rizal.pw",BK="rdiag.bak.",MODELS="rizalpw-models";
var MEM=[],last=null;
function now(){return new Date().toISOString()}
function pub(){try{return !/^(127\.0\.0\.1|localhost)$/.test(w.location.hostname)}catch(e){return true}}
function tmo(p,ms,v){return Promise.race([Promise.resolve(p).catch(function(e){return {error:String(e&&e.message||e)}}),new Promise(function(ok){setTimeout(function(){ok(v!==undefined?v:{error:"timeout "+ms+"ms"})},ms)})])}
function getJ(u){return w.fetch(u+(u.indexOf("?")<0?"?":"&")+"_="+Date.now(),{cache:"no-store"}).then(function(r){if(!r.ok)throw Error("HTTP "+r.status);return r.json()})}
function lsKeys(){var o={};try{var L=w.localStorage;for(var i=0;i<(L.length||0);i++){var k=L.key(i);if(/^(rdragon|rpostmenu|rdiag)\./.test(k)&&k.indexOf(BK)!==0&&!/key|device|pkg|casket|session|login|pw|seal/i.test(k)){var v=L.getItem(k);if(v&&v.length<=65536)o[k]=v}}}catch(e){}return o}
/* loaded bundle versions: every same-origin script/link with ?v=N */
function loaded(){var o={};try{var d=w.document,els=[].slice.call(d.querySelectorAll("script[src],link[href]"));els.forEach(function(e){var u=e.getAttribute("src")||e.getAttribute("href")||"",m=u.match(/^\/([^?#]+)\?v=([\w.-]+)/);if(m)o[m[1]]=m[2]})}catch(e){}return o}
function cmpVersions(have,man){var B=man&&man.bundles||{},stale=[],missing=[],ok=0;Object.keys(B).forEach(function(f){if(!(f in have))missing.push(f);else if(String(have[f])!==String(B[f]))stale.push({file:f,loaded:have[f],live:B[f]});else ok++});return {ok:ok,stale:stale,missing:missing}}
/* ---------------- DIAGNOSE ---------------- */
function chkVersions(){return getJ(MAN).then(function(m){var c=cmpVersions(loaded(),m);return {pass:!c.stale.length,live:m.v,precache:m.precache,ok:c.ok,stale:c.stale,missing:c.missing}},function(e){return {pass:false,error:"manifest: "+e.message}})}
function chkSW(){var N=w.navigator,out={supported:!!(N&&N.serviceWorker),storageOk:!(w.RDRAGON_STORAGE&&w.RDRAGON_STORAGE.ok===false)};
 var regs=out.supported&&N.serviceWorker.getRegistrations?N.serviceWorker.getRegistrations().then(function(r){out.registrations=r.length;out.controller=!!N.serviceWorker.controller}):Promise.resolve();
 var cks=w.caches&&w.caches.keys?Promise.all([w.caches.keys(),getJ("/sw-precache.json").catch(function(){return null})]).then(function(a){var ks=a[0]||[],cur=a[1]?"rizalpw-"+a[1].v:null;out.caches=ks;out.current=cur;out.stale=ks.filter(function(k){return /^rizalpw-/.test(k)&&k!==cur&&k!==MODELS});out.hasCurrent=cur?ks.indexOf(cur)>=0:null}).catch(function(e){out.cacheError=String(e&&e.message||e)}):Promise.resolve();
 return Promise.all([regs,cks]).then(function(){out.pass=!(out.stale&&out.stale.length)&&!(out.storageOk===false&&out.registrations>0);return out})}
function chkGate(){var M=w.RPostMenu,u=null;try{u=M&&M.sync?M.sync.url():null}catch(e){u="error"}var on=pub();return {pass:!on||u==="",publicOrigin:on,transponder:u,loaded:!!M}}
function chkStorage(){var s=w.RDRAGON_STORAGE||null,c=w.RDRAGON_CONFIG||{};return {pass:true,storage:s,noStorage:!!c.noStorage,edgeEngine:c.edgeEngine!==false}}
function chkRelay(){var R=w.RRELAY;if(!R)return {pass:false,error:"rrelay not loaded"};var s=R.summary?R.summary():R.status();return {pass:/^(on|loading|off|idle)$/.test(s.state)&&!(s.state==="on"&&s.connected===0),summary:s,version:R.VERSION}}
function chkEngine(){var Q=w.RDRAGON_QUICK,O=w.RDRAGON_OPEN,L=w.RDRAGON_LEARN,C=w.RDRAGON_CARD,R=w.RDRAGON_RANK,o={};
 try{var q=Q&&Q.quick("What is 17 + 25?");o.quick=!!(q&&/\b42\b/.test(q.text))}catch(e){o.quick="error: "+e.message}
 try{var a=O&&O.compose("suggest names for my dragon"),b=O&&O.compose2&&O.compose2("tell me a joke");o.open=!!(a&&a.text&&a.options&&a.options.length);o.voice2=!!(b&&b.text);o.openVersion=O&&O.VERSION}catch(e){o.open="error: "+e.message}
 try{o.learn=L?L.stats():false}catch(e){o.learn="error: "+e.message}
 o.rank=!!(R&&R.rankSources);o.card=!!(C&&C.localAnswer);o.granite=(w.RDRAGON_CONFIG||{}).edgeEngine===false?"skipped (no-storage)":"lazy (loads on idle / on demand)";
 o.pass=o.quick===true&&o.open===true&&o.voice2===true&&!!o.learn&&o.rank&&o.card;return o}
function chkLedger(){var C=w.RDRAGON_CSP;if(!C||!C.verify)return Promise.resolve({pass:null,note:"cryptosocial not loaded"});var n=0;try{n=C.events().length}catch(e){}
 return tmo(Promise.resolve(C.verify()).then(function(r){var bad=Array.isArray(r)?r:(r&&(r.problems||r.bad))||[];return {pass:!bad.length,events:n,bad:bad.slice(0,10)}}),8000)}
function chkSanity(ms){var C=w.RDRAGON_CARD;return getJ(SAN).then(function(rows){if(!C||!C.localAnswer)return {pass:false,error:"local ladder missing"};
 return rows.reduce(function(p,r,i){return p.then(function(acc){var t0=Date.now();return tmo(C.localAnswer(r.q,ms||1500),(ms||1500)+300,null).then(function(x){var txt=x&&x.text||"",ok=!!txt&&r.a.some(function(re){return new RegExp(re,"i").test(txt)});acc.push({i:i+1,ok:ok,local:!!txt,tier:x&&x.tier||null,score:x&&x.score,ms:Date.now()-t0});return acc})})},Promise.resolve([])).then(function(res){
  var local=res.filter(function(r){return r.local}),pass=local.filter(function(r){return r.ok});return {pass:local.length>0&&pass.length===local.length,answeredLocally:local.length,correct:pass.length,total:res.length,wrong:local.filter(function(r){return !r.ok}).map(function(r){return r.i}),needsGranite:res.filter(function(r){return !r.local}).map(function(r){return r.i}),rows:res}})},function(e){return {pass:false,error:"sanity_20: "+e.message}})}
function run(o){o=o||{};var t0=Date.now(),G=w.RDRAGON_GUEST||null,diag=null;try{diag=w.RDRAGON_DIAG_ME||null}catch(e){}
 var jobs={versions:chkVersions(),sw:chkSW(),gate8811:chkGate(),storage:chkStorage(),relay:chkRelay(),engine:chkEngine(),ledger:chkLedger(),sanity_20:o.sanity===false?{pass:null,skipped:true}:chkSanity(o.sanityMs)},ks=Object.keys(jobs);
 return Promise.all(ks.map(function(k){return tmo(jobs[k],o.timeoutMs||30000)})).then(function(vals){var checks={};ks.forEach(function(k,i){checks[k]=vals[i];if(checks[k]&&checks[k].error&&checks[k].pass===undefined)checks[k].pass=false});
  var failed=ks.filter(function(k){return checks[k]&&checks[k].pass===false});
  last={v:1,kind:"rdragon.diag",tool:VER,test_only:true,account:"@rdragon_diag (TEST-ONLY, public keys)",ts:now(),ms:Date.now()-t0,url:String(w.location.href).replace(/[?#].*$/,"")+(w.location.search||""),
   ua:String((w.navigator||{}).userAgent||"").slice(0,120),guest:G?G.handle:null,ok:!failed.length,failed:failed,
   summary:(failed.length?"FAIL "+failed.join(","):"PASS all")+" · sanity "+(checks.sanity_20.correct!=null?checks.sanity_20.correct+"/"+checks.sanity_20.answeredLocally+" local of "+checks.sanity_20.total:"n/a")+" · "+(checks.relay.summary?checks.relay.summary.line:"relay n/a"),checks:checks};
  return last})}
function text(r){return JSON.stringify(r||last,null,2)}
function copy(r){var t=text(r);try{if(w.navigator.clipboard)return w.navigator.clipboard.writeText(t).then(function(){return true},function(){return false})}catch(e){}return Promise.resolve(false)}
function compact(r){r=r||last;if(!r)return "";var c=JSON.parse(JSON.stringify(r));if(c.checks&&c.checks.sanity_20)delete c.checks.sanity_20.rows;if(c.checks&&c.checks.sw)delete c.checks.sw.caches;return JSON.stringify(c).slice(0,6000)}
function publish(r){r=r||last;var R=w.RRELAY;if(!r||!R)return Promise.resolve(null);return R.publish({t:"rdragon.diag",id:"rdd-"+Date.now().toString(36),text:"TEST-ONLY diag · "+r.summary,report:compact(r)})}
/* ---------------- REPAIR (each action snapshots first; never deletes data) ---------------- */
function snapshot(action){var cn=w.caches&&w.caches.keys?w.caches.keys().catch(function(){return []}):Promise.resolve([]);
 return cn.then(function(names){var L=w.RDRAGON_LEARN,b={id:BK+Date.now().toString(36),action:action,ts:now(),ls:lsKeys(),caches:names,learn:L&&L.snapshot?L.snapshot():null};MEM.push(b);
  try{var js=JSON.stringify(b);if(w.RDRAGON_STORAGE&&w.RDRAGON_STORAGE.ok===false)b.stored="memory only";else if(js.length>262144)b.stored="memory only: too big for localStorage";else w.localStorage.setItem(b.id,js)}catch(e){b.stored="memory only: "+(e&&e.message)}return b})}
function backups(){var out=MEM.slice();try{var L=w.localStorage;for(var i=0;i<(L.length||0);i++){var k=L.key(i);if(k&&k.indexOf(BK)===0&&!out.some(function(b){return b.id===k}))try{out.push(JSON.parse(L.getItem(k)))}catch(e){}}}catch(e){}return out.sort(function(a,b){return a.ts<b.ts?-1:1})}
function restore(id){var b=backups().filter(function(x){return x.id===id})[0];if(!b)return Promise.resolve({ok:false,error:"no backup "+id});
 return snapshot("before-restore "+id).then(function(){Object.keys(b.ls||{}).forEach(function(k){try{w.localStorage.setItem(k,b.ls[k])}catch(e){}});if(b.learn)try{w.localStorage.setItem("rdragon.learn.v1",JSON.stringify(b.learn))}catch(e){}return {ok:true,restored:Object.keys(b.ls||{}).length,from:b.id,note:"reload to apply"}})}
function act(name,fn){return snapshot(name).then(function(b){return Promise.resolve().then(fn).then(function(r){return Object.assign({action:name,ok:true,backup:b.id},r||{})},function(e){return {action:name,ok:false,backup:b.id,error:String(e&&e.message||e)}})})}
function swReg(){var N=w.navigator;if(!(N&&N.serviceWorker))return Promise.resolve({sw:"unsupported"});if(w.RDRAGON_STORAGE&&w.RDRAGON_STORAGE.ok===false)return Promise.resolve({sw:"skipped (no storage)"});
 return N.serviceWorker.getRegistrations().then(function(rs){if(rs.length)return Promise.all(rs.map(function(r){return r.update().catch(function(){})})).then(function(){return {sw:"updated "+rs.length}});return N.serviceWorker.register("/sw.js").then(function(){return {sw:"registered"}})})}
function dropStale(keepCurrent){if(!(w.caches&&w.caches.keys))return Promise.resolve({cachesDropped:[]});return Promise.all([w.caches.keys(),getJ("/sw-precache.json").catch(function(){return null})]).then(function(a){var cur=a[1]?"rizalpw-"+a[1].v:null,drop=a[0].filter(function(k){return /^rizalpw-/.test(k)&&k!==MODELS&&(!keepCurrent||k!==cur)});
 return Promise.all(drop.map(function(k){return w.caches.delete(k)})).then(function(){return {cachesDropped:drop,kept:a[0].filter(function(k){return drop.indexOf(k)<0})}})})} /* only stale site-shell caches (re-fetchable copies); model weights and user data are never touched */
function loadScript(src){return new Promise(function(ok,no){try{var s=w.document.createElement("script");s.src=src;s.onload=function(){ok(true)};s.onerror=function(){no(Error("load failed "+src))};w.document.head.appendChild(s)}catch(e){no(e)}})}
var repair={
 clearStaleCaches:function(){return act("clearStaleCaches",function(){return dropStale(true).then(function(r){return swReg().then(function(s){return Object.assign(r,s)})})})},
 resetLocalPeer:function(){return act("resetLocalPeer",function(){var v=null;try{v=w.localStorage.getItem("rdragon.csp.localPeer");w.localStorage.removeItem("rdragon.csp.localPeer")}catch(e){}return {was:v,now:null}})}, /* a flag, not data; its old value is in the backup */
 reimportDiag:function(){return act("reimportDiag",function(){var go=function(){return w.installDiagProfile("/tests/diag-profile/rdragon-diag-profile.json")};return (w.installDiagProfile?Promise.resolve():loadScript("/tests/diag-profile/install-diag-profile.js?v=2")).then(go).then(function(r){return {installed:true,result:r&&(r.handle||r.ok||true)}})})},
 restoreDiagBackup:function(){return act("restoreDiagBackup",function(){var go=function(){return w.restoreDiagBackup()};return (w.restoreDiagBackup?Promise.resolve():loadScript("/tests/diag-profile/install-diag-profile.js?v=2")).then(go).then(function(r){return {restored:true,result:r||true}})})},
 reweightLearned:function(){return act("reweightLearned",function(){var L=w.RDRAGON_LEARN;if(!L||!L.demoteBad)throw Error("learn module missing");return L.demoteBad()})},
 resyncRelay:function(){return act("resyncRelay",function(){var R=w.RRELAY;if(!R||!R.resync)throw Error("relay missing");return R.resync().then(function(on){return {resync:on,summary:R.summary()}})})}};
/* ---------------- UPDATE ---------------- */
var HOT=/^rdragon-cryptosocial\/engine\/rdragon-(quick|open|learn)\.js$/; /* pure modules: safe to swap without a reload */
var update={check:function(){return getJ(MAN).then(function(m){var c=cmpVersions(loaded(),m);return {live:m.v,newer:c.stale,missing:c.missing,upToDate:!c.stale.length,hotable:c.stale.filter(function(s){return HOT.test(s.file)}).map(function(s){return s.file})}})},
 hot:function(){return update.check().then(function(c){if(c.upToDate)return {hot:[],needsReload:[],upToDate:true};return snapshot("update.hot").then(function(b){var hot=c.newer.filter(function(s){return HOT.test(s.file)}),rest=c.newer.filter(function(s){return !HOT.test(s.file)});
  return Promise.all(hot.map(function(s){return loadScript("/"+s.file+"?v="+s.live).then(function(){try{var el=w.document.querySelector('script[src^="/'+s.file+'?v="]');if(el)el.setAttribute("src","/"+s.file+"?v="+s.live)}catch(e){}return s.file},function(){return null})})).then(function(done){return {backup:b.id,hot:done.filter(Boolean),needsReload:rest.map(function(s){return s.file}),hint:rest.length?"call RDIAG.update.force() to load the rest":"done"}})})})},
 force:function(o){o=o||{};return snapshot("update.force").then(function(b){return dropStale(false).then(function(r){return swReg().then(function(s){var u=String(w.location.pathname)+(w.location.search||"").replace(/([?&])_u=\d+&?/,"$1").replace(/[?&]$/,"");u+=(u.indexOf("?")<0?"?":"&")+"_u="+Date.now();if(o.reload!==false)try{w.location.replace(u)}catch(e){}return Object.assign({backup:b.id,reloadTo:u},r,s)})})})}};
/* ---------------- UPGRADE (request only; bots never push) ---------------- */
function upgradeRequest(o){o=o||{};var t=String(o.title||"Bot upgrade request").slice(0,120),want=String(o.want||"").slice(0,1500);
 return (o.report?Promise.resolve(o.report):last?Promise.resolve(last):run({sanity:o.sanity})).then(function(r){var body="TEST-ONLY bot upgrade request from @rdragon_diag (public test account; never owner/vault/biometric).\n\n### What should change\n"+(want||"(describe)")+"\n\n### Diag summary\n"+r.summary+"\n\n### Diag report (compact JSON)\n```json\n"+compact(r).slice(0,5000)+"\n```\n\nMaintainer flow: tests/diag-profile/bot-upgrade.sh (backup, branch, tests, PR, merge, GHOSTMACHINE sync).";
  var url="https://github.com/"+REPO+"/issues/new?template=bot-upgrade-request.yml&labels=bot-upgrade,test-only&title="+encodeURIComponent("[bot-upgrade] "+t)+"&body="+encodeURIComponent(body.slice(0,6000));
  var R=w.RRELAY,pp=R&&o.publish!==false?R.publish({t:"rdragon.upgrade-request",id:"rdu-"+Date.now().toString(36),text:"TEST-ONLY upgrade-request · "+t+" · "+want.slice(0,300),report:compact(r)}):Promise.resolve(null);
  return pp.then(function(ev){return {title:t,issueUrl:url,body:body,nostr:ev?ev.id:null,note:"Bots open issueUrl (no token needed in the page); a maintainer/bot with gh auth on Neo runs tests/diag-profile/bot-upgrade.sh to make the PR."}})})}
w.RDIAG={run:run,last:function(){return last},text:text,copy:copy,compact:compact,publish:publish,repair:repair,snapshot:snapshot,backups:backups,restore:restore,update:update,upgradeRequest:upgradeRequest,loaded:loaded,cmpVersions:cmpVersions,VERSION:VER};
})(typeof window!=="undefined"?window:globalThis);
