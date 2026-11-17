/* rwallet-thundr-panel.js · PRIVATE staged 20261110
 * ThundR / RTHUNDR 1.2.0 panel. ЯID-0014-KREH. Chat/history are links only.
 * Does not trigger sign or mint.
 */
(function(root){
"use strict";
var BASE=(document.currentScript&&document.currentScript.src||"").replace(/[^\/]*(\?.*)?$/,"")||"./";
function E(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function boot(){
  var el=document.getElementById("ru-thundr"); if(!el)return;
  fetch(BASE+"data/thundr-panel.json",{cache:"no-store"}).then(function(r){return r.json()}).then(function(d){
    el.innerHTML='<section class="ru-sec"><h2>RTHUNDR</h2>'+
      '<p class="ru-note">'+E(d.name)+' · '+E(d.build)+' · RID '+E(d.rid)+'. '+E(d.note)+'</p>'+
      '<p><a href="thundr/hub/index.html">ThundR hub (view)</a> · chat/history links stay in the hub snapshot.</p>'+
      '<p class="ru-foot">The RTHUNDR .app was not copied into this stage. No sign/mint from this panel.</p></section>';
  }).catch(function(e){ el.innerHTML='<section class="ru-sec"><h2>RTHUNDR</h2><p class="ru-err">'+E(e)+'</p></section>'; });
}
root.RWALLET_THUNDR={render:boot,neverSignOrMint:true};
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})(window);
