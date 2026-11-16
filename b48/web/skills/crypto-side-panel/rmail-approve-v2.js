/* rmail-approve-v2.js 1.1 · 20261111-rbowzr · RENDERER ONLY for the canonical card format in
 * SCROLLS/RMAIL-APPROVE-DENY-SPEC-20261111.md (rmail.approve v2 request + rmail.decision v1 reply). Format is not defined here.
 * Buttons ONLY for a valid v2 card: approve.v==2, notice.status pending, signed:false, no secret-like field, <= 4 KB,
 * rwallet:// open link only, not expired, not v1, not block 4. Everything else → caller renders plain text.
 *   Approve → decision "approve" written first, then opens rwallet://approve… (ASSM ЯWALLET Face ID). Never signs.
 *   Deny    → decision "deny". First decision wins; a second returns "already-decided".
 * Decision = the BARE rmail.decision JSON object (whole file), written as RKLOWD nodes/<reply node>/inbox/rmail-dec-<req_id>.json:
 *   iOS WK  : webkit.messageHandlers.rmailDecision.postMessage({op:"write"|"open",...}) → window.RMAIL_DECISION_RESULT(r)
 *   Android : window.RMailNative.writeDecision(json) / .open(url)
 *   no bridge: kept in localStorage "rmail.decisions.pending" (nothing lost, nothing signed).
 * by = @chaserizal/<seat> (host sets window.RMAIL_SEAT). Agents never decide. No keys, no secrets. */
(function(w){"use strict";if(w.RMAIL_APPROVE2)return;
var KINDS={mint:1,sign:1,send:1},OWNER="@chaserizal",MAX=4096;
var SECRET=/(priv|secret|password|passwd|mnemonic|seed|recovery|token|apikey|api_key|credential|signature|^sig$|^key$|xprv|keystore)/i;
function J(k,d){try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}}function W(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function E(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return"&#"+c.charCodeAt(0)+";"})}
function A(c){return c&&c.approve&&typeof c.approve==="object"&&c.approve.v===2?c.approve:null}
function secretish(o,d){d=d||0;if(d>8)return true;if(Array.isArray(o))return o.some(function(v){return secretish(v,d+1)});
  if(o&&typeof o==="object")return Object.keys(o).some(function(k){return SECRET.test(k)||secretish(o[k],d+1)});
  if(typeof o==="string")return /PRIVATE KEY|BEGIN [A-Z ]*KEY/.test(o);return false}
function bytes(o){try{return unescape(encodeURIComponent(JSON.stringify(o))).length}catch(e){return MAX+1}}
function approveBtn(a){return (a.buttons||[]).filter(function(x){return x&&x.id==="approve"})[0]}
function valid(c){var a=A(c);if(!a)return"v1";var n=c.notice||{};
  if(/^block4-(mint|confirmed)-/.test(String(c.id||"")))return"block4";
  if(c.signed!==false)return"not unsigned";if(bytes({id:c.id,signed:c.signed,notice:c.notice,approve:a,subject:c.subject,body:c.body})>MAX||String(c.text||"").length>4000)return"over 4 KB";if(secretish(c))return"secret-like content";
  if(!KINDS[a.kind])return"bad kind";if(!/^[0-9a-f]{16}$/.test(String(a.nonce||"")))return"bad nonce";
  if(!a.req_id||a.req_id!==n.req_id)return"req_id mismatch";
  var b=approveBtn(a);if(!b||!/^rwallet:\/\/approve\?/.test(String(b.open||"")))return"approve link is not rwallet://";
  if((a.buttons||[]).some(function(x){return x&&x.open&&!/^rwallet:\/\//.test(String(x.open))}))return"non-rwallet link";
  return null}
function isV2(c){return valid(c)===null||!!decided(c)}
function decided(c){var a=A(c);return a?J("rmail.decided",{})[a.req_id]||null:null}
function state(c){var a=A(c);if(!a)return"v1";var d=decided(c);if(d)return"decided:"+d.decision;
  var v=valid(c);if(v)return"invalid:"+v;if((c.notice||{}).status!=="pending")return"closed";
  if(Date.now()>=Number(a.expires||((c.ts||0)+864e5)))return"expired";return"pending"}
function nodeDir(a){var n=String((a.reply&&a.reply.node)||"rklowd.rvm").replace(/^rklowd\./,"").replace(/[^A-Za-z0-9_-]/g,"");return n||"rvm"}
function seat(){if(w.RMAIL_SEAT)return String(w.RMAIL_SEAT);return OWNER+"/"+(w.RMailNative?"moto":"17e")}
function make(c,decision){var a=A(c);return{schema:"rmail.decision",v:1,id:"dec-"+a.req_id,ref:c.id,req_id:a.req_id,nonce:a.nonce,
  decision:decision,ts:Date.now(),by:seat(),app:(a.reply&&a.reply.app)||a.app,to_node:(a.reply&&a.reply.node)||"rklowd.rvm",signed:false}}
function wk(){var m=w.webkit&&w.webkit.messageHandlers&&w.webkit.messageHandlers.rmailDecision;return m&&m.postMessage?m:null}
function an(){var a=w.RMailNative;return a&&a.writeDecision?a:null}
var waiters={};w.RMAIL_DECISION_RESULT=function(r){var f=r&&waiters[r.id];if(f){delete waiters[r.id];f(r)}};
function write(dec,dir){var rel="ЯLAB/RKLOWD/nodes/"+dir+"/inbox/rmail-dec-"+dec.req_id+".json";
  if(wk())return new Promise(function(res){waiters[dec.id]=res;wk().postMessage({op:"write",id:dec.id,node:dir,decision:dec});
    setTimeout(function(){if(waiters[dec.id]){delete waiters[dec.id];res({id:dec.id,ok:false,err:"no reply from host"})}},8000)});
  if(an()){try{return Promise.resolve(JSON.parse(an().writeDecision(JSON.stringify({node:dir,decision:dec}))))}catch(e){return Promise.resolve({ok:false,err:"android bridge"})}}
  var q=J("rmail.decisions.pending",[]);q.push({rel:rel,decision:dec});W("rmail.decisions.pending",q);return Promise.resolve({ok:true,queued:true,rel:rel})}
function openApprove(url){if(!/^rwallet:\/\/approve\?/.test(String(url||"")))return false;
  if(wk()){wk().postMessage({op:"open",url:url});return true}if(an()&&an().open){an().open(url);return true}
  try{w.location.href=url;return true}catch(e){return false}}
function decide(c,decision){var a=A(c);if(!a)return Promise.resolve({ok:false,err:"not v2"});
  if(decision!=="approve"&&decision!=="deny")return Promise.resolve({ok:false,err:"bad decision"});
  if(decided(c))return Promise.resolve({ok:false,err:"already-decided"});
  var st=state(c);if(st!=="pending")return Promise.resolve({ok:false,err:st});
  if(seat().indexOf(OWNER+"/")!==0)return Promise.resolve({ok:false,err:"only Rizal's seat decides"});
  var dec=make(c,decision);if(bytes(dec)>MAX)return Promise.resolve({ok:false,err:"over 4 KB"});
  var m=J("rmail.decided",{});m[a.req_id]={decision:decision,at:dec.ts,id:dec.id};W("rmail.decided",m);
  var ap=J("rmail.approved",{});ap[c.id]={at:dec.ts,kind:a.kind,decision:decision};W("rmail.approved",ap); /* clears the tiny unread badge */
  return write(dec,nodeDir(a)).then(function(r){r=r||{};r.decision=dec;if(decision==="approve")r.opened=openApprove(approveBtn(a).open);return r})}
function html(c){var a=A(c);if(!a)return"";var st=state(c);if(st.indexOf("invalid:")===0)return"";
  var head='<div class="ra2"><p class="ra2-s"><span class="rmu-v ok">'+E(String(a.kind).toUpperCase())+'</span> <span class="rmu-v no">'+E(a.app||"app")+'</span> '+E(String(a.summary||"").slice(0,300))+'</p>';
  if(st==="pending")return head+'<div class="rmu-approve"><button class="rmu-btn go" data-ra2="approve">Approve</button> <button class="rmu-btn p" data-ra2="deny">Deny</button><span class="rmu-st" id="ra2-st">Approve opens ASSM ЯWALLET Face ID only. Nothing is signed here.</span></div></div>';
  if(st==="decided:deny")return head+'<p class="rmu-st">Denied: nothing signed</p></div>';
  if(st==="decided:approve")return head+'<p class="rmu-st">Approved: waiting for Face ID in ЯWALLET</p></div>';
  if(st==="expired")return head+'<p class="rmu-st">Expired: nothing signed</p></div>';
  return head+'<p class="rmu-st">Closed: nothing signed</p></div>'}
function bind(root,c,done){if(!root)return;[].slice.call(root.querySelectorAll("[data-ra2]")).forEach(function(b){b.addEventListener("click",function(e){e.preventDefault();e.stopPropagation();
  [].slice.call(root.querySelectorAll("[data-ra2]")).forEach(function(x){x.disabled=true});var s=root.querySelector("#ra2-st"),k=b.getAttribute("data-ra2");
  decide(c,k).then(function(r){if(s)s.textContent=r.ok?(k==="deny"?"Denied: nothing signed":"Approved: waiting for Face ID"):(r.err==="already-decided"?"Already decided":"Not sent: "+r.err);if(done)done(r)})},true)})}
w.RMAIL_APPROVE2={v:"1.1",valid:valid,isV2:isV2,state:state,html:html,bind:bind,decide:decide,seat:seat};
})(window);
