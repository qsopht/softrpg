const ai = require('../ai');
const { getCharacter, updateCharacter } = require('./characterService');
const { getCurrentCrisis, updateCrisis } = require('./crisisService');
const {
  onIncidentResolved,
  onIncidentFailed,
  onCrisisActionFailed,
  getMetrics,
} = require('./worldStateService');
const { broadcastEvent } = require('../routes/events');

function calculateStaminaCost(text, type) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean).length;
  const base = 12;
  const extra = Math.ceil(Math.max(0, words - 8) / 6) * 5;
  const typePenalty = type === 'boss' ? 5 : type === 'action' ? 2 : 0;
  return Math.min(40, base + extra + typePenalty);
}

function buildActionPrompt(type, crisis, details, usedItem = null) {
  const actionLabel = type === 'boss' ? 'boss encounter' : type === 'action' ? 'action' : 'crisis event';
  let prompt = `You are a software engineering RPG assistant. A player is handling a current crisis:\n\nTitle: ${crisis.title}\nDescription: ${crisis.description}\n\nThe player chose a ${actionLabel}.\nAction details: ${details}`;
  
  if (usedItem) {
    prompt += `\n\nThe player is also using an item: ${usedItem.name} (${usedItem.description})`;
  }
  
  prompt += `\n\nRespond as a game-world narrative that describes whether this action helps solve the crisis, and make it feel grounded in incident response, deployment operations, or system reliability. Keep the answer concise and in plain text.`;
  return prompt;
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
  if (!['crisis', 'boss', 'action', 'incident'].includes(normalizedType)) {
    return { error: 'Unsupported action type.' };
  }

  // Handle incident resolution separately
  if (normalizedType === 'incident') {
    return performIncidentAction({ character, characterId, details });
  }

  // Parse -useitem from details for non-incident actions
  const itemMatch = String(details || '').match(/-useitem\s+["']?(\w+)["']?/i);
  let usedItem = null;
  let actionText = String(details || '').trim();

  if (itemMatch) {
    const itemKey = itemMatch[1];
    usedItem = (character.starterItems || []).find((item) => item.key === itemKey);
    if (!usedItem) {
      return {
        error: `Item not found: ${itemKey}`,
        stamina: { current: character.stamina.current, max: character.stamina.max },
        crisis,
      };
    }
    // Remove the -useitem part from action text
    actionText = actionText.replace(/-useitem\s+["']?\w+["']?/i, '').trim();
  }

  const safeDetails = actionText || `A deliberate ${normalizedType} in the software engineering world.`;
  const cost = calculateStaminaCost(safeDetails, normalizedType);

  if (character.stamina.current < cost) {
    return {
      error: 'Not enough stamina to perform that action.',
      stamina: { current: character.stamina.current, max: character.stamina.max },
      cost,
      crisis,
    };
  }

  const systemPrompt = buildActionPrompt(normalizedType, crisis, safeDetails, usedItem);
  const response = await ai.chat(systemPrompt, safeDetails);

  let relevance = computeRelevance(crisis, safeDetails);
  
  // Boost relevance if item is used and relevant to crisis
  if (usedItem) {
    const itemRelevance = computeRelevance(crisis, `${usedItem.name} ${usedItem.description}`);
    relevance = Math.min(1, relevance + itemRelevance * 0.3);
  }

  const delta = calculateCrisisDelta(relevance);
  const updatedCrisis = updateCrisis({ percentageSolved: crisis.percentageSolved + delta });

  // A /crisis action with a negative delta means the player made things worse —
  // reliability takes the hit.
  if (normalizedType === 'crisis' && delta < 0) {
    onCrisisActionFailed();
    broadcastEvent('world-status', { metrics: getMetrics() });
  }

  // Calculate experience based on relevance (0-100 per action, up to 150 with item bonus)
  let experienceGained = Math.round(relevance * 100);
  if (usedItem) {
    const itemRelevance = computeRelevance(crisis, `${usedItem.name} ${usedItem.description}`);
    experienceGained += Math.round(itemRelevance * 50);
  }

  const charUpdate = {
    stamina: {
      current: Math.max(0, character.stamina.current - cost),
      max: character.stamina.max,
      lastUpdated: new Date().toISOString(),
    },
    level: character.level || 1,
    experience: (character.experience || 0) + experienceGained,
  };

  // Level up if experience >= 1000
  while (charUpdate.experience >= 1000) {
    charUpdate.level += 1;
    charUpdate.experience -= 1000;
  }

  // Remove used item from inventory
  if (usedItem) {
    charUpdate.starterItems = (character.starterItems || []).filter((item) => item.key !== usedItem.key);
  }

  const updatedCharacter = updateCharacter(characterId, charUpdate);

  const itemUsedNote = usedItem ? `\nUsed item: [${usedItem.key}] ${usedItem.name}` : '';
  const narration = `${response.trim()}${itemUsedNote}\n\nAction relevance: ${Math.round(relevance * 100)}% — solved ${delta >= 0 ? 'up' : 'down'} by ${Math.abs(delta)}%.`;

  const levelUpNote = charUpdate.level > (character.level || 1) ? `\n\n🎉 Level UP! You are now level ${charUpdate.level}!` : '';

  return {
    response: narration + levelUpNote,
    stamina: updatedCharacter.stamina,
    level: updatedCharacter.level,
    experience: updatedCharacter.experience,
    crisis: updatedCrisis,
    cost,
    relevance,
    delta,
    experienceGained,
    usedItem: usedItem ? { key: usedItem.key, name: usedItem.name } : null,
  };
}

async function performIncidentAction({ character, characterId, details }) {
  const incident = character.currentIncident;
  if (!incident) {
    return { error: 'No active incident.' };
  }

  const safeDetails = String(details || '').trim() || 'Attempting to resolve the incident.';
  const cost = calculateStaminaCost(safeDetails, 'incident');

  if (character.stamina.current < cost) {
    return {
      error: 'Not enough stamina to attempt incident resolution.',
      stamina: { current: character.stamina.current, max: character.stamina.max },
      cost,
      incident,
    };
  }

  const systemPrompt = `You are a software engineering RPG assistant. A player is attempting to resolve an incident:\n\nTitle: ${incident.title}\nDescription: ${incident.description}\n\nThe player's solution: ${safeDetails}\n\nRespond with:\n1. A game-world narrative describing the player's attempt (2-3 sentences, plain text).\n2. At the end, on a new line, write exactly "RESOLVED: YES" if the solution actually resolves the incident, or "RESOLVED: NO" if it doesn't.`;
  const response = await ai.chat(systemPrompt, safeDetails);

  // Parse resolution from LLM response
  const resolvedMatch = response.match(/RESOLVED:\s*(YES|NO)/i);
  const incidentResolved = resolvedMatch && resolvedMatch[1].toUpperCase() === 'YES';

  // Extract narrative (everything before RESOLVED: line)
  const narrativeText = response.replace(/RESOLVED:\s*(YES|NO)/i, '').trim();

  // Calculate relevance against incident for XP calculation
  const relevance = computeRelevance({ title: incident.title, description: incident.description }, safeDetails);

  // Base XP from relevance (0-150)
  let experienceGained = Math.round(relevance * 150);
  
  // Bonus XP for successful resolution
  if (incidentResolved) {
    experienceGained += 200; // 200 bonus for resolving
  }

  const charUpdate = {
    stamina: {
      current: Math.max(0, character.stamina.current - cost),
      max: character.stamina.max,
      lastUpdated: new Date().toISOString(),
    },
    level: character.level || 1,
    experience: (character.experience || 0) + experienceGained,
  };

  // Clear incident if resolved, and bump server health.
  // On a failed resolution attempt, drop reliability.
  if (incidentResolved) {
    charUpdate.currentIncident = null;
    onIncidentResolved();
    broadcastEvent('world-status', { metrics: getMetrics() });
  } else {
    onIncidentFailed();
    broadcastEvent('world-status', { metrics: getMetrics() });
  }

  // Level up if experience >= 1000
  while (charUpdate.experience >= 1000) {
    charUpdate.level += 1;
    charUpdate.experience -= 1000;
  }

  const updatedCharacter = updateCharacter(characterId, charUpdate);

  const resolvedNote = incidentResolved ? `\n\n✅ Incident resolved! +200 bonus XP earned.` : `\n\nSolution relevance: ${Math.round(relevance * 100)}% (LLM deemed it insufficient).`;
  const levelUpNote = charUpdate.level > (character.level || 1) ? `\n🎉 Level UP! You are now level ${charUpdate.level}!` : '';
  const narration = `${narrativeText}${resolvedNote}${levelUpNote}`;

  return {
    response: narration,
    stamina: updatedCharacter.stamina,
    level: updatedCharacter.level,
    experience: updatedCharacter.experience,
    incident: updatedCharacter.currentIncident,
    cost,
    relevance,
    experienceGained,
    incidentResolved,
  };
}

module.exports = {
  performAction,
};