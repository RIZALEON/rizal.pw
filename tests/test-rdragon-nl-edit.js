// plain-English owner edits in the R:\ console + empty bio sources (20261029).
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert'),root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'rdragon-cryptosocial/rdragon-components.js'),'utf8');
let owner=true,saved={};
const st={bio:'PaleoAnthropologist from the Distant Future | Buy: a.co/d/6zvEHwf | TRUTH. Give: cash.app/$chaserizal',links:[],name:'Rizal the Younger',location:'Mount Olympus, UT',link:'a.co/d/47uq2zX',joined:'April 2019',biosrc:'x @chaserizal',biosrcShown:true};
const doc={readyState:'loading',addEventListener(){},createElement(){return {style:{},appendChild(){},querySelector(){return {}},addEventListener(){}}},head:{appendChild(){}},body:{appendChild(){}},querySelector(){return null}};
const w={document:doc,addEventListener(){},RDRAGON_CSP:{me:()=>owner?{pub:'p',handle:'@chaserizal'}:null,canEdit:()=>owner,editGet:()=>JSON.parse(JSON.stringify(st)),editSet:(k,v)=>{saved[k]=v;st[k]=v;return{ok:true,signed:true}}}};
w.window=w;vm.runInNewContext(src,Object.assign({window:w,document:doc,setInterval(){},setTimeout,console},w));
const R=w.RDRAGON_COMPONENTS.run;
(async()=>{
  let o=await R('delete everything from bio sources and pending RCASKET from the about section');
  assert(/preview/.test(o)&&/bio sources/.test(o)&&/save\? \(y\/n\)/.test(o),o);assert(/saved/.test(await R('y')));assert.strictEqual(saved.biosrc,'');
  st.biosrc='x @chaserizal';
  for(const v of ['Delete everything from bio sources.','remove bio sources','erase the bio sources section','delete pending ЯCASKET','please clear bio sources']){o=await R(v);assert(/preview/.test(o),v+' => '+o);await R('n');}
  o=await R('erase "Buy: a.co/d/6zvEHwf" from about');assert(/preview/.test(o));await R('yes');assert(!st.bio.includes('Buy:')&&st.bio.includes('Give:'));
  await R('change location to Salt Lake City, UT');await R('y');assert.strictEqual(st.location,'Salt Lake City, UT');
  await R('replace Distant Future with Far Future');await R('y');assert(st.bio.includes('Far Future'));
  await R('add link Shop https://a.co/x');await R('y');assert.strictEqual(st.links[0].url,'https://a.co/x');
  assert(/nothing to change/.test(await R('delete zzqq from about')));
  assert(!/unknown here/.test(await R('hlep')));assert(/closest command: <code>help/.test(await R('hlep')));
  st.biosrc='';assert(/already done/.test(await R('delete everything from bio sources and pending RCASKET from the about section')));
  owner=false;assert.strictEqual(await R('delete everything from bio sources'),'sign in to edit');
  const B=require(path.join(root,'rdragon-cryptosocial/rbiosource.js'));assert.strictEqual(B.html({record:{rid:'x',bio_sources:[]},v:{state:'pending'}}),'');
  assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(root,'data/founder/bio-source.json'),'utf8')).bio_sources,[]);
  const csp=fs.readFileSync(path.join(root,'rdragon-cryptosocial/rdragon-cryptosocial.js'),'utf8');assert(csp.includes('function hasBS()')&&csp.includes('(hasBS()?(S.prof.biosrc?'));
  console.log('test-rdragon-nl-edit: ok');
})().catch(e=>{console.error(e);process.exit(1)});
