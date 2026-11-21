/* Live RTOR TrackR (t176u, 2026-11-21). Polls rtrackr/data/rtor-live.json every 15s. */
(function(G){
  var POLL=15000, tickT=null, pollT=null, lastDoc=null, lastOkAt=0, lastErr=null, DATA='/rtrackr/data/rtor-live.json';
  function E(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function mt(t){if(!t)return'—';var d=typeof t==='number'?new Date(t*1000):new Date(t);if(isNaN(d))return E(t);return E(d.toLocaleString('en-US',{timeZone:'America/Denver',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',second:'2-digit'})+' MT')}
  function sh(h){h=String(h||'');return h.length>20?h.slice(0,12)+'…'+h.slice(-6):h}
  function fmtBytes(n){n=Number(n);if(!isFinite(n)||n<0)return'—';if(n<1024)return n+' B';if(n<1048576)return (n/1024).toFixed(n<10*1024?1:0)+' KB';if(n<1073741824)return (n/1048576).toFixed(n<10*1048576?1:0)+' MB';return (n/1073741824).toFixed(2)+' GB'}
  function fmtRate(bps){bps=Number(bps);if(!isFinite(bps)||bps<=0)return '0 B/s';if(bps<1024)return Math.round(bps)+' B/s';if(bps<1048576)return (bps/1024).toFixed(bps<10*1024?1:0)+' KB/s';return (bps/1048576).toFixed(2)+' MB/s'}
  function ago(ts){if(!ts)return'never';var s=Math.max(0,Math.round((Date.now()-ts)/1000));if(s<5)return'just now';if(s<60)return s+'s ago';if(s<3600)return Math.floor(s/60)+'m '+ (s%60) +'s ago';return Math.floor(s/3600)+'h '+Math.floor((s%3600)/60)+'m ago'}
  function parsedAt(doc){if(!doc||!doc.updated_at)return 0;var t=Date.parse(doc.updated_at);return isNaN(t)?0:t}
  function stateOf(doc, fetchOk){
    if(!fetchOk && !doc) return {cls:'off', label:'OFFLINE'};
    if(!fetchOk && doc) return {cls:'stale', label:'OFFLINE'};
    var age=(Date.now()-parsedAt(doc))/1000, stale=Number(doc.stale_after_s||300);
    if(age>stale) return {cls:'stale', label:'STALE'};
    return {cls:'on', label:'LIVE'};
  }
  function pill(ok, label){return '<span class="rtor-pill '+(ok?'on':'off')+'">'+E(label)+'</span>'}
  function magnetBtn(uri, label){if(!uri)return '<span class="dim">—</span>';return '<a class="rt-btn" href="'+E(uri)+'">'+E(label||'MAGNET')+'</a>'}
  function seedCell(on){return on?'<span class="ok">SEED</span>':'<span class="dim">—</span>'}
  function ratePair(f){
    return '<span class="rtor-up">↑ '+E(fmtRate(f.up_bps))+'</span> <span class="rtor-down">↓ '+E(fmtRate(f.down_bps))+'</span>';
  }
  function filesTable(files){
    if(!files||!files.length) return '<p class="dim">no seeder files in this snapshot</p>';
    var rows=files.map(function(f){
      return '<tr><td class="rtor-fn">'+E(f.name||'—')+'</td><td class="h" title="'+E(f.sha256||'')+'">'+E(sh(f.sha256))+'</td><td>'+E(fmtBytes(f.size))+'</td><td class="rtor-rates">'+ratePair(f)+'</td><td>'+seedCell(f.seeding)+'</td><td class="rtor-mag">'+magnetBtn(f.magnet,'MAGNET')+'</td></tr>';
    }).join('');
    var table='<table class="rtor-files rtor-files-wide"><tr><th>name</th><th>sha256</th><th>size</th><th>up / down</th><th>seed</th><th>magnet</th></tr>'+rows+'</table>';
    var cards=files.map(function(f){
      return '<article class="rtor-file-card"><div class="rtor-fc-top"><strong class="rtor-fn">'+E(f.name||'—')+'</strong>'+seedCell(f.seeding)+'</div><div class="rtor-fc-meta"><span class="h" title="'+E(f.sha256||'')+'">'+E(sh(f.sha256))+'</span> · '+E(fmtBytes(f.size))+'</div><div class="rtor-fc-row">'+ratePair(f)+' '+magnetBtn(f.magnet,'MAGNET')+'</div></article>';
    }).join('');
    return '<div class="rtor-files-wrap">'+table+'<div class="rtor-files-cards">'+cards+'</div></div>';
  }
  function peersTable(peers){
    if(!peers||!peers.length) return '<p class="dim">no peers in this snapshot</p>';
    var rows=peers.map(function(p){
      var name=E(p.name||'—')+(p.self?' <span class="dim">self</span>':'');
      var reach=p.reachable?'<span class="ok">up</span>':'<span class="no">down</span>';
      return '<tr><td>'+name+'</td><td>'+reach+'</td><td>'+E(p.device||'—')+'</td><td>'+E(p.version||'—')+'</td><td>'+(p.files==null?'—':E(p.files))+'</td><td class="dim">'+E(p.checked?mt(p.checked):'—')+'</td></tr>';
    }).join('');
    return '<table class="rtor-peers"><tr><th>peer</th><th>status</th><th>device</th><th>version</th><th>files</th><th>checked</th></tr>'+rows+'</table>';
  }
  function rtorLiveSection(){
    return '<section id="rtor" class="rtor-live">'+
      '<div class="rtor-head"><h2>◈ Live RTOR TrackR</h2>'+
      '<div id="rtor-badge" class="rtor-badge">loading live RTOR…</div></div>'+
      '<div id="rtor-body"><p class="dim">polling Neo snapshot…</p></div></section>';
  }
  function paintRtorLive(doc, meta){
    var badge=document.getElementById('rtor-badge'), body=document.getElementById('rtor-body');
    if(!badge||!body) return;
    meta=meta||{};
    var fetchOk=meta.fetchOk!==false && !!doc;
    var st=stateOf(doc, fetchOk);
    var seen=lastOkAt || parsedAt(doc);
    var seenTxt=seen?('last seen '+ago(seen)+' · '+(doc&&doc.updated_at_mt?doc.updated_at_mt:mt(seen))):'last seen —';
    if(meta.error && !doc) seenTxt='offline · no snapshot yet';
    else if(!fetchOk) seenTxt='offline · '+seenTxt;
    badge.className='rtor-badge '+st.cls;
    badge.innerHTML='<span class="rtor-dot"></span> '+st.label+' · '+E(seenTxt);
    if(!doc){ body.innerHTML='<p class="no">Live RTOR snapshot is not reachable yet. The page retries every 15 seconds.</p>'; return; }
    var gc=doc.ghostchain||{}, rtor=doc.rtor||{}, lis=rtor.listener||{}, gh=rtor.ghostchain||{}, sd=rtor.seeder||{};
    var lisUp=lis.status==='up', ghUp=gh.status==='up', sdUp=sd.status==='seeding'||sd.status==='up';
    var livePeers=(doc.peers||[]).filter(function(p){return p.reachable}).length;
    var stats=[
      ['RGHOSTCHAIN height', gc.height==null?'—':gc.height],
      ['RGHOSTCHAIN tip', sh(gc.tip)],
      ['listener', lis.status||'down'],
      ['RTOR ghostchain', gh.status||'down'],
      ['seeder', sd.status||'down'],
      ['library files', (doc.files||[]).length],
      ['peers up', livePeers+' / '+(doc.peers||[]).length],
      ['updated', doc.updated_at_mt||mt(doc.updated_at)]
    ].map(function(s){return '<div class="st"><span>'+E(s[0])+'</span><b>'+E(s[1])+'</b></div>'}).join('');
    var svc='<table class="kv rtor-svc"><tr><td>official chain</td><td class="ok">height '+E(gc.height)+' · tip <span class="h" title="'+E(gc.tip||'')+'">'+E(sh(gc.tip))+'</span> · '+E(gc.status||'—')+'</td></tr>'+
      '<tr><td>RTOR listener</td><td class="'+(lisUp?'ok':'no')+'">'+pill(lisUp, lis.status||'down')+' '+E(lis.service||'')+(lis.version?' · v'+E(lis.version):'')+(lis.chain_mode?' · mode '+E(lis.chain_mode):'')+'</td></tr>'+
      '<tr><td>RTOR ghostchain</td><td class="'+(ghUp?'ok':'no')+'">'+pill(ghUp, gh.status||'down')+' '+E(gh.client||'')+' · http '+E(gh.http||'—')+' · swarm port '+E(gh.swarm||'—')+(gh.magnet_ok?' · magnet OK':'')+(gh.uptime_s!=null?' · up '+E(Math.floor(gh.uptime_s/60))+'m':'')+'</td></tr>'+
      (gh.filechain_height!=null?'<tr><td>RTOR file-chain</td><td>height '+E(gh.filechain_height)+' · head <span class="h" title="'+E(gh.filechain_head||'')+'">'+E(sh(gh.filechain_head))+'</span> <span class="dim">(library transfers, not the official ledger)</span></td></tr>':'')+
      '<tr><td>seeder pack</td><td class="'+(sdUp?'ok':'no')+'">'+pill(sdUp, sd.status||'down')+' '+E(sd.files==null?'':'· '+sd.files+' files')+' '+E(sd.bytes==null?'':'· '+fmtBytes(sd.bytes))+(sd.info_hash?' · infohash <span class="h" title="'+E(sd.info_hash)+'">'+E(sh(sd.info_hash))+'</span>':'')+' '+magnetBtn(sd.magnet,'SEED MAGNET')+'</td></tr></table>';
    var rs=gh.reseed||{};
    var reseed=rs.state?('<p class="dim">reseed '+E(rs.state)+(rs.text?': '+E(rs.text):'')+(rs.unmet&&rs.unmet.length?' · '+E(rs.unmet.join('; ')): '')+'</p>'):'';
    body.innerHTML='<div class="stats">'+stats+'</div>'+svc+reseed+'<h3>Seeder files</h3>'+filesTable(doc.files)+'<h3>Peers</h3>'+peersTable(doc.peers)+
      '<p class="dim">Sanitized snapshot from Neo, published at most every 2 minutes. This page polls every 15 seconds. No keys, no mailbox contents, no private addresses.</p>';
  }
  function refreshRtorLive(){
    return fetch(DATA+'?t='+Date.now(),{cache:'no-store'}).then(function(r){
      if(!r.ok) throw new Error('http '+r.status);
      return r.json();
    }).then(function(doc){
      lastDoc=doc; lastOkAt=Date.now(); lastErr=null;
      paintRtorLive(doc,{fetchOk:true});
      return doc;
    }).catch(function(err){
      lastErr=err;
      paintRtorLive(lastDoc,{fetchOk:false,error:String(err&&err.message||err)});
    });
  }
  function startRtorPoll(){
    stopRtorPoll();
    pollT=setInterval(refreshRtorLive, POLL);
    tickT=setInterval(function(){ if(document.getElementById('rtor-badge')) paintRtorLive(lastDoc,{fetchOk:!lastErr&&!!lastDoc}); }, 1000);
  }
  function stopRtorPoll(){
    if(pollT){clearInterval(pollT);pollT=null}
    if(tickT){clearInterval(tickT);tickT=null}
  }
  function mountRtorOnly(){
    var app=document.getElementById('app');
    if(!app) return;
    app.innerHTML=rtorLiveSection();
    refreshRtorLive().then(startRtorPoll);
  }
  G.rtorLiveSection=rtorLiveSection;
  G.paintRtorLive=paintRtorLive;
  G.refreshRtorLive=refreshRtorLive;
  G.startRtorPoll=startRtorPoll;
  G.stopRtorPoll=stopRtorPoll;
  G.mountRtorOnly=mountRtorOnly;
  if(document.documentElement && document.documentElement.getAttribute('data-rtor-only')==='1'){
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', mountRtorOnly);
    else mountRtorOnly();
  }
})(window);
