"use strict";
/* Render the composed draft to a PNG with the bundled Ghostroot fonts, then
   share it (Web Share API with files) or fall back to a local download. */
const SHARE_FONT_STACK="48px GhostrootMayan, GhostrootTagalog, system-ui, sans-serif";
const SHARE_FONT_LOADS=["48px GhostrootMayan","48px GhostrootTagalog","48px system-ui"];
const SHARE_MAX_WIDTH=1080;
const SHARE_PADDING=48;
const SHARE_LINE_HEIGHT=64;
const SHARE_BG="#160e20";
const SHARE_FG="#f4e9d4";
const SHARE_LABEL="#efcf88";
const SHARE_FILENAME="rboard-draft.png";

function shareSegments(text){
 if(typeof Intl!=="undefined"&&typeof Intl.Segmenter==="function"){
  return[...new Intl.Segmenter("und",{granularity:"grapheme"}).segment(text)].map(s=>s.segment);
 }
 return[...text];
}
function wrapDraftLines(ctx,text,maxWidth){
 const lines=[];
 for(const paragraph of String(text).split("\n")){
  if(paragraph===""){lines.push("");continue;}
  let line="";
  for(const part of shareSegments(paragraph)){
   const trial=line+part;
   if(line&&ctx.measureText(trial).width>maxWidth){lines.push(line);line=part;}
   else line=trial;
  }
  lines.push(line);
 }
 return lines.length?lines:[""];
}
async function loadShareFonts(fonts){
 const loader=fonts||(typeof document!=="undefined"?document.fonts:null);
 if(!loader||typeof loader.load!=="function")return;
 await Promise.all(SHARE_FONT_LOADS.map(spec=>loader.load(spec).catch(()=>null)));
 if(loader.ready&&typeof loader.ready.then==="function")await loader.ready.catch(()=>null);
}
function canvasToPngBlob(canvas){
 if(typeof canvas.convertToBlob==="function")return canvas.convertToBlob({type:"image/png"});
 if(typeof canvas.toBlob==="function")return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Could not encode PNG.")),"image/png"));
 if(typeof canvas.toBuffer==="function"){
  const buffer=canvas.toBuffer("image/png");
  const BlobCtor=typeof Blob==="function"?Blob:null;
  if(!BlobCtor)return Promise.resolve(buffer);
  return Promise.resolve(new BlobCtor([buffer],{type:"image/png"}));
 }
 const data=canvas.toDataURL("image/png");
 const bytes=atob(data.split(",")[1]);
 const arr=new Uint8Array(bytes.length);
 for(let i=0;i<bytes.length;i++)arr[i]=bytes.charCodeAt(i);
 return Promise.resolve(new Blob([arr],{type:"image/png"}));
}
async function renderDraftToPng(text,options={}){
 await loadShareFonts(options.fonts||(options.document&&options.document.fonts));
 const doc=options.document||(typeof document!=="undefined"?document:null);
 const canvas=options.canvas||(doc?doc.createElement("canvas"):null);
 if(!canvas)throw new Error("No canvas available");
 const ctx=canvas.getContext("2d");
 if(!ctx)throw new Error("No 2D context");
 const value=String(text??"");
 const cssWidth=options.width||SHARE_MAX_WIDTH;
 const ratio=options.pixelRatio||(typeof devicePixelRatio==="number"&&devicePixelRatio>0?devicePixelRatio:1);
 const inner=cssWidth-SHARE_PADDING*2;
 ctx.setTransform(1,0,0,1,0,0);
 ctx.font=SHARE_FONT_STACK;
 const lines=wrapDraftLines(ctx,value,inner);
 const cssHeight=SHARE_PADDING+28+SHARE_PADDING/2+lines.length*SHARE_LINE_HEIGHT+SHARE_PADDING;
 canvas.width=Math.round(cssWidth*ratio);
 canvas.height=Math.round(cssHeight*ratio);
 if(typeof ctx.setTransform==="function")ctx.setTransform(ratio,0,0,ratio,0,0);
 else{ctx.scale(ratio,ratio);}
 ctx.fillStyle=SHARE_BG;
 ctx.fillRect(0,0,cssWidth,cssHeight);
 ctx.fillStyle=SHARE_LABEL;
 ctx.font="600 18px system-ui, sans-serif";
 ctx.fillText("RBOARD",SHARE_PADDING,SHARE_PADDING+8);
 ctx.fillStyle=SHARE_FG;
 ctx.font=SHARE_FONT_STACK;
 ctx.textBaseline="top";
 let y=SHARE_PADDING+28+SHARE_PADDING/2;
 for(const line of lines){ctx.fillText(line,SHARE_PADDING,y);y+=SHARE_LINE_HEIGHT;}
 return canvasToPngBlob(canvas);
}
function downloadBlob(blob,filename,options={}){
 const doc=options.document||(typeof document!=="undefined"?document:null);
 if(!doc)throw new Error("No document available for download");
 const Url=options.URL||(typeof URL!=="undefined"?URL:null);
 const a=doc.createElement("a");
 a.download=filename||SHARE_FILENAME;
 let href,revoke=null;
 if(Url&&typeof Url.createObjectURL==="function"){
  href=Url.createObjectURL(blob);
  revoke=()=>Url.revokeObjectURL(href);
 }else{
  // data: fallback keeps download working under a CSP that allows data: but not blob:
  return blob.arrayBuffer?blob.arrayBuffer().then(buf=>{
   const bytes=new Uint8Array(buf);
   let bin="";
   for(const b of bytes)bin+=String.fromCharCode(b);
   a.href="data:image/png;base64,"+btoa(bin);
   doc.body.append(a);a.click();a.remove();
  }):Promise.reject(new Error("No URL API for download"));
 }
 a.href=href;
 doc.body.append(a);a.click();a.remove();
 if(revoke)setTimeout(revoke,1000);
 return Promise.resolve();
}
async function shareDraftImage(text,options={}){
 const value=String(text??"");
 if(!value)throw new Error("Compose something first.");
 const blob=await renderDraftToPng(value,options);
 const FileCtor=options.File||(typeof File!=="undefined"?File:null);
 const file=FileCtor?new FileCtor([blob],SHARE_FILENAME,{type:"image/png",lastModified:Date.now()}):null;
 const nav=options.navigator||(typeof navigator!=="undefined"?navigator:null);
 if(file&&nav&&typeof nav.share==="function"&&(!nav.canShare||nav.canShare({files:[file]}))){
  try{
   await nav.share({files:[file],title:"RBOARD",text:value});
   return{method:"share",blob,file};
  }catch(err){
   if(err&&err.name==="AbortError")return{method:"share-abort",blob,file};
  }
 }
 await downloadBlob(blob,SHARE_FILENAME,options);
 return{method:"download",blob,file};
}
if(typeof module!=="undefined")module.exports={SHARE_FONT_STACK,SHARE_FONT_LOADS,SHARE_FILENAME,shareSegments,wrapDraftLines,loadShareFonts,renderDraftToPng,shareDraftImage,downloadBlob};
