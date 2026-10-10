"""Schema-only validation of authorized PUBLIC aggregate metadata. No protected body, scorer or category execution."""
import copy,importlib.util,json,sys,unittest
from pathlib import Path
HERE=Path(__file__).resolve().parents[1]/'ops/jevbench-v163/source';sys.path.insert(0,str(HERE))
import public_result_scaffold as P
PUBLIC_FIXTURE=Path(sys.argv.pop(1));BASE=json.loads(PUBLIC_FIXTURE.read_bytes())
class Tests(unittest.TestCase):
 def test_actual_finite_signed_offset_metadata_preserved(self):
  out=P.sanitize(BASE);self.assertEqual(out['v16']['equating']['offsets'],BASE['v16']['equating']['offsets'])
 def test_old_null_offset_shape_still_valid(self):
  fixture=copy.deepcopy(BASE);fixture['v16']['equating']['offsets']=None;self.assertIsNone(P.sanitize(fixture)['v16']['equating']['offsets'])
 def test_missing_extra_and_nonfinite_offsets_refuse(self):
  for value in ({},{'I':1},{'C':2},{'I':1,'C':2,'extra':3},{'I':float('nan'),'C':2},{'I':1,'C':float('inf')},{'I':float('-inf'),'C':2}):
   with self.subTest(value=value),self.assertRaises(ValueError):
    fixture=copy.deepcopy(BASE);fixture['v16']['equating']['offsets']=value;P.sanitize(fixture)
if __name__=='__main__':unittest.main()
