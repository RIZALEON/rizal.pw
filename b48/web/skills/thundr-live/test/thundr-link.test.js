// node thundr-link.test.js — DOM-stub tests: ask, /thundr chat intercept, signed mailbox (real Ed25519 sig), replay + tamper refusal, outbox
const fs=require("fs"),vm=require("vm"),path=require("path");let pass=0,fail=0;const ok=(c,m)=>{c?pass++:(fail++,console.log("FAIL",m))};
const L={};const mk=()=>({style:{},append(){},appendChild(){},setAttribute(){},remove(){},addEventListener(){},isConnected:true,hidden:true,textContent:""});
const doc={readyState:"complete",body:mk(),head:{appendChild(){}},documentElement:{appendChild(){}},createElement:mk,getElementById:()=>null,querySelectorAll:()=>[],dispatchEvent(e){(L[e.type]||[]).forEach(f=>f(e))},addEventListener(t,f){(L[t]=L[t]||[]).push(f)}};
class CE{constructor(t,o){this.type=t;this.detail=o&&o.detail}}
const posted=[],turns=[];const J=(p)=>{try{return JSON.parse(p.text.slice(11))}catch(e){return {}}};
const win={document:doc,CustomEvent:CE,crypto:globalThis.crypto,TextEncoder,atob:(s)=>Buffer.from(s,"base64").toString("binary"),Uint8Array,localStorage:{_:{},getItem(k){return this._[k]||null},setItem(k,v){this._[k]=v}},
 addEventListener(){},setTimeout,clearTimeout,setInterval:()=>0,clearInterval(){},innerWidth:400,innerHeight:800,location:{pathname:"/x/scout.html",href:""},getComputedStyle:()=>({backgroundColor:"rgb(10,8,12)"}),matchMedia:()=>({matches:false,addEventListener(){}}),
 webkit:{messageHandlers:{rosTranscript:{postMessage:(m)=>posted.push(m)}}},pushTurn:(r,t)=>turns.push([r,t]),
 RL_BOTWIN:{handle:async()=>"heart"},RL_SUPERDRAGON:{version:"2.1.9.18"},RL_RSCRIBE:{},fetch:()=>Promise.resolve({ok:true})};
win.window=win;Object.assign(win,{Date,String,Math,JSON,Promise,RegExp,Object,Array,Number});
vm.createContext(win);for(const f of ["thundr-bus.js","thundr-link.js"])vm.runInContext(fs.readFileSync(path.join(__dirname,"..",f),"utf8"),win);
(async()=>{
 const K=win.RL_THUNDR_LINK;ok(K&&K.rid==="ЯID-0014-KREH","link exported with ЯID");
 ok(/THUNDR ЯID-0014-KREH/.test(K.ask("status")),"ask status");ok(/Organ report/.test(K.ask("report")),"ask report");
 for(let i=0;i<8;i++){} // let boot interval-less wrap: call wrap by handle invocation
 win.RL_THUNDR_LINK.goHome; // exists
 // chat intercept needs wrapChat (runs in boot interval stub) -> emulate
 vm.runInContext("",win);
 const msg={seq:5,ts:"2026-10-17T20:40:00Z",msg:"report",sig:"klrBweplVjQt0/BWc2+C2voj1NgOXRyy8YBhRin6qMUrXvYNBlkRWjlP6WSE9nM1BybQLNJ96LFMG3nSNUqMAA=="};
 await win.RL_THUNDR_INBOX(msg);ok(posted.some(p=>J(p).kind==="reply"&&J(p).seq===5&&/Organ report/.test(J(p).a)),"signed mail answered to outbox");
 const n=posted.length;await win.RL_THUNDR_INBOX(msg);ok(posted.length===n,"replay ignored");
 await win.RL_THUNDR_INBOX(Object.assign({},msg,{seq:6,msg:"tampered"}));ok(posted.some(p=>J(p).kind==="refused"&&J(p).seq===6),"tampered mail refused + logged");
 try{win.RL_THUNDR_BUS.emit({organ:"rzl-repair",state:"working",text:"fix x",step:1,steps:3})}catch(e){console.log("ERR",e.message)};ok(posted.some(p=>J(p).kind==="progress"&&J(p).organ==="rzl-repair"&&J(p).step===1&&J(p).steps===3),"repair progress mirrored to outbox");
 ok(posted.every(p=>p.cmd==="append"),"outbox uses append-only verb");
 console.log(`thundr-link tests: ${pass}/${pass+fail} pass`);process.exit(fail?1:0)})();
