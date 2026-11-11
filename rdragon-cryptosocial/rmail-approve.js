/* rmail-approve.js v2 20261111 (RBATBOX) - rizal.pw renderer for RMAIL Approve / Deny cards.
   Follows MEKANICA's canonical spec SCROLLS/RMAIL-APPROVE-DENY-SPEC-20261111.md: request = rmail.v1 envelope + `approve`
   block v2 {kind mint|sign|send, summary, app, req_id, nonce, expires, buttons, reply}; answer = rmail.decision v1.
   - Approve: records the decision, sends rmail.decision {decision:"approve"} back, then opens ONLY ASSM ЯWALLET Face ID
     (window.RMAIL_APPROVE_FACEID if the host app set one, else the card's buttons[approve].open rwallet:// link).
     This file never signs, never mints, holds no key and puts no signature or txid in any card.
   - Deny: records the decision and sends rmail.decision {decision:"deny"} back. Nothing is signed.
   - v1 cards (no `approve` block), block 4 TerraformЯ cards, expired, signed or secret-bearing cards get no buttons.
   - A card is decided once; a second tap returns already-decided. */
(function(root){"use strict";
var KINDS=["mint","sign","send"],NEEDS="ASSM ЯWALLET Face ID",MAXRAW=4096,SEAT="@chaserizal/pw";
var SECRET_K=/(priv|secret|password|passwd|mnemonic|seed|recovery|token|apikey|api_key|credential|signature|^sig$|^key$|xprv|keystore)/i;
var PEM=/PRIVATE KEY|BEGIN [A-Z ]*KEY/;
function secretish(o,d){d=d||0;if(d>8)return true;
  if(Array.isArray(o))return o.some(function(v){return secretish(v,d+1)});
  if(o&&typeof o==="object")return Object.keys(o).some(function(k){return SECRET_K.test(k)||secretish(o[k],d+1)});
  return typeof o==="string"&&PEM.test(o)}
function isTF(m){return /^block4-(mint|confirmed)-/.test(String(m&&m.id||""))}
/* The v2 request carried by an RMAIL message, or null (v1 card / ordinary mail / block 4). */
function fromMessage(m){if(!m||typeof m!=="object"||isTF(m))return null;
  var a=m.approve;if(!a||typeof a!=="object"||Number(a.v)!==2)return null;
  var b=Array.isArray(a.buttons)?a.buttons:[],ab=b.filter(function(x){return x&&x.id==="approve"})[0]||{};
  return{v:2,ref:String(m.id||""),req_id:String(a.req_id||""),kind:String(a.kind||""),summary:String(a.summary||"").replace(/<[^>]*>/g,"").slice(0,300),
    app:String(a.app||""),nonce:String(a.nonce||""),expires:Number(a.expires)||(Number(m.ts)||0)+864e5,open:String(ab.open||""),
    reply:{node:String(a.reply&&a.reply.node||""),app:String(a.reply&&a.reply.app||a.app||"")},
    status:String(m.notice&&m.notice.status||""),noticeReq:String(m.notice&&m.notice.req_id||""),needs:String(m.notice&&m.notice.needs||NEEDS),
    signed:m.signed,raw:m}}
function validate(q){if(!q)return"not an approve v2 card";
  var raw;try{raw=JSON.stringify(q.raw)}catch(e){return"unserializable"}
  if(raw.length>MAXRAW)return"over 4 KB";
  if(q.signed!==false)return"card is signed (refused)";
  if(secretish(q.raw))return"secret-like content (refused)";
  if(KINDS.indexOf(q.kind)<0)return"kind must be mint, sign or send";
  if(!/^[A-Za-z0-9._:-]{4,80}$/.test(q.req_id))return"bad req_id";
  if(q.noticeReq&&q.noticeReq!==q.req_id)return"approve.req_id does not match notice.req_id";
  if(!/^[0-9a-f]{16}$/.test(q.nonce))return"bad nonce";
  if(q.status!=="pending")return"not pending";
  if(q.open&&!/^rwallet:\/\//.test(q.open))return"approve link is not ASSM ЯWALLET (rwallet://)";
  return null}
function expired(q,now){return !!(q&&q.expires&&q.expires<=(now||Date.now()))}
/* rmail.decision v1. Never carries a signature, txid or key. */
function decision(q,d,by){if(d!=="approve"&&d!=="deny")throw new Error("decision must be approve or deny");
  return{schema:"rmail.decision",v:1,id:"dec-"+q.req_id,ref:q.ref,req_id:q.req_id,nonce:q.nonce,decision:d,ts:Date.now(),
    by:String(by||root.RMAIL_APPROVE_SEAT||SEAT),app:q.reply.app||q.app,to_node:q.reply.node,signed:false}}
var MEM={};function ls(){try{return root.localStorage||null}catch(e){return null}}
function rd(k,d){var L=ls();if(!L)return MEM[k]||d;try{return JSON.parse(L.getItem(k)||"null")||d}catch(e){return d}}
function wr(k,v){var L=ls();if(!L){MEM[k]=v;return}try{L.setItem(k,JSON.stringify(v))}catch(e){}}
function decisions(){return rd("rmail.decisions",{})}
function transport(){var R=root.RSOCIAL;return R&&typeof R.send==="function"?function(to,text,extra){return R.send(to,text,extra)}:null}
function deliver(dec,send){var q=rd("rmail.decision.outbox",[]);q.push(dec);wr("rmail.decision.outbox",q.slice(-200));
  send=send||transport();if(!send)return Promise.resolve({queued:true,via:"rmail.decision.outbox",decision:dec});
  var text="Subject: rmail.decision "+dec.decision+" "+dec.req_id+"\n\n"+JSON.stringify(dec);
  return Promise.resolve(send(dec.app||"@chaserizal",text,dec.to_node?{node:dec.to_node,to_node:dec.to_node}:{}))
    .then(function(r){return{sent:true,via:"rmail",decision:dec,r:r}},function(e){return{queued:true,via:"rmail.decision.outbox",error:String(e&&e.message||e),decision:dec}})}
function decide(q,d,send){var err=validate(q);if(err)return Promise.reject(new Error(err));
  if(expired(q))return Promise.reject(new Error("expired · nothing signed"));
  var all=decisions();if(all[q.req_id])return Promise.reject(new Error("already-decided"));
  var dec=decision(q,d);all[q.req_id]={decision:d,ts:dec.ts,ref:q.ref};wr("rmail.decisions",all);return deliver(dec,send)}
function deny(q,send){return decide(q,"deny",send)}
/* Approve: the decision goes back, then ONLY ASSM ЯWALLET Face ID opens. */
function openFaceId(q,opener){if(typeof root.RMAIL_APPROVE_FACEID==="function")return root.RMAIL_APPROVE_FACEID(Object.freeze({req_id:q.req_id,nonce:q.nonce,kind:q.kind,open:q.open}));
  if(!q.open)return{opened:false,why:"no rwallet:// link on this card"};
  (opener||function(u){root.location.href=u})(q.open);return{opened:true,open:q.open}}
function approve(q,send,opener){return decide(q,"approve",send).then(function(r){r.faceid=openFaceId(q,opener);return r})}
function E(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return"&#"+c.charCodeAt(0)+";"})}
function buttonsHTML(q){var err=validate(q),d=decisions()[q&&q.req_id];
  var meta='<div class="rma-meta"><b>'+E(String(q.kind||"?").toUpperCase())+'</b> · '+E(q.summary)+' · from '+E(q.app||"unknown app")+' · needs '+E(q.needs)+' · unsigned</div>';
  if(err)return'<div class="rmu-approve rma-bad">'+meta+'<span class="rmu-st">refused: '+E(err)+' · no buttons</span></div>';
  if(d)return'<div class="rmu-approve">'+meta+'<span class="rmu-st">'+(d.decision==="deny"?"Denied — nothing signed":"Approved — ASSM ЯWALLET Face ID opened · ЯWALLET signs only after your Face ID")+'</span></div>';
  if(expired(q))return'<div class="rmu-approve">'+meta+'<span class="rmu-st">Expired — nothing signed</span></div>';
  var label=q.kind==="mint"?"Approve Mint":q.kind==="sign"?"Approve Sign":"Approve Send";
  return'<div class="rmu-approve">'+meta+'<button class="rmu-btn go" data-rapr="approve">'+label+' · Face ID</button><button class="rmu-btn no" data-rapr="deny">Deny</button>'+
    '<span class="rmu-st" id="rma-st">Approve opens only ASSM ЯWALLET Face ID · Deny replies "denied" · nothing is signed here</span></div>'}
function pending(msgs){return(msgs||[]).map(fromMessage).filter(function(q){return q&&!validate(q)&&!expired(q)&&!decisions()[q.req_id]})}
var api={v:2,spec:"RMAIL-APPROVE-DENY-SPEC-20261111 (rmail.approve v2 + rmail.decision v1)",KINDS:KINDS,fromMessage:fromMessage,validate:validate,expired:expired,
  decision:decision,approve:approve,deny:deny,decisions:decisions,buttonsHTML:buttonsHTML,pending:pending,neverSigns:true};
if(typeof module==="object"&&module.exports)module.exports=api;else root.RMAIL_APPROVE=api;
})(typeof self!=="undefined"?self:globalThis);
