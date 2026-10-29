/* rdragon-bundle-shim.js · RFORGE race-pack 20261028 · additive only.
 * 1) Loads engine/rdragon-mind.js and wraps MIND.command so a null (non-command) result becomes a Promise (fixes engine answer() "null.then").
 * 2) Preloads engine/rdragon-engine.js so window.RDRAGON_ENGINE exists on app origins.
 * 3) Race-pack: intent-card-map + answers.json before granite; strong-hit card retrieval; DENY/qcheck; card fallback.
 * Strong hit rule (PR #22): key length≥8 OR ≥2 distinct key hits OR a multi-word key. Bare "ghost"/"chain" alone must not match. */
(function(w){var B='/rdragon-cryptosocial/engine/';function add(src,cb){var s=document.createElement('script');s.src=src;s.onload=cb;s.onerror=cb;document.head.appendChild(s)}
function wrap(){var M=w.RDRAGON_MIND;if(!M||M.__rforgeWrapped)return;var c=M.create;M.create=function(){var m=c.apply(this,arguments);if(m&&typeof m.command==='function'){var k=m.command;m.command=function(){return Promise.resolve(k.apply(m,arguments))}}return m};M.__rforgeWrapped=1}
add(B+'rdragon-mind.js?v=1',function(){wrap();if(!w.RDRAGON_ENGINE)add(B+'rdragon-engine.js?v=6',function(){})})})(window);
/* RFORGE race-pack 20261028: intent→card + answers pack + strong keyword retrieval + fragment/denial guard + card-line offline fallback. */
(function(w){
var CARD=null,CP=null,IMAP=null,IP=null,ANS=null,AP=null;
function card(){return CP||(CP=fetch('/rdragon-cryptosocial/engine/rdragon-card.json?v=3').then(function(r){return r.json()}).then(function(c){CARD=c;return c},function(){CARD={lines:[]};return CARD}))}
function intentMap(){return IP||(IP=fetch('/rdragon-cryptosocial/engine/intent-card-map.json?v=1').then(function(r){return r.json()}).then(function(c){IMAP=c;return c},function(){IMAP={intents:[]};return IMAP}))}
function answers(){return AP||(AP=fetch('/rdragon-cryptosocial/engine/answers.json?v=3',{cache:'no-store'}).then(function(r){return r.json()}).then(function(c){ANS=c;w.RDRAGON_ANSWERS=c;return c},function(){ANS={answers:[]};return ANS}))}
function normQ(q){return String(q||'').toLowerCase().replace(/[^\w\sа-яёя]/gi,' ').replace(/\s+/g,' ').trim()}
function strongKeys(mk){if(!mk||!mk.length)return false;if(mk.length>=2)return true;var k=String(mk[0]||'');if(k.length>=8)return true;if(/[\s-]/.test(k))return true;return false}
function hits(q){q=String(q||'').toLowerCase();return ((CARD&&CARD.lines)||[]).map(function(l){var s=0,mk=[];(l.k||[]).forEach(function(k){var e=String(k).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');if(new RegExp('(^|[^a-z0-9я])'+e+'($|[^a-z0-9я])','i').test(q)){s+=k.length;mk.push(k)}});return{l:l,s:s,mk:mk}}).filter(function(x){return x.s>0&&strongKeys(x.mk)}).sort(function(a,b){return b.s-a.s}).map(function(x){return x.l})}
function facts(q){var h=hits(q),rest=((CARD&&CARD.lines)||[]).filter(function(l){return h.indexOf(l)<0});return (CARD&&CARD.intro?CARD.intro+'\n':'')+h.concat(rest).map(function(l){return '- '+l.t}).join('\n')}
/* Intent → card line: phrase must be distinctive (len≥8 or multi-word / hyphen), then resolve via cardKeys. Bare ghost never matches. */
function intentHit(q){
  var nq=normQ(q),raw=String(q||'').toLowerCase(),list=(IMAP&&IMAP.intents)||[],lines=(CARD&&CARD.lines)||[];
  for(var i=0;i<list.length;i++){
    var it=list[i],qs=it.q||[],matched=null;
    for(var j=0;j<qs.length;j++){
      var p=String(qs[j]||''); if(!p) continue;
      var pl=p.toLowerCase();
      /* distinctive phrase only — mirrors strongKeys */
      if(!(p.length>=8 || /[\s-]/.test(p))) continue;
      if(nq===normQ(p) || raw.indexOf(pl)>=0){ matched=p; break; }
    }
    if(!matched) continue;
    var keys=it.cardKeys||[];
    for(var li=0;li<lines.length;li++){
      var L=lines[li], lk=L.k||[];
      for(var ki=0;ki<keys.length;ki++){ if(lk.indexOf(keys[ki])>=0) return L; }
    }
  }
  return null;
}
function answerHit(q){
  var nq=normQ(q);if(!nq)return null;var QK=w.RDRAGON_QUICK,nq2=QK?normQ(QK.stripAsk(q)):nq,list=(ANS&&ANS.answers)||[];
  for(var i=0;i<list.length;i++){var row=list[i],keys=row.nq||row.q||[];for(var j=0;j<keys.length;j++){var k=normQ(keys[j]);if(k===nq||k===nq2)return row}}
  return null;
}
/* local-first 20261028: the whole no-network ladder, quick (math/rules) -> intent card -> answers.json. Resolves null on miss; never touches Neo/ENJIN/127.0.0.1. */
function quickHit(q){var QK=w.RDRAGON_QUICK;var r=QK&&QK.quick(q);return r&&r.text?{text:r.text,tier:'quick',model:r.model,tag:'RDRAGON · local',by:'RDRAGON',device:'web'}:null}
function pickBest(C,q){if(!C.length)return null;var R=w.RDRAGON_RANK,r=R&&R.rankSources?R.rankSources(C,q):C;if(!r.length)return null;var top=r[0];top.alts=r.slice(1).map(function(c){return {tier:c.tier,score:c.score}});return top}
function localAnswer(q,ms){var raw=String(q||''),qh=quickHit(raw);if(qh){var R0=w.RDRAGON_RANK;if(R0){var c0=R0.conf('quick');qh.score=c0.score;qh.why=c0.why}return Promise.resolve(qh)}
  var all=Promise.all([card(),intentMap(),answers()]).then(function(){
   /* BEST FIRST 20261028: collect every local source (intent card, answers.json, learned pack, relay-learned) and let RDRAGON_RANK pick the highest-confidence one; score/why ride along. */
   var C=[],ih=intentHit(raw),ah=answerHit(raw),L=w.RDRAGON_LEARN,lh=null;try{lh=L&&L.lookup(raw)}catch(e){}
   if(ih&&ih.t)C.push({text:ih.t,tier:'local-card',model:'intent-card',tag:'RDRAGON · local-card',by:'RDRAGON',device:'web'});
   if(ah&&ah.a)C.push({text:String(ah.a).slice(0,600),tier:'pack',model:'answers',tag:'RDRAGON · pack',by:'RDRAGON',device:'web',src:ah.src||'answers'});
   if(lh&&lh.text&&!(lh.tier==='relay-learned'&&ih&&ih.t))C.push({text:String(lh.text).slice(0,600),tier:lh.tier,model:'learned',tag:'RDRAGON · '+lh.tier,by:'RDRAGON',device:'web',key:lh.key});
   return pickBest(C,raw)},function(){return null});
  return Promise.race([all,new Promise(function(ok){setTimeout(function(){ok(null)},ms||3000)})])}
var DENY=/\b(not a real|isn'?t a real|not familiar|i don'?t know (what|who|about)|not a standard term|don'?t have (the necessary )?information|fictional|i'?m (sorry|unable)|i don'?t understand|not sure what)\b/i;
var VERB=/\b(is|are|was|were|be|been|has|have|had|do|does|did|can|could|will|would|should|may|might|must|means?|runs?|works?|shows?|keeps?|lets?|holds?|answers?|uses?|seals?|links?|opens?|[a-z]{3,}(ed|es|s))\b/i;
function frag(t){t=String(t||'').trim();var n=(t.match(/[A-Za-z0-9']+/g)||[]).length;return n<8||!/[.!?)"”]$/.test(t)||!VERB.test(t)||/^(is|are|was|and|but|or|of|to)\b/i.test(t)}
w.RDRAGON_CARD={load:card,hits:hits,facts:facts,frag:frag,deny:function(t){return DENY.test(t)},strongKeys:strongKeys,intentHit:intentHit,answerHit:answerHit,quickHit:quickHit,localAnswer:localAnswer,pickBest:pickBest,normQ:normQ,intentMap:intentMap,answers:answers};
function wrapEngine(E){if(!E||E.__cardWrapped)return;var A=E.answer;E.answer=function(o){o=Object.assign({},o||{});var raw=String(o.q||'');
 return Promise.all([card(),intentMap(),answers()]).then(function(){
  var qh=quickHit(raw);if(qh)return qh;
  var ih=intentHit(raw);if(ih&&ih.t)return{text:ih.t,tier:'local-card',model:'intent-card',tag:'RDRAGON · local-card',device:'web'};
  var ah=answerHit(raw);if(ah&&ah.a)return{text:String(ah.a).slice(0,600),tier:'pack',model:'answers',tag:'RDRAGON · pack',device:'web',src:ah.src||'answers'};
  var h=hits(raw);var ord=h.concat(((CARD&&CARD.lines)||[]).filter(function(l){return h.indexOf(l)<0}));o.lessons=(o.lessons||[]).concat([{text:(CARD&&CARD.intro)||'',kind:'teach'}],ord.map(function(l){return{text:l.t,kind:'correction'}}));
  function bad(r){var t=String(r&&r.text||'');return frag(t)||(h.length&&DENY.test(t))}
  function cardFallback(base){var t=h[0].t;return Object.assign({},base||{},{text:t,tier:'local-card',model:'card',tag:'RDRAGON · local-card'})}
  return A.call(E,o).then(function(r){if(!bad(r))return r;return A.call(E,o).then(function(r2){if(!bad(r2))return r2;if(h.length)return cardFallback(r2||r);var draft=String((r2&&r2.text)||(r&&r.text)||'');if(!draft||frag(draft))throw Error('quality: fragment/denial');throw Error('quality: fragment/denial')})})})}
 ;E.__cardWrapped=1}
function wrapReply(){var R=w.RDRAGON;if(!R||!R.reply||R.__cardWrapped)return;var f=R.reply;R.reply=function(post){var q=typeof post==='string'?post:(post&&post.q)||'';
 return Promise.all([card(),intentMap(),answers()]).then(function(){
  var qh=quickHit(q);if(qh)return qh;
  var ih=intentHit(q);if(ih&&ih.t)return{text:ih.t,tier:'local-card',model:'intent-card',tag:'RDRAGON · local-card',by:'RDRAGON'};
  var ah=answerHit(q);if(ah&&ah.a)return{text:String(ah.a).slice(0,600),tier:'pack',model:'answers',tag:'RDRAGON · pack',by:'RDRAGON',src:ah.src||'answers'};
  return f.apply(R,arguments).then(function(r){if(r.tier!=='local'&&r.tier!=='open')return r;return card().then(function(){var h=hits(q);if(!h.length||r.tier==='open'&&!hits(q).length)return r;r.text=h[0].t;r.tier='local-card';r.model='card';r.tag='RDRAGON · local-card';return r})})})};
 R.__cardWrapped=1}
var n=0,iv=setInterval(function(){if(w.RDRAGON_ENGINE)wrapEngine(w.RDRAGON_ENGINE);wrapReply();if((w.RDRAGON_ENGINE&&w.RDRAGON_ENGINE.__cardWrapped&&w.RDRAGON&&w.RDRAGON.__cardWrapped)||++n>600)clearInterval(iv)},100);
Promise.all([card(),intentMap(),answers()])})(window);
