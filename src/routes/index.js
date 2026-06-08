const { Router } = require('express');
const { router: eventsRouter } = require('./events');
const commandRouter = require('./command');
const characterRouter = require('./characters');
const crisisRouter = require('./crisis');

const router = Router();

router.get('/health', (req, res) => res.json({ status: 'ok' }));
router.use('/events', eventsRouter);
router.use('/command', commandRouter);
router.use('/characters', characterRouter);
router.use('/crisis', crisisRouter);

module.exports = router;
