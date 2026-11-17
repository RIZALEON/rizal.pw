/* RWALLET · BOTLATCH panel (20261029). View-only: links + public read of contracts.json / activity.json.
 * No keys, no signing, no data writes. Trades stay ЯCASKET-gated (RWALLET_UNIFIED.run('buy'|'sell') = approval PREVIEW only). */
(function(){
var LOCAL='../../BONEPILE/BOTLATCH-TRACKER/',WEB='https://rizal.info/botlatch/contracts/',APP='https://rizal.info/botlatch/';
function get(n){return fetch(LOCAL+n,{cache:'no-store'}).then(function(r){if(!r.ok)throw 0;return r.json()}).catch(function(){return fetch(WEB+n,{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).catch(function(){return null})})}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function mount(){var host=document.getElementById('rw')||document.body,d=document.createElement('div');d.id='rw-botlatch';
 d.style.cssText='border:1px solid #39ff14;margin:10px 0;padding:10px;font:12px Menlo,monospace;color:#39ff14;background:#000';
 d.innerHTML='<b style="letter-spacing:.2em">Я BOTLATCH</b><div style="margin:6px 0"><a href="'+APP+'" target="_blank" style="color:#b388ff">OPEN APP</a> · <a href="'+APP+'tracker/" target="_blank" style="color:#b388ff">tracker</a> · <a href="'+APP+'contracts/" target="_blank" style="color:#b388ff">contracts</a> · <a href="'+APP+'exchange/" target="_blank" style="color:#b388ff">exchange</a></div><div id="rwbl-c">reading contracts.json…</div><div id="rwbl-a" style="margin-top:6px"></div><div style="color:#888;margin-top:6px">View-only. Buy/sell/swap/send = ЯCASKET Face ID request; nothing signs here.</div>';
 if(host!==document.body&&host.parentNode)host.parentNode.insertBefore(d,host.nextSibling);else host.appendChild(d); /* 20261030: sibling after #rw, RWALLET re-renders #rw */
 get('contracts.json').then(function(c){var el=document.getElementById('rwbl-c');if(!c){el.textContent='contracts.json unavailable';return}
  var t=(c.tokens||c.contracts||[])[0]||{};el.innerHTML='Я / R mint <code>'+esc(t.mint||t.address||'BB9uA5…Q1Lv')+'</code><br>source: '+esc(c.generated||c.updated||'')});
 get('activity.json').then(function(a){var el=document.getElementById('rwbl-a');if(!a){el.textContent='activity.json unavailable';return}
  var n={};(a.rows||[]).forEach(function(r){n[r.type]=(n[r.type]||0)+1});
  el.innerHTML='activity: '+(a.rows||[]).length+' real txs ('+esc(Object.keys(n).map(function(k){return k+' '+n[k]}).join(', '))+')<br>'+(a.rows||[]).slice(0,5).map(function(r){return esc(new Date(r.time*1000).toLocaleString('en-US',{timeZone:'America/Denver'}))+' MT · '+esc(r.type)+' · '+esc(r.amount)+' Я · <a style="color:#b388ff" target="_blank" href="https://solscan.io/tx/'+esc(r.sig)+'">'+esc(r.sig.slice(0,8))+'…</a>'}).join('<br>')})}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',mount):mount();
})();
