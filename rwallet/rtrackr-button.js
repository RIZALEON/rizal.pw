/* RTRACKR button for the ASSM profile ЯWALLET (.csp-rwx) · 20261030 · add-only, plain link, no pop-up. */
(function(w){"use strict";function add(){var x=document.querySelector('.csp-rwx');if(!x||x.querySelector('.rtrackr-btn'))return;
 var a=document.createElement('a');a.className='rtrackr-btn';a.href='/rtrackr/#rid/'+encodeURIComponent('ЯID-0001-3QQS');a.textContent='▶ RTRACKR · RGHOSTCHAIN explorer';
 a.setAttribute('style','display:block;margin-top:6px;border:1px solid #39ff14;background:#000;color:#39ff14;padding:5px 7px;font:11px Menlo,monospace;text-decoration:none;text-align:center');x.appendChild(a)}
setInterval(add,800)})(window);
