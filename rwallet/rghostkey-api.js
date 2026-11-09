/* rghostkey-api 1.0 · RWALLET 0.1.4 · 20261109 (Rizal t66u: "same functions across all devices") · ADD-ONLY.
 * window.RGHOSTKEY = the ONE rghostkey interface, same names as native/RGhostkeyAPI.swift (WK "rghostkey") and
 * native/android/RGhostkeyApi.java (JS interface "RGhostkeyNative"):
 *   status() · methods() · unlock(method) · sign(entry, method, password) · approve(requestId, entry, method, password) · logout()
 *   plus the shared wallet functions: session.start/logout · revoke · cast.receive/dismiss · nonce.offline · lockout().
 * HARD devices (Neo / 17e / moto) sign with their OWN pinned key after ONE unlock on that device. The web (rizal.pw / rizal.info),
 * RVM, TERAFORMR and ThundR are SOFT: sign/approve there only QUEUE a request (POST /rmint/request) that is cast to the hard devices.
 * Never signs by itself, never holds a key or password (the password is passed straight through and dropped), no timer, no auto-approve. */
(function(w){"use strict";if(w.RGHOSTKEY)return;
var V="1.0";
function wk(){var m=w.webkit&&w.webkit.messageHandlers&&w.webkit.messageHandlers.rghostkey;return m&&m.postMessage?m:null}
function an(){var a=w.RGhostkeyNative;return a&&a.status?a:null}
function J(r){try{return typeof r==="string"?JSON.parse(r):r}catch(e){return{ok:false,err:"bad native reply"}}}
function hasNative(){return!!(wk()||an())}
function platform(){return wk()?"apple":an()?"android":"web"}
function status(){if(wk())return wk().postMessage({op:"status"}).then(J);if(an())return Promise.resolve(J(an().status()));
  return Promise.resolve({ok:true,api:"rghostkey-api "+V,platform:"web",has_key:false,pinned:false,tier:"soft",methods:[],can_sign:false,
    note:"soft: requests are sent to your hard devices (Neo / 17e / moto)"})}
function methods(){if(wk())return wk().postMessage({op:"methods"}).then(J).then(function(r){return(r&&r.methods)||[]},function(){return[]});
  if(an())return Promise.resolve((J(an().methods()).methods)||[]);return Promise.resolve([])}
function unlock(m){if(wk())return wk().postMessage({op:"unlock",method:m}).then(J);if(an())return Promise.resolve(J(an().unlock(String(m))));
  return Promise.resolve({ok:false,err:"soft device: no unlock here; approve on a hard device"})}
var seq=0;function andCall(fn,args){return new Promise(function(res){var id="__rgk_"+(++seq)+"_"+Date.now();
  w[id]=function(r){delete w[id];res(J(r))};args.push(id);try{an()[fn].apply(an(),args)}catch(e){delete w[id];res({ok:false,err:String(e)})}})}
function T(){return w.RMINT_TRANSPORT}function S(){return w.RMINT_SESSION}
function request(entry,requestId){   /* soft path: queue only */
  if(!T())return Promise.resolve({ok:false,err:"no transport"});
  return Promise.resolve(S()&&S().token()).then(function(t){var b={device_id:S()?S().deviceId():"",session_token:t||"",request:Object.assign({kind:(entry&&entry.purpose)==="rghostkey.bind"?"bind":"request"},entry||{})};
    if(requestId)b.request.request_id=requestId;return T().call("/rmint/request","POST",b,{queue:true,kind:"request"})}).then(function(r){
    if(r)r.sent_to="your hard devices (Neo / 17e / moto)";return r})}
function sign(entry,method,pw){var p=pw;pw=null;
  if(wk())return wk().postMessage({op:"sign",method:method,entry:entry,assm_password:method==="assm"?(p||""):undefined}).then(J,function(e){return{ok:false,err:String(e)}});
  if(an())return andCall("sign",[JSON.stringify(entry),String(method)]);
  return request(entry)}
function approve(id,entry,method,pw){var p=pw;pw=null;
  if(wk())return wk().postMessage({op:"approve",request_id:id,method:method,entry:entry,assm_password:method==="assm"?(p||""):undefined}).then(J,function(e){return{ok:false,err:String(e)}});
  if(an())return andCall("approve",[String(id),JSON.stringify(entry),String(method)]);
  return request(entry,id)}
function logout(){var n=wk()?wk().postMessage({op:"logout"}).then(J):an()?Promise.resolve(J(an().logout())):Promise.resolve({ok:true,native_session:false});
  return n.then(function(r){return S()&&S().logout?Promise.resolve(S().logout()).then(function(x){r.session=x;return r}):r})}
w.RGHOSTKEY={version:V,api:"rghostkey-api "+V,hasNative:hasNative,platform:platform,
  status:status,methods:methods,unlock:unlock,sign:sign,approve:approve,logout:logout,
  session:{start:function(u,p){return S()?S().login(u,p):Promise.resolve({ok:false,err:"rmint-session.js not loaded"})},logout:logout},
  revoke:function(d){return S()&&S().revoke?S().revoke(d):Promise.resolve({ok:false,err:"rmint-session.js not loaded"})},
  cast:{receive:function(){return w.RMINT_CAST?w.RMINT_CAST.poll():Promise.resolve()},dismiss:function(id){return w.RMINT_CAST?w.RMINT_CAST.dismiss(id):Promise.resolve()},
        cards:function(){return w.RMINT_CAST?w.RMINT_CAST.cards():[]}},
  nonce:{offline:function(){return w.RMINT_GATE&&w.RMINT_GATE.pool?w.RMINT_GATE.pool():null},refill:function(){return w.RMINT_GATE&&w.RMINT_GATE.refill?w.RMINT_GATE.refill():Promise.resolve()}},
  lockout:function(){return T()?T().call("/rmint/gate/status","GET"):Promise.resolve({ok:false})},
  creates_keys:false,auto_sign:false};
})(typeof window!=="undefined"?window:globalThis);
