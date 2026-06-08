const { Router } = require('express');
const { createCharacter, getCharacter, listCharacters } = require('../game/characterService');
const { generateCharacterProfile } = require('../game/characterGenerator');

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const { name, jobTitle, accountId } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    if (!jobTitle || typeof jobTitle !== 'string' || !jobTitle.trim()) {
      return res.status(400).json({ error: 'jobTitle is required' });
    }

    const profile = await generateCharacterProfile({
      name: name.trim(),
      jobTitle: jobTitle.trim(),
    });

    const character = createCharacter({
      name: name.trim(),
      jobTitle: jobTitle.trim(),
      accountId: accountId || null,
      profile,
    });

    res.status(201).json(character);
  } catch (err) {
    next(err);
  }
});

router.get('/', (req, res) => {
  const { accountId } = req.query;
  res.json(listCharacters({ accountId }));
});

router.get('/:id', (req, res) => {
  const character = getCharacter(req.params.id);
  if (!character) {
    return res.status(404).json({ error: 'Character not found' });
  }
  res.json(character);
});

module.exports = router;
