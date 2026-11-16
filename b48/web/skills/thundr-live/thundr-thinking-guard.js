/* thundr-thinking-guard.js 1.0 · 20261105 (Rizal t641u) — RTHUNDR auto-handles the "…thinking" hang.
   LESSON L-20261105-THINKING: "…thinking" for a long time is usually NOT dead wiring — local Granite (1B) on a phone takes ~15–40 s,
   longest on the first reply after launch. Recognize → show live status → probe engine → retry once → clear error + one-tap Recover.
   Same file on Neo / 17e / Moto. Local only: same-origin /engine (llama-server 4979 via page server 8319). No keys, no sends, no approvals. */
(function(){ if(window.THUNDR_THINK_GUARD) return;
  var WARN_MS=5000, TIMEOUT_MS=120000, HEALTH="/engine/health";
  var PLAT=/android/i.test(navigator.userAgent)?"Android":(/iphone|ipad/i.test(navigator.userAgent)?"iOS":"Mac");
  function log(t){try{var a=JSON.parse(localStorage.getItem("thundr.think.log")||"[]");a.push(new Date().toISOString()+" "+t);localStorage.setItem("thundr.think.log",JSON.stringify(a.slice(-50)))}catch(e){}}
  function mood(s){try{document.dispatchEvent(new CustomEvent("thundr-adapter",{detail:{bot:"engine",state:s}}))}catch(e){}}
  function health(ms){var c=new AbortController(),t=setTimeout(function(){c.abort()},ms||3000);
    return fetch(HEALTH,{cache:"no-store",signal:c.signal}).then(function(r){clearTimeout(t);return r.ok?r.json().then(function(j){return j&&j.status||"ok"},function(){return"ok"}):"http "+r.status},function(){clearTimeout(t);return"down"})}
  function withTimeout(p,ms){return new Promise(function(res,rej){var t=setTimeout(function(){rej(new Error("no reply after "+Math.round(ms/1000)+"s"))},ms);p.then(function(v){clearTimeout(t);res(v)},function(e){clearTimeout(t);rej(e)})})}
  function recoverBtn(node){var b=document.createElement("button");b.textContent="⚡ Recover ENGINE";b.style.cssText="margin-left:8px;padding:3px 8px;border-radius:8px;border:1px solid #39ff14;background:#0a1a0a;color:#39ff14;font:600 11px system-ui";
    b.onclick=function(){b.disabled=true;b.textContent="checking…";recover().then(function(st){b.textContent=st==="ok"?"ENGINE ok — resend":"still down — reopen app";b.disabled=false})};node.appendChild(b)}
  /* recover: re-probe ports; if page server reachable but engine not, wait for it (MainActivity/launchd restart it), else reload the shell once */
  function recover(){log("recover start");var n=0;return new Promise(function(res){(function loop(){health(3000).then(function(st){
      if(st==="ok"){log("recover ok after "+n);mood("idle");return res("ok")}
      if(++n<15) return setTimeout(loop,2000);
      log("recover failed: "+st);mood("error");
      if(!sessionStorage.getItem("thundr.think.reloaded")){sessionStorage.setItem("thundr.think.reloaded","1");setTimeout(function(){location.reload()},800)}
      res(st)})})()})}
  function install(){
    if(!window.RZL_LLAMA_DIRECT||!window.pushTurn) return setTimeout(install,300);
    var chat=window.RZL_LLAMA_DIRECT.chat.bind(window.RZL_LLAMA_DIRECT), BOT=window.BOT||{name:"RDRAGON",rid:"rdragon"};
    window.ROS_SEND=async function(q){
      q=String(q||"").trim(); if(!q) return;
      window.pushTurn("user",q);
      var wait=window.pushTurn("sys","…thinking"), t0=Date.now(), eng="?", pre=wait.textContent.replace(/…thinking$/,"");
      var tick=setInterval(function(){var s=Math.round((Date.now()-t0)/1000);if(Date.now()-t0<WARN_MS)return;
        wait.textContent=pre+(eng==="down"?"…ENGINE not answering ("+s+"s) — recovering":"…ENGINE warming — Granite answering ("+s+"s, usually 15–40s on phone)")},1000);
      setTimeout(function(){if(!tick)return;health(3000).then(function(st){eng=st;log("slow "+Math.round((Date.now()-t0)/1000)+"s engine="+st);mood(st==="ok"?"thinking":"error");if(st!=="ok")recover().then(function(s2){eng=s2})})},WARN_MS);
      var r,err;
      for(var a=0;a<2;a++){try{r=await withTimeout(chat(BOT,q),TIMEOUT_MS);err=null;break}catch(e){err=e;log("attempt "+(a+1)+" failed: "+e.message);
        if(a===0){wait.textContent=pre+"…retrying once ("+e.message+")";await recover()}}}
      clearInterval(tick);tick=null;wait.remove();
      if(err){var d=window.pushTurn("bot","(ENGINE error: "+err.message+" — wiring checked by ThundR: engine "+eng+")");recoverBtn(d);mood("error");return d.textContent}
      var s=Math.round((Date.now()-t0)/1000);if(s>=WARN_MS/1000)log("answered in "+s+"s");
      window.pushTurn("bot",r);return r};
    window.THUNDR_THINK_GUARD={version:"1.0",platform:PLAT,health:health,recover:recover,log:function(){return JSON.parse(localStorage.getItem("thundr.think.log")||"[]")},lesson:LESSON};
    /* teach ThundR's own chat: "stuck", "thinking", "engine", "diagnose" → lesson + live probe */
    var T=window.THUNDR_IOS; if(T&&T.chat){var orig=T.chat;T.chat=function(text){var low=String(text||"").toLowerCase();
      if(/\b(stuck|thinking|hung|hang|not responding|engine|diagnos|wiring)\b/.test(low)){health(3000).then(function(st){try{window.THUNDR_ORB&&window.THUNDR_ORB.ask&&0}catch(e){}log("diagnose via chat: engine "+st)});
        return {ok:true,via:"lesson",anim:null,reply:LESSON+" · probing ENGINE now — say 'recover' to force it."}}
      if(/^recover( engine)?$/.test(low)){recover();return {ok:true,via:"selfheal",reply:"ThundR · recovering ENGINE (re-probing 8319/4979, reload shell once if still down)…"}}
      return orig.apply(this,arguments)}}
    log("guard installed "+PLAT);
  }
  var LESSON="LESSON L-20261105-THINKING: '…thinking' that lasts is usually Granite being slow (15–40s on phone, first reply slowest), not dead wiring. I show the live seconds, probe /engine/health, retry once, and offer ⚡ Recover if the engine is really down.";
  document.readyState==="loading"?document.addEventListener("DOMContentLoaded",install):install();
})();
