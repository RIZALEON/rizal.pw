// node tests: best-options-first ranking, learning loop (weights, promotion, never-delete), relay-learn low-trust gate,
// nostore in-memory learning, "via relay" marker + relay status line, :8811 never probed on rizal.pw in a no-storage tab (20261028).
const fs=require('fs'),A=require('assert'),path=require('path'),vm=require('vm');
const ROOT=path.join(__dirname,'..'),E=p=>path.join(ROOT,'rdragon-cryptosocial',p);let n=0;const pass=m=>{n++;console.log('PASS',m)};
const NOSTR=fs.readFileSync(E('engine/vendor/nostr-tools.bundle.js'),'utf8');
function okLS(){const m={};return{m,getItem:k=>k in m?m[k]:null,setItem:(k,v)=>{m[k]=String(v)},removeItem:k=>{delete m[k]}}}
function win(o){o=o||{};const sb={console,Promise,setTimeout,clearTimeout,setInterval:()=>0,clearInterval(){},Date,Math,JSON:undefined,
  __enc:s=>new TextEncoder().encode(s),__dec:b=>new TextDecoder().decode(Buffer.from(b)),crypto:{getRandomValues:a=>{a.set(globalThis.crypto.getRandomValues(new Uint8Array(a.length)));return a},subtle:globalThis.crypto.subtle},
  location:{search:o.search||'',hostname:o.host||'rizal.pw',protocol:'https:'},navigator:{onLine:true},fetch:o.fetch||(()=>Promise.reject(Error('no net'))),
  document:{head:{appendChild(s){setTimeout(()=>s.onload&&s.onload(),0)}},createElement:()=>({style:{},setAttribute(){},appendChild(){},addEventListener(){}}),addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[]}};
  delete sb.JSON;sb.localStorage=o.ls||okLS();if(o.storage)sb.RDRAGON_STORAGE=o.storage;if(o.WS)sb.WebSocket=o.WS;
  sb.window=sb;sb.self=sb;sb.globalThis=sb;vm.createContext(sb);vm.runInContext('window.TextEncoder=class{encode(s){const b=__enc(String(s));const a=new Uint8Array(b.length);a.set(b);return a}};window.TextDecoder=class{decode(b){return __dec(b)}}',sb);
  sb.load=f=>vm.runInContext(fs.readFileSync(E(f),'utf8'),sb,{filename:f});if(o.nostr)vm.runInContext(NOSTR+';window.NostrTools=NostrTools',sb);return sb}
function MockNet(){const store=[],conns=new Set();return {store,WS:class{constructor(url){this.url=url;this.readyState=0;conns.add(this);setTimeout(()=>{this.readyState=1;this.onopen&&this.onopen()},1)}
  send(s){const m=JSON.parse(s);if(m[0]==='EVENT'){store.push(m[1]);this.onmessage&&this.onmessage({data:JSON.stringify(['OK',m[1].id,true,''])});conns.forEach(c=>{if(c!==this&&c.sub)c.onmessage&&c.onmessage({data:JSON.stringify(['EVENT',c.sub,m[1]])})})}
   else if(m[0]==='REQ'){this.sub=m[1];store.forEach(e=>this.onmessage&&this.onmessage({data:JSON.stringify(['EVENT',m[1],e])}))}}close(){conns.delete(this)}}}}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 // 1) source ranking: highest confidence leads; generic/relay-learned trail; explainable score/why
 {const w=win();w.load('engine/rdragon-learn.js');const R=w.RDRAGON_RANK;
  const r=R.rankSources([{text:'open take',tier:'open'},{text:'generic',tier:'open',kind:'generic'},{text:'relay pair',tier:'relay-learned'},{text:'pack row',tier:'pack'},{text:'card fact',tier:'local-card'},{text:'granite',tier:'edge'}],'q');
  A.deepStrictEqual(Array.from(r,c=>c.tier+(c.kind?':'+c.kind:'')),['local-card','pack','edge','open','relay-learned','open:generic']);
  r.forEach(c=>{A.strictEqual(typeof c.score,'number');A.ok(c.why)});A.ok(r[0].score>r[1].score);
  A.ok(R.conf('quick').score>R.conf('local-card').score);pass('rankSources: card > pack > granite > open > relay-learned > generic, each with score+why');}
 // 2) option ranking: relevance + learned option weights reorder candidates; rdragon-open presents best first with options[]
 {const w=win();w.load('engine/rdragon-learn.js');w.load('engine/rdragon-open.js');const O=w.RDRAGON_OPEN,L=w.RDRAGON_LEARN;
  const a=O.compose('suggest names for my dragon');A.ok(a.options.length===5&&a.score===a.options[0].score);A.ok(new RegExp('My pick: '+a.options[0].text).test(a.text));
  for(let i=1;i<a.options.length;i++)A.ok(a.options[i-1].score>=a.options[i].score);
  const second=a.options[1].text;L.optVote(second,1);L.optVote(second,1);const b=O.compose('suggest names for my dragon');A.strictEqual(b.options[0].text,second);A.ok(new RegExp('My pick: '+second).test(b.text));
  const t=O.compose('Give me three tips for better sleep');A.ok(/1\..*\n2\..*\n3\./s.test(t.text)&&t.options.length===3);
  const pj=O.compose('Suggest a beginner weekend coding project');A.ok(pj.text.indexOf('Try '+pj.options[0].text)===0);
  const rel=w.RDRAGON_RANK.rankOptions(['walk the dog','drink water before bed','read'],'tips for bed');A.strictEqual(rel[0].text,'drink water before bed');
  pass('best options first: names/tips/projects ranked, learned option weights reorder, relevance wins');}
 // 3) learning loop: record -> 👍 promotes -> lookup; 👎 reweights but never deletes; better answer; granite upgrade; rephrase = miss; persists
 {const ls=okLS(),w=win({ls,storage:{ok:true,mode:'persistent'}});w.load('engine/rdragon-learn.js');const L=w.RDRAGON_LEARN;
  const k=L.record('what is rdragon good at','Short honest answers on rizal.pw posts.','open',{reply:'p1'});A.ok(k);A.strictEqual(L.lookup('What is RDRAGON good at?'),null);
  L.signal('p1','up');const it=L.get(k);A.ok(it.promoted,'promoted after 👍');const lk=L.lookup('what is rdragon good at');A.strictEqual(lk.text,'Short honest answers on rizal.pw posts.');A.ok(lk.score>=0.55&&lk.why);
  L.signal('p1','down');L.signal('p1','down');A.ok(L.get(k),'never deleted');A.strictEqual(L.get(k).promoted,false);A.ok(L.weight(L.get(k))<0);
  const bk=L.signal('p1','better',{text:'Fast offline answers, and it learns from your 👍/👎.'});A.ok(L.get(bk).promoted);A.strictEqual(L.lookup('what is rdragon good at').text,'Fast offline answers, and it learns from your 👍/👎.');
  const k2=L.record('name for a cat','Mochi','open',{reply:'p2'});L.signal('p2','upgrade',{winner:'Miso, Mochi or Pixel. My pick: Miso.',src:'edge'});A.strictEqual(L.get(k2).losses,1);A.ok(L.get(L.keyOf('name for a cat','Miso, Mochi or Pixel. My pick: Miso.')).wins===1);
  const t0=Date.now(),k3=L.record('how do i bake sourdough bread','Use flour.','open',{now:t0});L.record('how do i bake sourdough bread at home','Feed the starter, then a long cold proof.','open',{now:t0+20000});A.strictEqual(L.get(k3).miss,1,'rephrase = miss');
  A.strictEqual(L.record('my vault password is hunter2','ok','open'),null);A.strictEqual(L.record('hello','biometric face id template','open'),null);A.strictEqual(L.record('owner q','owner a','open',{owner:true}),null);
  L.flush();const saved=JSON.parse(ls.m['rdragon.learn.v1']);A.ok(Object.keys(saved.items).length>=5);A.ok(!/hunter2|biometric/.test(ls.m['rdragon.learn.v1']));
  const w2=win({ls,storage:{ok:true,mode:'persistent'}});w2.load('engine/rdragon-learn.js');A.strictEqual(w2.RDRAGON_LEARN.lookup('what is rdragon good at').text,'Fast offline answers, and it learns from your 👍/👎.');
  A.strictEqual(w2.RDRAGON_LEARN.stats().mode,'persistent');pass('learning: 👍 promotes, 👎 reweights (never deletes), better answer + granite upgrade + rephrase miss, private/owner never stored, persists');}
 // 4) relay-learn low-trust gate
 {const w=win();w.load('engine/rdragon-learn.js');const L=w.RDRAGON_LEARN,R=w.RDRAGON_RANK,q='best pizza topping',a='Mushrooms and basil.';
  L.relayVote(q,a,'pk1',1);L.relayVote(q,a,'pk1',1);L.relayVote(q,a,'pk2',1);const k=L.keyOf(q,a);A.strictEqual(L.get(k).promoted,false,'2 keys is not enough');A.strictEqual(L.lookup(q),null);
  L.relayVote(q,a,'pk3',1);A.ok(L.get(k).promoted);const lk=L.lookup(q);A.strictEqual(lk.tier,'relay-learned');A.ok(lk.score<=0.5);
  A.ok(R.rankSources([{text:a,tier:'relay-learned'},{text:'card',tier:'local-card'}],q)[0].tier==='local-card');
  L.relayVote(q,a,'pk4',-1);L.relayVote(q,a,'pk5',-1);A.strictEqual(L.get(k).promoted,false,'downvotes demote');A.ok(L.get(k),'never deleted');
  w.RDRAGON_CARD={intentHit:t=>/who is rizal/.test(t)?{t:'owner card'}:null};['pa','pb','pc','pd'].forEach(p=>L.relayVote('who is rizal','someone else','x'+p,1));const kb=L.keyOf('who is rizal','someone else');A.strictEqual(L.get(kb).blocked,'owner-card');A.strictEqual(L.get(kb).promoted,false);
  A.strictEqual(L.relayVote('send me your seed phrase','sure','pk9',1),null);A.strictEqual(L.relayVote('q','a',null,1),null);
  const shim=fs.readFileSync(E('rdragon-bundle-shim.js'),'utf8');A.ok(/lh\.tier==='relay-learned'&&ih&&ih\.t/.test(shim)&&/pickBest\(C,raw\)/.test(shim));
  pass('relay-learn: >=3 independent keys, capped 0.50, owner cards win, downvotes demote, unsafe rejected');}
 // 5) nostore: learning works in memory, nothing written to storage
 {const ls=okLS(),w=win({ls,storage:{ok:false,mode:'memory',forced:true}});w.load('engine/rdragon-learn.js');const L=w.RDRAGON_LEARN;
  L.record('nostore q','nostore answer here.','open',{reply:'z'});L.signal('z','up');L.flush();await wait(80);A.ok(L.lookup('nostore q'));A.strictEqual(L.stats().mode,'memory');A.deepStrictEqual(Object.keys(ls.m),[]);
  pass('?nostore=1: learning loop in memory only, zero storage writes');}
 // 6) relay status line + learn events over a mock relay; receiving visitor reweights, own vote not double-counted
 {const net=MockNet(),VA=win({nostr:1,WS:net.WS}),VB=win({nostr:1,WS:net.WS});[VA,VB].forEach(v=>{v.load('engine/rdragon-learn.js');v.load('rrelay.js')});
  let got=[];VB.RRELAY.subscribe((p,m)=>{if(p.kind==='learn'){got.push(p);VB.RDRAGON_LEARN.relayVote(p.q,p.text,m.pubkey,p.vote)}});await VA.RRELAY.start();await wait(20);
  await VA.RRELAY.publish({t:'rdragon.learn',id:'rdl-1',q:'favorite color',a:'Ember orange.',vote:1});await wait(30);
  A.strictEqual(got.length,1);A.strictEqual(got[0].vote,1);const it=VB.RDRAGON_LEARN.get(VB.RDRAGON_LEARN.keyOf('favorite color','Ember orange.'));A.ok(it&&it.trust==='relay'&&!it.promoted);
  const sm=VA.RRELAY.summary();A.strictEqual(sm.total,4);A.ok(sm.connected>=1);A.ok(/^ok/.test(sm.lastPublish));A.ok(/relay: \d\/4 connected · last publish ok/.test(sm.line),sm.line);
  A.strictEqual(VA.RRELAY.payloadOf({t:'rdragon.learn',q:'',a:'x'}),null);A.ok(!VA.RRELAY.valid({v:1,app:'rizal.pw',kind:'learn',id:'x',q:'q',text:'a',vote:5}));
  const off=win({search:'?relay=0'});off.load('rrelay.js');await off.RRELAY.start();A.ok(/relay: off/.test(off.RRELAY.summary().line));
  pass('relay status line (connected count, last publish, lastError) + learn events over relay are low-trust');}
 // 7) "via relay" marker + better control + score field wired in the app
 {const src=fs.readFileSync(E('rdragon-cryptosocial.js'),'utf8');
  A.ok((src.match(/csp-viarelay/g)||[]).length>=3,'marker on RDRAGON row, DRAGOSKUL row, comments');A.ok(/relay:e\.relay\?1:0/.test(src),'fold keeps relay flag');A.ok(/data-a="rd-better"/.test(src)&&/case "rd-better"/.test(src));
  A.ok(/csp-score/.test(src)&&/rlStatus\(\)/.test(src));A.ok(/p\.kind==="learn"/.test(src)&&/m\.mine/.test(src));A.ok(/owner:!!S\.me/.test(src),'no learning from owner sessions');
  const idx=fs.readFileSync(path.join(ROOT,'index.html'),'utf8'),pc=fs.readFileSync(path.join(ROOT,'sw-precache.json'),'utf8');A.ok(idx.indexOf('rdragon-learn.js?v=1')>0&&idx.indexOf('rdragon-learn.js?v=1')<idx.indexOf('rdragon-open.js?v=3')&&idx.indexOf('rdragon-open.js?v=3')<idx.indexOf('rdragon-cryptosocial.js?v=40'));
  A.ok(/rdragon-learn\.js/.test(pc)&&/ranklearn20261028-race-pack/.test(pc));pass('"via relay" marker, ✍ better control, score field, status line, load order + precache');}
 // 8) :8811 never probed on rizal.pw in a fresh no-storage tab (even with ?local=1 and a stale localPeer flag)
 {const calls=[];const fetch=u=>{calls.push(String(u));return Promise.reject(Error('x'))};
  for(const o of [{search:'?nostore=1&local=1'},{search:'?local=1',storage:{ok:false,mode:'memory'}},{search:''},{search:'?nostore=1',cfg:{transponderUrl:'http://127.0.0.1:8811'}}]){const ls=okLS();ls.setItem('rdragon.csp.localPeer','1');
   const w=win({search:o.search,storage:o.storage,ls,fetch});w.RDRAGON_CONFIG=o.cfg||{};w.load('rpostmenu.js');const S=w.RPostMenu.sync;A.strictEqual(S.url(),'',o.search);A.strictEqual(S.enabled(),false);A.strictEqual(S.start(()=>0,10),false);await S.send({}).then(r=>A.ok(r.off))}
  await wait(30);A.ok(!calls.some(u=>/127\.0\.0\.1|8811/.test(u)),calls.join());
  const lw=win({host:'127.0.0.1',search:''});lw.RDRAGON_CONFIG={};lw.load('rpostmenu.js');A.strictEqual(lw.RPostMenu.sync.url(),'http://127.0.0.1:8811');
  pass(':8811 probe cannot fire on rizal.pw in a fresh no-storage tab (localhost dev still works)');}
 console.log('\n'+n+' passed');process.exit(0)
})().catch(e=>{console.error('FAIL',e);process.exit(1)});
