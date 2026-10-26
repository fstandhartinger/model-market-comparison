"""Prove the bind-only patch preserves numeric JSON tokens and axis/cost bytes from the build commit."""
import hashlib,json,pathlib,re,subprocess
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];BASE='63a957f355f04429214a0681de63198fd56746e3'
paths=['data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.9-results.json','data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.9-categories.json',*[f'r196/v179/scoring/{m}/{n}.json' for m in ['off','share'] for n in ['launchables-myles-g-12b','jevbench-v1.6.0-results']]]
# JSON strings are consumed first so dates, hashes and explanatory prose are excluded.
tokens=re.compile(r'"(?:[^"\\]|\\.)*"|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)')
def nums(s):return [m.group(1) for m in tokens.finditer(s) if m.group(1) is not None]
def fields(s,key):
 decoder=json.JSONDecoder();out=[]
 for m in re.finditer('"'+key+r'"\s*:\s*',s):
  _,end=decoder.raw_decode(s[m.end():]);out.append(s[m.end():m.end()+end])
 return out
checks={}
for p in paths:
 old=subprocess.check_output(['git','show',BASE+':'+p],cwd=W,text=True);new=(W/p).read_text();assert nums(old)==nums(new),p
 for key in ['axes','usd_per_1000']:assert fields(old,key)==fields(new,key),(p,key)
 checks[p]={'all_numeric_tokens_byte_equal':True,'axes_and_usd_per_1000_byte_equal':True}
old=json.loads(subprocess.check_output(['git','show',BASE+':'+paths[0]],cwd=W));new=json.loads((W/paths[0]).read_text());key='launchables-myles-g-31b'
assert next(r for r in old['systems'] if r['key']==key)==next(r for r in new['systems'] if r['key']==key)
(J/'receipts/BIND-NUMBERS.json').write_text(json.dumps({'status':'PASS','build_commit':BASE,'checks':checks,'myles_g_31b_exact':True},indent=1,sort_keys=True)+'\n')
print('PASS all numeric tokens, axes and usd_per_1000 byte-equal to build commit across results, categories and scoring outputs; 31B row exact')
