/* RDRAGON components panel · rizal.pw · 2026-10-26 MT (rdragon-components-20261026)
   One R:\ console for the shared ЯLAB components in the browser. Client-side only: nothing here sends data anywhere.
   - /recall, /batibabox  -> RDRAGON_ENGINE.mind() (RDRAGON_MIND BATIBABOX browser port, public-safe seed only)
   - rkrypt …, RGEN …     -> RKRYPT (fused RKRYPT + RGENERATOR) via the RDOS_EXT hook, prompt R:\RKRYPT>
   - SEE, /img, /draw, audio commands -> "not ready in the browser" (a public route needs the Decider's go)
   - IMPORT TWEETBACK     -> X/Twitter archive importer (zip runs in this page; Drive REBIRTH + ЯSYNC writes not ready)
   Every reply is shown as RDRAGON. */
(function(w,d){"use strict";
var NR="<span class=\"rdc-nr\">not ready</span> in the browser — a public route needs the Decider's go. Nothing was sent.";
var DEVICES=[["Device","SEE","/img"],["iPhone 17e","Apple Vision on the phone + Neo Granite (phone Granite offline)","Neo SD-Turbo route"],["Android (Moto)","Neo route over Wi-Fi; SmolVLM-256M + on-phone text recognition offline","Neo route; not ready offline"],["Linux / Windows","SmolVLM + Granite, fully local","SD-Turbo via the C++ image engine, local"],["Ubuntu Touch","Neo route; SmolVLM offline (slow)","Neo route"],["Browser (rizal.pw)","not ready — public route needs the Decider's go","not ready — public route needs the Decider's go"]];
var AUDIO=["MAKE VOICE","MAKE VOICE LIKE","USE VOICE","MAKE INSTRUMENTAL","MAKE INSTRUMENTAL LIKE","MAKE MUSIC LIKE","SAY","SING","RAP","RHYME","/music","/listen"];
var STATUS={"edit":"ready · owner only · plain English (delete/remove/erase/clear, change/set/replace, add + about/bio sources/links/name/location/link/joined or a phrase) · edit (inline mode, Save/Cancel) · edit save · edit cancel · edit about <text> · edit links · edit link add <label> <url> · edit link <n> <label> <url> · edit link remove <n> · preview + y/n before saving","logout":"ready · ends this browser session (aliases: log out, signout, sign out, exit) · saved login stays","SEE":"not ready (browser)","/img":"not ready (browser) · SD2 Turbo on Neo","/draw":"not ready (browser) · SD2 Turbo on Neo","audio":"planned · not ready (browser)",
 "/recall":"ready (this browser's memory)","/batibabox":"ready","rkrypt / RGEN":"ready (no keys held; approvals go to ЯCASKET)","ЯSYNC":"off by default","IMPORT TWEETBACK":"zip import ready · Drive REBIRTH not ready · ЯSYNC profile write not ready"};
function neutral(s){s=String(s||"");s=s.replace(/approve\s*:\s*['"]?[^'"\n<]*ЯCASKET[^'"\n<]*/gi,"approve: ⚿ approving…").replace(/[^\n<>"]*→\s*ЯCASKET\s*→[^\n<>"]*/g,"⚿ approving…");
 s=s.replace(/\(?\s*(?:password\s*[|\/]\s*)?(?:Face ID|Touch ID|fingerprint|biometric)(?:\s*[|\/]\s*(?:Face ID|fingerprint|device passcode|password))*\s*\)?(?:\s*approval)?/gi,"⚿ approving…");
 return s.replace(/ЯBOWZR|ЯBOT/g,"ЯLAB app").replace(/⚿ approving…(\s*⚿ approving…)+/g,"⚿ approving…")}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function table(){return '<table class="rdc-t">'+DEVICES.map(function(r,i){var t=i?"td":"th";return "<tr>"+r.map(function(x){return "<"+t+">"+esc(x)+"</"+t+">"}).join("")+"</tr>"}).join("")+"</table>"}
function isAudio(l){var u=l.toUpperCase().replace(/^\//,""),hit="";AUDIO.forEach(function(a){var b=a.replace(/^\//,"");if((u===b||u.indexOf(b+" ")===0)&&b.length>hit.length)hit=a});return hit}
var EDP=null;
function EH(){return "<b>edit</b> (owner only):<br>plain English works too, with a preview + y/n: <i>delete everything from bio sources</i> · <i>remove &lt;phrase&gt; from about</i> · <i>change location to …</i> · <i>replace X with Y</i> · <i>add link Shop https://…</i><br>edit — inline edit mode on the profile (Save / Cancel bar)<br>edit save · edit cancel · edit help<br>subcommands below show a preview + y/n:<br>edit about &lt;text&gt; — replace the About text<br>edit links — list links<br>edit link add &lt;label&gt; &lt;url&gt;<br>edit link &lt;n&gt; &lt;label&gt; &lt;url&gt;<br>edit link remove &lt;n&gt;";}
function ELS(a){return a.length?a.map(function(x,i){return (i+1)+". "+esc(x.label)+" — "+esc(x.url)}).join("<br>"):"(no links yet)";}
function editCmd(l){var C=w.RDRAGON_CSP;if(!C||!C.editGet)return "edit not ready on this page yet · reload and try again.";var rest=l.replace(/^edit\b\s*/i,"");if(!C.canEdit())return "sign in to edit";if(/^(help|\?)$/i.test(rest))return EH();if(!rest){if(!C.editMode)return EH();var em=C.editMode();return em.ok?"edit mode on · click any text above Message/Follow (name, handle, bio, links, bio sources, location, link, joined) and change it · then press <b>Save</b> (signed + synced) or <b>Cancel</b>. Or type <code>edit save</code> / <code>edit cancel</code>.<br>"+EH():esc(em.msg);}
 if(/^save$/i.test(rest)){var sv=C.editSave();return sv.ok?(sv.changed.length?"saved "+esc(sv.changed.join(", "))+(sv.signed?" · signed ЯSYNC profile.update queued to sync":" · saved in this browser"):"no changes · edit mode off"):esc(sv.msg);}
 if(/^cancel$/i.test(rest)){var cc=C.editCancel();return cc.ok?"edit cancelled · nothing saved.":esc(cc.msg);}var cur=C.editGet(),m,L=cur.links.slice(),U=/^https?:\/\/\S+$/i;
 if((m=rest.match(/^about\s+([\s\S]+)$/i))){var t=m[1].trim().slice(0,600);EDP={k:"bio",v:t};return "preview About:<br><i>"+esc(t)+"</i><br>was: "+esc(cur.bio)+"<br>save? (y/n)";}
 if(/^links?$/i.test(rest))return "links:<br>"+ELS(L);
 if((m=rest.match(/^link\s+add\s+(.+)\s+(\S+)$/i))){if(!U.test(m[2]))return "url must start with http:// or https://";L.push({label:m[1].trim(),url:m[2]});}
 else if((m=rest.match(/^link\s+remove\s+(\d+)$/i))){var r=+m[1];if(r<1||r>L.length)return "no link "+r+" · type edit links";L.splice(r-1,1);}
 else if((m=rest.match(/^link\s+(\d+)\s+(.+)\s+(\S+)$/i))){var n=+m[1];if(n<1||n>L.length)return "no link "+n+" · type edit links";if(!U.test(m[3]))return "url must start with http:// or https://";L[n-1]={label:m[2].trim(),url:m[3]};}
 else return EH();
 EDP={k:"links",v:L};return "preview links:<br>"+ELS(L)+"<br>save? (y/n)";}
function editConfirm(l){var C=w.RDRAGON_CSP,p=EDP;EDP=null;if(!/^(y|yes)$/i.test(l))return "edit cancelled · nothing saved.";var L=p.ops||[{k:p.k,v:p.v}],r={ok:true};for(var i=0;i<L.length&&r.ok;i++){var r1=C&&C.editSet?C.editSet(L[i].k,L[i].v):{ok:false,msg:"edit not ready"};if(!r1.ok||i===L.length-1)r=r1}return r.ok?"saved"+(r.signed?" · signed ЯSYNC profile.update queued to sync":" · saved in this browser (signs + syncs when this device's ЯSYNC key is ready)")+" · profile updated.":esc(r.msg);}
var NLT=[[/^(?:bio\s*sources?|biosources?|socials?|sources|bio\s*source\s+block)$/,"biosrc"],[/^(?:about(?:\s+me)?|bio|about\s+text)$/,"bio"],[/^links?\s+list$|^links$/,"links"],[/^(?:display\s+)?name$/,"name"],[/^location$/,"location"],[/^(?:link|website|link\s+field)$/,"link"],[/^joined(?:\s+date)?$/,"joined"]];
var NLN={biosrc:"bio sources",bio:"About",links:"links",name:"name",location:"location",link:"link",joined:"joined"};
function nlNorm(s){return String(s).replace(/Я/g,"R").replace(/я/g,"r").toLowerCase()}
function nlTgt(s){s=nlNorm(s).trim().replace(/^(?:the|my|our)\s+/,"").replace(/\s+(?:section|block|list|line|lines|field|part|area)$/,"").trim();for(var i=0;i<NLT.length;i++)if(NLT[i][0].test(s))return NLT[i][1];return null}
function nlAll(p){return /^(?:everything|all|it|all of it|all of them|anything|the whole thing|whole thing|everything in it)$/i.test(String(p).trim())}
function nlQ(p){return String(p).trim().replace(/^["'“‘](.*)["'”’]$/,"$1").trim()}
function nlText(W,k){return k==="links"?W.links.map(function(x){return x.label+" "+x.url}).join("\n"):String(W[k]||"")}
function nlHas(W,k,p){return nlNorm(nlText(W,k)).indexOf(nlNorm(p))>=0}
function nlCut(W,k,p){var n=nlNorm(p);if(k==="links"){W.links=W.links.filter(function(x){return nlNorm(x.label+" "+x.url).indexOf(n)<0});return}
 if(k==="biosrc"){W.biosrc=W.biosrc.split("\n").filter(function(x){return nlNorm(x).indexOf(n)<0}).join("\n");return}
 var t=String(W[k]||""),i=nlNorm(t).indexOf(n);if(i<0)return;t=(t.slice(0,i)+t.slice(i+p.length)).replace(/\s*([|·])\s*([|·])\s*/g," $1 ").replace(/^\s*[|·]\s*|\s*[|·]\s*$/g,"").replace(/\s{2,}/g," ").trim();W[k]=t}
function nlRep(W,k,p,q){var t=nlText(W,k),i=nlNorm(t).indexOf(nlNorm(p));if(i<0)return false;t=t.slice(0,i)+q+t.slice(i+p.length);if(k==="links")W.links=t.split("\n").map(function(x){var m=x.match(/^(.*\S)\s+(https?:\/\/\S+)$/);return m?{label:m[1],url:m[2]}:null}).filter(Boolean);else W[k]=t;return true}
var NLF=["bio","name","location","link","joined","links","biosrc"];
function nlFind(W,p,pref){if(pref&&nlHas(W,pref,p))return pref;for(var i=0;i<NLF.length;i++)if(nlHas(W,NLF[i],p))return NLF[i];return null}
function nlParse(line,cur){var l=String(line).trim().replace(/[.!]+$/,"").replace(/^(?:please\s+|can you\s+|could you\s+)/i,""),m,W=JSON.parse(JSON.stringify(cur)),notes=[],did=false;
 W.links=W.links||[];W.biosrc=W.biosrc||"";
 if((m=l.match(/^(delete|remove|erase|clear|wipe|drop|get rid of)\s+([\s\S]+)$/i))){
  m[2].split(/\s+and\s+|\s*,\s*/i).forEach(function(part){part=part.trim();if(!part)return;var f=null,ph=part,mm=part.match(/^([\s\S]*?)\s+(?:from|in|on|out of|inside)\s+([\s\S]+)$/i);
   if(mm&&nlTgt(mm[2])){ph=mm[1];f=nlTgt(mm[2])}
   ph=nlQ(ph);
   if(!ph||nlAll(ph)){if(f){W[f]=f==="links"?[]:"";did=true}else notes.push("delete what? name a section");return}
   var t=nlTgt(ph);if(t&&!f){W[t]=t==="links"?[]:"";did=true;return}
   var k=nlFind(W,ph,f);
   if(k){nlCut(W,k,ph);did=true;return}
   if(/pending|r?casket|signature|bio\s*sources?|rid-|\brid\b/i.test(nlNorm(ph))&&cur.biosrcShown!==false){W.biosrc="";did=true;notes.push("\""+ph+"\" is part of the bio sources block · that block will be removed");return}
   notes.push("couldn't find \""+ph+"\""+(f?" in "+NLN[f]:"")+" · nothing changed for it")});
 } else if((m=l.match(/^replace\s+([\s\S]+?)\s+with\s+([\s\S]+?)(?:\s+(?:in|on)\s+([\s\S]+))?$/i))){var f=m[3]?nlTgt(m[3]):null,p=nlQ(m[1]),q=nlQ(m[2]),k=nlTgt(p)&&!f?null:nlFind(W,p,f);
   if(!k&&nlTgt(p)){k=nlTgt(p);W[k]=k==="links"?W[k]:q;did=k!=="links"}else if(k){did=nlRep(W,k,p,q)}else notes.push("couldn't find \""+p+"\"");
 } else if((m=l.match(/^(?:change|set|update|make)\s+([\s\S]+?)\s+(?:to|=|as|into)\s+([\s\S]+)$/i))){var k=nlTgt(m[1]),q=nlQ(m[2]);
   if(k&&k!=="links"){W[k]=q;did=true}else{var p=nlQ(m[1]),kk=nlFind(W,p,null);if(kk){did=nlRep(W,kk,p,q)}else notes.push(k==="links"?"use edit link <n> <label> <url> for links":"couldn't find \""+p+"\"")}
 } else if((m=l.match(/^add\s+([\s\S]+)$/i))){var r=m[1].trim(),mm;
   if((mm=r.match(/^(?:a\s+)?(?:new\s+)?link\s+(.+?)\s+(https?:\/\/\S+)$/i))||(mm=r.match(/^(.+?)\s+(https?:\/\/\S+)(?:\s+to\s+(?:the\s+)?links)?$/i))){W.links.push({label:nlQ(mm[1]),url:mm[2]});did=true}
   else if((mm=r.match(/^([\s\S]+?)\s+to\s+([\s\S]+)$/i))&&nlTgt(mm[2])){var k=nlTgt(mm[2]),q=nlQ(mm[1]);if(k==="links"){notes.push("links need a url: add link <label> <https://…>")}else{W[k]=k==="biosrc"?(W.biosrc?W.biosrc+"\n":"")+q:(W[k]?W[k]+" ":"")+q;did=true}}
   else notes.push("add what where? e.g. add link Shop https://… · add <text> to about");
 } else return null;
 var ops=[];NLF.forEach(function(k){var a=k==="links"?JSON.stringify(cur.links||[]):String(cur[k]||""),b=k==="links"?JSON.stringify(W.links):String(W[k]||"");if(a!==b)ops.push({k:k,v:k==="links"?W.links:W[k],was:k==="links"?cur.links:cur[k]})});
 return {ops:ops,notes:notes};}

var NLV=/^(?:please\s+|can you\s+|could you\s+)?(delete|remove|erase|clear|wipe|drop|get rid of|replace|change|set|update|make|add)\b/i;
function nlShow(k,v){if(k==="links")return v&&v.length?v.map(function(x,i){return (i+1)+". "+esc(x.label)+" — "+esc(x.url)}).join("<br>"):"(no links)";v=String(v||"");return v?esc(v).replace(/\n/g,"<br>"):(k==="biosrc"?"(empty · bio sources block hidden)":"(empty)")}
function nlCmd(l){var C=w.RDRAGON_CSP;if(!NLV.test(l))return null;if(!C||!C.editGet)return null;var res=nlParse(l,C.editGet());if(!res)return null;if(!C.canEdit())return "sign in to edit";
 var nt=res.notes.length?"<br><i>"+res.notes.map(esc).join("<br>")+"</i>":"";
 if(!res.ops.length&&/bio\s*sources?|caske?t/i.test(nlNorm(l)))return "already done · bio sources is empty and its block (incl. \"pending ЯCASKET signature\") is hidden · nothing to save.";
 if(!res.ops.length)return "nothing to change"+nt+"<br>try: <code>delete &lt;phrase&gt; from about</code> · <code>change location to …</code> · <code>edit help</code>";
 EDP={ops:res.ops};return "preview:<br>"+res.ops.map(function(o){return "<b>"+NLN[o.k]+"</b>: "+nlShow(o.k,o.v)+"<br><span class=\"rdc-dim\">was: "+nlShow(o.k,o.was)+"</span>"}).join("<br>")+nt+"<br>save? (y/n)";}
var KNOWN=["help","edit","edit help","edit about","edit links","edit save","edit cancel","logout","/recall","rkrypt help","import","see","/img","audio"];
function lev(a,b){var m=[],i,j;for(i=0;i<=a.length;i++){m[i]=[i];for(j=1;j<=b.length;j++)m[i][j]=i?Math.min(m[i-1][j]+1,m[i][j-1]+1,m[i-1][j-1]+(a[i-1]===b[j-1]?0:1)):j}return m[a.length][b.length]}
function closest(l){var x=String(l).toLowerCase().trim(),best=null,bd=1e9;KNOWN.forEach(function(c){var d=lev(x.slice(0,c.length+3),c);if(d<bd){bd=d;best=c}});return best}
async function run(line){var l=String(line||"").trim(),h=l.split(/\s+/)[0].toLowerCase();if(EDP&&/^(y|yes|n|no)$/i.test(l))return editConfirm(l);if(EDP)EDP=null;if(h==="edit")return editCmd(l);if(/^(logout|log out|signout|sign out|exit)(\s+--forget)?$/i.test(l)){if(/--forget/i.test(l))return "<b>--forget</b> is not available yet · your saved login on this browser was kept. Nothing was deleted.";var C=w.RDRAGON_CSP;if(!C||!C.logoutHere)return "logout not ready on this page yet · reload and try again.";var r=await C.logoutHere();return r==="none"?"you are not signed in on this browser.":"logged out on this browser · your saved login (ЯCASKET / device record) was kept · sign in again any time.";}if(!l)return "";
 if(/^(see|\/see)$/.test(h))return "SEE: "+NR+table();
 if(h==="/img"||h==="/draw")return h+" (SD2 Turbo): "+NR+table();
 var au=isAudio(l);if(au)return au+": planned — "+NR+" Audio/voice uploads as LIKE examples stay on this device.";
 if(h==="help"||h==="/help")return "<pre>"+esc(Object.keys(STATUS).map(function(k){return k+"  ·  "+STATUS[k]}).join("\n")+"\naudio: "+AUDIO.join(", "))+"</pre>"+table();
 if(h==="import"||h==="tweetback"){openTbi();return "R:\\IMPORT TWEETBACK opened below."}
 if(/^\/?(rkrypt|rgen)$/.test(h)&&w.RKRYPT){var out="";await w.RKRYPT.rdos(l,function(x){out=x});return neutral(out)||"⚿ approving…"}
 if((h==="/recall"||h==="/batibabox")&&w.RDRAGON_ENGINE&&w.RDRAGON_ENGINE.mind){try{var M=await w.RDRAGON_ENGINE.mind(),who=(w.RDRAGON_CSP&&w.RDRAGON_CSP&&typeof w.RDRAGON_CSP.me==="function"&&w.RDRAGON_CSP.me()&&w.RDRAGON_CSP.me().pub)||"public",r=M&&M.command?await M.command(who,l):null;if(r!=null)return "<pre>"+esc(typeof r==="string"?r:(r.text||JSON.stringify(r,null,1)))+"</pre>"}catch(e){}return h+": memory is empty on this browser."}
 if(h==="/recall"||h==="/batibabox")return h+": BATIBABOX is still loading.";
 var nq=nlCmd(l);if(nq!=null)return nq;
 if(w.RDRAGON_REPLY&&typeof w.RDRAGON_REPLY.ask==="function"){try{var a=await w.RDRAGON_REPLY.ask(l);if(a)return esc(a.text||a)}catch(e){}}
 return NLV.test(l)?"I couldn't work out that edit · try <code>delete &lt;phrase&gt; from about</code>, <code>change location to …</code>, <code>remove bio sources</code> or <code>edit help</code>":"not sure what you meant · closest command: <code>"+esc(closest(l))+"</code> · type help.";}
var tbiLoaded=false;
function openTbi(){var box=d.getElementById("rdc-tbi");box.style.display="block";if(tbiLoaded)return;tbiLoaded=true;
 var s1=d.createElement("script");s1.src="/tweetback/tbi-core.js";s1.onload=function(){var s2=d.createElement("script");s2.src="/tweetback/tbi-panel.js";s2.onload=function(){w.TBI_PANEL.mount(box);lockTbi(box)};d.head.appendChild(s2)};d.head.appendChild(s1)}
function lockTbi(box){var lab=function(el,txt){if(!el)return;el.disabled=true;el.title=txt;el.textContent=el.textContent+" — not ready"};
 lab(box.querySelector('[data-k="rebirth"]'),"Drive-link REBIRTH needs a helper app; not ready on the public site");
 var ta=box.querySelector('[data-k="links"]');if(ta){ta.disabled=true;ta.placeholder="not ready on rizal.pw — use the zip import above"}
 new MutationObserver(function(){lab(box.querySelector('[data-k="live"]:not([disabled])'),"ЯSYNC profile writes are not ready (need the Decider's go)")}).observe(box,{childList:true,subtree:true})}
function mount(){if(d.getElementById("rdc"))return;var st=d.createElement("style");st.textContent=".rdc-b{position:fixed;right:12px;bottom:12px;z-index:9998;background:#000;color:#39ff14;border:1px solid #39ff14;font:11px Menlo,Consolas,\"Courier New\",monospace;padding:2px 8px;cursor:pointer}.rdc-b:hover,#rdc button:hover{border-color:#8a2be2;color:#b388ff}#rdc{position:fixed;right:12px;bottom:40px;z-index:9999;width:min(560px,94vw);max-height:70vh;overflow:auto;background:#000;color:#39ff14;border:1px solid #39ff14;padding:8px;font:12.5px/1.5 Menlo,Consolas,\"Courier New\",monospace;display:none}#rdc input,#rdc textarea{width:100%;box-sizing:border-box;background:#000;color:#39ff14;border:1px solid #39ff14;font:inherit;padding:4px}#rdc code,#rdc pre{color:#39ff14;background:#000;font:inherit}#rdc .rdc-o{margin:6px 0}#rdc .rdc-r b{color:#c9a227}#rdc .rdc-nr{color:#c9a227}.rdc-t{border-collapse:collapse;font-size:11px;margin-top:6px}.rdc-t td,.rdc-t th{border:1px solid #39ff14;padding:2px 5px;text-align:left}.rdc-t th{color:#c9a227}#rdc-tbi .tbi{background:#000!important;color:#39ff14!important;border:1px solid #39ff14!important;border-radius:0!important;font:inherit!important;max-width:none!important;padding:8px!important}#rdc-tbi .tbi button{background:#000!important;color:#39ff14!important;border:1px solid #39ff14!important;border-radius:0!important;font:11px Menlo,Consolas,monospace!important;padding:2px 8px!important;font-weight:400!important}#rdc-tbi .tbi button:disabled{color:#c9a227!important;border-color:#c9a227!important;cursor:not-allowed}#rdc-tbi .tbi .drop{border:1px dashed #39ff14!important;border-radius:0!important}#rdc-tbi .tbi small,#rdc-tbi .tbi pre{color:#39ff14!important;background:#000!important}#rdc-tbi .tbi .post{border-left-color:#39ff14!important}#rdc-tbi .tbi .tile rect{fill:#000;stroke:#39ff14}";d.head.appendChild(st);
 var b=d.createElement("button");b.className="rdc-b";b.textContent="R:\\>";b.title="RDRAGON components";
 var p=d.createElement("div");p.id="rdc";p.innerHTML='<div><b>R:\\&gt;</b> RDRAGON · type <code>help</code>, <code>/recall</code>, <code>rkrypt help</code>, <code>import</code> <button type="button" class="rdc-ed" style="display:none;float:right;margin-left:6px">Edit</button><button type="button" class="rdc-lo" style="display:none;float:right">Log out</button></div><div class="rdc-o"></div><div class="rdc-p">R:\\&gt;</div><input aria-label="R:\\ prompt" autocomplete="off"><div id="rdc-tbi" style="display:none;margin-top:8px"></div>';
 b.onclick=function(){p.style.display=p.style.display==="block"?"none":"block";if(p.style.display==="block")p.querySelector("input").focus()};
 var lo=p.querySelector(".rdc-lo"),edb=p.querySelector(".rdc-ed");edb.onclick=async function(){var t=await run("edit");var r=d.createElement("div");r.className="rdc-r";r.innerHTML="<div>R:\\&gt; edit</div><b>RDRAGON</b> "+t;p.querySelector(".rdc-o").appendChild(r)};function loShow(){var C=w.RDRAGON_CSP,m=C&&typeof C.me==="function"?C.me():null;lo.style.display=m?"inline-block":"none";edb.style.display=C&&C.canEdit&&C.canEdit()?"inline-block":"none"}setInterval(loShow,2000);loShow();lo.onclick=async function(){var t=await run("logout");var r=d.createElement("div");r.className="rdc-r";r.innerHTML="<div>R:\\&gt; logout</div><b>RDRAGON</b> "+t;p.querySelector(".rdc-o").appendChild(r);loShow()};
 var inp=p.querySelector("input"),out=p.querySelector(".rdc-o"),pr=p.querySelector(".rdc-p");
 inp.addEventListener("input",function(){pr.textContent=/^\/?(rkrypt|rgen)\b/i.test(inp.value)?"R:\\RKRYPT>":"R:\\>"});
 inp.addEventListener("keydown",async function(e){if(e.key!=="Enter")return;var v=inp.value;inp.value="";pr.textContent="R:\\>";var row=d.createElement("div");row.className="rdc-r";row.innerHTML="<div>R:\\&gt; "+esc(v)+"</div><b>RDRAGON</b> …";out.appendChild(row);var r=await run(v);row.innerHTML="<div>R:\\&gt; "+esc(v)+"</div><b>RDRAGON</b> "+r;p.scrollTop=1e9});
 d.body.appendChild(b);d.body.appendChild(p)}
w.RDRAGON_COMPONENTS={nlParse:nlParse,run:run,status:STATUS,devices:DEVICES,audio:AUDIO,openTbi:openTbi};
(w.RDOS_EXT=w.RDOS_EXT||[]).push({name:"rdragon-components",match:/^\/?(see|img|draw|music|listen|make|use|say|sing|rap|rhyme|tweetback)\b/i,run:function(l,add){return run(l).then(function(r){if(add)add(r);return {ok:true,html:r}})},help:["SEE","/img","/draw","MAKE VOICE …","import"]});
if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",mount);else mount();
})(window,document);
