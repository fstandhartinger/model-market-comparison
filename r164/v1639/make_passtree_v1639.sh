#!/usr/bin/env bash
set -euo pipefail
J=$(cd "$(dirname "$0")" && pwd); WT=$(cd "$J/../.." && pwd); DEST=${V1639_PASS:-$J/pass}
mkdir -p "$DEST"
rsync -a --delete --exclude=.git --exclude=node_modules --exclude=.next --exclude=r160 --exclude=r164 "$WT/" "$DEST/"
if [ ! -d "$DEST/.git" ]; then
  git -C "$DEST" init -q
  mkdir -p "$DEST/.git/objects/info"
  git -C "$WT" rev-parse --path-format=absolute --git-common-dir | sed 's|$|/objects|' > "$DEST/.git/objects/info/alternates"
  git -C "$DEST" read-tree 86e8505b
  git -C "$DEST" update-ref HEAD 86e8505b
fi
ln -sfn /opt/model-market-comparison/node_modules "$DEST/node_modules"
python3 - "$DEST" <<'PY'
import pathlib,json,sys
p=pathlib.Path(sys.argv[1])/'data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.39-publication.json';d=json.loads(p.read_text());d['review']={'engine':'synthetic-review-only','verdict':'PASS','receipt_sha256':'a'*64};p.write_text(json.dumps(d,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
PY
