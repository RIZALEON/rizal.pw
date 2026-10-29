// node tests: RDRAGON quality gate + race-pack (intent map, answers, ENJIN budget).
// Run: node tests/test-rdragon-quality.js (from repo root)
const fs=require('fs'),A=require('assert'),path=require('path'),vm=require('vm');
const ROOT=path.join(__dirname,'..');
const E=p=>path.join(ROOT,'rdragon-cryptosocial',p);
let n=0;const pass=name=>{n++;console.log('PASS',name)};

const card=JSON.parse(fs.readFileSync(E('engine/rdragon-card.json'),'utf8'));
const ghostLine=card.lines.find(l=>/Ghost Chain/i.test(l.t));
A.ok(ghostLine,'ghost chain line exists');
A.ok(!ghostLine.k.includes('ghost'),'bare ghost removed');
A.ok(!ghostLine.k.includes('chain'),'bare chain removed');
A.ok(ghostLine.k.includes('ghostchain'));
A.ok(ghostLine.k.includes('ghost chain'));
A.ok(ghostLine.k.includes('ghost-chain'));
pass('card.json Ghost Chain keys are distinctive only');

// Load engine qcheck in node
const engSrc=fs.readFileSync(E('engine/rdragon-engine.js'),'utf8');
const sandbox={window:{},globalThis:{},module:{exports:{}},console};
vm.runInNewContext(engSrc,sandbox,{filename:'rdragon-engine.js'});
const ENG=sandbox.module.exports||sandbox.globalThis.RDRAGON_ENGINE;
A.ok(ENG&&ENG.qcheck,'engine exports qcheck');
const cfg={quality:{minWords:8,greetMin:2,greetMax:60,echoMax:0.6,cannedRe:'sealed in the chain|the hoard grows',rejectCanned:['As an AI language model']}};
A.deepEqual(ENG.qcheck('Elongated skulls in the Philippines symbolized the importance of strength and power, often used in rituals to invoke divine authority and authority.',cfg,'why skulls'),[false,'repeated word']);
A.equal(ENG.qcheck('A cryptid is an animal people claim exists without scientific proof. A ghost in folklore is a spirit of the dead.',cfg,'cryptid vs ghost')[0],true);
A.equal(ENG.qcheck('power power is everything here today for real.',cfg,'x')[0],false);
pass('qcheck rejects consecutive duplicate content words');

// Evaluate strongKeys + hits logic from shim without DOM
const shim=fs.readFileSync(E('rdragon-bundle-shim.js'),'utf8');
A.ok(/strongKeys/.test(shim));
A.ok(/key length/.test(shim)||/length>=8/.test(shim));
A.ok(/local-card/.test(shim));
A.ok(/intent-card-map/.test(shim),'shim loads intent-card-map');
A.ok(/answers\.json/.test(shim),'shim loads answers.json');
A.ok(/intentHit/.test(shim)&&/answerHit/.test(shim));
pass('shim contains strongKeys + card fallback + race-pack hooks');

function strongKeys(mk){if(!mk||!mk.length)return false;if(mk.length>=2)return true;var k=String(mk[0]||'');if(k.length>=8)return true;if(/[\s-]/.test(k))return true;return false}
function hitsFor(q,lines){q=String(q||'').toLowerCase();return (lines||[]).map(function(l){var s=0,mk=[];(l.k||[]).forEach(function(k){var e=String(k).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');if(new RegExp('(^|[^a-z0-9я])'+e+'($|[^a-z0-9я])','i').test(q)){s+=k.length;mk.push(k)}});return{l:l,s:s,mk:mk}}).filter(function(x){return x.s>0&&strongKeys(x.mk)}).sort(function(a,b){return b.s-a.s}).map(function(x){return x.l})}

const folklore='What is the difference between a cryptid and a ghost in folklore?';
A.equal(hitsFor(folklore,card.lines).length,0,'folklore ghost must NOT hit Ghost Chain');
A.ok(hitsFor('tell me about the ghost chain',card.lines).length>=1,'ghost chain hits');
A.ok(hitsFor('what is ghostchain',card.lines).length>=1,'ghostchain hits');
A.ok(hitsFor('ghost-chain log',card.lines).length>=1,'ghost-chain hits');
pass('folklore ghost does not hit; ghost chain / ghostchain does');

// DENY scope
const DENY=/\b(not a real|isn'?t a real|not familiar|i don'?t know (what|who|about)|not a standard term|don'?t have (the necessary )?information|fictional|i'?m (sorry|unable)|i don'?t understand|not sure what)\b/i;
function bad(h,t){return false||(h.length&&DENY.test(t))}
const folkloreAns='A cryptid is rumored animal. A ghost in folklore is a spirit; many treat ghosts as fictional.';
A.equal(bad(hitsFor(folklore,card.lines),folkloreAns),false,'DENY not applied without strong hits');
const yalabAns='Ghost Chain is not a real public blockchain.';
A.equal(bad(hitsFor('what is the ghost chain',card.lines),yalabAns),true,'DENY can apply when Ghost Chain strongly hit and text denies');
pass('DENY only with strong hits');

const prompt=JSON.parse(fs.readFileSync(E('engine/rdragon-prompt.json'),'utf8'));
A.equal(prompt.version,'0.2.1-csanswer');
A.ok(/never repeat the same content word/i.test(prompt.system));
A.ok(/Do not refuse folklore/i.test(prompt.system));
pass('prompt 0.2.1 anti-repeat + folklore-safe');

// --- race-pack additions ---
const imap=JSON.parse(fs.readFileSync(E('engine/intent-card-map.json'),'utf8'));
A.equal(imap.kind,'rdragon.intent-card-map');
A.ok(Array.isArray(imap.intents)&&imap.intents.length>=4);
const gc=imap.intents.find(i=>i.id==='ghostchain');
A.ok(gc);
A.ok(gc.q.every(q=>q.length>=8||/[\s-]/.test(q)),'ghostchain intent phrases are distinctive');
A.ok(!gc.q.some(q=>q==='ghost'||q==='chain'),'no bare ghost/chain in intent map');
A.ok(gc.cardKeys.includes('ghostchain'));
// every cardKeys entry must exist on some card line
imap.intents.forEach(it=>{
  it.cardKeys.forEach(k=>{
    A.ok(card.lines.some(l=>(l.k||[]).includes(k)),'cardKeys '+k+' for '+it.id+' exists in card.json');
  });
});
pass('intent-card-map loads; distinctive phrases; cardKeys resolve');

function normQ(q){return String(q||'').toLowerCase().replace(/[^\w\sа-яёя]/gi,' ').replace(/\s+/g,' ').trim()}
function intentHit(q,IMAP,CARD){
  var nq=normQ(q),raw=String(q||'').toLowerCase(),list=(IMAP&&IMAP.intents)||[],lines=(CARD&&CARD.lines)||[];
  for(var i=0;i<list.length;i++){
    var it=list[i],qs=it.q||[],matched=null;
    for(var j=0;j<qs.length;j++){
      var p=String(qs[j]||''); if(!p) continue;
      var pl=p.toLowerCase();
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
A.equal(intentHit(folklore,imap,card),null,'folklore ghost must NOT intent-hit');
A.ok(intentHit('what is the ghost chain',imap,card),'ghost chain intent hits');
A.ok(intentHit('tell me about batibabox memory',imap,card),'batibabox intent hits');
A.ok(intentHit('what is rkrypt',imap,card),'wallet intent hits');
pass('intentHit: folklore 0; ghostchain/batibabox/wallet hit');

const answers=JSON.parse(fs.readFileSync(E('engine/answers.json'),'utf8'));
A.equal(answers.kind,'rdragon.answers');
A.ok(Array.isArray(answers.answers));
function answerHit(q,ANS){
  var nq=normQ(q);if(!nq)return null;var list=(ANS&&ANS.answers)||[];
  for(var i=0;i<list.length;i++){var row=list[i],keys=row.nq||row.q||[];for(var j=0;j<keys.length;j++){if(normQ(keys[j])===nq)return row}}
  return null;
}
A.ok(answerHit('What is the ghost chain?',answers),'answers pack hits ghost chain FAQ');
A.ok(answerHit('what is batibabox',answers),'answers pack hits batibabox FAQ');
A.equal(answerHit(folklore,answers),null,'folklore not in answers pack');
A.ok(fs.existsSync(E('engine/ANSWERS-README.md')),'ANSWERS-README present');
pass('answers.json pack loads and matches normalized FAQ');

// ENJIN budget in reply module: short timeout, no hang
const replySrc=fs.readFileSync(E('rdragon-reply.rzl.js'),'utf8');
A.ok(/ENJIN_MS/.test(replySrc));
A.ok(/RDRAGON_ENJIN_MS : 300\)/.test(replySrc),'default total budget 300ms single try (20261028)');
A.ok(/RDRAGON_ENJIN_CONNECT_MS : 300\)/.test(replySrc),'connect budget 300ms');
A.ok(/AbortController/.test(replySrc),'AbortController for fast fail');
A.ok(/onSite\(\)/.test(replySrc),'site still skips ENJIN (never probes Neo/17e)');
A.ok(/race-pack-20261028/.test(replySrc)||/1\.2-race-pack/.test(replySrc));
A.ok(/TIERS:.*pack/.test(replySrc)||/['"]pack['"]/.test(replySrc),'pack tier registered');
pass('ENJIN race budget wired in reply (300ms single try)');

// Simulate ENJIN timeout path: load reply in vm with fake fetch that never resolves; assert rejects within budget
(async function(){
  const g={};
  g.self=g; g.globalThis=g;
  let aborted=false;
  g.AbortController=function(){this.signal={aborted:false};this.abort=()=>{aborted=true;this.signal.aborted=true}};
  g.fetch=function(){return new Promise(function(){/* never resolves */})};
  g.navigator={onLine:true};
  // pretend NOT on site so enjin runs
  g.location={hostname:'localhost'};
  g.RDRAGON_ENJIN_MS=200; // speed up test
  g.RDRAGON_ENJIN_CONNECT_MS=50;
  // stub answers empty so pack misses
  g.RDRAGON_ANSWERS={answers:[]};
  vm.runInNewContext(replySrc,g,{filename:'rdragon-reply.rzl.js'});
  A.ok(g.RDRAGON&&g.RDRAGON.reply);
  A.equal(g.RDRAGON.ENJIN_MS,200);
  const t0=Date.now();
  let err=null;
  // force skip ibm/local by catching — call enjin path via reply; ibm will fail (no engine), local returns
  const r=await g.RDRAGON.reply({q:'hello enjin timeout test please',skipEnjin:false});
  const dt=Date.now()-t0;
  A.ok(dt<1500,'reply must not hang waiting on ENJIN; took '+dt+'ms');
  A.ok(r&&r.tier,'got a tier: '+r.tier);
  // With empty answers + failed enjin + no engine → local (or local after catches)
  A.ok(['local','pack','ibm','enjin','cmd'].includes(r.tier), 'tier='+r.tier);
  pass('ENJIN timeout path does not hang (fake never-resolve fetch)');

  // answers pack short-circuits before ENJIN when hit
  g2={}; g2.self=g2; g2.globalThis=g2;
  g2.AbortController=g.AbortController; g2.fetch=g.fetch; g2.navigator={onLine:true}; g2.location={hostname:'localhost'};
  g2.RDRAGON_ANSWERS=answers; g2.RDRAGON_ENJIN_MS=5000;
  // fresh load — but load guard: if RDRAGON.reply exists it returns. Use isolated global.
  delete g2.RDRAGON;
  vm.runInNewContext(replySrc,g2,{filename:'rdragon-reply.rzl.js'});
  const r2=await g2.RDRAGON.reply({q:'what is the ghost chain'});
  A.equal(r2.tier,'pack','answers pack wins before ENJIN');
  A.ok(/Ghost Chain/i.test(r2.text));
  pass('answers pack short-circuits before ENJIN/granite');

  // precache includes new files
  const precache=JSON.parse(fs.readFileSync(path.join(ROOT,'sw-precache.json'),'utf8'));
  A.ok(precache.files.includes('/rdragon-cryptosocial/engine/intent-card-map.json'));
  A.ok(precache.files.includes('/rdragon-cryptosocial/engine/answers.json'));
  A.ok(/race-pack/.test(precache.v));
  pass('sw-precache lists intent-card-map + answers.json');

  console.log(n+'/13 quality+race-pack tests pass');
})().catch(e=>{console.error('FAIL',e);process.exit(1)});
