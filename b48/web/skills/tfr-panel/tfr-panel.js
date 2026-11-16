/* tfr-panel 0.2.0 (20261030 mobileparity: prefers bundled /tfr/ test.5 egg when present, e.g. iOS/iPadOS/Android; else RVM :8323): TERAFORMR opens TerraformR inside this RDRAGON window (#ds-tfr-panel iframe).
   Runs in window capture phase before other submit handlers; also opens on any ThundR reply with action:"open_panel". */
(function(){
  "use strict"; if (window.DS_TFR_PANEL) return;
  var RX=/^\s*\/?ter{1,2}aform(r|я)[!.\s]*$/i, DEF="http://127.0.0.1:8323/", LOCAL_NOV3="/tfr-nov3hero/index.html", LOCAL="/tfr/index.html";
  function ok(u){ return u===LOCAL_NOV3 || u===LOCAL || /^http:\/\/(127\.0\.0\.1|localhost):\d+\//.test(u||""); }
  function hasEgg(path){ return fetch(path,{cache:"no-store"}).then(function(r){return r.ok;}).catch(function(){return false;}); }
  function hasLocal(){ return hasEgg("/tfr-nov3hero/egg-version.js").then(function(n){ if(n) return {url:LOCAL_NOV3, kind:"nov3hero"}; return hasEgg("/tfr/egg-version.js").then(function(b){ return b?{url:LOCAL, kind:"b23-or-test5"}:null; }); }); }
  function show(t){ var l=document.getElementById("log"); if(!l) return; var d=document.createElement("div"); d.className="turn bot dg-cmd"; d.textContent=t; l.appendChild(d); if(d.scrollIntoView) d.scrollIntoView(); }
  function open(u){ if(!ok(u)) u=DEF; var p=document.getElementById("ds-tfr-panel");
    if(!p){ p=document.createElement("div"); p.id="ds-tfr-panel"; p.style.cssText="position:fixed;inset:8px;z-index:2147483646;background:#000;border:2px solid #6b4;border-radius:10px;display:flex;flex-direction:column;overflow:hidden";
      var b=document.createElement("div"); b.style.cssText="display:flex;justify-content:space-between;padding:2px 8px;font:12px system-ui;color:#cfe;background:#253"; b.textContent="TerraformЯ";
      var x=document.createElement("button"); x.textContent="✕"; x.style.cssText="border:0;background:none;color:#fcc;cursor:pointer"; x.onclick=function(){ p.remove(); }; b.appendChild(x);
      var fr=document.createElement("iframe"); fr.style.cssText="flex:1;border:0;width:100%"; fr.allow="autoplay; fullscreen; gamepad"; p.appendChild(b); p.appendChild(fr); document.body.appendChild(p); }
    var f=p.querySelector("iframe"); if(f.src!==u) f.src=u; return u; }
  window.DS_TFR_PANEL={open:open};
  window.addEventListener("submit", function(e){
    var m=document.getElementById("message"), t=m?String(m.value||""):""; if(!RX.test(t)) return;
    e.preventDefault(); e.stopImmediatePropagation(); m.value="";
    show("You: "+t.trim());
    hasLocal().then(function(L){ if(L&&L.url){ show("TERAFORMR: opening TerraformR ("+(L.kind==="nov3hero"?"nov3hero egg":"bundled egg")+", offline) in this window · "+open(L.url)); return; }
      var u0=open(DEF);
      fetch("http://127.0.0.1:8329/v1/call/thundr_chat",{method:"POST",headers:{"Content-Type":"text/plain"},body:JSON.stringify({text:"TERAFORMR"})})
        .then(function(r){return r.json();}).then(function(j){ show("TERAFORMR: opening TerraformR in this window · "+open(String((j&&j.url)||u0))); })
        .catch(function(){ show("TERAFORMR: opening TerraformR in this window · "+u0); }); });
  }, true);
})();
