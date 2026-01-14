require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 4000;

const buildSeo = (req, overrides = {}) => {
  const publicUrl = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
  const pathOnly = (req.originalUrl || '/').split('?')[0];

  const envInject = process.env.ENBAUGES_I18N_INJECT;
  let i18nInjectMeta;
  if (typeof envInject === 'string' && envInject.length > 0) {
    const v = envInject.toLowerCase().trim();
    i18nInjectMeta = ['1', 'true', 'yes', 'on', 'enabled'].includes(v) ? '1' : '0';
  }

  return {
    publicUrl,
    canonicalUrl: `${publicUrl}${pathOnly}`,
    ...(typeof i18nInjectMeta !== 'undefined' ? { i18nInjectMeta } : {}),
    ...overrides,
  };
};

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/enbauges')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

const saasbackend = require(process.env.NODE_ENV==='production' ? 'saasbackend' : './ref-saasbackend');
globalThis.saasbackend = saasbackend;
const i18n = saasbackend.services.i18n;
const saasMiddleware = saasbackend.middleware({
  mongodbUri: process.env.MONGODB_URI,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  skipBodyParser: true
});
app.use(saasMiddleware);

app.use(i18n.createI18nMiddleware());

const seedI18n = async () => {
  try {
    await i18n.seedFromJsonFiles({
      baseDir: path.join(__dirname, 'locales'),
      locales: ['en', 'fr'],
      seedVersion: process.env.ASSET_VERSION || null,
      actorType: 'system',
      actorId: 'ref-enbauges',
    });
  } catch (e) {
    console.error('Error seeding i18n:', e);
  }
};

if (mongoose.connection.readyState === 1) {
  seedI18n();
} else {
  mongoose.connection.once('connected', seedI18n);
}

app.use('/api/enbauges', require('./src/routes/event.routes'));
app.use('/api/enbauges/newsletter', require('./src/routes/newsletter.routes'));

app.get('/', (req, res) => {
  res.render('landing', {
    title: 'Enbauges - Agenda public',
    assetVersion: process.env.ASSET_VERSION || Date.now().toString(),
    ...buildSeo(req, {
      description: 'EnBauges.fr — le tiers-lieu numérique du Massif des Bauges. Agenda, ressources, associations, tiers-lieux et coworkings ruraux.',
      robots: 'index,follow',
    })
  });
});

app.get('/login', (req, res) => {
  res.render('login', {
    title: 'Connexion - Enbauges',
    returnTo: req.query.returnTo || '',
    joinOrgId: req.query.joinOrgId || '',
    assetVersion: process.env.ASSET_VERSION || Date.now().toString(),
    ...buildSeo(req, {
      description: 'Connexion à EnBauges.fr',
      robots: 'noindex,nofollow',
    })
  });
});

app.get('/dashboard', (req, res) => {
  res.render('dashboard', {
    title: 'Dashboard - Enbauges',
    assetVersion: process.env.ASSET_VERSION || Date.now().toString(),
    ...buildSeo(req, {
      description: 'Espace membre EnBauges.fr',
      robots: 'noindex,nofollow',
    })
  });
});

app.get('/browse-orgs', (req, res) => {
  res.render('browse-orgs', {
    title: 'Organisations - Enbauges',
    assetVersion: process.env.ASSET_VERSION || Date.now().toString(),
    ...buildSeo(req, {
      description: 'Organisations et collectifs du Massif des Bauges sur EnBauges.fr',
      robots: 'index,follow',
    })
  });
});

app.get('/contact', (req, res) => {
  res.render('contact', {
    title: 'Contact - EnBauges.fr',
    assetVersion: process.env.ASSET_VERSION || Date.now().toString(),
    ...buildSeo(req, {
      description: 'Contacter le collectif EnBauges.fr (tiers-lieu numérique du Massif des Bauges).',
      robots: 'index,follow',
    })
  });
});

app.get('/accept-invite', (req, res) => {
  const token = req.query.token;
  if (token) {
    return res.redirect(`/login?token=${encodeURIComponent(token)}`);
  }
  return res.redirect('/login');
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
