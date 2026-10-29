// logout command in the R:\ console (20261029): ends the session, keeps the saved login.
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const src=fs.readFileSync(path.join(__dirname,'..','rdragon-cryptosocial','rdragon-components.js'),'utf8');
let calls=0,signed=true;
const doc={readyState:'loading',addEventListener(){},createElement(){return {style:{},appendChild(){},querySelector(){return {}},addEventListener(){}}},head:{appendChild(){}},body:{appendChild(){}},querySelector(){return null}};
const w={document:doc,addEventListener(){},RDRAGON_CSP:{me:()=>signed?{pub:'x'}:null,logoutHere:async()=>{calls++;const r=signed?'device':'none';signed=false;return r}}};
w.window=w;vm.runInNewContext(src,Object.assign({window:w,document:doc,setInterval(){},setTimeout,console},w));
const C=w.RDRAGON_COMPONENTS;assert(C&&C.run,'components exported');
(async()=>{
  assert(/logged out/.test(await C.run('logout')),'logout works');
  for(const a of ['log out','signout','sign out','exit','LOGOUT']){assert(!/unknown here/.test(await C.run(a)),a+' alias');}
  assert(/not signed in/.test(await C.run('logout')));
  const f=await C.run('logout --forget');assert(/kept/.test(f));
  assert(Object.keys(C.status).includes('logout'),'help lists logout');
  assert(/logoutHere/.test(fs.readFileSync(path.join(__dirname,'..','rdragon-cryptosocial','rdragon-cryptosocial.js'),'utf8')));
  console.log('test-rdragon-logout: ok ('+calls+' logoutHere calls)');
})().catch(e=>{console.error(e);process.exit(1)});
