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

app.use(cors());
app.use(express.json());
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
