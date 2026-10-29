// node tests: RDRAGON quality gate — Ghost Chain false-hit, strong hits, repeated-word qcheck, DENY scope.
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

// Evaluate strongKeys + hits logic from shim without DOM: reimplement / extract
const shim=fs.readFileSync(E('rdragon-bundle-shim.js'),'utf8');
A.ok(/strongKeys/.test(shim));
A.ok(/key length/.test(shim)||/length>=8/.test(shim));
A.ok(/local-card/.test(shim));
pass('shim contains strongKeys + card fallback');

function strongKeys(mk){if(!mk||!mk.length)return false;if(mk.length>=2)return true;var k=String(mk[0]||'');if(k.length>=8)return true;if(/[\s-]/.test(k))return true;return false}
function hitsFor(q,lines){q=String(q||'').toLowerCase();return (lines||[]).map(function(l){var s=0,mk=[];(l.k||[]).forEach(function(k){var e=String(k).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');if(new RegExp('(^|[^a-z0-9я])'+e+'($|[^a-z0-9я])','i').test(q)){s+=k.length;mk.push(k)}});return{l:l,s:s,mk:mk}}).filter(function(x){return x.s>0&&strongKeys(x.mk)}).sort(function(a,b){return b.s-a.s}).map(function(x){return x.l})}

const folklore='What is the difference between a cryptid and a ghost in folklore?';
A.equal(hitsFor(folklore,card.lines).length,0,'folklore ghost must NOT hit Ghost Chain');
A.ok(hitsFor('tell me about the ghost chain',card.lines).length>=1,'ghost chain hits');
A.ok(hitsFor('what is ghostchain',card.lines).length>=1,'ghostchain hits');
A.ok(hitsFor('ghost-chain log',card.lines).length>=1,'ghost-chain hits');
pass('folklore ghost does not hit; ghost chain / ghostchain does');

// DENY scope: with no strong hits, DENY must not be applied (simulate bad())
const DENY=/\b(not a real|isn'?t a real|not familiar|i don'?t know (what|who|about)|not a standard term|don'?t have (the necessary )?information|fictional|i'?m (sorry|unable)|i don'?t understand|not sure what)\b/i;
function bad(h,t){return false||(h.length&&DENY.test(t))} // frag skipped; DENY only if h
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

console.log(n+'/6 quality tests pass');
