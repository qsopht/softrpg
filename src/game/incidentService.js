const crypto = require('crypto');

const INCIDENT_TYPES = [
  {
    title: 'Memory leak detected',
    description: 'A slowly growing memory consumption was detected in the production API server. The application uses more RAM over time.',
    tags: ['performance', 'debugging', 'memory management'],
  },
  {
    title: 'Database connection pool exhausted',
    description: 'The application can no longer connect to the database. The connection pool has reached its limit.',
    tags: ['database', 'infrastructure', 'scaling'],
  },
  {
    title: 'SSL certificate expiration warning',
    description: 'Your SSL certificate will expire in 7 days. You need to renew it before the deadline.',
    tags: ['security', 'infrastructure', 'certificates'],
  },
  {
    title: 'Package dependency vulnerability',
    description: 'A critical security vulnerability was discovered in one of your npm dependencies.',
    tags: ['security', 'dependencies', 'updates'],
  },
  {
    title: 'API rate limit exceeded',
    description: 'The external API service has temporarily blocked your requests due to rate limiting.',
    tags: ['integration', 'api', 'throttling'],
  },
  {
    title: 'Disk space critically low',
    description: 'The server disk is nearly full. Only 5% free space remains.',
    tags: ['infrastructure', 'monitoring', 'storage'],
  },
  {
    title: 'Slow database queries',
    description: 'Several database queries are timing out, causing API endpoints to respond slowly.',
    tags: ['database', 'performance', 'optimization'],
  },
];

function createRandomIncident() {
  const template = INCIDENT_TYPES[Math.floor(Math.random() * INCIDENT_TYPES.length)];
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    title: template.title,
    description: template.description,
    tags: template.tags,
    status: 'OPEN',
    createdAt: now,
  };
}

function resolveIncident(characterId) {
  return null;
}

module.exports = {
  createRandomIncident,
  resolveIncident,
};
