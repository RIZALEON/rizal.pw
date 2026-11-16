/* ds-mind-view.js · DRAGON-SKULL-MIND readable view 0.1.0 (RZL DYNAMIC DOC, human view). A faint "MIND" label in the header opens it:
 * index (day → topic · bot), Day 0 (seed history), then each day newest first. Read-only; text only (textContent, no HTML from data).
 * Chain check: same sha256 formula as MemoryStore.verifyChain (WebCrypto). */
(function () {
  "use strict";
  const K = window.DS_BBX_CORE; if (!K) return;
  const HEAD0_SEED = "rzl.ds.mind.v1|info.rizal.dragonskull|DRAGON-SKULL-MIND";
  const hex = (b) => Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
  const sha = async (s) => hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  let panel = null;
  const el = (tag, css, text) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text !== undefined) e.textContent = text; return e; };
  function line(b) {
    const who = b.kind === "turn-user" ? "you" : b.kind === "turn-bot" ? "DRAGON SKULL" : b.kind;
    const d = el("div", "margin:2px 0;white-space:pre-wrap;word-break:break-word;font-size:12px");
    d.appendChild(el("span", "opacity:.5", String(b.ts || "").slice(11, 16) + " #" + b.seq + " " + who + ": "));
    d.appendChild(document.createTextNode(String(b.text || "").slice(0, 1200))); return d;
  }
  function section(title, open) { const s = el("details", "margin:6px 0"); if (open) s.open = true; s.appendChild(el("summary", "font-weight:600;cursor:pointer", title)); return s; }
  async function render(filter) {
    const body = panel.querySelector("#ds-mind-body"); body.textContent = "loading…";
    const blocks = await window.DS_BBX.ledger(); const f = String(filter || "").toLowerCase();
    const shown = f ? blocks.filter((b) => String(b.text).toLowerCase().includes(f) || String(b.topic).includes(f) || String(b.day).includes(f)) : blocks;
    const g = K.organize(shown); body.textContent = "";
    const v = await K.verifyChain(blocks, sha, await sha(HEAD0_SEED));
    body.appendChild(el("div", "font-size:11px;opacity:.7;margin-bottom:6px", K.C.mind + " · " + blocks.length + " blocks · chain " + (v.ok ? "✓ intact" : "✗ break at #" + v.at) + " · append-only"));
    const idx = section("Index", true);
    for (const d of g.index) idx.appendChild(el("div", "font-size:12px", d.day + " — " + Object.entries(d.topics).map(([k, n]) => k + " " + n).join(", ")));
    body.appendChild(idx);
    const d0 = section("Day 0 · DRAGON SKULL history (" + g.day0.length + ")", false);
    const subs = {}; for (const b of g.day0) (subs[b.sub || "history"] = subs[b.sub || "history"] || []).push(b);
    for (const [k, list] of Object.entries(subs)) { const s = section(k, true); list.forEach((b) => s.appendChild(line(Object.assign({}, b, { ts: b.day + "T00:00", kind: "" })))); d0.appendChild(s); }
    body.appendChild(d0);
    for (const d of g.days.slice().reverse()) {
      const s = section(d.day + " (" + d.topics.reduce((a, t) => a + t[1].length, 0) + ")", d === g.days[g.days.length - 1]);
      for (const [k, list] of d.topics) { const t = section(k + " (" + list.length + ")", false); list.forEach((b) => t.appendChild(line(b))); s.appendChild(t); }
      body.appendChild(s);
    }
  }
  function open() {
    if (panel) { panel.remove(); panel = null; return; }
    panel = el("div", "position:fixed;inset:44px 6px 6px 6px;z-index:9999;background:#0b0b0b;color:#ddd;border:1px solid #333;border-radius:10px;display:flex;flex-direction:column;font-family:-apple-system,system-ui,sans-serif");
    const bar = el("div", "display:flex;gap:6px;padding:8px;border-bottom:1px solid #222;align-items:center");
    bar.appendChild(el("b", "font-size:13px;flex:0 0 auto", "MIND"));
    const q = el("input", "flex:1;min-width:0;background:#151515;color:#ddd;border:1px solid #333;border-radius:6px;padding:4px 6px;font-size:12px"); q.placeholder = "filter (word, topic, day)";
    q.addEventListener("input", () => { clearTimeout(q._t); q._t = setTimeout(() => render(q.value), 250); });
    const x = el("button", "background:none;border:1px solid #333;color:#ddd;border-radius:6px;padding:2px 8px", "✕"); x.onclick = open;
    bar.appendChild(q); bar.appendChild(x); panel.appendChild(bar);
    const body = el("div", "overflow:auto;padding:8px;flex:1"); body.id = "ds-mind-body"; panel.appendChild(body);
    document.body.appendChild(panel); render("").catch((e) => { body.textContent = "MIND: " + e.message; });
  }
  /* 20261110-v32: no MIND label in the top header. The panel remains available as window.DS_MIND_VIEW.open. */
  window.DS_MIND_VIEW = { open, render };
})();
