// src/routes/track.js
const express = require('express');
const axios = require('axios');
const router = express.Router();
const tracker = require('../services/tracker');
const { sendSms } = require('../services/sms');

const SB_URL = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
const SB_KEY = (process.env.SUPABASE_ANON_KEY || '').trim();

// E.164: + then 8-15 digits
const isValidPhone = p => /^\+[1-9]\d{7,14}$/.test(p);

// Only signed-in users may start SMS tracking (once Supabase is configured).
async function requireUser(req, res, next) {
  if (!SB_URL || !SB_KEY) return next(); // login not connected yet
  const token = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Please sign in first.' });
  try {
    await axios.get(`${SB_URL}/auth/v1/user`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${token}` },
      timeout: 8000
    });
    next();
  } catch (err) {
    if (err.response && [401, 403].includes(err.response.status)) {
      return res.status(401).json({ error: 'Your session expired. Please sign in again.' });
    }
    res.status(502).json({ error: 'Could not verify your login. Try again.' });
  }
}

// Every SMS costs money, so limit how often one IP can start tracking.
const hits = new Map();
function rateLimit(max, windowMs) {
  return (req, res, next) => {
    const now = Date.now();
    const recent = (hits.get(req.ip) || []).filter(t => now - t < windowMs);
    if (recent.length >= max) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    recent.push(now);
    hits.set(req.ip, recent);
    next();
  };
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, arr] of hits) {
    if (!arr.some(t => now - t < 3600000)) hits.delete(ip);
  }
}, 600000).unref();

// POST /api/track  { fixtureId, phone }
router.post('/', rateLimit(10, 3600000), requireUser, async (req, res) => {
  const fixtureId = String(req.body.fixtureId || '').trim();
  const phone = String(req.body.phone || '').replace(/[\s().-]/g, '');

  if (!fixtureId || !phone) {
    return res.status(400).json({ error: 'fixtureId and phone are required.' });
  }
  if (!isValidPhone(phone)) {
    return res.status(400).json({
      error: 'Enter your number with the country code, e.g. +2348001234567'
    });
  }

  // Send the confirmation first, so we never "track" a number we can't text.
  const sms = await sendSms(
    phone,
    "VINTLA: You're now tracking this match. We'll text you when the score changes and at full time."
  );
  if (!sms.success) {
    return res.status(502).json({
      error: "We couldn't send an SMS to that number.",
      detail: sms.error
    });
  }

  tracker.trackMatch(fixtureId, phone);
  res.json({ success: true });
});

// DELETE /api/track  { fixtureId, phone }
router.delete('/', requireUser, (req, res) => {
  const fixtureId = String(req.body.fixtureId || '').trim();
  const phone = String(req.body.phone || '').replace(/[\s().-]/g, '');
  if (!fixtureId || !phone) {
    return res.status(400).json({ error: 'fixtureId and phone are required.' });
  }
  tracker.untrackMatch(fixtureId, phone);
  res.json({ success: true });
});

module.exports = router;
