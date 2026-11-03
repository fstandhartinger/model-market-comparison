"""Prove the 455ee38b -> 2f52370f pricing re-freeze touches only the nemotron key (so no carried row can move)."""
import difflib, hashlib, importlib.util, json, pathlib
J = pathlib.Path(__file__).resolve().parent; W = J.parents[1]
OLD = pathlib.Path('/home/flori/jobs/jevbench-v15-measure-20260925/review/pricing_v15.before-r227-refreeze.py')
NEW = pathlib.Path('/home/flori/jobs/jevbench-v15-measure-20260925/harness/pricing_v15.py')
KEY = 'nvidia/nemotron-3.5-super-vl'
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(OLD) == '455ee38b7070f2f076eec65d55c7bb2a69030c26c343c662ade2826f8afd6eaa' and sha(NEW) == '2f52370fe1dba73d75a770a386df350cc76a0898304aeba9e29c91f6e4d3738b'
a, b = OLD.read_text().splitlines(), NEW.read_text().splitlines()
removed = [l[2:] for l in difflib.ndiff(a, b) if l.startswith('- ')]
added = [l[2:] for l in difflib.ndiff(a, b) if l.startswith('+ ')]
assert len(removed) == 1 and 'LAUNCH_LIST_PRICE_API' not in removed[0] and removed[0].strip().endswith('"decide-1.1"}')
non_comment = [l for l in added if not l.lstrip().startswith('#')]
assert non_comment == [removed[0].replace('"decide-1.1"}', '"decide-1.1", "%s"}' % KEY)], non_comment
def load(p, n):
    s = importlib.util.spec_from_file_location(n, p); m = importlib.util.module_from_spec(s); s.loader.exec_module(m); return m
mo, mn = load(OLD, 'pricing_old'), load(NEW, 'pricing_new')
names = sorted(n for n in vars(mn) if n.isupper())
changed = [n for n in names if getattr(mo, n, None) != getattr(mn, n)]
assert changed == ['LAUNCH_LIST_PRICE_API'], changed
assert mn.LAUNCH_LIST_PRICE_API - mo.LAUNCH_LIST_PRICE_API == {KEY} and mo.LAUNCH_LIST_PRICE_API <= mn.LAUNCH_LIST_PRICE_API
cat_o, cat_n = mo.catalog_rates(), mn.catalog_rates()
assert cat_o == cat_n
carried = json.loads((W / 'data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.6-results.json').read_text())['systems']
assert KEY not in {s['key'] for s in carried}
# Every carried key resolves through identical module data; membership in the changed set is the only key-dependent difference.
touched = [s['key'] for s in carried if s['key'] in mn.LAUNCH_LIST_PRICE_API and s['key'] not in mo.LAUNCH_LIST_PRICE_API]
assert touched == []
json.dump({'status': 'PASS', 'old_sha256': sha(OLD), 'new_sha256': sha(NEW), 'changed_module_constants': changed,
           'added_set_member': KEY, 'added_non_comment_lines': 1, 'catalog_rates_equal': True, 'carried_rows_checked': len(carried),
           'carried_keys_whose_pricing_path_changes': touched}, open(J / 'receipts/PRICING-INVARIANCE.json', 'w'), indent=1, sort_keys=True)
print('PASS pricing re-freeze changes one set member (the new key) plus comments; %d carried keys untouched' % len(carried))
