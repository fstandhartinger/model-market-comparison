Static preparation contract for the fixed first-party API dispatcher

Emit exactly MEASUREMENT-META.json, RUNTIME.json and PRICING-REVIEW.md as text files.
The first two objects map exactly the host-ordered benchmark names to the following data.
Never include a credential, prediction, result score, reference path or executable script.

JevBench metadata:
{"system_key":"stable_public_key","system":{"support":{"choice":"native","noul":"native","score":"native"},"endpoint_kind":"api","price_in_per_m":1.0,"price_out_per_m":1.0,"price_kind":"public","cost_basis":"Verified public bookable tariff; cite the actual source and date"}}
The prices above are placeholders, never usable prices. The scorer support enum is exactly
"native", "label", or "unsupported". Use "native" for supported full probability maps,
including OpenRouter verbalized probabilities, as in the official generic-LLM registrations.
The separate raw probs_source="verbalized" field records how those probabilities were obtained;
it is never a support enum value. No requested type may be falsely declared supported.
price_in_per_m and price_out_per_m are USD per million returned usage tokens. Both are required;
no free tier, hypothetical tariff, author announcement or undocumented per-decision override.
The aggregate uses measured input/output usage over every raw row. Unknown/missing usage or
public price evidence is an operational blocker, not a free cost score.

ImageJevBench metadata:
{"system_key":"stable_public_key","system":{"kind":"api"}}
The fixed Image API driver uses OpenRouter usage.cost receipts; no evaluator-supplied cost
override enters that scorer. The pinned Image scorer source defines all aggregate fields.

Each RUNTIME.json value is:
{"backend":"openrouter","credential":"openrouter","model":"provider/model-id","price_input_per_m":1.0,"price_output_per_m":1.0}
Again replace price placeholders only with proven public tariffs; these must match the text
metadata tariff. The native text alternative has backend "typesafe", an HTTPS origin in
endpoint, a model identifier and credential "none" or "request". Request credentials are
host-only JSON intake data, never part of this packet. OpenRouter is fixed to its official
API URL, data_collection=deny, zdr=true, allow_fallbacks=false; optional reasoning is one of
low/medium/high. No caller can override request messages, provider policy or endpoint.

Unsupported GPU/open-weight runtimes, unavailable public tariff evidence or an uncertain
model identity must emit {"backend":"unsupported"} for the affected runtime and describe
the exact evidence gap in PRICING-REVIEW.md. Do not guess a tariff or change the promised
payment-time deadline. The host records an operational handoff, preserving the 48h clock.
Our generated configuration failures never count as a customer-source refusal.

The separate static reviewer verifies source pins, endpoint/model identity, public tariff
evidence, agreement between runtime and scoring metadata, type support and fixed method
compatibility. A PASS applies only to those exact hashes. The host executes exclusively its
repository-owned API driver; it never executes the customer or generated adapter source.
