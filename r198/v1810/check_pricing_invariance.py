"""Prove the 2f52370f -> 1b3c52fb pricing re-freeze (installed 12 Nov 2026 15:06Z) adds exactly the two launch list-price keys subq-snap-1.2 and
gemini-decision-1 plus comments, so no carried row's pricing path can change (precedent: r198/v187/check_pricing_invariance.py, the Nemotron
re-freeze 455ee38b -> 2f52370f). Binds the release owner's equivalence sweep receipt (PRICING-EQUIV-R278.json, PASS: 1,470 files, 48,247 entries,
0 behaviour diffs) and checks that the v1.8.10 proof pins the new module while v1.8.9 keeps the old one as its historical provenance."""
import difflib, hashlib, importlib.util, json, pathlib
J = pathlib.Path(__file__).resolve().parent; W = J.parents[1]
OLD = pathlib.Path('/home/flori/jobs/jevbench-v15-measure-20260925/review/pricing_v15.before-r278-refreeze.py')
NEW = pathlib.Path('/home/flori/jobs/jevbench-v15-measure-20260925/harness/pricing_v15.py')
R = pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919/r278/receipts')
OLD_SHA, NEW_SHA = '2f52370fe1dba73d75a770a386df350cc76a0898304aeba9e29c91f6e4d3738b', '1b3c52fbeb5543c44c5d2c093002c60b469e4356a7f96116fc4228a345bd10b2'
EQUIV_SHA = '33b2ed5c64fb434d8452df8977b85fba05c99e1dbf80a4efd7fad9280faa3784'
KEYS = {'subq-snap-1.2', 'gemini-decision-1'}
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(OLD) == OLD_SHA and sha(NEW) == NEW_SHA, 'installed/backup pricing module hashes'
a, b = OLD.read_text().splitlines(), NEW.read_text().splitlines()
removed = [l[2:] for l in difflib.ndiff(a, b) if l.startswith('- ')]
added = [l[2:] for l in difflib.ndiff(a, b) if l.startswith('+ ')]
non_comment = [l for l in added if not l.lstrip().startswith('#')]
assert len(removed) == 1 and removed[0].strip().endswith('"nvidia/nemotron-3.5-super-vl"}'), removed
assert [l.strip() for l in non_comment] == [removed[0].strip().replace('"nvidia/nemotron-3.5-super-vl"}', '"nvidia/nemotron-3.5-super-vl",'), '"subq-snap-1.2", "gemini-decision-1"}'], non_comment
def load(p, n):
    s = importlib.util.spec_from_file_location(n, p); m = importlib.util.module_from_spec(s); s.loader.exec_module(m); return m
mo, mn = load(OLD, 'pricing_old_r278'), load(NEW, 'pricing_new_r278')
names = sorted(n for n in vars(mn) if n.isupper())
changed = [n for n in names if getattr(mo, n, None) != getattr(mn, n)]
assert changed == ['LAUNCH_LIST_PRICE_API'], changed
assert mn.LAUNCH_LIST_PRICE_API - mo.LAUNCH_LIST_PRICE_API == KEYS and mo.LAUNCH_LIST_PRICE_API <= mn.LAUNCH_LIST_PRICE_API
funcs = sorted(n for n, v in vars(mn).items() if callable(v) and getattr(v, '__module__', None) == mn.__name__)
assert all(getattr(mo, n).__code__.co_code == getattr(mn, n).__code__.co_code for n in funcs), 'function bytecode differs'
assert mo.catalog_rates() == mn.catalog_rates()
V = W / 'data/raw/benchmarks/jevbench/v1.8'
prev = json.loads((V / 'jevbench-v1.8.9-results.json').read_text())['systems']
assert not KEYS & {s['key'] for s in prev}
touched = [s['key'] for s in prev if s['key'] in mn.LAUNCH_LIST_PRICE_API and s['key'] not in mo.LAUNCH_LIST_PRICE_API]
assert touched == []
eq = json.loads((R / 'PRICING-EQUIV-R278.json').read_text())
assert sha(R / 'PRICING-EQUIV-R278.json') == EQUIV_SHA and eq['PASS'] is True and eq['status'] == 'PASS' and eq['base_sha'] == OLD_SHA and eq['cand_sha'] == NEW_SHA
assert eq['behaviour_diffs'] == [] and eq['unexpected_behaviour_diffs'] == [] and eq['globals_differing'] == ['LAUNCH_LIST_PRICE_API'], eq['globals_differing']
p9 = json.loads((V / 'jevbench-v1.8.9-proof.json').read_text()); p10 = json.loads((V / 'jevbench-v1.8.10-proof.json').read_text())
assert p9['pricing_module_sha256'] == OLD_SHA and p10['pricing_module_sha256'] == NEW_SHA
assert p10['pricing_refreeze']['old_sha256'] == OLD_SHA and p10['pricing_refreeze']['new_sha256'] == NEW_SHA and p10['pricing_refreeze']['equivalence_receipt_sha256'] == EQUIV_SHA
rows10 = {s['key']: s for s in json.loads((V / 'jevbench-v1.8.10-results.json').read_text())['systems']}
# the carried rows' cost blocks are byte-identical to v1.8.9 (no pricing path moved)
assert all(rows10[s['key']]['cost'] == s['cost'] for s in prev)
json.dump({'status': 'PASS', 'old_sha256': OLD_SHA, 'new_sha256': NEW_SHA, 'changed_module_constants': changed, 'added_set_members': sorted(KEYS),
           'added_non_comment_lines': len(non_comment), 'functions_bytecode_equal': len(funcs), 'catalog_rates_equal': True, 'carried_rows_checked': len(prev),
           'carried_cost_blocks_equal': len(prev), 'carried_keys_whose_pricing_path_changes': touched, 'equivalence_receipt': {'name': 'PRICING-EQUIV-R278.json', 'sha256': EQUIV_SHA,
           'files_swept': len(eq['files_swept']), 'entries': eq['entries'], 'behaviour_diffs': 0}, 'proof_pricing_module_sha256': NEW_SHA, 'predecessor_proof_pricing_module_sha256': OLD_SHA},
          open(J / 'receipts/PRICING-INVARIANCE.json', 'w'), indent=1, sort_keys=True)
print('PASS pricing re-freeze 2f52370f -> 1b3c52fb adds two set members (subq-snap-1.2, gemini-decision-1) plus comments; %d functions byte-identical; %d carried cost blocks equal; equivalence receipt %s' % (len(funcs), len(prev), EQUIV_SHA[:8]))
