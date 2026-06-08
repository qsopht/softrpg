const crypto = require('crypto');

const LOCAL_PLAYER_ID = 'local-player';
const STAMINA_REGEN_INTERVAL_MS = 10_000; // 1 point every 10 seconds
const STAMINA_REGEN_PER_TICK = 1;
const characters = new Map();

function applyStaminaRegen(character) {
  if (!character || !character.stamina) return character;

  const now = Date.now();
  const lastUpdated = character.stamina.lastUpdated ? Date.parse(character.stamina.lastUpdated) : now;
  const elapsed = Math.max(0, now - lastUpdated);
  const ticks = Math.floor(elapsed / STAMINA_REGEN_INTERVAL_MS);
  if (ticks <= 0) return character;

  const current = Math.min(
    character.stamina.max,
    (character.stamina.current || 0) + ticks * STAMINA_REGEN_PER_TICK,
  );
  const updatedAt = new Date().toISOString();
  const nextUpdate = new Date(lastUpdated + ticks * STAMINA_REGEN_INTERVAL_MS).toISOString();

  const regenerated = {
    ...character,
    stamina: {
      ...character.stamina,
      current,
      lastUpdated: nextUpdate,
    },
    updatedAt,
  };

  characters.set(character.id, regenerated);
  return regenerated;
}

function createCharacter({ name, jobTitle, accountId = null, profile }) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const character = {
    id,
    name,
    jobTitle,
    accountId,
    playerId: accountId || LOCAL_PLAYER_ID,
    stats: {
      strengths: profile.strengths,
      weaknesses: profile.weaknesses,
    },
    personality: profile.personality,
    starterEquipment: profile.starterEquipment,
    stamina: {
      current: 100,
      max: 100,
      lastUpdated: now,
    },
    createdAt: now,
    updatedAt: now,
    meta: {
      source: 'local',
      version: '1.0',
      generatedAt: now,
    },
  };

  characters.set(id, character);
  return character;
}

function getCharacter(id) {
  const character = characters.get(id);
  if (!character) return null;
  return applyStaminaRegen(character);
}

function updateCharacter(id, updates) {
  const character = characters.get(id);
  if (!character) return null;

  const merged = {
    ...character,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  if (updates.stats) {
    merged.stats = {
      ...character.stats,
      ...updates.stats,
    };
  }

  if (updates.stamina) {
    merged.stamina = {
      ...character.stamina,
      ...updates.stamina,
      lastUpdated: updates.stamina.lastUpdated || new Date().toISOString(),
    };
  }

  characters.set(id, merged);
  return merged;
}

function listCharacters({ accountId } = {}) {
  const all = Array.from(characters.values());
  if (!accountId) return all;
  return all.filter((character) => character.accountId === accountId);
}

module.exports = {
  createCharacter,
  getCharacter,
  listCharacters,
  updateCharacter,
};
