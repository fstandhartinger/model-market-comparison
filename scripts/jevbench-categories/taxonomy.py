"""Fixed label sets. TOPICS = the v1.2 subject topics (datasets/TOPICS.md, 19 Sep 2026), unchanged.
USE_CASES = the TypeSafe use-case map (docs.typesafe.ai/concepts/use-case-map, read 1 Oct 2026) + Other."""
TOPICS = [
    ("math", "Math & numbers", "a calculation decides the answer: arithmetic, word problems, probability, dates, units"),
    ("coding", "Coding & software", "code, SQL, repositories, developer tools and IT systems"),
    ("law_policy", "Rules, policy & law", "applying written rules: company policies, contracts, regulations, eligibility"),
    ("finance_commerce", "Finance & commerce", "money: payments, refunds, invoices, orders, expenses, insurance payouts"),
    ("support_ops", "Support & operations", "support tickets, incidents, logistics, scheduling desks and routing work to a team"),
    ("everyday_language", "Everyday language", "short everyday messages: intents, assistant requests, reading a detail out of a text"),
    ("safety_security", "Safety & security", "untrusted or injected instructions, fraud, moderation, access and security triage"),
]
USE_CASES = [
    ("search_retrieval", "Search and retrieval", "scoring query-to-candidate relevance, reranking results, selecting useful context for RAG"),
    ("scientific_discovery", "Scientific discovery", "screening papers, labelling research passages or survey answers, checking that citations support claims, methodology checks"),
    ("model_routing", "Model routing", "deciding which LLM or model tier should handle a prompt; classifying a request's intent, domain, difficulty or risk to pick a model"),
    ("llm_guardrails", "LLM guardrails", "checking LLM inputs, outputs and tool calls: prompt injection, jailbreaks, policy violations, tool-call errors, answer quality"),
    ("code_linting", "Semantic code linting", "checking code or writing against conventions and guidelines, as in CI review of code"),
    ("feature_extraction", "Feature extraction for predictive modeling", "turning natural-language data into probabilistic features or estimates for a downstream prediction"),
    ("recruiting", "Recruiting", "resumes, applications, interview feedback, matching candidates to roles"),
    ("lead_generation", "Lead generation", "matching companies or inbound messages to an ideal customer profile, buyer intent, prioritising and routing sales leads"),
    ("customer_support", "Customer support", "classifying tickets and customer intents, urgency, refunds, routing cases to a team, checking support replies"),
    ("insurance_claims", "Insurance claims", "first-notice-of-loss reports, claim complexity, missing information, claim triage"),
    ("financial_crime", "Financial crime", "suspicious transactions, KYC, fraud alerts, entity matching for investigations"),
    ("legal_compliance", "Legal and compliance", "contracts, policies, regulations, eligibility rules, checking documents against written requirements"),
    ("ecommerce", "E-commerce marketplaces", "product listings, product attributes, orders and deliveries, seller catalog policy"),
    ("moderation", "Moderation and trust and safety", "user content moderation: toxicity, harassment, spam, unsafe advice, personal data exposure"),
    ("advertising", "Advertising", "ad creatives, campaign copy, brand safety, prohibited claims in ads"),
    ("gaming", "Gaming", "player reports, in-game chat, game support"),
    ("risk_assessment", "Risk assessment", "estimating probabilities and severity of risks, incidents, vendor or underwriting risk"),
    ("demand_forecasting", "Demand forecasting", "purchase intent, product interest, demand and supply signals for forecasting"),
    ("knowledge_graphs", "Graphs and knowledge graphs", "entity types, relationships between records, contradictions between facts, multi-step lookups across linked facts"),
    ("other", "Other", "none of the above: general reasoning, arithmetic or date puzzles, everyday assistant requests without a business workflow"),
]
