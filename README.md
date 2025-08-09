# dev-admin

## Content Scheduling (LLM powered)

- Blog posts: generate at most one per week using ChatGPT via `getOpenAIClient('BLOG')` and model `chatgpt-5-nano`.
- Use cases: generate at most one every 2 weeks using ChatGPT via `getOpenAIClient('CASE')` and model `chatgpt-5-nano`.
- Avatar prompt optimizer: uses `chatgpt-5-nano` for fast/cheap prompt variants.

Environment variables:
- `OPENAI_API_KEY` (fallback), `OPENAI_API_KEY_BLOG`, `OPENAI_API_KEY_CASE`, `OPENAI_API_KEY_AVATAR`.
