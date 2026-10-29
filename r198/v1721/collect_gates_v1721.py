"""Summarize retained evidence. Missing or failed gates never default to PASS."""
import pathlib,json,re,hashlib
J=pathlib.Path(__file__).resolve().parent;R=J/'receipts';L=lambda p:json.loads(p.read_text())
files={'repro':'REPRO.json','carried_rows':'CARRIED-ROWS.json','common_set':'COMMON-SET-BINDING.json','pricing':'PRICING-REFERENCES.json','raw':'RAW-BINDING.json','public_text':'PUBLIC-TEXT.json','helpers':'HELPERS.json','visibility':'VISIBILITY-POSTFLIP.json','preview':'PREVIEW.json','built_artifact':'BUILT-LINKS.json','all_data_pending':'ALLDATA-PENDING.json','all_data_pass':'ALLDATA-PASS.json'}
g={k:L(R/v) if (R/v).exists() else {'status':'NOT_RUN'} for k,v in files.items()}
g['topfive']=L(R/'topfive-diff.json')
for k in ['TSC','PENDING','POSTFLIP','BUILD-POSTFLIP','FULLTEST-POSTFLIP']:
 p=R/(k+'-EXIT.json');g[k]=L(p) if p.exists() else {'status':'NOT_RUN'}
for n in ['release-tests','postflip-tests','fulltest-postflip']:
 p=R/(n+'.log');s=p.read_text() if p.exists() else '';g[n]={k:int(m.group(1)) for k in ['tests','pass','fail','cancelled','skipped'] if (m:=re.search(r'^# '+k+r' (\d+)$',s,re.M))}
 if p.exists():g[n].update(log_sha256=hashlib.sha256(p.read_bytes()).hexdigest(),not_ok=re.findall(r'^not ok \d+ - (.*)$',s,re.M))
p=R/'validator.log';g['validator']={'status':'PASS' if p.exists() and p.read_text().startswith('PASS 314 carried rows') else 'NOT_PASS','log_sha256':hashlib.sha256(p.read_bytes()).hexdigest() if p.exists() else None}
(R/'GATES.json').write_text(json.dumps(g,indent=1,sort_keys=True)+'\n');print('Collected',len(g),'real receipts')
