# CR-415 — Von, GLiNER2, GLiNER2.5 multi cells; concrete reasons for blocked rows (board note v1.7.37)

- Von (395M, CPU) answered L3/L1/L2 and the S+P items it had not answered before (85 earlier answers kept), on a rented,
  network-cut machine with its pinned package (one added build-time helper, `editables` 0.6, needed by its build backend; no
  model or runtime change). Items that crash its server (over-length inputs) stay scored failures; 58 requests that hit the
  restarting server were never answered and are not re-asked. Minima: languages 65, topics 108, use cases 82.
- GLiNER2.5 multi and GLiNER2 (CPU, fp32, 4 threads, 32 GB per container as in the original profile) answered never-asked
  items in 60-item containers. Out-of-memory kills (12 of 36-47 chunks per row) and a machine shutdown at 09:12 UTC lost
  about 400 (multi) and 1,000 (GLiNER2) issued items; all stay counted as spent and are not re-asked.
  GLiNER2.5 multi: languages >= 61, topics >= 100, use cases >= 80. GLiNER2: topics >= 57, use cases >= 45, every language
  column filled (>= 42), but 22 languages are below the 60-item target; its note says so.
- Exceptions updated: Aplomb 1 (pinned Hugging Face revision deleted upstream; repository history rewritten), ClassOne Gemma 4
  E2B (supplement re-run agreed with its original public answers on only 87.7 %, below the 95 % bar). swanOne unchanged (HTTP 401).
- 168 of 177 listed rows meet all 27 radar spokes. Headline scores, Capability, Composite, ranks and prices are unchanged.
