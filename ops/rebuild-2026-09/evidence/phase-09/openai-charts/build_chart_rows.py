#!/usr/bin/env python3
"""CR-173 (openai-charts): candidate rows from the chart datasets embedded in OpenAI's
2026-09-22 GPT-6 Sol and Luna launch post (retained capture de4e8f71...).

Reads only retained bytes (sha256-checked), never executes page JavaScript. The page is a
Next.js RSC document; its payload is the concatenation of the string chunks passed to
self.__next_f.push([1, "..."]). Each chart is a JSON object {"dotcomConfig":{...},
"vegaLiteSpec":{... "data":{"values":[...]}}} inside that payload; its figure caption is a
separate RSC row referenced right after the chart.

Output: artifact JSON (candidate observations), extracts JSON (per-row verbatim datapoints,
chart titles/captions/section headings, Astra-post cross-check), both under the given dir.
Usage: python3 build_chart_rows.py OUT_DIR
"""
import gzip, hashlib, json, re, sys
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[5]
POST = 'https://openai.com/index/introducing-gpt-6-sol-and-luna/'
FILE = 'data/raw/benchmarks/daily-evidence/2026-09-22-gpt-6-sol-luna/de4e8f71186ee5dad44f.gz'
SHA = 'de4e8f71186ee5dad44f6d9924f7418c7c8e1dbf726340e464a37b58375c58f5'
RETRIEVED = '2026-09-22T18:36:59.118516+00:00'
PUBLISHED = '2026-09-22'
ASTRA_URL = 'https://web.archive.org/web/20260920053907id_/https://openai.com/index/gpt-6-astra/'
ASTRA_FILE = 'data/raw/benchmarks/daily-evidence/2026-09-26-openai-charts/28dd99f38f5b866d2586.gz'
ASTRA_SHA = '28dd99f38f5b866d258624acb06096052eb946e4299d22d2b515b66566eefa7a'
FOOTNOTE = ('Evaluations of GPT were performed in our research environment or via our API, which may provide '
            'slightly different output from production ChatGPT due to differences in the system prompts, tools '
            'available, etc.')

# linkId -> (score identity, cost identity, id slug, printed benchmark name from the figure caption)
CHARTS = {
    'automationbench': ('openai-automationbench::1.0.6', 'openai-automationbench-cost::1.0.6', 'automationbench-1-0-6', 'AutomationBench 1.0.6'),
    'agents-last-exam': ('openai-agents-last-exam::v1', 'openai-agents-last-exam-cost::v1', 'agents-last-exam-v1', "Agents’ Last Exam V1"),
    'deepswe': ('openai-deepswe-v1-1::1.1', 'openai-deepswe-v1-1-cost::1.1', 'deepswe-v1-1', 'DeepSWE 1.1'),
    'osworld': ('openai-osworld-2-offline::v2026.08.08', 'openai-osworld-2-offline-cost::v2026.08.08', 'osworld-2-offline', 'OSWorld 2.0'),
}
# Configurations already carried by CR-126 rows (retained unchanged; the chart point for them is skipped).
EXISTING = {
    ('openai-automationbench::1.0.6', 'gpt-6-sol::xhigh'), ('openai-automationbench-cost::1.0.6', 'gpt-6-sol::xhigh'),
    ('openai-agents-last-exam::v1', 'gpt-6-sol::max'), ('openai-deepswe-v1-1::1.1', 'gpt-6-sol::max'),
    ('openai-deepswe-v1-1::1.1', 'gpt-6-luna::max'), ('openai-osworld-2-offline::v2026.08.08', 'gpt-6-sol::xhigh'),
}
MODELS = {'GPT-6 Astra': 'gpt-6-astra', 'GPT-6 Sol': 'gpt-6-sol', 'GPT-6 Luna': 'gpt-6-luna'}
EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max']


def rsc(path, sha):
    raw = gzip.decompress((ROOT / path).read_bytes())
    assert hashlib.sha256(raw).hexdigest() == sha, path
    html = raw.decode('utf-8')
    buf = ''
    for chunk in re.findall(r'self\.__next_f\.push\((\[.*?\])\)</script>', html, flags=re.S):
        a = json.loads(chunk)
        if len(a) > 1 and isinstance(a[1], str):
            buf += a[1]
    return buf


def charts(buf):
    dec = json.JSONDecoder()
    for m in re.finditer(r'\{"dotcomConfig":', buf):
        obj, end = dec.raw_decode(buf, m.start())
        cid = re.search(r'"id":"(\w+)","data":$', buf[m.start() - 60:m.start()])
        yield m.start(), end, (cid.group(1) if cid else None), obj


def caption_after(buf, end):
    """The first figcaption row referenced after the chart, with its plain text and links."""
    for ref in re.finditer(r'"\$L?([0-9a-f]{1,3})"', buf[end:end + 400]):
        row = re.search(r'\n' + ref.group(1) + r':(\["\$","figcaption".*?)\n[0-9a-f]+:', buf, flags=re.S)
        if row:
            return ref.group(1), ''.join(re.findall(r'"value":"([^"]*)"', row.group(1))), re.findall(r'"uri":"([^"]*)"', row.group(1))
    raise SystemExit('no caption after chart')


def heading_before(buf, pos):
    hs = [(m.start(), m.group(1)) for m in re.finditer(r'"children":\["([^"]+)"\]\}\]\]\}\]\],"headlineTag":"h3"', buf[:pos])]
    return hs[-1][1]


def pct(score):
    return float(Decimal(str(score)) * 100)


def astra_post():
    buf = rsc(ASTRA_FILE, ASTRA_SHA)
    out = {}
    for _, _, _, obj in charts(buf):
        t = obj['vegaLiteSpec'].get('title')
        title = t.get('text') if isinstance(t, dict) else t
        vals = obj['vegaLiteSpec'].get('data', {}).get('values', []) if isinstance(obj['vegaLiteSpec'].get('data'), dict) else []
        key = {'AutomationBench': 'automationbench', 'Agents’ Last Exam': 'agents-last-exam',
               'OSWorld 2.0 · Offline': 'osworld', 'DeepSWE v1.1': 'deepswe'}.get(title)
        if not key:
            continue
        pts = {}
        for v in vals:
            name = v.get('model') or v.get('model_display')
            if name != 'GPT-6 Astra':
                continue
            eff = v['effort_display'].lower()
            is_cost = v.get('mode') == 'Cost' or v.get('x_metric') == 'api_cost_usd' or v.get('dataset') == 'api_cost_usd'
            if is_cost:
                pts[eff] = {'chart_title': title, 'datapoint': v}
        out[key] = pts
    return out


def main(outdir):
    buf = rsc(FILE, SHA)
    astra = astra_post()
    rows, extracts = [], []
    global NAMES
    NAMES = {e['id']: e['name'] for e in json.loads((ROOT / 'data/raw/benchmarks/registry.json').read_text())['entries']}
    for start, end, cid, obj in charts(buf):
        link = obj['dotcomConfig'].get('linkId')
        if link not in CHARTS:
            continue
        score_id, cost_id, slug, printed = CHARTS[link]
        title = obj['vegaLiteSpec']['title']['text']
        cap_row, caption, links = caption_after(buf, end)
        assert printed in caption, (link, caption)
        section = heading_before(buf, start)
        for v in obj['vegaLiteSpec']['data']['values']:
            fam = MODELS.get(v['model'])
            if not fam:
                continue  # competitors and predecessors: never ingested from this post
            assert v['modelLabel'] == v['model'] and v['effortLabel'] in EFFORTS
            eff = v['effortLabel']
            model_id = f'{fam}::{eff}'
            point = json.dumps(v, ensure_ascii=False, separators=(',', ':'))
            where = (f'Section "{section}", figure "{title}" (chart component id {cid}, dotcomConfig.linkId '
                     f'"{link}"; figure caption: "{caption}"). The chart\'s embedded Vega-Lite dataset '
                     f'vegaLiteSpec.data.values in the page\'s RSC payload (self.__next_f.push chunks), the entry with '
                     f'model "{v["model"]}" and effortLabel "{eff}"')
            astra_note = ''
            if fam == 'gpt-6-astra':
                ap = astra.get(link, {}).get(eff)
                if ap:
                    astra_note = (' Cross-check: OpenAI\'s earlier GPT-6 Astra launch post (2026-09-03; Wayback copy '
                                  f'{ASTRA_URL}, sha256 {ASTRA_SHA}) charts this Astra configuration in "{ap["chart_title"]}" as '
                                  + json.dumps(ap['datapoint'], ensure_ascii=False, separators=(',', ':'))
                                  + '. This row carries only the 2026-09-22 dataset value.')
                else:
                    astra_note = (' Cross-check: OpenAI\'s earlier GPT-6 Astra launch post (2026-09-03; Wayback copy '
                                  f'sha256 {ASTRA_SHA}) charts no Astra {eff} point for this benchmark. This row carries only the 2026-09-22 dataset value.')
            common = {
                'subject': {'source_id': f'{POST}#{link}/{v["model"]}/{eff}', 'name': v['model'], 'model_id': model_id,
                            'variant': eff, 'harness': None},
                'join_note': (f'The chart dataset labels this point with reasoning effort "{eff}" (effortLabel), and the catalog '
                              f'has that exact configuration, so the row joins {model_id} and never an effort alias.'),
            }
            def src(bid, field, extra):
                # The locator opens with the row (registry name + dataset entry) and the column ("under") it was read from,
                # the form every hand-ingested release-document row uses (test/self-reported-vendor.test.mjs).
                return {'url': POST, 'retrieved_at': RETRIEVED, 'published_at': PUBLISHED, 'sha256': SHA, 'file': FILE,
                        'locator': (f'Launch post, row "{NAMES[bid]}, chart dataset entry model {v["model"]} with effortLabel {eff}", '
                                    f'under "{field}"{extra}. {where}; exact datapoint: {point}')}
            if (score_id, model_id) not in EXISTING:
                rows.append({
                    'id': f'self-reported:{fam}-{eff}-openai-{slug}', 'benchmark_id': score_id, **common,
                    'value': pct(v['score']), 'unit': 'percent', 'basis': 'derived', 'source_basis': 'self_reported',
                    'derivation': {'formula': 'Chart dataset field "score" is a fraction (the chart formats it as a percentage); value = score x 100 in registry units (percent)',
                                   'inputs': [v['score']]},
                    'source': src(score_id, 'score', ' (a fraction; stored x100 in percent, see derivation)'),
                    'protocol': (f'Vendor-reported by OpenAI for {v["model"]} at {eff} reasoning effort on {printed} '
                                 f'(figure caption as quoted in the locator), taken from the exact dataset embedded in the '
                                 f'launch post\'s chart, not read off the image. OpenAI states: "{FOOTNOTE}" No independent '
                                 f'reproduction is claimed. Replace with an independently measured matching-version result when available.'
                                 + astra_note),
                    'comparison_key': None,
                })
            else:
                extracts.append({'skipped_existing_config': [score_id, model_id], 'datapoint': v})
            if (cost_id, model_id) not in EXISTING:
                rows.append({
                    'id': f'self-reported:{fam}-{eff}-openai-{slug}-cost', 'benchmark_id': cost_id, **common,
                    'value': v['cost'], 'unit': 'USD', 'basis': 'self_reported',
                    'source': src(cost_id, 'cost', f' (USD; the chart tooltip prints it as cost_label "{v["cost_label"].replace("$$", "$")}"; x axis title "Cost per task")'),
                    'protocol': (f'Vendor-reported by OpenAI as {v["model"]}\'s USD cost per {printed} task at {eff} reasoning '
                                 f'effort, the x-axis value ("Cost per task") of the exact dataset embedded in the launch post\'s '
                                 f'chart, not read off the image. OpenAI states: "{FOOTNOTE}" No independent reproduction is '
                                 f'claimed. Replace with an independently measured matching-version result when available.'
                                 + astra_note),
                    'comparison_key': None,
                })
            else:
                extracts.append({'skipped_existing_config': [cost_id, model_id], 'datapoint': v})
        extracts.append({'chart': link, 'chart_id': cid, 'title': title, 'section': section, 'caption_row': cap_row,
                         'caption': caption, 'caption_links': links,
                         'gpt6_points': [v for v in obj['vegaLiteSpec']['data']['values'] if v['model'] in MODELS]})
    for r in rows:  # key order: stable and like CR-126
        r.setdefault('join_note', r.pop('join_note'))
    out = Path(outdir)
    out.mkdir(parents=True, exist_ok=True)
    (out / 'candidates.json').write_text(json.dumps({'schema_version': 1, 'observations': rows}, indent=2, ensure_ascii=False) + '\n')
    (out / 'extracts.json').write_text(json.dumps({'source': {'url': POST, 'file': FILE, 'sha256': SHA},
                                                   'astra_post': {'url': ASTRA_URL, 'file': ASTRA_FILE, 'sha256': ASTRA_SHA, 'cost_points': astra},
                                                   'charts': extracts}, indent=2, ensure_ascii=False) + '\n')
    print(len(rows), 'rows')


if __name__ == '__main__':
    main(sys.argv[1])
