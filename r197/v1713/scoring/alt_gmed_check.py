"""Evidence: G_med choice for the one-row cohort. Re-score (share, B=0) with no fixed G_med (= own gap, r99 rule) and compare point values."""
import json, os, pathlib, sys
os.environ['JEV_NOUL_METHOD'] = 'O1S'
sys.path.insert(0, '/home/flori/jobs/jevbench-add-requests-20260919/r160/scorer')
import score_v17 as S
F = pathlib.Path(sys.argv[1]); D = pathlib.Path('/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261027')
reg = json.loads((F / 'REGISTRY.json').read_text()); k = next(iter(reg))
rows = S.V.read_rows(F / 'runs' / f'{k}.jsonl'); gold = S.V.load_gold(D / 'frozen/gold.jsonl')
S.CONFIG.update(limit=10.0, treatment='share')
out = {}
for name, g in [('reference_fixed', 2.573387642438244), ('own_field_median', None)]:
    S.STATS.clear()
    r = S.score_release(gold, reg, {k: rows}, B=0, seed=16, workers=1, g_med_fixed=g)
    s = r['systems'][0]
    out[name] = dict(G_med=r['G_med'], gap=s['intelligence']['gap'], excess=s['intelligence']['excess'], penalty=s['intelligence']['penalty'], axes=s['axes'], scores=s['scores'], capability=s['capability'])
pub = json.loads((F / 'out-v17-share' / f'{k}.json').read_text())
same = out['reference_fixed']['axes'] == out['own_field_median']['axes'] == pub['axes'] and out['reference_fixed']['scores'] == out['own_field_median']['scores'] == pub['scores']
out['point_values_identical_and_match_published_share'] = same
print(json.dumps(out, indent=1)); (F.parent / 'GMED-CHECK.json').write_text(json.dumps(out, indent=1, sort_keys=True) + '\n')
