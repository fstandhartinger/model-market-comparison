"""Enforce review M1 against accepted aggregate recounts; audit exit zero alone is insufficient."""
def check_recount(k,a):
 tuned=k.endswith('tuned-commit');n=1485 if tuned else 1477;native=715443 if tuned else 664759;engine=831272 if tuned else 779965
 assert a['input_sha256']==('dfd36720077ef7c41ace367524896507c7f44ce71306fb3e659e8b85069d995b' if tuned else '901983ae0f325970f92735cd1558c3340cb9ca2395d1b2173e1d00be030b6768')
 if tuned:assert a['counts_sha256']=='e5a6b62483848d30bd2a594263d363138c56690e572c73c2a8e606e476f6e1f1'
 assert a['native_usage_sum']==native and a['native_output_sum']==n
 assert a['pad_sum']==a['items_with_nonzero_residual']==0
 assert a['other_outcomes']=={} and a['boundary_aware_residual_histogram']=={'0':n}
 assert a['engine_sum_common_1485' if tuned else 'engine_sum_common']==engine
 assert a['engine_sum_all_1500' if tuned else 'engine_sum_all_items']==engine
 if tuned:
  assert a['answered']==1485 and a['header_limited']==0 and a['refused_422_no_engine_row']==15
  assert a['recount_mismatches_vs_frozen_counts']==0
  assert a['overhead_engine_minus_native_histogram']=={'77':1,'78':1484}
 else:
  assert a['answered_common_basis']==1477 and a['over_length_http500']==23
  assert a['overhead_engine_minus_pad_minus_native_histogram']=={'78':1477}
  p=a['recount_vs_published'];assert p['published_usage']==664759
  assert all(p[f] is True for f in ['usage_equals_published','output_equals_published','answered_equals_published','over_length_ids_equal_published_failures'])
