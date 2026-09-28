// src/services/footballApi.js
// Data source: SportScore free public API (https://sportscore.com/developers/)
// No API key needed. Free tier terms: keep a visible "Powered by SportScore"
// dofollow link on the page (already in public/index.html).
//
// We keep the same exported function names and the same output shape the rest
// of the app already uses, so the routes, tracker and SMS code stay unchanged.

const axios = require('axios');

const SRC = process.env.SPORTSCORE_SRC || 'vintla.onrender.com';
const CACHE_TTL = Number(process.env.CACHE_SECONDS || 60) * 1000; // SportScore itself caches 60s

const client = axios.create({
  baseURL: 'https://sportscore.com/api/widget',
  timeout: 15000
});

// ---- Fetch + cache ------------------------------------------------
let cache = null;      // { data, time }
let inFlight = null;   // shared promise so simultaneous visitors cause one request

async function fetchAll() {
  let res;
  try {
    res = await client.get('/matches/', {
      params: { sport: 'football', limit: 50, src: SRC }
    });
  } catch (err) {
    if (err.response) throw new Error(`HTTP ${err.response.status} from SportScore`);
    throw err;
  }
  const list = res.data && res.data.matches;
  if (!Array.isArray(list)) throw new Error('Unexpected response from SportScore');
  return list.map(normalizeMatch);
}

async function getAll() {
  if (cache && Date.now() - cache.time < CACHE_TTL) return cache.data;
  if (inFlight) return inFlight;

  inFlight = fetchAll()
    .then(data => {
      cache = { data, time: Date.now() };
      return data;
    })
    .catch(err => {
      if (cache) return cache.data; // serve last good data instead of failing
      throw err;
    })
    .finally(() => { inFlight = null; });

  return inFlight;
}

// ---- Public functions (same names as before) ----------------------
async function getLiveFixtures() {
  return (await getAll()).filter(m => m.status === 'LIVE');
}

// SportScore's list is "live + recent" and has no date filter,
// so the date argument is ignored and everything is returned.
async function getFixturesByDate() {
  return getAll();
}

async function getFixtureById(id) {
  return (await getAll()).find(m => m.id === String(id)) || null;
}

// ---- Normalising --------------------------------------------------
function slugFromUrl(url) {
  const m = String(url || '').match(/\/match\/([^/?#]+)/);
  return m ? m[1] : null;
}

function toInt(v) {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

// Turn SportScore's status text into 'LIVE' | 'FT' | 'NS'
// (the codes the frontend and tracker already understand).
function toStatusCode(raw) {
  const s = `${raw.status || ''} ${raw.status_text || ''}`.toLowerCase();
  if (/finish|ended|full[\s-]?time|\bft\b|after pen|\baet\b/.test(s)) return 'FT';
  if (/live|progress|in-?play|half|1st|2nd|extra|penalt|break|\d+\s*'/.test(s)) return 'LIVE';
  return 'NS';
}

function minuteFrom(raw) {
  const m = /(\d{1,3})\s*(?:\+\d+)?\s*'/.exec(raw.status_text || '');
  return m ? parseInt(m[1], 10) : null;
}

function normalizeMatch(raw) {
  const status = toStatusCode(raw);
  return {
    id: slugFromUrl(raw.url) || `${raw.home}-vs-${raw.away}-${raw.time}`,
    status,
    statusText: raw.status_text || '',
    minute: status === 'LIVE' ? minuteFrom(raw) : null,
    league: raw.competition || '',
    home: { name: raw.home || '', logo: raw.home_logo || '' },
    away: { name: raw.away || '', logo: raw.away_logo || '' },
    goals: { home: toInt(raw.home_score), away: toInt(raw.away_score) },
    events: [], // the list endpoint has no event timeline
    kickoff: raw.time || null
  };
}

module.exports = { getLiveFixtures, getFixturesByDate, getFixtureById };
