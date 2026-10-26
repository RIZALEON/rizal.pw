/* RDRAGON MIND v1 · browser port of BATIBABOX + the public-safe MACHINE MIND seed.
   Pipeline per ask: SPINE (rcounter/rtoken/rscribe JS stand-ins) -> BATIBABOX (context assembly) -> MIND (seed persona + state + base commands) -> HEART (Granite).
   Ported from (read-only, Neo): SUPER-BONEPILE/BATIBABOX/BATIBABOX.organ.rzl (rzl.organ.batibabox.v1: long_term_memory, rag, knowledge_base,
   index, consolidation; placement SPINE -> BATIBABOX -> HEART; /batibabox, /recall), ЯKLASSROOM/BLUEPRINTS/BATIBABOX-RSCRIBE-INFORMATIONAL-2026-10-16
   (digest + live delta + most-recalled topics feed every reply; read once, remember), MACHINE-MIND/SEED/STUDY-BATIBABOX-RVM-RZL-20261013
   (base-command-before-Heart rule; no key material in any digest; hard filter on key/seed patterns).
   NOT ported: the signed MACHINE-MIND egg, SPINE.json scaffold/genetics, journals, transcripts, identities. Embedding index stays keyword/BM25 (as in organ 2.1.5).
   PRIVACY: memory lives in this browser's IndexedDB. It leaves the device ONLY as AES-GCM ciphertext in ЯSYNC entries t:"rdragon.memory" v1 scope:"private",
   and ONLY when the host page hands it a sync hook (devices with private-peers.json) AND the device has a memory sync passphrase set. Never in lessons-public.json. */
(function(root){"use strict";
var VERSION="1.0.0",enc=new TextEncoder(),dec=new TextDecoder();
var C=(typeof crypto!=="undefined"&&crypto.subtle)?crypto:null;
/* ---------- MIND: public-safe seed (persona + rules + state). No private facts. ---------- */
var SEED={schema:"rdragon.mind.seed.v1",name:"RDRAGON",home:"rizal.pw CryptoSocial",
 rules:["Answer plainly and briefly.","Never reveal keys, passwords, tokens, private addresses or private memory of anyone but the asker.","Say so when you don't know or can't see live data."],
 commands:{"/batibabox":"status and wiring","/recall <topic>":"matching memory only","/forget-view":"memory is append-only; nothing is deleted"}};
var SECRET_RE=/(-----BEGIN [A-Z ]*PRIVATE KEY|\b(?:sk|ghp|gho|xox[abp])[-_][A-Za-z0-9_-]{10,}|\bpassword\s*[:=]|\b(?:seed|mnemonic)\s*(?:phrase|words)?\s*[:=]|\b[0-9a-f]{64}\b|\b(?:[a-z]+ ){11,23}[a-z]+\b(?=.*\b(?:seed|wallet)\b))/i;
function scrub(s){s=String(s||"");return SECRET_RE.test(s)?"[withheld: looked like key material]":s}
function words(s){return(String(s||"").toLowerCase().match(/[a-z0-9\u00c0-\uffff']+/g)||[]).filter(function(w){return w.length>2})}
var STOP={the:1,and:1,for:1,are:1,was:1,what:1,how:1,why:1,who:1,its:1,this:1,that:1,with:1,you:1,your:1,can:1,will:1,does:1,from:1,have:1,about:1};
function terms(s){return words(s).filter(function(w){return !STOP[w]})}
/* ---------- BATIBABOX index: BM25 keyword recall, weighted by recall count (consolidation: most-recalled first) ---------- */
function bm25(q,docs,k){var N=docs.length;if(!N)return[];var D=docs.map(function(d){return terms(d.text)}),avg=D.reduce(function(a,d){return a+d.length},0)/N||1,df={};
 D.forEach(function(d){var u={};d.forEach(function(w){if(!u[w]){u[w]=1;df[w]=(df[w]||0)+1}})});var qt=terms(q);
 return docs.map(function(doc,i){var tf={},s=0;D[i].forEach(function(w){tf[w]=(tf[w]||0)+1});qt.forEach(function(w){if(!tf[w])return;s+=Math.log(1+(N-df[w]+.5)/(df[w]+.5))*tf[w]*2.2/(tf[w]+1.2*(.25+.75*D[i].length/avg))});
  return{doc:doc,s:s*(1+Math.log(1+(doc.recalls||0))*.25)}}).filter(function(x){return x.s>0}).sort(function(a,b){return b.s-a.s}).slice(0,k||4).map(function(x){return x.doc})}
/* ---------- long-term memory: extractive digest (summary) per profile ---------- */
function summarize(pages,max){max=max||600;var tf={};pages.forEach(function(p){terms(p.q+" "+p.a).forEach(function(w){tf[w]=(tf[w]||0)+1})});
 var sents=[];pages.forEach(function(p){String(p.q||"").split(/(?<=[.!?])\s+/).concat(String(p.a||"").split(/(?<=[.!?])\s+/)).forEach(function(s){s=s.trim();if(s.length>12)sents.push(s)})});
 var sc=sents.map(function(s,i){var t=terms(s);return{s:s,i:i,v:t.reduce(function(a,w){return a+(tf[w]||0)},0)/Math.sqrt(t.length||1)}}).sort(function(a,b){return b.v-a.v});
 var out=[],n=0,seen={};for(var j=0;j<sc.length&&n<max;j++){var k=sc[j].s.toLowerCase();if(seen[k])continue;seen[k]=1;out.push(sc[j]);n+=sc[j].s.length+1}
 var top=Object.keys(tf).sort(function(a,b){return tf[b]-tf[a]}).slice(0,8);
 return{topics:top,text:scrub(out.sort(function(a,b){return a.i-b.i}).map(function(x){return x.s}).join(" ").slice(0,max))}}
/* storage: pluggable (IndexedDB in browsers, memory map in tests) */
function memStore(){var m={};return{get:function(k){return Promise.resolve(m[k]||null)},put:function(k,v){m[k]=v;return Promise.resolve(v)},all:function(pre){return Promise.resolve(Object.keys(m).filter(function(k){return k.indexOf(pre)===0}).map(function(k){return m[k]}))}}}
function idbStore(){var db=new Promise(function(ok,no){if(typeof indexedDB==="undefined")return no(Error("no idb"));var r=indexedDB.open("rdragon.mind.v1",1);r.onupgradeneeded=function(){r.result.createObjectStore("kv")};r.onsuccess=function(){ok(r.result)};r.onerror=no});
 function tx(m,f){return db.then(function(d){return new Promise(function(ok,no){var t=d.transaction("kv",m),s=t.objectStore("kv"),r=f(s);t.oncomplete=function(){ok(r&&r.result)};t.onerror=function(){no(t.error)}})})}
 return{get:function(k){return tx("readonly",function(s){return s.get(k)}).then(function(v){return v||null})},put:function(k,v){return tx("readwrite",function(s){s.put(v,k)}).then(function(){return v})},
  all:function(pre){return tx("readonly",function(s){return s.getAll(IDBKeyRange.bound(pre,pre+"\uffff"))}).then(function(v){return v||[]})}}}
function create(o){o=o||{};var store=o.store||(typeof indexedDB!=="undefined"?idbStore():memStore()),every=o.consolidateEvery||6,syncHook=null,key=null,deviceTag=o.device||"web";
 function P(profile){return"p:"+(profile||"anon")+":"}
 /* remember one turn (rscribe page) -> page store; consolidate into the digest every N pages. Additive: nothing deleted. */
 function remember(profile,page){var pg={id:page.id||("m-"+Date.now().toString(36)+Math.random().toString(36).slice(2,6)),q:scrub(page.q).slice(0,500),a:scrub(page.a).slice(0,700),ts:page.ts||new Date().toISOString(),recalls:0,device:page.device||deviceTag};
  return store.put(P(profile)+"page:"+pg.id,pg).then(function(){return store.all(P(profile)+"page:")}).then(function(all){if(all.length%every===0)return consolidate(profile,all)}).then(function(){if(syncHook)return pushSync(profile,pg);}).then(function(){return pg})}
 function consolidate(profile,all){return(all?Promise.resolve(all):store.all(P(profile)+"page:")).then(function(pages){pages.sort(function(a,b){return(b.recalls||0)-(a.recalls||0)||(a.ts<b.ts?1:-1)});
  var d=summarize(pages.slice(0,40));d.v=1;d.pages=pages.length;d.ts=new Date().toISOString();return store.put(P(profile)+"digest",d)})}
 function recall(profile,q,k){return store.all(P(profile)+"page:").then(function(pages){var hit=bm25(q,pages.map(function(p){return Object.assign({text:p.q+" "+p.a},p)}),k||4);
  return Promise.all(hit.map(function(h){h.recalls=(h.recalls||0)+1;var c=Object.assign({},h);delete c.text;return store.put(P(profile)+"page:"+h.id,c)})).then(function(){return hit})})}
 function digest(profile){return store.get(P(profile)+"digest")}
 /* BATIBABOX: assemble the context in organ order (knowledge/seed -> digest -> recalled pages -> lessons -> thread), within a char budget */
 function assemble(a){var budget=a.budget||3200,parts=[],used=0;function add(title,body,cap){if(!body)return;body=String(body).slice(0,cap||budget);if(used+body.length>budget)body=body.slice(0,Math.max(0,budget-used));if(!body)return;parts.push(title+"\n"+body);used+=body.length}
  add("MIND (seed):",SEED.rules.join(" "),400);
  if(a.digest&&a.digest.text)add("Long-term memory digest"+(a.digest.topics&&a.digest.topics.length?" (topics: "+a.digest.topics.join(", ")+")":"")+":",a.digest.text,700);
  if(a.recalled&&a.recalled.length)add("Recalled from earlier conversations:",a.recalled.map(function(m){return"Q: "+String(m.q).slice(0,160)+"\nA: "+String(m.a).slice(0,220)}).join("\n"),1100);
  if(a.lessons&&a.lessons.length)add("Lessons learned from Rizal's corrections (follow them):",a.lessons.map(function(l,i){return(i+1)+". "+String(l.text).slice(0,240)}).join("\n"),900);
  return{text:parts.join("\n\n"),sections:parts.length,chars:used}}
 /* MIND base commands run BEFORE the heart (no model call) */
 function command(profile,q){var t=String(q||"").trim(),m;if(/^\/?batibabox\b/i.test(t))return Promise.all([store.all(P(profile)+"page:"),digest(profile)]).then(function(r){return"BATIBABOX "+VERSION+" · SPINE → BATIBABOX → MIND → HEART · pages "+r[0].length+" · digest "+(r[1]?r[1].pages+" pages, topics "+r[1].topics.join(", "):"not yet")+" · sync "+(syncHook?(key?"on (encrypted)":"needs memory passphrase"):"this device only")});
  if((m=t.match(/^\/?recall\s+(.+)/i)))return recall(profile,m[1],5).then(function(h){return h.length?h.map(function(x){return"• "+x.q+" → "+x.a.slice(0,160)}).join("\n"):"Nothing in memory matches \""+m[1]+"\"."});return null}
 /* ---------- ЯSYNC: rdragon.memory v1 (encrypted, private) ---------- */
 function setPassphrase(profile,pass){if(!C)return Promise.reject(Error("no webcrypto"));return C.subtle.importKey("raw",enc.encode(pass),"PBKDF2",false,["deriveKey"]).then(function(b){
  return C.subtle.deriveKey({name:"PBKDF2",salt:enc.encode("rdragon.memory.v1|"+profile),iterations:310000,hash:"SHA-256"},b,{name:"AES-GCM",length:256},false,["encrypt","decrypt"])}).then(function(k){key=k;return true})}
 function b64(u){var s="";u=new Uint8Array(u);for(var i=0;i<u.length;i++)s+=String.fromCharCode(u[i]);return(typeof btoa==="function"?btoa(s):Buffer.from(s,"binary").toString("base64"))}
 function unb64(s){var b=typeof atob==="function"?atob(s):Buffer.from(s,"base64").toString("binary"),o=new Uint8Array(b.length);for(var i=0;i<o.length;i++)o[i]=b.charCodeAt(i);return o}
 function sealPage(profile,pg){var iv=C.getRandomValues(new Uint8Array(12));return C.subtle.encrypt({name:"AES-GCM",iv:iv},key,enc.encode(JSON.stringify(pg))).then(function(ct){
  return{t:"rdragon.memory",v:1,kind:"rdragon.memory",scope:"private",id:"rdm-"+pg.id,mem_profile:profile,enc:"AES-GCM-256/PBKDF2-310000",iv:b64(iv),ct:b64(ct),ts:pg.ts}})}
 function pushSync(profile,pg){if(!syncHook||!key)return Promise.resolve(null);return sealPage(profile,pg).then(function(e){return syncHook(e)})}
 /* ingest synced entries from other devices (decrypt; ignore what we can't open) */
 function ingest(entries){if(!key)return Promise.resolve(0);var n=0;return(entries||[]).filter(function(e){return e&&e.t==="rdragon.memory"&&e.v===1&&e.ct}).reduce(function(c,e){return c.then(function(){
  return C.subtle.decrypt({name:"AES-GCM",iv:unb64(e.iv)},key,unb64(e.ct)).then(function(b){var pg=JSON.parse(dec.decode(b));var k=P(e.mem_profile)+"page:"+pg.id;return store.get(k).then(function(h){if(h)return;n++;return store.put(k,pg)})},function(){})})},Promise.resolve()).then(function(){return n})}
 return{VERSION:VERSION,SEED:SEED,remember:remember,consolidate:consolidate,recall:recall,digest:digest,assemble:assemble,command:command,setPassphrase:setPassphrase,ingest:ingest,
  onSync:function(fn){syncHook=fn},hasKey:function(){return!!key},_store:store}}
var api={VERSION:VERSION,SEED:SEED,create:create,summarize:summarize,bm25:bm25,scrub:scrub,memStore:memStore};
root.RDRAGON_MIND=api;if(typeof module==="object"&&module.exports)module.exports=api})(typeof window!=="undefined"?window:globalThis);
