const crypto = require('crypto');
const { chat } = require('../ai');

async function createRandomIncident() {
  const systemPrompt = `You are a generator of realistic technical incidents for software engineers and tech analysts.
Generate a single incident that a typical tech professional would encounter in their work.
The incident should be plausible, specific, and solvable.

Respond with ONLY a JSON object (no markdown, no extra text) in this exact format:
{
  "title": "Brief incident title (5-10 words)",
  "description": "1-2 sentence description of what happened and its impact",
  "tags": ["tag1", "tag2", "tag3"]
}

Common incident categories: performance issues, infrastructure failures, security vulnerabilities, integration problems, database issues, deployment issues, monitoring alerts, scaling problems, dependency issues, configuration errors.`;

  const userMessage = 'Generate a realistic technical incident that needs to be resolved.';

  try {
    const response = await chat(systemPrompt, userMessage);
    
    // Parse the JSON response
    const incident = JSON.parse(response);
    const now = new Date().toISOString();

    return {
      id: crypto.randomUUID(),
      title: incident.title,
      description: incident.description,
      tags: incident.tags || [],
      status: 'OPEN',
      createdAt: now,
    };
  } catch (error) {
    console.error('Failed to generate incident via AI:', error);
    // Fallback to a generic incident if AI fails
    const now = new Date().toISOString();
    return {
      id: crypto.randomUUID(),
      title: 'System Error Detected',
      description: 'An unexpected error occurred that requires investigation and resolution.',
      tags: ['error', 'investigation'],
      status: 'OPEN',
      createdAt: now,
    };
  }
}

function resolveIncident(characterId) {
  return null;
}

module.exports = {
  createRandomIncident,
  resolveIncident,
};
