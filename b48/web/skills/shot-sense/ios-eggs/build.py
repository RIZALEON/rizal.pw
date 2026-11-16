import json,hashlib,os,base64,datetime
S=os.path.dirname(os.path.abspath(__file__)); B=os.path.dirname(S)
rd=lambda p:open(os.path.join(B,p),encoding='utf-8').read()
JS=r'''/* shot-sense ios relay · ЯID-0003-P4M6 · ЯМАХ */
(function(){var CFG=window.SHOT_SENSE_CFG||{};var H=CFG.neo||"neo.local";
var RX=/^\s*(sshot\s+see|shot\s+see|see|sshot|shot)(\s+.+)?\s*$/i;
function st(t){try{(window.THUNDR_STATUS||console.log)("ThundR STATUS · "+t)}catch(e){}}
function tok(){try{return CFG.token||localStorage.getItem("shotSense.token")||localStorage.getItem("rbotbridge.token")||""}catch(e){return CFG.token||""}}
async function post(u,b){var t=tok();if(!t)throw "pair token missing";var r=await fetch(u,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+t},body:JSON.stringify(b)});if(r.status==401)throw "token not paired";if(r.status==403)throw "command not allowed";if(r.status==429)throw "rate limited";if(!r.ok)throw r.status;return r.json()}
async function run(text){st("relay "+text+" → Neo");var routes=CFG.routes||%ROUTES%,last;
 for(var i=0;i<routes.length;i++){var u=routes[i].replace("{neo}",H);if(u.indexOf("native:")==0){try{window.webkit.messageHandlers.labShot.postMessage({text:"relay-macos:"+text});st("queued via ЯBOT relay-macos inbox → bridge");return {text:"queued "+text+" → Neo (reply in rbot-bridge-replies)"}}catch(e){last=e;continue}}try{var j=await post(u,{text:text,from:"%APP%"});st(j.status||("ok via "+u.split("/")[2]));return j}catch(e){last=e}}
 st("Neo unreachable ("+last+")");return {text:"SHOT relay failed: Neo unreachable"}}
function render(j,el){var d=document.createElement("div");d.className="shot-sense-reply";d.textContent=j.text||j.reply||"";
 var m=/data:image\/[a-z]+;base64,[A-Za-z0-9+\/=]+/.exec(JSON.stringify(j));if(j.image_b64||m){var i=new Image();i.src=j.image_b64?("data:image/jpeg;base64,"+j.image_b64):m[0];i.style.maxWidth="100%";d.appendChild(i)}
 (el||document.body).appendChild(d);return d}
window.SHOT_SENSE={match:function(t){return RX.test(t||"")},run:run,render:render,
 handle:async function(t,el){if(!RX.test(t||""))return false;render(await run(t.trim()),el);return true}};})();'''
APPS=[("rbowzr-ios","ЯBOWZR iOS","info.rizal.rbowzr.native.test",["http://{neo}:4873/shot-sense"]),
("rbot-ios","ЯBOT iOS (+twin)","io.github.rizaleon.yaaim",["http://{neo}:4873/shot-sense","native:relay-macos"]),
("dragonskull-ios","DRAGON SKULL / RDRAGON iOS","info.rizal.dragonskull",["http://{neo}:4873/shot-sense"])]
now=datetime.datetime.now().astimezone().isoformat(timespec='seconds'); out=[]
for i,(id_,nm,bid,routes) in enumerate(APPS):
  js=JS.replace("%ROUTES%",json.dumps(routes)).replace("%APP%",id_)
  egg={"schema":"rzl.egg.v1","id":"shot-sense-"+id_,"name":"shot-sense-"+id_+"-2.1.9-s2.rzl","version":"2.1.9-s2","kind":"skill","platform":"ios","app":nm,"bundle":bid,
   "stamp":"ЯID-0003-P4M6 · ЯМАХ · 2026-10-24 MT","signed":False,"note":"Relay via BOTBRIDGE :4873/shot-sense (paired-device token). Relays SHOT/SSHOT/SEE/SEE <path>/SSHOT SEE to Neo; inline result + ThundR STATUS. No vision model.",
   "commands":["SHOT","SSHOT","SEE","SEE <path>","SSHOT SEE"],"relay":routes,
   "files":{"shot-sense.js":js,"rbwzr-shot.js":rd("rbwzr/rbwzr-shot.js")}}
  p=os.path.join(S,egg["name"]); data=json.dumps(egg,ensure_ascii=False,indent=1).encode()
  open(p,"wb").write(data); h=hashlib.sha256(data).hexdigest(); out.append({"app":nm,"id":id_,"path":p,"sha256":h,"bytes":len(data)})
open(os.path.join(S,"appcast.shot-sense.STAGED.json"),"w").write(json.dumps({"status":"STAGED-DRAFT","signed":False,"published":False,"updated":now,"items":[{"id":"shot-sense-"+o["id"],"version":"2.1.9-s2","file":os.path.basename(o["path"]),"sha256":o["sha256"],"length":o["bytes"],"staged":True} for o in out]},ensure_ascii=False,indent=1))
open(os.path.join(S,"SHA256SUMS"),"w").write("".join(f'{o["sha256"]}  {os.path.basename(o["path"])}\n' for o in out))
print(json.dumps(out,ensure_ascii=False,indent=1))
