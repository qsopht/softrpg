require('dotenv').config();

function normalizeOpenAIBaseUrl(value) {
  if (!value) return value;
  return value.replace(/\/responses\/?$/i, '').replace(/\/$/, '');
}

const openaiBaseUrlRaw = process.env.OPENAI_API_BASE_URL || process.env.LLM_ENDPOINT;

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  sessionSecret: process.env.SESSION_SECRET,
  ai: {
    provider: process.env.AI_PROVIDER || 'openai',
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiApiBaseUrlRaw: openaiBaseUrlRaw,
    openaiApiBaseUrl: normalizeOpenAIBaseUrl(openaiBaseUrlRaw),
    openaiModel: process.env.OPENAI_MODEL || process.env.LLM_MODEL || 'gpt-4o',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  },
};
