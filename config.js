const HABR_CONFIG = {
  activePatterns: [
    '/feed/',
    '/feed/page',
    '/articles/',
    '/articles/page',
    '/news/',
    '/news/page',
    '/posts/',
    '/posts/page'
  ],

  defaults: {
    enabled: true,
    tagsEnabled: false,
    hiddenTags: 'agents, AI, ai coding, ai-agent, claude code, genai-платформа, LLM, llm-агент, llm-модели, Moonshot AI, multi-agent, Nano Banana, агенты, вайб кодинг, ИИ, искусственный интеллект, промпт-инженеринг',
    titlesEnabled: false,
    hiddenTitles: 'AI-агент, AI-ассистент, Anthropic, Banana, ChatGPT, Claude, Copilot, Cursor, Deepseek, Gemini, genai, GigaChat, GPT, Grok, Harvicode, Kodacode, Manus, MiniMax, Mistral, Moonshot, NemoClaw, OpenAI, OpenClaw, Qwen, Qwen3, xAI, вайб-кодинг, вайбкодинг, ИИ-агент, ИИ-агенты, ИИ-ассистент',
    invertEnabled: false
  },

  isSupportedPage: function(url) {
    if (!url || !url.includes('habr.com')) return false;

    const isSingleArticle = /\/(articles|news|posts)\/\d+\/$/.test(url);
    if (isSingleArticle) return false;

    return this.activePatterns.some(p => url.includes(p));
  }
};
