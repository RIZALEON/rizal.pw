/* rwallet-ghost2 1.0 · 20261108-rwallet (Rizal t36u GO) · ЯWALLET 2: the approved one-press UI on REAL data.
 * Screens: home · auth (biometric first + "Use ASSM password" always) · receipt · untrusted (refused before any prompt) · offline/queue
 * · RTRACKR · wallets · link wallet · holdings · receive · settings (session + log out) · RDRAGON panel mode (data-panel or width < 300px).
 * Unit = R. Mounts where rwallet-ghost.js mounts (#rw / RWALLET_MOUNT) and replaces its render; the legacy function catalog stays one tap away
 * ("all functions ›") so nothing is removed. Never holds keys; never signs. Every mint = trusted device + ASSM session + one unlock. */
(function(w){"use strict";
var D=document,K="rwallet2.ui.v1",OWNER="ЯID-0001-3QQS",HANDLE="@chaserizal";
var st;try{st=JSON.parse(localStorage.getItem(K))||{}}catch(e){st={}}st.scr=st.scr||"home";
function save(){try{localStorage.setItem(K,JSON.stringify({scr:st.scr,legacy:st.legacy}))}catch(e){}}
function E(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function sh(h){h=String(h||"");return h.length>12?h.slice(0,4)+"…"+h.slice(-4):h}
var M={faceid:["◉","Face ID"],fingerprint:["⌾","Fingerprint"],touchid:["⌾","Touch ID"],assm:["⁂","ASSM password"]};
var ctx={net:"…",height:null,next:null,gate:null,factors:[],rt:null,msg:"",sheet:null,receipt:null,busy:false};
function T(){return w.RMINT_TRANSPORT}function S(){return w.RMINT_SESSION}
function devName(){var n=S()?S().deviceId():"neo";return{neo:"Neo","17e":"17e",moto:"moto",rvm:"RVM"}[n]||n}
function balR(){var v;try{v=(JSON.parse(localStorage.getItem("rdragon.csp.v2"))||{}).rdg}catch(e){}v=v||(w.RDRAGON_CSP&&RDRAGON_CSP.rdg)||"0.00";return v} /* same local ledger value the old panel showed, unit R */
/* ---------- data refresh (all real, watch-only) ---------- */
function refresh(){if(!T())return Promise.resolve();
  return T().probe().then(function(p){ctx.net=p.online?p.link:"offline";ctx.height=p.height;
    return Promise.all([w.RMINT_PRESS?w.RMINT_PRESS.next():null,w.RMINT_PRESS?w.RMINT_PRESS.factors():[],w.RMINT_GATE?w.RMINT_GATE.snapshot():null,
      T().call("/rtrackr/assets","GET").catch(function(){return null})])}).then(function(a){if(!a)return;ctx.next=a[0];ctx.factors=a[1]||[];ctx.snap=a[2]&&a[2].s;ctx.rt=a[3]&&!a[3].net?a[3]:(w.RTRACKR||ctx.rt);render()}).catch(function(){render()})}
function trustRow(){var s=ctx.snap||{},n=S()?S().deviceId():"neo",pre={moto:"moto-","17e":"iphone17e-",neo:"neo-",rvm:"rvm-"}[n]||n;
  return(s.devices||[]).filter(function(d){return d.device_id===n||d.device_id.indexOf(pre)===0}).sort(function(a,b){return(b.status==="active")-(a.status==="active")})[0]||null}
function trustCls(){var r=trustRow();return!r?"bad":r.status==="active"?"":"pend"}
function trustLbl(){var r=trustRow();return devName()+" · "+(!r?"not trusted":r.status==="active"?"trusted":r.status)}
/* ---------- pieces ---------- */
function hdr(){return'<div class="top"><img src="'+E(w.RWALLET_CREST||"ghostmachine-logo.jpg")+'" alt=""><div class="t"><b>ЯWALLET</b><small>'+HANDLE+' · '+OWNER+'</small></div><div class="dev '+trustCls()+'"><i></i>'+E(trustLbl())+'</div></div>'}
function netChip(){var n=ctx.net;if(n==="offline")return'<span class="chip warn">○ OFFLINE · queue on</span>';
  var L={loopback:"● LOCAL · Neo",lan:"● LAN · Neo hub",hotspot:"● HOTSPOT",usb:"● USB link",bluetooth:"● BLUETOOTH",icloud:"◆ iCLOUD relay",rklowd:"◆ RKLOWD relay",vpn:"◆ MOBILE DATA · VPN"}[n]||"… checking";
  return'<span class="chip '+(/relay|VPN/.test(L)?"ac":"on")+'">'+L+'</span>'}
function strip(){var si=S()&&S().info();return'<div class="strip">'+netChip()+'<span class="chip '+(si&&si.signed_in?"on":"warn")+'" data-a="'+(si&&si.signed_in?"settings":"login")+'">'+(si&&si.signed_in?"Signed in · ASSM":"Sign in · ASSM")+'</span><span class="chip">chain #'+(ctx.height!=null?ctx.height-1:"…")+'</span>'+(qsize()?'<span class="chip gold" data-a="offline">⧗ '+qsize()+' queued</span>':"")+'</div>'}
function qsize(){var s=T()?T().status():{};return(s.queued_ops||0)+(s.queued_mints||0)}
function bal(){return'<div class="bal"><div class="n">'+E(balR())+' <span class="u">R</span></div><div class="s">local ledger · RGHOSTCHAIN watch-only · no keys in this page</div></div>'}
function unlockText(){var f=ctx.factors;if(!f.length)return"unlock on your trusted phone";return f.map(function(x){return(M[x]||[0,x])[1]}).join(" or ")}
function bigBtn(){var r=trustRow(),si=S()&&S().info(),off=ctx.net==="offline";
  if(!r||r.status!=="active")return'<div class="press"><button class="big lock" data-a="untrusted"><span class="ya">Я</span>LOCKED<small>this device can’t sign</small></button></div>';
  if(off)return'<div class="press"><button class="big q" data-a="press"><span class="ya">Я</span>SIGN · QUEUE<small>sealed now · sent when online</small></button></div>';
  return'<div class="press"><button class="big" data-a="press"'+(ctx.busy?" disabled":"")+'><span class="ya">Я</span>MINT · SIGN<small>'+(si&&si.signed_in?"one press · one unlock":"sign in with ASSM first")+'</small></button></div>'}
function what(){var n=ctx.next;return'<div class="what">Next: <b>'+E(n?n.label:"…")+'</b> · unlock: '+E(unlockText())+'</div><div class="msg">'+E(ctx.msg)+'</div>'}
function devrows(){return'<div class="devs"><div><b>17e</b><span>◉ Face ID <i>or</i> ⁂ ASSM</span></div><div><b>moto</b><span>⌾ Fingerprint <i>or</i> ⁂ ASSM</span></div><div><b>Neo</b><span>⁂ ASSM username + password</span></div></div>'}
function rtcard(mini){var r=ctx.rt||{},assets=r.assets||[];return'<div class="card rt" data-a="rtrackr"><h4>▶ RTRACKR <em>RGHOSTCHAIN + R token</em></h4>'+
  '<div class="row"><span>chain height</span><span class="k">#'+(ctx.height!=null?ctx.height-1:"…")+(ctx.next&&ctx.next.kind==="bind"?" · block "+ctx.next.index+" pending":"")+'</span></div>'+
  '<div class="row"><span>registered assets</span><span>'+assets.length+'</span></div>'+
  (mini?"":assets.slice(-6).reverse().map(function(a){return'<div class="row"><span class="k">#'+E(a.block_index)+'</span><span>'+E(a.label||a.rid)+'</span><span class="ok">'+E(a.mode||"")+'</span></div>'}).join(""))+
  '<div class="row"><span>public feed</span><span class="h">rizal.pw/rtrackr</span></div></div>'}
function nav(a){var it=[["⌂","home"],["⛓","rtrackr"],["◫","wallets"],["⧗","offline"],["⚙","settings"]];return'<div class="nav">'+it.map(function(x){return'<span data-a="'+x[1]+'" class="'+(x[1]===a?"a":"")+'"><b>'+x[0]+'</b>'+(x[1]==="offline"?"queue":x[1]==="rtrackr"?"chain":x[1])+'</span>'}).join("")+'</div>'}
function legacy(){return'<div class="legacy" data-a="legacy">all RWALLET functions · BOTLATCH · ledger ›</div>'}
/* ---------- sheets ---------- */
function authSheet(){var f=ctx.factors,bio=f.filter(function(x){return x!=="assm"})[0],sub=devName()+" · trusted ✔ · "+(S().info().signed_in?"Signed in · ASSM":"not signed in")+" · "+ctx.net,n=ctx.next||{};
  var top=bio&&ctx.sheet!=="pw"?'<div class="bio">'+M[bio][0]+'</div><button class="btn" data-a="unlock" data-f="'+bio+'">UNLOCK WITH '+M[bio][1].toUpperCase()+'</button><button class="altbtn" data-a="pw">⁂ Use ASSM password</button>':
   '<input class="pw" id="rw2-u" autocomplete="username" placeholder="ASSM username" value="'+E((S().info().user)||"")+'"><input class="pw" id="rw2-p" type="password" autocomplete="current-password" placeholder="ASSM password"><button class="btn" data-a="unlock" data-f="assm">UNLOCK &amp; SIGN</button>'+(bio?'<button class="altbtn" data-a="bio">'+M[bio][0]+' Use '+M[bio][1]+' instead</button>':"");
  return'<div class="dim" data-a="close"></div><div class="sheet"><div class="grab"></div><h3>Unlock to sign</h3><p class="sub">'+E(sub)+'</p>'+top+
   '<div class="note">Any ONE method unlocks · 5 wrong passwords → 15-min lockout · signed in stays on, every mint asks once</div>'+
   '<div class="kv"><dt>signs</dt><dd>'+E(n.label||"…")+'</dd><dt>prev hash</dt><dd class="h">'+E(sh(n.prev))+'</dd><dt>key</dt><dd class="g">'+(devName()==="17e"?"Secure Enclave":devName()==="moto"?"Android Keystore":"Neo keychain")+' · never leaves '+E(devName())+'</dd></div>'+
   '<button class="btn ghost" data-a="close">Cancel · nothing is sent</button></div>'}
function loginSheet(){return'<div class="dim" data-a="close"></div><div class="sheet"><div class="grab"></div><h3>Sign in · ASSM</h3><p class="sub">'+E(devName())+' · stays signed in until you log out</p>'+
  '<input class="pw" id="rw2-lu" autocomplete="username" placeholder="ASSM username"><input class="pw" id="rw2-lp" type="password" autocomplete="current-password" placeholder="ASSM password">'+
  '<button class="btn" data-a="dologin">SIGN IN</button><div class="note">Trusted devices only · offline sign-in completes when any link appears</div><button class="btn ghost" data-a="close">Cancel</button></div>'}
function receiptSheet(){var r=ctx.receipt||{};return'<div class="dim" data-a="close"></div><div class="sheet"><div class="grab"></div><div class="tick">✔</div><h3>Minted · '+E(String(r.mode||"live").toUpperCase())+'</h3><p class="sub">sealed on '+E(devName())+' · via '+E(r.route||"")+'</p>'+
  '<div class="kv"><dt>block</dt><dd class="k">#'+E(r.block_index!=null?r.block_index:r.index)+'</dd><dt>block hash</dt><dd class="h">'+E(sh(r.block_hash||r.hash))+'</dd><dt>signed by</dt><dd class="g">'+E(r.signed_by||"")+' · '+E((M[r.factor]||[0,r.factor||""])[1])+'</dd><dt>gate</dt><dd class="g">trusted ✔ · ASSM ✔ · nonce '+(r.nonce_consumed?"used ✔":"—")+'</dd><dt>RTRACKR</dt><dd class="g">'+(r.rtrackr===false?"register queued":"registered / autopub next run")+'</dd><dt>time</dt><dd>'+E(new Date().toLocaleString())+'</dd></div>'+
  '<button class="btn" data-a="close">DONE</button></div>'}
function linkSheet(){var W=w.RWALLET_LINKED?w.RWALLET_LINKED.wallets:{};return'<div class="dim" data-a="close"></div><div class="sheet"><div class="grab"></div><h3>Link a wallet</h3><p class="sub">Your external wallet signs a one-time message to prove you own it. RGHOSTKEY never signs it. Linked wallets are watch-only here.</p>'+
  '<div class="tiles">'+Object.keys(W).map(function(k){var x=W[k],i=x.installed();return'<div class="tile'+(i?" sel":"")+'" data-a="link" data-w="'+k+'"><b>'+x.icon+'</b>'+x.name+'<br><small class="'+(i?"":"no")+'">'+(i?"installed":"not installed")+'</small></div>'}).join("")+'</div>'+
  '<div class="note">Read-only link: address + signature saved · no keys, no spend permission</div><button class="btn ghost" data-a="close">Cancel</button></div>'}
function receiveSheet(){var L=w.RWALLET_LINKED?w.RWALLET_LINKED.list():[],n=st.rnet||"r",addr=n==="r"?OWNER:((L.filter(function(x){return x.chain===n})[0]||{}).address||"link a wallet first");
  return'<div class="dim" data-a="close"></div><div class="sheet"><div class="grab"></div><h3>Receive</h3><p class="sub">pick a network</p><div class="netsel"><span class="chip'+(n==="r"?" on":"")+'" data-a="rnet" data-n="r">Я R · RWALLET</span><span class="chip'+(n==="evm"?" on":"")+'" data-a="rnet" data-n="evm">EVM</span><span class="chip'+(n==="solana"?" on":"")+'" data-a="rnet" data-n="solana">Solana</span></div>'+
  '<div class="kv" style="grid-template-columns:90px 1fr"><dt>network</dt><dd class="g">'+(n==="r"?"RGHOSTCHAIN · R":n)+'</dd><dt>address</dt><dd class="h">'+E(addr)+'</dd></div><button class="btn" data-a="copy" data-v="'+E(addr)+'">Copy address</button><button class="btn ghost" data-a="close">Close</button></div>'}
/* ---------- screens ---------- */
var SCR={
 home:function(){return hdr()+strip()+bal()+bigBtn()+what()+devrows()+rtcard(true)+legacy()+nav("home")},
 untrusted:function(){var s=ctx.snap||{};return hdr()+strip()+'<div class="press"><div class="big lock"><span class="ya">Я</span>LOCKED<small>this device can’t sign</small></div></div>'+
  '<div class="card" style="border-color:var(--gm-warn)"><h4 style="color:var(--gm-warn)">NOT A TRUSTED DEVICE <em>refused before any prompt</em></h4><div class="row"><span>This device</span><span class="w">'+E(trustLbl())+'</span></div><div class="row"><span>Unlock prompt</span><span class="m">not shown</span></div><div class="row"><span>Anything sent</span><span class="ok">nothing</span></div></div>'+
  '<div class="card"><h4>SIGN FROM ONE OF YOURS</h4>'+(s.devices||[]).map(function(d){return'<div class="row"><span>'+E(d.device_id.split("-")[0])+'</span><span class="'+(d.status==="active"?"ok":"k")+'">'+E(d.status)+'</span></div>'}).join("")+'</div>'+
  '<button class="btn ghost" style="margin:6px 16px;width:auto" data-a="route">Send request to my 17e / moto</button>'+nav("home")},
 offline:function(){var s=T()?T().status():{};var q=(T()?T().ops():[]).concat((w.RMINT_ONETAP?w.RMINT_ONETAP.queue():[]).map(function(x){return{kind:"mint",t:x.t}}));
  return hdr()+strip()+'<div class="card" style="border-color:var(--gm-gold)"><h4 style="color:var(--gm-gold)">PENDING QUEUE · '+q.length+' <em>rmint.queue.v1 · rmint.ops.v1</em></h4>'+
  (q.length?q.map(function(x,i){return'<div class="row"><span class="k">Q-'+(i+1)+'</span><span>'+E(x.kind)+'</span><span class="m">'+E(String(x.t||"").slice(0,16))+'</span></div>'}).join(""):'<div class="row"><span class="m">empty</span></div>')+
  '<div class="row"><span class="m">last link</span><span>'+E(s.last?s.last[0]:"none")+'</span></div><div class="row"><span class="m">retry</span><span class="m">every 30 s · on network change · on open</span></div><div class="row"><span class="m">unsigned items</span><span class="ok">never queued</span></div></div>'+
  '<div class="card"><h4>LINKS TRIED IN ORDER</h4>'+(T()?T().ORDER:[]).map(function(k){var c=T().cfg()[k]||[];return'<div class="row"><span>'+k+'</span><span class="m">'+(k==="queue"?"always":c.length?E(c[0]).slice(0,34):"not configured")+'</span></div>'}).join("")+'</div>'+
  '<button class="btn ghost" style="margin:6px 16px;width:auto" data-a="retry">Retry now</button>'+nav("offline")},
 rtrackr:function(){return hdr()+strip()+rtcard(false)+nav("rtrackr")},
 wallets:function(){var L=w.RWALLET_LINKED?w.RWALLET_LINKED.list():[];return hdr()+'<div class="tabs"><span class="a">All wallets ('+(L.length+1)+')</span><span>Linked ('+L.length+')</span></div>'+bal()+
  '<div class="sec">NATIVE</div><div class="wl nat"><div class="ic" style="border-color:var(--gm-fg);color:#fff">Я</div><div class="tx"><b>ЯWALLET<span class="tag n">native · signs</span></b><small>'+OWNER+' · trusted device + one unlock</small></div><div class="vl">'+E(balR())+' R</div></div>'+
  '<div class="sec">LINKED · WATCH-ONLY</div>'+L.map(function(x){var W=(w.RWALLET_LINKED.wallets[x.wallet]||{icon:"◇",name:x.wallet});return'<div class="wl" data-a="ext" data-v="'+E(x.address)+'"><div class="ic">'+W.icon+'</div><div class="tx"><b>'+E(W.name)+'<span class="tag w">watch-only</span></b><small>'+E(x.chain)+' · '+E(sh(x.address))+'</small></div><div class="vl"><span class="lb" data-addr="'+E(x.address)+'">…</span><small class="m">sends open '+E(W.name)+'</small></div></div>'}).join("")+
  '<button class="addw" data-a="linksheet">＋ Link a wallet</button><div class="flt"><span class="chip on" data-a="receive">↓ Receive</span><span class="chip" data-a="holdings">Holdings ›</span></div>'+nav("wallets")},
 holdings:function(){var L=w.RWALLET_LINKED?w.RWALLET_LINKED.list():[],a=(ctx.rt&&ctx.rt.assets)||[];return hdr()+'<div class="bal" style="padding-top:10px"><div class="s">ALL WALLETS</div><div class="n">'+E(balR())+' <span class="u">R</span></div><div class="s">+ '+L.length+' linked wallet(s) in their own units · no R↔ETH/SOL rate</div></div>'+
  '<div class="tabs"><span class="a">Holdings</span></div><div class="hrow"><div class="ic">Я</div><div class="tx"><b>R</b><small>ЯWALLET · native</small></div><div class="vl">'+E(balR())+' R</div></div>'+
  L.map(function(x){return'<div class="hrow"><div class="ic">'+(x.chain==="evm"?"Ξ":"◎")+'</div><div class="tx"><b>'+(x.chain==="evm"?"ETH":"SOL")+'</b><small>'+E(x.wallet)+' · watch-only</small></div><div class="vl"><span class="lb" data-addr="'+E(x.address)+'">…</span></div></div>'}).join("")+
  a.slice(-8).reverse().map(function(x){return'<div class="hrow"><div class="ic">✦</div><div class="tx"><b>'+E(x.label||x.rid)+'</b><small>RGHOSTCHAIN · block #'+E(x.block_index)+'</small></div><div class="vl">1 item</div></div>'}).join("")+nav("wallets")},
 settings:function(){var si=S()?S().info():{signed_in:false};return hdr()+'<div class="sec">SESSION</div>'+
  '<div class="setrow"><span>ASSM '+E(si.user||"")+'</span><em>'+(si.signed_in?"Signed in · stays on until you log out":"signed out")+'</em></div>'+
  '<div class="setrow"><span>Session token</span><em>'+E(S()?S().store():"")+' · device-bound</em></div><div class="setrow"><span>Auto-logout</span><em>never</em></div><div class="setrow"><span>Per-mint unlock</span><em>always · one method</em></div>'+
  '<div class="sec" style="padding-top:16px">TRUSTED DEVICES · UNLOCK METHODS</div>'+devrows()+
  '<div class="sec" style="padding-top:16px">LINKED WALLETS</div><div class="setrow"><span>'+(w.RWALLET_LINKED?w.RWALLET_LINKED.list().length:0)+' linked</span><em>watch-only</em></div>'+
  (si.signed_in?'<button class="logout" data-a="logout">Log out of ASSM on this '+E(devName())+'</button><div class="note" style="margin:0 16px">Logging out revokes this device’s session token. Other devices stay signed in.</div>':'<button class="btn" style="margin:16px;width:auto" data-a="login">Sign in · ASSM</button>')+legacy()+nav("settings")}};
/* RDRAGON left panel: the existing csp-rwallet layout upgraded in place */
function panel(){var si=S()?S().info():{},U=w.RWALLET_UNIFIED,ad=U?U.addresses():[];
  return'<div class="pn"><div class="ttl">Anti Social Social Media</div><div class="ban" style="background-image:url('+E(w.RWALLET_BANNER||"banner.jpg")+')"><img class="crest" src="'+E(w.RWALLET_CREST||"ghostmachine-logo.jpg")+'" alt=""></div>'+
  '<div class="av" style="background-image:url('+E(w.RWALLET_AVATAR||"avatar.jpg")+')"><span class="pill l">✔ Verified</span><span class="pill r" data-a="home">&gt; Wallet</span></div><div class="nm">Rizal the Younger</div><div class="hd">'+HANDLE+'</div>'+
  '<div class="cd"><div class="ch"><span><b>@CHASERIZAL</b> · ЯID-0001</span><div class="lk" data-a="'+(si.signed_in?"settings":"login")+'">'+(si.signed_in?"Signed in · ASSM":"Sign in · ASSM")+'<br><i>'+E(trustLbl())+(trustCls()?"":" ✔")+'</i></div></div>'+
  '<div class="bl"><div class="n">'+E(balR())+' <span class="u">R</span></div><div class="s">local ledger · '+ad.length+' public address(es) · no keys held</div></div>'+
  '<div class="nets">'+netChip()+'<span class="chip">chain #'+(ctx.height!=null?ctx.height-1:"…")+'</span></div>'+
  '<div class="acts"><div data-a="send">↑ Send</div><div data-a="receive">↓ Receive</div><div class="mint1" data-a="press"><b>Я MINT · SIGN</b><small>one press · '+E(devName())+' · '+E(unlockText())+'</small></div><div style="grid-column:1/3" data-a="legacy">⛓ BOTLATCH</div></div>'+
  '<div class="rtr" data-a="rtrackr"><span>▶ RTRACKR</span><em>'+(ctx.next&&ctx.next.kind==="bind"?"#"+ctx.next.index+" pending":"#"+(ctx.height!=null?ctx.height-1:"…"))+'</em></div>'+
  '<div class="msg">'+E(ctx.msg)+'</div>'+
  '<div class="tl">'+(ad.length?ad.map(function(a){return'<div><span>'+E(a.name)+' · '+E(a.chain)+'</span><b>'+E(a.balance==null?"–":a.balance+" "+(a.unit||""))+'</b></div>'}).join(""):'<div><span>no public addresses loaded</span><b>–</b></div>')+'</div></div></div>'}
/* ---------- render + actions ---------- */
var el=null,legacyRender=null;
function mount(){return D.getElementById(w.RWALLET_MOUNT||"rw")}
function isPanel(m){return m.hasAttribute("data-panel")||(m.getBoundingClientRect().width&&m.getBoundingClientRect().width<300)}
function render(){var m=mount();if(!m)return;if(st.legacy&&legacyRender){legacyRender();addBack(m);return}
  var p=isPanel(m);if(!p&&!walletOpen(m)&&legacyRender){legacyRender();return}   // profile page with "> Wallet" closed: keep the old header
  var h=p?panel():(SCR[st.scr]||SCR.home)();
  if(ctx.sheet==="auth"||ctx.sheet==="pw")h+=authSheet();else if(ctx.sheet==="login")h+=loginSheet();else if(ctx.sheet==="receipt")h+=receiptSheet();else if(ctx.sheet==="link")h+=linkSheet();else if(ctx.sheet==="receive")h+=receiveSheet();
  m.innerHTML='<div class="rw2'+(p?" panel":"")+'">'+h+'</div>';fillBalances(m)}
function walletOpen(m){if(m.hasAttribute("data-embed"))return true;try{return!!(JSON.parse(localStorage.getItem("rdragon.csp.v2.rwallet"))||{}).w}catch(e){return true}}
D.addEventListener("click",function(e){if(e.target.closest&&e.target.closest("[data-w]"))setTimeout(render,0)});   // after rwallet-ghost.js toggles "> Wallet"
function addBack(m){if(m.querySelector(".rw2-back"))return;var b=D.createElement("div");b.className="rw2-back";b.textContent="‹ ЯWALLET 2 one-press";b.setAttribute("style","cursor:pointer;color:#39ff14;font:11px Menlo,monospace;padding:6px 10px;border-bottom:1px solid #39ff14");b.onclick=function(){st.legacy=false;save();render()};m.insertBefore(b,m.firstChild)}
function fillBalances(m){if(!w.RWALLET_LINKED)return;Array.prototype.forEach.call(m.querySelectorAll(".lb[data-addr]"),function(s){var x=w.RWALLET_LINKED.list().filter(function(y){return y.address===s.dataset.addr})[0];if(x)w.RWALLET_LINKED.balance(x).then(function(v){s.textContent=v})})}
function say(t){ctx.msg=t||"";var m=mount(),x=m&&m.querySelector(".msg");if(x)x.textContent=ctx.msg;else render()}
function doPress(factor){var u=D.getElementById("rw2-u"),p=D.getElementById("rw2-p");var o={factor:factor,user:u&&u.value,password:p&&p.value,onStatus:function(s){say(s.msg)}};if(p)p.value="";
  ctx.busy=true;ctx.sheet=null;render();return w.RMINT_PRESS.press(o).then(function(r){ctx.busy=false;o.password=null;
    if(r.ok){ctx.receipt=r;ctx.sheet="receipt";ctx.msg="";refresh()}else if(r.gate===false){ctx.msg=r.why;if(/untrusted|trust is|revoked/i.test(r.why||""))st.scr="untrusted";else ctx.sheet="login"}else if(r.queued){st.scr="offline";ctx.msg="Sealed · queued"}else{ctx.msg=r.err||(r.errors||[]).join(" ")||"not minted";if(r.locked_s)ctx.msg+=" · locked "+Math.ceil(r.locked_s/60)+" min"}
    save();render()}).catch(function(e){ctx.busy=false;say("not minted: "+e.message)})}
function onPress(){if(!(S()&&S().info().signed_in)){ctx.sheet="login";render();return}
  w.RMINT_GATE.mintGated().then(function(g){if(!g.ok){ctx.msg=g.why;if(/session|signed in|ASSM/i.test(g.why||"")&&!/untrusted|trust is|revoked/i.test(g.why||""))ctx.sheet="login";else st.scr="untrusted";save();render();return}   // gate BEFORE any prompt
    if(!ctx.factors.length){say("No signer on this page: routing to your trusted phone…");doPress(null);return}
    ctx.sheet=devName()==="Neo"&&ctx.factors.indexOf("assm")>=0?"pw":"auth";render()})}
D.addEventListener("click",function(e){var t=e.target.closest&&e.target.closest(".rw2 [data-a]");if(!t)return;var a=t.dataset.a;e.stopPropagation();
  if(SCR[a]&&a!=="untrusted"){st.scr=a;ctx.sheet=null;save();render();return}
  switch(a){case"press":onPress();break;case"untrusted":st.scr="untrusted";save();render();break;case"close":ctx.sheet=null;render();break;
   case"pw":ctx.sheet="pw";render();break;case"bio":ctx.sheet="auth";render();break;case"unlock":doPress(t.dataset.f);break;
   case"login":ctx.sheet="login";render();break;
   case"dologin":var u=D.getElementById("rw2-lu").value,p=D.getElementById("rw2-lp");var pw=p.value;p.value="";say("signing in…");
     S().login({user:u,password:pw}).then(function(r){pw=null;ctx.sheet=r.ok?null:"login";ctx.msg=r.ok?(r.offline?"Signed in offline · completes on reconnect":"Signed in · ASSM"):(r.error||r.err||"refused");render();refresh()});break;
   case"logout":S().logout().then(function(){ctx.msg="Logged out of ASSM on this device";render()});break;
   case"retry":say("retrying…");T().flush().then(function(r){say("sent "+r.sent+" · left "+r.left);render()});break;
   case"route":doPress(null);break;case"linksheet":ctx.sheet="link";render();break;case"receive":ctx.sheet="receive";render();break;
   case"rnet":st.rnet=t.dataset.n;render();break;case"copy":try{navigator.clipboard.writeText(t.dataset.v);say("copied")}catch(x){}break;
   case"link":say("opening wallet…");w.RWALLET_LINKED.link(t.dataset.w).then(function(x){ctx.sheet=null;say("linked "+x.wallet+" · watch-only");render()},function(x){say(x.message)});break;
   case"ext":if(!w.RWALLET_LINKED.openExternal(t.dataset.v))say("open that wallet to send");break;
   case"send":say("R sends: use the RWALLET functions (approval in RVAULT) · linked wallets send in their own app");break;
   case"legacy":st.legacy=true;save();render();break}},true);
w.addEventListener&&["rmint:link","rmint:queue","rmint:session","rwallet:linked"].forEach(function(n){w.addEventListener(n,function(){if(!ctx.sheet)render()})});
/* take over rwallet-ghost.js's render (kept as legacyRender for "all functions ›") */
function takeover(){var R=w.RWALLET;if(R&&R.render&&!R.__v2){legacyRender=R.render;R.render=render;R.__v2=true;R.v2={render:render,refresh:refresh,press:onPress,show:function(s){st.scr=s;save();render()}}}if(w.RWALLET_UNIFIED&&w.RWALLET_UNIFIED.ready)w.RWALLET_UNIFIED.ready.then(function(){setTimeout(render,0)});render();refresh()}
w.RWALLET2={version:"1.0",render:render,refresh:refresh,takeover:takeover};
D.readyState==="loading"?D.addEventListener("DOMContentLoaded",takeover):takeover();setInterval(refresh,60000);
})(window);
