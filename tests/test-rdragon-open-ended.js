// node tests: RDRAGON open-ended guaranteed answer path (20261028). Run: node tests/test-rdragon-open-ended.js
// The 12 live @rdragon_diag prompts must each get a non-placeholder answer locally within the ~2.5 s deadline,
// even when granite never loads. No network: fetch is stubbed from disk; loopback is refused.
const fs=require('fs'),A=require('assert'),path=require('path'),vm=require('vm');
const ROOT=path.join(__dirname,'..'),E=p=>path.join(ROOT,'rdragon-cryptosocial',p);
let n=0;const pass=m=>{n++;console.log('PASS',m)};
function sandbox(){const calls=[];const fetch=(url)=>{url=String(url);calls.push(url);if(/127\.0\.0\.1|localhost/.test(url))return Promise.reject(new TypeError('refused'));
  const f=path.join(ROOT,url.replace(/^https?:\/\/[^/]+/,'').split('?')[0]);if(!fs.existsSync(f))return Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({})});
  const t=fs.readFileSync(f,'utf8');return Promise.resolve({ok:true,status:200,json:()=>Promise.resolve(JSON.parse(t)),text:()=>Promise.resolve(t)})};
  const sb={console,URL,Promise,setTimeout,clearTimeout,setInterval:()=>0,clearInterval:()=>{},AbortController,fetch,
    location:{href:'https://rizal.pw/',hostname:'rizal.pw',search:'',protocol:'https:'},localStorage:{getItem:()=>null,setItem(){}},navigator:{onLine:true},
    document:{head:{appendChild(){}},createElement:()=>({}),addEventListener(){}},module:undefined};
  sb.self=sb;sb.window=sb;sb.globalThis=sb;vm.createContext(sb);
  return {sb,calls,load:f=>vm.runInContext(fs.readFileSync(E(f),'utf8'),sb,{filename:f})}}
const PLACE=/will answer when synced|queued and will be answered|^RDRAGON is (offline|thinking|warming)|^thinking…/i;
const PROMPTS=[
 ['What is 17 times 23?',/391/],
 ['What is BATIBABOX?',/memory/i],
 ['Summarize rizal.pw in one sentence.',/rizal\.pw|GHOSTMACHINE|CryptoSocial/i],
 ['Write a haiku about rain',/rain/i],
 ['Suggest a name for my pet dragon',/Ember|Cinder|Pyra|Smolder|Scorch|Ashbloom|Obsidian|Kindle/],
 ['Tell me a short joke',/\?/],
 ['Who are you?',/RDRAGON/],
 ['Give me three tips for better sleep',/1\..*\n2\..*\n3\./s],
 ['What is the capital of Australia?',/Canberra/],
 ['Translate good morning to Spanish',/Buenos días/],
 ['If I have 5 apples and eat 2, how many are left?',/\b3\b/],
 ['Suggest a beginner weekend coding project',/app|game|page|calculator/i]];
(async()=>{
 const S=sandbox();['engine/rdragon-quick.js','engine/rdragon-open.js','rdragon-reply.rzl.js','rdragon-bundle-shim.js'].forEach(S.load);
 const C=S.sb.RDRAGON_CARD,O=S.sb.RDRAGON_OPEN;
 // comment ladder path (mirrors rdWriteQueued): localAnswer(2500) then composer
 for(const [q,re] of PROMPTS){const t0=Date.now();let r=await C.localAnswer(q,2500);if(!r)r=O.compose(q);const ms=Date.now()-t0;
  A.ok(r&&r.text,'answer for '+q);A.ok(!PLACE.test(r.text),'placeholder for '+q+': '+r.text);A.ok(re.test(r.text),q+' -> '+r.text);A.ok(ms<=2600,q+' took '+ms);
  console.log('  ok',JSON.stringify(q),'->',JSON.stringify(r.text.slice(0,90)),'['+r.tier+', '+ms+'ms]');}
 pass('12 live prompts: non-placeholder local answers within the deadline');
 // reply chain with a granite that never finishes: deadline -> composer, never RDOFF
 S.sb.RDRAGON_ENGINE={answer:()=>new Promise(()=>{})};S.sb.RDRAGON_OPEN_MS=200;
 {const t0=Date.now();const r=await S.sb.RDRAGON.reply({q:'Tell me a short joke'});A.ok(!PLACE.test(r.text)&&Date.now()-t0<3000,r.text);pass('reply chain: hung granite -> quick take ('+r.tier+')');}
 // generic fallback is honest, never placeholder
 {const r=O.compose('What is the airspeed of a laden swallow?');A.strictEqual(r.kind,'generic');A.ok(/best quick take/.test(r.text)&&!PLACE.test(r.text));pass('generic honest fallback');}
 // word problems
 A.strictEqual(O.wordMath('i have 12 cookies and share them equally between 4 friends how many each').v,3);
 A.strictEqual(O.wordMath('tom has 3 bags of 4 marbles each how many in total').v,12);
 A.strictEqual(O.wordMath('sam has 7 pens and buys 5 more how many now').v,12);pass('word-problem add/subtract/multiply/divide');
 // weather guard narrowed
 const eng=fs.readFileSync(E('engine/rdragon-engine.js'),'utf8');const g={};vm.runInNewContext(eng.match(/function isCreative[^\n]*\nfunction isWeather[^\n]*/)[0]+';this.w=isWeather',g);
 A.strictEqual(g.w('Write a haiku about rain'),false);A.strictEqual(g.w('write a poem about a storm'),false);A.strictEqual(g.w('a song about snow'),false);
 A.strictEqual(g.w("what's the weather now?"),true);A.strictEqual(g.w('will it rain today?'),true);pass('live-data guard: creative passes, live weather guarded');
 // cryptosocial wiring
 const csp=fs.readFileSync(E('rdragon-cryptosocial.js'),'utf8');
 A.ok(/rdr-"\+id\+"-open"/.test(csp)&&/RDRAGON_OPEN/.test(csp),'open reply event');A.ok(/b\.tier!=="open"\)return;rdEdge/.test(csp),'granite still runs after quick take');
 A.ok(/upgraded:upg/.test(csp)&&/· upgraded/.test(csp),'upgrade marked');A.ok(/granite timed out/.test(csp),'timeout visible');pass('cryptosocial: quick take then in-place granite upgrade, timeout visible');
 const idx=fs.readFileSync(path.join(ROOT,'index.html'),'utf8'),pc=fs.readFileSync(path.join(ROOT,'sw-precache.json'),'utf8');
 A.ok(/engine\/rdragon-open\.js\?v=1/.test(idx)&&/rdragon-open\.js/.test(pc));pass('index + precache ship rdragon-open.js');
 console.log('\n'+n+' passed');process.exit(0);
})().catch(e=>{console.error('FAIL',e);process.exit(1)});
