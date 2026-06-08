const { Router } = require('express');

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
  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(res);
  });
});

/**
 * Broadcast a message to all connected SSE clients.
 * @param {{ text: string, type?: string }} payload
 */
function broadcast(payload) {
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const client of clients) client.write(data);
}

module.exports = { router, broadcast };
