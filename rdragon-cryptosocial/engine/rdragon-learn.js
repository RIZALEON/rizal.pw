/* rdragon-learn.js · GROWTH + RANKING · 20261028
 * RDRAGON_RANK: "best options first". Every answer source and every candidate option gets an explainable score
 *   {score, why}. Sources: quick 0.95 > intent card 0.90 > answers.json 0.80 > granite/edge 0.75 > learned 0.55-0.85
 *   > open quick take 0.40 > relay-learned <=0.50 > generic fallback 0.15. Learned weights move items up or down.
 * RDRAGON_LEARN: a learning loop. Each Q->A is recorded with signals: 👍/👎, "better answer", a follow-up rephrase
 *   (= miss on the previous answer), a granite upgrade beating the quick take. Weights update per answer; good pairs
 *   are promoted into a learned pack the ranker uses. Persists to localStorage when storage is OK (memory under
 *   ?nostore=1 via rstore.js). Relay-learned pairs are LOW-TRUST: >=3 independent upvoting keys before promotion,
 *   never override owner intent cards, must pass the safety filter. Never learns owner/vault/biometric/secret data.
 *   NEVER DELETES (Rizal's law): items are only reweighted; demoted items stay in the pack with their history. */
(function(root){"use strict";
var KEY="rdragon.learn.v1",VER="rdragon-learn 1.1 20261028b",MAXQ=200,MAXA=600,CAP=3000,RELAY_MIN=3,REPHRASE_MS=180000;
var CONF={quick:0.95,"local-card":0.90,card:0.90,pack:0.80,edge:0.75,granite:0.75,device:0.78,learned:0.55,open:0.40,"relay-learned":0.30,generic:0.15};
var PRIV=/\b(vault|biometric|face ?id|touch ?id|passkey|pass ?phrase|seed ?phrase|mnemonic|private ?key|secret ?key|password|passcode|api ?key|token|ssn|social security|credit card|cvv|iban|routing number|rdragon_diag|nsec1)\b|\b0x[a-f0-9]{40}\b|\b[a-f0-9]{64}\b|\b\d{13,19}\b/i;
function normQ(q){return String(q||"").toLowerCase().replace(/[“”"'`’‘]/g,"").replace(/[^a-z0-9 ]+/g," ").replace(/\s+/g," ").trim()}
function toks(s){return normQ(s).split(" ").filter(function(w){return w.length>2&&!/^(the|and|for|you|your|are|what|how|can|with|that|this|about|give|me|some|please|any|best)$/.test(w)})}
function jac(a,b){var A=toks(a),B=toks(b);if(!A.length||!B.length)return 0;var s={},i=0;A.forEach(function(w){s[w]=1});B.forEach(function(w){if(s[w]){i++;s[w]=0}});return i/(A.length+B.length-i)}
function h32(s){var h=2166136261;s=String(s);for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0}return h.toString(16)}
function keyOf(q,a){return normQ(q).slice(0,120)+"|"+h32(String(a||"").trim())}
function safe(t){var C=root.RDRAGON_CARD;t=String(t||"");if(!t.trim())return false;if(PRIV.test(t))return false;try{if(C&&C.deny&&C.deny(t))return false}catch(e){}return true}
function r2(x){return Math.round(x*100)/100}
/* ---------- store (never delete) ---------- */
var ST=null,MODE="memory",last=null,byReply={};
function storageOk(){var s=root.RDRAGON_STORAGE;return !(s&&s.ok===false)}
function load(){if(ST)return ST;ST={v:1,items:{},opts:{},n:0};MODE=storageOk()?"persistent":"memory";
 if(MODE==="persistent")try{var raw=root.localStorage&&root.localStorage.getItem(KEY);if(raw){var j=JSON.parse(raw);if(j&&j.v===1&&j.items){ST=j;ST.opts=ST.opts||{}}}}catch(e){}return ST}
var svT=0;function save(){if(MODE!=="persistent")return;clearTimeout(svT);svT=setTimeout(function(){try{root.localStorage.setItem(KEY,JSON.stringify(ST))}catch(e){}},50)}
function saveNow(){if(MODE!=="persistent")return;try{root.localStorage.setItem(KEY,JSON.stringify(ST))}catch(e){}}
function weight(it){/* explainable weight: 👍 +1, 👎 -1.5, miss -0.75, better/upgrade win +1, lost to upgrade -0.5, relay vote +0.5 each */
 return r2((it.up||0)-1.5*(it.down||0)-0.75*(it.miss||0)+(it.wins||0)-0.5*(it.losses||0)+0.5*Object.keys(it.rv||{}).filter(function(k){return it.rv[k]>0}).length-0.5*Object.keys(it.rv||{}).filter(function(k){return it.rv[k]<0}).length)}
function promoteCheck(it){var w=weight(it),was=!!it.promoted;
 if(it.trust==="relay"){var ups=Object.keys(it.rv||{}).filter(function(k){return it.rv[k]>0}).length,dn=Object.keys(it.rv||{}).filter(function(k){return it.rv[k]<0}).length;
  it.promoted=!it.blocked&&ups>=RELAY_MIN&&ups>dn*2;it.why=it.blocked?"blocked: "+it.blocked:"relay "+ups+"/"+RELAY_MIN+" independent upvotes"+(dn?", "+dn+" down":"")}
 else{it.promoted=!it.blocked&&w>=1&&(it.down||0)<=(it.up||0)+(it.wins||0);it.why="w"+w+(it.promoted?" ≥ 1":" < 1")}
 if(it.promoted!==was)it.promotedTs=Date.now();return it.promoted}
function item(q,a,src,trust){var S=load(),k=keyOf(q,a),it=S.items[k];
 if(!it){if(Object.keys(S.items).length>=CAP)return null; /* full: stop adding (never delete old items) */
  it=S.items[k]={q:String(q).slice(0,MAXQ),a:String(a).slice(0,MAXA),nq:normQ(q).slice(0,120),src:src||"open",trust:trust||"local",n:0,up:0,down:0,miss:0,wins:0,losses:0,rv:{},promoted:false,ts:Date.now()}}
 return it}
/* record(q, a, src, meta) -> key. meta.owner / private text => not learned at all. */
function record(q,a,src,meta){meta=meta||{};if(meta.owner||meta.private||!safe(q)||!safe(a))return null;var it=item(q,a,src,"local");if(!it)return null;var S=load();it.n++;S.n++;it.seen=Date.now();
 var k=keyOf(q,a);if(meta.reply)byReply[meta.reply]=k;
 /* follow-up rephrase: a new, similar but different question soon after = the previous answer missed */
 var now=meta.now||Date.now();if(last&&last.k!==k&&normQ(last.q)!==normQ(q)&&now-last.t<REPHRASE_MS&&jac(last.q,q)>=0.5){var p=S.items[last.k];if(p){p.miss++;promoteCheck(p)}}
 last={k:k,q:q,t:now};promoteCheck(it);save();return k}
function get(k){return load().items[k]||null}
function keyFor(ref){return byReply[ref]||(load().items[ref]?ref:null)}
/* signal(ref, type, extra): type up|down|miss|better|upgrade. ref = reply id or item key. */
function signal(ref,type,x){var S=load(),k=keyFor(ref),it=k&&S.items[k];x=x||{};if(!it&&type!=="better")return null;
 if(type==="up")it.up++;else if(type==="down")it.down++;else if(type==="miss")it.miss++;
 else if(type==="better"){if(!safe(x.text))return null;if(it)it.down++;var q=it?it.q:x.q;if(!q||!safe(q))return null;var b=item(q,String(x.text).slice(0,MAXA),"learned","local");if(!b)return null;b.wins++;b.up++;b.n++;promoteCheck(b);if(it)promoteCheck(it);save();return keyOf(q,x.text)}
 else if(type==="upgrade"){/* granite beat the quick take: winner up, loser down (kept, never deleted) */var w2=x.winner&&safe(x.winner)?item(it.q,x.winner,x.src||"edge","local"):null;if(w2){w2.wins++;w2.n++;promoteCheck(w2)}it.losses++}
 else return null;promoteCheck(it);save();return k}
/* option-level weights for ranked candidates (tips, names, project ideas) */
function optVote(text,d){var S=load(),k=h32(normQ(text));S.opts[k]=r2((S.opts[k]||0)+d);save();return S.opts[k]}
function optW(text){var S=load();return S.opts[h32(normQ(text))]||0}
/* relay learn events: {q,a,vote:+1|-1} signed by a guest key. Low trust; owner cards win; safety filter. */
function relayVote(q,a,pubkey,vote){if(!pubkey||!safe(q)||!safe(a))return null;var S=load(),k=keyOf(q,a),it=S.items[k]||item(q,a,"relay-learned","relay");if(!it)return null;
 if(it.trust!=="relay"){/* local item: a relay vote is a small nudge only */it.rv=it.rv||{};it.rv[String(pubkey).slice(0,64)]=vote>0?1:-1;promoteCheck(it);save();return k}
 var C=root.RDRAGON_CARD;try{if(C&&C.intentHit&&C.intentHit(q))it.blocked="owner-card"}catch(e){}
 it.rv[String(pubkey).slice(0,64)]=vote>0?1:-1;promoteCheck(it);save();return k}
/* lookup(q) -> best promoted learned answer for this question, with score + why */
function lookup(q){var S=load(),nq=normQ(q),best=null;if(!nq)return null;Object.keys(S.items).forEach(function(k){var it=S.items[k];if(!it.promoted||it.nq!==nq)return;var c=conf(it.trust==="relay"?"relay-learned":"learned",it);if(!best||c.score>best.score)best={text:it.a,tier:it.trust==="relay"?"relay-learned":"learned",model:"learned",key:k,score:c.score,why:c.why}});return best}
function conf(src,it){var base=CONF[src]!=null?CONF[src]:0.3,w=it?weight(it):0,s=base,why=src+" "+base;
 if(src==="learned"){s=Math.min(0.85,base+0.05*w);why="learned 0.55+0.05×w"+w}
 else if(src==="relay-learned"){var ups=it?Object.keys(it.rv||{}).filter(function(k){return it.rv[k]>0}).length:0;s=Math.min(0.50,base+0.04*ups);why="relay-learned 0.30+0.04×"+ups+" votes (cap 0.50, low-trust)"}
 else if(it&&w){s=Math.max(0.05,Math.min(0.99,base+0.03*w));why+=" "+(w>0?"+":"")+r2(0.03*w)+" (w"+w+")"}
 return {score:r2(s),why:why}}
/* rankSources([{text,tier,...}], q) -> sorted copies with .score/.why, best first. Ties keep ladder order. */
function rankSources(list,q){var S=load();return (list||[]).filter(function(c){return c&&c.text}).map(function(c,i){var src=c.tier==="open"&&c.kind==="generic"?"generic":c.tier||"open",it=S.items[keyOf(q||c.q||"",c.text)]||null;if(src==="relay-learned"&&c.blocked)return null;var r=conf(src,it);return Object.assign({},c,{score:r.score,why:r.why,_i:i})}).filter(Boolean).sort(function(a,b){return b.score-a.score||a._i-b._i}).map(function(c){delete c._i;return c})}
/* rankOptions(["opt",...], q, prior?) -> [{text,score,why}] best first: relevance to q + learned option weight + prior order */
function rankOptions(opts,q,prior){var qt=toks(q);return (opts||[]).map(function(o,i){var t=String(o),ot=toks(t),rel=0;ot.forEach(function(w){if(qt.indexOf(w)>=0)rel++});var w=optW(t),p=prior&&prior[i]!=null?prior[i]:Math.max(0,0.3-0.03*i),s=r2(0.5+0.15*Math.min(rel,3)+0.1*w+p);
 return {text:t,score:s,why:"rel"+rel+(w?" w"+w:"")+" prior"+r2(p),_i:i}}).sort(function(a,b){return b.score-a.score||a._i-b._i}).map(function(c){delete c._i;return c})}
/* REPAIR (rdiag): reweight bad items, never delete. Bad = now fails the safety filter, more 👎 than 👍+wins, or relay-only with net downvotes. Each gets a quarantine down-mark and is re-checked. */
function demoteBad(){var S=load(),n=0;Object.keys(S.items).forEach(function(k){var it=S.items[k],bad=!safe(it.q)||!safe(it.a)||(it.down||0)>(it.up||0)+(it.wins||0)||(it.trust==="relay"&&weight(it)<0);if(!bad||it.quarantined)return;it.quarantined=Date.now();it.down=(it.down||0)+1;if(!safe(it.q)||!safe(it.a))it.blocked="unsafe";promoteCheck(it);n++});save();return {reweighted:n,total:Object.keys(S.items).length,deleted:0}}
function snapshot(){return JSON.parse(JSON.stringify(load()))}
function pack(){var S=load();return Object.keys(S.items).filter(function(k){return S.items[k].promoted}).map(function(k){var it=S.items[k];return {q:it.q,a:it.a,src:it.src,trust:it.trust,w:weight(it),why:it.why}})}
function stats(){var S=load(),ks=Object.keys(S.items);return {mode:MODE,items:ks.length,promoted:ks.filter(function(k){return S.items[k].promoted}).length,relay:ks.filter(function(k){return S.items[k].trust==="relay"}).length,records:S.n,version:VER}}
root.RDRAGON_RANK={rankSources:rankSources,rankOptions:rankOptions,conf:conf,CONF:CONF,VERSION:VER};
root.RDRAGON_LEARN={record:record,signal:signal,relayVote:relayVote,lookup:lookup,get:get,keyOf:keyOf,keyFor:keyFor,weight:weight,optVote:optVote,optW:optW,pack:pack,stats:stats,demoteBad:demoteBad,snapshot:snapshot,safe:safe,normQ:normQ,similar:jac,flush:saveNow,RELAY_MIN:RELAY_MIN,VERSION:VER,
 _reset:function(){ST=null;last=null;byReply={}}};
if(typeof module==="object"&&module.exports)module.exports={RANK:root.RDRAGON_RANK,LEARN:root.RDRAGON_LEARN};
})(typeof self!=="undefined"?self:globalThis);
