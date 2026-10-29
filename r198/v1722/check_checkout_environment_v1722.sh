#!/bin/bash
# Red/green reproduction of the existing checkout test in an isolated heavy-run snapshot.
# No full-suite rerun; no test changes; temporary Git fixture has no remote or publication authority.
set -euo pipefail
[[ $(pwd -P) == /srv/heavy/jobs/*/work ]] || { echo 'Refused: this harness requires a disposable heavy-run snapshot' >&2; exit 3; }
R=r198/v1722/receipts
[[ $(sha256sum test/daily-clean-checkout-wait.test.mjs | cut -d' ' -f1) == 95295651053affc19c31858d5fe70962a308edb276cfda75d45c7c6872e5e05b ]]
git init -q
set +e
node --test --test-reporter=tap test/daily-clean-checkout-wait.test.mjs > "$R/git-env-red.log" 2>&1
red_rc=$?
set -e
[ "$red_rc" -ne 0 ]
python3 - <<'PY'
from pathlib import Path
s=Path('r198/v1722/receipts/git-env-red.log').read_text();assert 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER' in s;assert '# fail 1' in s
PY
git status --porcelain=v1 --untracked-files=all | wc -c > "$R/git-env-before-bytes.txt"
# A real checkout has a tracked HEAD. Preserve that property in this disposable offline fixture.
git add -A
git -c user.name='JevBench test snapshot' -c user.email='snapshot@invalid.example' -c commit.gpgsign=false commit -qm 'Track the isolated test snapshot'
git status --porcelain=v1 --untracked-files=all | wc -c > "$R/git-env-after-bytes.txt"
node --test --test-reporter=tap test/daily-clean-checkout-wait.test.mjs > "$R/git-env-green.log" 2>&1
python3 - <<'PY'
import pathlib,json,hashlib
assert hashlib.sha256(pathlib.Path('test/daily-clean-checkout-wait.test.mjs').read_bytes()).hexdigest()=='95295651053affc19c31858d5fe70962a308edb276cfda75d45c7c6872e5e05b'
R=pathlib.Path('r198/v1722/receipts');before=int((R/'git-env-before-bytes.txt').read_text());after=int((R/'git-env-after-bytes.txt').read_text());assert before>1024*1024 and after<1024*1024
s=(R/'git-env-green.log').read_text();assert '# tests 2' in s and '# pass 2' in s and '# fail 0' in s
(R/'GIT-CHECKOUT-ENVIRONMENT.json').write_text(json.dumps({'status':'PASS','original_test_unchanged':True,'red_exact_error':'ERR_CHILD_PROCESS_STDIO_MAXBUFFER','red_tests':2,'red_failures':1,'git_status_bytes_before':before,'git_status_bytes_after':after,'fix':'temporary snapshot has a tracked HEAD, matching a real checkout','green_tests':2,'green_pass':2,'green_fail':0,'full_suite_rerun':False,'snapshot_commit_is_disposable':True},indent=1)+'\n')
print('PASS exact checkout-test failure reproduced; tracked snapshot baseline fixes stdout overflow; unchanged test 2/2 passes; no full-suite rerun')
PY
