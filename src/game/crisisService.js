const crypto = require('crypto');

let activeCrisis = null;

function createDefaultCrisis() {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: 'Production deployment rollback',
    description: 'A critical service outage emerged after a bad deployment in the production environment. The incident involves broken CI/CD automation, flaky tests, and a recovery plan that failed to execute cleanly.',
    severity: 4,
    status: 'ACTIVE',
    percentageSolved: 0,
    tags: ['deployment', 'CI/CD', 'incident response', 'production'],
    createdAt: now,
    updatedAt: now,
  };
}

function getCurrentCrisis() {
  if (!activeCrisis) {
    activeCrisis = createDefaultCrisis();
  }
  return activeCrisis;
}

function updateCrisis(updates) {
  if (!activeCrisis) {
    activeCrisis = createDefaultCrisis();
  }

  const now = new Date().toISOString();
  activeCrisis = {
    ...activeCrisis,
    ...updates,
    percentageSolved: Math.min(100, Math.max(0, updates.percentageSolved ?? activeCrisis.percentageSolved)),
    updatedAt: now,
  };

  return activeCrisis;
}

module.exports = {
  getCurrentCrisis,
  updateCrisis,
};
