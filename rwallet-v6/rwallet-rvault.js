/* R:\ RWALLET · RVAULT panel · 20261030. STATUS ONLY.
 * Contract (Rizal's laws): keys live behind biometrics (wallet / RVAULT / ЯCASKET), are never read, printed, moved
 * or cloned here. RVAULT has no standalone module; this panel touches no files and no key material. It shows the
 * seal state and, if RWALLET's own read-only 'lockstate' function (RKRYPT status) is present, its status line.
 * Unlock / sign = ЯCASKET (Face ID on Rizal's device) only. Load after rwallet-unified.js. */
(function(w){
function E(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function scrub(t){return String(t).replace(/[0-9a-fA-F]{40,}|[1-9A-HJ-NP-Za-km-z]{60,}|-----BEGIN[^-]*-----/g,'[sealed]').slice(0,240)}
function mount(){
 if(document.getElementById('rw-rvault'))return;
 var host=document.getElementById(w.RWALLET_MOUNT||'rw'),d=document.createElement('div');d.id='rw-rvault';
 d.style.cssText='border:2px solid #b388ff;margin:10px 0;padding:10px;font:12px Menlo,monospace;color:#b388ff;background:#0b0b0b';
 d.innerHTML='<b style="letter-spacing:.2em">Я RVAULT</b> <span style="color:#9ac438">SEALED</span>'+
  '<div style="margin:6px 0;color:#eee">Keys stay behind biometrics · never shown, copied or exported here · unlock/sign only through ЯCASKET (Face ID)</div>'+
  '<div>status: <span id="rwv-st">not checked</span></div>'+
  '<div style="margin-top:8px"><button id="rwv-chk" style="background:#2E6DB4;color:#ffd23f;border:1px solid #2a1206;padding:4px 10px">CHECK STATUS</button></div>';
 if(host&&host.parentNode)host.parentNode.insertBefore(d,host.nextSibling);else document.body.appendChild(d);
 document.getElementById('rwv-chk').onclick=check;}
function check(){var o=document.getElementById('rwv-st'),U=w.RWALLET_UNIFIED;
 var has=U&&(U.funcs||[]).some(function(f){return f.id==='lockstate'&&f.read&&!f.casket});
 if(!has){o.textContent='sealed · no RVAULT status source loaded in this RWALLET (contract: status only)';return}
 Promise.resolve(U.run('lockstate','')).then(function(r){o.textContent=(r&&r.status==='pass'?'sealed · ':'unavailable · ')+scrub(r&&typeof r.out==='string'?r.out:(r&&r.status)||'')}).catch(function(){o.textContent='unavailable · sealed'})}
w.RWALLET_RVAULT={version:'rvault-panel-20261030',check:check,statusOnly:true};
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',mount):setTimeout(mount,0);
})(window);
