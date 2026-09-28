const axios = require('axios');

// Trim spaces/newlines/quotes that often sneak in when pasting a key
const API_KEY = (process.env.APISPORTS_KEY || '').trim().replace(/^["']|["']$/g, '');

const client = axios.create({
  baseURL: 'https://v3.football.api-sports.io',
  headers: { 'x-apisports-key': API_KEY }
});

// Runs a request and turns any failure into a readable message
// (HTTP status + what API-Sports actually said).
async function get(path, params) {
  if (!API_KEY) throw new Error('APISPORTS_KEY is not set on the server');

  let res;
  try {
    res = await client.get(path, { params });
  } catch (err) {
    if (err.response) {
      const body = JSON.stringify(err.response.data || '').slice(0, 160);
      throw new Error(`HTTP ${err.response.status} from API-Sports: ${body} (key length ${API_KEY.length})`);
    }
    throw err;
  }

  const errs = res.data.errors;
  const list = Array.isArray(errs) ? errs : Object.values(errs || {});
  if (list.length > 0) throw new Error(list.join(', '));
  return res.data.response;
}

async function getLiveFixtures() {
  return (await get('/fixtures', { live: 'all' })).map(normalizeFixture);
}

async function getFixturesByDate(dateStr) {
  return (await get('/fixtures', { date: dateStr })).map(normalizeFixture);
}

async function getFixtureById(fixtureId) {
  const fixture = (await get('/fixtures', { id: fixtureId }))[0];
  return fixture ? normalizeFixture(fixture) : null;
}

function normalizeFixture(raw) {
  return {
    id: raw.fixture.id,
    status: raw.fixture.status.short,
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
    goals: { home: raw.goals.home, away: raw.goals.away },
    events: (raw.events || []).map(e => ({
      minute: e.time.elapsed,
      type: e.type,
      detail: e.detail,
      team: e.team.name,
      player: e.player?.name
    })),
    kickoff: raw.fixture.date
  };
}

module.exports = { getLiveFixtures, getFixturesByDate, getFixtureById };
