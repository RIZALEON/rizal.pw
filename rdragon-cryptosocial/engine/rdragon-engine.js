/* RDRAGON edge engine v1 · runs IBM Granite 4.0 H (GGUF Q4_K_M) in the visitor's browser with wllama (llama.cpp WASM, vendored here).
   Self-hosted: every byte (runtime, wasm, weights) comes from this site; no CDN, no Hugging Face, no outside API at runtime.
   Pipeline: SPINE (JS ports: rcounter turn counter · rtoken sha256 seal · rscribe page log, NOT the RVM binaries) -> MEMORY (this device's
   IndexedDB + its own ЯSYNC chain) + LESSONS (BM25 top-k, weighted) -> HEART (Granite) -> quality check -> rdragon.reply tier:"edge".
   Lazy: nothing heavy loads until someone asks. Weights cached in the Cache API. */
(function(root){"use strict";
var BASE=(function(){try{var s=document.currentScript&&document.currentScript.src;return s?s.replace(/[^/]*$/,""):"/rdragon-cryptosocial/engine/"}catch(e){return "/rdragon-cryptosocial/engine/"}})();
var MODELS={"1b":{dir:"granite-4.0-h-1b-q4km",name:"granite-4.0-h-1b-q4-web"},"350m":{dir:"granite-4.0-h-350m-q4km",name:"granite-4.0-h-350m-q4-web"}};
function words(s){return String(s||"").toLowerCase().match(/[a-z0-9\u00c0-\uffff]+/g)||[]}
var STOP={the:1,a:1,an:1,is:1,are:1,to:1,of:1,and:1,or:1,in:1,on:1,it:1,i:1,you:1,me:1,my:1,what:1,how:1,for:1,be:1,do:1,this:1,that:1};
function toks(s){return words(s).filter(function(w){return !STOP[w]})}
/* BM25 over lessons; score multiplied by kind weight (correction 3 > teach 2.5 > reflect 2) */
function rankLessons(q,lessons,cfg){cfg=cfg||{};var W=cfg.lessonWeights||{correction:3,teach:2.5,reflect:2},K=cfg.lessonsTopK||12,MINK=cfg.lessonsMinK!=null?cfg.lessonsMinK:5;
 var L=(lessons||[]).filter(function(l){return l&&l.text}),N=L.length;if(!N)return[];var docs=L.map(function(l){return toks(l.text)}),avg=docs.reduce(function(a,d){return a+d.length},0)/N||1,df={};
 docs.forEach(function(d){var u={};d.forEach(function(w){if(!u[w]){u[w]=1;df[w]=(df[w]||0)+1}})});var qt=toks(q);
 var sc=L.map(function(l,i){var d=docs[i],tf={},s=0;d.forEach(function(w){tf[w]=(tf[w]||0)+1});qt.forEach(function(w){if(!tf[w])return;var idf=Math.log(1+(N-df[w]+.5)/(df[w]+.5));s+=idf*tf[w]*2.2/(tf[w]+1.2*(.25+.75*d.length/avg))});
  var w=W[l.kind||l.type]||(l.weight!=null?+l.weight:1);return{l:l,bm:s,s:s*w,w:w}});
 var hit=sc.filter(function(x){return x.bm>0}).sort(function(a,b){return b.s-a.s}),rest=sc.filter(function(x){return x.bm<=0}).sort(function(a,b){return b.w-a.w});
 var out=hit.slice(0,K);if(out.length<MINK)out=out.concat(rest.slice(0,MINK-out.length));return out.map(function(x){return x.l})}
function isWeather(q){return /\b(weather|forecast|temperature|temp|rain(ing|y)?|snow(ing|y)?|sunny|cloudy|humid(ity)?|wind(y)?|storm|degrees)\b/i.test(String(q||""))}
var STOPW="the a an and or of to in on is are was what how why who it its this that for with be do does i you me my your at as by from can will".split(" ");
function toks(x){return(String(x||"").toLowerCase().match(/[a-z0-9']+/g)||[]).filter(function(w){return w.length>2&&STOPW.indexOf(w)<0})}
/* port of csanswer.py quality(): returns [ok, why] */
function qcheck(t,cfg,q){var Q=(cfg&&cfg.quality)||{};t=String(t||"").trim();var w=t.match(/[A-Za-z0-9']+/g)||[],G=new RegExp(Q.greet||"^\\W*(hi|hey|hello|yo|gm)\\b[\\W\\w]{0,20}$","i"),C=new RegExp(Q.cannedRe||"sealed in the chain|the hoard grows","i");
 if((Q.rejectCanned||[]).some(function(c){return t.toLowerCase().indexOf(c.toLowerCase())>=0}))return[false,"canned line"];
 if((G.test(q||"")||G.test(t))&&w.length>=(Q.greetMin||2)&&w.length<=(Q.greetMax||60)&&!/the hoard grows|sealed in the chain/i.test(t))return[true,"greeting"];
 if(w.length<(Q.minWords!=null?Q.minWords:15))return[false,"under "+(Q.minWords!=null?Q.minWords:15)+" words"];
 if(C.test(t))return[false,"canned line"];
 var qt=toks(q),tt=toks(t);if(tt.length&&qt.length&&tt.filter(function(x){return qt.indexOf(x)>=0}).length/tt.length>(Q.echoMax||0.6))return[false,"keyword echo"];
 if(/"[^"]{1,25}"/.test(t)&&w.length<25)return[false,"quoted keyword echo"];return[true,"ok"]}
function quality(t,cfg,q){return qcheck(t,cfg,q)[0]}
function clean(t,cfg){var Q=(cfg&&cfg.quality)||{};t=String(t||"").replace(/<\|[^>]*\|>/g,"").replace(/^\s*(RDRAGON|ASSISTANT|DRAGOSKUL)\s*[:>-]\s*/i,"");t=t.split(/\b(?:USER|THREAD|QUESTION|LESSONS?)\s*:/)[0];t=t.replace(/^\s*@?RDRAGON[,:]?\s*/i,"").replace(/\s+/g," ").trim().replace(/^["' ]+|["' ]+$/g,"");return t.split(/(?<=[.!?])\s+/).slice(0,Q.maxSentences||5).join(" ").slice(0,Q.maxChars||700)}
/* weather/live-data guard: never let the model invent live conditions */
function liveGuard(q,t,cfg){if(!isWeather(q))return t;var honest=(cfg&&cfg.liveData&&cfg.liveData.weather)||"I can't see live weather from here and won't guess.";
 if(/\d\s*(°|degrees|deg|f\b|c\b|%|mph|km\/h)|currently|right now it|today it('s| is)/i.test(t)||!/can.?t|cannot|no (live|access|real)|don.?t have/i.test(t))return honest;return t}
function buildMessages(o,cfg){var sys=(cfg&&cfg.system)||"You are RDRAGON.",L=o.lessons||[],M=o.memory||[];
 if(L.length)sys+="\n\nLessons learned from Rizal's corrections (follow them):\n"+L.map(function(l,i){return (i+1)+". "+String(l.text).slice(0,240)}).join("\n");
 if(M.length)sys+="\n\nEarlier on this device:\n"+M.map(function(m){return "Q: "+String(m.q).slice(0,160)+"\nA: "+String(m.a).slice(0,200)}).join("\n");
 var msgs=[{role:"system",content:sys}];(o.thread||[]).slice(-8).forEach(function(x){msgs.push({role:x.by==="RDRAGON"?"assistant":"user",content:String(x.text||"").slice(0,600)})});
 msgs.push({role:"user",content:String(o.q||"").slice(0,1500)});return msgs}
function pickModel(nav){nav=nav||(typeof navigator!=="undefined"?navigator:{});var mem=nav.deviceMemory||0,mob=/Android|iPhone|iPad|Mobile/i.test(nav.userAgent||"");if(root.RDRAGON_ENGINE_MODEL)return root.RDRAGON_ENGINE_MODEL;return(mob||mem&&mem<=4)?"350m":"1b"}
/* ---- SPINE (JS ports) ---- */
function hex(b){return Array.prototype.map.call(new Uint8Array(b),function(x){return("0"+x.toString(16)).slice(-2)}).join("")}
function sha256(s){return crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)).then(hex)}
var SPINE={count:function(){var k="rdragon.engine.rcounter";var n=0;try{n=(+localStorage.getItem(k)||0)+1;localStorage.setItem(k,String(n))}catch(e){}return n},
 seal:function(o){return sha256(JSON.stringify(o))},
 scribe:function(page){return mem().then(function(db){return new Promise(function(ok){var t=db.transaction("pages","readwrite");t.objectStore("pages").put(page);t.oncomplete=function(){ok(page)};t.onerror=function(){ok(page)}})}).catch(function(){return page})}};
/* ---- MEMORY: per-device IndexedDB (private to this browser; never uploaded by the engine) ---- */
var _db;function mem(){if(_db)return _db;_db=new Promise(function(ok,no){if(typeof indexedDB==="undefined")return no(Error("no idb"));var r=indexedDB.open("rdragon.engine.memory",1);r.onupgradeneeded=function(){r.result.createObjectStore("pages",{keyPath:"id"})};r.onsuccess=function(){ok(r.result)};r.onerror=no});return _db}
function recall(q,k){return mem().then(function(db){return new Promise(function(ok){var out=[],c=db.transaction("pages").objectStore("pages").openCursor();c.onsuccess=function(){var x=c.result;if(x){out.push(x.value);x.continue()}else ok(out)};c.onerror=function(){ok([])}})}).then(function(all){
 var r=rankLessons(q,all.map(function(p){return{text:p.q+" "+p.a,kind:"memory",weight:1,p:p}}),{lessonsTopK:k||3,lessonsMinK:0});return r.map(function(x){return x.p})}).catch(function(){return[]})}
function getJSON(u){return fetch(BASE+u,{cache:"no-cache"}).then(function(r){if(!r.ok)throw Error(u+" "+r.status);return r.json()})}
var CFG=null;function cfg(){return CFG?Promise.resolve(CFG):getJSON("rdragon-prompt.json").then(function(c){CFG=c;return c})}
/* ---- HEART: wllama + Granite, lazy ---- */
var W=null,LOADED=null,loading=null;
function fetchPart(url,onp){var C=typeof caches!=="undefined"?caches.open("rdragon-engine-v1"):Promise.resolve(null);
 return C.then(function(c){return(c?c.match(url):Promise.resolve(null)).then(function(hit){if(hit)return hit.blob();return fetch(url).then(function(r){if(!r.ok)throw Error("model part "+r.status);var cl=r.clone();if(c)c.put(url,cl).catch(function(){});return r.blob()})})})}
function load(which,onProgress){if(loading&&LOADED===which)return loading;which=which||pickModel();var m=MODELS[which],dir=BASE+"models/"+m.dir+"/";LOADED=which;
 loading=Promise.all([import(BASE+"vendor/wllama/index.js"),fetch(dir+"manifest.json").then(function(r){if(!r.ok)throw Error("no manifest for "+which);return r.json()})]).then(function(a){var mod=a[0],man=a[1],done=0;
  W=new mod.Wllama({"default":BASE+"vendor/wllama/wllama.wasm"},{suppressNativeLog:true});W.setCompat({worker:BASE+"vendor/wllama/compat/wllama.js",wasm:BASE+"vendor/wllama/compat/wllama.wasm"});
  return Promise.all(man.parts.map(function(p){return fetchPart(dir+p.file).then(function(b){if(b.size!==p.size)throw Error("bad part size "+p.file);done+=p.size;onProgress&&onProgress(done/man.size);return b})}))
   .then(function(blobs){return W.loadModel([new Blob(blobs)],{n_ctx:(CFG&&CFG.ctx)||4096})}).then(function(){return{model:m.name,which:which}})})
 .catch(function(e){if(which==="1b"){LOADED=null;loading=null;return load("350m",onProgress)}LOADED=null;loading=null;throw e});return loading}
function answer(o){o=o||{};var turn=SPINE.count();return cfg().then(function(c){
 var lessons=rankLessons(o.q,(o.lessons||[]),c);
 if(isWeather(o.q)&&!o.forceModel)return finish(c,o,turn,lessons,c.liveData.weather,"rules:live-data-guard");
 return recall(o.q,3).then(function(memory){return load(o.model,o.onProgress).then(function(info){
  var base=buildMessages({q:o.q,thread:o.thread,lessons:lessons,memory:memory},c);
  function gen(k,why){var m=base.map(function(x){return{role:x.role,content:x.content}});if(k)m[m.length-1].content+=String((c.quality||{}).retryHint||"").replace("%s",why);
   return W.createChatCompletion({messages:m,max_tokens:c.max_tokens||120,temperature:c.temperature||.4}).then(function(r){
    var t=clean(((r.choices||[])[0]||{}).message&&r.choices[0].message.content,c);t=liveGuard(o.q,t,c);var v=qcheck(t,c,o.q);
    if(v[0])return finish(c,o,turn,lessons,t,info.model);if(k<1)return gen(k+1,v[1]);throw Error("quality check failed: "+v[1])})}
  return gen(0,"")})})})}
function finish(c,o,turn,lessons,text,model){var page={id:"rsp-"+Date.now().toString(36)+"-"+turn,v:1,kind:"rscribe.page",turn:turn,q:String(o.q||"").slice(0,500),a:text,model:model,lessons:lessons.length,ts:new Date().toISOString(),prompt:c.version};
 return SPINE.seal(page).then(function(h){page.seal=h;return SPINE.scribe(page)}).then(function(){return{text:text,model:model,device:"web",tier:"edge",turn:turn,seal:page.seal,lessons:lessons.length,prompt:c.version}})}
root.RDRAGON_ENGINE={answer:answer,load:load,pickModel:pickModel,rankLessons:rankLessons,isWeather:isWeather,quality:quality,qcheck:qcheck,clean:clean,liveGuard:liveGuard,buildMessages:buildMessages,_setCfg:function(c){CFG=c},MODELS:MODELS,BASE:BASE};
if(typeof module==="object"&&module.exports)module.exports=root.RDRAGON_ENGINE})(typeof window!=="undefined"?window:globalThis);
