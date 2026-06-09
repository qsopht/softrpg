const ai = require('../ai');

function extractJsonObject(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error('AI response did not contain a valid JSON object.');
  }
  return match[0];
}

function normalizeItemKey(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseCharacterProfile(rawResponse) {
  const jsonText = extractJsonObject(rawResponse);
  const parsed = JSON.parse(jsonText);

  // Ensure each item has a valid key based on its name if not provided
  const starterItems = Array.isArray(parsed.starterItems)
    ? parsed.starterItems.map((item) => ({
        key: item.key && typeof item.key === 'string' ? item.key : normalizeItemKey(item.name || ''),
        name: item.name || '',
        description: item.description || '',
      }))
    : [];

  return {
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
    personality: typeof parsed.personality === 'string' ? parsed.personality : '',
    starterItems,
  };
}

async function generateCharacterProfile({ name, jobTitle }) {
  const systemPrompt = `You are a sci-fi RPG assistant tasked with generating a starter player character from a tech engineering job title. Respond with valid JSON only and do not include any markdown or explanation.`;

  const userMessage = `Generate a character profile for the following player.

Name: ${name}
Job title: ${jobTitle}

Return exactly one JSON object with these fields:
- strengths: an array of 3 brief strengths.
- weaknesses: an array of 3 brief weaknesses.
- personality: a 1-2 sentence character personality description.
- starterItems: an array of exactly 3 tech-related starter items. Each item should be an object with key (based on the item name in lowercase with underscores), name, and description.

Example output:
{
  "strengths": ["...", "...", "..."],
  "weaknesses": ["...", "...", "..."],
  "personality": "...",
  "starterItems": [
    {"key": "laptop_debugger", "name": "Laptop Debugger", "description": "..."},
    {"key": "network_analyzer", "name": "Network Analyzer", "description": "..."},
    {"key": "docker_container", "name": "Docker Container", "description": "..."}
  ]
}`;

  const rawResponse = await ai.chat(systemPrompt, userMessage);
  return parseCharacterProfile(rawResponse);
}

module.exports = {
  generateCharacterProfile,
};
