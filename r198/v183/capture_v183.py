"""Real production Next pages, 1440x900 full-page Chromium screenshots. No desktop/shared browser."""
import argparse,asyncio,hashlib,json,pathlib,shutil,sys
from playwright.async_api import async_playwright
from browser_v183 import chromium_path
p=argparse.ArgumentParser();p.add_argument('--out',type=pathlib.Path,required=True);a=p.parse_args();out=a.out.resolve();out.mkdir(parents=True,exist_ok=True)
async def main():
 server=await asyncio.create_subprocess_exec('node','r198/v183/preview_server_v183.mjs',stdin=asyncio.subprocess.PIPE,stdout=asyncio.subprocess.PIPE,stderr=asyncio.subprocess.STDOUT)
 log=[];port=None
 try:
  while True:
   line=await asyncio.wait_for(server.stdout.readline(),timeout=120)
   if not line:raise RuntimeError('Preview server exited before ready')
   t=line.decode(errors='replace');log.append(t)
   if t.startswith('PREVIEW_READY '):port=int(t.split()[1]);break
  async with async_playwright() as p:
   executable=chromium_path()
   b=await p.chromium.launch(headless=True,executable_path=executable,args=['--no-sandbox','--disable-dev-shm-usage'])
   try:
    pages=[]
    for label,route in [('main','/jev-models'),('all','/jev-models/all')]+[(k,'/jev-models/'+k) for k in json.loads(pathlib.Path('r198/v183/receipts/NEW-ROWS.json').read_text())]:
     page=await b.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
     try:
      errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
      res=await page.goto(f'http://127.0.0.1:{port}'+route,wait_until='domcontentloaded',timeout=120000);assert res.status==200,(route,res.status)
      await page.wait_for_timeout(2000)
      assert not errors,(route,errors)
      close=page.get_by_role('button',name='Close priority evaluation banner for this session')
      dismissed=bool(await close.count() and await close.is_visible())
      if dismissed:
       await close.click();await page.wait_for_timeout(250)
      await page.evaluate("""()=>{const d=document.createElement('div');d.textContent='CANDIDATE PREVIEW — REVIEW PENDING — SYNTHETIC REVIEW ONLY';d.style.cssText='position:relative;background:#7f1d1d;color:white;padding:12px;text-align:center;font:700 16px system-ui';document.body.prepend(d)}""")
      await page.screenshot(path=str(out/f'{label}.png'),full_page=True)
      (out/f'{label}.html').write_text(await page.content())
      pages.append({'name':label,'route':route,'status':res.status,'viewport':{'width':1440,'height':900},'full_page':True,'title':await page.title(),'png':f'{label}.png','html':f'{label}.html','png_sha256':hashlib.sha256((out/f'{label}.png').read_bytes()).hexdigest(),'html_sha256':hashlib.sha256((out/f'{label}.html').read_bytes()).hexdigest(),'dismissed_priority_banner_via_button':dismissed,'candidate_label_position':'document start; no fixed overlay'})
     finally:await page.close()
   finally:await b.close()
  artifact=pathlib.Path('data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.3-results.json')
  (out/'manifest.json').write_text(json.dumps({'status':'candidate preview; review PENDING','source':'real production Next build + local start; synthetic PASS fixture only','main_route_is_open_weights':True,'combined_route':'/jev-models/all','results_sha256':hashlib.sha256(artifact.read_bytes()).hexdigest(),'pages':pages},indent=1,sort_keys=True)+'\n')
  print('Captured',len(pages),'real production pages at 1440x900, full page.')
 finally:
  if server.returncode is None:
   server.stdin.write(b'close\n');await server.stdin.drain();server.stdin.close()
   try:await asyncio.wait_for(server.wait(),timeout=30)
   except asyncio.TimeoutError:print('Preview server did not close; owned heavy-run handle remains responsible for cleanup.',file=sys.stderr)
  (out/'server.log').write_text(''.join(log))
asyncio.run(main())
