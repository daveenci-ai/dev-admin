import OpenAI from 'openai'

type UseCase = 'BLOG' | 'CASE' | 'AVATAR' | 'CHATBOT' | 'RESEARCH' | 'DEFAULT'

export function getOpenAIClient(useCase: UseCase = 'DEFAULT') {
  const keyMap: Record<UseCase, string | undefined> = {
    BLOG: process.env.OPENAI_API_KEY_BLOG,
    CASE: process.env.OPENAI_API_KEY_CASE,
    AVATAR: process.env.OPENAI_API_KEY_AVATAR,
    CHATBOT: process.env.OPENAI_API_KEY_CHATBOT,
    RESEARCH: process.env.OPENAI_API_KEY_RESEARCH,
    DEFAULT: process.env.OPENAI_API_KEY,
  }
  const apiKey = keyMap[useCase] || process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error(`Missing OpenAI API key for use case ${useCase}. Set OPENAI_API_KEY_${useCase} or OPENAI_API_KEY`)
  }
  return new OpenAI({ apiKey })
}

export const OpenAIModels = {
  // Standardize on ChatGPT only (no Gemini). Use nano tier by default.
  visionPreferred: 'chatgpt-5-mini',
  visionFallback: 'chatgpt-5-mini',
  textPreferred: 'chatgpt-5-mini',
  textFallback: 'chatgpt-5-mini',
  // Per-use-case explicit (all use nano unless overridden explicitly elsewhere)
  BLOG_TEXT: 'chatgpt-5',
  USE_CASE_TEXT: 'chatgpt-5',
  AVATAR_TEXT: 'chatgpt-5-mini',
  CHATBOT_TEXT: 'chatgpt-5-nano',
} as const

export function getModelFor(
  useCase: 'BLOG' | 'USE_CASE' | 'AVATAR' | 'CHATBOT' | 'RESEARCH',
  kind: 'TEXT' | 'VISION' = 'TEXT'
): string {
  if (kind === 'VISION') return OpenAIModels.visionPreferred
  switch (useCase) {
    case 'BLOG':
      return OpenAIModels.BLOG_TEXT
    case 'USE_CASE':
      return OpenAIModels.USE_CASE_TEXT
    case 'AVATAR':
      return OpenAIModels.AVATAR_TEXT
    case 'CHATBOT':
      return OpenAIModels.CHATBOT_TEXT
    case 'RESEARCH':
      return OpenAIModels.textPreferred
  }
}


