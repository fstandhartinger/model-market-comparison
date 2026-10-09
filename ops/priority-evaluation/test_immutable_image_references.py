"""Pure recipe validation: no provider, customer code or model invocation."""
import copy,json,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
import pod_runner as pr
import measurement_dispatch
class ImmutableImageReferenceTests(unittest.TestCase):
 def setUp(self):
  self.recipe=json.loads((Path(__file__).parent/'test-fixtures/decisor-original-recipe.json').read_text())
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
  self.job=Path(self.tmp.name);(self.job/'source').mkdir()
  (self.job/'source/FETCH-RECEIPT-model.json').write_text(json.dumps({'commit':self.recipe['weights'][0]['revision']}))
 def check(self,image):
  recipe=copy.deepcopy(self.recipe);recipe['image']=image
  with patch.object(pr.execution_source,'validate_code_binding',return_value=self.job/'source/code'):
   return pr.validate_recipe(recipe,self.job)
 def test_exact_original_admitted_digest_only_image_reaches_fetch_gate(self):
  self.assertEqual(self.check(self.recipe['image']),self.recipe)
 def test_tagged_immutable_image_retains_original_acceptance(self):
  digest=self.recipe['image'].split('@',1)[1]
  for tag in ['latest','v1.2-3','2026_10']:
   with self.subTest(tag=tag):self.check('docker.io/underlabsai/decisor-sglang:'+tag+'@'+digest)
 def test_mutable_and_malformed_images_remain_refused(self):
  base='docker.io/underlabsai/decisor-sglang';digest='a'*64
  cases=[base,base+':latest',base+'@sha256:'+digest[:-1],base+'@sha256:'+digest+'0',base+'@sha256:'+digest.upper(),base+':@sha256:'+digest,base+'@@sha256:'+digest,'https://'+base+'@sha256:'+digest,base+'@sha512:'+digest,base+'@sha256:'+digest+'\n',base+'@sha256:'+digest+';echo bad',base+' @sha256:'+digest,base+':x:y@sha256:'+digest]
  for image in cases:
   with self.subTest(image=image),self.assertRaises(measurement_dispatch.OperationalHold):self.check(image)
 def test_digest_only_does_not_skip_model_fetch_binding(self):
  (self.job/'source/FETCH-RECEIPT-model.json').write_text(json.dumps({'commit':'0'*40}))
  with self.assertRaisesRegex(measurement_dispatch.OperationalHold,'pod_recipe_mismatched_fetch'):self.check(self.recipe['image'])
if __name__=='__main__':unittest.main()
