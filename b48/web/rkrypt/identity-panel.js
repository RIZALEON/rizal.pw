/* @CHASERIZAL Identity/Signing panel · read-only · ЯID-0003-P4M6 · ЯМАХ · 2026-10-24 MT */
(function(){
function esc(s){return String(s==null?"":s).replace(/[&<>]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;"}[c]})}
function short(a){a=String(a||"");return a.length>16?a.slice(0,8)+"…"+a.slice(-6):a}
function html(S,opts){opts=opts||{};if(!S)return "<b>@CHASERIZAL</b>: snapshot missing";
 var h='<div class="chz-panel" style="font:12px ui-monospace,monospace;padding:8px;border:1px solid #444;border-radius:8px">';
 h+='<div style="color:#f5a623;font-weight:bold">STAGED · UNSIGNED — awaiting Face ID signature in ЯCASKET</div>';
 h+='<h3 style="margin:6px 0">'+esc(S.handle)+' '+esc(S.tag)+'</h3><div>owner '+esc(S.owner.rid)+'</div>';
 h+='<div>linked: '+S.linkedBots.map(function(b){return esc(b.name+" "+b.rid+" ("+b.role+")")}).join(", ")+' — <i>watch/report only, cannot spend or sign</i></div>';
 h+='<h4>Wallets (public, view-only)</h4><ul>'+S.wallets.map(function(w){return "<li>"+esc(w.name)+(w.name===S.primaryWallet?" ★":"")+" · "+esc(w.kind)+" · <code>"+esc(short(w.publicAddress))+"</code></li>"}).join("")+"</ul>";
 h+='<h4>Signing fallback chain'+(opts.casket?' (if Face ID fails, next method is offered)':'')+'</h4><ol>'+S.fallbackChain.map(function(r){return "<li>"+esc(r.id)+" — "+esc(r.type)+" · signs: "+esc(r.canSign)+" · bio: "+esc(r.needsBiometric)+" · <b>"+esc(r.dryRun||"?")+"</b></li>"}).join("")+"</ol>";
 if(S.provisioningProfiles&&S.provisioningProfiles.length)h+='<h4>Provisioning profiles</h4><ul>'+S.provisioningProfiles.map(function(p){return "<li"+(p.hoursLeft<48?' style="color:#e55"':'')+">"+esc(p.name)+" · "+esc(p.expires)+"</li>"}).join("")+"</ul>";
 h+='<div style="opacity:.7">real signing OFF in rsign-chain · snapshot '+esc(S.generated)+'</div></div>';return h}
function nextMethod(S,failedId){var c=(S&&S.fallbackChain)||[];for(var i=0;i<c.length;i++)if(c[i].id===failedId){for(var j=i+1;j<c.length;j++)if(c[j].dryRun!=="unavailable")return c[j];}return null}
window.CHASERIZAL_PANEL={html:html,nextMethod:nextMethod,
 mount:function(el,opts){var S=window.CHASERIZAL_SNAPSHOT;(el||document.body).insertAdjacentHTML("beforeend",html(S,opts));try{(window.THUNDR_STATUS||function(){})("ThundR STATUS · @CHASERIZAL panel (STAGED)")}catch(e){}}};
document.addEventListener("DOMContentLoaded",function(){document.querySelectorAll("[data-idpanel]").forEach(function(b){b.addEventListener("click",function(){var c=document.getElementById("console");if(c){c.innerHTML="";window.CHASERIZAL_PANEL.mount(c,{casket:b.dataset.idpanel==="casket"})}})})});
})();
