/* GHOSTMACHINE sidebar up1 (2026-10-25, ЯBAT) — GHOSTMACHINE sidebar marker 20261025.
   Holds: CryptoSocial profile (RKRYPT card), full feed (every post/comment/reply at any depth, composer on every node, premium replies, RDRAGON answers inline),
   and the offline CryptoSocial site bundle slot (BATIBABOT) loaded only when its sha256 matches ghostmachine/slot.json. No network details, no keys. */
(function(){
 if(window.GHOSTMACHINE_SIDEBAR)return;
 function E(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
 var base=(document.currentScript&&document.currentScript.src||'').replace(/ghostmachine-sidebar\.js.*$/,'')||'ghostmachine/';
 var RT=null,GM=null,MD=window.RDRAGON_MEDIA_I||null,tab='feed',pend=[];
 function rt(){if(RT)return RT;RT=window.RDRAGON_RT||(window.RDRAGON_THREAD&&window.RDRAGON_THREAD.create({by:'@chaserizal',device:'17e',storage:window.localStorage,replica:window.RDRAGON_REPLICA||null}));if(RT&&window.GM_REPLIES){GM=window.GM_REPLIES.create(RT,{replica:window.RDRAGON_REPLICA||null});var RP=window.RDRAGON_REPLICA;if(RP&&RP.entries)GM.ingest(RP.entries());if(RP&&RP.onChange)RP.onChange(function(r){GM.ingest(r.added);if(MD&&MD.ingest)MD.ingest(r.added);render()})}MD=MD||window.RDRAGON_MEDIA_I||null;return RT}
 function tree(id,l,nn){var T=rt(),n=nn||T.state().nodes[id]||{id:id},kids=n.rd&&n.rd.placeholder?[]:T.children(id),r=n.rd;
  var head='<b>'+E(r?'RDRAGON':n.by)+'</b> '+(r?'<span class="csp-dim">@RDRAGON · '+E(r.status)+'</span> ':'')+'<a href="#post/'+E(id)+'">#</a>';
  var body='<div class="rt-t">'+E(n.t)+'</div>'+(GM?GM.rich(n):'')+(MD&&MD.jobsFor?MD.jobsFor(id).map(function(j){return MD.resultHtml(j.id)}).join(''):'')+(r&&r.status==='answered'?'<button data-a="gm-reply" data-p="'+E(id)+'">reply</button>':'');
  return'<details open id="gm/'+E(id)+'" data-depth="'+l+'" style="margin-left:'+(l?10:0)+'px;border-left:'+(l?'1px solid #2a3':'0')+';padding-left:6px"><summary>'+head+(kids.length?' ('+kids.length+')':'')+'</summary>'+body+kids.map(function(k){return tree(k.id,l+1,k.rd?k:null)}).join('')+'</details>'}
 function roots(){var st=rt().state();return Object.keys(st.nodes).map(function(k){return st.nodes[k]}).filter(function(n){return!n.par&&!n.rd}).sort(function(a,b){return a.ts<b.ts?1:-1})}
 function composer(par){return'<form class="gm-comp" data-p="'+E(par||'')+'"><textarea name="t" rows="2" style="width:100%" placeholder="'+(par?'reply… (@RDRAGON to ask)':'post as your RKRYPT profile…')+'"></textarea><label><input type="checkbox" name="q"'+(par?'':' disabled')+'> quote</label> <label><input type="checkbox" name="a" checked> ask RDRAGON</label> <input type="file" name="f" accept="image/*" multiple> <button>send</button></form>'}
 function render(){var el=document.getElementById('gm-body');if(!el)return;var h='';
  if(tab==='profile')h=window.RKRYPT&&window.RKRYPT.card?window.RKRYPT.card():'<i>RKRYPT not loaded</i>';
  else if(tab==='site')h='<div id="gm-sitebox">checking site bundle…</div>';
  else h=(GM?GM.lessonsHtml(8):'')+composer(null)+roots().map(function(n){return tree(n.id,0)}).join('');
  el.innerHTML=h;if(tab==='site')site()}
 function hex(b){return Array.prototype.map.call(new Uint8Array(b),function(x){return('0'+x.toString(16)).slice(-2)}).join('')}
 function site(){var box=document.getElementById('gm-sitebox');fetch(base+'slot.json').then(function(r){return r.json()}).then(function(s){
   if(!s.sha256||s.status==='PLACEHOLDER'){box.innerHTML='<p>CryptoSocial site bundle slot is a <b>placeholder</b> (waiting on BATIBABOT\'s offline bundle). Profile and feed tabs work offline now.</p>';return}
   return fetch(base+s.path).then(function(r){return r.arrayBuffer()}).then(function(b){return crypto.subtle.digest('SHA-256',b)}).then(function(d){
    if(hex(d)!==s.sha256){box.innerHTML='<p>Site bundle sha mismatch — not loaded.</p>';return}box.innerHTML='<iframe id="gm-site" sandbox="allow-scripts allow-same-origin" src="'+E(base+s.path)+'"></iframe>'})}).catch(function(){box.innerHTML='<p>Site bundle not available offline.</p>'})}
 function files(inp,cb){var fs=[].slice.call(inp&&inp.files||[],0,4),out=[],n=fs.length;if(!n)return cb(out);fs.forEach(function(f){var r=new FileReader();r.onload=function(){var m=MD&&MD.picture?MD.picture(f.name,r.result,inp.form&&inp.form.getAttribute('data-p')||null):{type:'image',name:f.name,src:r.result};if(m)out.push(m);if(!--n)cb(out)};r.readAsDataURL(f)})}
 function build(){if(document.getElementById('gm-sidebar'))return;var l=document.createElement('link');l.rel='stylesheet';l.href=base+'ghostmachine-sidebar.css';document.head.appendChild(l);
  var t=document.createElement('button');t.id='gm-tab';t.textContent='GHOSTMACHINE';document.body.appendChild(t);
  var s=document.createElement('aside');s.id='gm-sidebar';s.setAttribute('data-ghostmachine','sidebar');
  s.innerHTML='<div><b>GHOSTMACHINE</b> · CryptoSocial <button data-a="gm-tab" data-t="profile">profile</button><button data-a="gm-tab" data-t="feed">feed</button><button data-a="gm-tab" data-t="site">site</button><button data-a="gm-close">✕</button></div><div id="gm-body"></div>';
  document.body.appendChild(s);t.onclick=function(){s.classList.toggle('on');render()};
  s.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('button');if(!b)return;var a=b.getAttribute('data-a'),p=b.getAttribute('data-p');
   if(a==='gm-tab'){tab=b.getAttribute('data-t');render()}else if(a==='gm-close')s.classList.remove('on');
   else if(a==='gm-react'&&GM){GM.react(p,b.getAttribute('data-e'));render()}
   else if(a==='gm-reply'||a==='gm-quote'){var d=document.getElementById('gm/'+p);if(d&&!d.querySelector(':scope > form.gm-comp')){d.insertAdjacentHTML('beforeend',composer(p));if(a==='gm-quote')d.querySelector(':scope > form.gm-comp [name=q]').checked=true}}
   else if(a==='rt-fb'&&rt())rt().feedback(b.getAttribute('data-r'),b.getAttribute('data-v'))});
  s.addEventListener('submit',function(e){var f=e.target;if(!f.classList.contains('gm-comp'))return;e.preventDefault();rt();if(!GM)return;var t=f.t.value.trim();if(!t)return;
   files(f.f,function(media){var en=GM.reply(f.getAttribute('data-p')||null,t,{media:media,quote:f.q&&f.q.checked,askRdragon:f.a&&f.a.checked});GM.sign(en).then(render);render()})});
  window.addEventListener('hashchange',function(){var m=/^#post\/(.+)$/.exec(location.hash);if(m){s.classList.add('on');tab='feed';render();var el=document.getElementById('gm/'+decodeURIComponent(m[1]));for(var x=el;x;x=x.parentElement)if(x.tagName==='DETAILS')x.open=true;el&&el.scrollIntoView&&el.scrollIntoView({block:'center'})}})}
 window.GHOSTMACHINE_SIDEBAR={VERSION:'up1-20261025',render:render,open:function(t){tab=t||tab;var s=document.getElementById('gm-sidebar');s&&s.classList.add('on');render()},_tree:tree};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build);else build();
})();
