/* host shim: one chat-list row for the wired local bot */
document.addEventListener("DOMContentLoaded",()=>{
  const nav=document.getElementById("roster-list"); const ul=document.createElement("ul"); ul.id="chatlist";
  const li=document.createElement("li"); li.className="cl-row"; li.setAttribute("aria-label","RDRAGON RDRAGON-1");
  li.innerHTML='<img src="./ybot-tile.png" alt="" width="28"> RDRAGON'; li.onclick=()=>li.classList.add("sel");
  ul.appendChild(li); nav.appendChild(ul);
});
