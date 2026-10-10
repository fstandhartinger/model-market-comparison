# CR-413 — complete language/category cells for six more rows (board note v1.7.36)

- Diffusion Jev and SPX-CD-Omni: supplements L1/L2/L3 with their original pinned setup; public-item (P300) agreement with
  the original runs 97.7 % (Diffusion Jev) and 99.0 % (SPX-CD-Omni). Long-input refusals stay scored as before.
- Historical rows Jobe Qwen3.5-4B, AutoJev-27B (RTX PRO 6000), NInfer Qwen3.8-27B NVFP4 (T=1.5) and OpenJev razorback16:
  they keep their v1.5 headlines. They had no run on the current pools, so each answered S+P (1,500) and the supplements
  with the original pinned recipe on a rented, network-cut machine. Agreement between their own S+P and supplement passes on
  the public items: Jobe and NInfer 100 %, AutoJev 98-100 %, razorback16 86-89 % (stochastic diffusion decoding; disclosed in
  its coverage note).
- Recipe notes: NInfer's image used its 27B sibling's build check (tolerates only the driver-injected libcuda.so.1) and
  NVIDIA_DISABLE_REQUIRE=1; razorback16 ran with the author's GPU-memory knob at 0.80 instead of 0.90 (KV cache size only).
- Minima per row: languages 65 (23), topics 109 (7), use cases 83 (20). 162 of 177 listed rows meet all 27 radar spokes.
- Headline scores, Capability, Composite, ranks and prices are unchanged.
