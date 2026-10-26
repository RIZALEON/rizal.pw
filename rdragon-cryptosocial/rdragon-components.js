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
var STATUS={"SEE":"not ready (browser)","/img":"not ready (browser) · SD2 Turbo on Neo","/draw":"not ready (browser) · SD2 Turbo on Neo","audio":"planned · not ready (browser)",
 "/recall":"ready (this browser's memory)","/batibabox":"ready","rkrypt / RGEN":"ready (no keys held; approvals go to ЯCASKET)","ЯSYNC":"off by default","IMPORT TWEETBACK":"zip import ready · Drive REBIRTH not ready · ЯSYNC profile write not ready"};
function neutral(s){s=String(s||"");s=s.replace(/approve\s*:\s*['"]?[^'"\n<]*ЯCASKET[^'"\n<]*/gi,"approve: ⚿ approving…").replace(/[^\n<>"]*→\s*ЯCASKET\s*→[^\n<>"]*/g,"⚿ approving…");
 s=s.replace(/\(?\s*(?:password\s*[|\/]\s*)?(?:Face ID|Touch ID|fingerprint|biometric)(?:\s*[|\/]\s*(?:Face ID|fingerprint|device passcode|password))*\s*\)?(?:\s*approval)?/gi,"⚿ approving…");
 return s.replace(/ЯBOWZR|ЯBOT/g,"ЯLAB app").replace(/⚿ approving…(\s*⚿ approving…)+/g,"⚿ approving…")}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function table(){return '<table class="rdc-t">'+DEVICES.map(function(r,i){var t=i?"td":"th";return "<tr>"+r.map(function(x){return "<"+t+">"+esc(x)+"</"+t+">"}).join("")+"</tr>"}).join("")+"</table>"}
function isAudio(l){var u=l.toUpperCase().replace(/^\//,""),hit="";AUDIO.forEach(function(a){var b=a.replace(/^\//,"");if((u===b||u.indexOf(b+" ")===0)&&b.length>hit.length)hit=a});return hit}
async function run(line){var l=String(line||"").trim(),h=l.split(/\s+/)[0].toLowerCase();if(!l)return "";
 if(/^(see|\/see)$/.test(h))return "SEE: "+NR+table();
 if(h==="/img"||h==="/draw")return h+" (SD2 Turbo): "+NR+table();
 var au=isAudio(l);if(au)return au+": planned — "+NR+" Audio/voice uploads as LIKE examples stay on this device.";
 if(h==="help"||h==="/help")return "<pre>"+esc(Object.keys(STATUS).map(function(k){return k+"  ·  "+STATUS[k]}).join("\n")+"\naudio: "+AUDIO.join(", "))+"</pre>"+table();
 if(h==="import"||h==="tweetback"){openTbi();return "R:\\IMPORT TWEETBACK opened below."}
 if(/^\/?(rkrypt|rgen)$/.test(h)&&w.RKRYPT){var out="";await w.RKRYPT.rdos(l,function(x){out=x});return neutral(out)||"⚿ approving…"}
 if((h==="/recall"||h==="/batibabox")&&w.RDRAGON_ENGINE&&w.RDRAGON_ENGINE.mind){try{var M=await w.RDRAGON_ENGINE.mind(),who=(w.RDRAGON_CSP&&w.RDRAGON_CSP.me&&w.RDRAGON_CSP.me.pub)||"public",r=M&&M.command?await M.command(who,l):null;if(r!=null)return "<pre>"+esc(typeof r==="string"?r:(r.text||JSON.stringify(r,null,1)))+"</pre>"}catch(e){}return h+": memory is empty on this browser."}
 if(h==="/recall"||h==="/batibabox")return h+": BATIBABOX is still loading.";
 if(w.RDRAGON_REPLY&&typeof w.RDRAGON_REPLY.ask==="function"){try{var a=await w.RDRAGON_REPLY.ask(l);if(a)return esc(a.text||a)}catch(e){}}
 return "unknown here. Type help.";}
var tbiLoaded=false;
function openTbi(){var box=d.getElementById("rdc-tbi");box.style.display="block";if(tbiLoaded)return;tbiLoaded=true;
 var s1=d.createElement("script");s1.src="/tweetback/tbi-core.js";s1.onload=function(){var s2=d.createElement("script");s2.src="/tweetback/tbi-panel.js";s2.onload=function(){w.TBI_PANEL.mount(box);lockTbi(box)};d.head.appendChild(s2)};d.head.appendChild(s1)}
function lockTbi(box){var lab=function(el,txt){if(!el)return;el.disabled=true;el.title=txt;el.textContent=el.textContent+" — not ready"};
 lab(box.querySelector('[data-k="rebirth"]'),"Drive-link REBIRTH needs a helper app; not ready on the public site");
 var ta=box.querySelector('[data-k="links"]');if(ta){ta.disabled=true;ta.placeholder="not ready on rizal.pw — use the zip import above"}
 new MutationObserver(function(){lab(box.querySelector('[data-k="live"]:not([disabled])'),"ЯSYNC profile writes are not ready (need the Decider's go)")}).observe(box,{childList:true,subtree:true})}
function mount(){if(d.getElementById("rdc"))return;var st=d.createElement("style");st.textContent=".rdc-b{position:fixed;right:12px;bottom:12px;z-index:9998;background:#000;color:#39ff14;border:1px solid #39ff14;font:11px Menlo,Consolas,\"Courier New\",monospace;padding:2px 8px;cursor:pointer}.rdc-b:hover,#rdc button:hover{border-color:#8a2be2;color:#b388ff}#rdc{position:fixed;right:12px;bottom:40px;z-index:9999;width:min(560px,94vw);max-height:70vh;overflow:auto;background:#000;color:#39ff14;border:1px solid #39ff14;padding:8px;font:12.5px/1.5 Menlo,Consolas,\"Courier New\",monospace;display:none}#rdc input,#rdc textarea{width:100%;box-sizing:border-box;background:#000;color:#39ff14;border:1px solid #39ff14;font:inherit;padding:4px}#rdc code,#rdc pre{color:#39ff14;background:#000;font:inherit}#rdc .rdc-o{margin:6px 0}#rdc .rdc-r b{color:#c9a227}#rdc .rdc-nr{color:#c9a227}.rdc-t{border-collapse:collapse;font-size:11px;margin-top:6px}.rdc-t td,.rdc-t th{border:1px solid #39ff14;padding:2px 5px;text-align:left}.rdc-t th{color:#c9a227}#rdc-tbi .tbi{background:#000!important;color:#39ff14!important;border:1px solid #39ff14!important;border-radius:0!important;font:inherit!important;max-width:none!important;padding:8px!important}#rdc-tbi .tbi button{background:#000!important;color:#39ff14!important;border:1px solid #39ff14!important;border-radius:0!important;font:11px Menlo,Consolas,monospace!important;padding:2px 8px!important;font-weight:400!important}#rdc-tbi .tbi button:disabled{color:#c9a227!important;border-color:#c9a227!important;cursor:not-allowed}#rdc-tbi .tbi .drop{border:1px dashed #39ff14!important;border-radius:0!important}#rdc-tbi .tbi small,#rdc-tbi .tbi pre{color:#39ff14!important;background:#000!important}#rdc-tbi .tbi .post{border-left-color:#39ff14!important}#rdc-tbi .tbi .tile rect{fill:#000;stroke:#39ff14}";d.head.appendChild(st);
 var b=d.createElement("button");b.className="rdc-b";b.textContent="R:\\>";b.title="RDRAGON components";
 var p=d.createElement("div");p.id="rdc";p.innerHTML='<div><b>R:\\&gt;</b> RDRAGON · type <code>help</code>, <code>/recall</code>, <code>rkrypt help</code>, <code>import</code></div><div class="rdc-o"></div><div class="rdc-p">R:\\&gt;</div><input aria-label="R:\\ prompt" autocomplete="off"><div id="rdc-tbi" style="display:none;margin-top:8px"></div>';
 b.onclick=function(){p.style.display=p.style.display==="block"?"none":"block";if(p.style.display==="block")p.querySelector("input").focus()};
 var inp=p.querySelector("input"),out=p.querySelector(".rdc-o"),pr=p.querySelector(".rdc-p");
 inp.addEventListener("input",function(){pr.textContent=/^\/?(rkrypt|rgen)\b/i.test(inp.value)?"R:\\RKRYPT>":"R:\\>"});
 inp.addEventListener("keydown",async function(e){if(e.key!=="Enter")return;var v=inp.value;inp.value="";pr.textContent="R:\\>";var row=d.createElement("div");row.className="rdc-r";row.innerHTML="<div>R:\\&gt; "+esc(v)+"</div><b>RDRAGON</b> …";out.appendChild(row);var r=await run(v);row.innerHTML="<div>R:\\&gt; "+esc(v)+"</div><b>RDRAGON</b> "+r;p.scrollTop=1e9});
 d.body.appendChild(b);d.body.appendChild(p)}
w.RDRAGON_COMPONENTS={run:run,status:STATUS,devices:DEVICES,audio:AUDIO,openTbi:openTbi};
(w.RDOS_EXT=w.RDOS_EXT||[]).push({name:"rdragon-components",match:/^\/?(see|img|draw|music|listen|make|use|say|sing|rap|rhyme|tweetback)\b/i,run:function(l,add){return run(l).then(function(r){if(add)add(r);return {ok:true,html:r}})},help:["SEE","/img","/draw","MAKE VOICE …","import"]});
if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",mount);else mount();
})(window,document);
