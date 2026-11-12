"""After compilation, remove only this synthetic build's unused persistent webpack cache."""
from pathlib import Path
import hashlib,json,os,shutil
W=Path.cwd().resolve();assert W.name=='.pass' and W.parent.name=='v1810', 'synthetic owned build fixture required'
cache=W/'.next/cache/webpack';assert not cache.is_symlink() and cache.resolve().is_relative_to(W/'.next')
def err(e):raise e
size=0
if cache.exists():
 for root,ds,fs in os.walk(cache,onerror=err,followlinks=False):
  for name in fs:size+=(Path(root)/name).lstat().st_size
 shutil.rmtree(cache);cache.mkdir(parents=True)
p=W/'r198/v1810/receipts/WEBPACK-CACHE-CLEANUP.json';p.write_text(json.dumps({'status':'PASS','owned_completed_compilation_cache_bytes_deleted':size,'trigger':'Collecting page data (webpack compilation and type checks completed)','runtime_artifacts_retained':True,'shared_caches_touched':False},indent=1)+'\n')
print('PASS removed only owned completed webpack compilation cache:',size,'bytes')
