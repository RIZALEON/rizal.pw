// node thundr-bus.test.js  — minimal DOM stub tests for the bus
const fs=require("fs"),vm=require("vm"),path=require("path");let pass=0,fail=0;const ok=(c,m)=>{c?pass++:(fail++,console.log("FAIL",m))};
const ev=[];const listeners={};const doc={readyState:"complete",body:{appendChild(){}} ,getElementById:()=>null,dispatchEvent(e){ev.push(e);(listeners[e.type]||[]).forEach(f=>f(e))},addEventListener(t,f){(listeners[t]=listeners[t]||[]).push(f)}};
class CE{constructor(t,o){this.type=t;this.detail=o&&o.detail}}
const win={document:doc,CustomEvent:CE,localStorage:{_:{},getItem(k){return this._[k]||null},setItem(k,v){this._[k]=v}},addEventListener(){},setTimeout,clearTimeout,setInterval:()=>0,clearInterval(){},innerWidth:400,innerHeight:800,
 RL_RSCRIBE:{flush(){return 1},newNote(){},search(){return Promise.resolve([])}},RL_IDGUARD:{post(x){return x}},RL_SUPERDRAGON:{version:"2.1.9.16"},fetch:()=>Promise.resolve({ok:true,status:200})};
win.window=win;Object.assign(win,{Date,String,Math,JSON,Promise,RegExp,Object,Array});
vm.createContext(win);vm.runInContext(fs.readFileSync(path.join(__dirname,"..","thundr-bus.js"),"utf8"),win);
const B=win.RL_THUNDR_BUS;ok(B&&B.version==="0.5.2","bus exported");ok(typeof win.RL_THUNDR_SAY==="function","RL_THUNDR_SAY defined");
const e=B.emit({organ:"t",state:"searching",text:"x"});ok(e.state==="searching"&&e.organ==="t","emit schema");
ok(B.emit({state:"bogus"}).state==="idle","unknown state -> idle");const st=B.emit({organ:"egg",state:"working",text:"x",step:2,steps:5});ok(st.step===2&&st.steps===5,"step count kept");
ok(B.emit({text:"No "+"heart available",state:"error"}).text==="Heart restarting…","banned phrase rewritten");
ok(ev.some(x=>x.type==="thundr-adapter")&&ev.some(x=>x.type==="thundr-organ"),"events dispatched");
B.taps();win.RL_RSCRIBE.flush();ok(B.log.some(x=>x.organ==="rscribe"&&x.state==="success"),"rscribe tap");
win.RL_IDGUARD.post({ok:false});ok(B.log.some(x=>x.organ==="identity-guard"&&x.state==="error"),"idguard reject -> error");
const hb=B.heartbeat();ok(hb.rscribe===true&&hb.batibabox===false,"heartbeat vitals");doc.querySelectorAll=()=>[{getAttribute:()=>"./skills/rscribe/rscribe.js"}];const hb2=B.heartbeat();ok(hb2.batibabox==="not on this page"&&hb2.rscribe===true,"page-scoped vitals");ok(B.log.some(x=>x.kind==="vital.red"&&x.organ==="batibabox"),"red vital -> error");
for(let i=0;i<600;i++)B.emit({text:"n"+i});ok(B.log.length===500,"ring 500");
win.fetch("http://x/v1/heart/turn").then(()=>{ok(B.log.some(x=>x.organ==="mouth"&&x.state==="success"),"mouth fetch tap");console.log(`thundr-bus tests: ${pass}/${pass+fail} pass`);process.exit(fail?1:0)});
