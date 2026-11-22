/* rmint-session 1.0 · 20261108-rwallet (t35u) · persistent, device-bound ASSM session: stays signed in until Rizal logs out or the
 * device leaves trusted_devices.json. Storage, best available: native Keychain (iOS/macOS, ThisDeviceOnly) via
 * webkit.messageHandlers.rsession · Android Keystore-wrapped token via window.RSessionNative · web: a non-extractable AES-GCM
 * CryptoKey in IndexedDB wraps the token (never plain localStorage). The ASSM password is used once for login and never stored.
 * Offline login: the device-side ASSM check sets a local "pending server session" that is completed when any link appears. */
(function(w){"use strict";
var DB="rmint.session.v1",ST="kv",PK="rmint.session.pending.v1";
function T(){return w.RMINT_TRANSPORT}
function nat(){var mh=w.webkit&&w.webkit.messageHandlers&&w.webkit.messageHandlers.rsession;
  if(mh&&mh.postMessage)return{kind:"keychain",get:function(){return mh.postMessage({op:"get"}).then(function(r){return r||null})},put:function(t){return mh.postMessage({op:"put",token:t})},del:function(){return mh.postMessage({op:"del"})}};
  var a=w.RSessionNative;if(a&&a.get)return{kind:"keystore",get:function(){return Promise.resolve(a.get()||null)},put:function(t){return Promise.resolve(a.put(t))},del:function(){return Promise.resolve(a.del())}};
  return null}
function idb(){return new Promise(function(res,rej){if(!w.indexedDB)return rej(new Error("no indexedDB"));var r=w.indexedDB.open(DB,1);r.onupgradeneeded=function(){r.result.createObjectStore(ST)};r.onsuccess=function(){res(r.result)};r.onerror=function(){rej(r.error)}})}
function iget(k){return idb().then(function(d){return new Promise(function(res){var q=d.transaction(ST).objectStore(ST).get(k);q.onsuccess=function(){res(q.result||null)};q.onerror=function(){res(null)}})})}
function iput(k,v){return idb().then(function(d){return new Promise(function(res){var t=d.transaction(ST,"readwrite");t.objectStore(ST).put(v,k);t.oncomplete=function(){res(true)};t.onerror=function(){res(false)}})})}
function idel(k){return idb().then(function(d){return new Promise(function(res){var t=d.transaction(ST,"readwrite");t.objectStore(ST).delete(k);t.oncomplete=function(){res(true)}})})}
var web={kind:"webcrypto-idb",
  put:function(tok){var S=w.crypto&&w.crypto.subtle;if(!S)return Promise.reject(new Error("no WebCrypto"));
    return S.generateKey({name:"AES-GCM",length:256},false,["encrypt","decrypt"]).then(function(k){var iv=w.crypto.getRandomValues(new Uint8Array(12));
     return S.encrypt({name:"AES-GCM",iv:iv},k,new TextEncoder().encode(tok)).then(function(ct){return iput("s",{k:k,iv:iv,ct:ct})})})},
  get:function(){return iget("s").then(function(v){if(!v)return null;return w.crypto.subtle.decrypt({name:"AES-GCM",iv:v.iv},v.k,v.ct).then(function(p){return new TextDecoder().decode(p)},function(){return null})}).catch(function(){return null})},
  del:function(){return idel("s").catch(function(){})}};
function store(){return nat()||web}
var meta=null;try{meta=JSON.parse(w.localStorage.getItem("rmint.session.meta.v1")||"null")}catch(e){} // public info only: device, user, since
function setMeta(m){meta=m;try{m?w.localStorage.setItem("rmint.session.meta.v1",JSON.stringify(m)):w.localStorage.removeItem("rmint.session.meta.v1")}catch(e){}}
function deviceId(){return(w.RMINT_DEVICE_ID)||(w.RMINT_ONETAP&&w.RMINT_ONETAP.node)||"neo"}
/* login({user,password}) or login({user,localOk:true}) when the app already verified ASSM on-device (offline). */
function login(o){o=o||{};var body={device_id:deviceId(),assm_user:o.user};if(o.password)body.assm_password=o.password;else body.assm_local_ok=!!o.localOk;
  return T().call("/assm/session/start","POST",body).then(function(r){body.assm_password=undefined;
    if(r.net){ if(!o.localOk)return{ok:false,net:true,err:"offline: unlock ASSM on this device to sign in offline"};
      try{w.localStorage.setItem(PK,JSON.stringify({device_id:body.device_id,assm_user:o.user,t:Date.now()}))}catch(e){}
      setMeta({device_id:body.device_id,user:o.user,since:new Date().toISOString(),server:false,store:store().kind});return{ok:true,offline:true,pending_server:true}}
    if(!r.ok)return r;return store().put(r.session_token).then(function(){setMeta({device_id:r.device_id,user:o.user,since:new Date().toISOString(),server:true,store:store().kind,assm_verified_server:r.assm_verified_server});
      try{w.localStorage.removeItem(PK)}catch(e){}emit("rmint:session",{signed_in:true});return{ok:true,device_id:r.device_id,persistent:true}})})}
function token(){return store().get()}
function logout(){return token().then(function(t){var done=function(){return store().del().then(function(){setMeta(null);emit("rmint:session",{signed_in:false});return{ok:true,logged_out:true}})};
  if(!t)return done();return T().call("/assm/logout","POST",{session_token:t},{queue:true,kind:"logout"}).then(done)})} // offline: local token gone now, server revoke queued
function revoke(device){return T().call("/assm/revoke","POST",{device_id:device},{queue:true,kind:"revoke"})}
function completePending(){var p=null;try{p=JSON.parse(w.localStorage.getItem(PK)||"null")}catch(e){}if(!p)return Promise.resolve(null);
  return T().call("/assm/session/start","POST",{device_id:p.device_id,assm_user:p.assm_user,assm_local_ok:true}).then(function(r){if(r.ok)return store().put(r.session_token).then(function(){try{w.localStorage.removeItem(PK)}catch(e){}setMeta(Object.assign({},meta||{},{server:true}));return r});return r})}
function info(){return meta?Object.assign({signed_in:true},meta):{signed_in:false}}
function emit(n,d){try{w.dispatchEvent(new CustomEvent(n,{detail:d}))}catch(e){}}
if(w.addEventListener)w.addEventListener("rmint:link",function(e){if(e.detail&&e.detail.link!=="offline")completePending()});
w.RMINT_SESSION={version:"1.0",login:login,logout:logout,revoke:revoke,token:token,info:info,store:function(){return store().kind},completePending:completePending,deviceId:deviceId};
})(typeof window!=="undefined"?window:globalThis);
