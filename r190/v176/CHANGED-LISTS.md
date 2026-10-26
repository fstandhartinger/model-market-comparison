# v1.7.5 → v1.7.6 top-five comparison

Primary changes: 2/40. Supplementary changes: 24/540. Single-slider changed states: 26/178.

Open composites A and C add the new Decisio row at #5, displacing Chon-1.0-E4B and Decisio Gemma 4 31B v0.8.0 respectively. Every changed list and recorded slider state is listed below. API lists are unchanged. This finite domain does not exhaust arbitrary custom weights, simultaneous slider combinations or subfilters.

| Variant | Scope | Caps | Metric | New position | Leaves top five |
|---|---|---|---|---:|---|
| frozen | open | official | A | 5 | chon-1.0-e4b |
| frozen | open | official | C | 5 | decisio-gemma-4-31b-v080 |
| frozen | open | none | A | 5 | chon-1.0-e4b |
| frozen | open | none | C | 5 | decisio-gemma-4-31b-v080 |
| frozen | open | cost1.4 | A | 5 | chon-1.0-e4b |
| frozen | open | cost1.4 | C | 5 | decisio-gemma-4-31b-v080 |
| frozen | open | cost1.5 | A | 5 | chon-1.0-e4b |
| frozen | open | cost1.5 | C | 5 | decisio-gemma-4-31b-v080 |
| off | open | official | A | 5 | chon-1.0-e4b |
| off | open | official | C | 5 | decisio-gemma-4-31b-v080 |
| off | open | none | A | 5 | chon-1.0-e4b |
| off | open | none | C | 5 | decisio-gemma-4-31b-v080 |
| off | open | cost1.4 | A | 5 | chon-1.0-e4b |
| off | open | cost1.4 | C | 5 | decisio-gemma-4-31b-v080 |
| off | open | cost1.5 | A | 5 | chon-1.0-e4b |
| off | open | cost1.5 | C | 5 | decisio-gemma-4-31b-v080 |
| share | open | official | A | 5 | chon-1.0-e4b |
| share | open | official | C | 5 | decisio-gemma-4-31b-v080 |
| share | open | none | A | 5 | chon-1.0-e4b |
| share | open | none | C | 5 | decisio-gemma-4-31b-v080 |
| share | open | cost1.4 | A | 5 | chon-1.0-e4b |
| share | open | cost1.4 | C | 5 | decisio-gemma-4-31b-v080 |
| share | open | cost1.5 | A | 5 | chon-1.0-e4b |
| share | open | cost1.5 | C | 5 | decisio-gemma-4-31b-v080 |

Custom-weight witness I:C:S:Cost = 0:50:10:5 puts Decisio #4 on v1.7.5, displacing vllm-sr-d3-mini. Prescore used v1.7.4 (#3, before Sieve joined). Fresh witness I:C:S:Cost = 10:60:0:20 places Decisio #3 against v1.7.5. All 368 explicit cost/latency grid states match positions #2/#2/#3/#4 at cost 1.0/1.1/1.2/1.3×.

## Changed slider states

| Scope | Slider | Other cap | From inclusive | New position |
|---|---|---|---|---:|
| open | cost | 1 | 1 | 2 |
| open | cost | 1 | 1.1710218227785338 | 3 |
| open | cost | 1 | 1.2647065529661647 | 4 |
| open | cost | 1 | 1.3408990087449124 | 5 |
| open | cost | 1.01 | 1 | 2 |
| open | cost | 1.01 | 1.1710218227785338 | 3 |
| open | cost | 1.01 | 1.2647065529661647 | 4 |
| open | cost | 1.01 | 1.3408990087449124 | 5 |
| open | cost | 1.4 | 1 | 2 |
| open | cost | 1.4 | 1.1710218227785338 | 3 |
| open | cost | 1.4 | 1.2647065529661647 | 4 |
| open | cost | 1.4 | 1.3408990087449124 | 5 |
| open | cost | 1.5 | 1 | 2 |
| open | cost | 1.5 | 1.1710218227785338 | 3 |
| open | cost | 1.5 | 1.2647065529661647 | 4 |
| open | cost | 1.5 | 1.3408990087449124 | 5 |
| open | cost | 2 | 1 | 2 |
| open | cost | 2 | 1.1710218227785338 | 3 |
| open | cost | 2 | 1.2647065529661647 | 4 |
| open | cost | 2 | 1.3408990087449124 | 5 |
| open | cost | none | 1 | 2 |
| open | cost | none | 1.1710218227785338 | 3 |
| open | cost | none | 1.2647065529661647 | 4 |
| open | cost | none | 1.3408990087449124 | 5 |
| open | latency | 1 | 1 | 2 |
| open | latency | 1.01 | 1 | 2 |
