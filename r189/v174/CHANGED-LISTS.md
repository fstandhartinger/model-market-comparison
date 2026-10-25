# v1.7.3 → v1.7.4 top-five comparison

The exact site assembly checks the same 40 lists as v1.7.3. Two change:
- open/capability/official_caps
- open/capability/latency_none

Both become H2O-Lightning-31B, basal-omni-1.0-ultra, DOPEST 1.0 (31B), Arcbright Elf 1 31B, Quyet-1.0-Large. DOPEST enters #3; Jeff-1.0-Large leaves. The Capability-vs-cost and Capability-vs-speed chart labels use this official set and change identically. No all-scope or API top five changes.

The 252 supplementary lists retained from v1.7.3 have ten changes, listed exactly in receipts/topfive-extended.json. Frozen/off: open/official Capability and Intelligence. Share: open/official Capability and Intelligence, open/official and open/none Intelligence-only and Capability-only weighting. Capability-only is computed with the actual site jevV15BoardScore function (harmonic Intelligence/Calibration with all gates always applied), not the arithmetic Capability headline. DOPEST enters both share weighting presets #5 when uncapped; the displaced row is Arcbright for Intelligence-only and decisio-gemma-4-31b-v080 for Capability-only. Capped supplementary axis lists are separate analytical subsets, not extra site UI buttons.

Slider boundaries use the production jevClassRows classifier at every cost/latency admission breakpoint in the 1x–10x range, plus no cap; the other slider is held separately at 1.01x, 2x and no cap. All 101 transition states and 13 changed states appear in receipts/topfive-sliders.json. With the other cap at official 2x:
- Cost in [1.5286882582703472, 2.8844247832132495): DOPEST #3. The displaced fifth changes at 2.504684198551258 from Jeff to Jeffan.
- Cost in [2.8844247832132495, 3.208708735888577): DOPEST #4; Quyet leaves.
- Cost in [3.208708735888577, 6.358539901039681): DOPEST #5; Arcbright leaves.
- Cost below the admission boundary or at/above 6.358539901039681, including no cap: no top-five change.
- Latency from 1.009119522300493 through 10x and no cap: DOPEST #3, Jeff leaves. Below that boundary it is excluded.

Custom weights can reach the changed top five (the named weighting presets are concrete examples). Arbitrary simultaneous slider pairs and arbitrary global subfilters are not claimed exhaustively enumerated; the classifier and unchanged global filters apply normally. Exact numerical boundaries supersede prescore rounded ranges. This is an internal review preview, not an author message or publication receipt.
