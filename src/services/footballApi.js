// src/services/footballApi.js
// Thin wrapper around API-FOOTBALL, called directly through API-Sports'
// own dashboard (dashboard.api-football.com) rather than via RapidAPI.
// Docs: https://www.api-football.com/documentation-v3

const axios = require('axios');

const client = axios.create({
  baseURL: 'https://v3.football.api-sports.io',
  headers: {
    'x-apisports-key': process.env.APISPORTS_KEY
  }
});

/**
 * Get all currently live fixtures.
 */
async function getLiveFixtures() {
  const res = await client.get('/fixtures', { params: { live: 'all' } });
  return res.data.response.map(normalizeFixture);
}

/**
 * Get today's fixtures (used for "upcoming" and "finished" tabs).
 */
async function getFixturesByDate(dateStr) {
  const res = await client.get('/fixtures', { params: { date: dateStr } });
  return res.data.response.map(normalizeFixture);
}

/**
 * Get a single fixture by its API-FOOTBALL fixture id.
 * This is what the polling job uses to check for score/event changes.
 */
async function getFixtureById(fixtureId) {
  const res = await client.get('/fixtures', { params: { id: fixtureId } });
  const fixture = res.data.response[0];
  return fixture ? normalizeFixture(fixture) : null;
}

/**
 * Reshape API-FOOTBALL's verbose payload into the flat shape
 * the rest of the app (and the frontend) works with.
 */
function normalizeFixture(raw) {
  return {
    id: raw.fixture.id,
    status: raw.fixture.status.short, // e.g. "1H", "HT", "2H", "FT", "NS"
    minute: raw.fixture.status.elapsed,
    league: raw.league.name,
    country: raw.league.country,
    home: {
      name: raw.teams.home.name,
      logo: raw.teams.home.logo,
      winner: raw.teams.home.winner
    },
    away: {
      name: raw.teams.away.name,
      logo: raw.teams.away.logo,
      winner: raw.teams.away.winner
    },
    goals: {
      home: raw.goals.home,
      away: raw.goals.away
    },
    events: (raw.events || []).map(e => ({
      minute: e.time.elapsed,
      type: e.type,       // Goal, Card, subst, Var
      detail: e.detail,   // Normal Goal, Yellow Card, etc.
      team: e.team.name,
      player: e.player?.name
    })),
    kickoff: raw.fixture.date
  };
}

module.exports = {
  getLiveFixtures,
  getFixturesByDate,
  getFixtureById
};
