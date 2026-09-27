// src/services/sms.js
// Sends match-update texts through Twilio.

const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * Send a plain-text SMS to a single phone number.
 * phone must be in E.164 format, e.g. +2348001234567
 */
async function sendSms(phone, message) {
  try {
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_FROM_NUMBER,
      to: phone
    });
    return { success: true, sid: result.sid };
  } catch (err) {
    console.error(`Failed to SMS ${phone}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Build a human-readable text for a match update.
 */
function formatMatchUpdate(fixture, changeNote) {
  const { home, away, goals, minute, status } = fixture;
  const statusLabel = status === 'FT' ? 'FULL TIME' : `${minute ?? ''}'`;

  return (
    `VINTLA: ${home.name} ${goals.home} - ${goals.away} ${away.name} ` +
    `(${statusLabel})\n${changeNote}`
  );
}

module.exports = { sendSms, formatMatchUpdate };
