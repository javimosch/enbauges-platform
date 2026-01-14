# Enbauges

**Enbauges** est le tiers-lieu numérique du Massif des Bauges - une plateforme communautaire pour les associations, collectifs et initiatives locales.

## 🎯 Mission

Fédérer les ressources et initiatives du territoire du Massif des Bauges en créant un espace numérique commun qui :
- Rend visibles les associations, tiers-lieux et coworkings ruraux
- Connecte les acteurs entre eux
- Mutualise les agendas et ressources partagées
- Facilite la collaboration locale

## 🏗️ Architecture

### Stack Technique
- **Backend** : Node.js, Express, Mongoose
- **Frontend** : Vue3 CDN, Tailwind CSS, DaisyUI, FullCalendar
- **Base de données** : MongoDB
- **Authentification** : JWT (via saasbackend)
- **Internationalisation** : i18n (français/anglais)

### Structure Modulaire
Le projet utilise une architecture hybride :
- **saasbackend** : Fonctionnalités génériques (auth, organisations, invitations)
- **enbauges** : Logique métier spécifique (agenda, modération, profil local)

## 📋 Fonctionnalités

### 🏢 Gestion des Organisations
- Création et gestion d'associations/collectifs
- Gestion des membres avec rôles (owner, admin, member)
- Système d'invitations par email ou ajout direct
- Option d'inscription publique

### 📅 Agenda Partagé
- Création d'événements par les membres
- Workflow de modération (pending → approved/rejected)
- Agenda public visible sans connexion
- Calendrier interactif avec FullCalendar

### 👥 Gestion des Membres
- Multi-appartenance (un utilisateur peut appartenir à plusieurs organisations)
- Rôles et permissions granulaires
- Historique d'activité

### 📢 Newsletter
- Système d'abonnement à la newsletter
- Gestion des abonnés via GlobalSetting

## 🚀 Démarrage Rapide

### Prérequis
- Node.js 20+
- MongoDB
- Git

### Installation

1. **Cloner le dépôt**
   ```bash
   git clone <repository-url>
   cd ref-enbauges
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Configurer l'environnement**
   ```bash
   cp .env.example .env
   # Éditer .env avec vos configurations
   ```

4. **Démarrer le serveur**
   ```bash
   # Développement
   npm run dev
   
   # Production
   npm start
   ```

### Variables d'Environnement

```bash
# Serveur
PORT=4000
NODE_ENV=development

# Base de données
MONGODB_URI=mongodb://localhost:27017/enbauges

# JWT (doit correspondre à saasbackend)
JWT_ACCESS_SECRET=your-access-secret-change-me
JWT_REFRESH_SECRET=your-refresh-secret-change-me

# URLs
PUBLIC_URL=http://localhost:4000
CORS_ORIGIN=http://localhost:4000

# Email (optionnel)
RESEND_API_KEY=your-resend-api-key

# Internationalisation
ENBAUGES_I18N_INJECT=true
```

## 📁 Structure du Projet

```
ref-enbauges/
├── server.js                 # Serveur Express principal
├── package.json             # Dépendances et scripts
├── .env.example             # Configuration d'environnement
├── compose.yml              # Configuration Docker Compose
├── Dockerfile               # Configuration Docker
├── docs/                    # Documentation
│   ├── plan.md             # Plan de réécriture
│   ├── tiers-lieux-and-coworkings.md
│   ├── color-scheme.md
│   └── pending-i18n.md
├── src/                     # Code source backend
│   ├── controllers/         # Contrôleurs
│   │   ├── event.controller.js
│   │   └── newsletter.controller.js
│   ├── models/             # Modèles de données
│   └── routes/             # Routes API
│       ├── event.routes.js
│       └── newsletter.routes.js
├── views/                   # Templates EJS
├── public/                  # Fichiers statiques
├── locales/                 # Fichiers i18n
└── scripts/                 # Scripts utilitaires
```

## 🔌 API Endpoints

### Authentification (saasbackend)
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/auth/me` - Profil utilisateur
- `POST /api/auth/refresh-token` - Rafraîchir le token

### Organisations (saasbackend)
- `GET /api/orgs` - Lister les organisations de l'utilisateur
- `POST /api/orgs` - Créer une organisation
- `GET /api/orgs/:orgId` - Détails d'une organisation
- `PUT /api/orgs/:orgId` - Mettre à jour une organisation
- `GET /api/orgs/:orgId/members` - Lister les membres
- `POST /api/orgs/:orgId/members` - Ajouter un membre
- `DELETE /api/orgs/:orgId/members/:userId` - Supprimer un membre

### Événements (enbauges)
- `GET /api/enbauges/orgs/:orgId/events` - Lister les événements (membre)
- `GET /api/enbauges/orgs/:orgId/events/public` - Événements publics
- `POST /api/enbauges/orgs/:orgId/events` - Créer un événement
- `PUT /api/enbauges/orgs/:orgId/events/:eventId` - Mettre à jour
- `POST /api/enbauges/orgs/:orgId/events/:eventId/approve` - Approuver
- `POST /api/enbauges/orgs/:orgId/events/:eventId/reject` - Rejeter

### Newsletter (enbauges)
- `POST /api/enbauges/newsletter/subscribe` - S'abonner

## 🐳 Docker

### Construction de l'image
```bash
docker build -t javimosch/enbaugesplatform:latest .
```

### Déploiement avec Docker Compose
```bash
docker-compose up -d
```

### Déploiement
```bash
npm run deploy
```

## 🎨 Pages de l'Application

### Pages Publiques
- `/` - Page d'accueil avec agenda public
- `/browse-orgs` - Annuaire des organisations
- `/contact` - Page de contact

### Pages Authentifiées
- `/login` - Connexion
- `/dashboard` - Tableau de bord utilisateur
- `/accept-invite` - Acceptation d'invitation

### API
- `/health` - Vérification de santé de l'application

## 🔐 Rôles et Permissions

### Rôles
- **owner** : Accès complet, peut transférer la propriété et supprimer l'organisation
- **admin** : Gère les membres, approuve/rejette les événements, modifie tous les événements
- **member** : Crée des événements (en attente), modifie ses propres événements en attente

### Workflow de Modération
1. Un membre crée un événement → statut = `pending`
2. Un admin examine les événements en attente
3. Approuvé → statut = `approved` (visible dans l'agenda public)
4. Rejeté → statut = `rejected` (avec raison)

## 🌐 Internationalisation

L'application supporte le français et l'anglais :
- Fichiers de traduction dans `locales/`
- Middleware i18n automatique
- Injection des métadonnées i18n dans le SEO

## 📊 Monitoring

### Health Check
```bash
curl http://localhost:4000/health
```

Retourne :
```json
{
  "status": "ok",
  "app": "enbauges",
  "database": "connected"
}
```

## 🤝 Contribuer

### Guidelines de Développement
- Fichiers JavaScript < 500 LOC
- Architecture modulaire
- Utilisation des contrôleurs pour les routes
- Support des mocks pour les tests

### Convention de Code
- Code JavaScript moderne (ES6+)
- Commentaires en français
- Nommage explicite des variables et fonctions

## 📄 Licence

Ce projet est sous licence MIT.

## 📞 Contact

- **Site web** : https://enbauges.fr
- **Email** : contact@enbauges.fr
- **Documentation** : Voir le dossier `docs/`

---

**Enbauges** - Le tiers-lieu numérique du Massif des Bauges  
*Fédérer, connecter, mutualiser*
