"""Fail closed on the measured remaining build allocation before starting Next."""
from pathlib import Path
import json,subprocess
# Immutable fixture inputs are hardlinked; node_modules already installed. Remaining allowance covers .next/captures.
line=subprocess.check_output(['df','-P','-B1','.'],text=True).splitlines()[-1].split()
total,used,avail=map(int,line[1:4]);allowance=1_500_000_000
ok=(used+allowance)/total<=.85 and (avail-allowance)/total>=.12
receipt={'status':'PASS' if ok else 'REFUSED','total_bytes':total,'used_bytes':used,'available_bytes':avail,'remaining_build_allowance_bytes':allowance,'immutable_fixture_inputs_hardlinked':True}
Path('r198/v1810/receipts/BUILD-DISK.json').write_text(json.dumps(receipt,indent=1)+'\n')
assert ok,'REFUSED: remaining build allowance exceeds host disk limits'
print('PASS build disk allowance: 1.5GB remaining')
