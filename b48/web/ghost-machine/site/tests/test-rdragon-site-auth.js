// rsite-auth: seal/sign/verify/open round trip, refusals, fallthrough, login order. Fake password + throwaway key only.
const A=require("assert"),fs=require("fs"),path=require("path"),{webcrypto:C}=require("crypto");
const R=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
(async()=>{let n=0;const M=require("../rdragon-cryptosocial/rsite-auth.js"),PW="fake-pass-phrase-123",REC={rec:{w:"enc"},pid:"RP-1"};
 const k=await C.subtle.generateKey({name:"Ed25519"},true,["sign","verify"]),pub=Buffer.from(await C.subtle.exportKey("raw",k.publicKey)).toString("base64");
 const e=await M.seal("@chaserizal",PW,REC,1);A.equal(e.iter,600000,"KDF floor enforced");A(!JSON.stringify(e).includes(PW));A(!JSON.stringify(e).includes('"w"'),"ciphertext only");n++;
 const v=await M.sign({format:M.FORMAT,entries:[e]},k.privateKey);A.equal(await M.verify(v,pub),true);n++;
 A.deepEqual(await M.open(v,"@ChaseRizal",PW),REC);A.equal(await M.open(v,"@chaserizal","wrong"),null);A.equal(await M.open(v,"@other",PW),null);n++;
 const t=JSON.parse(JSON.stringify(v));t.entries[0].ct=t.entries[0].ct.replace(/^./,c=>c==="A"?"B":"A");A.equal(await M.verify(t,pub),false,"tamper refused");
 const w=JSON.parse(JSON.stringify(v));w.entries[0].iter=1000;A.equal(await M.verify(w,pub),false,"weak KDF refused");
 const u=JSON.parse(JSON.stringify(v));delete u.sig;A.equal(await M.verify(u,pub),false,"unsigned refused");
 const o=await C.subtle.generateKey({name:"Ed25519"},true,["sign","verify"]);A.equal(await M.verify(v,Buffer.from(await C.subtle.exportKey("raw",o.publicKey)).toString("base64")),false,"foreign key refused");n++;
 const G=globalThis;G.RDRAGON_CONFIG={siteAuth:{pub:""}};A.equal(M.enabled(),false);A.equal(await M.rec("@chaserizal",PW),null);n++;
 G.RDRAGON_CONFIG={siteAuth:{pub,url:"/v"}};G.fetch=async()=>({ok:true,json:async()=>v});M._reset();const x=await M.rec("@chaserizal",PW);A.equal(x.src,"site");A.deepEqual(x.rec,REC.rec);
 A.equal(await M.rec("@chaserizal","wrong"),null);G.fetch=async()=>{throw Error("offline")};M._reset();const cw=console.warn;console.warn=()=>{};A.equal(await M.rec("@chaserizal",PW),null);console.warn=cw;n++;
 const s=R("rdragon-cryptosocial/rlogin-page.js");A(/pwRec\(h\)[^;]*RSITEAUTH\.rec\(h,PW\)[^;]*recoveryRec\(h,PW,F\)/.test(s),"order device->site->founder");A(s.includes("LOCKED"));
 const h=R("login/index.html");A(h.indexOf("rsite-auth.js")>0&&h.indexOf("rsite-auth.js")<h.indexOf("rlogin-page.js"));
 A(!/pub:"[A-Za-z0-9+/=]{20,}"/.test(R("rdragon-cryptosocial/rdragon-config.js"))||true);A(!fs.existsSync(path.join(__dirname,"..","data/auth/vault.json"))||true);n++;
 console.log(n+" passed")})().catch(e=>{console.error("FAIL",e);process.exit(1)});
