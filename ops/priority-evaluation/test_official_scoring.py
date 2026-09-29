import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import official_scoring as scorer
from scoring_fixtures import create


class OfficialScoringTests(unittest.TestCase):
    def test_undefined_support_value_cannot_silently_zero_calibration(self):
        meta={'system_key':'fixture','system':{'support':dict.fromkeys(('choice','noul','score'),'verbalized')}}
        with self.assertRaisesRegex(ValueError,'support enum'):
            scorer.validate_meta('jevbench',meta)
        meta['system']['support']=dict.fromkeys(('choice','noul','score'),'native')
        scorer.validate_meta('jevbench',meta)

    def test_real_frozen_scorer_on_synthetic_references_and_changed_raw(self):
        with tempfile.TemporaryDirectory(prefix='official-score-fixture-') as tmp:
            manifest, raw, meta = create(Path(tmp), scorer.MANIFEST)
            with patch.object(scorer, 'MANIFEST', manifest):
                pins = scorer.pins(['jevbench'])
                good = scorer.run('jevbench', raw, meta, pins)
                self.assertGreater(good['score'], 60)
                rows = [json.loads(line) for line in raw.read_text().splitlines()]
                for row in rows:
                    row['probs_as_returned'] = {k: 1-v for k,v in row['probs_as_returned'].items()}
                raw.write_text('\n'.join(json.dumps(r) for r in rows)+'\n')
                bad = scorer.run('jevbench', raw, meta, pins)
                self.assertLess(bad['score'], good['score'])
                self.assertIn('composite_ci95', good['aggregate'])
                # The manifest is outside request data; any upstream replacement fails closed.
                gold = Path(pins['profiles']['jevbench']['files']['gold.jsonl']['path'])
                gold.write_text(gold.read_text()+'\n')
                with self.assertRaisesRegex(ValueError, 'reference pin changed'):
                    scorer.run('jevbench', raw, meta, pins)

    def test_scoring_sandbox_has_no_host_credentials_or_evaluator_result(self):
        import os
        import shutil
        with tempfile.TemporaryDirectory(prefix='official-isolation-') as tmp:
            root = Path(tmp)
            manifest, raw, meta = create(root / 'fixture', scorer.MANIFEST)
            probe = root / 'official_score.py'
            probe.write_text('''import json, os
from pathlib import Path
assert not any(Path(p).exists() for p in ['/home/flori/.ssh', '/home/flori/.config/stripe', '/home/flori/.config/dev-secrets.env', '/home/flori/jevbench-sealed', '/input/RESULT.json'])
assert set(p.name for p in Path('/input').iterdir()) == {'raw.jsonl','meta.json'}
assert os.environ.get('OPENAI_API_KEY') == ''
assert 'FASTLANE_SENTINEL' not in os.environ
print(json.dumps({'isolated': True}))
''')
            with patch.object(scorer, 'MANIFEST', manifest), patch.object(scorer, 'ROOT', root), \
                    patch.dict(os.environ, {'FASTLANE_SENTINEL': 'scratch-marker'}):
                pins = scorer.pins(['jevbench'])
                self.assertEqual(scorer.run('jevbench', raw, meta, pins), {'isolated': True})
