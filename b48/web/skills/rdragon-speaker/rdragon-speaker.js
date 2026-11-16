/* egg rdragon-speaker 0.1.0: drop repeated "RDRAGON: " (and old DRAGOSKUL / DRAGON SKULL) speaker prefix from bot turns in #log; bot turns get a small "·" marker instead. User "You:" untouched. Labels only. */
(function(){var RX=/^\s*(RDRAGON|DRAGOSKUL|DRAGON\s?SKULL)\s*:\s*/;
function fixNode(d){if(!d||!d.classList||!d.classList.contains("turn")||d.classList.contains("user"))return;
 var t=d.firstChild;if(t&&t.nodeType===3&&RX.test(t.nodeValue)){t.nodeValue=t.nodeValue.replace(RX,"");d.classList.add("rd-nospk");}}
function all(){var l=document.querySelectorAll("#log .turn");for(var i=0;i<l.length;i++)fixNode(l[i]);}
var q=0;function sched(){if(q)return;q=1;requestAnimationFrame(function(){q=0;all();});}
function go(){if(!document.getElementById("rdragon-speaker")){var s=document.createElement("style");s.id="rdragon-speaker";s.textContent="#log .turn.rd-nospk::before{content:'· ';opacity:.5}";document.head.appendChild(s);}
 all();new MutationObserver(sched).observe(document.documentElement,{subtree:true,childList:true,characterData:true});}
document.readyState==="loading"?document.addEventListener("DOMContentLoaded",go):go();})();
