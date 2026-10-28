#!/bin/bash
# restack_v1714.sh <new-base> [--no-commit]
# Re-stack v1.7.14 onto the flipped v1.7.13 (or a merged main containing it). Run in the v1.7.14 worktree with a clean tree.
#  1. Checks: clean tree; HEAD descends from the recorded old base (OLD_BASE, default the v1.7.13 candidate 0defb755); the new base
#     holds v1.7.13 with a PASS review and no v1.7.14 yet.
#  2. Moves the branch to <new-base>, restores the v1.7.14 sources (r197/v1714, its release test and ranks fixture) from the old
#     HEAD and RE-RUNS THE BUILD (build_publication + loader + wiring + topics exceptions; every predecessor dependency is read
#     from the new base's files). Rebuilding instead of replaying the old diff avoids conflicts on generated hash files.
#  3. FAILS LOUDLY (exit 3, branch restored to the old HEAD) on any change other than predecessor hashes:
#       v1.7.14 results/categories/carry/history/history-carry must be byte-identical to the old build;
#       proof/publication/loader may differ ONLY in the v1.7.13 manifest sha256 and the derived proof sha256;
#       every other file v1.7.14 touches must receive exactly the same added/removed lines as before.
#     (If v1.7.13's rows or files changed in its flip, this refuses: re-run compare_v1714.sh and run-gates.sh instead.)
#  4. Re-runs the cheap gates (two deterministic rebuilds, validator, source/carry vs the new base, public text, pricing, raw
#     binding, release + v1.7.13 tests) and commits (no push) unless --no-commit. A backup branch keeps the old HEAD.
set -euo pipefail
NEW_ARG=${1:?usage: restack_v1714.sh <new-base> [--no-commit]}; COMMIT=1; [ "${2:-}" == "--no-commit" ] && COMMIT=0
J=$(cd "$(dirname "$0")" && pwd); W=$(cd "$J/../.." && pwd); cd "$W"
export V1714_RELEASE_DATE=${V1714_RELEASE_DATE:-2026-10-28}
fail(){ echo "RESTACK REFUSED: $*" >&2; exit 3; }
V=data/raw/benchmarks/jevbench/v1.7
[ -z "$(git status --porcelain --untracked-files=no)" ] || fail "worktree has uncommitted changes"
NEW=$(git rev-parse --verify "$NEW_ARG^{commit}"); OLDBASE=$(git rev-parse --verify "${OLD_BASE:-0defb755}^{commit}"); OLDHEAD=$(git rev-parse HEAD)
BRANCH=$(git symbolic-ref --short HEAD) || fail "detached HEAD"
git merge-base --is-ancestor "$OLDBASE" "$OLDHEAD" || fail "HEAD does not descend from the old base $OLDBASE"
[ "$NEW" != "$OLDBASE" ] || fail "new base equals the old base"
git show "$NEW:$V/jevbench-v1.7.13-publication.json" | python3 -c "import json,sys;d=json.load(sys.stdin);assert d['revision']=='v1.7.13' and d['review']['verdict']=='PASS',d['review']" || fail "new base has no PASS v1.7.13"
git cat-file -e "$NEW:$V/jevbench-v1.7.14-publication.json" 2>/dev/null && fail "new base already contains v1.7.14"
BACKUP="backup/v1714-pre-restack-${OLDHEAD:0:8}"; git branch -f "$BACKUP" "$OLDHEAD"
rollback(){ set +e; echo "rolling back $BRANCH to $OLDHEAD" >&2; git reset -q --hard; git checkout -q -f -B "$BRANCH" "$OLDHEAD" && [ "$(git rev-parse HEAD)" == "$OLDHEAD" ] && [ -z "$(git status --porcelain --untracked-files=no)" ] && echo "rolled back to $OLDHEAD (clean)" >&2 || echo "ROLLBACK INCOMPLETE: check the worktree; old HEAD is $BACKUP" >&2; }
trap 'rc=$?; if [ $rc -ne 0 ]; then rollback; fi; exit $rc' EXIT
git checkout -q -B "$BRANCH" "$NEW"
git checkout -q "$OLDHEAD" -- r197/v1714 test/jevbench-v1714-release.test.mjs test/fixtures/jevbench-v1714-ranks.json
bash "$J/rebuild_v1714.sh" > "$J/receipts/restack-build.log" 2>&1 || fail "rebuild failed (see receipts/restack-build.log)"
python3 -B - "$OLDBASE" "$OLDHEAD" "$NEW" <<'PY' || fail "changes other than predecessor hashes (see receipts/RESTACK-DIFF.json)"
import hashlib,json,pathlib,subprocess,sys,re
oldbase,oldhead,new=sys.argv[1:4];W=pathlib.Path('.');V='data/raw/benchmarks/jevbench/v1.7'
git=lambda *a:subprocess.run(['git',*a],capture_output=True,check=True).stdout
show=lambda rev,p:git('show',f'{rev}:{p}')
sha=lambda b:hashlib.sha256(b).hexdigest()
bad=[];notes={}
new_pred=sha((W/f'{V}/jevbench-v1.7.13-publication.json').read_bytes());old_pred=sha(show(oldbase,f'{V}/jevbench-v1.7.13-publication.json'))
notes['v1713_publication_sha256']={'old':old_pred,'new':new_pred}
for n in ['results','categories','carry','history','history-carry']:
 p=f'{V}/jevbench-v1.7.14-{n}.json'
 if show(oldhead,p)!=(W/p).read_bytes():bad.append(p+': bytes changed')
op=json.loads(show(oldhead,f'{V}/jevbench-v1.7.14-proof.json'));np_=json.loads((W/f'{V}/jevbench-v1.7.14-proof.json').read_text())
if op['predecessor']['publication_sha256']!=old_pred:bad.append('old proof was not bound to the old base')
op['predecessor']['publication_sha256']=new_pred
if op!=np_:bad.append('proof: change other than the predecessor hash')
om=json.loads(show(oldhead,f'{V}/jevbench-v1.7.14-publication.json'));nm=json.loads((W/f'{V}/jevbench-v1.7.14-publication.json').read_text())
old_proof,new_proof=om['files']['proof']['sha256'],nm['files']['proof']['sha256']
om['predecessor']['publication_sha256']=new_pred;om['files']['proof']['sha256']=new_proof
if om!=nm:bad.append('publication: change other than predecessor/proof hashes')
ol=show(oldhead,'lib/jevbench-v1714-release.mjs').decode().replace(old_proof,new_proof)
if ol!=(W/'lib/jevbench-v1714-release.mjs').read_text():bad.append('loader: change other than the proof hash')
notes['v1714_proof_sha256']={'old':old_proof,'new':new_proof}
def delta(a,b,p):
 out=subprocess.run(['git','diff','--no-index','--unified=0','--no-color',a,b],capture_output=True).stdout.decode(errors='replace').splitlines()
 return sorted(l for l in out if (l.startswith('+') or l.startswith('-')) and not l.startswith(('+++','---')))
import tempfile,os
td=pathlib.Path(tempfile.mkdtemp())
changed=git('diff','--name-only',oldbase,oldhead).decode().split()
skip=re.compile(r'^(r197/v1714/|test/jevbench-v1714-release\.test\.mjs$|test/fixtures/jevbench-v1714-ranks\.json$|'+re.escape(V)+r'/jevbench-v1\.7\.14-|lib/jevbench-v1714-release\.mjs$)')
for p in changed:
 if skip.match(p):continue
 def blob(rev,path,tag):
  f=td/(tag+'_'+path.replace('/','_'))
  try:f.write_bytes(show(rev,path))
  except subprocess.CalledProcessError:f.write_bytes(b'')
  return f
 a=delta(blob(oldbase,p,'ob'),blob(oldhead,p,'oh'),p)
 cur=W/p;nb=blob(new,p,'nb')
 b=delta(nb,cur if cur.exists() else td/'empty',p) if cur.exists() else ['-MISSING']
 if a!=b:bad.append(p+': v1.7.14 delta differs after restack')
now=subprocess.run(['git','status','--porcelain','--untracked-files=all'],capture_output=True,text=True).stdout.split('\n')
extra=[l[3:] for l in now if l and not skip.match(l[3:]) and l[3:] not in changed]
if extra:bad.append('files changed that v1.7.14 did not touch before: '+', '.join(extra))
out={'status':'FAIL' if bad else 'PASS','old_base':oldbase,'old_head':oldhead,'new_base':new,'problems':bad,'allowed_changes':notes,'files_compared':len(changed)}
pathlib.Path('r197/v1714/receipts/RESTACK-DIFF.json').write_text(json.dumps(out,indent=1,sort_keys=True)+'\n');print(json.dumps(out,indent=1))
sys.exit(1 if bad else 0)
PY
# cheap gates on the restacked tree
python3 -B "$J/check_repro_v1714.py" > "$J/receipts/restack-repro.log" 2>&1 || fail "repro"
node "$J/validate_v1714.mjs" > "$J/receipts/restack-validator.log" 2>&1 || fail "validator"
python3 -B "$J/check_source_v1714.py" "$NEW" > "$J/receipts/restack-source.log" 2>&1 || fail "source/carry vs new base"
python3 -B "$J/check_public_text_v1714.py" > "$J/receipts/restack-public-text.log" 2>&1 || fail "public text"
python3 -B "$J/check_pricing_reference_v1714.py" > "$J/receipts/restack-pricing.log" 2>&1 || fail "pricing"
timeout 300 python3 -B "$J/check_raw_v1714.py" > "$J/receipts/restack-raw.log" 2>&1 || fail "raw binding"
timeout 900 node --test --test-concurrency=2 test/jevbench-v1714-release.test.mjs test/jevbench-v1713-release.test.mjs > "$J/receipts/restack-release-tests.log" 2>&1 || fail "release tests"
python3 - "$J" "$NEW" "$OLDHEAD" "$BACKUP" <<'PY'
import json,pathlib,sys
j,new,old,backup=sys.argv[1:5];r=pathlib.Path(j)/'receipts';d=json.loads((r/'RESTACK-DIFF.json').read_text())
d.update(gates={n:(r/f'restack-{n}.log').read_text().strip().splitlines()[-1][:300] for n in ['repro','validator','source','public-text','pricing','raw']}|{'release-tests':[l for l in (r/'restack-release-tests.log').read_text().splitlines() if l.startswith(('# pass','# fail'))]},backup_branch=backup)
(r/'RESTACK.json').write_text(json.dumps(d,indent=1,sort_keys=True)+'\n')
PY
grep -q "^# fail 0" "$J/receipts/restack-release-tests.log" || fail "release tests failed"
trap - EXIT
if [ $COMMIT -eq 1 ]; then
  git add -A r197/v1714 test/jevbench-v1714-release.test.mjs test/fixtures/jevbench-v1714-ranks.json lib app components data test
  git commit -q -m "JevBench v1.7.14: restack onto ${NEW:0:8} (v1.7.13 PASS); only predecessor hashes changed — review PENDING

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  echo "RESTACK PASS: $(git rev-parse --short HEAD) on ${NEW:0:8}; old HEAD kept as $BACKUP"
else
  echo "RESTACK PASS (not committed): tree on ${NEW:0:8}; old HEAD kept as $BACKUP"
fi
