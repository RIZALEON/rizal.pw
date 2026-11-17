/* rwallet-rmail-panel.js · PRIVATE staged 20261110
 * RMAIL panel for the full unified ЯWALLET.
 * Uses rsocial-rmail.js v2.1 (browser outbox) + data/rmail-handoff.json
 * (configurable :8797 helper, LXMF/RNS :4242, RKLOWD queue fallback).
 * HARD RULE: mail from RMAIL or the mesh must never trigger sign or mint.
 * This file must not call RMINT_*, RSIGN, RGHOSTKEY, or RWALLET_UNIFIED.run.
 */
(function(root){
"use strict";
var cs=document.currentScript&&document.currentScript.src||"";
var BASE=cs.replace(/[^\/]*(\?.*)?$/,"")||"./";
function E(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function J(u){return fetch(u,{cache:"no-store"}).then(function(r){if(!r.ok)throw new Error(u+" "+r.status);return r.json()})}
var CFG=null, STATE={status:"loading"};

function firewall(){
  /* refuse to be used as a signer/minter even if someone assigns us */
  return Promise.reject(new Error("RMAIL panel cannot sign or mint"));
}

function outbox(){
  try{return JSON.parse(localStorage.getItem("rmail.outbox")||"[]")}catch(e){return []}
}
function box(){
  try{return JSON.parse(localStorage.getItem("rmail.box")||"[]")}catch(e){return []}
}

function activeTarget(cfg){
  var key=cfg&&cfg.active||"relay_8797";
  var t=(cfg&&cfg.targets&&cfg.targets[key])||null;
  return {key:key, t:t};
}

function deliver(msg, cfg){
  /* Outbox-first. Then configurable HTTP relay. Then RKLOWD fallback noted. Never mint/sign. */
  if(msg && (msg.sign||msg.mint||msg.seal||msg.authority===true)){
    return Promise.reject(new Error("mail refused: would require sign/mint/seal"));
  }
  var S=root.RSOCIAL;
  if(S && typeof S.send==="function"){
    return Promise.resolve(S.send(msg)).then(function(r){return {via:"rsocial-rmail-v2.1", r:r}});
  }
  var tgt=activeTarget(cfg);
  var url=tgt.t&&tgt.t.url;
  if(url && /^https?:\/\/127\.0\.0\.1(?::\d+)?\//.test(url) && tgt.t.kind!=="lxmf-rns"){
    return fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(msg||{})})
      .then(function(r){return r.json().catch(function(){return {http:r.status}})})
      .then(function(j){return {via:tgt.key, r:j}})
      .catch(function(err){
        return {via:"rklowd-fallback", error:String(err&&err.message||err), queued:"browser-outbox"};
      });
  }
  return Promise.resolve({via:"browser-outbox", queued:true, target:tgt.key});
}

// 20261111 RBATBOX: rmail.approve v2 cards (MEKANICA spec SCROLLS/RMAIL-APPROVE-DENY-SPEC-20261111.md) via rmail-approve.js.
// Approve opens ONLY the rwallet:// ASSM ЯWALLET Face ID link; Deny writes a bare unsigned rmail.decision (rmail-dec-<req_id>.json).
// This panel still never signs or mints; it calls no wallet sign/mint/seal function.
function approveCards(bx){var A=root.RMAIL_APPROVE;if(!A||typeof A.fromMessage!=="function")return"";
  var h="";(bx||[]).forEach(function(m){var q=A.fromMessage(m);if(!q)return;h+='<div class="ru-apr" data-apr-ref="'+E(q.ref)+'">'+A.buttonsHTML(q)+'</div>'});
  return h?'<div class="ru-kv"><dt>Approve / Deny</dt><dd>'+h+'</dd></div>':""}
function onApprove(ev){var t=ev.target&&ev.target.closest&&ev.target.closest("[data-rapr]");if(!t)return;
  var w=t.closest("[data-apr-ref]"),A=root.RMAIL_APPROVE;if(!w||!A)return;var ref=w.getAttribute("data-apr-ref");
  var m=box().filter(function(x){return x&&String(x.id)===ref})[0],q=m&&A.fromMessage(m);if(!q)return;
  STATE.status=t.dataset.rapr==="deny"?"sending denied…":"Face ID…";
  (t.dataset.rapr==="deny"?A.deny(q):A.approve(q)).then(function(){STATE.status=t.dataset.rapr==="deny"?"denied · nothing signed":"approved · waiting for Face ID in ЯWALLET";render()},
    function(e){STATE.status=String(e&&e.message||e);render()})}
function render(){
  var el=document.getElementById("ru-rmail");
  if(!el)return;
  var cfg=CFG||{};
  var tgt=activeTarget(cfg);
  var ob=outbox(), bx=box();
  var h="";
  h+='<section class="ru-sec"><h2><img src=\"icons/walet-32.png\" alt=\"\" width=\"16\" height=\"16\" style=\"vertical-align:-3px;border-radius:3px;margin-right:5px\">RMAIL</h2>';
  h+=approveCards(bx);
  h+='<p class="ru-note">v2.1 browser outbox · configurable hand-off · mail never signs or mints. ';
  h+='Active target: <b>'+E(tgt.key)+'</b>'+(tgt.t&&tgt.t.label?(" — "+E(tgt.t.label)):"")+'.</p>';
  h+='<p class="ru-note">Hubs: '+E(cfg.hubs||"off")+' · LXMF local path in linux-rizal-1.1.1.6/etc/lxmd/config and reticulum :4242. ';
  h+='RKLOWD fallback: linux-rizal-1.1.1.6/opt/rizal/rklowd/RMAIL. Point <code>data/rmail-handoff.json</code> <code>active</code> at <code>helper_1_1_1_8</code> when that helper is up.</p>';
  h+='<div class="ru-kv"><dt>Outbox</dt><dd>'+ob.length+' message(s) in this browser</dd></div>';
  h+='<div class="ru-kv"><dt>Inbox (local)</dt><dd>'+bx.length+' message(s)</dd></div>';
  if(ob.length){
    h+='<ul class="ru-miss-list">';
    ob.slice(-5).forEach(function(m){ h+='<li>'+E((m&& (m.text||m.subject)||"(empty)").toString().slice(0,120))+'</li>'; });
    h+='</ul>';
  }
  h+='<form id="ru-rmail-form" class="ru-note"><input name="to" placeholder="to (public address or @handle)" style="width:100%;background:#000;color:#ddd;border:1px solid #333;padding:4px;margin:4px 0">';
  h+='<textarea name="text" placeholder="message — will not sign or mint" rows="3" style="width:100%;background:#000;color:#ddd;border:1px solid #333;padding:4px"></textarea>';
  h+='<button type="submit" class="ru-refresh">Queue in outbox</button></form>';
  h+='<p class="ru-foot">status: '+E(STATE.status)+'</p></section>';
  el.innerHTML=h;
  if(!el.__rbatApr){el.__rbatApr=1;el.addEventListener("click",onApprove)}
  var f=document.getElementById("ru-rmail-form");
  if(f) f.addEventListener("submit", function(ev){
    ev.preventDefault();
    var to=f.to.value, text=f.text.value;
    var msg={kind:"rmail", schema:"rmail.guest.v1", to:to, text:text, signed:false, verified:false, authority:false, faceid:false};
    var list=outbox(); list.push({ts:Date.now(), to:to, text:text, queued:true}); 
    try{localStorage.setItem("rmail.outbox", JSON.stringify(list))}catch(e){}
    STATE.status="queued-outbox";
    deliver(msg, CFG).then(function(r){ STATE.status="sent-via-"+(r&&r.via||"outbox"); render(); })
      .catch(function(e){ STATE.status="held-in-outbox: "+(e&&e.message||e); render(); });
    render();
  });
}

function boot(){
  J(BASE+"data/rmail-handoff.json").then(function(cfg){
    CFG=cfg;
    /* expose for v2.1 without enabling a wallet signer */
    if(cfg.targets && cfg.targets.relay_8797){
      root.RMAIL_RELAY = root.RMAIL_RELAY || (cfg.targets[cfg.active]&&cfg.targets[cfg.active].url) || cfg.targets.relay_8797.url;
    }
    if(cfg.rmail_rns_to) root.RMAIL_RNS_TO = cfg.rmail_rns_to;
    if(cfg.rmail_url) root.RMAIL_URL = cfg.rmail_url;
    /* never attach a mint/sign function */
    if(root.RSOCIAL_SIGNER){ /* leave owner-set signer alone if the device app set it; we do not set one */ }
    STATE.status="ready";
    render();
  }).catch(function(e){ STATE.status="handoff missing: "+e; render(); });
}
root.RWALLET_RMAIL={deliver:deliver,firewall:firewall,render:render,neverSignOrMint:true};
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})(window);
