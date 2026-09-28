const axios = require('axios');

const client = axios.create({
  baseURL: 'https://v3.football.api-sports.io',
  headers: { 'x-apisports-key': process.env.APISPORTS_KEY }
});

// API-Sports returns HTTP 200 even for bad keys / plan limits,
// with the problem inside an "errors" field. Surface it.
function unwrap(res) {
  if (!process.env.APISPORTS_KEY) {
    throw new Error('APISPORTS_KEY is not set on the server');
  }
  const errs = res.data.errors;
  const list = Array.isArray(errs) ? errs : Object.values(errs || {});
  if (list.length > 0) throw new Error(list.join(', '));
  return res.data.response;
}

async function getLiveFixtures() {
  const res = await client.get('/fixtures', { params: { live: 'all' } });
  return unwrap(res).map(normalizeFixture);
}

async function getFixturesByDate(dateStr) {
  const res = await client.get('/fixtures', { params: { date: dateStr } });
  return unwrap(res).map(normalizeFixture);
}

async function getFixtureById(fixtureId) {
  const res = await client.get('/fixtures', { params: { id: fixtureId } });
  const fixture = unwrap(res)[0];
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
