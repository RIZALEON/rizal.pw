/* RTOR ↔ ASSM network panel (2026-11-21, Decider pt256u; pt257u: decentralized peer mesh wording). Reads rtrackr/data/rtor-assm.json. Read-only, additive. */
(function(G){
  var DATA='/rtrackr/data/rtor-assm.json', doc=null;
  function E(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function sh(h){h=String(h||'');return h.length>20?h.slice(0,12)+'…'+h.slice(-6):h}
  function ridA(r){return '<a href="#rid/'+encodeURIComponent(r)+'">'+E(r)+'</a>'}
  function pill(ok,label){return '<span class="rtor-pill '+(ok?'on':'off')+'">'+E(label)+'</span>'}
  function render(d){
    var p=d.profile||{},a=d.assm||{},h='';
    h+='<div class="rtor-head"><h2>RTOR ↔ ASSM · decentralized peer mesh</h2><span class="rtor-badge on"><span class="rtor-dot"></span> SYNCED</span><span class="dim">last updated '+E(d.updated_mt||d.updated_at)+'</span></div>';
    var T=d.topology||{},ML=T.mesh_library||{};if(T.summary)h+='<p>'+E(T.summary)+'</p>';
    h+='<h3>ASSM profile</h3><table class="kv"><tr><td>handle</td><td>'+ridA(p.handle||'')+' · '+ridA(p.rid||'')+'</td></tr><tr><td>profile sha256</td><td class="h" title="'+E(p.sha256)+'">'+E(sh(p.sha256))+' <span class="dim">('+E(p.size)+' B, '+E(p.schema)+')</span></td></tr><tr><td>ASSM</td><td>'+E(a.service)+' '+E(a.version)+' · '+E(a.mode)+' · '+E(a.trusted_devices)+' trusted devices · <a href="'+E(a.link)+'">link</a></td></tr><tr><td>sync</td><td>'+E(a.sync)+'</td></tr><tr><td>session</td><td>'+E(p.session)+'</td></tr></table>';
    h+='<table class="rtor-assm-match"><tr><th>device</th><th>where</th><th>sha</th><th>checked</th></tr>'+(p.matches||[]).map(function(m){return '<tr><td>'+E(m.device)+'</td><td>'+E(m.where)+'</td><td>'+pill(m.sha_ok,m.sha_ok?'match':'mismatch')+'</td><td class="dim">'+E(m.checked)+'</td></tr>'}).join('')+'</table>';
    if(d.mesh_peers){h+='<h3>Mesh peers (all equal)</h3><p class="dim">mesh library: '+E(ML.union_files)+' files (union of what every reachable peer announces) · checked '+E(ML.checked)+'</p><table class="rtor-assm-mesh"><tr><th>peer</th><th>RTOR</th><th>files</th><th>missing vs mesh</th><th>profile sha</th><th>gossip</th></tr>'+d.mesh_peers.map(function(x){var miss=x.missing==null?'<span class="dim">not announced</span>':(x.missing.length?pill(false,x.missing.length+' missing')+' <span class="dim">'+E(x.missing.join(', '))+'</span>':pill(true,'none'));return '<tr><td>'+E(x.peer)+'</td><td>'+E(x.rtor)+'</td><td>'+(x.files==null?'—':E(x.files)+' / '+E(x.mesh_union))+'</td><td>'+miss+'</td><td>'+pill(x.profile_sha_ok,x.profile_sha_ok?'match':'mismatch')+'</td><td class="dim">'+E(x.gossip)+'</td></tr>'}).join('')+'</table>'}
    h+='<h3>Peers · apps &amp; versions</h3><table class="rtor-assm-dev"><tr><th>peer</th><th>role</th><th>apps / versions</th><th>files</th><th>ASSM</th></tr>'+(d.devices||[]).map(function(x){return '<tr><td>'+E(x.device)+'</td><td>'+E(x.role)+'</td><td>'+E(x.apps)+'</td><td>'+(x.files==null?'—':E(x.files))+'</td><td>'+E(x.assm)+'</td></tr>'}).join('')+'</table>';
    h+='<h3>RTOR spaces (ЯID)</h3><table class="rtor-assm-sp"><tr><th>ЯID</th><th>space</th><th>node</th><th>RMAIL</th><th>status</th></tr>'+(d.spaces||[]).map(function(s){return '<tr><td>'+ridA(s.rid)+'</td><td>'+E(s.space)+(s.note?' <span class="dim">'+E(s.note)+'</span>':'')+'</td><td>'+E(s.node)+'</td><td class="dim">'+E(s.rmail)+'</td><td>'+pill(s.status==='confirmed',s.status==='confirmed'?'confirmed':'pending founder')+'</td></tr>'}).join('')+'</table>';
    h+='<h3>Sites &amp; services</h3><table class="kv">'+(d.sites||[]).map(function(s){return '<tr><td>'+E(s.item)+'</td><td>'+E(s.value)+'</td></tr>'}).join('')+'</table>';
    if(d.ghostchain)h+='<p class="dim">RGHOSTCHAIN height '+E(d.ghostchain.height)+' · tip '+E(d.ghostchain.tip)+' · '+E(d.ghostchain.note)+'</p>';
    (d.corrections||[]).forEach(function(c){h+='<p class="dim">correction '+E(c.at)+': '+E(c.note)+'</p>'});
    h+='<p class="dim">'+E(d.note)+'</p>';
    return h;
  }
  function paint(){var el=document.getElementById('rt-assm');if(!el)return;el.innerHTML=doc?render(doc):'<p class="dim">RTOR ↔ ASSM snapshot unavailable</p>'}
  function refresh(){return fetch(DATA+'?t='+Date.now(),{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error(r.status);return r.json()}).then(function(j){doc=j;paint();return j}).catch(function(){paint();return null})}
  function section(){return '<section id="rt-assm" class="rtor-live rtor-assm"><p class="dim">loading RTOR ↔ ASSM peer mesh…</p></section>'}
  G.rtorAssmSection=section; G.refreshRtorAssm=refresh;
})(window);
