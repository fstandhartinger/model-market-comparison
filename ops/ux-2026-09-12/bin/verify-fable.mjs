// Fable design-pass check: hero text, hero height, first-row position, rows visible on the first screen,
// eyebrow/claim/overflow flags, and whether the long score definition leaks into body text.
// Usage: node ops/ux-2026-09-12/bin/verify-fable.mjs <base-url> <out-dir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260913/local';
const BASE = process.argv[2] || 'http://127.0.0.1:3210';
const browser = await chromium.launch();
const out = {};
for (const [kind,vp] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]) for (const theme of ['light','dark']) {
  const c = await browser.newContext({ viewport: vp, isMobile: kind==='mobile', hasTouch: kind==='mobile', colorScheme: theme });
  await c.addInitScript((t)=>{try{localStorage.setItem('theme',t);localStorage.setItem('bh-theme',t);}catch{}}, theme);
  const p = await c.newPage();
  await p.goto(BASE,{waitUntil:'networkidle'}); await p.evaluate((t)=>document.documentElement.setAttribute('data-theme',t), theme); await p.waitForTimeout(500);
  const k=`${kind}_${theme}`;
  await p.screenshot({path:`${OUT}/${k}-simple.png`});
  out[k] = await p.evaluate(() => {
    const h1 = document.querySelector('h1'); const row = document.querySelector('table.dtable tbody tr');
    const hero = document.querySelector('.bh-hero');
    return { h1: h1?.innerText.replace(/\s+/g,' '), heroHeight: hero?.getBoundingClientRect().height, firstRowTop: row?.getBoundingClientRect().top ?? null,
      rowsVisible: [...document.querySelectorAll('table.dtable tbody tr')].filter(r => r.getBoundingClientRect().bottom <= window.innerHeight).length,
      eyebrow: !!document.querySelector('.bh-eyebrow'), everyClaim: document.body.innerText.includes('Every benchmark result'), overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth+1 };
  });
  await p.getByRole('tab',{name:'Advanced'}).click(); await p.waitForTimeout(700); await p.screenshot({path:`${OUT}/${k}-advanced.png`});
  out[k].adv_body_has_dominance = await p.evaluate(()=>{ const t=[...document.querySelectorAll('body *')].filter(e=>!e.closest('dialog,[role=tooltip]')).map(e=>e.childNodes.length?[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join(''):'').join(' '); return t.includes('dominance-safe'); });
  await c.close();
}
await browser.close();
console.log(JSON.stringify(out,null,1));
