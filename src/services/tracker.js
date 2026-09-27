// src/services/tracker.js
// Keeps track of which phone numbers are following which matches,
// polls API-FOOTBALL on an interval, and texts subscribers when
// something changes (goal, card, half-time, full-time, etc).
//
// NOTE: this store is in-memory. On Render's free tier the server
// can spin down and restart, which clears it. That's fine to ship
// with — swap this file for a Postgres-backed version later if you
// want tracking to survive restarts (see README).

const footballApi = require('./footballApi');
const { sendSms, formatMatchUpdate } = require('./sms');

// fixtureId -> { fixture: <last known fixture state>, subscribers: Set<phone> }
const tracked = new Map();

function trackMatch(fixtureId, phone) {
  if (!tracked.has(fixtureId)) {
    tracked.set(fixtureId, { fixture: null, subscribers: new Set() });
  }
  tracked.get(fixtureId).subscribers.add(phone);
}

function untrackMatch(fixtureId, phone) {
  const entry = tracked.get(fixtureId);
  if (!entry) return;
  entry.subscribers.delete(phone);
  if (entry.subscribers.size === 0) tracked.delete(fixtureId);
}

function getTrackedMatches() {
  return [...tracked.keys()];
}

/**
 * Compare old vs new fixture state and describe what changed,
 * in plain text suitable for an SMS. Returns null if nothing changed.
 */
function diffFixture(oldFixture, newFixture) {
  if (!oldFixture) return 'Match tracking started.';

  const notes = [];

  if (oldFixture.goals.home !== newFixture.goals.home ||
      oldFixture.goals.away !== newFixture.goals.away) {
    notes.push('Goal! Score updated.');
  }

  if (newFixture.events.length > oldFixture.events.length) {
    const newEvents = newFixture.events.slice(oldFixture.events.length);
    newEvents.forEach(e => {
      notes.push(`${e.minute}' ${e.type} (${e.detail}) - ${e.player ?? e.team}`);
    });
  }

  if (oldFixture.status !== newFixture.status && newFixture.status === 'FT') {
    notes.push('Full time.');
  }

  return notes.length ? notes.join(' ') : null;
}

async function pollOnce() {
  for (const [fixtureId, entry] of tracked.entries()) {
    try {
      const latest = await footballApi.getFixtureById(fixtureId);
      if (!latest) continue;

      const changeNote = diffFixture(entry.fixture, latest);
      entry.fixture = latest;

      if (changeNote) {
        const message = formatMatchUpdate(latest, changeNote);
        for (const phone of entry.subscribers) {
          await sendSms(phone, message);
        }
      }

      // Auto-stop tracking once the match has ended.
      if (latest.status === 'FT' || latest.status === 'AET' || latest.status === 'PEN') {
        tracked.delete(fixtureId);
      }
    } catch (err) {
      console.error(`Poll failed for fixture ${fixtureId}:`, err.message);
    }
  }
}

function startPolling() {
  const seconds = Number(process.env.POLL_INTERVAL_SECONDS || 60);
  setInterval(pollOnce, seconds * 1000);
  console.log(`Tracker polling every ${seconds}s`);
}

module.exports = {
  trackMatch,
  untrackMatch,
  getTrackedMatches,
  startPolling
};
