/* egg chat-images 0.1.0: show images inside chat turns. Web-only, DOM observer; no engine/heart/organ touch.
   Renders: data:image/(png|jpeg|gif|webp);base64 · ![alt](url) · bare .png/.jpg/.jpeg/.gif/.webp URLs (http/https/file/./relative).
   Offline-safe: remote http(s) images are NOT fetched until tapped. SVG data URLs are refused. Drop/paste a picture on the composer = local preview turn. */
(function(){"use strict";if(window.__RZL_CHAT_IMAGES)return;window.__RZL_CHAT_IMAGES="0.3.0";
var RX=/!\[([^\]]*)\]\(([^)\s]+)\)|(data:image\/(?:png|jpe?g|gif|webp);base64,[A-Za-z0-9+\/=]{16,})|(\/api\/audio\/file\/[^\s"'<>)\/]+?\.(?:m4a|wav|mp3))|((?:https?:\/\/|file:\/\/|\.\/|\/Users\/|\/api\/img\/)[^\s"'<>)]+?\.(?:png|jpe?g|gif|webp)(?:\?[^\s"'<>)]*)?)(?=[\s"'<>)]|$)/gi;
var SEL=".turn,.msg,.message,.bubble,[data-role]";
function css(){if(document.getElementById("rzl-ci-css"))return;var s=document.createElement("style");s.id="rzl-ci-css";
s.textContent=".rzl-ci{display:block;max-width:min(420px,90%);max-height:420px;margin:6px 0;border-radius:8px;border:1px solid #333;cursor:zoom-in;background:#000}.rzl-ci-ph{display:inline-block;margin:6px 0;padding:6px 10px;border:1px dashed #555;border-radius:8px;color:#aaa;cursor:pointer;font-size:12px}.rzl-ci-full{position:fixed;inset:0;z-index:99990;background:rgba(0,0,0,.88);display:flex;align-items:center;justify-content:center;cursor:zoom-out}.rzl-ca{display:block;width:min(420px,90%);margin:6px 0}.rzl-ci-full img{max-width:95vw;max-height:95vh}";
document.head.appendChild(s);}
function src(u){u=u.replace(/\s+/g,"");var g=u.match(/\/RUNTIME\/img-gen\/out\/([^\/]+\.png)$/);if(g)return "/api/img/file/"+g[1];var h=u.match(/\/HANDOFF\/shots\/([^\/]+\.(?:png|jpe?g))$/i);if(h)return "/api/img/shot/"+h[1];if(/^\/Users\//.test(u))u="file://"+u;return u;}
function aud(u){var a=document.createElement("audio");a.className="rzl-ca";a.controls=true;a.preload="metadata";a.src=u;a.onerror=function(){var p=document.createElement("span");p.className="rzl-ci-ph";p.textContent="🔊 audio (could not load)";a.replaceWith(p);};return a;} /* SCOUT t155u inline audio player, never autoplays */
function remote(u){return /^https?:/i.test(u)&&!/^https?:\/\/(127\.0\.0\.1|localhost)[:\/]/i.test(u);}
function img(u,alt){var i=document.createElement("img");i.className="rzl-ci";i.alt=alt||"image";i.loading="lazy";i.decoding="async";i.referrerPolicy="no-referrer";
i.onerror=function(){var p=document.createElement("span");p.className="rzl-ci-ph";p.textContent="🖼 "+(alt||"image")+" (could not load)";i.replaceWith(p);};
i.onclick=function(){var f=document.createElement("div");f.className="rzl-ci-full";var j=new Image();j.src=i.src;f.appendChild(j);f.onclick=function(){f.remove();};document.body.appendChild(f);};
i.src=u;return i;}
function node(u,alt){u=src(u);if(remote(u)){var p=document.createElement("span");p.className="rzl-ci-ph";p.textContent="🖼 tap to load "+(alt||u.replace(/^https?:\/\//,"").slice(0,48));p.onclick=function(){p.replaceWith(img(u,alt));};return p;}return img(u,alt);}
function scanText(t){var s=t.nodeValue;if(!s||s.length<8)return;RX.lastIndex=0;if(!RX.test(s))return;RX.lastIndex=0;
var f=document.createElement("span");f.className="rzl-ci-done";var last=0,m;
while((m=RX.exec(s))){f.appendChild(document.createTextNode(s.slice(last,m.index)));
 if(m[1]!==undefined||m[2]){f.appendChild(node(m[2],m[1]));}
 else if(m[4]){f.appendChild(document.createTextNode(m[4]));f.appendChild(aud(m[4]));}
 else if(m[3]){f.appendChild(document.createTextNode("[image]"));f.appendChild(node(m[3],"image"));}
 else{f.appendChild(document.createTextNode(m[5]));f.appendChild(node(m[5]));}
 last=RX.lastIndex;}
f.appendChild(document.createTextNode(s.slice(last)));t.replaceWith(f);}
function scan(el){if(!el||el.nodeType!==1||el.closest("#composer,textarea,input,pre,code,script,style"))return;
var w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT,null),a=[],n;while((n=w.nextNode())){if(!n.parentNode.closest("pre,code,a,.rzl-ci-ph,.rzl-ci-done"))a.push(n);}a.forEach(scanText);}
function root(){return document.getElementById("log")||document.querySelector(".ds-log,#chat-log,#messages");}
function all(){var r=root();if(!r)return;r.querySelectorAll(SEL).forEach(scan);if(!r.querySelector(SEL))scan(r);}
var q=0;function sched(){if(q)return;q=1;requestAnimationFrame(function(){q=0;all();});}
function dropAudio(file){if(!file||!(/^audio\//.test(file.type)||/\.(wav|mp3|m4a|aac|flac|ogg|opus|aiff?|caf)$/i.test(file.name||"")))return false;var r=new FileReader();r.onload=function(){var L=root();if(!L)return;var d=document.createElement("div");d.className="turn user";d.textContent="You: [audio "+(file.name||"dropped")+"]";L.appendChild(d);
 var b=document.createElement("div");b.className="turn bot";b.style.whiteSpace="pre-wrap";b.textContent="UPLOAD: saving your audio privately + transcribing (offline)… then use it as last-upload, e.g. MAKE VOICE myvoice from last-upload or MAKE MUSIC LIKE last-upload";L.appendChild(b);b.scrollIntoView();
 fetch("/api/audio/upload",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:file.name||"drop.wav",b64:r.result})}).then(function(x){return x.json();}).then(function(j){b.textContent=j.text||j.error||"TRANSCRIBE failed";b.scrollIntoView();}).catch(function(x){b.textContent="TRANSCRIBE error: "+x.message;});};r.readAsDataURL(file);return true;} /* SCOUT t155u */
function drop(file){if(dropAudio(file))return true;if(!file||!/^image\/(png|jpe?g|gif|webp)$/.test(file.type))return false;var r=new FileReader();r.onload=function(){var L=root();if(!L)return;var d=document.createElement("div");d.className="turn user rzl-ci-turn";d.appendChild(document.createTextNode("You: [image "+(file.name||"pasted")+"]"));d.appendChild(img(r.result,file.name));L.appendChild(d);d.scrollIntoView();
 var b=document.createElement("div");b.className="turn bot";b.style.whiteSpace="pre-wrap";b.textContent="SEE: analyzing your picture (offline)…";L.appendChild(b);b.scrollIntoView();
 fetch("/api/see/upload",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:file.name||"pasted.png",b64:r.result})}).then(function(x){return x.json();}).then(function(j){b.textContent=j.text||j.error||"SEE failed";b.scrollIntoView();}).catch(function(x){b.textContent="SEE error: "+x.message;});};r.readAsDataURL(file);return true;} /* SCOUT t148u: drop/paste -> /api/see/upload -> SEE */
function hookComposer(){var c=document.getElementById("composer")||document.getElementById("message");if(!c||c.__rzlci)return;c.__rzlci=1;
c.addEventListener("dragover",function(e){e.preventDefault();});
c.addEventListener("drop",function(e){var fs=e.dataTransfer&&e.dataTransfer.files;if(fs&&fs.length){var ok=false;for(var i=0;i<fs.length;i++)ok=drop(fs[i])||ok;if(ok)e.preventDefault();}});
c.addEventListener("paste",function(e){var it=e.clipboardData&&e.clipboardData.items;if(!it)return;for(var i=0;i<it.length;i++){if(it[i].kind==="file"&&drop(it[i].getAsFile()))e.preventDefault();}});}
function go(){css();all();hookComposer();new MutationObserver(function(){sched();hookComposer();}).observe(document.body,{subtree:true,childList:true,characterData:true});}
document.readyState==="loading"?document.addEventListener("DOMContentLoaded",go):go();})();
