const express = require('express');
const router = express.Router();
const footballApi = require('../services/footballApi');

function fail(res, err) {
  console.error('Football API error:', err.message);
  res.status(502).json({
    error: 'Could not reach the live-score provider.',
    detail: err.message
  });
}

router.get('/live', async (req, res) => {
  try {
    res.json({ matches: await footballApi.getLiveFixtures() });
  } catch (err) { fail(res, err); }
});

router.get('/date/:date', async (req, res) => {
  try {
    res.json({ matches: await footballApi.getFixturesByDate(req.params.date) });
  } catch (err) { fail(res, err); }
});

router.get('/:id', async (req, res) => {
  try {
    const match = await footballApi.getFixtureById(req.params.id);
    if (!match) return res.status(404).json({ error: 'Match not found.' });
    res.json({ match });
  } catch (err) { fail(res, err); }
});

module.exports = router;
