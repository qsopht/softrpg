const ai = require('../ai');

function extractJsonObject(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error('AI response did not contain a valid JSON object.');
  }
  return match[0];
}

function parseCharacterProfile(rawResponse) {
  const jsonText = extractJsonObject(rawResponse);
  const parsed = JSON.parse(jsonText);

  return {
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
    personality: typeof parsed.personality === 'string' ? parsed.personality : '',
    starterEquipment: Array.isArray(parsed.starterEquipment) ? parsed.starterEquipment : [],
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
- starterEquipment: an array of 2-3 tech-related starter equipment items. Each item should be an object with name and description.

Example output:
{
  "strengths": ["...", "...", "..."],
  "weaknesses": ["...", "...", "..."],
  "personality": "...",
  "starterEquipment": [
    {"name": "...", "description": "..."}
  ]
}`;

  const rawResponse = await ai.chat(systemPrompt, userMessage);
  return parseCharacterProfile(rawResponse);
}

module.exports = {
  generateCharacterProfile,
};
