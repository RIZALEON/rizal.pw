/* ЯLAB TWEETBACK-IMPORT core · isomorphic (browser + node 20)
   Streams official X/Twitter archive zips (zip64, multi-part, 25-55 GB) by random access:
   only the central directory + the entries needed are read; nothing loads whole.
   Tweet parsing follows tweetback (github.com/tweetback/tweetback, MIT © Zach Leatherman). */
(function(G){
"use strict";
// ---- sources: {name,size,read(off,len)->Uint8Array}
function blobSource(b,name){return{name:name||b.name||"archive.zip",size:b.size,read:async(o,l)=>new Uint8Array(await b.slice(o,o+l).arrayBuffer())}}
async function urlSource(url,name,fetchFn){fetchFn=fetchFn||fetch;
  const h=await fetchFn(url,{headers:{Range:"bytes=0-0"}});
  if(h.status===403||h.status===401)throw new Error("PRIVATE");
  if(h.status!==206)throw new Error("NO_RANGE:"+h.status);
  const cr=h.headers.get("content-range")||"";const size=+cr.split("/")[1];try{await h.arrayBuffer()}catch(e){}
  if(!size)throw new Error("NO_SIZE");
  return{name:name||url,size,read:async(o,l)=>{const r=await fetchFn(url,{headers:{Range:"bytes="+o+"-"+(o+l-1)}});if(r.status!==206)throw new Error("RANGE_FAIL:"+r.status);return new Uint8Array(await r.arrayBuffer())}}}
// ---- Google Drive link parsing
function driveId(s){s=String(s||"").trim();let m=s.match(/\/file\/d\/([A-Za-z0-9_-]{10,})/)||s.match(/[?&]id=([A-Za-z0-9_-]{10,})/)||s.match(/^([A-Za-z0-9_-]{20,})$/);return m?m[1]:null}
// ---- zip (incl. zip64) reader
const dv=u=>new DataView(u.buffer,u.byteOffset,u.byteLength);
const u64=(d,o)=>d.getUint32(o,true)+d.getUint32(o+4,true)*4294967296;
const td=new TextDecoder();
async function openZip(src){
  const tl=Math.min(src.size,65557+20);const tail=await src.read(src.size-tl,tl);const d=dv(tail);
  let e=-1;for(let i=tail.length-22;i>=0;i--)if(d.getUint32(i,true)===0x06054b50){e=i;break}
  if(e<0)throw new Error("NOT_ZIP");
  let n=d.getUint16(e+10,true),cs=d.getUint32(e+12,true),co=d.getUint32(e+16,true);
  if(e>=20&&d.getUint32(e-20,true)===0x07064b50){const z64=u64(d,e-20+8);const r=dv(await src.read(z64,56));n=u64(r,32);cs=u64(r,40);co=u64(r,48)}
  const cd=await src.read(co,cs),c=dv(cd),ents=new Map();let p=0;
  for(let k=0;k<n;k++){if(c.getUint32(p,true)!==0x02014b50)throw new Error("BAD_CD");
    const m=c.getUint16(p+10,true);let csz=c.getUint32(p+20,true),usz=c.getUint32(p+24,true);
    const fl=c.getUint16(p+28,true),xl=c.getUint16(p+30,true),cl=c.getUint16(p+32,true);let lo=c.getUint32(p+42,true);
    const name=td.decode(cd.subarray(p+46,p+46+fl));let x=p+46+fl;const xe=x+xl;
    while(x+4<=xe){const id=c.getUint16(x,true),sz=c.getUint16(x+2,true);if(id===1){let q=x+4;if(usz===0xffffffff){usz=u64(c,q);q+=8}if(csz===0xffffffff){csz=u64(c,q);q+=8}if(lo===0xffffffff){lo=u64(c,q)}}x+=4+sz}
    ents.set(name,{name,method:m,csz,usz,lo,src});p=xe+cl}
  return ents}
async function entryStream(ent){const h=dv(await ent.src.read(ent.lo,30));const start=ent.lo+30+h.getUint16(26,true)+h.getUint16(28,true);
  const CH=4<<20;let off=0;const raw=new ReadableStream({async pull(ctl){if(off>=ent.csz)return ctl.close();const l=Math.min(CH,ent.csz-off);ctl.enqueue(await ent.src.read(start+off,l));off+=l}});
  if(ent.method===0)return raw;if(ent.method===8)return raw.pipeThrough(new DecompressionStream("deflate-raw"));throw new Error("ZIP_METHOD_"+ent.method)}
async function entryBytes(ent){const r=(await entryStream(ent)).getReader(),parts=[];let n=0;for(;;){const{done,value}=await r.read();if(done)break;parts.push(value);n+=value.length}const o=new Uint8Array(n);let p=0;for(const v of parts){o.set(v,p);p+=v.length}return o}
async function entryText(ent){return td.decode(await entryBytes(ent))}
// X archive .js files: "window.YTD.tweets.part0 = [ ... ]"  (same trick tweetback uses)
function ytd(text){return JSON.parse(text.slice(text.indexOf("=")+1).trim().replace(/;\s*$/,""))}
// ---- privacy: never read these by default
const PRIVATE=/(direct-message|dm-|direct_message|ip-audit|email-address|phone-number|account-timezone|ageinfo|contact|device-token|connected-application|ad-|personalization|key-registry|protected-history|screen-name-change|verified|deleted-tweet|login|account-creation-ip|periscope|sso)/i;
const isPrivate=n=>PRIVATE.test(n.split("/").pop());
const MIME={jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",gif:"image/gif",webp:"image/webp",mp4:"video/mp4",mov:"video/quicktime",m3u8:"application/x-mpegURL"};
// ---- main: archive parts -> GHOSTMACHINE profile draft
async function importArchive(sources,opt){opt=opt||{};const log=opt.log||(()=>{});
  const all=new Map();for(const s of sources){log("reading index of "+s.name);for(const[k,v]of await openZip(s))all.set(k.replace(/^[^/]*?\/(?=data\/)/,""),v)}
  const get=k=>all.get(k)||all.get("data/"+k);
  const acc=get("data/account.js")?ytd(await entryText(get("data/account.js")))[0].account:{};
  const pr=get("data/profile.js")?ytd(await entryText(get("data/profile.js")))[0].profile:{};
  const tf=[...all.keys()].filter(k=>/^data\/(tweets|tweet)(-part\d+)?\.js$/.test(k)).sort();
  let tw=[];for(const k of tf){log("parsing "+k);tw=tw.concat(ytd(await entryText(all.get(k))).map(x=>x.tweet||x))}
  const mediaKeys=[...all.keys()].filter(k=>/^data\/tweets?_media\//.test(k));
  const mediaByTweet={};for(const k of mediaKeys){const f=k.split("/").pop(),id=f.split("-")[0];(mediaByTweet[id]=mediaByTweet[id]||[]).push(k)}
  const handle=acc.username||"unknown";const ids=new Set(tw.map(t=>t.id_str));
  const posts=tw.map(t=>{const reply=t.in_reply_to_status_id_str||null;
    let text=t.full_text||t.text||"";
    for(const u of(t.entities&&t.entities.urls)||[])text=text.split(u.url).join(u.expanded_url);
    for(const m of((t.extended_entities||t.entities||{}).media)||[])text=text.split(m.url).join("").trim();
    const media=(mediaByTweet[t.id_str]||[]).map(k=>{const ext=k.split(".").pop().toLowerCase();return{zip:k,type:(MIME[ext]||"").startsWith("video")?"video":"image",mime:MIME[ext]||"application/octet-stream",size:all.get(k).usz}});
    return{id:"x-"+t.id_str,src_id:t.id_str,t:text,ts:new Date(t.created_at).toISOString(),by:"@"+handle,media,
      par:reply&&ids.has(reply)?"x-"+reply:null,reply_to:reply?{id:reply,user:t.in_reply_to_screen_name||null,internal:ids.has(reply)}:null,
      retweet:/^RT @/.test(text),stats:{like:+t.favorite_count||0,repost:+t.retweet_count||0},lang:t.lang||null,c:[]}}).sort((a,b)=>a.ts<b.ts?-1:1);
  // threads: attach self-replies under their parent (c[] like the CryptoSocial panel)
  const byId=Object.fromEntries(posts.map(p=>[p.id,p]));for(const p of posts){p.root_id=p.par?(function r(q){return q.par&&byId[q.par]?r(byId[q.par]):q.id})(p):null}
  const av=[...all.keys()].find(k=>/^data\/profile_media\/.*/.test(k)&&!/header|banner|\d+x\d+$/i.test(k)&&/\.(jpe?g|png|gif|webp)$/i.test(k)&&!/1500x500/.test(k));
  const hd=[...all.keys()].find(k=>/^data\/profile_media\//.test(k)&&k!==av);
  const skipped=[...all.keys()].filter(isPrivate).length;
  const profile={schema:"rzl.ghostmachine.profile.v1",kind:"RP-draft",id:"RP-X-"+(acc.accountId||handle),state:"draft-unsigned",sig:null,
    created:new Date().toISOString(),source:{type:"x-archive",parts:sources.map(s=>s.name),tool:"ЯLAB TWEETBACK-IMPORT 0.1 (tweetback MIT)"},
    prof:{handle:"@"+handle,name:acc.accountDisplayName||handle,bio:(pr.description&&pr.description.bio)||"",location:(pr.description&&pr.description.location)||"",
      link:(pr.description&&pr.description.website)||"",joined:acc.createdAt||null,avatar:av?{zip:av}:null,banner:hd?{zip:hd}:null},
    counts:{posts:posts.length,media:mediaKeys.length,private_entries_skipped:skipped},posts};
  log("done: "+posts.length+" posts, "+mediaKeys.length+" media, "+skipped+" private files skipped");
  return{profile,entries:all}}
// shape that the RDRAGON CryptoSocial side panel (localStorage rdragon.csp.v2) already uses
function toCSP(profile,mediaUrl){const m=x=>({type:x.type,src:mediaUrl?mediaUrl(x.zip):x.zip});
  const kids={};for(const p of profile.posts)if(p.par)(kids[p.par]=kids[p.par]||[]).push(p);
  const node=p=>({id:p.id,t:p.t,ts:p.ts,media:p.media.map(m),c:(kids[p.id]||[]).map(node)});
  return{prof:{name:profile.prof.name,handle:profile.prof.handle,bio:profile.prof.bio,location:profile.prof.location,link:profile.prof.link,joined:profile.prof.joined},
    posts:profile.posts.filter(p=>!p.par).map(node).reverse()}}
// the ONE ЯCASKET hook — builds a request; never signs, never prompts by itself
function casketRequest(profile){return{schema:"rzl.casket.request.v1",action:"make-profile-live",profile_id:profile.id,handle:profile.prof.handle,
  posts:profile.counts.posts,reason:"Profile REBIRTH: publish imported X archive as live GHOSTMACHINE profile",requested:new Date().toISOString(),
  approver:"ЯCASKET",status:"pending"}}
const API={blobSource,urlSource,driveId,openZip,entryStream,entryBytes,entryText,ytd,isPrivate,importArchive,toCSP,casketRequest};
if(typeof module!=="undefined")module.exports=API;else G.TBI=API;
})(typeof window!=="undefined"?window:globalThis);
