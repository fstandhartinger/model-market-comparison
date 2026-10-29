# Source evidence

Repository excerpts below are origin/main at ba210893 (detached read-only worktree; removed after review). Other paths are installed first-party tools or stored aggregates.

## /home/flori/jobs/jevbench-auto-intake/r24-score/run_scores.sh

```text
1: #!/bin/bash
2: # auto-intake run 6: same flags as the release owner's r160/nimble/score/run_scores.sh. usage: run_scores.sh <field-dir> <label>
3: # finish-r6e copy of r12-score/run_scores.sh: scorer commands and flags byte-identical to the original (3 workers, B 1000, seed 16); built fields carry pricing_v15 81e3578f via finish-r6e/build_field.py.
4: # Launch bounded: systemd-run --user --scope -q -p CPUQuota=300% bash run_scores.sh <field-dir> <label>
5: set -uo pipefail
6: F=$(readlink -f "$1"); L=$2
7: J=/home/flori/jobs/jevbench-add-requests-20260919
8: BT=$J/r154/v1636/batch
9: H=/home/flori/jobs/jevbench-v16-run-20261001/harness
10: D=/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261012
11: cd $H
12: export JEV_NOUL_METHOD=O1S PYTHONDONTWRITEBYTECODE=1
13: COMMON="--release-dir $D --registry $F/REGISTRY.json --runs $F/runs --B 1000 --seed 16 --workers 3 --g-med-fixed 9.839526770355711 --cost-basis $BT/cost-basis-v1630.json"
14: nice -n 15 python3 score_v16.py $COMMON --revision v1.6.36-plus-$L --out $F/out-frozen > $F/out-frozen.log 2>&1; echo frozen rc $?
15: nice -n 15 python3 $J/r160/scorer/score_v17.py $COMMON --revision v1.7-off-$L --out $F/out-v17-off > $F/out-v17-off.log 2>&1; echo off rc $?
16: nice -n 15 python3 $J/r160/scorer/score_v17.py $COMMON --revision v1.7-share-$L --decision-limit-s 10 --timeout-treatment share --out $F/out-v17-share > $F/out-v17-share.log 2>&1; echo share rc $?
```

## /home/flori/jobs/jevbench-auto-intake/r24-score/build_field.py

```text
55:             ref = (spec['explicit_ref']['key'], (spec['explicit_ref']['in'], spec['explicit_ref']['out']))
56:         else:
57:             ref = pr.reference(key, {'base_model': spec['pricing_base']}, CATALOG); assert ref, key
58:         pin, pout = tuple(ref[1])
59:         if spec.get('price_output_zero'):   # run 11: zero-output convention by explicit release-owner ruling only (e.g. #25647 Vera: the server's output count is a chars/4 estimate, nothing is generated)
60:             assert spec['price_output_zero'].startswith('#') and spec.get('zero_output') is True, key
61:             pout = 0.0
62:         usd_all = 1000 * (tin * pin + tout * pout) / 1e6 / len(rows)
63:         sub = [x for x in rows if x['task_id'] not in EXCL]; assert len(sub) == 1485
64:         assert all(isinstance((x.get('usage') or {}).get('input_tokens'), int) and isinstance((x.get('usage') or {}).get('output_tokens'), int) for x in sub if x.get('ok'))
65:         tin_c = sum(int((x.get('usage') or {}).get('input_tokens') or 0) for x in sub); tout_c = sum(int((x.get('usage') or {}).get('output_tokens') or 0) for x in sub)
```

```text
88:         os.symlink(raw.resolve(), runs / f'{key}.jsonl')
89:         lat = sorted(x['latency_s'] for x in rows)
90:         summary[key] = dict(treatment=treat, treatment_all_rows=treat_all, ok=len(ok), input_tokens=tin, output_tokens=tout, input_tokens_common=tin_c, output_tokens_common=tout_c, n_common=len(sub),
91:                             usd_per_1000=usd, usd_per_1000_all_rows=usd_all, cap_ratio=usd / CAP, cap_ratio_all_rows=usd_all / CAP, raw_sha256=sha(raw),
92:                             engine_input_tokens=(eb or {}).get('answered_engine_input_tokens'), ref=[ref[0], list(ref[1])], n_over_10s=sum(1 for v in lat if v > 10.0), latency_max=lat[-1])
93: (B / 'REGISTRY.json').write_text(json.dumps(reg, indent=1, sort_keys=True) + '\n')
94: (B / 'ROWS.json').write_text(json.dumps(summary, indent=1, sort_keys=True) + '\n')
95: (B / 'BUILD-META.json').write_text(json.dumps(dict(builder_sha256=sha(__file__), pricing_v15_sha256=PRICING_SHA, cost_basis_sha256=sha(COSTBASIS), input_sha256=INPUT_SHA, cap=CAP,
96:     entries={str(pathlib.Path(e).resolve()): sha(e) for e in sys.argv[2:]}, roster=len(reg)), indent=1, sort_keys=True) + '\n')
97: print(json.dumps(summary, indent=1)); print('roster', len(reg))
```

## /home/flori/jobs/jevbench-add-requests-20260919/r160/scorer/score_v17.py

```text
114: def calibration_v16(scored, support):
115:     """`share`: a timed-out decision is scored like a refusal and then counts as calibration 0 for its type:
116:     each type's calibration score is multiplied by (1 - share of that type's decisions that went over the limit).
117:     Monotone: a failed decision can never raise Calibration."""
118:     if CONFIG["treatment"] != "share" or CONFIG["limit"] is None:
119:         return _ORIG_CAL16(scored, support)
120:     # calibration of the decisions as originally answered, then each failed decision counts as calibration 0
121:     res = _ORIG_CAL16([(g, s.get("_dl_orig", s)) for g, s in scored], support)
122:     parts = {t: dict(v) for t, v in res["parts"].items()}
123:     for t in S.TYPES:
124:         its = [s for g, s in scored if g.type == t]
125:         if t not in parts or not its:
126:             continue
127:         f = sum(1 for s in its if s.get("_dl_failed")) / len(its)
128:         parts[t]["time_limit_failed_share"] = f
129:         if parts[t].get("score") is not None:
130:             parts[t]["score_before_time_limit"] = parts[t]["score"]
131:             parts[t]["score"] = parts[t]["score"] * (1 - f)
132:     supported = [t for t in S.TYPES if support.get(t, "unsupported") != "unsupported"]
133:     values = {t: (parts[t]["score"] if t in parts and parts[t].get("score") is not None else 0.0) for t in supported}
134:     return {"parts": parts, "C": S.weighted(values, {t: V.TYPE_W[t] for t in supported}) or 0.0}
```

## /home/flori/jobs/jevbench-v16-run-20261001/harness/build_categories_v16.py

```text
79:     dim_src = {"families": "family", "usecases": "usecase", "languages": "lang"}
80:     for row in res["systems"]:
81:         b = (row.get("v16") or {}).get("breakdowns") or {}
82:         if not b:
83:             art["unavailable"][row["key"]] = "no complete v1.6 run"
84:             continue
85:         cell = {}
86:         for dim, src in dim_src.items():
87:             cell[dim] = {k: {"n": int(c["n"]), "competence": round(float(c["score"]), 2)}
88:                          for k, c in (b.get(src) or {}).items()
89:                          if c.get("score") is not None and int(c["n"]) >= MIN_N and k in count[dim]}
90:         art["systems"][row["key"]] = cell
91:     out_path.write_text(json.dumps(art, indent=1, sort_keys=False) + "\n")
92:     print(out_path, len(art["systems"]), "systems;", {d: len(art[d]) for d in dim_src})
93: 
```

## /home/flori/jobs/jevbench-v16-run-20261001/harness/build_topics_v16.py

```text
34:     rd, reg_p, runs, lab_p, cat_in, cat_out = map(Path, sys.argv[1:7])
35:     gold = V.load_gold(rd / "frozen/gold.jsonl")
36:     labels = collections.defaultdict(dict)
37:     for line in lab_p.open():
38:         r = json.loads(line)
39:         oid, q = r["id"].split("::")
40:         labels[q][oid] = UC_LONG.get(r["choice"], r["choice"]) if q == "usecase" else r["choice"]
41:     assert set(labels["topic"]) == set(gold) == set(labels["usecase"]), "labels must cover every gold item"
42:     registry = json.loads(reg_p.read_text())
```

```text
60:     old_uc = {u["key"]: u for u in art.get("usecases", [])}
61:     art["topics"] = cats("topic", lambda k: TOPICS[k])
62:     art["usecases"] = cats("usecase", lambda k: (old_uc.get(k, v154_uc.get(k, {})).get("label", k.replace("_", " ").capitalize()),
63:                                                  old_uc.get(k, v154_uc.get(k, {})).get("covers", k)))
64:     art["labelling"] = (
65:         "Family and language are authoring metadata of every item in the frozen v1.6 pool. Each of the 1,500 v1.6 "
66:         "items was also labelled with one subject topic (the v1.2 topic list, unchanged) and one TypeSafe use-case "
67:         "category by Winnow-12B Q8 on our own GPU pod (same model, questions and taxonomy as v1.5); where a uc1 item "
68:         "was written for a use case, that authoring use case is used instead. Sealed items stayed on our own "
69:         "infrastructure. 75 public items (5 %) were checked by hand; item-group rules fix the systematic misses "
70:         "(topic agreement before rules 93 %). All non-English uc1 items are machine-authored and not native-reviewed. "
71:         "Self-hosted systems saw S u P (1,500 items); hosted API systems saw only A u P (600 items), so their cells "
72:         "cover fewer items.")
73:     art["labels_sha256"] = hashlib.sha256(lab_p.read_bytes()).hexdigest()
74:     for key, s in systems.items():
75:         cell = art["systems"].setdefault(key, {})
76:         for q, dim in (("topic", "topics"), ("usecase", "usecases")):
77:             groups = collections.defaultdict(list)
78:             for g, x in s.scored:
79:                 groups[labels[q][g.oid]].append((g, x))
80:             out = {}
81:             for k, items in groups.items():
82:                 st = V.group_stats(items)
83:                 if st["score"] is not None and st["n"] >= MIN_N:
84:                     out[k] = {"n": int(st["n"]), "competence": round(float(st["score"]), 2)}
```

## /home/flori/jobs/jevbench-v16-run-20261001/harness/decisive_v16.py

```text
24:                 continue
25:             n += 1
26:             if not it.get("valid"):
27:                 continue
28:             valid += 1
29:             if it.get("decision") is not None:
30:                 dec += 1
31:                 ok += bool(it.get("correct"))
32:         res[k] = {"supported": True, "n": n, "valid": valid, "decisive": dec,
33:                   "decisive_rate": dec / valid if valid else None,
34:                   "acc_among_decisive": ok / dec if dec else None}
35:     Path(out).write_text(json.dumps(res, indent=1, sort_keys=True) + "\n")
36:     for k, r in sorted(res.items()):
37:         print(k, {a: (round(b, 3) if isinstance(b, float) else b) for a, b in r.items()})
38: 
39: if __name__ == "__main__":
```

## /home/flori/wt/r198-knowline-p0/data/jevbench-breakdown-exceptions.json

```text
1: {
2:  "schema_version": 1,
3:  "kind": "jevbench-breakdown-exceptions",
4:  "note": "Rows the live JevBench boards may show without topic, use-case or language cells. Florian's standing rule (DECISIONS 2026-10-16 13:30 UTC): every listed row has them; an exception needs a reason and a recorded decision. test/jevbench-breakdowns-every-listed-row.test.mjs fails on any other gap and on stale entries.",
5:  "entries": [
6:   {
7:    "key": "drex_v1_5",
8:    "dims": [
9:     "languages"
10:    ],
```

```text
30:   },
31:   {
32:    "key": "arcbright-elf-1-12b-r2",
33:    "dims": [
34:     "topics"
35:    ],
36:    "reason": "TEMPORARY: row on the 27 Oct 2026 regular draw (v1.6-regular-20261027, release v1.7.14). That draw has no ruled subject-topic labels yet, so no topic cells exist; its use-case and language cells are measured on the row's own draw. A follow-up release adds the topic cells once the draw's items are labelled and removes this entry.",
37:    "decision": "DECISIONS 2026-10-27 18:20 UTC v1713-topics-exception-h2o141 (release owner), extended to every row on the 27 Oct draw (v1.7.14)"
38:   },
39:   {
40:    "key": "decisio-gemma-4-12b-tuned-commit-think",
41:    "dims": [
42:     "topics"
43:    ],
```

## /home/flori/wt/r198-knowline-p0/lib/jevbench-v169-release.mjs

```text
80:     if (!s.api_flag === false && s.api_flag !== false) fail(`no API lane in this release: ${s.key}`);
81:     if (typeof s.repo !== 'string' || !s.repo.startsWith('https://')) fail(`repo ${s.key}`);
82:     if (typeof s.model_pin !== 'string' || !/@[a-f0-9]{40}$/.test(s.model_pin)) fail(`pinned revision ${s.key}`);
83:     // Every price in this release is a labelled estimate; none is a tariff any of these systems issued.
84:     if (s.cost?.kind !== 'estimate' || !finite(s.cost.usd_per_1000) || s.cost.usd_per_1000 <= 0) fail(`labelled cost estimate ${s.key}`);
85:     if (typeof s.cost.basis !== 'string' || s.cost.basis.length < 80) fail(`documented cost basis ${s.key}`);
86:     const d = s.noul_decisive;
87:     if (!d || d.supported !== true || !Number.isInteger(d.n) || d.n !== 375 || !finite(d.decisive_rate)
88:         || !(finite(d.acc_among_decisive) || (d.acc_among_decisive === null && d.decisive === 0 && d.decisive_rate === 0))) fail(`noul decisiveness ${s.key}`);
89:   }
```

## /home/flori/jobs/jevbench-add-requests-20260919/r160/v170/build_publication_v170.py

```text
650:     for f in ('axes', 'scores', 'views', 'jevbench_score', 'capability', 'composite_ci95', 'intelligence', 'calibration', 'validity', 'cost', 'status', 'support'):
651:         if not same(off.get(f), fz.get(f)):
652:             fail(f'{k}: rule-off v1.7 scorer differs from the frozen v1.6 scorer in {f}')
653:     if not same(off['v16']['ci95'], fz['v16']['ci95']):
654:         fail(f'{k}: rule-off interval differs from the frozen scorer')
655:     if not same(sh['cost'], off['cost']) or not same(sh['axes']['cost'], off['axes']['cost']):
656:         fail(f'{k}: cost moved under the rule')
657:     if sh['axes']['calibration'] > off['axes']['calibration'] + 1e-9 or sh['axes']['intelligence'] > off['axes']['intelligence'] + 1e-9:
658:         fail(f'{k}: Calibration or Intelligence rose under the share rule')
659:     dl = cp(sh['decision_limit'])
660:     assert dl['limit_s'] == LIMIT_S and dl['treatment'] == 'share' and dl['rule'] == 'latency_s > limit -> failed' and dl['speed_basis'] == SPEED_BASIS
661:     assert 0 <= dl['n_over_limit_answered_ok'] <= dl['n_over_limit'] <= dl['speed_n'], k
662:     # the over-limit count of the raw, counted here without reading any item text (the latency field only)
663:     lat = [json.loads(l)['latency_s'] for l in open(raw['path']) if l.strip()]
664:     if len(lat) != dl['speed_n'] or sum(1 for x in lat if x > LIMIT_S) != dl['n_over_limit']:
665:         fail(f'{k}: the over-limit count of the raw differs from the scorer: {sum(1 for x in lat if x > LIMIT_S)} vs {dl["n_over_limit"]}')
666:     sp = sh['speed']
667:     assert sp['basis'] == SPEED_BASIS and sp['n'] == dl['speed_n']
668:     n_over_total += dl['n_over_limit']
669:     ci = sh['v16']['ci95']
670:     assert ci['B'] == 1000 and isinstance(ci['seed'], int) and (unpriced or same(ci['composite'], sh['composite_ci95'])), k
```

```text
689:     row['underlying'] = code_rev + (' ' if code_rev.rstrip().endswith(('.', ';', ':')) else '. ') + entry['disclosure']           # the mandatory disclosure verbatim, as v1.6.36 carried it
690:     assert entry['disclosure'] in row['underlying'] and row['licence'] == entry['licence'] and ('MANDATORY DISCLOSURE' in row['underlying'] or 'FIRST MEASUREMENT' in row['underlying'])
691:     row['cost']['basis'] = entry['cost_basis']
692:     fields = ('acc_among_decisive', 'decisive', 'decisive_rate', 'n', 'supported', 'valid')
693:     row['noul_decisive'] = {f: noul['rows'][k][f] for f in fields}
694:     if noul_off['rows'][k]['n'] != noul['rows'][k]['n']:
695:         fail(f'{k}: decisive item count moved under the rule')
696:     sib = next(c for c in chain_rows if (c.get('draw') or {}).get('id') == cfg['draw_id'])
697:     row['draw'] = {**cp(sib['draw']), 'release': REV, 'measured_on': cfg['measured_on']}
698:     if not same(row['draw'].get('g_med'), sh['v16']['g_med_used']):
699:         fail(f'{k}: the draw median differs from the row median')
700:     public_text_gate(k, row, new=True)
```

## /home/flori/DECISIONS.md

```text
1: ## 2026-10-28 17:3xZ — Release-owner rulings: oak1.1 licence, KnowLine R8C rows, Darwin, Strike-1 note (jevbench-add-requests-20260919 run 198)
2: - oak1.1 (PNPM244/oak1.1, CC BY-NC 4.0): ELIGIBLE as a normal intake row; licence stated on the row. Precedent Jeff-1.1-Medium (v1.7.8). Board #31761.
3: - KnowLine-4B-Gen5.5 + KnowLine-26B-A4B-Gen2.5 (handoff R8C #24630, 23 Oct): missed by the release lane; ship from handed-off aggregates (raws lost 26 Oct, #28569) with a raw-lost disclosure, subject to a feasibility check that every published field reproduces exactly; 26B runner PARTIAL flag accepted on the independent review. Custody concurs (#31755). Board #31728.
4: - Darwin-27B-ZTC: the 12 Oct private evaluation is not release-grade (no custody use, no PREREG, no determinism check); only as a new first use.
5: - Strike-1 (v1.7.16) gets its own 27 Oct-draw note without the 'anchors weaker than this row' clause.
6: prose-only: one-off decision
7: changes: none
8: resolved-keys: oak11-nc-eligible, knowline-r8c-ship-from-aggregates
```
