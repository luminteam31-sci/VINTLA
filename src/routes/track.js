// src/routes/track.js
const express = require('express');
const router = express.Router();
const tracker = require('../services/tracker');
const { sendSms } = require('../services/sms');

// very light phone validation: E.164-ish (+ and 8-15 digits)
function isValidPhone(phone) {
  return /^\+[1-9]\d{7,14}$/.test(phone);
}

// POST /api/track  { fixtureId, phone }
router.post('/', async (req, res) => {
  const { fixtureId, phone } = req.body;

  if (!fixtureId || !phone) {
    return res.status(400).json({ error: 'fixtureId and phone are required.' });
  }
  if (!isValidPhone(phone)) {
    return res.status(400).json({
      error: 'Enter phone number in international format, e.g. +2348001234567'
    });
  }

  tracker.trackMatch(String(fixtureId), phone);

  // Confirmation text so the user knows it worked
  await sendSms(phone, `VINTLA: You're now tracking this match. We'll text you as it updates.`);

  res.json({ success: true });
});

// DELETE /api/track  { fixtureId, phone }
router.delete('/', (req, res) => {
  const { fixtureId, phone } = req.body;
  if (!fixtureId || !phone) {
    return res.status(400).json({ error: 'fixtureId and phone are required.' });
  }
  tracker.untrackMatch(String(fixtureId), phone);
  res.json({ success: true });
});

module.exports = router;
