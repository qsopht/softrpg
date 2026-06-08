const { Router } = require('express');
const { getCurrentCrisis } = require('../game/crisisService');

const router = Router();

router.get('/', (req, res) => {
  res.json(getCurrentCrisis());
});

module.exports = router;
