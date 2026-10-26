/* ЯSYNC core 0.1 — peer-to-peer, multi-master sync of permanent, signed, append-only entries.
   One plain-JS file for the browser, Node 18+ and app webviews. It has no dependencies and uses only WebCrypto.
   Model: each entry is a JSON object {id, t, ...}. Its content id is cid = sha256(canon(entry minus LOCAL keys)).
   The RGEN seal (RGENERATOR egg4 yaseed.mint artifact) is {scope:'yaseed.mint', msg:'yaseed-artifact-v1\nyaseed.mint\n'+cid, pub, value}.
   It is verified the same way as RGENERATOR Ledger.verifyRecord: P-256 ECDSA (pub = base64 raw 65 bytes), or Ed25519 (pub = base58 32 bytes).
   Merge is a union by id. An entry is rejected if its cid is wrong, its seal is bad or missing (unless policy allows it), or its id is reused with different content (equivocation).
   There is no delete, so there are no delete conflicts. The order is deterministic (ts, then id). Any peer can push to or pull from any other peer.
   Adapters:
     storage   {load():Promise<entry[]>|entry[], save(entries)}
     transport {name, send(entries), onEntries(cb)}, or pull-only {name, pull():Promise<entry[]>, push(entries)} */
(function(root,f){var m=f();if(typeof module==='object'&&module.exports)module.exports=m;else root.RSync=m})(typeof self!=='undefined'?self:this,function(){
 'use strict';
 var VERSION='0.3.2',SCOPE='yaseed.mint',PREFIX='yaseed-artifact-v1\n'+SCOPE+'\n';
 var LOCAL=['seq','prev','hash','cid','rgen','_src','_rx','cosig'];
 var C=(typeof globalThis!=='undefined'&&globalThis.crypto)||(typeof require==='function'?require('crypto').webcrypto:null);
 var subtle=C&&C.subtle;
 function canon(v){return Array.isArray(v)?'['+v.map(canon).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().filter(function(k){return v[k]!==undefined}).map(function(k){return JSON.stringify(k)+':'+canon(v[k])}).join(',')+'}':JSON.stringify(v)}
 function enc(s){return new TextEncoder().encode(s)}
 function hx(b){return Array.prototype.map.call(new Uint8Array(b),function(x){return('0'+x.toString(16)).slice(-2)}).join('')}
 function b64d(s){if(typeof atob==='function'){var r=atob(s),u=new Uint8Array(r.length);for(var i=0;i<r.length;i++)u[i]=r.charCodeAt(i);return u}return new Uint8Array(Buffer.from(s,'base64'))}
 function b64e(u){u=new Uint8Array(u);if(typeof btoa==='function'){var s='';for(var i=0;i<u.length;i++)s+=String.fromCharCode(u[i]);return btoa(s)}return Buffer.from(u).toString('base64')}
 var A='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
 function b58d(s){var n=[0];for(var i=0;i<s.length;i++){var c=A.indexOf(s[i]);if(c<0)throw Error('b58');for(var j=0;j<n.length;j++){c+=n[j]*58;n[j]=c&255;c>>=8}while(c){n.push(c&255);c>>=8}}for(i=0;i<s.length&&s[i]==='1';i++)n.push(0);return new Uint8Array(n.reverse())}
 function body(e){var o={};Object.keys(e).forEach(function(k){if(LOCAL.indexOf(k)<0)o[k]=e[k]});return o}
 function sha(s){return subtle.digest('SHA-256',enc(s)).then(hx)}
 function cidOf(e){return sha(canon(body(e)))}
 function der2raw(d){if(d.length===64)return d;var i=2,rl=d[i+1],r=d.slice(i+2,i+2+rl);i=i+2+rl;var sl=d[i+1],s=d.slice(i+2,i+2+sl);function p(x){while(x.length>32&&x[0]===0)x=x.slice(1);var o=new Uint8Array(32);o.set(x,32-x.length);return o}var o=new Uint8Array(64);o.set(p(r));o.set(p(s),32);return o}
 function verifySig(msg,val,pub){try{var sig=b64d(val);
   if(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(pub)){var raw=b58d(pub);if(raw.length!==32)return Promise.resolve(false);
    return subtle.importKey('raw',raw,{name:'Ed25519'},false,['verify']).then(function(k){return subtle.verify({name:'Ed25519'},k,sig,enc(msg))}).catch(function(){return false})}
   return subtle.importKey('raw',b64d(pub),{name:'ECDSA',namedCurve:'P-256'},false,['verify']).then(function(k){return subtle.verify({name:'ECDSA',hash:'SHA-256'},k,der2raw(sig),enc(msg))}).catch(function(){return false})}catch(x){return Promise.resolve(false)}}
 /* full check of one entry -> {ok, cid, signed, reason} */
 function check(e){if(!e||typeof e!=='object'||typeof e.id!=='string'||!e.id)return Promise.resolve({ok:false,reason:'no id'});
  return cidOf(e).then(function(cid){if(e.cid&&e.cid!==cid)return{ok:false,cid:cid,reason:'tampered (cid mismatch)'};var g=e.rgen;
   if(!g)return{ok:true,cid:cid,signed:false};
   if(g.scope!==SCOPE||g.msg!==PREFIX+cid)return{ok:false,cid:cid,reason:'tampered (seal does not cover this content)'};
   if(e.signer&&e.signer!==g.pub)return{ok:false,cid:cid,reason:'signer mismatch'};
   return verifySig(g.msg,g.value,g.pub).then(function(v){return v?{ok:true,cid:cid,signed:true,pub:g.pub}:{ok:false,cid:cid,reason:'bad signature'}})})}
 /* sign helper: signer = {pub, sign(msg)->base64|Promise} ; returns a new entry with cid + rgen */
 function seal(e,signer){var b=body(e);if(signer.pub)b.signer=signer.pub;return cidOf(b).then(function(cid){var msg=PREFIX+cid;return Promise.resolve(signer.sign(msg)).then(function(v){var o=Object.assign({},b);o.cid=cid;o.rgen={scope:SCOPE,msg:msg,pub:signer.pub,value:v};return o})})}
 /* browser/Node device key (P-256, WebCrypto). Pass a CryptoKeyPair to reuse a stored non-extractable key. */
 function deviceSigner(kp){return(kp?Promise.resolve(kp):subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},false,['sign','verify'])).then(function(k){return subtle.exportKey('raw',k.publicKey).then(function(raw){var pub=b64e(raw);
   return{pub:pub,keyPair:k,sign:function(m){return subtle.sign({name:'ECDSA',hash:'SHA-256'},k.privateKey,enc(m)).then(b64e)}}})})}
 function order(a,b){return a.ts===b.ts?(a.id<b.id?-1:a.id>b.id?1:0):((a.ts||'')<(b.ts||'')?-1:1)}
 /* a replica */
 function create(opt){opt=opt||{};var policy=Object.assign({allowUnsigned:false},opt.policy||{});var M={},list=[],subs=[],tps=[],q=Promise.resolve(),ready,V=null,WHY={},ST=null,meta={synced:{}};
  function revalue(){if(!policy.view)return Promise.resolve();return Promise.resolve(policy.view(list.slice())).then(function(r){V=r.ok;WHY=r.why||{};ST=r.state||null})}
  function vis(e){return!V||V[e.id]}
  function put(e,cid,src){var o=Object.assign({},e);o.cid=cid;delete o._src;M[o.id]=o;list.push(o);list.sort(order);if(src)Object.defineProperty(o,'_src',{value:src,enumerable:false,writable:true})}
  function ingest(arr,src,trusted){var added=[],rejected=[];arr=Array.isArray(arr)?arr:[];
   return arr.reduce(function(p,e){return p.then(function(){return check(e).then(function(r){if(!r.ok){rejected.push({id:e&&e.id,reason:r.reason,from:src});return}
     if(!r.signed&&!(trusted||policy.allowUnsigned)){rejected.push({id:e.id,reason:'unsigned',from:src});return}
     var have=M[e.id];if(have){if(have.cid!==r.cid)rejected.push({id:e.id,reason:'equivocation (same id, different content)',from:src});return}
     if(policy.accept&&!policy.accept(e)){rejected.push({id:e.id,reason:'policy',from:src});return}
     put(e,r.cid,src);added.push(M[e.id])})})},Promise.resolve()).then(function(){return added.length?revalue():null}).then(function(){var held=added.filter(function(e){return!vis(e)});
     held.forEach(function(e){rejected.push({id:e.id,reason:WHY[e.id]||'not authorized',from:src,held:true})});added=added.filter(vis);var res={added:added,rejected:rejected};
     function note(){if(added.length||rejected.length)subs.forEach(function(f){try{f(res)}catch(x){}});return res}
     if((added.length||held.length)&&opt.storage&&src!=='storage')return Promise.resolve(opt.storage.save(list.slice())).then(note);return note()})}
  function serial(fn){var r=q.then(fn);q=r.catch(function(){});return r}
  ready=Promise.resolve(opt.storage&&opt.storage.loadMeta?opt.storage.loadMeta():null).then(function(m){if(m&&m.synced)meta=m;return opt.storage?opt.storage.load():[]}).then(function(a){return ingest(a||[],'storage',true)});
  function saveMeta(){if(opt.storage&&opt.storage.saveMeta)try{opt.storage.saveMeta(meta)}catch(x){}}
  var R={VERSION:VERSION,ready:ready,
   entries:function(){return list.filter(vis)},raw:function(){return list.slice()},get:function(id){return M[id]&&vis(M[id])?M[id]:null},size:function(){return list.filter(vis).length},
   state:function(){return ST},why:function(id){return WHY[id]||null},
   /* outbox: signed entries this replica holds that peer `name` has not acknowledged yet */
   outbox:function(name){var d=meta.synced[name]||{};return list.filter(function(e){return!d[e.id]})},
   markSynced:function(name,ids){var d=meta.synced[name]=meta.synced[name]||{};(ids||[]).forEach(function(i){d[i]=1});saveMeta()},
   heads:function(){return list.map(function(e){return e.id+':'+e.cid})},
   digest:function(){return sha(list.filter(vis).map(function(e){return e.cid}).sort().join(''))},
   merge:function(arr,src){return serial(function(){return ready.then(function(){return ingest(arr,src||'peer',false)})})},
   append:function(e,signer){return serial(function(){return ready.then(function(){return(signer?seal(e,signer):Promise.resolve(e)).then(function(s){return ingest([s],'local',!signer).then(function(r){if(r.added.length)tps.forEach(function(t){if(t.send)try{t.send(r.added)}catch(x){}});return r})})})})},
   missingFor:function(theirIds){var h={};(theirIds||[]).forEach(function(x){h[x.split(':')[0]]=1});return list.filter(function(e){return!h[e.id]})},
   onChange:function(f){subs.push(f);return function(){subs=subs.filter(function(g){return g!==f})}},
   attach:function(t){tps.push(t);if(t.onEntries)t.onEntries(function(arr,src){R.merge(arr,src||t.name)});
    if(t.pull)return t.pull().then(function(a){return R.merge(a,t.name)}).then(function(r){if(t.push)return Promise.resolve(t.push(list.slice())).then(function(){return r});return r}).catch(function(x){return{added:[],rejected:[],error:String(x&&x.message||x)}});
    if(t.send)t.send(list.slice());return Promise.resolve({added:[],rejected:[]})},
   bundle:function(){return{format:'rsync.bundle.v1',version:VERSION,entries:list.slice()}},
   syncer:function(o){return syncer(R,o)},
   importBundle:function(b,src){if(!b||b.format!=='rsync.bundle.v1')return Promise.resolve({added:[],rejected:[{reason:'not an rsync bundle'}]});return R.merge(b.entries,src||'bundle')}};
  return R}
 /* ---- reference adapters (no network services are opened by this module) ---- */
 function memoryStorage(seed){var a=(seed||[]).slice(),mm=null;return{loadMeta:function(){return mm},saveMeta:function(m){mm=JSON.parse(JSON.stringify(m))},load:function(){return a.slice()},save:function(x){a=x.slice()},dump:function(){return a}}}
 function localStorageAdapter(key){return{loadMeta:function(){try{return JSON.parse(localStorage.getItem(key+'.meta')||'null')}catch(e){return null}},saveMeta:function(m){try{localStorage.setItem(key+'.meta',JSON.stringify(m))}catch(e){}},load:function(){try{return JSON.parse(localStorage.getItem(key)||'[]')}catch(e){return[]}},save:function(a){try{localStorage.setItem(key,JSON.stringify(a))}catch(e){}}}}
 /* same-device tabs/webviews on one origin */
 function broadcastTransport(name){if(typeof BroadcastChannel==='undefined')return null;var ch=new BroadcastChannel(name||'rsync');var cb=null;
  ch.onmessage=function(m){if(cb&&m.data&&m.data.rsync===1)cb(m.data.entries,'tab')};return{name:'broadcast',send:function(e){ch.postMessage({rsync:1,entries:e})},onEntries:function(f){cb=f}}}
 /* any EXISTING peer that serves GET/POST {base}/api/rsync/entries (e.g. a ЯNETWORK node or DS-BRIDGE route, once Rizal turns it on). */
 function httpPeer(base,opt){opt=opt||{};var h={'Content-Type':'application/json'};if(opt.token)h.Authorization='Bearer '+opt.token;
  var TO=opt.timeout||8000;function fetch(u,o2){o2=o2||{};var ac=typeof AbortController!=='undefined'?new AbortController():null,t=ac&&setTimeout(function(){ac.abort()},TO);if(ac)o2.signal=ac.signal;return globalThis.fetch(u,o2).then(function(r){clearTimeout(t);return r},function(e){clearTimeout(t);throw e})}
  return{name:'http:'+base,pull:function(){return fetch(base+'/api/rsync/entries').then(function(r){if(!r.ok)throw Error('pull '+r.status);return r.json()}).then(function(j){return j.entries||j})},
   push:function(a){return fetch(base+'/api/rsync/entries',{method:'POST',headers:h,body:JSON.stringify({entries:a})}).then(function(r){return r.ok})},send:function(a){fetch(base+'/api/rsync/entries',{method:'POST',headers:h,body:JSON.stringify({entries:a})}).catch(function(){})}}}

 /* ---- outbox syncer: "update or sync at the next connection, online or local" ----
    peers: [{name, pull():Promise<entry[]>, push(entries):Promise<bool>}] — any mix of an internet HTTPS peer and local ЯNETWORK / DS-BRIDGE / LAN peers.
    Each sync: pull from the peer -> merge (verify), then push only that peer's outbox, then mark those ids synced for that peer.
    Triggers: start(), window 'online', visibility 'visible', 'focus', and a retry timer with exponential backoff while peers fail. */
 function syncer(R,o){o=o||{};var peers=(o.peers||[]).filter(Boolean),min=o.minDelay||2000,max=o.maxDelay||300000,P={},timer=null,delay=min,busy=null,subs=[],last=null,env=o.env||(typeof window!=='undefined'?window:null);
  peers.forEach(function(p){P[p.name]={name:p.name,ok:null,last:null,err:null}});
  function status(){var q={};peers.forEach(function(p){q[p.name]=R.outbox(p.name).length});var vals=peers.map(function(p){return q[p.name]});
   return{queued:vals.length?Math.max.apply(null,vals):R.raw().length,perPeer:q,last:last,peers:peers.map(function(p){var x=Object.assign({},P[p.name]);x.queued=q[p.name];return x}),nextRetryMs:timer?delay:0}}
  function note(){var st=status();subs.forEach(function(f){try{f(st)}catch(x){}})}
  function one(p){var st=P[p.name];
   return Promise.resolve().then(function(){return p.pull?p.pull():[]}).then(function(got){got=Array.isArray(got)?got:[];return R.merge(got,p.name).then(function(){R.markSynced(p.name,got.map(function(e){return e&&e.id}).filter(Boolean))})})
    .then(function(){var out=R.outbox(p.name);if(!out.length||!p.push)return true;return Promise.resolve(p.push(out)).then(function(ok){if(ok===false)throw Error('push refused');R.markSynced(p.name,out.map(function(e){return e.id}));return true})})
    .then(function(){st.ok=true;st.err=null;st.last=new Date().toISOString();last={peer:p.name,at:st.last};return true},function(x){st.ok=false;st.err=String(x&&x.message||x);return false})}
  function pass(){return peers.reduce(function(a,p){return a.then(function(r){return one(p).then(function(v){r.push(v);return r})})},Promise.resolve([]))}
  function passes(n){return pass().then(function(r){var again=peers.some(function(p,i){return r[i]&&R.outbox(p.name).length});return again&&n>1?passes(n-1):r})}
  function now(){if(busy)return busy;busy=R.ready.then(function(){return passes(3)})
    .then(function(r){busy=null;var anyFail=r.some(function(v){return!v}),pending=peers.some(function(p){return R.outbox(p.name).length});if(anyFail)schedule();else{delay=min;clear()}note();return status()});return busy}
  function clear(){if(timer){clearTimeout(timer);timer=null}}
  function schedule(){clear();var d=delay;delay=Math.min(max,delay*2);timer=setTimeout(function(){timer=null;now()},d)}
  var off=[];function on(t,ev,f){if(t&&t.addEventListener){t.addEventListener(ev,f);off.push(function(){t.removeEventListener(ev,f)})}}
  var S={status:status,syncNow:now,onStatus:function(f){subs.push(f)},
   start:function(){on(env,'online',function(){delay=min;now()});on(env,'focus',now);if(env&&env.document)on(env.document,'visibilitychange',function(){if(env.document.visibilityState==='visible')now()});
    var u=R.onChange(function(r){if(r.added.length&&peers.length)now()});off.push(u);
    /* auto-sync: periodic pull+push every pollMs (new profiles/entries from other devices arrive with no user action) */
    if(o.pollMs>0&&peers.length){var iv=setInterval(function(){if(!timer)now()},o.pollMs);off.push(function(){clearInterval(iv)})}return now()},
   stop:function(){clear();off.forEach(function(f){f()});off=[]}};
  return S}
 /* ---- device enrollment policy (profiles x devices, all signed append-only entries) ----
    profile.create  {profile:'RP-'+sha256(pub)[0:16], handle, name, wallet?} signed by device 1 -> device 1 enrolled.
    device.enroll   {profile, device, nonce, req_ts, req_sig, device_name} signed by an enrolled device OR a linked wallet key.
                    req_sig is the NEW device's own signature over enrollRequestMsg(device,nonce,req_ts) (proof it holds the key and asked).
    device.revoke   {profile, device} signed by an enrolled device or wallet. Never a deletion: old entries before the revoke stay valid.
    profile.wallet  {profile, wallet} links an RLogin wallet key as an approver.   profile.update {profile, name?, handle?, avatar?, banner?} (avatar/banner = https URL or sha256:<hex> blob ref, max 512 chars; no data: URLs)
    Any other entry carrying `profile` must be signed by a device enrolled in that profile at entry.ts and not revoked by then.
    The view is recomputed deterministically from the full signed set (ts, id order), so every replica reaches the same result in any arrival order. */
 var ENROLL='rsync-enroll-v1\n',REQ_TTL=24*3600*1000;
 function enrollRequestMsg(dev,nonce,ts){return ENROLL+dev+'\n'+nonce+'\n'+ts}
 function profileIdFor(pub){return sha('rsync-profile-v1\n'+pub).then(function(h){return'RP-'+h.slice(0,16)})}
 function devicePolicy(o){o=o||{};var vcache={},OK=(o.ownerKeys||[]).filter(function(k){return k&&k.pub}),ORID=o.ownerRid||'ЯID-0001-3QQS';
  /* Rizal's keys (RKEY profile 0 = root, e5833fdfbbfe, others): each alone is a FULL-POWER signer on his profile (login nonces, enrollment approvals, sessions, everything) — never refused or scoped.
     An entry signed by one owner key and co-signed by a DIFFERENT owner key is 'dual' = top authority level. */
  function okey(pub){for(var i=0;i<OK.length;i++)if(OK[i].pub===pub)return OK[i];return null}
  function vreq(e){var k=e.cid+'|'+e.device;if(k in vcache)return Promise.resolve(vcache[k]);return verifySig(enrollRequestMsg(e.device,e.nonce,e.req_ts),e.req_sig||'',e.device).then(function(v){vcache[k]=v;return v})}
  return{allowUnsigned:false,view:function(list){var ok={},why={},prof={},auth={},chain=Promise.resolve();
   function active(Pf,pub,ts){if(okey(pub)&&(Pf.rid===ORID||o.ownerAllProfiles))return'owner';var d=Pf.devices[pub];if(d&&d.since<=ts&&!(d.revoked&&ts>=d.revoked))return'device';if(Pf.wallets[pub])return'wallet';return null}
   list.forEach(function(e){chain=chain.then(function(){var pub=e.rgen&&e.rgen.pub,ts=e.ts||'';
    if(!e.profile){ok[e.id]=true;return}
    if(!pub){why[e.id]='unsigned';return}
    var Pf=prof[e.profile];
    if(e.t==='profile.create')return profileIdFor(pub).then(function(id){if(id!==e.profile){why[e.id]='profile id does not match its creating key';return}
      if(Pf){why[e.id]='profile already exists';return}
      prof[e.profile]={id:e.profile,handle:e.handle,name:e.name,created:ts,devices:{},wallets:{},nonces:{},sessions:{},autoLogin:e.autoLogin!==false,rid:e.rid||null,log:[]};prof[e.profile].devices[pub]={pub:pub,since:ts,name:e.device_name||'device 1',by:'genesis'};
      if(e.wallet)prof[e.profile].wallets[e.wallet]={since:ts};ok[e.id]=true});
    if(!Pf){why[e.id]='unknown profile (its profile.create has not arrived)';return}
    var role=active(Pf,pub,ts),dv=Pf.devices[pub];
    if(!role){why[e.id]=dv&&dv.revoked&&ts>=dv.revoked?'device revoked (entry after revocation)':'signer is not an enrolled device of this profile';return}
    var co=e.cosig;if(co)return verifySig(e.rgen.msg,co.value||'',co.pub||'').then(function(v){if(!v){why[e.id]='invalid co-signature';return}
      if(role==='owner'&&okey(co.pub)&&co.pub!==pub)auth[e.id]='dual';delete e._co;return apply(role,dv)});
    if(role==='owner')auth[e.id]='owner';
    return apply(role,dv);
    function apply(role,dv){if(role==='owner'&&!auth[e.id])auth[e.id]='owner';
    if(e.t==='device.enroll'){if(!e.device||!e.nonce){why[e.id]='malformed enrollment';return}
     if(Pf.nonces[e.nonce]){why[e.id]='replayed enrollment (nonce already used)';return}
     if(Pf.devices[e.device]){why[e.id]='replayed enrollment (device already enrolled or revoked)';return}
     var rt=Date.parse(e.req_ts),et=Date.parse(ts);if(!(rt<=et+60000&&et-rt<=REQ_TTL)){why[e.id]='enrollment request expired or from the future';return}
     return vreq(e).then(function(v){if(!v){why[e.id]='forged enrollment (request not signed by the new device)';return}
      Pf.nonces[e.nonce]=1;Pf.devices[e.device]={pub:e.device,since:ts,name:e.device_name||'device',by:role==='wallet'?'wallet':pub};ok[e.id]=true})}
    if(e.t==='device.revoke'){var d=Pf.devices[e.device];if(!d){why[e.id]='revoke of unknown device';return}if(!d.revoked)d.revoked=ts;ok[e.id]=true;return}
    if(e.t==='profile.wallet'){if(!e.wallet){why[e.id]='malformed';return}Pf.wallets[e.wallet]={since:ts};ok[e.id]=true;return}
    if(e.t==='profile.update'){var picRef=function(v){return v===''||(typeof v==='string'&&v.length<=512&&(/^https:\/\/[^\s"'<>]+$/.test(v)||/^sha256:[0-9a-f]{64}$/.test(v)))};if(e.name)Pf.name=e.name;if(e.handle)Pf.handle=e.handle;/* 2026-10-26 avatar sync: picture refs only (https URL or sha256:<64hex> blob id), never raw data; '' clears */if(e.avatar!==undefined&&picRef(e.avatar))Pf.avatar=e.avatar;if(e.banner!==undefined&&picRef(e.banner))Pf.banner=e.banner;ok[e.id]=true;return}
    if(e.t==='profile.settings'){if(typeof e.autoLogin==='boolean')Pf.autoLogin=e.autoLogin;ok[e.id]=true;return}
    /* sessions (RLINK reads device + seq): session.start by the device itself; session.end by any enrolled device of the profile (log out this / others / all) */
    if(e.t==='session.start'){if(role!=='device'&&role!=='owner'){why[e.id]='session.start must be signed by the device';return}var s0=Pf.sessions[pub];
     if(s0&&s0.seq>=(e.session_seq|0)){why[e.id]='replayed session (seq not increasing)';return}Pf.sessions[pub]={device:pub,seq:e.session_seq|0,start:ts,end:null,by:null};ok[e.id]=true;return}
    if(e.t==='session.end'){var s1=Pf.sessions[e.device];if(!s1){why[e.id]='no session for that device';return}if((e.session_seq|0)!==s1.seq){why[e.id]='session.end for a stale session';return}
     if(!s1.end){s1.end=ts;s1.by=pub}ok[e.id]=true;return}
    var ss=Pf.sessions[pub];if(role!=='owner'&&ss&&ss.end&&ts>=ss.end){why[e.id]='session ended (device logged out)';return}
    ok[e.id]=true}})});
   return chain.then(function(){Object.keys(auth).forEach(function(k){if(!ok[k])delete auth[k]});return{ok:ok,why:why,state:{profiles:prof,authority:auth,ownerKeys:OK.map(function(k){return{id:k.id,pub:k.pub}})}}})}}}
 /* new-device request: {t:'device.request', device, nonce, req_ts, req_sig, device_name} — shown as short code + QR; it is NOT an entry */
 function enrollRequest(signer,name){var a=new Uint8Array(12);C.getRandomValues(a);var nonce=b64e(a).replace(/[+/=]/g,''),ts=new Date().toISOString();
  return Promise.resolve(signer.sign(enrollRequestMsg(signer.pub,nonce,ts))).then(function(sig){return{t:'device.request',device:signer.pub,nonce:nonce,req_ts:ts,req_sig:sig,device_name:name||'device'}})}
 function shortCode(req){return sha(req.device+'\n'+req.nonce).then(function(h){var n=parseInt(h.slice(0,10),16)%1e8;n=('0000000'+n).slice(-8);return n.slice(0,4)+'-'+n.slice(4)})}
 function approveEntry(req,profile,ts){ts=ts||new Date().toISOString();return{id:'enroll-'+req.nonce+'-'+Date.parse(ts).toString(36),t:'device.enroll',profile:profile,device:req.device,nonce:req.nonce,req_ts:req.req_ts,req_sig:req.req_sig,device_name:req.device_name,ts:ts||new Date().toISOString()}}

 /* ---- username + password login for profiles NOT on auto-login ----
    The password is never stored or synced. PBKDF2-SHA256 (per-profile random salt) derives an AES-GCM key that wraps the device's PKCS#8 private key.
    Only {kdf, iter, salt, iv, wrapped, pub} is stored (locally). Works offline. */
 var PW_ITER=310000;
 function u8(b){return new Uint8Array(b)}
 /* PBKDF2-SHA256 -> 64 bytes: [0..32) AES-GCM wrapping key, [32..64) password VERIFIER (KDF output, never the password or a plain hash of it) */
 function pwDerive(pass,salt,iter){return subtle.importKey('raw',enc(pass),'PBKDF2',false,['deriveBits']).then(function(k){return subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:salt,iterations:iter},k,512)}).then(function(bits){bits=new Uint8Array(bits);
   return subtle.importKey('raw',bits.slice(0,32),{name:'AES-GCM'},false,['encrypt','decrypt']).then(function(ak){return{key:ak,verifier:b64e(bits.slice(32))}})})}
 function passwordWrap(pass,opt){opt=opt||{};if(!pass||String(pass).length<8)return Promise.reject(Error('password must be at least 8 characters'));var iter=opt.iter||PW_ITER,salt=u8(16),iv=u8(12);C.getRandomValues(salt);C.getRandomValues(iv);
  return subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']).then(function(kp){return Promise.all([subtle.exportKey('pkcs8',kp.privateKey),subtle.exportKey('raw',kp.publicKey),pwDerive(pass,salt,iter)]).then(function(a){
   return subtle.encrypt({name:'AES-GCM',iv:iv},a[2].key,a[0]).then(function(ct){var rec={kdf:'PBKDF2-SHA256',iter:iter,salt:b64e(salt),iv:b64e(iv),wrapped:b64e(ct),verifier:a[2].verifier,pub:b64e(a[1])};return passwordUnwrap(rec,pass).then(function(sg){return{rec:rec,signer:sg}})})})})}
 function passwordUnwrap(rec,pass){var BAD=Error('wrong username or password');return pwDerive(pass,b64d(rec.salt),rec.iter).then(function(d){if(rec.verifier&&d.verifier!==rec.verifier)throw BAD;return subtle.decrypt({name:'AES-GCM',iv:b64d(rec.iv)},d.key,b64d(rec.wrapped))}).then(function(pk){
   return Promise.all([subtle.importKey('pkcs8',pk,{name:'ECDSA',namedCurve:'P-256'},false,['sign']),subtle.importKey('raw',b64d(rec.pub),{name:'ECDSA',namedCurve:'P-256'},true,['verify'])])}).then(function(a){return deviceSigner({privateKey:a[0],publicKey:a[1]})},function(){throw BAD})}
 /* ЯCASKET package: a signed JSON bundle for ЯCASKET to seal (profile card, ThundR cryptobot ref, salt+params+wrapped key+verifier, devices/sessions).
    The chain gets ONLY a commitment = sha256(canon(sealed package)) + version — never the verifier or anything derived from the password alone. */
 var PKG_V='rcasket-package-v1';
 function casketPackage(o,signer){var pkg={t:PKG_V,v:1,created:o.ts||new Date().toISOString(),profile:o.profile,card:o.card||{},cryptobot:o.cryptobot||{ref:'thundr.cryptobot',status:'PENDING'},login:o.login?{kdf:o.login.kdf,iter:o.login.iter,salt:o.login.salt,iv:o.login.iv,wrapped:o.login.wrapped,verifier:o.login.verifier,pub:o.login.pub}:null,
   rid:o.rid||null,userId:o.userId||null,tag:o.tag||null,binding:o.binding||null,
   devices:o.devices||{},sessions:o.sessions||{},profile0PublicKey:o.root||'PENDING (ЯCASKET)',rootStatus:o.root?'configured':'PENDING - RKEY profile 0 (ЯCASKET, Rizal\'s device); bots never create or hold it'};
  return seal(Object.assign({id:'pkg-'+(o.profile||'x')+'-'+Date.now().toString(36)},pkg),signer)}
 function packageCommitment(sealed){return sha(canon(sealed)).then(function(h){return{t:'rcasket.commit',version:PKG_V,profile:sealed.profile,sha256:h}})}
 function verifyPackage(sealed,commit){return check(sealed).then(function(c){if(!c.ok)return{ok:false,why:'package signature/integrity: '+(c.reason||c.why)};return packageCommitment(sealed).then(function(m){return m.sha256===commit.sha256&&m.version===commit.version?{ok:true}:{ok:false,why:'package does not match chain commitment'}})})}
 /* TEST ledger only (in memory / localStorage). Real Ghost Chain write waits on Rizal's go. */
 function testLedger(store){var L=store||[];return{TEST:true,name:'test-ledger',write:function(c){var e=Object.assign({h:L.length},c,{ts:new Date().toISOString()});L.push(e);return Promise.resolve(e)},find:function(profile){return Promise.resolve(L.filter(function(e){return e.profile===profile}).pop()||null)},all:function(){return L.slice()}}}
 /* attempt limiter: 5 free tries, then 30s lockout doubling per further failure (state is a plain object you persist) */
 function rateLimit(st,now){st=st||{fails:0,until:0};now=now||Date.now();return{wait:function(){return Math.max(0,(st.until||0)-now)},fail:function(){st.fails=(st.fails|0)+1;if(st.fails>=5)st.until=now+30000*Math.pow(2,st.fails-5);return st},ok:function(){st.fails=0;st.until=0;return st},state:st}}
 /* ЯCASKET challenge: sign a one-time nonce with the ЯID key. adapter = native ЯCASKET hook {challenge(nonce)->{pub,sig}} if present, else the given signer (WebAuthn-gated device key) */
 function cosign(sealed,signer){return Promise.resolve(signer.sign(sealed.rgen.msg)).then(function(v){return Object.assign({},sealed,{cosig:{pub:signer.pub,value:v}})})}
 function authorityOf(state,id){return state&&state.authority&&state.authority[id]||'device'}
 function casketChallenge(signer,adapter){var a=u8(24);C.getRandomValues(a);var nonce='rcasket-login-v1\n'+b64e(a)+'\n'+new Date().toISOString();
  return Promise.resolve(adapter&&adapter.challenge?adapter.challenge(nonce):Promise.resolve(signer.sign(nonce)).then(function(sig){return{pub:signer.pub,sig:sig}}))
   .then(function(r){return verifySig(nonce,r.sig,r.pub).then(function(v){if(!v)throw Error('ЯCASKET challenge failed');return{nonce:nonce,pub:r.pub,sig:r.sig}})})}
 /* public-only ЯCASKET-referenced record (login + CryptoSocial profile card + ThundR cryptobot). root is a config value, PENDING Rizal's decision. */
 function casketItem(pf,devPub,root){return{t:'rcasket.ref',v:1,items:['login','cryptosocial.profile','thundr.cryptobot'],profile:pf.id,handle:pf.handle,name:pf.name,device:devPub,autoLogin:pf.autoLogin!==false,
  profile0PublicKey:root||'PENDING (ЯCASKET)',rootStatus:root?'configured':'PENDING - RKEY profile 0 is generated by ЯCASKET on Rizal\'s device; set RDRAGON_CONFIG.profile0PublicKey',walletLink:'PENDING - browser profile <-> RLogin wallet identity link is open'}}
 /* ---- RGENERATOR via RKRYPT (fused rkrypt.rzl.js 0.1.0-fused-20261025: RKRYPT 0.1.0 + RGENERATOR egg5 mint.js/rkey0.js, built in as RKRYPT.rgen).
    rsync entries are RGENERATOR record seals (scope yaseed.mint, msg yaseed-artifact-v1\nyaseed.mint\n<cid>); "RGEN verify" checks every entry,
    and RGEN.fused() runs RKRYPT.rgen.verify() (re-hashes the embedded signed egg5 sources). The fused file ships inside the app, pinned below. */
 function rkryptLib(){var g=typeof self!=='undefined'?self:typeof globalThis!=='undefined'?globalThis:{};if(g.RKRYPT)return g.RKRYPT;
  if(typeof module==='object'&&module.exports&&typeof require==='function'){try{return require('./rkrypt.rzl.js')}catch(e){}}return null}
 var RGEN={egg:'rkrypt.rzl.js',version:'rkrypt.rzl 0.1.0-fused-20261025',base:'RGENERATOR egg5 (Ghost Chain seq 258) + RKRYPT 0.1.0',latest:true,replaces:'RGENERATOR-2.1.9-egg4.rzl',
  commands:['RGEN','RGEN verify','rkrypt status','rkrypt help'],
  pin:{'rkrypt.rzl.js':'dd5d306f6fc80740eaf9cdaac809a562e6c445742ef696120f08e3bb88936730'},
  identity:{name:'RKEY profile 0',role:'source-origin profile id for the whole system; signs login nonces',holder:'ЯCASKET on Rizal\'s device (bots never create or hold it)'},
  rkrypt:rkryptLib,
  fused:function(){var K=rkryptLib();if(!K||!K.rgen)return Promise.resolve({ok:false,text:'RKRYPT not loaded'});return K.rgen.verify()},
  verify:function(list){list=list||[];return Promise.all(list.map(function(e){return check(e).then(function(c){return{id:e&&e.id,ok:!!c.ok,why:c.reason||c.why||null}})})).then(function(r){var bad=r.filter(function(x){return!x.ok});return{cmd:'RGEN verify',egg:RGEN.version,total:r.length,ok:r.length-bad.length,bad:bad}})},
  profile0:function(cfgKey){return{name:'RKEY profile 0',publicKey:cfgKey||'PENDING (ЯCASKET)',status:cfgKey?'configured':'PENDING'}}};

 /* ---- password login -> per-device key (0.3.2). The founder/password key is the profile's genesis key (full power, unchanged);
    each device gets its OWN key, enrolled by a device.enroll signed by the founder key, and signs its own sessions.
    Session ids are unique per device: 'ss-'+sha256(device pub)[0:20]+'-'+seq. */
 function sessionId(pub,seq){return sha('rsync-session-v1\n'+pub).then(function(h){return'ss-'+h.slice(0,20)+'-'+(seq|0)})}
 function founderGenesis(pkg){return{id:'pc-'+pkg.profile,t:'profile.create',profile:pkg.profile,handle:pkg.card&&pkg.card.handle,name:pkg.card&&pkg.card.name,rid:pkg.rid||null,device_name:'founder key',ts:pkg.created}}
 function passwordDeviceLogin(R,founder,o){o=o||{};var pid=o.profile;
  return R.ready.then(function(){var S=R.state()&&R.state().profiles||{};
   if(S[pid]||!o.pkg)return null;return profileIdFor(founder.pub).then(function(id){if(id!==pid)return null;return R.append(founderGenesis(o.pkg),founder)})})
  .then(function(){return o.device?Promise.resolve(o.device):deviceSigner()}).then(function(dev){var S=R.state()&&R.state().profiles||{},Pf=S[pid];
   if(!Pf)throw Error('profile not in the local replica yet - sync or restore the package');
   var d=Pf.devices[dev.pub];if(d&&!d.revoked)return{device:dev,enrolled:'existing'};
   if(d&&d.revoked)return deviceSigner().then(function(nd){return passwordDeviceLogin(R,founder,Object.assign({},o,{device:nd}))});
   return enrollRequest(dev,o.name||'device').then(function(req){return R.append(approveEntry(req,pid),founder)}).then(function(r){
    if(!r.added.length)throw Error('device enrollment rejected: '+(r.rejected[0]&&r.rejected[0].reason));return{device:dev,enrolled:'new'}})})}
 /* in-process link for tests/simulation: link(a,b) syncs two replicas both ways */
 function sync(a,b){return a.merge(b.missingFor(a.heads()),'peer').then(function(r1){return b.merge(a.missingFor(b.heads()),'peer').then(function(r2){return{aGot:r1,bGot:r2}})})}
 return{VERSION:VERSION,RGEN:RGEN,sessionId:sessionId,founderGenesis:founderGenesis,passwordDeviceLogin:passwordDeviceLogin,cosign:cosign,authorityOf:authorityOf,SCOPE:SCOPE,canon:canon,cidOf:cidOf,check:check,seal:seal,verifySig:verifySig,deviceSigner:deviceSigner,create:create,sync:sync,syncer:syncer,devicePolicy:devicePolicy,enrollRequest:enrollRequest,enrollRequestMsg:enrollRequestMsg,profileIdFor:profileIdFor,shortCode:shortCode,approveEntry:approveEntry,passwordWrap:passwordWrap,passwordUnwrap:passwordUnwrap,rateLimit:rateLimit,casketChallenge:casketChallenge,casketItem:casketItem,casketPackage:casketPackage,packageCommitment:packageCommitment,verifyPackage:verifyPackage,testLedger:testLedger,
  adapters:{memoryStorage:memoryStorage,localStorage:localStorageAdapter,broadcast:broadcastTransport,httpPeer:httpPeer}}});
