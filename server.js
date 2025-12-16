require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 4000;

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/enbauges')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

const saasbackend = require('../index');
const saasMiddleware = saasbackend.middleware({
  mongodbUri: process.env.MONGODB_URI,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  skipBodyParser: true
});
app.use(saasMiddleware);

app.use('/api/enbauges', require('./src/routes/event.routes'));

app.get('/', (req, res) => {
  res.render('app', {
    title: 'Enbauges - Agenda Collaboratif',
    publicUrl: process.env.PUBLIC_URL || `http://localhost:${PORT}`
  });
});

app.get('/accept-invite', (req, res) => {
  res.render('app', {
    title: 'Accepter l\'invitation - Enbauges',
    publicUrl: process.env.PUBLIC_URL || `http://localhost:${PORT}`
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'enbauges',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Enbauges running on http://localhost:${PORT}`);
  console.log('📋 Enbauges-specific endpoints:');
  console.log('  GET  /api/enbauges/orgs/:orgId/events - List events (member)');
  console.log('  GET  /api/enbauges/orgs/:orgId/events/public - Public events (no auth)');
  console.log('  POST /api/enbauges/orgs/:orgId/events - Create event (member)');
  console.log('  PUT  /api/enbauges/orgs/:orgId/events/:eventId - Update event');
  console.log('  POST /api/enbauges/orgs/:orgId/events/:eventId/approve - Approve (admin)');
  console.log('  POST /api/enbauges/orgs/:orgId/events/:eventId/reject - Reject (admin)');
});
