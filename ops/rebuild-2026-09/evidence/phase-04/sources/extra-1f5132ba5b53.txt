# SlopBench

Measuring AI slop.

**[slop-bench.vercel.app](https://slop-bench.vercel.app)** · Built by [@DanJCleary](https://x.com/DanJCleary)

---

## What is slop?

- Sycophantic openers ("Great question!", "You're absolutely right")
- Buzzwords and filler ("leverage", "delve", "transformative", "nuanced")
- Hedge phrases ("it's important to note", "it depends on your unique situation")
- Reframe constructions ("X isn't about Y, it's about Z")
- Validation of whatever the user just said before answering

SlopBench runs 53 chat-style prompts, scores each response for slop patterns, and reports the percentage of outputs containing classic AI slop.

## How scoring works

Each response is checked against a list of known slop patterns across multiple categories. The **Slop Rate** is the percentage of responses that contained at least one hit. Lower is better.

Scoring is deterministic and runs locally — no LLM-as-judge. See `scripts/scoring.ts` for the full detection logic and `data/sloplist.json` for the pattern list.

## Running the benchmark

```bash
# Install dependencies
npm install

# Run against any OpenRouter model
npm run bench openai/gpt-4o-mini

# Clear all data
npx tsx scripts/clear.ts
```

You'll need a `.env.local` file with:

```
VITE_CONVEX_URL=your_convex_url
OPENROUTER_API_KEY=your_openrouter_key
BENCHMARK_SECRET=your_secret_key
```

The `BENCHMARK_SECRET` is used to authenticate benchmark runs. Generate a random string (e.g., `openssl rand -hex 32`) and set it both in `.env.local` and in your Convex dashboard (Settings → Environment Variables → `BENCHMARK_SECRET`).

## Contributing

The most valuable contribution is expanding the slop pattern list. If you've noticed an AI phrase that makes you cringe and it's not in `data/sloplist.json`, open a PR or file an issue. That's the core of what makes this benchmark better over time.
