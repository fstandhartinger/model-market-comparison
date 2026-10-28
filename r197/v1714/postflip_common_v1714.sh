# Sourced by postflip_*_v1714.sh: swap the synthetic PASS files listed in .pass/SWAP-FILES.txt (v1.7.13 manifest with a synthetic
# PASS review; v1.7.14 proof/manifest re-bound to it with a synthetic PASS; patched v1.7.14 loader) into the worktree, and restore
# them byte-equal on exit. The synthetic PASS manifests confer no authority.
J=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd); W=$(cd "$J/../.." && pwd)
cd "$W"; python3 -B "$J/make_passtree_v1714.py" >/dev/null
mapfile -t FILES < <(grep -v '^-' "$J/.pass/SWAP-FILES.txt" | grep -v '^$')
grep -q '^-' "$J/.pass/SWAP-FILES.txt" && { echo "pass tree removes files; refusing"; exit 4; }
[ ${#FILES[@]} -ge 3 ] || { echo "unexpected swap list"; exit 4; }
BK=$(mktemp -d); before=$(sha256sum "${FILES[@]}")
for f in "${FILES[@]}"; do mkdir -p "$BK/$(dirname $f)"; cp "$f" "$BK/$f"; cp "$J/.pass/$f" "$f"; done
restore(){ for f in "${FILES[@]}"; do cp "$BK/$f" "$f"; done; after=$(sha256sum "${FILES[@]}"); rm -rf "$BK"; if [ "$before" == "$after" ]; then echo "restored byte-equal: ${FILES[*]}" >> "$LOG"; else echo "RESTORE MISMATCH" >> "$LOG"; exit 3; fi; }
