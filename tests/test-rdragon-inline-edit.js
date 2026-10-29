// inline profile edit mode (plain `edit`, Save/Cancel) + fresh-deploy SW fix (20261029).
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..'),dir=path.join(root,'rdragon-cryptosocial');
const src=fs.readFileSync(path.join(dir,'rdragon-components.js'),'utf8'),csp=fs.readFileSync(path.join(dir,'rdragon-cryptosocial.js'),'utf8');
let owner=true,mode=false,log=[];
const doc={readyState:'loading',addEventListener(){},createElement(){return {style:{},appendChild(){},querySelector(){return {}},addEventListener(){}}},head:{appendChild(){}},body:{appendChild(){}},querySelector(){return null}};
const w={document:doc,addEventListener(){},RDRAGON_CSP:{me:()=>owner?{pub:'p',handle:'@chaserizal'}:null,canEdit:()=>owner,editGet:()=>({bio:'b',links:[]}),editSet:()=>({ok:true}),
 editMode:()=>{mode=true;log.push('mode');return{ok:true}},editSave:()=>{if(!mode)return{ok:false,msg:'not editing'};mode=false;log.push('save');return{ok:true,changed:['bio','name'],signed:true}},editCancel:()=>{mode=false;log.push('cancel');return{ok:true}}}};
w.window=w;vm.runInNewContext(src,Object.assign({window:w,document:doc,setInterval(){},setTimeout,console},w));
const R=w.RDRAGON_COMPONENTS.run;
(async()=>{
  assert(/edit mode on/.test(await R('edit'))&&mode);
  assert(/saved bio, name/.test(await R('edit save'))&&!mode);
  await R('EDIT');assert(/cancelled/.test(await R('edit cancel'))&&!mode);
  assert(/not editing/.test(await R('edit save')));
  owner=false;assert.strictEqual(await R('edit'),'sign in to edit');assert(!mode);
  assert(/inline mode/.test(w.RDRAGON_COMPONENTS.status.edit));
  assert(/class="rdc-ed"/.test(src),'Edit button');
  for(const f of ['editMode:function','editSave:function','editCancel:function','"joined","biosrc"]','data-a="edsave"','data-a="edcancel"','S.editing=false;','if(!k||S.editing)return;'])assert(csp.includes(f),f);
  assert(/canEdit\(\)\)return\{ok:false,msg:"sign in to edit"\}/.test(csp));
  const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8'),reg=fs.readFileSync(path.join(root,'sw-register.js'),'utf8');
  assert(/cache:'no-cache'/.test(sw)&&/skipWaiting/.test(sw)&&/updateViaCache:'none'/.test(reg)&&/g\.update\(\)/.test(reg));
  console.log('test-rdragon-inline-edit: ok '+log.join(','));
})().catch(e=>{console.error(e);process.exit(1)});
