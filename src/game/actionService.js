const ai = require('../ai');
const { getCharacter, updateCharacter } = require('./characterService');
const { getCurrentCrisis, updateCrisis } = require('./crisisService');

function calculateStaminaCost(text, type) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean).length;
  const base = 12;
  const extra = Math.ceil(Math.max(0, words - 8) / 6) * 5;
  const typePenalty = type === 'boss' ? 5 : type === 'action' ? 2 : 0;
  return Math.min(40, base + extra + typePenalty);
}

function buildActionPrompt(type, crisis, details) {
  const actionLabel = type === 'boss' ? 'boss encounter' : type === 'action' ? 'action' : 'crisis event';
  return `You are a software engineering RPG assistant. A player is handling a current crisis:\n\nTitle: ${crisis.title}\nDescription: ${crisis.description}\n\nThe player chose a ${actionLabel}.\nAction details: ${details}\n\nRespond as a game-world narrative that describes whether this action helps solve the crisis, and make it feel grounded in incident response, deployment operations, or system reliability. Keep the answer concise and in plain text.`;
}

function computeRelevance(crisis, details) {
  const targetText = `${crisis.title} ${crisis.description}`.toLowerCase();
  const words = String(details || '').toLowerCase().split(/\W+/).filter(Boolean);
  if (!words.length) return 0;

  const uniqueWords = Array.from(new Set(words));
  const matched = uniqueWords.filter((word) => targetText.includes(word));
  return Math.min(1, matched.length / Math.max(4, uniqueWords.length));
}

function calculateCrisisDelta(relevance) {
  if (relevance >= 0.5) {
    return Math.round(relevance * 25) + 5;
  }
  if (relevance >= 0.2) {
    return Math.round(relevance * 12) + 1;
  }
  return -Math.round((0.2 - relevance) * 20) - 5;
}

async function performAction({ characterId, type, details }) {
  const character = getCharacter(characterId);
  if (!character) {
    return { error: 'Player character not found.' };
  }

  const crisis = getCurrentCrisis();
  const normalizedType = String(type || 'action').trim().toLowerCase();
  if (!['crisis', 'boss', 'action'].includes(normalizedType)) {
    return { error: 'Unsupported action type.' };
  }

  const safeDetails = String(details || '').trim() || `A deliberate ${normalizedType} in the software engineering world.`;
  const cost = calculateStaminaCost(safeDetails, normalizedType);

  if (character.stamina.current < cost) {
    return {
      error: 'Not enough stamina to perform that action.',
      stamina: { current: character.stamina.current, max: character.stamina.max },
      cost,
      crisis,
    };
  }

  const systemPrompt = buildActionPrompt(normalizedType, crisis, safeDetails);
  const response = await ai.chat(systemPrompt, safeDetails);

  const relevance = computeRelevance(crisis, safeDetails);
  const delta = calculateCrisisDelta(relevance);
  const updatedCrisis = updateCrisis({ percentageSolved: crisis.percentageSolved + delta });

  const updatedCharacter = updateCharacter(characterId, {
    stamina: {
      current: Math.max(0, character.stamina.current - cost),
      max: character.stamina.max,
      lastUpdated: new Date().toISOString(),
    },
  });

  const narration = `${response.trim()}\n\nAction relevance: ${Math.round(relevance * 100)}% — solved ${delta >= 0 ? 'up' : 'down'} by ${Math.abs(delta)}%.`;

  return {
    response: narration,
    stamina: updatedCharacter.stamina,
    crisis: updatedCrisis,
    cost,
    relevance,
    delta,
  };
}

module.exports = {
  performAction,
};