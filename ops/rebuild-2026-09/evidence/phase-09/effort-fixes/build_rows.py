#!/usr/bin/env python3
"""CR-173 (effort-fixes): corrected Claude Opus 5.5 Terminal-Bench 4.0 rows from Anthropic's launch post.

The approved row self-reported:claude-opus-55-terminal-bench-4-0 (66.4) was joined to claude-opus-5.5::max, but the
launch post's table caption says the Terminal-Bench 4.0 cell is Opus 5.5 at xhigh effort. This script re-reads the
retained capture, checks every quoted string against it, and writes the replacement xhigh row plus the other
Opus 5.5 points of the post's own embedded Terminal-Bench 4.0 chart dataset (low, med, high, max; the chart's xhigh
point equals the printed cell and is covered by the table row). Competitor series are never ingested.
Usage: python3 build_rows.py OUT_DIR   (offline, deterministic)"""
import copy, gzip, hashlib, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[5]
B = ROOT / 'data/raw/benchmarks'
out = Path(sys.argv[1])
POST_FILE = 'data/raw/benchmarks/daily-evidence/2026-09-22-claude-opus-5-5/4418b9b4f881510f195f.gz'
CARD_FILE = 'data/raw/benchmarks/daily-evidence/2026-09-22-claude-opus-5-5/95a7b26f5d4497072d97.gz'
post = gzip.decompress((ROOT / POST_FILE).read_bytes()).decode()
card = gzip.decompress((ROOT / CARD_FILE).read_bytes()).decode()
assert hashlib.sha256(post.encode()).hexdigest() == '4418b9b4f881510f195fd0dc2aa3e7ee5d8e3868d954c9e75a66ac8fe860e149'
CARD_SHA = hashlib.sha256(card.encode()).hexdigest()
assert CARD_SHA == '95a7b26f5d4497072d973935ccb674978149f16db396d425b4b544581fcbc728'

CAPTION = ('Unless otherwise noted, all Claude Opus 5.5 results use adaptive thinking at max effort. Terminal-Bench 4.0 results '
           'are reported for Claude Opus 5.5 at xhigh effort and GPT-6 Astra at high effort, as reported by OpenAI; these '
           'represent each model’s highest score.')
assert CAPTION in post, 'caption'
CARD_QUOTE_1 = 'Claude Opus 5.5 scored 66.36% on Terminal-Bench 4.0 with safeguards enabled'
CARD_QUOTE_2 = 'xhigh thinking effort for Opus 5.5 (which at max effort scores 64.8%, within noise of\nxhigh)'
assert CARD_QUOTE_1 in card and CARD_QUOTE_2 in card, 'system card'
# Round 2: the whole results paragraph of section 8.5, verbatim (pdftotext layout), so every protocol claim is checkable.
p0 = card.index('8.5 Terminal-Bench 4.0\n')
CARD_PARAGRAPH = card[card.index(CARD_QUOTE_1, p0):card.index('For reference, the public leaderboard', p0)].rstrip()
assert 'Claude Code in --bare mode and\nxhigh thinking effort for Opus 5.5' in CARD_PARAGRAPH and 'fallback model' in CARD_PARAGRAPH
CARD_QUOTE_3 = 'The numbers reported use Claude Code in --bare mode and\nxhigh thinking effort for Opus 5.5'

# The chart: viewSwitcher view "Agentic terminal coding", chart _key tuskchartterminalbench, title "Terminal-Bench 4.0".
key = '\\"_key\\":\\"tuskchartterminalbench\\"'
i = post.index(key)
seg = post[i:post.index('\\"label\\":\\"Agentic terminal coding\\"', i)]
assert '\\"title\\":\\"Terminal-Bench 4.0\\"' in seg and '\\"subtitle\\":\\"Accuracy vs Cost\\"' in seg
assert '\\"label\\":\\"Score (%)\\"' in seg and '\\"label\\":\\"Cost per attempt (USD, log scale)\\"' in seg
data = seg.split('\\"data\\":\\"', 1)[1].split('\\"', 1)[0]
lines = data.split('\\\\n')
assert lines[0] == 'series,x,y,label,labelPlacement'
points = [dict(zip(lines[0].split(','), l.split(','))) for l in lines[1:]]
opus = {p['label']: p for p in points if p['series'] == 'opus55'}
assert list(opus) == ['low', 'med', 'high', 'xhigh', 'max']
# page context of the chart: the h2 "Coding" block precedes the viewSwitcher whose first view is labelled "Agentic terminal coding"
h2 = post.rindex('\\"text\\":\\"Coding\\"}],\\"markDefs\\":[],\\"style\\":\\"h2\\"', 0, i)
vs = post.rindex('\\"_type\\":\\"viewSwitcher\\"', 0, i)
assert h2 < vs < i and post.rindex('\\"style\\":\\"h2\\"', 0, i) == h2 + len('\\"text\\":\\"Coding\\"}],\\"markDefs\\":[],')
CONTEXT = post[h2:h2 + 60] + ' ... ' + post[vs - 30:vs + 30] + ' ... ' + post[i:i + 40] + ' ... \\"label\\":\\"Agentic terminal coding\\"'
assert opus['xhigh']['y'] == '66.4' and opus['max']['y'] == '64.8'
# the series id opus55 is named "**Opus 5.5**" in the same chart's series list
assert '\\"_key\\":\\"wtbopus55\\",\\"_type\\":\\"series\\",\\"color\\":\\"orange\\",\\"fill\\":\\"solid\\",\\"id\\":\\"opus55\\",\\"name\\":\\"**Opus 5.5**\\"' in seg

cand = json.loads((B / 'self-reported-candidates.json').read_text())
old = next(o for o in cand['observations'] + cand.get('withdrawn_observations', [])
           if o['id'] == 'self-reported:claude-opus-55-terminal-bench-4-0')
PRINTED = 'printed row: 66.4% | 55.8% | 52.3% | 57.9% | 37.3%'
assert PRINTED in old['source']['locator']

SOURCE = {k: old['source'][k] for k in ('url', 'retrieved_at', 'published_at', 'sha256', 'file')}
CARD_SOURCE = {'url': 'https://www.anthropic.com/claude-opus-5-5-system-card', 'retrieved_at': '2026-09-22T16:55:31.262433+00:00',
               'published_at': None, 'sha256': CARD_SHA, 'file': CARD_FILE}
BASE_PROTOCOL = ('Vendor-reported by Anthropic for Claude Opus 5.5 in the Claude Opus 5.5 launch post (2026-09-22), benchmark '
                 '"Terminal-Bench 4.0". Anthropic\'s own run; no independent reproduction is claimed. The system card (section '
                 '8.5) states the result was obtained "with safeguards enabled", that "requests flagged by the safeguards were '
                 'answered by a fallback model", and that "The numbers reported use Claude Code in --bare mode". Replace with an '
                 'independently measured matching-version result when available.')
CHART_PROTOCOL = ('Vendor-reported by Anthropic for Claude Opus 5.5 in the Claude Opus 5.5 launch post (2026-09-22), chart '
                  '"Terminal-Bench 4.0" (subtitle "Accuracy vs Cost"). Anthropic\'s own run; no independent reproduction is claimed. '
                  'The system card (section 8.5) describes the conditions only for its reported headline number (xhigh; it also '
                  'names the max score): "with safeguards enabled", "requests flagged by the safeguards were answered by a fallback '
                  'model", "The numbers reported use Claude Code in --bare mode"; it does not separately describe the chart\'s other '
                  'points. Replace with an independently measured matching-version result when available.')
EFFORT = {'low': 'low', 'med': 'medium', 'high': 'high', 'xhigh': 'xhigh', 'max': 'max'}

rows = []
xhigh = {
    'id': 'self-reported:claude-opus-55-terminal-bench-4-0-xhigh',
    'benchmark_id': 'anthropic-terminal-bench-4-0::4.0',
    'subject': {'source_id': old['subject']['source_id'], 'name': 'Claude Opus 5.5', 'model_id': 'claude-opus-5.5::xhigh',
                'variant': 'xhigh effort', 'harness': None},
    'value': 66.4, 'unit': 'percent', 'basis': 'self_reported',
    'source': {**SOURCE, 'locator': (
        'Launch post benchmark table, row "Terminal-Bench 4.0", under "Opus 5.5" (first column of: Opus 5.5 | Fable 5.1 | '
        f'Opus 5 | GPT-6 Astra | GPT-5.6 Sol); {PRINTED}; the table caption states the effort: "{CAPTION}"')},
    'supporting_sources': [{**CARD_SOURCE, 'locator': f'System card section 8.5 (Terminal-Bench 4.0): "{CARD_QUOTE_1}"; '
                            f'"{CARD_QUOTE_3.replace(chr(10), " ")}"'}],
    'protocol': (BASE_PROTOCOL + ' Effort: xhigh, stated by the launch-post table caption ("Terminal-Bench 4.0 results are '
                 'reported for Claude Opus 5.5 at xhigh effort"; the caption\'s default "adaptive thinking at max effort" does not '
                 'apply to this row) and by the system card (66.36%, xhigh). The same post\'s Terminal-Bench 4.0 chart dataset '
                 'gives the same 66.4 for series opus55, label xhigh. Replaces the CR-123 row '
                 'self-reported:claude-opus-55-terminal-bench-4-0 (carried document reason "CR-123"), which had joined this cell to max '
                 'effort; that row is withdrawn with its reason, not deleted.'),
    'comparison_key': None,
}
rows.append(xhigh)
for label in ('low', 'med', 'high', 'max'):
    p = opus[label]
    line = f"opus55,{p['x']},{p['y']},{label},{p['labelPlacement']}"
    assert line in lines
    effort = EFFORT[label]
    row = {
        'id': f'self-reported:claude-opus-55-terminal-bench-4-0-chart-{effort}',
        'benchmark_id': 'anthropic-terminal-bench-4-0::4.0',
        'subject': {'source_id': f'https://www.anthropic.com/claude-opus-5-5#tuskchartterminalbench/opus55/{label}',
                    'name': 'Claude Opus 5.5', 'model_id': f'claude-opus-5.5::{effort}', 'variant': label, 'harness': None},
        'value': float(p['y']), 'unit': 'percent', 'basis': 'self_reported',
        'source': {**SOURCE, 'locator': (
            f'Launch post chart dataset, row "Terminal-Bench 4.0, chart dataset entry series opus55 with label {label}", under "y" (the y axis "Score (%)"): '
            'section "Coding", viewSwitcher view "Agentic terminal coding", chart _key "tuskchartterminalbench" (title '
            '"Terminal-Bench 4.0", subtitle "Accuracy vs Cost"; series opus55 is named "**Opus 5.5**"); the chart\'s embedded '
            f'CSV "series,x,y,label,labelPlacement", line "{line}" (x is "Cost per attempt (USD, log scale)", not ingested)')},
        'protocol': (CHART_PROTOCOL + f' Effort: {effort}, the chart dataset\'s own point label "{label}" for series opus55. '
                     'The value is the exact datapoint embedded in the page\'s chart data, not read off the rendered image. '
                     'Only the Opus 5.5 series is ingested; the chart\'s Fable 5.1, Opus 5, GPT-6 Astra and GPT-5.6 Sol series are not.'
                     + (' The system card independently states 64.8% at max effort ("which at max effort scores 64.8%").' if label == 'max' else '')),
        'comparison_key': None,
    }
    if label == 'max':
        row['supporting_sources'] = [{**CARD_SOURCE, 'locator': f'System card section 8.5 (Terminal-Bench 4.0): "{CARD_QUOTE_2.replace(chr(10), " ")}"'}]
    rows.append(row)

out.mkdir(parents=True, exist_ok=True)
(out / 'candidates.json').write_text(json.dumps({'schema_version': 1, 'observations': rows}, indent=2, ensure_ascii=False) + '\n')
carried = json.loads((B / 'self-reported/carried-documents.json').read_text())['documents']
extracts = {'source': SOURCE, 'caption': CAPTION,
            'system_card': {**CARD_SOURCE, 'quotes': [CARD_QUOTE_1, CARD_QUOTE_2, CARD_QUOTE_3],
                            'section_heading': '8.5 Terminal-Bench 4.0', 'results_paragraph_verbatim': CARD_PARAGRAPH},
            'page_context_of_chart': CONTEXT,
            'carried_document_record': next(d for d in carried if d['url'] == SOURCE['url']),
            'chart': {'key': 'tuskchartterminalbench', 'title': 'Terminal-Bench 4.0', 'subtitle': 'Accuracy vs Cost',
                      'y_axis': 'Score (%)', 'x_axis': 'Cost per attempt (USD, log scale)', 'csv_lines': lines},
            'printed_table_row': PRINTED, 'withdrawn_row': old}
(out / 'extracts.json').write_text(json.dumps(extracts, indent=2, ensure_ascii=False) + '\n')
print(json.dumps([(r['id'], r['subject']['model_id'], r['value']) for r in rows]))
