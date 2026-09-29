"""Owned API/input fixtures for tests only. Production never imports this module."""
import hashlib
import json
from pathlib import Path


def create(root, production_manifest, predictions):
    root.mkdir(parents=True,exist_ok=True)
    def pin(path):
        return {'path':str(path),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
    rows=[]
    for raw in predictions:
        labels=list(raw['probs_as_returned'])
        typ='noul' if 'noul' in raw['task_id'] else 'score' if 'score' in raw['task_id'] else 'choice'
        question={'type':typ,'instructions':'Choose the second option in this invented fixture.',
                  'criteria':['first','second'] if typ=='score' else {'true':'second','false':'first'} if typ=='noul' else dict.fromkeys(labels,'fixture')}
        rows.append({'task_id':raw['task_id'],'state':'invented test state','question':question,'labels':labels})
    text=root/'items.jsonl';text.write_text(''.join(json.dumps(r)+'\n' for r in rows))
    manifest=json.loads(Path(production_manifest).read_text())
    manifest['inputs']['jevbench']={'count':len(rows),'items':pin(text)}
    images=root/'images';parts={}
    for part in ('public','sealed'):
        folder=images/part;(folder/'images').mkdir(parents=True)
        image=folder/'images/fixture.png';image.write_bytes(b'invented-image-fixture')
        item={'token':'fixture-'+part,'question':'Invented image question','options':[{'label':'first'},{'label':'second'}],'image':'images/fixture.png'}
        data=folder/'items.jsonl';data.write_text(json.dumps(item)+'\n')
        parts[part]={'rows':1,'items_jsonl_sha256':pin(data)['sha256'],'images':[{'path':'images/fixture.png','bytes':image.stat().st_size,'sha256':pin(image)['sha256']}]}
    index=root/'image-manifest.json';index.write_text(json.dumps({'parts':parts}))
    manifest['inputs']['imagejevbench']={'count':2,'root':str(images),'manifest':pin(index)}
    path=root/'measurement-profiles.json';path.write_text(json.dumps(manifest))
    return path


def inert_transport_command(original):
    """Run the real fixed driver + official parsers, replacing only external HTTP in tests."""
    wrapper = '''import sys,json
sys.path.insert(0,'/code')
import measurement_driver as driver
def fixture_transport(url):
 def call(request,timeout=120):
  assert request.full_url==url
  body=json.loads(request.data)
  if 'questions' in body:
   q=body['questions']['decision'];typ=q['type']
   answer={'type':typ,'noul':.99,'choice':'1','probabilities':{'0':.01,'1':.99}}
   response={'answers':{'decision':answer},'usage':{'input_tokens':1,'output_tokens':0}}
  else:
   assert body['provider']=={'data_collection':'deny','zdr':True,'allow_fallbacks':False}
   fmt=body['response_format']
   if fmt['type']=='json_schema':
    labels=fmt['json_schema']['schema']['properties']['probabilities']['required']
    content={'probabilities':{labels[0]:.01,labels[1]:.99}}
   else: content={'answer':'B','probabilities':{'A':.01,'B':.99}}
   response={'choices':[{'message':{'content':json.dumps(content)}}],'usage':{'prompt_tokens':1,'completion_tokens':0,'cost':.000001}}
  return driver.Response(json.dumps(response).encode(),200)
 return call
driver.restricted_urlopen=fixture_transport
driver.main()
'''
    def command(*args,**kwargs):
        argv=original(*args,**kwargs)
        return argv[:-1]+['-c',wrapper]
    return command
