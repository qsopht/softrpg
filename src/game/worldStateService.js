const DEFAULT_SERVER_HEALTH = 82;
const DEFAULT_RELIABILITY = 91;

const INCIDENT_RESOLVED_SERVER_HEALTH_BOOST = 10;
const INCIDENT_RESOLVED_RELIABILITY_BOOST = 5;
const INCIDENT_FAILED_DROP = 5;
const CRISIS_FAILED_DROP = 5;

let serverHealth = DEFAULT_SERVER_HEALTH;
let reliability = DEFAULT_RELIABILITY;

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function getServerHealth() {
  return serverHealth;
}

function adjustServerHealth(delta) {
  serverHealth = clamp(Math.round(serverHealth + delta), 0, 100);
  return serverHealth;
}

function getReliability() {
  return reliability;
}

function adjustReliability(delta) {
  reliability = clamp(Math.round(reliability + delta), 0, 100);
  return reliability;
}

function onIncidentResolved() {
  adjustServerHealth(INCIDENT_RESOLVED_SERVER_HEALTH_BOOST);
  adjustReliability(INCIDENT_RESOLVED_RELIABILITY_BOOST);
  return getMetrics();
}

function onIncidentFailed() {
  return adjustReliability(-INCIDENT_FAILED_DROP);
}

function onCrisisActionFailed() {
  return adjustReliability(-CRISIS_FAILED_DROP);
}

function getMetrics() {
  return { serverHealth, reliability };
}

module.exports = {
  getServerHealth,
  adjustServerHealth,
  getReliability,
  adjustReliability,
  onIncidentResolved,
  onIncidentFailed,
  onCrisisActionFailed,
  getMetrics,
};
