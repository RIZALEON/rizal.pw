// R:\ console edit (About + links, owner only, preview + y/n) and the /recall me() fix (20261029).
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const dir=path.join(__dirname,'..','rdragon-cryptosocial'),src=fs.readFileSync(path.join(dir,'rdragon-components.js'),'utf8'),csp=fs.readFileSync(path.join(dir,'rdragon-cryptosocial.js'),'utf8');
let owner=false,saved=[],st={bio:'old bio',links:[{label:'X',url:'https://x.com/chaserizal'}]};
const doc={readyState:'loading',addEventListener(){},createElement(){return {style:{},appendChild(){},querySelector(){return {}},addEventListener(){}}},head:{appendChild(){}},body:{appendChild(){}},querySelector(){return null}};
const w={document:doc,addEventListener(){},RDRAGON_CSP:{me:()=>owner?{pub:'p',handle:'@chaserizal'}:null,canEdit:()=>owner,editGet:()=>JSON.parse(JSON.stringify(st)),editSet:(k,v)=>{saved.push(k);if(k==='bio')st.bio=v;else st.links=v;return{ok:true,signed:true}}}};
w.window=w;vm.runInNewContext(src,Object.assign({window:w,document:doc,setInterval(){},setTimeout,console},w));
const R=w.RDRAGON_COMPONENTS.run;
(async()=>{
  assert.strictEqual(await R('edit'),'sign in to edit');
  assert.strictEqual(await R('edit about hi'),'sign in to edit');
  owner=true;
  assert(/edit about/.test(await R('edit help')),'help');
  assert(/preview/.test(await R('edit about New bio here')));assert(/saved/.test(await R('y')));assert.strictEqual(st.bio,'New bio here');
  await R('edit about nope');assert(/cancelled/.test(await R('n')));assert.strictEqual(st.bio,'New bio here');
  assert(/1\. X/.test(await R('edit links')));
  await R('edit link add Shop https://a.co/d/47uq2zX');await R('y');assert.strictEqual(st.links.length,2);
  await R('edit link 1 Twitter https://x.com/chaserizal');await R('yes');assert.strictEqual(st.links[0].label,'Twitter');
  assert(/http/.test(await R('edit link add Bad javascript:alert(1)')));
  await R('edit link remove 2');await R('y');assert.strictEqual(st.links.length,1);
  assert(/no link 9/.test(await R('edit link remove 9')));
  assert(Object.keys(w.RDRAGON_COMPONENTS.status).includes('edit'));
  assert(!/RDRAGON_CSP\.me\.pub/.test(src),'recall me() fix');
  assert(/"links",/.test(csp)&&/editSet:function/.test(csp)&&/S\.me\.handle==="@chaserizal"/.test(csp));
  console.log('test-rdragon-edit: ok ('+saved.length+' saves)');
})().catch(e=>{console.error(e);process.exit(1)});
