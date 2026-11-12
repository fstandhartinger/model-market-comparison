"""Plain card data for the lead: per ranked row of the 27 Oct draw that enters a primary top five, its primary entries (list, place);
the rows that leave primary top fives with counts; the held rows with one-line reasons; total lists changed. Aggregates only.
Usage: card_facts_v1810.py <out.json>   (reads receipts/topfive-diff.json, topfive-before/after and the v1.8.10 artifact)"""
import json,pathlib,sys
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];L=lambda p:json.loads(pathlib.Path(p).read_text())
d=L(J/'receipts/topfive-diff.json');res=L(W/'data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.10-results.json');old=L(W/'data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.9-results.json')
disp={s['key']:s['display'] for s in res['systems']};NEW=res['addendum']['new_keys'];RK=set(res['addendum']['ranked_keys'])|set(NEW);HELD=res['addendum']['held_keys'];by={s['key']:s for s in res['systems']}
LABEL={'composites/A':'Composite A','composites/B':'Composite B','composites/C':'Composite C','capability/official_caps':'Capability (official caps)','capability/no_caps':'Capability (no caps)','capability/cost_off_latency_2x':'Capability (cost cap off, latency 2x)','capability/latency_none':'Capability (latency cap off)'}
VIEW={'all':'all systems','open':'open weights','api':'API','release':'release board'}
def lab(r):
    m=r['metric']
    if r['view']=='release':return f"release board: {'Capability' if m=='capability' else 'Composite '+m}"
    return f"{VIEW[r['view']]}: {LABEL.get(m,m)}"
entries={};leavers={};primary_changed=[]
for r in d['rows']:
    if not r['changed']:continue
    primary_changed.append(lab(r))
    for i,k in enumerate(r['after']):
        if k in RK:entries.setdefault(k,[]).append({'list':lab(r),'place':i+1})
    for k in r['before']:
        if k not in r['after']:leavers[k]=leavers.get(k,0)+1
REASON={'h2o-lightning-4b-v1.4.1':'Row-specific draw-mix signature: +5.8 on the draw\'s sealed items but -4.2 on the shared public items vs H2O-Lightning-4B v1.1; no offset can remove it.',
        'jeff_1_1_large':'Its top-five places (9 in the as-built candidate) lie within the uncertainty of the draw shift (95% interval -5.9 to +1.1 Intelligence).',
        'wemm-jev':'Its top-five places (14 in the as-built candidate) lie within the uncertainty of the draw shift (95% interval -5.9 to +1.1 Intelligence).',
        'visionjev-1.0.0-27b':'Its top-five place lies within the uncertainty of the draw shift (95% interval -5.9 to +1.1 Intelligence).'}
assert sorted(REASON)==sorted(HELD)
g=by['gemini-decision-1'];gw=L(J/'receipts/GEMINI-WHATIF-MATCH.json');assert gw['status']=='PASS'
added={'key':'gemini-decision-1','display':g['display'],'author':g['author'],'board':'API (hosted) only','published':g['published_scores'],'equated':{'axes':g['axes'],'scores':g['scores'],'capability':g['capability']},
       'ranks_artifact_all_systems':g['ranks'],'ranks_per_list_point':gw['point_ranks'],'list_sizes':gw['point_list_sizes'],'primary_top_five_entries':entries.get('gemini-decision-1',[]),'whatif_match':'PASS ('+str(gw['list_ranks_compared'])+' list ranks, '+str(len(gw['scenarios_compared']))+' scenarios)',
       'cost_usd_per_1000':g['cost']['usd_per_1000'],'self_reported':'Google reports 92.2 % (self-reported; accuracy on the 231 public v1.2 items, vendor-run; none of those items is in this draw).','accuracy_yesno_rule':86.3,'image_label':'ImageJevBench: requested, no date'}
assert not added['primary_top_five_entries']
out={'about':'Card data, v1.8.10 combined candidate (FAIR_SUBSET: 31 rows of the 27 Oct draw ranked, 4 held unranked; plus Gemini Decision 1, Google, hosted API, on the same draw: no top-five entry). Primary lists = the 40 site lists (all systems, open weights and API: Composites A/B/C and Capability variants; release board). Aggregates only.',
     'offset':{'Intelligence':-2.9,'Calibration':-1.9,'interval_intelligence_95':'-5.9 to +1.1'},
     'ranked_d1027_rows':len(RK)-len(NEW),'added_row':added,'fairness':{'earlier':res and L(W/'data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.10-proof.json')['publication_approval']['fairness_check'],'delta':L(W/'data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.10-proof.json')['publication_approval']['fairness_check_delta']},
     'entrants_primary':[{'key':k,'display':disp[k],'entries':sorted(v,key=lambda e:(e['list'],e['place'])),'n_primary_top_fives':len(v)} for k,v in sorted(entries.items(),key=lambda kv:(-len(kv[1]),kv[0]))],
     'leavers_primary':[{'key':k,'display':disp.get(k,k),'primary_top_fives_left':n} for k,n in sorted(leavers.items(),key=lambda kv:(-kv[1],kv[0]))],
     'held_rows':[{'key':k,'display':disp[k],'reason':REASON[k]} for k in sorted(HELD)],
     'unpriced_unranked_rows':sorted(k for k in res['addendum']['unranked_keys'] if k not in HELD),
     'primary_lists':40,'primary_lists_changed':len(primary_changed),'primary_lists_changed_labels':primary_changed,
     'total_lists_compared':d['lists'],'total_lists_changed':d['changed_lists'],
     'supplementary_lists_changed':d['extended_changed_lists'],'slider_states_changed':[d['slider_changed_states'],d['slider_states']],
     'slider_grid_changed':[d['explicit_slider_grid_changed'],d['explicit_slider_grid_states']],'custom_weightings_changed':[len(d['custom_changed_labels']),d['custom_rows']]}
pathlib.Path(sys.argv[1]).parent.mkdir(parents=True,exist_ok=True);pathlib.Path(sys.argv[1]).write_text(json.dumps(out,indent=1,ensure_ascii=False)+'\n')
print('card facts:',len(out['entrants_primary']),'entrants,',len(out['leavers_primary']),'leavers; primary changed',len(primary_changed),'; total changed',d['changed_lists'])
