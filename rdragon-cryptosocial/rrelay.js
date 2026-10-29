/* rrelay.js · LAYER 3 shared communication layer · 20261028
 * Comments + RDRAGON/DRAGOSKUL replies are published to free public Nostr relays (WebSocket) as kind-1 notes tagged
 * #t "rizalpw-csp-v1", signed in the browser with an EPHEMERAL per-session key (TEST-ONLY guest; never owner/biometric/vault,
 * never @rdragon_diag). No server, no token, no secret in client code. Every visitor subscribes to the same tag, so
 * comments and replies show up across visitors/devices without Neo or any of Rizal's devices.
 * Degrades gracefully: no WebSocket / lib load failure / relays down -> no-op; local replies keep working.
 * Payload (content, JSON): {v:1,app:"rizal.pw",kind:"comment"|"rdragon.reply"|"learn",id,post,parent,text,voice?,tier?,status?,q?,vote?}.
 * "learn" (1.1): a TEST-ONLY low-trust vote on a Q->A pair; receivers need >=3 independent keys before promotion (rdragon-learn.js). */
(function(w){"use strict";
var TAG="rizalpw-csp-v1",APP="rizal.pw",MAXT=600,VMAX=10,
 RELAYS=(w.RDRAGON_CONFIG&&w.RDRAGON_CONFIG.relays)||["wss://relay.damus.io","wss://nos.lol","wss://relay.primal.net","wss://relay.nostr.band"],
 LIB="/rdragon-cryptosocial/engine/vendor/nostr-tools.bundle.js?v=2.7.2";
var N=null,LP=null,SK=null,GUEST=null,socks={},seen={},subs=[],outbox=[],stat={relays:{},published:0,received:0,errors:0,state:"idle"};
function off(){try{var c=w.RDRAGON_CONFIG||{};if(c.relay===false)return true;if(/[?&]relay=0(&|$)/.test(w.location.search||""))return true}catch(e){}return typeof w.WebSocket!=="function"}
function lib(){if(w.NostrTools)return Promise.resolve(N=w.NostrTools);if(LP)return LP;LP=new Promise(function(ok,no){try{var s=w.document.createElement("script");s.src=LIB;s.onload=function(){w.NostrTools?ok(N=w.NostrTools):no(Error("nostr lib missing"))};s.onerror=function(){LP=null;no(Error("nostr lib load failed"))};w.document.head.appendChild(s)}catch(e){no(e)}});return LP}
function hex(b){return Array.prototype.map.call(b,function(x){return("0"+x.toString(16)).slice(-2)}).join("")}
/* TEST-ONLY session guest: key lives only in this closure (memory), regenerated every page load, never stored. */
function rnd(){try{var a=new Uint8Array(3);w.crypto.getRandomValues(a);return hex(a)}catch(e){return Math.random().toString(16).slice(2,8)}}
function guest(){if(GUEST&&(GUEST.pubkey||!N))return GUEST;var pk=null;if(N){SK=N.generateSecretKey();pk=N.getPublicKey(SK)}GUEST=Object.freeze({handle:GUEST?GUEST.handle:"guest-"+(pk?pk.slice(0,6):rnd()),pubkey:pk,test_only:true,session:true,owner:false,vault:false,biometric:false,label:"TEST-ONLY guest (this tab only)"});w.RDRAGON_GUEST=GUEST;return GUEST}
function payloadOf(ev){if(ev&&ev.t==="rdragon.learn"){var lq=String(ev.q||"").slice(0,200),la=String(ev.a||"").slice(0,MAXT);if(!lq.trim()||!la.trim())return null;var lp={v:1,app:APP,kind:"learn",id:String(ev.id||"").slice(0,80)||"rdl-"+Date.now(),post:"learn",parent:"learn",q:lq,text:la,vote:ev.vote<0?-1:1};if(Array.isArray(ev.votes)&&ev.votes.length)lp.votes=ev.votes.slice(0,VMAX).map(function(x){return {q:String(x.q||"").slice(0,200),a:String(x.a||"").slice(0,MAXT),vote:x.vote<0?-1:1}}).filter(function(x){return x.q.trim()&&x.a.trim()});return lp}
 if(ev&&(ev.t==="rdragon.diag"||ev.t==="rdragon.upgrade-request")){var dt=String(ev.text||"").slice(0,MAXT);if(!dt.trim())return null;return {v:1,app:APP,kind:ev.t==="rdragon.diag"?"diag":"upgrade-request",id:String(ev.id||"rdd-"+Date.now()).slice(0,80),post:"diag",parent:"diag",text:dt,test_only:true,report:String(ev.report||"").slice(0,6000)}}var k=ev.t==="comment"?"comment":ev.kind==="rdragon.reply"?"rdragon.reply":null;if(!k)return null;if(k==="rdragon.reply"&&ev.status!=="answered")return null;
 var p={v:1,app:APP,kind:k,id:String(ev.id||"").slice(0,80),post:String(ev.post||ev.root_id||ev.post_id||"").slice(0,80),parent:String(ev.parent||ev.par||ev.post_id||"").slice(0,80),text:String(ev.text||"").slice(0,MAXT)};
 if(k==="rdragon.reply"){p.voice=ev.voice==="DRAGOSKUL"?"DRAGOSKUL":"RDRAGON";p.tier=String(ev.tier||"").slice(0,20);p.status="answered";if(typeof ev.score==="number"&&ev.score>=0&&ev.score<=1)p.score=Math.round(ev.score*100)/100;if(ev.why)p.why=String(ev.why).slice(0,80)}
 if(!p.id||!p.parent||!p.text.trim())return null;return p}
function valid(p){if(p&&p.kind==="learn")return (!p.votes||Array.isArray(p.votes)&&p.votes.length<=VMAX&&p.votes.every(function(x){return x&&typeof x.q==="string"&&x.q.length<=200&&typeof x.a==="string"&&x.a.length<=MAXT&&(x.vote===1||x.vote===-1)}))&&p.v===1&&p.app===APP&&typeof p.q==="string"&&p.q.trim()&&p.q.length<=200&&typeof p.text==="string"&&p.text.trim()&&p.text.length<=MAXT&&(p.vote===1||p.vote===-1)&&typeof p.id==="string"&&p.id.length<=80;return p&&p.v===1&&p.app===APP&&(p.kind==="comment"||p.kind==="rdragon.reply")&&typeof p.id==="string"&&p.id.length<=80&&typeof p.parent==="string"&&p.parent&&typeof p.text==="string"&&p.text.trim()&&p.text.length<=MAXT&&(!p.voice||/^(RDRAGON|DRAGOSKUL)$/.test(p.voice))&&(p.score==null||typeof p.score==="number"&&p.score>=0&&p.score<=1)}
function send(url,msg){var s=socks[url];if(s&&s.readyState===1){try{s.send(JSON.stringify(msg));return true}catch(e){}}return false}
function onMsg(url,data){var m;try{m=JSON.parse(data)}catch(e){return}if(!Array.isArray(m))return;
 if(m[0]==="EVENT"&&m[2]){var e=m[2];if(!e||seen[e.id])return;var tg=(e.tags||[]).some(function(t){return t[0]==="t"&&t[1]===TAG});if(!tg||e.kind!==1)return;
  try{if(N&&!N.verifyEvent(e))return}catch(x){return}seen[e.id]=1;var p;try{p=JSON.parse(e.content)}catch(x){return}if(!valid(p))return;stat.received++;
  var meta={nostrId:e.id,pubkey:e.pubkey,author:"guest-"+String(e.pubkey).slice(0,6),created_at:e.created_at,relay:url,mine:!!(GUEST&&e.pubkey===GUEST.pubkey)};subs.forEach(function(f){try{f(p,meta)}catch(x){}})}
 else if(m[0]==="OK"){stat.relays[url]=m[2]?"ok":"rejected: "+String(m[3]||"").slice(0,80);stat.lastPublish={ok:!!m[2],relay:url,ts:Date.now(),err:m[2]?null:String(m[3]||"rejected").slice(0,120)};if(!m[2]){stat.lastError=stat.lastPublish.err;if(/rate|limit|slow|too many|pow/i.test(stat.lastError)){BK=Math.min((BK||2000)*2,60000);nextAt=Date.now()+BK;stat.backoffMs=BK}}else BK=0}else if(m[0]==="NOTICE"){stat.relays[url]="notice: "+String(m[1]||"").slice(0,80)}}
function connect(url){if(socks[url])return;var s;try{s=new w.WebSocket(url)}catch(e){stat.errors++;stat.relays[url]="ws failed";return}socks[url]=s;stat.relays[url]="connecting";
 var since=Math.floor(Date.now()/1000)-(w.RDRAGON_RELAY_DAYS||30)*86400;
 s.onopen=function(){stat.relays[url]="open";send(url,["REQ","rzl-"+TAG,{kinds:[1],"#t":[TAG],since:since,limit:500}]);outbox.forEach(function(e){send(url,["EVENT",e])})};
 s.onmessage=function(ev){onMsg(url,ev.data)};s.onerror=function(){stat.errors++;stat.relays[url]="error";stat.lastError="ws error "+url.replace(/^wss:\/\//,"")};
 s.onclose=function(){delete socks[url];if(stat.relays[url]!=="error")stat.relays[url]="closed";var n=(connect.tries[url]=(connect.tries[url]||0)+1);if(n<=3)setTimeout(function(){connect(url)},4000*n)}}
connect.tries={};
function start(){if(off()){stat.state="off";return Promise.resolve(false)}stat.state="loading";return lib().then(function(){guest();RELAYS.forEach(connect);stat.state="on";return true},function(e){stat.state="unavailable: "+(e&&e.message);return false})}
/* THROTTLE 20261028b: relays rate-limit bursts, so publishes go through a token bucket (burst 4, then one per GAP ms, exponential backoff after a rate-limit reject) */
var GAP=(w.RDRAGON_CONFIG&&w.RDRAGON_CONFIG.relayGapMs)||2000,BURST=4,tokens=BURST,lastFill=Date.now(),nextAt=0,BK=0,Q=[],qT=0;
function pump(){clearTimeout(qT);qT=0;var now=Date.now();tokens=Math.min(BURST,tokens+(now-lastFill)/GAP);lastFill=now;
 while(Q.length&&tokens>=1&&now>=nextAt){tokens-=1;var j=Q.shift();doPublish(j.p).then(j.ok,j.ok)}stat.queued=Q.length;
 if(Q.length)qT=setTimeout(pump,Math.max(nextAt-now,Math.ceil((1-tokens)*GAP),50))}
function publish(ev){if(off())return Promise.resolve(null);var p=payloadOf(ev);if(!p)return Promise.resolve(null);if(Q.length>=100)return Promise.resolve(null);
 return new Promise(function(ok){Q.push({p:p,ok:ok});pump()})}
/* vote batching: 👍/👎/better votes are collected for VB ms and sent as ONE learn note (<=10 votes, latest vote per pair wins) */
var VB=(w.RDRAGON_CONFIG&&w.RDRAGON_CONFIG.relayVoteBatchMs)||4000,VQ={},VT=0,VCAP=40,vSent=0;
function vote(q,a,v){if(off()||vSent>=VCAP)return false;q=String(q||"").slice(0,200);a=String(a||"").slice(0,MAXT);if(!q.trim()||!a.trim())return false;VQ[q+"\u0000"+a]={q:q,a:a,vote:v<0?-1:1};if(!VT)VT=setTimeout(flushVotes,VB);stat.votesPending=Object.keys(VQ).length;return true}
function flushVotes(){clearTimeout(VT);VT=0;var ks=Object.keys(VQ);if(!ks.length)return Promise.resolve(null);var vs=ks.slice(0,VMAX).map(function(k){var x=VQ[k];delete VQ[k];return x});vSent+=vs.length;stat.votesPending=Object.keys(VQ).length;if(stat.votesPending)VT=setTimeout(flushVotes,VB);
 stat.voteNotes=(stat.voteNotes||0)+1;return publish({t:"rdragon.learn",id:"rdl-"+Date.now().toString(36)+rnd(),q:vs[0].q,a:vs[0].a,vote:vs[0].vote,votes:vs.slice(1)})}
/* resync: re-send the subscription on every open socket and reconnect closed ones (history replays; app dedups by id) */
var rsN=0;function resync(){if(off())return Promise.resolve(false);return start().then(function(on){if(!on)return false;rsN++;RELAYS.forEach(function(u){connect.tries[u]=0;if(socks[u]&&socks[u].readyState===1)send(u,["REQ","rzl-"+TAG+"-r"+rsN,{kinds:[1],"#t":[TAG],since:Math.floor(Date.now()/1000)-(w.RDRAGON_RELAY_DAYS||30)*86400,limit:500}]);else connect(u)});stat.resyncs=rsN;return true})}
function doPublish(p){
 return start().then(function(on){if(!on||!SK)return null;var e=N.finalizeEvent({kind:1,created_at:Math.floor(Date.now()/1000),tags:[["t",TAG],["client",APP],["L","test-only"]],content:JSON.stringify(p)},SK);
  seen[e.id]=1;outbox.push(e);if(outbox.length>50)outbox.shift();var n=0;Object.keys(socks).forEach(function(u){if(send(u,["EVENT",e]))n++});stat.published++;stat.lastSentAt=Date.now();return e}).catch(function(x){stat.errors++;stat.lastError=String(x&&x.message||x).slice(0,120);return null})}
/* status line for the UI: connected relays, last publish ok/err, lastError */
function summary(){var u=Object.keys(stat.relays),c=u.filter(function(k){var s=socks[k];return (s&&s.readyState===1)||/^(open|ok)$/.test(stat.relays[k])&&!!s}).length,lp=stat.lastPublish;
 return {state:stat.state,connected:c,total:RELAYS.length,published:stat.published,received:stat.received,lastPublish:lp?(lp.ok?"ok":"err")+" · "+lp.relay.replace(/^wss:\/\//,""):(stat.published?"sent":"none"),lastError:stat.lastError||null,line:"relay: "+(/^(on|loading)$/.test(stat.state)?c+"/"+RELAYS.length+" connected":stat.state)+" · last publish "+(lp?(lp.ok?"ok":"err"):"—")+(stat.lastError?" · lastError: "+stat.lastError:"")}}
function subscribe(f){if(typeof f==="function")subs.push(f);start();return function(){subs=subs.filter(function(x){return x!==f})}}
w.RRELAY={start:start,publish:publish,subscribe:subscribe,guest:guest,status:function(){return JSON.parse(JSON.stringify(stat))},summary:summary,vote:vote,flushVotes:flushVotes,resync:resync,payloadOf:payloadOf,valid:valid,TAG:TAG,RELAYS:RELAYS,VERSION:"rrelay 1.2 throttle+batch+diag 20261028",_reset:function(){Q=[];VQ={};vSent=0;tokens=BURST;nextAt=0;BK=0;stat={relays:{},published:0,received:0,errors:0,state:"idle"};socks={};seen={};subs=[];outbox=[];GUEST=null;SK=null;LP=null;N=null}};
})(typeof window!=="undefined"?window:globalThis);
