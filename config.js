const HABR_CONFIG = {
  activePatterns: [
    '/feed/',
    '/feed/page',
    '/articles/',
    '/articles/page',
    '/news/',
    '/news/page',
    '/posts/',
    '/posts/page',
    '/packs/daily'
  ],

  defaults: {
    enabled: false,
    tagsEnabled: false,
    hiddenTags: 'agents, AI, ai coding, ai-agent, claude code, codex, genai-платформа, LLM, llm-агент, llm-модели, Moonshot AI, multi-agent, Nano Banana, rag, агенты, вайб кодинг, ИИ, искусственный интеллект, промпт-инжиниринг',
    titlesEnabled: false,
    hiddenTitles: 'AI-агент, AI-ассистент, Anthropic, Banana, ChatGPT, Claude, Codex, Copilot, Cursor, Deepseek, Gemini, Gemma, genai, GigaChat, GPT, Grok, Jev, Kimi, Kodacode, Manus, MCP, MiniMax, Mistral, Moonshot, NemoClaw, Ollama, OpenAI, OpenClaw, Qwen, Qwen3, RAG, VLM, xAI, вайб-кодинг, вайбкодинг, ИИ-агент, ИИ-агенты, ИИ-ассистент, инференс',
    invertEnabled: false,
    mlEnabled: true,
    mlThreshold: 0.85,
    mlVetoThreshold: 0.15,
    mlModel: null,
    mlDebug: false
  },

  isSupportedPage: function(url) {
    if (!url || !url.includes('habr.com')) return false;

    const isSingleArticle = /\/(articles|news|posts)\/\d+\/$/.test(url);
    if (isSingleArticle) return false;

    return this.activePatterns.some(p => url.includes(p));
  }
};
