/* rzl-llama-direct host shim (TEST ONLY): minimal stand-in for the native host's scout-app.js */
(function(){
  "use strict";
  const BOT={rid:"RDRAGON-1",name:"RDRAGON"};
  // fill the public egg's empty "self" slot at runtime (device roster injection)
  const L=window.ROS_RID_LIST||(window.ROS_RID_LIST={rows:[],slots:[]});
  const s=(L.slots||[]).find(x=>x.slot==="self"); if(s){s.rid=BOT.rid;s.name=BOT.name;s.n=1;s.general=true;}
  window.ROS_SELF_TAG=`${BOT.rid} · ${BOT.name}`;
  window.ROS_CURRENT=()=>BOT;
  const $=q=>document.querySelector(q);
  function pushTurn(role,text){const d=document.createElement("div");d.className="turn "+role;d.textContent=(role==="user"?"You: ":BOT.name+": ")+text;$("#log").appendChild(d);d.scrollIntoView();return d;}
  window.pushTurn=pushTurn;
  window.ROS_SEND=async function(q){
    q=String(q||"").trim(); if(!q) return;
    window.pushTurn("user",q);
    const wait=pushTurn("sys","…thinking");
    let r; try{ for(let i=0;i<40&&!(window.RZL_LLAMA_DIRECT&&typeof window.RZL_LLAMA_DIRECT.chat==="function");i++) await new Promise(z=>setTimeout(z,100)); /* guard 20261030 */ if(!(window.RZL_LLAMA_DIRECT&&typeof window.RZL_LLAMA_DIRECT.chat==="function")) throw new Error("local engine adapter not loaded yet, try again"); r=await window.RZL_LLAMA_DIRECT.chat(BOT,q);}catch(e){r="(engine error: "+e.message+")";}
    wait.remove(); window.pushTurn("bot",r); return r;
  };
  document.addEventListener("DOMContentLoaded",()=>{
    $("#chat-title").textContent=BOT.name; $("#chat-sub").textContent=BOT.rid;
    $("#chat-avatar").src="./ybot-tile.png";
    $("#composer").addEventListener("submit",e=>{e.preventDefault();const m=$("#message");const v=m.value;m.value="";window.ROS_SEND(v);m.focus();});
  });
  const sc=document.createElement("script"); sc.src="./plugins/rzl-llama-direct/llama-direct.js"; document.head.appendChild(sc);
})();
/* DRAGON SKULL: engine status pill (ready/offline-ready) */
(function(){async function p(){const s=document.getElementById("ds-status");if(!s)return;try{const r=await fetch("/engine/health");s.textContent="ENGINE";s.style.color=r.ok?"#6c6":"#e0a030";s.title=r.ok?"ready":"loading";setTimeout(p,r.ok?5000:1000);}catch(e){s.textContent="ENGINE";s.style.color="#ef4444";s.title="down";setTimeout(p,2000);}}document.addEventListener("DOMContentLoaded",p);document.addEventListener("visibilitychange",function(){if(!document.hidden)p();});})();
// 1.0.4d: keep the message box focused on load/reload/show so typed tests work without a click (Mac+iOS shared)
(function(){function f(){const m=document.getElementById("message");if(m&&document.activeElement!==m)m.focus();}
if(document.readyState!=="loading")f();else document.addEventListener("DOMContentLoaded",f);
window.addEventListener("load",f);window.addEventListener("pageshow",f);window.addEventListener("focus",f);})();
/* mind-learn 0.1.0 recall-before-acting: prepend MIND-LEARN context to real chat requests to the Granite heart (skips ds_memory.skip internal calls). */
(function(){var f=window.fetch;if(!f||window.__DS_ML_FETCH)return;window.__DS_ML_FETCH=1;window.fetch=function(u,o){try{var url=typeof u==="string"?u:(u&&u.url)||"";if(window.DS_MIND_LEARN&&/\/chat\/completions$/.test(url)&&o&&typeof o.body==="string"){var j=JSON.parse(o.body);if(j&&Array.isArray(j.messages)&&!(j.ds_memory&&j.ds_memory.skip)){var last=null;for(var i=j.messages.length-1;i>=0;i--)if(j.messages[i].role==="user"){last=j.messages[i];break}var q=last&&typeof last.content==="string"?last.content:"";var c=q?window.DS_MIND_LEARN.context(q):"";if(c&&c.indexOf("\n")>0){j.messages.splice(j.messages.length-1,0,{role:"system",content:c});o=Object.assign({},o,{body:JSON.stringify(j)})}}}}catch(e){}return f.call(this,u,o)}})();
