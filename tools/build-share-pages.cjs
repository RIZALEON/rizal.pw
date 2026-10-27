#!/usr/bin/env node
/* build-share-pages.cjs — RZL 20261027. Static, no-JS-readable share pages for every public post, article and video on rizal.pw.
   Reads ONLY public site content: rdragon-cryptosocial/site-posts.json (owner-published posts + their public revise/header entries)
   and rdragon-cryptosocial/chaserizal-articles.js (signed articles; read, never modified). Writes:
     p/<id>/index.html       full content in plain HTML + Open Graph / Twitter Card / oEmbed discovery; humans are sent into the app view by JS
     embed/<id>/index.html   embeddable player (.rzl player, counts impressions + views)  — videos only
     oembed/<id>.json        oEmbed (video: iframe html; others: link)
     p/index.json            ids that have a page (the app's Share uses /p/<id>/ for these)
   Header photos stored as data URLs are written out to rdragon-cryptosocial/assets/headers/<id>.jpg so og:image is a real URL.
   Usage (repo root): node tools/build-share-pages.cjs   — idempotent; re-run after editing site-posts.json. */
'use strict';const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..'),SITE='https://rizal.pw',FALLBACK='/rdragon-cryptosocial/assets/og-default.jpg';
const E=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const abs=u=>!u?'':/^https?:\/\//.test(u)?u:SITE+(u[0]==='/'?'':'/')+u;
const safeId=id=>/^[A-Za-z0-9:._-]{1,120}$/.test(id)?id:null;
const sp=JSON.parse(fs.readFileSync(path.join(ROOT,'rdragon-cryptosocial/site-posts.json'),'utf8')).events||[];
const ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(ROOT,'rdragon-cryptosocial/chaserizal-articles.js'),'utf8'),ctx);
const CA=ctx.window.CHASERIZAL_ARTICLES||{items:[]};
const items={};
sp.forEach(e=>{if(e.t==='post'&&safeId(e.id))items[e.id]={id:e.id,kind:e.ptype||'post',title:e.title||'',text:e.text||'',ts:e.ts,by:e.by||'@chaserizal',video:e.videoUrl||'',poster:e.cover||'',media:e.media||[],header:e.header||''}});
(CA.items||[]).forEach(a=>{const id='art-'+a.id;if(safeId(id))items[id]={id,kind:'article',title:(a.title||'').trim(),text:a.text||'',ts:a.ts,by:CA.by||'@ChaseRizal',media:[],header:''}});
sp.forEach(e=>{const x=items[e.target];if(!x)return;if(e.t==='revise'){if(e.text)x.text=e.text;if(e.header)x.header=e.header;if(e.media)x.media=x.media.concat(e.media)}if(e.t==='post.delete')x.deleted=1});
const hdrDir=path.join(ROOT,'rdragon-cryptosocial/assets/headers');
function imgOf(x){let h=x.header;const m=/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(h||'');
 if(m){fs.mkdirSync(hdrDir,{recursive:true});const f=x.id.replace(/[^A-Za-z0-9._-]/g,'_')+'.'+(m[1]==='jpeg'?'jpg':m[1]);fs.writeFileSync(path.join(hdrDir,f),Buffer.from(m[2],'base64'));h='/rdragon-cryptosocial/assets/headers/'+f}
 const first=(x.media||[]).find(z=>z.type==='image'&&/^(\/|https:)/.test(z.src||''));return h||x.poster||(first&&first.src)||FALLBACK}
function paras(t){return String(t).split(/\n{2,}/).map(p=>'<p>'+E(p).replace(/\n/g,'<br>')+'</p>').join('\n')}
const BOTS='bot|crawl|spider|slurp|facebookexternalhit|facebot|twitterbot|slackbot|discordbot|whatsapp|telegram|linkedin|embedly|quora|pinterest|vkshare|w3c_validator|redditbot|applebot|google|bing|yandex|duckduck|headless|preview|grok|xai|gpt|claude|perplexity|curl|wget|python|node';
const css='body{margin:0;background:#000;color:#ddd;font:16px/1.55 system-ui,sans-serif}main{max-width:720px;margin:0 auto;padding:16px}h1{font-size:1.5em;line-height:1.25;color:#fff}a{color:#9f9}img.hdr{width:100%;max-height:420px;object-fit:cover;border-radius:8px}video{width:100%;background:#000;border-radius:8px}.meta{opacity:.7;font-size:13px}footer{opacity:.6;font-size:12px;margin-top:2em}';
function rm(d){fs.rmSync(d,{recursive:true,force:true})}
const live=Object.values(items).filter(x=>!x.deleted);
// clean pages for removed items (deleted or no longer published)
['p','embed','oembed'].forEach(d=>{const D=path.join(ROOT,d);if(!fs.existsSync(D))return;fs.readdirSync(D).forEach(n=>{const id=n.replace(/\.json$/,'');if(n!=='index.json'&&!live.some(x=>x.id===id))rm(path.join(D,n))})});
live.forEach(x=>{
 const url=SITE+'/p/'+encodeURIComponent(x.id)+'/',img=abs(imgOf(x)),title=x.title||(x.kind==='video'?'Video':String(x.text).slice(0,70))||'rizal.pw',
  desc=String(x.text).replace(/\s+/g,' ').trim().slice(0,280)||title,isV=x.kind==='video'&&/\.(mp4|webm|m4v|mov)(\?|$)/i.test(x.video),mp4=isV?abs(x.video):'',emb=SITE+'/embed/'+encodeURIComponent(x.id)+'/';
 const meta=[['og:site_name','rizal.pw'],['og:type',isV?'video.other':'article'],['og:title',title],['og:description',desc],['og:url',url],['og:image',img],['og:image:alt',title]]
  .concat(isV?[['og:video',mp4],['og:video:secure_url',mp4],['og:video:type','video/mp4'],['og:video:width','640'],['og:video:height','360']]:[])
  .concat(x.kind==='article'?[['article:published_time',x.ts||''],['article:author',x.by]]:[]).map(m=>'<meta property="'+m[0]+'" content="'+E(m[1])+'">');
 const tw=(isV?[['twitter:card','player'],['twitter:player',emb],['twitter:player:width','640'],['twitter:player:height','360'],['twitter:player:stream',mp4],['twitter:player:stream:content_type','video/mp4']]:[['twitter:card','summary_large_image']])
  .concat([['twitter:site','@chaserizal'],['twitter:creator','@chaserizal'],['twitter:title',title],['twitter:description',desc],['twitter:image',img]]).map(m=>'<meta name="'+m[0]+'" content="'+E(m[1])+'">');
 const body=(img!==abs(FALLBACK)?'<img class="hdr" src="'+E(img)+'" alt="'+E(title)+'">':'')+
  '<h1>'+E(title)+'</h1><div class="meta">'+E(x.by)+' · '+E(String(x.ts||'').slice(0,10))+(x.kind==='article'?' · article':isV?' · video':'')+'</div>'+
  (isV?'<video controls playsinline preload="metadata" poster="'+E(img)+'" src="'+E(mp4)+'"></video><p><a href="'+E(mp4)+'">Direct video link (mp4)</a></p>':'')+
  paras(x.text)+(x.media||[]).filter(z=>z.type==='image'&&/^(\/|https:)/.test(z.src||'')).map(z=>'<img class="hdr" src="'+E(abs(z.src))+'" alt="">').join('');
 const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n<title>'+E(title)+' · rizal.pw</title>\n<meta name="description" content="'+E(desc)+'">\n<link rel="canonical" href="'+E(url)+'">\n'+meta.join('\n')+'\n'+tw.join('\n')+
  '\n<link rel="alternate" type="application/json+oembed" href="'+E(SITE+'/oembed/'+encodeURIComponent(x.id)+'.json')+'" title="'+E(title)+'">\n<style>'+css+'</style>\n'+
  '<script>/* humans go into the app view; bots, previewers and no-JS readers stay on this full static page */(function(){try{if(!/'+BOTS+'/i.test(navigator.userAgent||"")&&!navigator.webdriver&&!/[?&]static\\b/.test(location.search))location.replace("/#post/'+encodeURIComponent(x.id)+'")}catch(e){}})()</script>\n</head><body><main><article>'+body+'</article><footer><a href="/#post/'+E(encodeURIComponent(x.id))+'">Open on rizal.pw</a> · <a href="/">rizal.pw</a></footer></main></body></html>\n';
 fs.mkdirSync(path.join(ROOT,'p',x.id),{recursive:true});fs.writeFileSync(path.join(ROOT,'p',x.id,'index.html'),html);
 const oe={version:'1.0',provider_name:'rizal.pw',provider_url:SITE,title,author_name:x.by,author_url:SITE,thumbnail_url:img,url};
 if(isV){Object.assign(oe,{type:'video',width:640,height:360,html:'<iframe src="'+emb+'" width="640" height="360" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="'+E(title)+'"></iframe>'});
  const eh='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+E(title)+' · rizal.pw</title><link rel="canonical" href="'+E(url)+'">\n<link rel="stylesheet" href="/rdragon-cryptosocial/rplayer.rzl.css?v=3"><style>html,body{margin:0;height:100%;background:#000}body{display:flex;align-items:center}.w{width:100%}video{width:100%;max-height:100vh;display:block}</style></head><body><div class="w">\n<video class="csp-player" data-rplayer controls playsinline preload="metadata" poster="'+E(img)+'" data-stat-id="'+E(x.id)+'" src="'+E(mp4)+'"></video></div>\n<script src="/rdragon-cryptosocial/rdragon-config.js"></script><script src="/rdragon-cryptosocial/rplayer.rzl.js?v=2"></script></body></html>\n';
  fs.mkdirSync(path.join(ROOT,'embed',x.id),{recursive:true});fs.writeFileSync(path.join(ROOT,'embed',x.id,'index.html'),eh)}
 else Object.assign(oe,{type:'link'});
 fs.mkdirSync(path.join(ROOT,'oembed'),{recursive:true});fs.writeFileSync(path.join(ROOT,'oembed',x.id+'.json'),JSON.stringify(oe,null,1)+'\n')});
fs.mkdirSync(path.join(ROOT,'p'),{recursive:true});fs.writeFileSync(path.join(ROOT,'p','index.json'),JSON.stringify({v:1,ids:live.map(x=>x.id).sort()},null,0)+'\n');
console.log('share pages:',live.length,'(videos with embed:',live.filter(x=>x.kind==='video').length+')');
