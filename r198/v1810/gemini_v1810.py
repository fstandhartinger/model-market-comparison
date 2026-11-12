"""v1.8.10 combined candidate: ONE added hosted-API row on the 27 Oct 2026 draw, Gemini Decision 1 (Google), built from pinned aggregate inputs.

Inputs (byte copies in inputs/gemini/, pinned by sha256; the intake originals must still match when present):
  scored.json   the frozen scorer's row (score_v17 6363458d, view v1.8.8-share, O1S, B 1000, seed 16, G_med 2.5734, d1027, common cost basis 1,489)
  cells.json    the frozen category tool's cells for that row (families / use cases / languages; no topic labels exist on this draw)
  REGISTRY.json the intake registry entry (identity only; its free-text base model is never used for pricing)
  decisive.json the frozen Noul decisive-rate tool's aggregate for that row (decisive_v16 80b9ccf4 over the same scored raw, O1S; as v1.8.8's rows)
The row is a d1027 row like decide-1.1 (template): published = measured (kept in published_scores), shown as measured + the draw's anchor offset,
ranked, API board only. Cost = the scorer's own cost block (Google list price USD 0.10/M input, output free, x API-reported usage), numbers
byte-equal to the scored row; only the public basis text and the presentation kind ('tariff' = public list price, as decide-1.1) are set here.
No sealed byte is read here: every number comes from the pinned aggregates."""
import hashlib, json, pathlib, copy
J = pathlib.Path(__file__).resolve().parent
G = J / 'inputs/gemini'
GK = 'gemini-decision-1'
L = lambda p: json.loads(pathlib.Path(p).read_text())
sha = lambda p: hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
PINS = {'scored.json': 'd9fd871f2cd5c940f496fa088c6f0a1bef53fdb199fe154fc279e72d212422e8',
        'cells.json': '38454c3b3b98975a0c487cb292a2db6baca9e60efac76475a4744a06d48ad404',
        'REGISTRY.json': '61646b81eaa73e6a59639b7269002009291557dba5d25d0329d8cbab8ea46d5c',
        'decisive.json': '6931cc1f29324ea0295781ea50224a4b17b043e333d1926234854a8ca9b80b91'}
ORIG = pathlib.Path('/home/flori/jobs/jevbench-auto-intake/r66-gemini/private-score')
ORIG_FILES = {'scored.json': ORIG / 'out-v17-share/gemini-decision-1.json', 'cells.json': ORIG / 'cells/categories.json', 'REGISTRY.json': ORIG / 'REGISTRY.json',
              'decisive.json': pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919/r278/gemini-decisive/decisive.json')}
SCORER_RESULTS_SHA = '2a8a451e33ce89ccae2d7abf8c30d3832850127f27169185791c65ab4b1fff79'   # the scorer's jevbench-v1.6.0-results.json (out-v17-share.log)
# Pricing re-freeze 2f52370f -> 1b3c52fb (adds exactly subq-snap-1.2 and gemini-decision-1 to the launch list-price set), installed 12 Nov 2026 15:06Z.
PRICING_OLD = '2f52370fe1dba73d75a770a386df350cc76a0898304aeba9e29c91f6e4d3738b'
PRICING_NEW = '1b3c52fbeb5543c44c5d2c093002c60b469e4356a7f96116fc4228a345bd10b2'
R278 = pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919/r278/receipts')
RESOLVE_PROOF_SHA = '5236c97280290bca4d14386143338b43cbc605daeb42bdcd8ba9390da5c44ba6'
EQUIV_SHA = '33b2ed5c64fb434d8452df8977b85fba05c99e1dbf80a4efd7fad9280faa3784'
INSTALL_SHA = '7628da922e7fe23a3802eeaa46ff435afc15dc2a9f7e9a905b783dad5492daaa'
for n, h in PINS.items():
    assert sha(G / n) == h, ('GEMINI INPUT HASH MISMATCH', n)
    if ORIG_FILES[n].exists(): assert sha(ORIG_FILES[n]) == h, ('intake original differs from the pinned copy', n)
scored, cells, registry = L(G / 'scored.json'), L(G / 'cells.json'), L(G / 'REGISTRY.json')
ND = L(G / 'decisive.json')[GK]
NOUL_DECISIVE = {f: ND[f] for f in ['acc_among_decisive', 'decisive', 'decisive_rate', 'n', 'supported', 'valid']}
# consistent with the scorer's own aggregates: 375 yes/no items, 373 valid (2 transport failures), 62 unsure answers = the calibration abstentions, 305 correct
assert NOUL_DECISIVE['supported'] is True and NOUL_DECISIVE['n'] == scored['v16']['per_type']['noul']['n'] == 375 and NOUL_DECISIVE['valid'] == scored['calibration']['parts']['noul']['n'] == 373
assert round(373 * scored['calibration']['parts']['noul']['abstention_rate']) == 373 - NOUL_DECISIVE['decisive'] and round(NOUL_DECISIVE['acc_among_decisive'] * NOUL_DECISIVE['decisive']) == round(scored['v16']['per_type']['noul']['accuracy'] * 375) == 305
assert list(registry) == [GK] and registry[GK]['display'] == 'Gemini Decision 1' and registry[GK]['author'] == 'Google' and registry[GK]['lane'] == 'api'
assert scored['key'] == GK and scored['api_flag'] is True and scored['endpoint_kind'] == 'api' and scored['speed']['adjustment'] == 'none (API)'
assert scored['v16']['n_items'] == 1500 and scored['v16']['g_med_used'] == 2.573387642438244 and scored['v16']['equating_offset'] is None
assert scored['status'] == {'answered_ok': 1497, 'missing': 0, 'rows': 1500, 'status': 'complete'} and scored['decision_limit']['limit_s'] == 10.0 and scored['decision_limit']['treatment'] == 'share'
assert list(cells['systems']) == [GK] and cells['source_results_sha256'] == SCORER_RESULTS_SHA and cells['revision'] == 'v1.8.8-share'
# ---- cost: the scored row's cost block, numbers byte-equal; the lead re-scores after the pricing install and compares (gate below)
COST_NUMBERS = {'common_basis': {'n_items': 1489, 'rule': 'common', 'usd_per_1000_all_items': 0.06472946666666668}, 'usage_estimated_rows': 0, 'usd_per_1000': 0.03825775688381464}
assert {k: scored['cost'][k] for k in COST_NUMBERS} == COST_NUMBERS and scored['cost']['kind'] == 'list'
assert json.dumps({k: scored['cost'][k] for k in COST_NUMBERS}, sort_keys=True) == json.dumps(COST_NUMBERS, sort_keys=True)
if (R278 / 'RESOLVE-PROOF-R278.json').exists():
    assert sha(R278 / 'RESOLVE-PROOF-R278.json') == RESOLVE_PROOF_SHA
    rp = L(R278 / 'RESOLVE-PROOF-R278.json')[GK]
    assert rp['scorer_cost_block'] == scored['cost'] and rp['cand_with_source_api']['usd_per_1000'] == COST_NUMBERS['common_basis']['usd_per_1000_all_items']
    assert rp['rows'] == 1500 and rp['output_tokens'] == 0 and rp['input_tokens'] == 970942 and rp['served'] == [GK] and rp['cand_with_source_api']['counting_list_price'] is True
    assert sha(R278 / 'PRICING-EQUIV-R278.json') == EQUIV_SHA and sha(R278 / 'INSTALL-R278.json') == INSTALL_SHA
INPUT_TOKENS_ALL = 970942
assert abs(1000 * INPUT_TOKENS_ALL * 0.10 / 1e6 / 1500 - COST_NUMBERS['common_basis']['usd_per_1000_all_items']) < 1e-15
# ---- accuracy under the frozen yes/no rule (aggregates of the scored row): choice + score + yes/no, each item once
PT = scored['v16']['per_type']
assert {t: PT[t]['n'] for t in PT} == {'choice': 750, 'noul': 375, 'score': 375}
correct = {t: round(PT[t]['accuracy'] * PT[t]['n'], 6) for t in PT}
assert all(abs(c - round(c)) < 1e-6 for c in correct.values()), correct
ACC = sum(round(c) for c in correct.values()) / 1500
ACC_TXT = f'{100 * ACC:.1f}'
assert ACC_TXT == '86.3', ('STOP: accuracy under the yes/no rule is not 86.3', ACC)
P50, P95 = scored['speed']['p50_s_raw'], scored['speed']['p95_s_raw']
assert (f'{P50:.3f}', f'{P95:.3f}') == ('0.234', '0.421') and scored['decision_limit']['n_over_limit'] == 0
CAL_N = sum(scored['calibration']['parts'][t]['n'] for t in ['choice', 'noul', 'score'])
assert CAL_N == 1497 and scored['validity']['choice']['n'] == 750
FAILED = 1500 - scored['status']['answered_ok']
assert FAILED == 3
# ---- public texts (reviewed wording; the self-reported sentence is the lead's binding text of 12 Nov 2026)
SELF_REPORT = ('Google reports 92.2 % (self-reported; accuracy on the 231 public v1.2 items, vendor-run; none of those items is in this draw). '
               f'Our accuracy on all 1,500 items of the 27 Oct draw: {ACC_TXT} % (a yes/no answer between 20 % and 80 % counts as unsure, i.e. wrong).')
IMAGE_LABEL = 'ImageJevBench: requested, no date.'
DISPLAY, AUTHOR, LICENCE = 'Gemini Decision 1', 'Google', 'Proprietary hosted API (no weights published)'
ENDPOINT = ("Google's Gemini API (Decisions API v1beta, paid tier), model id gemini-decision-1, request-pinned (the API returns no model field). "
            'Measured on 11 Nov 2026: all 1,500 items of the 27 Oct 2026 draw, one item per request, with Google\'s native probabilities; '
            f'latency measured from our server in Germany, network time included (p50 {P50:.3f} s, p95 {P95:.3f} s; no request over 10 s).')
DISCLOSURE = ('FIRST MEASUREMENT on the 27 Oct 2026 draw: all 1,500 items (1,200 sealed and 300 public), one item per request, with Google\'s native '
              'probabilities for the choice, yes/no and score questions; model id gemini-decision-1, request-pinned. '
              f'{FAILED} of 1,500 requests failed in transport (one HTTP 503, two network errors) and count as wrong answers; Calibration is computed on the '
              f'{CAL_N:,} answered items, as for every row with failed requests. No refusals. Latency was measured from our server in Germany. '
              'SELF-REPORTED FIGURE: ' + SELF_REPORT + ' ' + IMAGE_LABEL)
COST_BASIS = ('Google list price USD 0.10 per 1M input tokens, output free (Gemini API paid tier; free tier, batch and caching not counted), times API-reported usage; '
              f'launch list price counted from day 1; frozen pricing {PRICING_NEW[:8]}, page re-fetched 12 Nov 2026 15:06Z. '
              f'USD {COST_NUMBERS["usd_per_1000"]:.7f} per 1,000 decisions on the frozen 1,489-item common set of this draw '
              f'(USD {COST_NUMBERS["common_basis"]["usd_per_1000_all_items"]:.7f} over all 1,500 items); the {FAILED} failed requests count as zero-token items.')
BASE_MODEL = {'label': 'undisclosed (closed, hosted only)', 'note': 'Google does not disclose a base model for this hosted API.', 'sources': [], 'status': 'undisclosed'}
ARCHITECTURE = {'arch': 'closed-api', 'badges': {'derivation': None, 'params': None, 'quant': None},
                'evidence': [{'kind': 'provider-docs', 'url': 'https://ai.google.dev/api/decisions', 'fact': 'Hosted Gemini Decision 1 API (Gemini API, model id gemini-decision-1); no base model or weights disclosed.'}],
                'note': 'Hosting implementation and deployed weights were not independently inspected.'}
BOUNDS = {GK: {'usecases': {x['key']: x['n'] for x in cells['usecases']}, 'languages': {x['key']: x['n'] for x in cells['languages']}, 'topics': {}}}
CELLS = cells['systems'][GK]
assert sorted(CELLS) == ['families', 'languages', 'usecases'] and 'topics' not in CELLS
for dim in ['usecases', 'languages']:
    for c, x in CELLS[dim].items(): assert isinstance(x['n'], int) and 1 <= x['n'] <= BOUNDS[GK][dim][c] and isinstance(x['competence'], float), (dim, c)


def measured_row(draw_template, measured_on='2026-11-11', release='v1.8.10'):
    """The scored row with its public identity and texts; numbers untouched (equating happens in build_v1810.py with the same rule as every d1027 row)."""
    s = copy.deepcopy(scored)
    s.pop('not_ranked_because', None)
    s.update(display=DISPLAY, author=AUTHOR, licence=LICENCE, repo=None, model_pin=None, endpoint_condition=ENDPOINT, disclosure=DISCLOSURE, underlying=DISCLOSURE,
             method='v1.7', new_in=release, measured_in=release, last_measured_on=measured_on, measurement_date_status='measured', paid_fast_lane=False,
             noul_decisive=copy.deepcopy(NOUL_DECISIVE), self_reported=SELF_REPORT)
    s['cost'] = {**copy.deepcopy(scored['cost']), 'basis': COST_BASIS, 'kind': 'tariff'}
    s['draw'] = {**{f: draw_template[f] for f in ['id', 'label', 'drawn_on']}, 'release': release, 'measured_on': measured_on, 'g_med': 2.573387642438244, 'results_sha256': SCORER_RESULTS_SHA}
    return s


def cost_gate(row):
    """The embedded cost block equals the scored row's cost block except the public basis text and the presentation kind."""
    assert {k: v for k, v in row['cost'].items() if k not in ('basis', 'kind')} == {k: v for k, v in scored['cost'].items() if k not in ('basis', 'kind')}
    assert json.dumps({k: row['cost'][k] for k in COST_NUMBERS}, sort_keys=True) == json.dumps({k: scored['cost'][k] for k in COST_NUMBERS}, sort_keys=True)
    assert row['cost']['kind'] == 'tariff' and row['cost']['basis'] == COST_BASIS
    return True


# F5 (delta fairness review r278-delta-fair): the provenance peers carry (v1.8.7 Nemotron entry). raw = sha256 of the sealed raw run the scorer read
# (runs-auto-intake gemini-decision-1 attempt 2); cost basis = the 27 Oct draw's common-set cost basis every d1027 row carries; common input tokens
# reproduce the scorer's usd_per_1000 exactly at USD 0.10/M input over the 1,489-item common set (asserted below).
RAW_SHA256 = 'd68c7d967d700cdfffceb78cc2385efcc068eafbc66359dfaffacb3247f610b0'
COST_BASIS_SHA256 = 'b83bdfd14c263ffacfa572b304084154afca84c1f00083101a33783ae6f8b356'
INPUT_TOKENS_COMMON = 569658
def proof_entry(row):
    assert abs(1000 * INPUT_TOKENS_COMMON * 0.10 / 1e6 / 1489 - COST_NUMBERS['usd_per_1000']) < 1e-12, 'common input tokens must reproduce the scorer cost'
    return {'scored_input_sha256': PINS['scored.json'], 'raw_sha256': RAW_SHA256, 'scorer_results_sha256': SCORER_RESULTS_SHA, 'cells_sha256': PINS['cells.json'], 'registry_sha256': PINS['REGISTRY.json'],
            'published': row['published_scores'], 'equated': {'axes': row['axes'], 'scores': row['scores'], 'capability': row['capability']}, 'ranks': row['ranks'], 'treatment': 'ranked',
            'composite_ci95': row['composite_ci95'], 'decision_limit': row['decision_limit'], 'model_pin': None, 'served_model': 'request-pinned (the API returns no model field)',
            'failure_treatment': f'{FAILED} transport failures (one HTTP 503, two network errors) are wrong for Intelligence and excluded from Calibration by the frozen scorer',
            'answered_n': scored['status']['answered_ok'], 'scored_n': 1500, 'accuracy_yesno_rule': round(100 * ACC, 4),
            'cost': {**COST_NUMBERS, 'kind_scored': scored['cost']['kind'], 'kind_shown': 'tariff', 'input_tokens_all': INPUT_TOKENS_ALL, 'output_tokens_all': 0, 'rate_in_usd_per_m': 0.10, 'rate_out_usd_per_m': 0.0,
                     'zero_token_failed_items_in_common_set': FAILED, 'input_tokens_common': INPUT_TOKENS_COMMON, 'cost_basis_sha256': COST_BASIS_SHA256, 'pricing_module_sha256': PRICING_NEW, 'resolve_proof_sha256': RESOLVE_PROOF_SHA,
                     'resolve_entry': {'source': 'api', 'base_model': None}, 'note': 'scorer common-membership usd_per_1000 (same rule as every d1027 row); the failed items count as zero-token items in the 1,489 denominator'},
            'category_pool_bounds': BOUNDS[GK], 'image_label': IMAGE_LABEL}
