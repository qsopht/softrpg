const { Router } = require('express');
const { broadcast } = require('./events');
const { performAction } = require('../game/actionService');

const router = Router();

function parseActionCommand(command) {
  const normalized = String(command || '').trim();
  const match = normalized.match(/^\/(action|crisis|boss|incident)(?:\s+(.*))?$/i);
  if (!match) return null;
  return {
    type: match[1].toLowerCase(),
    details: match[2] ? match[2].trim() : '',
  };
}

router.post('/', async (req, res, next) => {
  try {
    const { command, characterId } = req.body;
    if (!command || typeof command !== 'string') {
      return res.status(400).json({ error: 'command is required' });
    }

    broadcast({ text: `[cmd] ${command}`, type: 'system' });

    const action = parseActionCommand(command);
    if (action) {
      if (!characterId || typeof characterId !== 'string') {
        return res.status(400).json({ error: 'characterId is required for actions' });
      }

      const result = await performAction({
        characterId,
        type: action.type,
        details: action.details,
      });

      if (result.error) {
        return res.status(400).json(result);
      }

      const response = {
        response: result.response,
        stamina: result.stamina,
        level: result.level,
        experience: result.experience,
        cost: result.cost,
        relevance: result.relevance,
        experienceGained: result.experienceGained,
        usedItem: result.usedItem,
      };

      // Include appropriate state based on action type
      if (result.crisis) response.crisis = result.crisis;
      if (result.incident !== undefined) response.incident = result.incident;
      if (result.delta !== undefined) response.delta = result.delta;
      if (result.incidentResolved !== undefined) response.incidentResolved = result.incidentResolved;

      return res.json(response);
    }

    res.json({ response: `Received: ${command}` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
