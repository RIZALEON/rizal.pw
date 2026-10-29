// export login record button: present on /login/options/, wired, exports only the already-wrapped record (format rlogin.record-export.v1).
const A=require("assert"),fs=require("fs"),path=require("path"),R=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
const s=R("rdragon-cryptosocial/rlogin-page.js"),h=R("login/options/index.html");
A(/id="b-exrec"/.test(h),"button on options page");
A(/if\(\$\("b-exrec"\)\)\$\("b-exrec"\)\.onclick=exportRec;/.test(s),"wired");
const f=s.slice(s.indexOf("function exportRec("),s.indexOf("function login("));
A(/pwRec\(h\)/.test(f)&&/rec:x\.rec,pid:x\.pid\|\|null,pkg:x\.pkg\|\|null/.test(f),"exports {rec,pid,pkg} from pwRec");
A(!/l-pass|PW|\.value\)\s*[,}]/.test(f.replace('$("l-user").value','')),"never reads the password field");
A(/exportRec:exportRec/.test(s),"exposed on RLOGIN_PAGE");
console.log("5 passed");
