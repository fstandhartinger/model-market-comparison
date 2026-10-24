#!/usr/bin/env bash
set -euo pipefail
J=$(cd "$(dirname "$0")" && pwd); WT=$(cd "$J/../.." && pwd); DEST="$J/pass"
if [ -L "$DEST" ]; then echo "refusing symlinked synthetic destination" >&2; exit 2; fi
mkdir -p "$DEST"
[ "$(realpath "$DEST")" = "$DEST" ] || { echo "refusing unexpected synthetic destination" >&2; exit 2; }
rsync -a --delete --exclude=.git --exclude=node_modules --exclude=.next --exclude=r160 --exclude=r164 --exclude=r168 --exclude=r169t "$WT/" "$DEST/"
if [ ! -d "$DEST/.git" ]; then
  git -C "$DEST" init -q
  mkdir -p "$DEST/.git/objects/info"
  git -C "$WT" rev-parse --path-format=absolute --git-common-dir | sed 's|$|/objects|' > "$DEST/.git/objects/info/alternates"
  git -C "$DEST" read-tree 1da05e6f
  git -C "$DEST" update-ref HEAD 1da05e6f
fi
ln -sfn /opt/model-market-comparison/node_modules "$DEST/node_modules"
python3 - "$DEST" <<'SYNTHETIC'
import pathlib,json,sys,hashlib,re,datetime
w=pathlib.Path(sys.argv[1]);v=w/'data/raw/benchmarks/jevbench/v1.6'
put=lambda p,d:p.write_text(json.dumps(d,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
now=datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0)
sent=(now-datetime.timedelta(minutes=5)).strftime('%Y-%m-%dT%H:%M:%SZ')
answered=now.strftime('%Y-%m-%dT%H:%M:%SZ')
p=v/'jevbench-v1.6.43-proof.json';proof=json.loads(p.read_text());approval=proof['publication_approval'];preview=proof['refreshed_preview']
preview.update(sent_card_id='999999',sent_at_utc=sent,dispatch_receipt_sha256='a'*64,dispatch_action_sha256='c'*64)
approval['refreshed_preview']=preview;approval['status']='PASS';approval['fresh_go']={'card_id':'999999','reply_to_card_id':'999999','from_user':'florian','answer_event_id':'synthetic-callback','button':'Publish (recommended)','answered_at_utc':answered,'dispatch_receipt_sha256':'a'*64,'dispatch_action_sha256':'c'*64,'answer_receipt_sha256':'b'*64,'preview_binding_sha256':hashlib.sha256(json.dumps(preview,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()};put(p,proof);proof_hash=hashlib.sha256(p.read_bytes()).hexdigest()
p=v/'jevbench-v1.6.43-publication.json';pub=json.loads(p.read_text());pub['review']={'engine':'synthetic-review-only','verdict':'PASS','receipt_sha256':'a'*64};pub['files']['proof']['sha256']=proof_hash;put(p,pub)
preview_hash=hashlib.sha256(json.dumps(preview,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()
p=w/'lib/jevbench-v1643-release.mjs';s=p.read_text()
expected=json.loads(re.search(r'export const V1643_EXPECTED_HASHES = (.+);',s).group(1));expected.update(proof=proof_hash)
s=re.sub(r'(export const V1643_EXPECTED_HASHES = )(.+);',lambda m:m[1]+json.dumps(expected,sort_keys=True)+';',s)
s=re.sub(r'(export const V1643_REFRESHED_PREVIEW = )(.+);',lambda m:m[1]+json.dumps(preview,sort_keys=True)+';',s)
s=re.sub(r'(export const V1643_REFRESHED_PREVIEW_SHA256 = )(.+);',lambda m:m[1]+json.dumps(preview_hash)+';',s)
s=re.sub(r'(export const V1643_FRESH_GO_RECEIPT_SHA256 = )(.+);',lambda m:m[1]+json.dumps('b'*64)+';',s)
p.write_text(s)
SYNTHETIC
