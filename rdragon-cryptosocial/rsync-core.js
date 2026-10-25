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
 var VERSION='0.1.0',SCOPE='yaseed.mint',PREFIX='yaseed-artifact-v1\n'+SCOPE+'\n';
 var LOCAL=['seq','prev','hash','cid','rgen','_src','_rx'];
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
 function create(opt){opt=opt||{};var policy=Object.assign({allowUnsigned:false},opt.policy||{});var M={},list=[],subs=[],tps=[],q=Promise.resolve(),ready;
  function put(e,cid,src){var o=Object.assign({},e);o.cid=cid;delete o._src;M[o.id]=o;list.push(o);list.sort(order);if(src)Object.defineProperty(o,'_src',{value:src,enumerable:false,writable:true})}
  function ingest(arr,src,trusted){var added=[],rejected=[];arr=Array.isArray(arr)?arr:[];
   return arr.reduce(function(p,e){return p.then(function(){return check(e).then(function(r){if(!r.ok){rejected.push({id:e&&e.id,reason:r.reason,from:src});return}
     if(!r.signed&&!(trusted||policy.allowUnsigned)){rejected.push({id:e.id,reason:'unsigned',from:src});return}
     var have=M[e.id];if(have){if(have.cid!==r.cid)rejected.push({id:e.id,reason:'equivocation (same id, different content)',from:src});return}
     if(policy.accept&&!policy.accept(e)){rejected.push({id:e.id,reason:'policy',from:src});return}
     put(e,r.cid,src);added.push(M[e.id])})})},Promise.resolve()).then(function(){var res={added:added,rejected:rejected};
     function note(){if(added.length||rejected.length)subs.forEach(function(f){try{f(res)}catch(x){}});return res}
     if(added.length&&opt.storage&&src!=='storage')return Promise.resolve(opt.storage.save(list.slice())).then(note);return note()})}
  function serial(fn){var r=q.then(fn);q=r.catch(function(){});return r}
  ready=Promise.resolve(opt.storage?opt.storage.load():[]).then(function(a){return ingest(a||[],'storage',true)});
  var R={VERSION:VERSION,ready:ready,
   entries:function(){return list.slice()},get:function(id){return M[id]||null},size:function(){return list.length},
   heads:function(){return list.map(function(e){return e.id+':'+e.cid})},
   digest:function(){return sha(list.map(function(e){return e.cid}).sort().join(''))},
   merge:function(arr,src){return serial(function(){return ready.then(function(){return ingest(arr,src||'peer',false)})})},
   append:function(e,signer){return serial(function(){return ready.then(function(){return(signer?seal(e,signer):Promise.resolve(e)).then(function(s){return ingest([s],'local',!signer).then(function(r){if(r.added.length)tps.forEach(function(t){if(t.send)try{t.send(r.added)}catch(x){}});return r})})})})},
   missingFor:function(theirIds){var h={};(theirIds||[]).forEach(function(x){h[x.split(':')[0]]=1});return list.filter(function(e){return!h[e.id]})},
   onChange:function(f){subs.push(f);return function(){subs=subs.filter(function(g){return g!==f})}},
   attach:function(t){tps.push(t);if(t.onEntries)t.onEntries(function(arr,src){R.merge(arr,src||t.name)});
    if(t.pull)return t.pull().then(function(a){return R.merge(a,t.name)}).then(function(r){if(t.push)return Promise.resolve(t.push(list.slice())).then(function(){return r});return r}).catch(function(x){return{added:[],rejected:[],error:String(x&&x.message||x)}});
    if(t.send)t.send(list.slice());return Promise.resolve({added:[],rejected:[]})},
   bundle:function(){return{format:'rsync.bundle.v1',version:VERSION,entries:list.slice()}},
   importBundle:function(b,src){if(!b||b.format!=='rsync.bundle.v1')return Promise.resolve({added:[],rejected:[{reason:'not an rsync bundle'}]});return R.merge(b.entries,src||'bundle')}};
  return R}
 /* ---- reference adapters (no network services are opened by this module) ---- */
 function memoryStorage(seed){var a=(seed||[]).slice();return{load:function(){return a.slice()},save:function(x){a=x.slice()},dump:function(){return a}}}
 function localStorageAdapter(key){return{load:function(){try{return JSON.parse(localStorage.getItem(key)||'[]')}catch(e){return[]}},save:function(a){try{localStorage.setItem(key,JSON.stringify(a))}catch(e){}}}}
 /* same-device tabs/webviews on one origin */
 function broadcastTransport(name){if(typeof BroadcastChannel==='undefined')return null;var ch=new BroadcastChannel(name||'rsync');var cb=null;
  ch.onmessage=function(m){if(cb&&m.data&&m.data.rsync===1)cb(m.data.entries,'tab')};return{name:'broadcast',send:function(e){ch.postMessage({rsync:1,entries:e})},onEntries:function(f){cb=f}}}
 /* any EXISTING peer that serves GET/POST {base}/api/rsync/entries (e.g. a ЯNETWORK node or DS-BRIDGE route, once Rizal turns it on). */
 function httpPeer(base,opt){opt=opt||{};var h={'Content-Type':'application/json'};if(opt.token)h.Authorization='Bearer '+opt.token;
  return{name:'http:'+base,pull:function(){return fetch(base+'/api/rsync/entries').then(function(r){if(!r.ok)throw Error('pull '+r.status);return r.json()}).then(function(j){return j.entries||j})},
   push:function(a){return fetch(base+'/api/rsync/entries',{method:'POST',headers:h,body:JSON.stringify({entries:a})}).then(function(r){return r.ok})},send:function(a){fetch(base+'/api/rsync/entries',{method:'POST',headers:h,body:JSON.stringify({entries:a})}).catch(function(){})}}}
 /* in-process link for tests/simulation: link(a,b) syncs two replicas both ways */
 function sync(a,b){return a.merge(b.missingFor(a.heads()),'peer').then(function(r1){return b.merge(a.missingFor(b.heads()),'peer').then(function(r2){return{aGot:r1,bGot:r2}})})}
 return{VERSION:VERSION,SCOPE:SCOPE,canon:canon,cidOf:cidOf,check:check,seal:seal,verifySig:verifySig,deviceSigner:deviceSigner,create:create,sync:sync,
  adapters:{memoryStorage:memoryStorage,localStorage:localStorageAdapter,broadcast:broadcastTransport,httpPeer:httpPeer}}});
