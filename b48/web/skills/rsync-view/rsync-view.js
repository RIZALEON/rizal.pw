/* R:\ RDRAGON left-panel ЯWALLET mount + read-only RSYNC card · 20261027
 * Renders the shared RCRYPTOFORGE/RWALLET wallet (served at /rwallet-shared/) into #csp-rw.
 * Read-only: polls 127.0.0.1:8811/pt/health. Public ЯIDs only. No keys, no signing, no writes. */
(function(w){var RS={at:null,d:null,err:null},T=null;
function E(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function mb(n){return (n/1048576).toFixed(0)+' MB'}
function card(){var d=RS.d;if(!d)return '<div class="rs-h">RSYNC · POLYTRANSPONDR :8811</div><div class="rs-d">'+(RS.err?'offline · '+E(RS.err):'checking…')+'</div>';
 var tr=d.stats&&d.stats.transports||{},k=Object.keys(tr);
 return '<div class="rs-h">RSYNC · POLYTRANSPONDR '+E(d.name||'')+' <span class="rs-ok">● live</span></div>'+
 '<div class="rs-row"><span>entries</span><b>'+(+d.entries).toLocaleString()+'</b></div><div class="rs-row"><span>ledger size</span><b>'+mb(+d.bytes||0)+'</b></div>'+
 '<div class="rs-row"><span>transports up</span><b>'+k.filter(function(x){return tr[x].up}).length+' / '+k.length+'</b></div>'+
 '<div class="rs-tr">'+k.map(function(x){return '<span class="'+(tr[x].up?'u':'n')+'">'+(tr[x].up?'●':'○')+' '+E(x)+'</span>'}).join(' ')+'</div>'+
 '<div class="rs-d">checked '+E(new Date(RS.at).toLocaleTimeString())+' · read-only</div>'}
function paint(){var c=document.getElementById('csp-rsync');if(c)c.innerHTML=card()}
function poll(){fetch('http://127.0.0.1:8811/pt/health',{cache:'no-store'}).then(function(r){return r.json()}).then(function(j){RS.d=j;RS.err=null;RS.at=Date.now();paint()}).catch(function(e){RS.err=e.message;RS.at=Date.now();paint()})}
function tags(){var b=document.getElementById('csp-ridtags'),G=w.RGEN_RIDTAGS;if(!b||!G)return;var go=function(L){var t=G.list(L);b.innerHTML='<div class="rs-h">ЯID TAGS · RGENERATOR · '+t.length+' tracked</div>'+(t.length?t.map(function(x){return '<div class="rs-row"><span>'+E(x.rid)+'</span><b>'+E(x.kind)+' · '+E(x.name)+'</b></div>'}).join(''):'<div class="rs-d">none yet</div>')+'<div class="rs-d">public IDs only</div>'};
 if(T)return go(T);G.loadBrowser('/rwallet-shared/rgenerator/data/rid-tags.json').then(function(L){T=L;go(L)}).catch(function(){})}
w.CSP_RW_MOUNT=function(){var m=document.getElementById('csp-rw');if(!m)return;w.RWALLET_MOUNT='csp-rw';
 var L=w.RWALLET_RID_LINK;
 if(!m.dataset.ready||!(m.nextElementSibling&&m.nextElementSibling.classList.contains("csp-rwx"))){m.dataset.ready="1";m.insertAdjacentHTML('afterend','<div class="csp-rwx">'+(L?'<div class="rs-rid">owner '+E(L.owner)+' · '+E(L.owner_name)+'<br>bot '+E(L.thundr)+' · '+E(L.thundr_name)+'</div>':'')+'<div id="csp-ridtags" class="rs-card"></div><div id="csp-rsync" class="rs-card"></div></div>')}
 w.RWALLET&&w.RWALLET.render();tags();paint();if(!RS.at)poll()};
setInterval(function(){if(document.getElementById('csp-rsync'))poll()},30000);
var st=document.createElement('style');st.textContent='#csp-rw{margin:6px 8px;border:1px solid #39ff14;background:#050505}.csp-rwx{margin:0 8px 6px}.rs-card{border:1px solid #39ff14;background:#000;padding:5px 7px;margin-top:6px;font:11px Menlo,monospace;color:#cfc}.rs-h{color:#39ff14;font-weight:700;margin-bottom:3px}.rs-ok{color:#39ff14}.rs-row{display:flex;justify-content:space-between;gap:6px}.rs-row b{color:#fff}.rs-tr span{white-space:nowrap}.rs-tr .n{color:#777}.rs-d{color:#777;margin-top:3px}body>#rw-rid{display:none}.rs-rid{font:11px Menlo,monospace;color:#b388ff;border:1px solid #8a2be2;padding:4px 6px;margin-top:6px;background:#000}';document.head.appendChild(st);
setInterval(function(){var m=document.getElementById("csp-rw");if(m&&(!m.firstChild||!m.dataset.ready||!m.nextElementSibling||!m.nextElementSibling.classList.contains("csp-rwx")))window.CSP_RW_MOUNT()},800);})(window);
