# dev-admin

## Content Scheduling (LLM powered)

- Blog posts: generate at most one per week using GPT‑5 via `getOpenAIClient('BLOG')` and model `gpt-5`.
- Use cases: generate at most one every 2 weeks using GPT‑5 via `getOpenAIClient('CASE')` and model `gpt-5`.
- Avatar prompt optimizer: uses `gpt-5-nano` for fast/cheap prompt variants.

Environment variables:
- `OPENAI_API_KEY` (fallback), `OPENAI_API_KEY_BLOG`, `OPENAI_API_KEY_CASE`, `OPENAI_API_KEY_AVATAR`.
