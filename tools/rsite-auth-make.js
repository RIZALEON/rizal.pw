#!/usr/bin/env node
/* OWNER TOOL — run only on Rizal's own device. Never commit the private key (default ~/.rsite-auth/site-key.jwk, chmod 600).
   node tools/rsite-auth-make.js keygen                      -> creates site key, prints PUBLIC key for rdragon-config.js siteAuth.pub
   node tools/rsite-auth-make.js add @handle record.json      -> prompts password (hidden), seals record ({rec,pid,pkg}), re-signs data/auth/vault.json */
const fs=require("fs"),path=require("path"),os=require("os"),{webcrypto:C}=require("crypto"),A=require("../rdragon-cryptosocial/rsite-auth.js");
const KP=process.env.RSITE_KEY||path.join(os.homedir(),".rsite-auth","site-key.jwk"),VP=path.join(__dirname,"..","data","auth","vault.json");
const b64=u=>Buffer.from(u).toString("base64");
function ask(q){return new Promise(r=>{process.stdout.write(q);const i=process.stdin;i.setRawMode&&i.setRawMode(true);let s="";i.resume();i.on("data",function d(c){c=c.toString();
 if(c==="\r"||c==="\n"){i.setRawMode&&i.setRawMode(false);i.pause();i.removeListener("data",d);process.stdout.write("\n");r(s)}else if(c==="\u0003")process.exit(1);else s+=c})})}
(async()=>{const [cmd,h,file]=process.argv.slice(2);
 if(cmd==="keygen"){if(fs.existsSync(KP))throw Error("key exists: "+KP);const k=await C.subtle.generateKey({name:"Ed25519"},true,["sign","verify"]);
  fs.mkdirSync(path.dirname(KP),{recursive:true,mode:0o700});fs.writeFileSync(KP,JSON.stringify(await C.subtle.exportKey("jwk",k.privateKey)),{mode:0o600});
  console.log("siteAuth.pub =",b64(await C.subtle.exportKey("raw",k.publicKey)));return}
 if(cmd==="add"&&h&&file){const payload=JSON.parse(fs.readFileSync(file,"utf8"));if(!payload.rec)throw Error("record.json needs {rec,pid,pkg}");
  const pw=await ask("password for "+h+" (hidden): "),pw2=await ask("again: ");if(pw!==pw2||pw.length<14)throw Error("mismatch or shorter than 14 chars");
  const priv=await C.subtle.importKey("jwk",JSON.parse(fs.readFileSync(KP,"utf8")),{name:"Ed25519"},false,["sign"]);
  const v=fs.existsSync(VP)?JSON.parse(fs.readFileSync(VP,"utf8")):{format:A.FORMAT,entries:[]};const e=await A.seal(h,pw,payload);
  v.entries=v.entries.filter(x=>x.id!==e.id).concat(e);delete v.sig;v.updated=new Date().toISOString();await A.sign(v,priv);
  fs.mkdirSync(path.dirname(VP),{recursive:true});fs.writeFileSync(VP,JSON.stringify(v,null,1)+"\n");console.log("sealed",h,"->",VP);return}
 console.log("usage: keygen | add @handle record.json")})().catch(e=>{console.error(e.message);process.exit(1)});
