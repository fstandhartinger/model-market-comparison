import { createRequire } from 'node:module';
import { writeFile, mkdir } from 'node:fs/promises';
const require=createRequire(import.meta.url); const {chromium}=require(process.env.BH_PLAYWRIGHT_PATH || 'playwright');
const base=process.env.BH_UI_URL || 'http://127.0.0.1:3316'; const out=process.env.BH_UI_OUT || 'ops/rebuild-2026-09/evidence/phase-06/legacy-rendered';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
await context.addInitScript(()=>{localStorage.setItem('bh-theme','light');window.__bhPerf={cls:0,lcp:null};new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.__bhPerf.cls+=e.value}).observe({type:'layout-shift',buffered:true});new PerformanceObserver(list=>{window.__bhPerf.lcp=list.getEntries().at(-1).startTime}).observe({type:'largest-contentful-paint',buffered:true});});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));const results=[];
for(const route of ['/charts','/scatter','/providers','/provider-explorer','/eu','/gateways','/about']){
 await page.setViewportSize({width:1440,height:1000});await page.goto(base+route);await page.waitForLoadState('networkidle');
 for(const [width,theme] of [[1440,'light'],[390,'light'],[1440,'dark']]){
 await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
 await page.setViewportSize({width,height:width===1440?1000:844});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 await page.addScriptTag({path:process.env.BH_AXE_PATH});
 const result=await page.evaluate(async()=>{const a=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','best-practice']}});return {overflow:document.documentElement.scrollWidth-innerWidth,violations:a.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.slice(0,8).map(n=>({target:n.target,summary:n.failureSummary}))})),incomplete:a.incomplete.map(v=>v.id),metrics:{...window.__bhPerf,fcp:performance.getEntriesByName('first-contentful-paint')[0]?.startTime}}});
 results.push({route,width,theme,...result});console.log(route,width,theme,result.overflow,result.violations.map(x=>x.id));
 await page.screenshot({path:out+'/'+route.slice(1)+'-'+width+'-'+theme+'.png'});if(width===1440 && theme==='light')await writeFile(out+'/'+route.slice(1)+'-aria.txt',await page.locator('body').ariaSnapshot());
 }
}
const interactions=[];
await page.setViewportSize({width:390,height:844});await page.goto(base+'/');await page.waitForLoadState('networkidle');
const more=page.locator('nav summary');await more.focus();await page.keyboard.press('Enter');await page.keyboard.press('Tab');if(!(await page.locator(':focus').getAttribute('href')))throw Error('More navigation not reachable by Tab');await page.keyboard.press('Enter');await page.waitForLoadState('networkidle');interactions.push('More disclosure Enter + Tab reaches a secondary navigation link and Enter navigates');
await page.goto(base+'/provider-explorer');await page.waitForLoadState('networkidle');const provider=page.getByRole('button',{pressed:false}).filter({hasText:'Chutes'}).first();if(await provider.count()){const handle=await provider.elementHandle();await handle.focus();await page.keyboard.press('Enter');await page.waitForFunction(el=>el.getAttribute('aria-pressed')==='true',handle);interactions.push('Provider directory selection by focus + Enter updates aria-pressed');}
const model=page.locator('main button[aria-expanded]').filter({hasText:'GPT'}).first();if(await model.count()){const handle=await model.elementHandle();await handle.focus();await page.keyboard.press('Enter');await page.waitForFunction(el=>el.getAttribute('aria-expanded')==='true',handle);interactions.push('Model offer comparison opens using Enter');}
await page.goto(base+'/scatter');await page.waitForLoadState('networkidle');const table=page.locator('summary').filter({hasText:'Model prices and scores'});await table.focus();await page.keyboard.press('Enter');if(await table.locator('..').locator('a[href^="/models/"]').count()===0)throw Error('Scatter table missing equivalent links');interactions.push('Scatter accessible table opens with Enter and exposes model links');
await writeFile(out+'/checks.json',JSON.stringify({at:new Date().toISOString(),base,environment:'Unthrottled system Chrome on local production build; each route navigation loads at desktop width, then same-document theme and viewport changes',errors,interactions,results},null,2));await browser.close();

if(errors.length || results.some(r=>r.overflow>1 || r.violations.length))process.exitCode=1;
