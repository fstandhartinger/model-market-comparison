"""Evidence for the five-row field: (1) G_med choice — re-score (share, B=0) with the fixed reference G_med and with the field's own
median; (2) cohort independence — each row scored alone (fixed G_med) must give the same point values as in the five-row field and
as the published share output. Aggregates only."""
import json, os, pathlib, sys
os.environ['JEV_NOUL_METHOD'] = 'O1S'
sys.path.insert(0, '/home/flori/jobs/jevbench-add-requests-20260919/r160/scorer')
import score_v17 as S
F = pathlib.Path(sys.argv[1]); D = pathlib.Path('/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261027'); GREF = 2.573387642438244
reg = json.loads((F / 'REGISTRY.json').read_text()); keys = sorted(reg)
rows = {k: S.V.read_rows(F / 'runs' / f'{k}.jsonl') for k in keys}; gold = S.V.load_gold(D / 'frozen/gold.jsonl')
S.CONFIG.update(limit=10.0, treatment='share')
pick = lambda s: dict(gap=s['intelligence']['gap'], penalty=s['intelligence']['penalty'], axes=s['axes'], scores=s['scores'], capability=s['capability'])
def run(reg_, g):
    S.STATS.clear(); r = S.score_release(gold, reg_, {k: rows[k] for k in reg_}, B=0, seed=16, workers=1, g_med_fixed=g)
    return r['G_med'], {s['key']: pick(s) for s in r['systems']}
out = {}
for name, g in [('reference_fixed', GREF), ('own_field_median', None)]:
    gm, by = run(reg, g); out[name] = dict(G_med=gm, rows=by)
solo = {k: run({k: reg[k]}, GREF)[1][k] for k in keys}
pub = {k: pick(json.loads((F / 'out-v17-share' / f'{k}.json').read_text())) for k in keys}
pv = lambda x: {k: (v['axes'], v['scores'], v['capability']) for k, v in x.items()}
out['solo_reference_fixed'] = solo
out['cohort_independent'] = pv(solo) == pv(out['reference_fixed']['rows']) == pv(pub)
out['own_median_point_values_identical'] = pv(out['own_field_median']['rows']) == pv(out['reference_fixed']['rows'])
out['penalties_reference_fixed'] = {k: v['penalty'] for k, v in out['reference_fixed']['rows'].items()}
out['penalties_own_field_median'] = {k: v['penalty'] for k, v in out['own_field_median']['rows'].items()}
print(json.dumps({k: out[k] for k in ['cohort_independent', 'own_median_point_values_identical', 'penalties_reference_fixed', 'penalties_own_field_median']} | {'own_G_med': out['own_field_median']['G_med'], 'gaps': {k: v['gap'] for k, v in out['reference_fixed']['rows'].items()}}, indent=1))
(F.parent / 'GMED-CHECK.json').write_text(json.dumps(out, indent=1, sort_keys=True) + '\n')
assert out['cohort_independent'], 'cohort dependence'
