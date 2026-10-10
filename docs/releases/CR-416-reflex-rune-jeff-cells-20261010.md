# CR-416 — reflex-27b, Surogate Rune A2, jeff cells (board note v1.7.38)

- reflex-27b: its earlier v1.6 S+P attempt stopped after 269 items (provider-side "request too large" errors on an 80 GB GPU).
  The remaining 1,231 S+P items and all supplements were answered on a 96 GB RTX PRO 6000 with the same pinned model and
  serving package; the 269 earlier answers (4 failures) are kept, never re-asked.
- Surogate Rune 26B-A4B v3 (RTX PRO 6000): supplements L1/L2/L3 added to its complete 6 Oct S+P run on the same pinned
  GGUF and patched engine; the 3 long public items it refuses are refused in every pool.
- jeff (GLiFormer 400M, CPU): answered S+P and the supplements with its pinned package on a rented, network-cut CPU machine,
  split into parallel shards; each item once.
- Public-item agreement between each row's S+P and supplement passes: 100 %. Minima per row: languages 65, topics 109,
  use cases 83. 171 of 177 listed rows meet all 27 radar spokes.
- Headline scores, Capability, Composite, ranks and prices are unchanged.
