// server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const matchesRoute = require('./src/routes/matches');
const trackRoute = require('./src/routes/track');
const tracker = require('./src/services/tracker');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1); // Render sits behind a proxy; needed for per-IP limits
app.use(cors());
app.use(express.json());

// Settings the browser needs. The Supabase URL and public ("anon") key are
// designed to be public. Never put the service_role key here.
app.get('/config.js', (req, res) => {
  res.type('application/javascript').set('Cache-Control', 'no-store');
  res.send('window.VINTLA_CONFIG=' + JSON.stringify({
    supabaseUrl: (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, ''),
    supabaseKey: (process.env.SUPABASE_ANON_KEY || '').trim()
  }) + ';');
});

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/matches', matchesRoute);
app.use('/api/track', trackRoute);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', trackedMatches: tracker.getTrackedMatches().length });
});

app.listen(PORT, () => {
  console.log(`VINTLA server running on port ${PORT}`);
  tracker.startPolling();
});
