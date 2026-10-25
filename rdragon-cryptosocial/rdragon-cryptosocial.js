/* RDRAGON · CRYPTO SIDE PANEL — CryptoSocial profile inside RDRAGON left slot (#roster). All controls functional, offline (localStorage).
   Toggle: × / + or Cmd/Ctrl+Shift+K. ?csp=0 disables. API: window.RDRAGON_CSP */
(function(){
 if(window.__CSP)return;window.__CSP=1;if(/[?&]csp=0/.test(location.search))return;
 var LS="rdragon.csp.v2",base=(document.currentScript&&document.currentScript.src||"").replace(/[^/]*$/,"")||"./rdragon-cryptosocial/";
 var D={on:true,tab:"Posts",nav:"home",rdg:"0.00",following:0,followers:0,follow:{},avatar:"",banner:"",
  eng:{reply:13,repost:3,like:3,views:378,liked:false,reposted:false},replies:[],posts:[],alerts:["Welcome to CryptoSocial on RDRAGON"],msgs:[],prof:{title:"Anti Social CryptoSocial Media",name:"Rizal the Younger",handle:"@chaserizal",bio:"PaleoAnthropologist from the Distant Future | Buy: a.co/d/6zvEHwf | IF OUR WORLD IS A LIE, TRUTH IS THE GREATEST DECEPTION. Give: cash.app/$chaserizal",location:"Mount Olympus, UT",link:"a.co/d/47uq2zX",joined:"April 2019",verified:"SUPER VERIFIED",pname:"Rizal the Valentinian",preply:"Replying to @IGLESIARIZAL",ptext:""}};
 var S;try{S=Object.assign({},D,JSON.parse(localStorage.getItem(LS)||"{}"))}catch(e){S=D}S.prof=Object.assign({},D.prof,S.prof||{});S.bot=S.bot||{};S.fold=S.fold||{};S.draft=[];norm();
 function F(k){return '<span class="csp-ed" contenteditable="plaintext-only" spellcheck="false" data-e="'+k+'" title="click to edit">'+E(S.prof[k])+'</span>'}
 function linkify(s){return E(s).match(/(?:https?:\/\/)?(?:a\.co|cash\.app)\/[^\s|]+/g)||[]}
 function links(s){return linkify(s).map(function(u){return '<a href="'+(/^http/.test(u)?u:"https://"+u)+'" target="_blank" rel="noopener">'+u+' ↗</a>'}).join(" ")}
 function save(){try{localStorage.setItem(LS,JSON.stringify(S,function(k,v){return k==="me"?undefined:v}))}catch(e){toast("storage full — image too big?")}}
 function E(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
 var CASH="https://cash.app/$chaserizal";
 var people=[["@chaserizal","Rizal the Younger"],["@IGLESIARIZAL","Iglesia Rizal"],["@grok","Grok"],["@RDRAGON","RDRAGON"]];
 var lines=["@grok : Xfile : Professor X","© Aetaneo Rizal : Hortus Edenis","Tales of the Twilight from the Crypt","Beyond the nuclear looking","Jesus Aliens Ghosts &amp; Cryptids","NOVA CONSTELLATIO","#1116 Give cash.app/$chaserizal","Doctor rerum zcientiarum luznaturalium","❤"];
 var stub={Video:["Tales of the Twilight — teaser","NOVA CONSTELLATIO — starfield loop","RDRAGON offline image-gen demo"],
  Articles:["IF OUR WORLD IS A LIE, TRUTH IS THE GREATEST DECEPTION","PaleoAnthropology from the Distant Future","Hortus Edenis — notes"],
  Projects:["RDRAGON","CryptoSocial · RDG wallet"]};
 var p,tt;
 /* AUTO-REPLY: RDRAGON answers EVERY user post + EVERY comment (all posts), no prompt/@tag. Replies are about the post text AND its media.
    Model: configured chatEndpoint (OpenAI-compatible), tried first.onLine=false). Media: configured describeEndpoint /api/upload + /api/describe (VLM/Vision OCR), cached per attachment; video = frame grab -> same describe.
    Offline/model down: local reply quoting key words + media name appears immediately, upgraded to model reply on retry (load, 'online', every 60 s). Keys = unique ids. Bot replies never trigger replies. */
 var CFG=window.RDRAGON_CONFIG||{};var AI=CFG.chatEndpoint||"",WRAP=CFG.describeEndpoint||"",busy={};S.desc=S.desc||{};
 function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
 function norm(){S.posts=(S.posts||[]).map(function(x){return typeof x==="string"?{id:uid(),t:x,media:[],c:[]}:(x.c=x.c||[],x.media=x.media||[],x)});S.replies=(S.replies||[]).map(function(r){return typeof r==="string"?{id:uid(),t:r}:r})}
 function fb(t,m){var w=(String(t).match(/[A-Za-z$#][\w$#]{3,}/g)||["that"]).sort(function(a,b){return b.length-a.length})[0],h=0;for(var i=0;i<t.length;i++)h=(h*31+t.charCodeAt(i))|0;var T=["The ledger remembers \"W\". RDRAGON has witnessed it.","Fire noted. \"W\" now burns in the dragon's memory.","From the skull: \"W\" — keep building.","RDRAGON reads \"W\" and approves. The hoard grows.","Offline or online, \"W\" is sealed in the chain of the dragon."];var r=T[Math.abs(h)%T.length].replace("W",w.slice(0,40));return m&&m.length?r+" (Eyes on your "+m[0].type+" "+m[0].name+".)":r}
 function to(ms){var c=new AbortController();setTimeout(function(){c.abort()},ms);return c.signal}
 function src2b64(src){return src.indexOf("data:")===0?Promise.resolve(src):fetch(src).then(function(r){return r.blob()}).then(function(b){return new Promise(function(ok){var f=new FileReader();f.onload=function(){ok(f.result)};f.readAsDataURL(b)})})}
 function describe(m){var k=m.key||m.id;if(S.desc[k])return Promise.resolve(S.desc[k]);
  if(!WRAP)return Promise.reject(new Error("no describe"));return src2b64(m.src).then(function(b64){return fetch(WRAP+"/api/upload",{method:"POST",signal:to(20000),headers:{"Content-Type":"application/json"},body:JSON.stringify({name:m.name.replace(/\.\w+$/,"")+(m.type==="video"?"-frame.jpg":/\.\w+$/.test(m.name)?m.name.match(/\.\w+$/)[0]:".jpg"),b64:b64})})}).then(function(r){return r.json()})
  .then(function(u){if(!u.url)throw 0;return fetch(WRAP+"/api/describe",{method:"POST",signal:to(90000),headers:{"Content-Type":"application/json"},body:JSON.stringify({url:u.url})})}).then(function(r){return r.json()})
  .then(function(d){if(d&&d.text&&!/^I couldn.t read/i.test(d.text)){S.desc[k]=(m.type==="video"?"(frame from the video) ":"")+d.text;save()}return S.desc[k]}).catch(function(){return ""})}
 function mline(ms){return ms.map(function(m){return m.type+" \""+m.name+"\""+(S.desc[m.key||m.id]?" — what it shows: "+S.desc[m.key||m.id]:" (not yet described)")}).join("; ")}
 var PM={key:"asset:post.jpg",type:"image",name:"post.jpg"};
 function bot(id,t,media,parent){if(S.bot[id])return;var pp=parent;S.bot[id]={t:fb(t,media.length?media:pp&&pp.media&&pp.media.length?pp.media:parent?[PM]:[]),src:"local",q:t,m:media,par:parent||null};save();ai(id)}
 function ai(id){var b=S.bot[id];if(!b||b.src==="model"||busy[id])return;busy[id]=1;var par=b.par&&b.par.pid?(function(){var n=fold().P[b.par.pid];return n?{t:cur(n),media:n.media||[]}:{t:"",media:[]}})():b.par,pm=par?(par.media&&par.media.length?par.media:[PM]):[],all=(b.m||[]).concat(pm);
  pm.forEach(function(m){if(m===PM)m.src=base+"assets/post.jpg"});
  Promise.all(all.map(describe)).then(function(){var q=(par?"PARENT POST:\n"+par.t+(pm.length?"\nPARENT POST MEDIA: "+mline(pm):"")+"\n\nUSER COMMENT on that post:\n":"USER POST:\n")+b.q+(b.m&&b.m.length?"\nATTACHED MEDIA: "+mline(b.m):"");
   if(!AI)return Promise.reject(new Error("no endpoint"));return fetch(AI,{method:"POST",signal:to(30000),headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:[{role:"system",content:"You are RDRAGON, the dragon-skull AI of the CryptoSocial panel. Reply to the post or comment below in one or two short in-character sentences (max 220 chars). Your reply MUST be specifically about its words and about what its attached media shows (use the media description); for a comment, tie it to the parent post. Never generic. Speak directly to the poster as you; never say \"the user\". No hashtags, no @mentions."},{role:"user",content:q}],max_tokens:90,temperature:0.7})})})
  .then(function(r){return r.json()}).then(function(j){var t=((j.choices||[])[0]||{}).message;t=t&&String(t.content||"").replace(/^\s*(RDRAGON|ASSISTANT)\s*[:>-]\s*/i,"").split(/\b(?:USER\s*(?:POST|COMMENT)?\s*:|PARENT POST|ATTACHED MEDIA|USER COMMENT)/i)[0].replace(/^["\s]+|["\s]+$/g,"").slice(0,280);if(t&&t.replace(/\W/g,"").length>=12&&S.bot[id]){S.bot[id].t=t;S.bot[id].src="model";save();render()}}).catch(function(){}).then(function(){delete busy[id]})}
 function bk(id,d){var b=S.bot[id];if(!b)return '';var F=fold(),rk=F.R[id]||[];return '<div class="csp-row csp-bot"><span><b>RDRAGON</b> <span class="csp-dim">@RDRAGON · auto'+(b.src==="model"?'':' · offline')+'</span><br>↳ '+E(b.t)+'<div class="acts"><span data-a="reply-to" data-id="rd:'+id+'">↳ reply to RDRAGON</span>'+(rk.length?' <span class="csp-dim">'+rk.length+(rk.length===1?' reply':' replies')+'</span>':'')+'</div><div class="csp-replybox" data-for="rd:'+id+'" style="display:none"><textarea class="csp-in" placeholder="reply to RDRAGON…" maxlength="500"></textarea><button data-a="send-comment" data-id="rd:'+id+'">reply</button></div></span></div>'+rk.map(function(x){return cmt(F,x,(d||0)+1)}).join('')}
 function retry(){Object.keys(S.bot).forEach(ai)}window.addEventListener("online",retry);setInterval(retry,60000);
 function attach(){var i=document.createElement("input");i.type="file";i.accept="image/*,video/*";i.onchange=function(){var f=i.files&&i.files[0];if(!f)return;var m={id:uid(),name:f.name,type:/^video/.test(f.type)?"video":"image"};
  function done(u){m.src=u;S.draft=(S.draft||[]).concat([m]);var ta=p.querySelector("#csp-new"),keep=ta?ta.value:"";render();var t2=p.querySelector("#csp-new");if(t2)t2.value=keep;toast(m.type+" attached · "+f.name)}
  if(m.type==="image")return shrink(f,900,done);var v=document.createElement("video"),url=URL.createObjectURL(f);v.muted=true;v.preload="auto";v.src=url;v.onloadeddata=function(){v.currentTime=Math.min(1,(v.duration||2)/2)};v.onseeked=function(){var c=document.createElement("canvas"),k=Math.min(1,900/Math.max(v.videoWidth,v.videoHeight));c.width=Math.round(v.videoWidth*k);c.height=Math.round(v.videoHeight*k);c.getContext("2d").drawImage(v,0,0,c.width,c.height);URL.revokeObjectURL(url);done(c.toDataURL("image/jpeg",.8))}};i.click()}
 function mhtml(ms){return (ms||[]).map(function(m){return '<div class="csp-img" style="height:140px;background-image:url('+m.src+')" title="'+E(m.type+" · "+m.name)+'">'+(m.type==="video"?'<span class="csp-dim">▶ '+E(m.name)+'</span>':'')+'</div>'}).join("")}
 function toast(m){var t=p.querySelector(".csp-toast");t.textContent=m;t.style.display="block";clearTimeout(tt);tt=setTimeout(function(){t.style.display="none"},2600)}
 function img(k,def){return S[k]?'url('+S[k]+')':'url('+base+'assets/'+def+')'}
 /* ===== PERMANENT POST STORE (append-only) — posts/comments/revisions/likes/reposts/views are EVENTS; nothing is ever removed.
    Local: localStorage "rdragon.csp.chain.v1", each event carries prev + hash (sha256 of canon JSON) -> a missing/edited event is detectable.
    Remote (pluggable): RDRAGON_CONFIG.storeEndpoint -> GET/POST {endpoint}/api/events (prototype server; Rghostchain-backed later). */
 var CK="rdragon.csp.chain.v1",VK="rdragon.csp.viewer",STORE=CFG.storeEndpoint||"";var EV=[];try{EV=JSON.parse(localStorage.getItem(CK)||"[]")}catch(e){EV=[]}
 var VIEWER=localStorage.getItem(VK)||("v-"+uid());try{localStorage.setItem(VK,VIEWER)}catch(e){}
 var SESSV={};var PIN="pinned-valentinian",LEGACY={repost:3,like:3,views:378}; /* legacy pinned-card counters from the live site (baseline, not in any thread data) */
 function canon(v){return Array.isArray(v)?"["+v.map(canon).join(",")+"]":v&&typeof v==="object"?"{"+Object.keys(v).sort().map(function(k){return JSON.stringify(k)+":"+canon(v[k])}).join(",")+"}":JSON.stringify(v)}
 function hx(b){return Array.prototype.map.call(new Uint8Array(b),function(x){return("0"+x.toString(16)).slice(-2)}).join("")}
 var chainQ=Promise.resolve();
 function addEv(ev){ev.id=ev.id||uid();ev.ts=new Date().toISOString();ev.by=ev.by||S.prof.handle;ev.seq=EV.length;ev.prev=EV.length?EV[EV.length-1].hash||"pending":"0".repeat(64);EV.push(ev);var me=ev;
  chainQ=chainQ.then(function(){var c=Object.assign({},me);delete c.hash;return crypto.subtle?crypto.subtle.digest("SHA-256",new TextEncoder().encode(canon(c))).then(function(b){me.hash=hx(b)}):null}).then(function(){var n=EV.indexOf(me);if(EV[n+1])EV[n+1].prev=me.hash;persist()});persist();
  if(STORE&&ev.t!=="view"&&S.me&&S.me.sign){var sv=Object.assign({},ev);delete sv.seq;delete sv.prev;delete sv.hash;Promise.resolve(S.me.sign(canon(sv))).then(function(sig){return fetch(STORE+"/api/events",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+S.me.session},body:JSON.stringify({event:sv,sig:sig})})}).then(function(r){if(!r.ok)toast("store refused: "+r.status)}).catch(function(){})}return ev}
 /* profile-required gate: viewing is open, writing needs a profile (RLogin) */
 S.me=null;try{S.me=JSON.parse(sessionStorage.getItem('rdragon.csp.me')||'null')}catch(e){}
 function gate(){toast('Make a profile or log in (RLogin) to post, comment, reply or react');var g=p&&p.querySelector('.csp-gate');if(g)g.style.display='block'}
 function persist(){try{localStorage.setItem(CK,JSON.stringify(EV))}catch(e){toast("storage full")}}
 function verifyLocal(){var bad=[];return EV.reduce(function(pr,e,i){return pr.then(function(){if(e.seq!==i)bad.push(i+": seq");if(i&&e.prev!==EV[i-1].hash)bad.push(i+": prev link");var c=Object.assign({},e);delete c.hash;return crypto.subtle.digest("SHA-256",new TextEncoder().encode(canon(c))).then(function(b){if(hx(b)!==e.hash)bad.push(i+": hash")})})},Promise.resolve()).then(function(){return{ok:!bad.length,events:EV.length,problems:bad}})}
 if(STORE)fetch(STORE+"/api/events").then(function(r){return r.json()}).then(function(rs){var have={};EV.forEach(function(e){have[e.id]=1});rs.forEach(function(e){if(!have[e.id])EV.push(e)});render()}).catch(function(){});
 /* one-time migration of legacy localStorage posts/replies into events (they are kept, never dropped) */
 if(!S.migrated){S.posts.forEach(function(o){addEv({t:"post",id:o.id,text:o.t,media:o.media||[]});(o.c||[]).forEach(function(c){addEv({t:"comment",id:c.id,parent:o.id,post:o.id,text:c.t})})});S.replies.forEach(function(r){addEv({t:"comment",id:r.id,parent:PIN,post:PIN,text:r.t})});if(S.prof.ptext)addEv({t:"revise",target:PIN,text:S.prof.ptext});S.migrated=1;save()}
 function fold(){var P={},C={},R={},order=[];P[PIN]={id:PIN,pinned:1,revs:[{text:lines.map(function(l){return "✓ "+l.replace(/&amp;/g,"&")}).join("\n"),ts:"legacy"}],media:[{key:"asset:post.jpg",type:"image",name:"post.jpg",src:base+"assets/post.jpg"}],kids:[],likes:{},reposts:{},views:{}};
  EV.forEach(function(e){var x;if(e.t==="post"){P[e.id]={id:e.id,by:e.by,ts:e.ts,revs:[{text:e.text,ts:e.ts}],media:e.media||[],kids:[],likes:{},reposts:{},views:{}};order.push(e.id)}
   else if(e.t==="comment"){C[e.id]={id:e.id,by:e.by,ts:e.ts,parent:e.parent,post:e.post,revs:[{text:e.text,ts:e.ts}],kids:[]};x=P[e.parent]||C[e.parent];if(x)x.kids.push(e.id);else if(/^rd:/.test(e.parent))(R[e.parent.slice(3)]=R[e.parent.slice(3)]||[]).push(e.id)}
   else if(e.t==="revise"){x=P[e.target]||C[e.target];if(x)x.revs.push({text:e.text,ts:e.ts})}
   else if(/^(un)?(like|repost)$/.test(e.t)){x=P[e.target];if(x)x[/like/.test(e.t)?"likes":"reposts"][e.viewer]=!/^un/.test(e.t)}
   else if(e.t==="view"){x=P[e.target];if(x)x.views[e.viewer]=1}});return{P:P,C:C,R:R,order:order}}
 function cnt(o){return Object.keys(o).filter(function(k){return o[k]}).length}
 function rdc(F,id){return (F.R[id]||[]).reduce(function(n,k){return n+1+(S.bot[k]?1:0)+total(F,F.C[k])+rdc(F,k)},0)}
 function total(F,node){return node.kids.reduce(function(n,k){return n+1+(S.bot[k]?1:0)+total(F,F.C[k])+rdc(F,k)},0)} /* comments + RDRAGON replies, derived from the stored thread */
 function seen(id){if(SESSV[id])return;SESSV[id]=1;var F=fold();if(F.P[id]&&!F.P[id].views[VIEWER])addEv({t:"view",target:id,viewer:VIEWER})}
 function lt(ts){var d=new Date(ts);return isNaN(d)?String(ts):d.toLocaleString([], {dateStyle:'short',timeStyle:'short'})}
 function cur(n){return n.revs[n.revs.length-1].text}
 function engRow(F,n){var lk=cnt(n.likes)+(n.pinned?LEGACY.like:0),rp=cnt(n.reposts)+(n.pinned?LEGACY.repost:0),vw=cnt(n.views)+(n.pinned?LEGACY.views:0);
  return '<div class="csp-eng"><span data-a="open-thread" data-id="'+n.id+'" title="open thread">💬 '+(total(F,n)+(S.bot[n.id]?1:0)+rdc(F,n.id))+'</span><span data-a="repost" data-id="'+n.id+'" class="rp'+(n.reposts[VIEWER]?' on':'')+'">🔁 '+rp+'</span><span data-a="like" data-id="'+n.id+'" class="'+(n.likes[VIEWER]?'on':'')+'">♥ '+lk+'</span><span data-a="views" data-id="'+n.id+'" title="unique viewers">📊 '+vw+'</span></div>'}
 function cardHead(n){return n.pinned?'<div class="l w">'+F("pname")+'</div><div class="rep">'+F("preply")+'</div>':'<div class="l w">'+E(S.prof.name)+' <span class="csp-dim">'+E(n.by||S.prof.handle)+'</span></div>'}
 function feedCard(F,n){seen(n.id);return '<div class="csp-card" data-pid="'+n.id+'">'+cardHead(n)+'<div class="csp-ptext csp-open" data-a="open-thread" data-id="'+n.id+'" title="open thread · edit post">'+E(cur(n))+'</div>'+(n.revs.length>1?'<div class="csp-dim" style="font-size:10px">edited · '+n.revs.length+' revisions</div>':'')+mhtml(n.pinned?[]:n.media)+(n.pinned?'<div class="csp-img" style="background-image:url('+base+'assets/post.jpg)"></div>':'')+engRow(F,n)+'</div>'}
 function cmt(F,id,d){var c=F.C[id],open=!S.fold[id],k=c.kids.length+(S.bot[id]?1:0)+(F.R[id]||[]).length;
  return '<div class="csp-c" style="margin-left:'+Math.min(d,5)*10+'px"><div class="who"><b>'+E(c.by||"")+'</b> <span class="csp-dim">'+E(lt(c.ts))+'</span></div><div style="white-space:pre-wrap">'+E(cur(c))+'</div>'+
   '<div class="acts"><span data-a="reply-to" data-id="'+id+'">↳ reply</span>'+(k?'<span data-a="fold" data-id="'+id+'">'+(open?'▾ ':'▸ ')+k+(k===1?' reply':' replies')+'</span>':'<span class="csp-dim">0 replies</span>')+'</div>'+
   '<div class="csp-replybox" data-for="'+id+'" style="display:none"><textarea class="csp-in" placeholder="reply…" maxlength="500"></textarea><button data-a="send-comment" data-id="'+id+'">reply</button></div>'+
   (open?bk(id,d)+c.kids.map(function(x){return cmt(F,x,d+1)}).join(""):"")+'</div>'}
 function threadView(){if(S.open)seen(S.open);var F=fold(),n=F.P[S.open];if(!n){S.nav="home";return view()}
  return '<div class="csp-thr-h"><button data-a="home">← back</button><span class="csp-dim">thread · permanent</span></div><div class="csp-card">'+cardHead(n)+
   (S.editing?'<textarea class="csp-in" id="csp-edit" rows="6">'+E(cur(n))+'</textarea><button data-a="save-rev">save as new revision</button> <button data-a="cancel-edit">cancel</button>':'<div class="csp-ptext csp-open" data-a="edit-post" title="click to edit post (saves a new revision)">'+E(cur(n))+'</div>')+
   (n.revs.length>1?'<div class="csp-rev"><span data-a="toggle-hist" style="cursor:pointer">'+(S.hist?'▾':'▸')+' history · '+n.revs.length+' revisions (all kept)</span>'+(S.hist?n.revs.slice().reverse().map(function(r,i){return '<div style="border-top:1px dotted #1f3f1f;margin-top:3px;white-space:pre-wrap">#'+(n.revs.length-i)+' · '+E(lt(r.ts))+'\n'+E(r.text)+'</div>'}).join(""):"")+'</div>':'')+
   mhtml(n.pinned?[]:n.media)+(n.pinned?'<div class="csp-img" style="background-image:url('+base+'assets/post.jpg)"></div>':'')+engRow(F,n)+
   '<textarea class="csp-in" id="csp-cmt" placeholder="comment…" maxlength="500"></textarea><button data-a="send-comment" data-id="'+n.id+'">comment</button></div>'+bk(n.id)+
   '<div class="csp-dim" style="margin:4px 0">'+total(F,n)+' comments &amp; replies · <span data-a="expand-all" style="cursor:pointer">expand all</span> · <span data-a="collapse-all" style="cursor:pointer">collapse all</span></div>'+
   n.kids.map(function(k){return cmt(F,k,0)}).join("")}
 function view(){var v="";
  if(S.nav==="search")v='<input class="csp-in" id="csp-q" placeholder="search people, posts, #tags" autofocus><div id="csp-res"></div>';
  else if(S.nav==="compose")v='<textarea class="csp-in" id="csp-new" rows="4" maxlength="500" placeholder="what\'s happening?"></textarea>'+mhtml(S.draft)+'<button data-a="attach">📎 photo/video</button> <button data-a="post">post</button> <button data-a="home">cancel</button>';
  else if(S.nav==="alerts")v=S.alerts.slice().reverse().map(function(a){return '<div class="csp-row"><span>🔔 '+E(a)+'</span></div>'}).join("")+'<button data-a="clearalerts">clear</button>';
  else if(S.nav==="msgs")v=(S.msgs.length?S.msgs.map(function(m){return '<div class="csp-row"><span>✉ '+E(m)+'</span></div>'}).join(""):'<div class="csp-dim">no messages (offline inbox)</div>')+'<input class="csp-in" id="csp-msg" placeholder="message to self / note"><button data-a="sendmsg">send</button>';
  else if(S.nav==="people")v='<div class="csp-dim">&gt; who_to_follow</div>'+people.map(function(x){var on=S.follow[x[0]];return '<div class="csp-row"><span>'+x[0]+'<br><span class="csp-dim">'+x[1]+'</span></span><button data-a="follow" data-h="'+x[0]+'">'+(on?'following':'+ follow')+'</button></div>'}).join("");
  else if(S.nav==="thread")v=threadView();
  else if(S.tab==="Posts"){fold().order.concat([PIN]).forEach(seen);var FF=fold();v=FF.order.slice().reverse().map(function(id){return feedCard(FF,FF.P[id])}).join("")+feedCard(FF,FF.P[PIN])}
  else v=stub[S.tab].map(function(t,i){return '<div class="csp-card" data-a="open" data-i="'+S.tab+': '+E(t)+'"><div class="l">'+E(t)+'</div><div class="csp-dim">'+(S.tab==="Video"?"▶ play (offline stub)":S.tab==="Articles"?"read":"open")+'</div></div>'}).join("");
  return v}
 function render(){var keepScroll=p.scrollTop;
  p.innerHTML='<div class="csp-top">'+F("title")+'<button class="csp-x" data-a="toggle" title="collapse (Cmd/Ctrl+Shift+K)">'+(S.on?'×':'+')+'</button></div>'+
  '<div class="csp-banner" data-a="pickbanner" title="click to change banner" style="background-image:'+img("banner","banner.jpg")+'"><img class="csp-gm" src="'+base+'assets/ghostmachine-logo.jpg" alt="GHOSTMACHINE" title="GHOSTMACHINE"><button class="csp-b csp-bv" data-a="verified" title="'+E(S.prof.verified)+' · click to edit badge">✔ Verified</button><button class="csp-b csp-bw" data-a="wallet" title="RDG wallet · double-click to set balance">&gt; Wallet</button></div>'+
  '<div class="csp-av" data-a="pickavatar" title="click to change profile picture" style="background-image:'+img("avatar","avatar.jpg")+'"></div>'+
  '<div class="csp-name">'+F("name")+'</div><div class="csp-handle">'+F("handle")+'</div>'+
  (S.wopen?'<div class="csp-wx"><div>balance <b>'+S.rdg+' RDG</b> <span class="csp-dim">(local ledger · offline · no keys)</span></div><div style="margin:4px 0"><a href="'+CASH+'" target="_blank" rel="noopener">send via cash.app/$chaserizal ↗</a></div><button data-a="copyhandle">copy $chaserizal</button> <button data-a="wallet">close</button></div>':'')+
  '<div class="csp-bm"><div>'+F("bio")+'<div class="csp-links">'+links(S.prof.bio+" "+S.prof.link)+'</div></div>'+
  '<div class="csp-meta"><div>location · '+F("location")+'</div><div>link · '+F("link")+'</div><div>joined · '+F("joined")+'</div></div>'+
  '<div class="csp-ff"><span data-a="people"><b>'+S.following+'</b> Following</span> · <span data-a="people"><b>'+S.followers+'</b> Followers</span></div></div>'+
  '<div class="csp-tabs">'+["Posts","Video","Articles","Projects"].map(function(t){return '<span data-a="tab" data-t="'+t+'" class="'+(t===S.tab&&S.nav==="home"?'on':'')+'">'+t+'</span>'}).join("")+'</div>'+
  '<div class="csp-view">'+view()+'</div>'+
  '<div class="csp-nav">'+[["home","⌂"],["search","⌕"],["compose","+"],["alerts","🔔"],["msgs","✉"]].map(function(n){return '<span data-a="nav" data-n="'+n[0]+'" class="'+(n[0]==="compose"?'plus ':'')+(S.nav===n[0]?'on':'')+'" title="'+{home:"Home",search:"Search",compose:"New post",alerts:"Alerts",msgs:"Messages"}[n[0]]+'">'+n[1]+'</span>'}).join("")+'</div>'+
  (S.me?'':'<div class="csp-gate" style="display:none">🔐 <b>Make a profile</b> or log in with your wallet (RLogin) to post or reply. Reading is open to everyone.</div>')+'<div class="csp-ready"><b>C:\\SOCIAL&gt;</b><br>READY.</div><div class="csp-toast" style="display:none"></div>';
  p.classList.toggle("csp-off",!S.on);p.scrollTop=keepScroll;
  var q=p.querySelector("#csp-q");if(q){q.oninput=function(){var s=q.value.toLowerCase(),out=[];if(s){people.forEach(function(x){if((x[0]+x[1]).toLowerCase().indexOf(s)>-1)out.push("👤 "+x[0]+" · "+x[1])});
   [S.prof.name,S.prof.handle,S.prof.bio,S.prof.ptext||""].concat(lines,EV.filter(function(x){return x.t==="post"||x.t==="comment"}).map(function(x){return x.text})).forEach(function(l){if(l.toLowerCase().indexOf(s)>-1)out.push("✓ "+l)});[].concat(stub.Video,stub.Articles,stub.Projects).forEach(function(l){if(l.toLowerCase().indexOf(s)>-1)out.push("• "+l)})}
   p.querySelector("#csp-res").innerHTML=out.length?out.map(function(o){return '<div class="csp-row"><span>'+o+'</span></div>'}).join(""):(s?'<div class="csp-dim">no results</div>':'')};q.focus()}
 }
 function shrink(file,max,cb){var r=new FileReader();r.onload=function(){var im=new Image();im.onload=function(){var k=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement("canvas");c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext("2d").drawImage(im,0,0,c.width,c.height);cb(c.toDataURL("image/jpeg",.85))};im.src=r.result};r.readAsDataURL(file)}
 function pick(key,max){var i=document.createElement("input");i.type="file";i.accept="image/*";i.onchange=function(){var f=i.files&&i.files[0];if(!f)return;shrink(f,max,function(u){S[key]=u;save();render();toast((key==="avatar"?"profile picture":"banner")+" updated · saved offline")})};i.click()}
 function act(a,el){var e=S.eng;switch(a){
  case "toggle":S.on=!S.on;break;
  case "verified":var nv=prompt("Badge text (Cancel = show info)",S.prof.verified);if(nv===null){toast("✔ "+S.prof.verified+" · "+S.prof.handle+" · RDRAGON local identity");return}S.prof.verified=nv.trim()||D.prof.verified;break;
  case "pickbanner":pick("banner",1200);return;case "pickavatar":pick("avatar",400);return;
  case "people":S.nav="people";break;
  case "follow":var h=el.dataset.h;S.follow[h]=!S.follow[h];S.following=Object.keys(S.follow).filter(function(k){return S.follow[k]}).length;S.alerts.push((S.follow[h]?"You followed ":"You unfollowed ")+h);break;
  case "wallet":S.wopen=!S.wopen;break;
  case "copyhandle":(navigator.clipboard?navigator.clipboard.writeText("$chaserizal"):Promise.reject()).then(function(){toast("copied $chaserizal")},function(){toast("$chaserizal")});return;
  case "tab":S.tab=el.dataset.t;S.nav="home";break;
  case "nav":if(el.dataset.n==="compose"&&!S.me)return gate();S.nav=el.dataset.n;if(S.nav==="home")S.tab="Posts";break;case "home":S.nav="home";S.tab="Posts";break;
  case "open-thread":S.nav="thread";S.open=el.dataset.id;S.editing=0;S.hist=0;break;
  case "edit-post":if(!S.me)return gate();S.editing=1;break;case "cancel-edit":S.editing=0;break;case "toggle-hist":S.hist=!S.hist;break;
  case "save-rev":if(!S.me)return gate();var nt=p.querySelector("#csp-edit").value.trim();var Fq=fold();if(!nt||nt===cur(Fq.P[S.open]))return toast("no change");addEv({t:"revise",target:S.open,text:nt});S.editing=0;S.hist=1;toast("saved as a new revision · old text kept");break;
  case "reply-to":if(!S.me)return gate();var rb=p.querySelector('.csp-replybox[data-for="'+el.dataset.id+'"]');rb.style.display=rb.style.display==="none"?"block":"none";if(rb.style.display==="block")rb.querySelector("textarea").focus();return;
  case "send-comment":if(!S.me)return gate();var box=el.parentNode.querySelector("textarea"),tx=box.value.trim();if(!tx)return toast("type a comment first");var Fc=fold(),par=el.dataset.id,bs=par.replace(/^rd:/,""),root=Fc.P[bs]?bs:Fc.C[bs].post;var ce=addEv({t:"comment",parent:par,post:root,text:tx});S.fold[par]=0;
   var pn=Fc.P[root];if(/^rd:/.test(par)&&S.bot[bs])bot(ce.id,tx,[],{t:"RDRAGON said: "+S.bot[bs].t+"\nON POST: "+cur(pn),media:pn.media||[]});else bot(ce.id,tx,[],root===PIN?{t:S.prof.pname+" ("+S.prof.preply+"): "+cur(pn),media:[]}:{t:cur(pn),media:pn.media||[]});S.alerts.push("You commented");break;
  case "fold":S.fold[el.dataset.id]=!S.fold[el.dataset.id];break;
  case "expand-all":S.fold={};break;case "collapse-all":var Fa=fold();Object.keys(Fa.C).forEach(function(k){S.fold[k]=1});break;
  case "repost":case "like":if(!S.me)return gate();var Fl=fold(),nn=Fl.P[el.dataset.id],on=(a==="like"?nn.likes:nn.reposts)[VIEWER];addEv({t:(on?"un":"")+a,target:nn.id,viewer:VIEWER});break;
  case "views":var Fv=fold();toast("📊 "+(cnt(Fv.P[el.dataset.id].views))+" unique viewers stored"+(el.dataset.id===PIN?" + "+LEGACY.views+" legacy":""));return;
  case "post":if(!S.me)return gate();var t=p.querySelector("#csp-new").value.trim();var dm=S.draft||[];if(!t&&!dm.length)return toast("write something first");var pe=addEv({t:"post",text:t,media:dm});S.draft=[];bot(pe.id,t||"(media only)",dm);S.alerts.push("Posted: "+t.slice(0,40));S.nav="home";S.tab="Posts";break;
  case "clearalerts":S.alerts=[];break;
  case "sendmsg":var m=p.querySelector("#csp-msg").value.trim();if(!m)return toast("type a message");S.msgs.push(m);break;
  case "open":toast(el.dataset.i+" — offline stub");return;
  default:return}
  save();render()}
 function build(){p=document.createElement("aside");p.id="csp-panel";p.setAttribute("aria-label","CRYPTO SIDE PANEL");
  var slot=document.getElementById("roster");(slot||document.body).appendChild(p);
  p.addEventListener("click",function(ev){var el=ev.target.closest("[data-a]");if(!el||!p.contains(el))return;if(el.tagName==="A")return;ev.preventDefault();ev.stopPropagation();act(el.dataset.a,el)});
  p.addEventListener("dblclick",function(ev){var t=ev.target.closest("[data-a]");if(!t)return;var a=t.dataset.a,tx=t.textContent,k=null,o=S,lab;
   if(a==="people"){k=/Following/.test(tx)?"following":"followers"}else if(a==="wallet"){k="rdg"}else if(S.eng&&({reply:1,repost:1,like:1,views:1})[a]){o=S.eng;k=a}
   if(!k)return;ev.preventDefault();var v=prompt("Set "+k,o[k]);if(v===null)return;v=+v;if(isNaN(v))return;o[k]=k==="rdg"?v.toFixed(2):Math.max(0,Math.round(v));save();render();toast(k+" = "+o[k]+" · saved offline")});
  p.addEventListener("focusout",function(ev){var k=ev.target.dataset&&ev.target.dataset.e;if(!k)return;var v=ev.target.innerText.trim();if(k!=="ptext"&&k!=="bio")v=v.replace(/\s+/g," ");S.prof[k]=v||D.prof[k]||"";save();if(k==="bio"||k==="link")render();toast(k+" saved · offline")});
  p.addEventListener("keydown",function(ev){if(ev.key==="Enter"&&ev.target.dataset&&ev.target.dataset.e&&ev.target.dataset.e!=="ptext"&&ev.target.dataset.e!=="bio"){ev.preventDefault();ev.target.blur();return}if(ev.key==="Enter"&&!ev.shiftKey){if(ev.target.id==="csp-msg")act("sendmsg");else if(ev.target.closest&&ev.target.closest(".csp-replybox"))act("sendreply",ev.target)}});
  render()}
 setTimeout(retry,1500);window.RDRAGON_CSP={events:function(){return EV.slice()},verify:verifyLocal,botReply:bot,attachData:function(m){S.draft=(S.draft||[]).concat([m])},toggle:function(v){S.on=v===undefined?!S.on:!!v;save();render()},setRDG:function(n){S.rdg=(+n||0).toFixed(2);save();render()},reset:function(){toast("reset disabled: posts are permanent")},signin:function(me){S.me=me||null;try{sessionStorage.setItem('rdragon.csp.me',JSON.stringify(me&&{handle:me.handle,profile:me.profile,session:me.session}))}catch(e){}if(me&&me.handle)S.prof.handle=me.handle;render()},signout:function(){S.me=null;sessionStorage.removeItem('rdragon.csp.me');render()},me:function(){return S.me}};
 document.addEventListener("keydown",function(e){if((e.metaKey||e.ctrlKey)&&e.shiftKey&&(e.key==="K"||e.key==="k")){e.preventDefault();window.RDRAGON_CSP.toggle()}});
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",build);else build();
})();
