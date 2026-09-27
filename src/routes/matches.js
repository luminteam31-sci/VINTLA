// src/routes/matches.js
const express = require('express');
const router = express.Router();
const footballApi = require('../services/footballApi');

// GET /api/matches/live
router.get('/live', async (req, res) => {
  try {
    const matches = await footballApi.getLiveFixtures();
    res.json({ matches });
  } catch (err) {
    console.error(err.message);
    res.status(502).json({ error: 'Could not reach the live-score provider.' });
  }
});

// GET /api/matches/date/2026-09-27
router.get('/date/:date', async (req, res) => {
  try {
    const matches = await footballApi.getFixturesByDate(req.params.date);
    res.json({ matches });
  } catch (err) {
    console.error(err.message);
    res.status(502).json({ error: 'Could not reach the live-score provider.' });
  }
});

// GET /api/matches/:id
router.get('/:id', async (req, res) => {
  try {
    const match = await footballApi.getFixtureById(req.params.id);
    if (!match) return res.status(404).json({ error: 'Match not found.' });
    res.json({ match });
  } catch (err) {
    console.error(err.message);
    res.status(502).json({ error: 'Could not reach the live-score provider.' });
  }
});

module.exports = router;
