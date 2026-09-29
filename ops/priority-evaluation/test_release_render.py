import copy
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

import release_render
import public_artifacts
import autopickup as ap

REPO=Path(__file__).resolve().parents[2]


class RenderTests(unittest.TestCase):
    def test_generated_next_release_routes_parse_and_keep_full_existing_component(self):
        base=subprocess.check_output(['git','-C',str(REPO),'rev-parse','HEAD'],text=True).strip()
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);plans={};artifacts={}
            for benchmark,prior,path in (
                ('jevbench','v1.5.2','data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.2-results.json'),
                ('imagejevbench','v0.1.4','data/raw/benchmarks/jevbench/multimodal-preview/preview.json')):
                new=prior.rsplit('.',1)[0]+'.'+str(int(prior.rsplit('.',1)[1])+1)
                data=json.loads(subprocess.check_output(['git','-C',str(REPO),'show',base+':'+path]))
                data['revision']=new
                dest=path.replace(prior,new) if benchmark=='jevbench' else path
                file=root/'input'/dest;file.parent.mkdir(parents=True);file.write_text(json.dumps(data))
                artifacts[dest]=file
                plans[benchmark]={'version':new,'previous_version':prior,'artifact_path':dest}
            outputs=release_render.render(REPO,base,plans,artifacts,root/'generated')
            for name,path in outputs.items():
                if name.endswith('.mjs'):
                    proc=subprocess.run(['node','--check',str(path)],capture_output=True,text=True)
                    self.assertEqual(proc.returncode,0,proc.stderr)
            script="""const ts=require('typescript'),fs=require('fs');
for(const p of JSON.parse(process.argv[1])) {
 const result=ts.transpileModule(fs.readFileSync(p,'utf8'),{fileName:p,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.Preserve,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});
 if(result.diagnostics?.length) throw Error(ts.formatDiagnostics(result.diagnostics,{getCurrentDirectory:()=>'.',getCanonicalFileName:x=>x,getNewLine:()=> '\\n'}));
}
"""
            files=[str(p) for n,p in outputs.items() if n.endswith(('.tsx','.ts')) and not n.endswith('.d.mts')]
            proc=subprocess.run(['node','-e',script,json.dumps(files)],cwd=REPO,capture_output=True,text=True)
            self.assertEqual(proc.returncode,0,proc.stderr)
            component=outputs['components/JevBenchV15ReleasePage.tsx'].read_text()
            self.assertIn('<JevBenchV15 ',component)
            self.assertIn("'/jev-models/v1.5.2'",component)
            image=outputs['lib/jevbench-multimodal-preview.mjs'].read_text()
            self.assertIn('assertFastlaneAggregateOnly(a);',image)
            self.assertIn("'item_id'",image)

    def test_normalized_item_fields_in_nested_coverage_are_rejected(self):
        for name in ('item_id','ITEM-ID','ground_truth','Raw Output'):
            with self.subTest(name=name), self.assertRaises(ValueError):
                public_artifacts.aggregate_only({'candidate_coverage':[{'data':{name:'invented'}}]})

    def test_unverified_target_pairwise_claim_is_rejected(self):
        base={'headline':'A','systems':[], 'board':{}}
        for i,key in enumerate(('target','other'),1):
            base['systems'].append({'key':key,'rank':i,'ranked':True,'listing':'ranked','jevbench_score':90.-i,
                                    'scores':dict.fromkeys(('A','B','C'),90.-i),'ranks':dict.fromkeys(('A','B','C'),i)})
        base['board']={o:{'order':['target','other'],'markers':[]} for o in ('A','B','C')}
        candidate=copy.deepcopy(base)
        candidate['board']['A']['markers']=[{'upper':'target','lower':'other','tie':False,'p_upper_wins':1.,'diff_ci95':[50.,90.]}]
        with self.assertRaisesRegex(ap.PickupError,'target pairwise'):
            ap.validate_public_artifact_delta(base,candidate,'jevbench','target',89.)


if __name__=='__main__':unittest.main()
