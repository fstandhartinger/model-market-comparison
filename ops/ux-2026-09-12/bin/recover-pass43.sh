#!/usr/bin/env bash
# Import the useful Pass 43 patch without its obsolete Fable screenshot helper, then open a PR.
set -Eeuo pipefail
STATE=$1
BIN=$(cd "$(dirname "$0")" && pwd)
ROOT=$(git -C "$BIN/../../.." rev-parse --show-toplevel)
WT_ROOT=/home/flori/wt
JOB=bh-ux-pass43-recovery-20260929
BRANCH=jobs/$JOB
WT=$WT_ROOT/$JOB
RUN_DIR=$STATE/runs/$JOB
COMMIT=f8cdd2c92d3dc246bf34b689e5581be0a20a5bc8
PARENT=468c291bfb7440ce0cacd556f48a6c64c39db322
TS=$(date -u +%Y%m%dT%H%M%SZ)
case "$ROOT/" in /opt/*) echo "recover-pass43: refusing deploy checkout" >&2; exit 70 ;; esac
case "$STATE/" in /opt/*) echo "recover-pass43: state must stay outside /opt" >&2; exit 70 ;; esac
[ ! -e "$WT" ] || { echo "recover-pass43: worktree already exists; inspect $WT" >&2; exit 73; }
[ ! -e "$STATE/pending-unit.json" ] || { echo "recover-pass43: another unit is pending" >&2; exit 73; }
mkdir -p "$RUN_DIR" "$STATE/history"
git -C "$ROOT" fetch --quiet origin main
git -C "$ROOT" cat-file -e "$COMMIT^{commit}"
[ "$(git -C "$ROOT" rev-parse "$COMMIT^")" = "$PARENT" ] || {
  echo "recover-pass43: saved source parent changed" >&2; exit 65;
}
CHANGED=$(git -C "$ROOT" diff-tree --no-commit-id --name-only -r "$COMMIT" | LC_ALL=C sort)
EXPECTED=$( { cat <<'EOF_PATHS'
app/models/[id]/page.tsx
components/BenchmarkSheet.tsx
components/BenchmarkSheetLazy.tsx
components/ModelDetailOffers.tsx
lib/benchmark-view.d.mts
lib/benchmark-view.mjs
ops/ux-2026-09-12/bin/shoot-fable-pass43.mjs
EOF_PATHS
} | LC_ALL=C sort )
if [ "$CHANGED" != "$EXPECTED" ]; then
  echo "recover-pass43: saved branch file set differs from the reviewed six product files plus obsolete helper" >&2
  exit 65
fi
CR_JSON=$(~/bin/bh-allocate-cr --owner "$JOB" --title "Recover useful Benchmark Heaven UX pass 43")
CR=$(python3 -c 'import json,sys; print(json.load(sys.stdin)["cr"])' <<< "$CR_JSON")
git -C "$ROOT" worktree add -b "$BRANCH" "$WT" origin/main
BASE=$(git -C "$WT" rev-parse HEAD)
echo "$$ work deterministic-recovery $TS" > "$STATE/running"
cleanup() {
  if [ -f "$STATE/running" ] && [ "$(awk '{print $1}' "$STATE/running")" = "$$" ]; then
    rm -f "$STATE/running"
  fi
}
trap cleanup EXIT
python3 - "$STATE/pending-unit.json" "$JOB" "$BRANCH" "$WT" "$CR" "$BASE" <<'PY_PENDING'
import datetime, json, os, sys, tempfile
path, job, branch, wt, cr, base = sys.argv[1:]
row = {
    "job": job, "branch": branch, "worktree": wt, "cr": cr,
    "engine": "deterministic recovery", "role": "work", "base": base,
    "started_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
}
fd, tmp = tempfile.mkstemp(dir=os.path.dirname(path), prefix=".pending-unit.")
with os.fdopen(fd, "w") as f:
    json.dump(row, f, sort_keys=True)
    f.write("\n")
os.replace(tmp, path)
PY_PENDING
PATCH=$RUN_DIR/pass43-product.patch
git -C "$ROOT" diff "$PARENT" "$COMMIT" -- \
  "app/models/[id]/page.tsx" \
  components/BenchmarkSheet.tsx \
  components/BenchmarkSheetLazy.tsx \
  components/ModelDetailOffers.tsx \
  lib/benchmark-view.d.mts \
  lib/benchmark-view.mjs > "$PATCH"
git -C "$WT" apply --3way --index "$PATCH"
python3 - "$WT/components/ModelDetailOffers.tsx" <<'PY_COPY'
import pathlib, sys
path = pathlib.Path(sys.argv[1])
text = path.read_text()
old = '{counted(hidden.priced.length, "provider")} {hidden.priced.length === 1 ? "prices" : "price"} this model, outside the active global filters (providers, regions, confidentiality). Change them under Options.'
new = '{hidden.priced.length === 1 ? "One priced offer falls" : String(hidden.priced.length) + " priced offers fall"} outside the active global filters (providers, regions, confidentiality). Change them under Options.'
if old not in text:
    raise SystemExit("the reviewed hidden-price sentence changed; manual review required")
path.write_text(text.replace(old, new, 1))
PY_COPY
python3 - "$WT/ops/ux-2026-09-12/PROGRESS.md" "$CR" <<'PY_PROGRESS'
import pathlib, sys
path = pathlib.Path(sys.argv[1])
cr = sys.argv[2]
lines = path.read_text().splitlines()
found = False
for i, line in enumerate(lines):
    if line.startswith("| D257 (new) |"):
        old = "| **open — for the design authority** |"
        new = f"| **in-progress — implementation in {cr} PR; pending merged live verification** |"
        if old not in line:
            raise SystemExit("D257 row no longer has the expected open status; manual review required")
        line = line.replace(old, new, 1)
        line += " Recovery source: saved Pass 43 commit f8cdd2c9; screenshot helper excluded because it writes evidence under /opt and depends on retired Fable."
        lines[i] = line
        found = True
        break
if not found:
    raise SystemExit("D257 row not found")
path.write_text("\n".join(lines) + "\n")
PY_PROGRESS
git -C "$WT" diff --check
git -C "$WT" add -- \
  "app/models/[id]/page.tsx" \
  components/BenchmarkSheet.tsx \
  components/BenchmarkSheetLazy.tsx \
  components/ModelDetailOffers.tsx \
  lib/benchmark-view.d.mts \
  lib/benchmark-view.mjs \
  ops/ux-2026-09-12/PROGRESS.md
git -C "$WT" commit -m "$CR: recover useful UX pass 43 changes" \
  -m "Co-Authored-By: Codex GPT-6 Luna (Benchmark Heaven UX workstream) <noreply@openai.com>"
git -C "$WT" push -u origin "$BRANCH"
cat > "$RUN_DIR/PR-BODY.md" <<EOF_BODY
## Change

$CR recovers the six useful product files from saved Pass 43:
- model variant links fall back to the remaining family route;
- priced model offers excluded by the confidentiality default are explained;
- dated composite snapshot axes are excluded from registered and missing benchmark counts.

The one-off Fable screenshot helper was excluded because it writes evidence under the deploy checkout and uses the retired engine. D257 is marked in progress; it still needs post-merge live verification by a different engine.

## Checks

- git diff --check passed.
- No local test suite was run. The serialized merge queue runs required gates.
- Full /jev-models structure, wrapper placement, and benchmark ranking were not changed by this recovery.
- This PR has not been marked merge-ready. Owner review is required first.
EOF_BODY
PR_JSON=$(~/bin/bh-pr open --head "$BRANCH" --title "$CR: recover useful UX pass 43 changes" \
  --body-file "$RUN_DIR/PR-BODY.md")
python3 - "$STATE/pending-pr.json" "$PR_JSON" "$JOB" "$BRANCH" "$CR" "$WT" <<'PY_PR'
import datetime, json, os, sys, tempfile
path, pr_text, job, branch, cr, wt = sys.argv[1:]
pr = json.loads(pr_text)
row = {
    "number": pr["number"], "url": pr["url"], "state": "OPEN",
    "job": job, "branch": branch, "cr": cr, "worktree": wt,
    "engine": "deterministic recovery", "opened_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
}
fd, tmp = tempfile.mkstemp(dir=os.path.dirname(path), prefix=".pending-pr.")
with os.fdopen(fd, "w") as f:
    json.dump(row, f, sort_keys=True)
    f.write("\n")
os.replace(tmp, path)
PY_PR
printf '%s work recovery-deterministic rc=0\n' "$TS" >> "$STATE/history.log"
rm -f "$STATE/pending-unit.json"
echo "PR $PR_JSON"
