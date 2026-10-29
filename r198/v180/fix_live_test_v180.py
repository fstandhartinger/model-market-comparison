"""Keep archived expectations exact; live feed/SEO follow the validated v1.8 cost spec."""
import pathlib
W=pathlib.Path(__file__).resolve().parents[2];p=W/'test/jevbench-v1637-release.test.mjs';s=p.read_text()
if 'function expectedLiveCostV180' not in s:
 s="import { V180_COST_SPEC } from '../lib/jevbench-v180-release.mjs';\n"+s
 anchor="test('live boards and the agent feed resolve each restated row exactly once"
 i=s.index(anchor)
 s=s[:i]+"function expectedLiveCostV180(key,gpuRestated) { return gpuRestated ? (V180_COST_SPEC[key]?.new_cost ?? V1637_ROW_SPEC[key].usd) : V1637_ROW_SPEC[key].usd; }\n"+s[i:]
 start=s.index(' const {feed}=await readJevbenchAgentFeed();',i);tail=s[start:]
 tail=tail.replace(' const {feed}=await readJevbenchAgentFeed();',' const gpuRestated=await hasPublishedJevbenchV180Release();\n const {feed}=await readJevbenchAgentFeed();',1)
 tail=tail.replace(' const data=await readJevbenchSeoData();',' const data=await readJevbenchSeoData(),gpuRestated=await hasPublishedJevbenchV180Release();',1)
 for k in ['k','H2O','KAHN']:tail=tail.replace('V1637_ROW_SPEC['+k+'].usd','expectedLiveCostV180('+k+',gpuRestated)')
 s=s[:start]+tail;p.write_text(s)
print('Historical v1.6.37 artifacts retain their cost assertions; live feed/SEO use the visible release cost.')
