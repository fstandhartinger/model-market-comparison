import json,urllib.request,urllib.parse,websocket,time,pathlib,base64,subprocess
J=pathlib.Path(__file__).resolve().parent
base='http://127.0.0.1:9333';target=None
server=subprocess.Popen(['python3','-m','http.server','18811','--bind','127.0.0.1','--directory',str(J/'preview')],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
time.sleep(.3)
try:
 url='http://127.0.0.1:18811/index.html'
 req=urllib.request.Request(base+'/json/new?'+urllib.parse.quote(url,safe=''),method='PUT')
 target=json.load(urllib.request.urlopen(req,timeout=10));ws=websocket.create_connection(target['webSocketDebuggerUrl'],suppress_origin=True,timeout=20)
 seq=0
 def call(method,params={}):
  global seq
  seq+=1;ws.send(json.dumps({'id':seq,'method':method,'params':params}))
  while True:
   r=json.loads(ws.recv())
   if r.get('id')==seq:
    assert 'error' not in r,r.get('error');return r.get('result',{})
 def ev(s):
  r=call('Runtime.evaluate',{'expression':s,'returnByValue':True});assert 'exceptionDetails' not in r,r.get('exceptionDetails');return r.get('result',{}).get('value')
 for _ in range(40):
  if ev("document.querySelector('#ranking')!==null"):break
  time.sleep(.2)
 assert ev("document.querySelector('#ranking').children.length")>0
 assert ev("document.querySelector('#radar polygon')!==null")
 for k in ['decisio-gemma-4-12b-tuned-commit','decisio-gemma-4-12b-v090','decisio-gemma-4-12b-v080','decisio-gemma-4-31b-v080']:
  ev("document.querySelector('#target').value="+json.dumps(k)+";document.querySelector('#target').dispatchEvent(new Event('change'))")
  assert ev("document.querySelector('#pair').textContent.length")>20
 ev("document.querySelector('#model').value='Decisio';document.querySelector('#model').dispatchEvent(new Event('input'))")
 assert ev("document.querySelector('#ranking').children.length")>=4
 ev("document.querySelector('#model').value='';document.querySelector('#model').dispatchEvent(new Event('input'));document.querySelector('#target').value='decisio-gemma-4-12b-tuned-commit';document.querySelector('#target').dispatchEvent(new Event('change'))")
 assert ev("document.querySelector('#summary').textContent.includes('top five changed')")
 call('Emulation.setDeviceMetricsOverride',{'width':1440,'height':1000,'deviceScaleFactor':1,'mobile':False})
 screenshot=call('Page.captureScreenshot',{'format':'png','captureBeyondViewport':False})['data'];(J/'preview/browser.png').write_bytes(base64.b64decode(screenshot))
 d={'status':'PASS','shared_cdp':9333,'only_new_tab_used':True,'four_target_selections':True,'model_search':True,'radar':True,'rankings':True,'screenshot':'preview/browser.png'}
 (J/'receipts/BROWSER.json').write_text(json.dumps(d,indent=1,sort_keys=True)+'\n');print('PASS shared Chrome preview controls, four targets, search, radar, rankings; tab closed in finally')
finally:
 server.terminate();server.wait(timeout=5)
 if target:
  try:urllib.request.urlopen(base+'/json/close/'+target['id'],timeout=10).read()
  except Exception:pass
