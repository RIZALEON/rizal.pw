/* rpublic-profile.rzl.js v1 (2026-11-16, pt264u/t266) — public profile polish for rizal.pw and every RDRAGON copy.
   1 Visitor view (SCRIBE's #55-#57: #csp-panel.csp-visitor, i.e. publicVisitorView and no owner session): the public profile
     shows NO message or notification counts. It hides the unread badges on the Message button, on the Wallet button
     (.rmail-n "✉148") and on the bottom bar's ✉ tab (.rmu-nb). The owner (signed in) still sees them, and so does the app.
   2 Grammar: "1 Followers" -> "1 Follower" (and "1 Following" stays). Counts come from the published profile data (fstate).
   Display-only: it never changes data, counts, storage or other modules' functions, and adds no notices. Add-only. */
(function(w,d){"use strict";if(w.RPUBLIC_PROFILE)return;
var CSS='#csp-panel.csp-visitor .rmail-n,#csp-panel.csp-visitor .rmu-nb,#csp-panel.csp-visitor .csp-msgbtn sup,#csp-panel.csp-visitor .csp-msgbtn .rmail-n,#csp-panel.csp-visitor [data-a="nav"][data-n="msgs"] sup,#csp-panel.csp-visitor [data-a="wallet"] .rmail-n{display:none!important}';
function panel(){return d.getElementById("csp-panel")}
function visitor(){var p=panel();return !!(p&&p.classList.contains("csp-visitor"))}
function css(){if(d.getElementById("rpp-css"))return;var s=d.createElement("style");s.id="rpp-css";s.textContent=CSS;(d.head||d.documentElement).appendChild(s)}
function singular(root){var tw=d.createTreeWalker(root,NodeFilter.SHOW_TEXT,null),n,ch=[];while((n=tw.nextNode()))ch.push(n);
 ch.forEach(function(t){var v=t.nodeValue;if(!v||v.indexOf("Followers")<0)return;
  var nv=v.replace(/(^|[^\d])1([\s\u00a0]+)Followers\b/g,"$11$2Follower");
  if(nv===v&&/^[\s\u00a0]*Followers\b/.test(v)){var prev=t.previousSibling;if(prev&&String(prev.textContent||"").trim()==="1")nv=v.replace("Followers","Follower")}
  if(nv!==v)t.nodeValue=nv})}
function scrubCounts(root){if(!visitor())return;
 root.querySelectorAll('.csp-msgbtn,[data-a="dm"],[data-a="nav"][data-n="msgs"]').forEach(function(b){
  Array.prototype.forEach.call(b.childNodes,function(c){
   if(c.nodeType===3){var v=c.nodeValue,nv=v.replace(/(Message)[\s\u00a0]*\d+/,"$1").replace(/(✉)[\s\u00a0]*\d+/,"$1");if(nv!==v)c.nodeValue=nv}
   else if(c.nodeType===1&&/^[\s\u00a0✉·]*\d+/.test(c.textContent||"")&&c.style.display!=="none")c.style.display="none"})})}
var busy=false,queued=false;
function run(){if(busy){queued=true;return}busy=true;try{var p=panel();if(p){singular(p);scrubCounts(p)}}catch(e){}busy=false;if(queued){queued=false;setTimeout(run,50)}}
var t=null;function soon(){if(t)return;t=setTimeout(function(){t=null;run()},60)}
function start(){css();run();try{new MutationObserver(soon).observe(d.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["class"]})}catch(e){setInterval(run,1000)}}
if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",start);else start();
w.RPUBLIC_PROFILE={VERSION:1,run:run,visitor:visitor};
})(window,document);
