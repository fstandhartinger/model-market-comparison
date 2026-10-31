"""One actual model route on unchanged production TSX, bounded Next dev, synthetic PASS; not a production-build claim."""
import asyncio,pathlib,json,hashlib,sys,datetime,time
from playwright.async_api import async_playwright
from browser_v184 import chromium_path
J=pathlib.Path('r198/v184');OUT=pathlib.Path(sys.argv[1]).resolve();OUT.mkdir(parents=True,exist_ok=True);MODEL='granite-switch-4.1-8b';TSX=pathlib.Path('app/jev-models/[system]/page.tsx');sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();before=sha(TSX)
async def main():
 server=await asyncio.create_subprocess_exec('node','r198/v184/replay_dev_server.mjs',stdin=asyncio.subprocess.PIPE,stdout=asyncio.subprocess.PIPE,stderr=asyncio.subprocess.STDOUT);logs=[];port=None;drain=None
 async def collect():
  while True:
   line=await server.stdout.readline()
   if not line:break
   t=line.decode(errors='replace');logs.append(t);(OUT/'server.log').write_text(''.join(logs))
 try:
  for _ in range(2000):
   line=await asyncio.wait_for(server.stdout.readline(),timeout=180)
   if not line:raise RuntimeError('Next dev exited before ready')
   t=line.decode(errors='replace');logs.append(t)
   if t.startswith('PREVIEW_READY '):port=int(t.split()[1]);break
  assert port;print('NEXT_DEV_READY '+datetime.datetime.now(datetime.timezone.utc).isoformat(),flush=True);drain=asyncio.create_task(collect())
  async with async_playwright() as p:
   browser=await p.chromium.launch(headless=True,executable_path=chromium_path(),args=['--no-sandbox','--disable-dev-shm-usage'])
   try:
    page=await browser.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1);errors=[];page.on('pageerror',lambda x:errors.append(str(x)))
    required=['7 of 50','zero argmax flips','0.0312263773757529','5e-2','recorded only','not established','near-tie allowance','not a cross-backend equivalence claim']
    started=time.monotonic();deadline=started+1200
    remaining=lambda:max(1,int((deadline-time.monotonic())*1000))
    print('ACTUAL_MODEL_REQUEST_START '+datetime.datetime.now(datetime.timezone.utc).isoformat()+' HTTPcommit+visible-facts total bound1200s;unit bound1800s',flush=True)
    response=await page.goto(f'http://127.0.0.1:{port}/jev-models/{MODEL}',wait_until='commit',timeout=remaining());assert response.status==200,response.status
    print('HTTP_COMMIT_200 '+datetime.datetime.now(datetime.timezone.utc).isoformat(),flush=True)
    await page.wait_for_function("terms=>{const text=document.body?.innerText??'';return terms.every(t=>text.includes(t));}",arg=required,timeout=remaining())
    visible_at=datetime.datetime.now(datetime.timezone.utc).isoformat();elapsed=time.monotonic()-started
    print('ALL_REQUIRED_FACTS_VISIBLE '+visible_at+' elapsed='+str(elapsed),flush=True)
    await page.wait_for_timeout(2000);assert not errors,errors
    text=await page.locator('body').inner_text()
    for term in required:assert term in text,term
    assert 'Not ranked in the current release' in text and 'ibm-granite/granite-4.1-8b' in text
    assert await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'),'horizontal overflow'
    await page.evaluate("()=>{const d=document.createElement('div');d.textContent='CANDIDATE — FINAL DATA-ONLY REPLAY DISCLOSURE — NEXT DEV / SYNTHETIC PASS';d.style.cssText='background:#7f1d1d;color:white;padding:12px;text-align:center;font:700 16px system-ui';document.body.prepend(d)}")
    await page.screenshot(path=str(OUT/f'{MODEL}.png'),full_page=True);(OUT/f'{MODEL}.html').write_text(await page.content());(OUT/'visible-dom.txt').write_text(text)
    result=pathlib.Path('data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.4-results.json');pub=json.loads(result.with_name('jevbench-v1.8.4-publication.json').read_text());assert pub['review']['verdict']=='PASS';assert before==sha(TSX)
    manifest={'status':'PASS targeted final-source render; production publication pending','source':'Actual model page served by bounded Next dev from unchanged production TSX; synthetic PASS fixture. Not a new production build.','results_sha256':sha(result),'source_tsx_sha256':before,'first_render_timeout_ms':1200000,'unit_guard_seconds':1800,'load_state_scope':'HTTP commit then all required actual visible DOM facts; document stream may remain open; no DOMContentLoaded/networkidle completion claim','all_required_facts_visible_at':visible_at,'elapsed_to_visible_facts_seconds':elapsed,'source_tsx_unchanged_after_render':True,'review_mode':pub['review'],'pages':[{'route':f'/jev-models/{MODEL}','status':200,'png_sha256':sha(OUT/f'{MODEL}.png'),'html_sha256':sha(OUT/f'{MODEL}.html'),'visible_dom_sha256':sha(OUT/'visible-dom.txt'),'required_visible_dom_terms':required,'page_errors':errors,'no_horizontal_overflow':True}], 'required_before_production':'Fresh mandatory merge-queue full build of exact final HEAD'}
    (OUT/'manifest.json').write_text(json.dumps(manifest,indent=1,sort_keys=True)+'\n');await page.close()
   finally:await browser.close()
  print('PASS actual Granite model page: all replay/gate facts in visible DOM; unchanged production TSX; screenshot retained')
 finally:
  if server.returncode is None:
   server.stdin.write(b'close\n');await server.stdin.drain();server.stdin.close()
   try:await asyncio.wait_for(server.wait(),timeout=30)
   except asyncio.TimeoutError:logs.append('Server close timed out; owning heavy unit cleanup remains responsible.\n')
  if drain:
   try:await asyncio.wait_for(drain,timeout=5)
   except asyncio.TimeoutError:drain.cancel()
  (OUT/'server.log').write_text(''.join(logs))
asyncio.run(main())
