/* RGHOSTCHAIN watch-only view · shared RWALLET module · Gizmo 20261101 · READ-ONLY.
 * Reads https://rizal.pw/rtrackr/data/rghostchain.json, checks its sha256 against SHA256SUMS,
 * caches the last good copy on this device (localStorage) and shows height, tip and blocks.
 * No keys, no signing, no writes to any chain. Mounts into #rghostchain-view, else .csp-rwx (ЯWALLET), else #rw.
 * API: window.RGHOSTCHAIN_VIEW.load() -> Promise<{doc,source,ok}>, .mount(el) */
(function(w){"use strict";
var BASE='https://rizal.pw/rtrackr/data/',KEY='rghostchain.view.v1';
function E(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function hex(b){return Array.prototype.map.call(new Uint8Array(b),function(x){return('0'+x.toString(16)).slice(-2)}).join('')}
function cached(){try{return JSON.parse(localStorage.getItem(KEY))}catch(e){return null}}
function load(){
 return Promise.all([fetch(BASE+'rghostchain.json',{cache:'no-store'}).then(function(r){if(!r.ok)throw Error('json '+r.status);return r.arrayBuffer()}),
                     fetch(BASE+'SHA256SUMS',{cache:'no-store'}).then(function(r){if(!r.ok)throw Error('sums '+r.status);return r.text()})])
 .then(function(x){var want=((x[1].match(/^([0-9a-f]{64})\s+\*?rghostchain\.json$/m)||[])[1]);
   return crypto.subtle.digest('SHA-256',x[0]).then(function(d){var got=hex(d);if(!want||got!==want)throw Error('sha256 mismatch');
     var doc=JSON.parse(new TextDecoder().decode(x[0]));var c={doc:doc,sha256:got,fetched:new Date().toISOString()};
     try{localStorage.setItem(KEY,JSON.stringify(c))}catch(e){}return{doc:doc,source:'live · sha256 ✓',ok:true,sha256:got}})})
 .catch(function(e){var c=cached();return c?{doc:c.doc,source:'cached '+c.fetched.slice(0,16)+' ('+e.message+')',ok:false,sha256:c.sha256}:{doc:null,source:'unreachable ('+e.message+')',ok:false}})}
function render(el,r){var d=r.doc;el.setAttribute('style','display:block;margin-top:6px;border:1px solid #b388ff;background:#000;color:#b388ff;padding:6px 8px;font:11px Menlo,monospace');
 if(!d){el.innerHTML='<b>Я RGHOSTCHAIN</b> · watch-only · '+E(r.source);return}
 el.innerHTML='<b style="letter-spacing:.15em">Я RGHOSTCHAIN</b> · watch-only · '+E(r.source)+'<br>height '+E(d.height)+' · tip '+E(String(d.tip||'').slice(0,16))+'…'+
  (d.verify&&d.verify.ok?' · verified ✓':'')+'<div style="opacity:.85;margin-top:3px">'+(d.blocks||[]).slice().reverse().map(function(b){
   return '#'+E(b.index)+' '+E(b.type)+' '+E(String(b.hash).slice(0,12))+'… '+E(String(b.ts||'').slice(0,16))+((b.payload&&b.payload.label)?' · '+E(b.payload.label):'')}).join('<br>')+
  '</div><a href="/rtrackr/" style="color:#39ff14">▶ RTRACKR</a>'}
function mount(el){el=el||document.getElementById('rghostchain-view');
 if(!el){var host=document.querySelector('.csp-rwx')||document.getElementById('rw');if(!host||host.querySelector('.rghostchain-view'))return;el=document.createElement('div');host.appendChild(el)}
 if(el.getAttribute('data-rgv'))return;el.setAttribute('data-rgv','1');el.className+=' rghostchain-view';
 var c=cached();if(c)render(el,{doc:c.doc,source:'cached',ok:false});load().then(function(r){render(el,r)})}
w.RGHOSTCHAIN_VIEW={load:load,mount:mount,url:BASE+'rghostchain.json'};
if(typeof document!=='undefined')setInterval(function(){mount()},1000);
})(window);
