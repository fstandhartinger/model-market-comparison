"""Use the already-installed heavy-run Chromium; never downloads a browser."""
import asyncio,json,pathlib,shutil
def chromium_path():
 candidates=[pathlib.Path(p) for p in [shutil.which('chromium'),shutil.which('chromium-browser')] if p]
 candidates+=sorted(pathlib.Path('/srv/heavy/tools/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell'),reverse=True)
 for p in candidates:
  if p.is_file():return str(p)
 raise RuntimeError('No existing heavy-run Chromium executable found')
async def check():
 from playwright.async_api import async_playwright
 async with async_playwright() as p:
  path=chromium_path();browser=await p.chromium.launch(headless=True,executable_path=path,args=['--no-sandbox','--disable-dev-shm-usage'])
  try:
   page=await browser.new_page(viewport={'width':1440,'height':900})
   try:
    await page.set_content('<!doctype html><title>Owned browser preflight</title><p>Browser preflight</p>')
    assert await page.title()=='Owned browser preflight'
    print(json.dumps({'status':'PASS','executable':path,'version':browser.version,'viewport':{'width':1440,'height':900}},indent=1))
   finally:await page.close()
  finally:await browser.close()
if __name__=='__main__':asyncio.run(check())
