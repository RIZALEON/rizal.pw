/* DRAGON SKULL self-update hook: confirms a new signed web bundle once this page loaded AND /engine/health is ok,
   and shows the web version quietly in the header. Tap: check now (or apply a ready update). Long-press 1.2 s, then tap: reset to built-in. */
(function(){
  "use strict";
  var H={"X-DS-SelfUpdate":"1"}, el=null, state=null, armed=0, swallow=false;
  function api(p,post){return fetch("/api/selfupdate/"+p,post?{method:"POST",headers:H}:{cache:"no-store"}).then(function(r){if(r.status===404){var e=new Error("selfupdate-404");e.status=404;throw e;}return r.json();});}
  function show(s){
    state=s||{}; if(!el) make();
    var t=String(state.serving||"").trim()||"?"; if(state.pending) t+=" ·…"; if(state.staged) t+=" · "+state.staged+" ready ↻";
    el.textContent=t; el.title=(state.lastResult||"")+(state.manifest?" · "+state.manifest:"");
  }
  function refresh(){return api("status").then(show).catch(function(){});}
  function make(){
    var hd=document.getElementById("bot-hero")||document.body;
    el=document.createElement("small"); el.id="ds-webver";
    el.style.cssText="opacity:.4;font-size:9px;margin-left:6px;cursor:pointer;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none";
    hd.appendChild(el);
    var timer=null;
    el.addEventListener("pointerdown",function(){clearTimeout(timer);timer=setTimeout(function(){armed=Date.now();swallow=true;el.textContent="reset to built-in? tap to confirm";setTimeout(function(){if(armed){armed=0;show(state);}},5000);},1200);});
    el.addEventListener("pointerup",function(){clearTimeout(timer);});
    el.addEventListener("pointercancel",function(){clearTimeout(timer);});
    el.addEventListener("click",function(){
      if(swallow){swallow=false;return;}                       /* the click that ends the long-press */
      if(armed){armed=0;api("reset",true).then(function(){location.reload();});return;}
      if(state&&state.staged){api("apply",true).then(function(){location.reload();});return;}
      el.textContent="checking…"; api("check",true).then(function(){setTimeout(refresh,5000);}).catch(refresh);
    });
  }
  function confirmWhenHealthy(n){
    fetch("/engine/health",{cache:"no-store"}).then(function(r){if(!r.ok) throw 0; return api("ok",true).then(show);})
      .catch(function(e){if(e&&e.status===404)return; if(n<120) setTimeout(function(){confirmWhenHealthy(n+1);},1000);});
  }
  window.DS_SELFUPDATE={status:refresh,check:function(){return api("check",true);},apply:function(){return api("apply",true);},reset:function(){return api("reset",true);}};
  function start(){refresh().then(function(){confirmWhenHealthy(0);});}
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start); else start();
  document.addEventListener("visibilitychange",function(){if(!document.hidden) refresh();});
})();
