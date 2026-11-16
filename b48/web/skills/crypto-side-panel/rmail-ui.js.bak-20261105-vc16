/* rmail-ui.js v1 20261104 - RMAIL crypto mail UI (Inbox/Outbox/Sent/Verified/Guest, reader, compose). Needs rsocial-rmail.js v2 (window.RSOCIAL). Public data only, no keys.
   Opens from: the ✉ bottom-nav tab [data-a=nav][data-n=msgs], Message buttons (.csp-msgbtn, [data-a=dm]), [data-rmail], or RMAIL_UI.open(). */
(function(){if(window.RMAIL_UI)return;
function J(k,d){try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}}function W(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function E(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return"&#"+c.charCodeAt(0)+";"})}
function R(){return window.RSOCIAL}
function css(){if(document.getElementById("rmail-ui-css"))return;var s=document.querySelector('script[src*="rmail-ui.js"]'),l=document.createElement("link");l.id="rmail-ui-css";l.rel="stylesheet";l.href=(s?s.src.replace(/[^/]*$/,""):"/")+"rmail-ui.css?v=2";document.head.appendChild(l)}
var S={f:"inbox",sel:null,cmp:null},el;
function me(){var r=R();return r?r.me():{handle:"guest",addr:"guest"}}
function myAddr(){var r=R(),I=me();return I.handle==="guest"?(r&&r.addrOf("@chaserizal"))||I.addr:I.addr}
function all(){var b=J("rmail.box",{}),o=(R()&&R().outbox())||[],seen={},out=[];Object.keys(b).forEach(function(k){(b[k]||[]).forEach(function(m){if(!seen[m.id]){seen[m.id]=1;out.push(m)}})});
  o.forEach(function(m){if(!seen[m.id]){seen[m.id]=1;out.push(m)}else out.forEach(function(x){if(x.id===m.id)x.sent=m.sent})});return out.sort(function(a,b){return b.ts-a.ts})}
function parse(m){var t=String(m.text||""),x=/^Subject: (.*)\n\n?([\s\S]*)$/.exec(t);return x?{s:x[1]||"(no subject)",b:x[2]}:{s:t.split("\n")[0].slice(0,80)||"(no subject)",b:t}}
function read(){return J("rmail.read",{})}
function mine(m){var a=me().addr;return m.from_addr===a}
function status(m){if(!mine(m))return m.via?"received · "+m.via:"received";if(!m.sent)return"queued (offline outbox)";return(window.RMAIL_RNS_TO?"relayed · transponder + mesh":"relayed · transponder")+(window.RMAIL_URL?" + public inbox":"")}
function folders(){var L=all(),rd=read(),A=myAddr(),ob=(R()&&R().outbox())||[];
  var inb=L.filter(function(m){return m.to_addr===A&&!mine(m)});
  return{inbox:{n:"Inbox",l:inb,u:inb.filter(function(m){return!rd[m.id]}).length},
   outbox:{n:"Outbox",l:L.filter(function(m){return mine(m)&&ob.some(function(o){return o.id===m.id&&!o.sent})})},
   sent:{n:"Sent",l:L.filter(function(m){return mine(m)&&ob.some(function(o){return o.id===m.id&&o.sent})})},
   verified:{n:"✔ Verified",l:L.filter(function(m){return m.verified})},
   guest:{n:"Guest / unverified",l:L.filter(function(m){return!m.verified})}}}
function badge(m){return m.verified?'<span class="rmu-v ok" title="signed by a trusted RWALLET device">✔ verified</span>':'<span class="rmu-v no" title="'+E(m.trust||"unverified")+'">'+(String(m.from_addr||"").indexOf("guest")===0?"guest":"unverified")+'</span>'}
function short(a){a=String(a||"");return a.length>18?a.slice(0,6)+"…"+a.slice(-6):a}
function who(m){return mine(m)?"→ "+(m.to&&m.to!==m.to_addr?m.to+" ":"")+short(m.to_addr):(m.from&&m.from!=="guest"?m.from+" ":"")+short(m.from_addr)}
function tm(t){var d=new Date(t);return d.toDateString()===new Date().toDateString()?d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):d.toLocaleDateString()}
function draw(){if(!el)return;var F=folders(),cur=F[S.f],I=me(),sel=S.sel&&all().filter(function(m){return m.id===S.sel})[0];
  var nav='<div class="rmu-h">FOLDERS</div>'+["inbox","outbox","sent"].map(f).join("")+'<div class="rmu-h">FILTERS</div>'+["verified","guest"].map(f).join("");
  function f(k){var x=F[k],n=k==="inbox"?x.u:(k==="outbox"?x.l.length:0);return'<div class="rmu-f'+(S.f===k?" on":"")+'" data-rf="'+k+'"><span>'+x.n+'</span>'+(n?"<i>"+n+"</i>":"")+'</div>'}
  var list=cur.l.length?cur.l.map(function(m){var p=parse(m),u=S.f==="inbox"&&!read()[m.id];return'<div class="rmu-it'+(u?" unread":"")+(S.sel===m.id?" on":"")+'" data-rm="'+E(m.id)+'"><div class="rmu-a">'+E(who(m))+'</div><div class="rmu-s">'+E(p.s)+'</div><div class="rmu-m"><span>'+tm(m.ts)+'</span>'+badge(m)+'</div></div>'}).join(""):'<div class="rmu-empty">no mail in '+E(cur.n)+'</div>';
  var pane;if(S.cmp){pane='<div class="rmu-cmp"><h3>Compose</h3><label>From (RWALLET)</label><input readonly value="'+E(I.addr)+(I.handle==="guest"?' (guest · unverified)':'')+'"><label>To — wallet address or @handle</label><input id="rmu-to" value="'+E(S.cmp.to||"")+'"><label>Subject</label><input id="rmu-sub" value="'+E(S.cmp.sub||"")+'"><label>Body</label><textarea id="rmu-body"></textarea><p><button class="rmu-btn" data-ra="send">Send ⇡</button> <button class="rmu-btn p" data-ra="cancel">Cancel</button> <span class="rmu-st" id="rmu-cst"></span></p></div>'}
  else if(sel){var p=parse(sel);if(!mine(sel)){var r=read();r[sel.id]=1;W("rmail.read",r)}pane='<h3>'+E(p.s)+'</h3>'+badge(sel)+'<div class="rmu-kv"><b>from</b> '+E(sel.from||"")+' '+E(sel.from_addr)+'</div><div class="rmu-kv"><b>to</b> '+E(sel.to||"")+' '+E(sel.to_addr)+'</div><div class="rmu-kv"><b>time</b> '+new Date(sel.ts).toLocaleString()+'</div><div class="rmu-kv"><b>device</b> '+E(sel.from_device||"—")+' · <b>trust</b> '+E(sel.trust||"unverified")+'</div><div class="rmu-kv"><b>status</b> <span class="rmu-st'+(sel.sent||!mine(sel)?"":" q")+'">'+E(status(sel))+'</span></div><pre>'+E(p.b)+'</pre><p><button class="rmu-btn" data-ra="reply">Reply</button> <button class="rmu-btn p" data-ra="back">Back</button></p>'}
  else pane='<div class="rmu-empty">select a message · RMAIL is keyed to your RWALLET address</div>';
  el.innerHTML='<div class="rmu'+(sel||S.cmp?" reading":"")+'"><div class="rmu-top"><b>✉ RMAIL</b><span class="rmu-me">'+E(I.handle)+' · '+E(I.addr)+'</span><button class="rmu-btn" data-ra="new">Compose</button><button class="rmu-btn p" data-ra="sync">Sync</button><button class="rmu-btn p" data-ra="close">✕</button></div><div class="rmu-nav">'+nav+'</div><div class="rmu-list">'+list+'</div><div class="rmu-read">'+pane+'</div></div>';
  navBadge(F.inbox.u)}
function navBadge(n){document.querySelectorAll('[data-a="nav"][data-n="msgs"]').forEach(function(b){var s=b.querySelector(".rmu-nb");if(!s){s=document.createElement("sup");s.className="rmu-nb";s.style.cssText="color:#39ff14;font-size:9px;margin-left:2px";b.appendChild(s)}s.textContent=n?String(n):""})}
function open(o){css();if(!el){el=document.createElement("div");el.id="rmail-ui";document.body.appendChild(el);
  el.addEventListener("click",function(e){var t=e.target.closest("[data-rf],[data-rm],[data-ra]");if(e.target===el)return close();if(!t)return;
    if(t.dataset.rf){S.f=t.dataset.rf;S.sel=null;S.cmp=null}else if(t.dataset.rm){S.sel=t.dataset.rm;S.cmp=null}
    else{var a=t.dataset.ra;if(a==="close")return close();if(a==="new")S.cmp={};if(a==="cancel"||a==="back"){S.cmp=null;S.sel=null}
      if(a==="sync"&&R())R().flush().then(draw);
      if(a==="reply"){var m=all().filter(function(x){return x.id===S.sel})[0];if(m)S.cmp={to:mine(m)?(m.to||m.to_addr):(m.from&&m.from!=="guest"?m.from:m.from_addr),sub:"Re: "+parse(m).s}}
      if(a==="send"){var to=document.getElementById("rmu-to").value.trim()||"@chaserizal",sub=document.getElementById("rmu-sub").value.trim(),body=document.getElementById("rmu-body").value,st=document.getElementById("rmu-cst");
        if(!body.trim()&&!sub)return;if(!R()){st.textContent="RMAIL engine not loaded";return}st.textContent="sending…";
        R().send(to,"Subject: "+(sub||"(no subject)")+"\n\n"+body).then(function(r){S.cmp=null;S.f=r&&r.delivered?"sent":"outbox";S.sel=r&&r.msg.id;draw()});return}}
    draw()})}
  S.cmp=o&&o.compose?{to:o.to||"",sub:o.sub||""}:S.cmp;el.classList.add("open");draw()}
function close(){if(el)el.classList.remove("open")}
document.addEventListener("click",function(e){var t=e.target&&e.target.closest;if(!t)return;
  var nav=e.target.closest('[data-a="nav"][data-n="msgs"],[data-rmail]');if(nav){e.preventDefault();e.stopPropagation();open();return}
  var m=e.target.closest('.csp-msgbtn,[data-a="dm"]');if(m){e.preventDefault();e.stopPropagation();var h=m.getAttribute("data-h")||m.getAttribute("data-handle")||((document.querySelector(".csp-ph,.csp-handle")||{}).textContent||"").trim()||"@chaserizal";
    open({compose:true,to:/^@|^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(h)?h:"@chaserizal"})}},true);
window.RMAIL_UI={v:1,open:open,close:close,draw:draw,folders:folders};
setInterval(function(){if(el&&el.classList.contains("open"))return;try{navBadge(folders().inbox.u)}catch(e){}},5000)})();
