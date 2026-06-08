const config = require('../config');

let _client = null;

function getClient() {
  if (_client) return _client;

  if (config.ai.provider === 'anthropic') {
    const Anthropic = require('@anthropic-ai/sdk');
    _client = new Anthropic.default({ apiKey: config.ai.anthropicApiKey });
  } else {
    const OpenAI = require('openai');
    const openaiConfig = { apiKey: config.ai.openaiApiKey };
    if (config.ai.openaiApiBaseUrl) {
      openaiConfig.baseURL = config.ai.openaiApiBaseUrl;
    }
    _client = new OpenAI.default(openaiConfig);
  }

  return _client;
}

function extractOpenAIResponseText(response) {
  if (!response) return ''; 
  if (typeof response.output_text === 'string' && response.output_text.trim()) {
    return response.output_text.trim();
  }

  if (Array.isArray(response.output)) {
    for (const outputItem of response.output) {
      if (!outputItem || !Array.isArray(outputItem.content)) continue;
      for (const chunk of outputItem.content) {
        if (typeof chunk.text === 'string' && chunk.text.trim()) {
          return chunk.text.trim();
        }
      }
    }
  }

  return '';
}

/**
 * Send a prompt to the configured AI provider and return the text response.
 * @param {string} systemPrompt
 * @param {string} userMessage
 * @returns {Promise<string>}
 */
async function chat(systemPrompt, userMessage) {
  const provider = config.ai.provider;

  if (provider === 'anthropic') {
    const client = getClient();
    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });
    return message.content[0].text;
  }

  const client = getClient();
  const model = config.ai.openaiModel;

  if (config.ai.openaiApiBaseUrlRaw?.includes('/responses')) {
    const response = await client.responses.create({
      model,
      input: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    });

    const text = extractOpenAIResponseText(response);
    if (!text) {
      throw new Error('AI response was empty or could not be parsed.');
    }
    return text;
  }

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  });

  return completion.choices[0].message.content;
}

module.exports = { getClient, chat };
