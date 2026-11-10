#!/usr/bin/env python3
"""Run on LeChonk after the synthetic production build, before preview capture."""
from pathlib import Path
import hashlib, json, sys

W = Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve()
J = W / 'r198/v188'
R = J / 'receipts'
paths_receipt = json.loads((R / 'SOURCE-BINDING-PATHS.json').read_text())
build = json.loads((R / 'BUILD-POSTFLIP-EXIT.json').read_text())
assert build['exit_code'] == 0, 'full production build did not exit 0'
paths = paths_receipt['paths']
missing = [p for p in paths if not (W / p).is_file()]
assert not missing, missing
bound = {p: hashlib.sha256((W / p).read_bytes()).hexdigest() for p in paths}
out = {'status': 'PASS', 'phase': 'after full production build before capture/cleanup',
       'source_files': len(paths), 'paths_sha256': hashlib.sha256((R / 'SOURCE-BINDING-PATHS.json').read_bytes()).hexdigest(),
       'paths': bound, 'build_exit_code': 0}
(R / 'REMOTE-SOURCE-BINDING.json').write_text(json.dumps(out, indent=1, sort_keys=True) + '\n')
print('PASS LeChonk source binding:', len(paths), 'public sources and derived artifacts hashed after production build')
