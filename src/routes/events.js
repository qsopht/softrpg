const { Router } = require('express');
const { getMetrics } = require('../game/worldStateService');

const router = Router();

// Keep track of connected SSE clients
const clients = new Set();

/**
 * GET /api/events  — Server-Sent Events stream
 */
router.get('/', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.flushHeaders();

  // Send a heartbeat comment every 20 s to keep the connection alive
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 20_000);

  clients.add(res);

  // Push current world state so the UI doesn't have to wait for the first change
  writeEvent(res, 'world-status', { metrics: getMetrics() });

  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(res);
  });
});

function writeEvent(res, eventName, payload) {
  const lines = [];
  if (eventName) lines.push(`event: ${eventName}`);
  lines.push(`data: ${JSON.stringify(payload)}`);
  res.write(lines.join('\n') + '\n\n');
}

/**
 * Broadcast a message to all connected SSE clients (default `message` event).
 * @param {{ text: string, type?: string }} payload
 */
function broadcast(payload) {
  for (const client of clients) writeEvent(client, null, payload);
}

/**
 * Broadcast a named SSE event to all connected clients.
 */
function broadcastEvent(eventName, payload) {
  for (const client of clients) writeEvent(client, eventName, payload);
}

module.exports = { router, broadcast, broadcastEvent };
