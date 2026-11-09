/* rwallet-rmail-card 1.0 · RWALLET 0.1.2 · 20261109 · RMAIL × RWALLET: a READ-ONLY card inside the RMAIL panel listing wallet
 * requests queued for a HARD device (GET /rmint/queue on submitd, via RMINT_TRANSPORT when loaded). It cannot send, sign or mint:
 * the only action is "open ЯWALLET", which on a HARD device (Neo / 17e / moto) shows Я MINT · SIGN for Rizal to press. */
(function(w){"use strict";
var D=w.document,ID="rwallet-rmail-card";
function E(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function q(){var T=w.RMINT_TRANSPORT;if(T&&T.call)return T.call("/rmint/queue","GET");
 return fetch("http://127.0.0.1:8741/rmint/queue",{cache:"no-store"}).then(function(r){return r.json()})}
function paint(host,items,note){var c=D.getElementById(ID);if(!c){c=D.createElement("div");c.id=ID;host.appendChild(c)}
 c.style.cssText="margin:10px 0;border:1px solid #8a2be2;border-radius:14px;padding:8px 10px;font:11px Menlo,ui-monospace,monospace;color:#ddd;background:#000";
 c.innerHTML='<div style="color:#39ff14;letter-spacing:1px;margin-bottom:4px">ЯWALLET · requests waiting for a HARD device</div>'+
  (items&&items.length?items.slice(0,6).map(function(x){return'<div>'+E(x.id)+' · from '+E(x.from_device)+' ('+E(x.from_tier)+') · '+E(x.reason)+'</div>'}).join(""):'<div style="color:#1f8f0f">'+E(note||"none queued")+'</div>')+
  '<a href="/rwallet/" style="display:inline-block;margin-top:6px;border:1.5px solid #39ff14;border-radius:999px;padding:3px 10px;color:#39ff14;text-decoration:none">open ЯWALLET ›</a>'+
  '<div style="color:#888;margin-top:4px">read-only · signing happens only on Neo / 17e / moto</div>'}
function tick(n){var host=D.getElementById("rmu-body");if(!host){if(n<30)setTimeout(function(){tick(n+1)},2000);return}
 q().then(function(r){paint(host,(r&&r.queue)||[],r&&r.ok===false?"queue unavailable":"")},function(){paint(host,[],"offline: queue unavailable")})}
D.readyState==="loading"?D.addEventListener("DOMContentLoaded",function(){tick(0)}):tick(0);
w.RWALLET_RMAIL_CARD={version:"1.0",refresh:function(){tick(0)}};
})(window);
