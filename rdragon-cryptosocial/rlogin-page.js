/* ЯLOGIN page — standalone login / sign-up for CryptoSocial (rsync-core 0.3 + RKRYPT/RGENERATOR fused).
   Method order: 1 auto-login (ЯCASKET challenge: WebAuthn/Face ID gate, then a one-time nonce signed by the device key; native hook = window.RCASKET.challenge),
   2 approve from an enrolled device (short code / QR / bundle), 3 username + password (LAST RESORT; PBKDF2 unwraps the profile key, rate-limited, offline).
   The password is never stored, logged, synced or shipped: only salt + KDF params + wrapped key + verifier, inside the ЯCASKET package.
   The chain gets only a COMMITMENT (sha256 of the sealed package + version) — TEST ledger only (localStorage) until Rizal's go.
   Identity: @chaserizal binds to the SAME RID as Rizal (ЯID-0001-3QQS); ThundR keeps ЯID-0014-KREH. Root = RKEY profile 0 (ЯCASKET) — PENDING. */
(function(){"use strict";
var CFG=window.RDRAGON_CONFIG||{},$=function(i){return document.getElementById(i)||(DUM[i]=DUM[i]||document.createElement("div"))},DUM={} /* t107u: simple page has only some elements */,RS=null,DEV=null,RQ=null,LAST=null;
var IDENT={"@chaserizal":{rid:"ЯID-0001-3QQS",tag:"#chaserizal",userId:"@chaserizal",
  binding:{rid:"ЯID-0001-3QQS",handle:"@chaserizal",bindingSha256:CFG.chaserizalBindingSha256||"PENDING (set RDRAGON_CONFIG.chaserizalBindingSha256 to bindingHash of the final staged binding)",staged:"cryptosocial-rid/CHASERIZAL-BINDING.unsigned.json",status:"staged (unsigned)"},
  cryptobot:{op:"bot",bot_rid:"ЯID-0014-KREH",class:"EXPERT",name:"ThundR",owner:"ЯID-0001-3QQS",bound:"ЯID",linkedProfile:"@CHASERIZAL",rosterRef:"ЯKLASSROOM/BOTLINK/roster/0014-KREH.json",
   caps:["local","watch","report"],canSign:false,canSpend:false,canMoveFunds:false,updateSource:{path:"RFORGE/THUNDR/SHARED (Neo)",tool:"thundr-sync"}}}};
var RID_OWNER={};Object.keys(IDENT).forEach(function(h){RID_OWNER[IDENT[h].rid]=h});
var RLK="rdragon.csp.rl.v1",LGK="rdragon.csp.testledger.v1",PKK="rdragon.csp.rcasket.pkgs.v1";
function J(k,d){try{return JSON.parse(localStorage.getItem(k)||"")||d}catch(e){return d}}function W(k,v){localStorage.setItem(k,JSON.stringify(v))}
function msg(t,err){var m=$("msg");m.textContent=t;m.className=err?"err":""}
function H(h){h=String(h||"").trim();if(h&&h[0]!=="@")h="@"+h;return h.toLowerCase()}
/* ---- IndexedDB device record (same store the main app reads) ---- */
function idb(){return new Promise(function(ok,no){var q=indexedDB.open("rdragon.csp.keys",1);q.onupgradeneeded=function(){q.result.createObjectStore("k")};q.onsuccess=function(){ok(q.result)};q.onerror=no})}
function get(){return idb().then(function(d){return new Promise(function(ok){var t=d.transaction("k").objectStore("k").get("device");t.onsuccess=function(){ok(t.result||null)};t.onerror=function(){ok(null)}})})}
function getK(k){return idb().then(function(d){return new Promise(function(ok){var t=d.transaction("k").objectStore("k").get(k);t.onsuccess=function(){ok(t.result||null)};t.onerror=function(){ok(null)}})})}
function putK(k,v){return idb().then(function(d){return new Promise(function(ok){var t=d.transaction("k","readwrite");t.objectStore("k").put(v,k);t.oncomplete=ok})})}
/* t106u 20261028: owner-device guard. The TEST-ONLY diag installer (?diag=1 → Import) replaces "device" with the
   @rdragon_diag record and keeps the owner record as "device.bak-<ts>". If the active record is test-only and a non-test
   backup exists, put the newest owner backup back as "device" and set the diag record aside as "device.diag-<ts>"
   (nothing is deleted, nothing leaves this browser, no key material is read beyond the flags/handle). */
function isTest(r){return !!(r&&(r.test_only||r.diag))}
function allKeys(){return idb().then(function(d){return new Promise(function(ok){try{var t=d.transaction("k").objectStore("k").getAllKeys();t.onsuccess=function(){ok(t.result||[])};t.onerror=function(){ok([])}}catch(e){ok([])}})})}
function ownerBackups(){return allKeys().then(function(ks){ks=ks.filter(function(k){return String(k).indexOf("device.bak-")===0}).sort().reverse();
 return Promise.all(ks.map(function(k){return getK(k).then(function(v){return{k:k,v:v}})})).then(function(a){return a.filter(function(x){return x.v&&!isTest(x.v)})})})}
function ownerRestore(){return get().then(function(cur){if(cur&&!isTest(cur))return{restored:false,reason:"owner record active"};
 return ownerBackups().then(function(b){if(!b.length)return{restored:false,reason:cur?"test-only record, no owner backup":"no device record"};
  var ts=new Date().toISOString().replace(/[-:]/g,"").replace(/\..*$/,"");
  return (cur?putK("device.diag-"+ts,cur):Promise.resolve()).then(function(){return put(b[0].v)}).then(function(){return{restored:true,from:b[0].k}})})}).catch(function(e){return{restored:false,reason:String(e&&e.message||e)}})}
function put(v){return idb().then(function(d){return new Promise(function(ok){var t=d.transaction("k","readwrite");t.objectStore("k").put(v,"device");t.oncomplete=ok})})}
/* ---- registered founder account: public commitment only (no package contents) ---- */
var FND=CFG.founder||null,PEND={};
function commitFor(p){if(FND&&p&&p.profile===FND.profile&&p.card&&H(p.card.handle)===H(FND.handle)&&p.rid===FND.rid)return Promise.resolve({t:"rcasket.commit",version:"rcasket-package-v1",profile:FND.profile,sha256:FND.commitment,registered:true});return LEDGER.find(p&&p.profile)}
function verifyPkg(p){if(!p||!p.card||!p.profile)return Promise.reject(Error("not a ЯCASKET package"));return commitFor(p).then(function(c){if(!c)throw Error("no registered commitment for this profile");return RSync.verifyPackage(p,c)}).then(function(v){if(!v.ok)throw Error("package rejected: "+v.why);return p})}
/* ---- TEST ledger (commitments only) ---- */
var LEDGER=RSync.testLedger(J(LGK,[]));var lw=LEDGER.write;LEDGER.write=function(c){return lw(c).then(function(e){var a=J(LGK,[]);a.push(e);W(LGK,a);return e})};
function st(){return RS&&RS.state()||{profiles:{}}}
function byHandle(h){var P=st().profiles;for(var k in P)if(H(P[k].handle)===h)return P[k];return null}
function profOfDev(pub){var P=st().profiles;for(var k in P){var d=P[k].devices&&P[k].devices[pub];if(d&&!d.revoked)return P[k]}return null}
/* ---- RGEN verify (egg4 record seals) + RKEY profile 0 ---- */
function owners(){var a=st().authority||{},n=0;for(var k in a)if(a[k]==="dual")n++;var ks=(CFG.ownerKeys||[]).map(function(k){return k.id+(k.pub?"":" (pub PENDING)")});$("owners").textContent=ks.length?ks.join(" · "):"none configured";$("dual").hidden=!n;$("dual").textContent="dual-signed ×"+n;return n}
 function p0(){var p=RSync.RGEN.profile0(CFG.profile0PublicKey);$("p0").textContent=p.publicKey;$("p0").dataset.status=p.status}
function rgenVerify(){return RSync.RGEN.verify(RS.raw()).then(function(r){LAST=r;var s=$("rg-status");s.textContent="RGEN verify ("+r.egg+"): "+r.ok+"/"+r.total+" valid RGEN seals"+(r.bad.length?" · "+r.bad.length+" INVALID":"");s.dataset.ok=String(!r.bad.length);return r})}
/* ---- finish: session.start signed by this device, then hand off to the app ---- */
function done(sg,pf,extra){var pv=pf.sessions&&pf.sessions[sg.pub],seq=Math.max(DEV&&DEV.seq|0,pv?pv.seq:0)+1;
 return RSync.sessionId(sg.pub,seq).then(function(sid){return RS.append({id:sid,t:"session.start",profile:pf.id,device:sg.pub,session_seq:seq,ts:new Date().toISOString()},sg)})
  .then(function(){DEV=Object.assign(DEV||{},extra||{},{profile:pf.id,seq:seq,out:false});delete DEV.req;return put(DEV)})
  .then(function(){document.body.dataset.signedIn=pf.handle;$("who").textContent="signed in as "+pf.handle+" ("+(pf.name||"")+") · device "+sg.pub.slice(0,12)+"…";msg("✓ signed in — session #"+seq);
   if(!CFG.noRedirect)setTimeout(function(){location.href="/"},600)})}
/* 1 · auto-login */
function auto(){get().then(function(r){if(!r||!r.kp||!r.profile)throw Error("no auto-login key on this device — use 2 or 3");var pf=st().profiles[r.profile];if(!pf)throw Error("profile not in the local replica yet — sync first");
  if(pf.autoLogin===false)throw Error("auto-login is off for "+pf.handle+" — use username + password");DEV=r;
  var gate=r.webauthn&&window.PublicKeyCredential&&navigator.credentials?navigator.credentials.get({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)),allowCredentials:[{type:"public-key",id:Uint8Array.from(atob(r.webauthn),function(c){return c.charCodeAt(0)})}],userVerification:"required",timeout:60000}}):Promise.resolve(null);
  return gate.then(function(){return RSync.deviceSigner(r.kp)}).then(function(sg){return RSync.casketChallenge(sg,window.RCASKET).then(function(c){msg("ЯCASKET challenge ok");return done(sg,pf)})})}).catch(function(e){msg(e.message,1)})}
/* 2 · approval from an enrolled device */
function showReq(){RSync.deviceSigner().then(function(sg){RQ=sg;return RSync.enrollRequest(sg,(navigator.platform||"device")+" · login page")}).then(function(req){
  var t="rsync-enroll:"+btoa(unescape(encodeURIComponent(JSON.stringify(req))));$("reqt").hidden=false;$("reqt").value=t;$("qr").innerHTML=window.RSyncQR?RSyncQR.svg(t,200):"";
  DEV={kp:RQ.keyPair,req:req};put(DEV);return RSync.shortCode(req)}).then(function(c){$("code").textContent=c;msg("⚿ approving… arrives at the next sync or by importing a bundle")})}
function checkEnrolled(){if(!RQ)return;var pf=profOfDev(RQ.pub);if(pf)done(RQ,pf,{kp:RQ.keyPair})}
function imp(){var t=prompt("Paste the approval bundle (JSON)");if(!t)return;var a;try{a=JSON.parse(t);a=Array.isArray(a)?a:(a.entries||[a])}catch(e){return msg("not a bundle",1)}RS.merge(a,"bundle").then(function(){checkEnrolled();if(RQ&&!profOfDev(RQ.pub))msg("bundle imported — this device is not enrolled in it",1)})}
/* 3 · username + password (rate-limited, offline) */
function pwRec(h){return get().then(function(r){if(r&&r.pw&&H(r.handle)===h)return r;return ownerBackups().then(function(b){var m=b.filter(function(x){return x.v.pw&&H(x.v.handle)===h})[0];return m?m.v:r})}).then(function(r){return getK("pkg:"+h).then(function(sp){var p=PEND[h]||sp||J(PKK,{})[h]||null;if(r&&r.pw&&H(r.handle)===h)return{rec:r.pw,pid:r.profile,pkg:p};return p?{rec:p.login,pid:p.profile,pkg:p}:null})})}
function login(){var h=H($("l-user").value),pe=$("l-pass"),RL=J(RLK,{}),s=RL[h]||{fails:0,until:0},rl=RSync.rateLimit(s,Date.now());
 /* t107u: specific, non-secret reasons. Only a real password mismatch counts toward the lockout. */
 if(h==="@")return msg("enter your username",1);if(!pe.value)return msg("enter your password",1);
 if(rl.wait())return msg("locked out for "+Math.ceil(rl.wait()/1000)+"s after too many wrong passwords — wait, then try again",1);$("b-login").disabled=true;msg("checking…");
 function F(code,text,count){var e=Error(text);e.code=code;e.count=count;return e}
 var X=null;
 pwRec(h).then(function(x){X=x;if(!x)throw F("no-record","no login record for "+h+" on this browser (no device login and no saved ЯCASKET package for it here) — open Other options → Restore from file once, then log in");
   return RSync.passwordCheck(x.rec,pe.value).then(function(okv){if(!okv)throw F("mismatch","login record found for "+h+", but this password does not match it",1);
    return RSync.passwordUnwrap(x.rec,pe.value).catch(function(){throw F("record-bad","password matches, but the saved login record on this browser could not be opened — restore your ЯCASKET package once (Other options)")})})})
  .then(function(sg){pe.value="";rl.ok();RL[h]={fails:0,until:0};W(RLK,RL);var x=X;
   var pid=x.pid||(x.pkg&&x.pkg.profile)||(byHandle(h)||{}).id;
   /* re-seed: password verified but the profile is missing from the local ledger -> append the signed founder profile.create (rsync-core only does it if this password key IS the profile's founder key) */
   var seed=x.pkg||(pid&&!st().profiles[pid]?{profile:pid,card:{handle:h,name:h.slice(1)},rid:(IDENT[h]||{}).rid||null,created:new Date().toISOString()}:null);
   return (x.pkg?putK("pkg:"+h,x.pkg).then(function(){delete PEND[h]}):Promise.resolve()).then(function(){return get()}).then(function(r){
     var dk=r&&r.kp&&r.profile===pid&&!isTest(r)?RSync.deviceSigner(r.kp):Promise.resolve(null);
     return dk.then(function(ds){return RSync.passwordDeviceLogin(RS,sg,{profile:pid,pkg:seed,device:ds,name:(navigator.platform||"device")+" · password login"})})})
    .catch(function(e){throw F("no-profile","password OK, but profile "+(pid||"?")+" is not in this browser’s ledger and could not be re-seeded ("+String(e&&e.message||e)+") — Other options → Restore from file")})
    .then(function(Lg){var pf=st().profiles[pid];if(!pf)throw F("no-profile","password OK, but the profile is not in this browser’s ledger — Other options → Restore from file");
     return done(Lg.device,pf,{kp:Lg.device.keyPair,pw:x.rec,handle:h})})})
  .catch(function(e){if(e&&e.count){RL[h]=rl.fail();W(RLK,RL)}pe.value="";window.RLOGIN_LAST_FAIL=e&&e.code||"error";msg(e&&e.message||String(e),1)}).then(function(){$("b-login").disabled=false})}
/* t107u: login self-check — store NAMES and record KINDS only, never values */
function selfCheck(h){h=H(h||$("l-user").value||(FND&&FND.handle)||"@chaserizal");var out={origin:location.origin,handle:h,idb:{},localStorage:[],ledger:{},lockout:null,databases:null};
 var RL=J(RLK,{})[h];if(RL){var w=RSync.rateLimit(RL,Date.now()).wait();out.lockout=w?Math.ceil(w/1000)+"s":"none (fails "+(RL.fails|0)+")"}else out.lockout="none";
 try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(/^(rdragon|rpostmenu|rdiag)/.test(k))out.localStorage.push(k+" ("+(localStorage.getItem(k)||"").length+" chars)")}}catch(e){out.localStorage=["unavailable: "+e.name]}
 out.packageList=Object.keys(J(PKK,{}));try{var st0=st();out.ledger={entries:RS?RS.raw().length:0,profiles:Object.keys(st0.profiles||{}).length,hasHandle:!!byHandle(h)}}catch(e){out.ledger={error:String(e)}}
 var dbs=(indexedDB.databases?indexedDB.databases().then(function(a){out.databases=a.map(function(x){return x.name})},function(){}):Promise.resolve());
 return dbs.then(function(){return allKeys()}).then(function(ks){return Promise.all(ks.map(function(k){return getK(k).then(function(v){var kind=String(k).replace(/-d.*$/,"-*");
   out.idb[String(k)]={kind:kind,testOnly:isTest(v),hasPasswordRecord:!!(v&&(v.pw||v.login)),forThisHandle:H((v&&(v.handle||(v.me&&v.me.handle)||(v.card&&v.card.handle)))||"")===h,hasDeviceKey:!!(v&&(v.kp||v.skp))}})}))})
  .then(function(){var r=out.idb.device,pk=out.idb["pkg:"+h];out.verdict=r&&r.hasPasswordRecord&&r.forThisHandle?"device login record present":pk?"saved ЯCASKET package present":Object.keys(out.idb).some(function(k){return out.idb[k].hasPasswordRecord&&out.idb[k].forThisHandle})?"owner backup present (login will use it)":out.packageList.indexOf(h)>=0?"package in localStorage list":"NO login record for "+h+" in this browser — Restore from file once";
   var el=document.getElementById("selfcheck");if(el)el.textContent=JSON.stringify(out,null,1);return out})}
function restorePkg(){var t=prompt("Paste the ЯCASKET package (JSON)");if(!t)return;var p;try{p=JSON.parse(t)}catch(e){return msg("not a package",1)}
 verifyPkg(p).then(function(){PEND[H(p.card.handle)]=p;var a=J(PKK,{});a[H(p.card.handle)]=p;W(PKK,a);msg("✓ package verified against its commitment — now log in with your password")}).catch(function(e){msg(e.message,1)})}
function restoreFile(){var f=$("f-pkg").files&&$("f-pkg").files[0];if(!f)return;var rd=new FileReader();rd.onload=function(){var p;$("f-pkg").value="";try{p=JSON.parse(rd.result)}catch(e){return msg("not a package file",1)}
 verifyPkg(p).then(function(){var h=H(p.card.handle);PEND[h]=p;putK("pkg:"+h,p).then(founderLine).catch(function(){}); /* 20261027: keep the verified package on THIS device right away (public login record only: salt + KDF params + wrapped key; never uploaded), so the file is needed once per device */$("l-user").value=h;$("l-pass").focus();msg("✓ "+h+" package verified against its registered commitment — now enter your password")}).catch(function(e){msg(e.message,1)})};rd.readAsText(f)}
function founderLine(){var e=$("founder-st");if(!e||!FND)return;getK("pkg:"+H(FND.handle)).then(function(sp){e.textContent=sp?"Founder login registered — "+FND.handle+" ("+FND.rid+") is saved on this device; log in with your password":"Founder login registered — restore your package once per device";e.hidden=false})}
/* sign up */
function strength(p){p=p||"";var c=0;if(p.length>=8)c++;if(p.length>=12)c++;if(p.length>=16)c++;if(/[a-z]/.test(p)&&/[A-Z]/.test(p))c++;if(/\d/.test(p))c++;if(/[^A-Za-z0-9]/.test(p))c++;
 var lv=p.length<8?0:c<=2?1:c<=4?2:3;return{score:lv,label:["too short","weak","good","strong"][lv]}}
function meter(){var s=strength($("s-pass").value);$("s-meter").firstChild.style.width=(s.score/3*100)+"%";$("s-strength").textContent="strength: "+s.label}
function signup(){var h=H($("s-user").value),name=$("s-name").value.trim(),pe=$("s-pass"),p2=$("s-pass2"),rid=$("s-rid").value.trim(),id=IDENT[h];
 function fail(t){pe.value="";p2.value="";msg(t,1)}
 if(!/^@[a-z0-9_]{2,30}$/.test(h))return fail("handle: 2–30 letters, digits or _");if(!name)return fail("display name required");
 if(rid&&id&&rid!==id.rid)return fail("RID mismatch: "+h+" is bound to "+id.rid);if(rid&&!id&&RID_OWNER[rid])return fail("RID mismatch: "+rid+" belongs to "+RID_OWNER[rid]);
 if(id&&!rid)rid=id.rid;if(pe.value!==p2.value)return fail("passwords do not match");if(strength(pe.value).score<2)return fail("password too weak");if(byHandle(h))return fail("handle already taken in this replica");
 var autoL=$("s-auto").checked;$("b-signup").disabled=true;msg("deriving key (PBKDF2)…");
 RSync.passwordWrap(pe.value,CFG.pbkdf2Iter?{iter:CFG.pbkdf2Iter}:{}).then(function(w){pe.value="";p2.value="";
  return RSync.deviceSigner().then(function(dk){return RSync.profileIdFor(w.signer.pub).then(function(pid){var now=new Date().toISOString();
   var c={id:"pc-"+pid,t:"profile.create",profile:pid,handle:h,name:name,autoLogin:autoL,ts:now};if(rid)c.rid=rid;
   var ch=RS.append(c,w.signer);if(dk)ch=ch.then(function(){return RSync.enrollRequest(dk,autoL?"this device (auto-login)":"this device")}).then(function(req){return RS.append(RSync.approveEntry(req,pid),w.signer)});
   return ch.then(function(){var pf=st().profiles[pid];return RSync.casketPackage({profile:pid,card:{handle:h,name:name},login:w.rec,devices:pf.devices,sessions:pf.sessions,
     rid:rid||null,userId:id?id.userId:h,tag:id?id.tag:"#"+h.slice(1),binding:id?id.binding:null,cryptobot:id?id.cryptobot:undefined,root:CFG.profile0PublicKey||null},w.signer)})
   .then(function(pkg){return RSync.packageCommitment(pkg).then(function(cm){return LEDGER.write(cm)}).then(function(){window.__rcasketPkg=pkg;var a=J(PKK,{});a[h]=pkg;W(PKK,a);$("b-dlpkg").hidden=false;
     var pf=st().profiles[pid];return dk?done(dk,pf,{kp:dk.keyPair,pw:w.rec,handle:h}):done(w.signer,pf,{skp:w.signer.keyPair,pw:w.rec,handle:h})})})})})})
  .catch(function(e){fail(e.message)}).then(function(){$("b-signup").disabled=false})}
function dlpkg(){var p=window.__rcasketPkg;if(!p)return;var a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(p,null,1)],{type:"application/json"}));a.download="rcasket-package-"+p.card.handle.slice(1)+".json";a.click()}
/* wire up */
function tab(t){[].forEach.call(document.querySelectorAll("[data-tab]"),function(b){b.classList.toggle("on",b.dataset.tab===t)});$("t-login").hidden=t!=="login";$("t-signup").hidden=t!=="signup"}
[].forEach.call(document.querySelectorAll("[data-tab]"),function(b){b.onclick=function(){tab(b.dataset.tab)}});
ownerRestore().then(function(x){window.RLOGIN_OWNER_RESTORE=x;if(x.restored)msg("✓ this device's own login record is active again (TEST-ONLY diag identity set aside) — log in with your password")});try{if(/[?&]tab=signup/.test(location.search))tab("signup")}catch(e){}if(document.getElementById("b-selfcheck"))$("b-selfcheck").onclick=function(){selfCheck()};$("b-auto").onclick=auto;$("b-req").onclick=showReq;$("b-imp").onclick=imp;$("b-login").onclick=login;$("b-pkg").onclick=restorePkg;$("f-pkg").onchange=restoreFile;founderLine();try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist().catch(function(){})}catch(e){}getK("pkg:"+(FND?H(FND.handle):"")).then(function(sp){if(sp&&!$("l-user").value)$("l-user").value=H(FND.handle)});$("b-signup").onclick=signup;$("b-dlpkg").onclick=dlpkg;$("b-rgen").onclick=rgenVerify;
$("s-pass").oninput=meter;$("l-pass").onkeydown=function(e){if(e.key==="Enter")login()};p0();
RS=RSync.create({storage:RSync.adapters.localStorage("rdragon.csp.rsync.v1"),policy:RSync.devicePolicy({ownerKeys:CFG.ownerKeys||[]})});
RS.ready.then(function(){var bc=RSync.adapters.broadcast("rdragon.csp.rsync");if(bc)RS.attach(bc);
 function rdPeers(base,cb){var l=(CFG.peers||[]).concat(window.RDRAGON_PRIVATE_PEERS||[]),u=CFG.privatePeersUrl;if(!u||!window.fetch)return cb(l);try{u=new URL(u,base||location.href).href}catch(e){return cb(l)}fetch(u,{cache:"no-store"}).then(function(r){return r.ok?r.json():{}}).then(function(j){cb(l.concat(j&&j.peers||[]))},function(){cb(l)})}
 rdPeers((document.querySelector('script[src*="rlogin-page.js"]')||{}).src,function(pl){var tps=pl.filter(function(u,i){return u&&pl.indexOf(u)===i}).map(function(u){return RSync.adapters.httpPeer(String(u).replace(/\/$/,""))});if(tps.length){var y=RS.syncer({peers:tps,pollMs:CFG.syncEveryMs||20000});y.start()}});
 RS.onChange(checkEnrolled);RS.onChange(owners);owners();rgenVerify();return get()}).then(function(r){if(r&&r.kp&&!r.req&&r.profile)$("auto-note").textContent+=" · this device has an auto-login key"});
window.RLOGIN_PAGE={selfCheck:selfCheck,ownerRestore:ownerRestore,state:st,device:get,ledger:LEDGER,strength:strength,ident:IDENT,rgen:function(){return LAST},rgenVerify:rgenVerify,owners:owners,authority:function(id){return RSync.authorityOf(st(),id)},commands:RSync.RGEN.commands,founder:FND,storedPackage:function(h){return getK("pkg:"+H(h))}};
})();
