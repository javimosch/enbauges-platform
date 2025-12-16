# Enbauges Rewrite Plan

## Overview
Enbauges is a community platform for associations and collectives in the Bauges region.
This rewrite uses `saasbackend` for generic features (auth, orgs, invitations) and keeps only domain-specific logic locally.

## Stack
- **Backend**: Node.js, Express, Mongoose (via saasbackend middleware)
- **Frontend**: Vue3 CDN, Tailwind CDN, DaisyUI CDN, FullCalendar CDN
- **Guidelines**: Modular, JS files < 500 LOC, controllers for routes, mock support

## Key decisions
- **Public agenda**: Approved events visible without login
- **Multi-org**: Users can belong to multiple associations
- **Member management**: Org admins can:
  - Enable/disable public registration for their org
  - Directly add existing users (with optional email notification)
  - Send email invites to new users

## Architecture

### saasbackend provides (generic)
- Auth (register/login/refresh/me)
- Organizations + RBAC + memberships
- Invitations (email invite + direct add)
- Email service, notifications, activity log

### enbauges provides (domain-specific)
- `OrgEvent` model (agenda entries)
- Event moderation workflow (pending → approved/rejected)
- Calendar UI
- Association-specific profile fields

## Data models

### From saasbackend
- `User` (existing)
- `Organization` (new)
- `OrganizationMember` (new)
- `Invite` (new)

### Enbauges-specific
- `OrgEvent`
  - `orgId` (ref Organization)
  - `createdByUserId` (ref User)
  - `title`, `description`
  - `startAt`, `endAt` (Date)
  - `location` (string)
  - `status`: draft | pending | approved | rejected | cancelled
  - `moderation`: { reviewedByUserId, reviewedAt, rejectionReason }
  - timestamps

## API endpoints

### Auth (saasbackend)
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/refresh-token`

### Organizations (saasbackend)
- `GET /api/orgs` - list user's orgs
- `POST /api/orgs` - create org (creator becomes admin)
- `GET /api/orgs/:orgId` - get org details
- `PUT /api/orgs/:orgId` - update org (admin)
- `GET /api/orgs/:orgId/members` - list members
- `POST /api/orgs/:orgId/members` - add existing user directly (admin)
- `PUT /api/orgs/:orgId/members/:userId/role` - change role (admin)
- `DELETE /api/orgs/:orgId/members/:userId` - remove member (admin)

### Invitations (saasbackend)
- `POST /api/orgs/:orgId/invites` - create invite (admin)
- `GET /api/orgs/:orgId/invites` - list pending invites (admin)
- `DELETE /api/orgs/:orgId/invites/:id` - revoke invite (admin)
- `POST /api/invites/accept` - accept invite (public)
- `POST /api/orgs/:orgId/join` - public join if org allows (public, requires auth)

### Events (enbauges)
- `GET /api/orgs/:orgId/events` - list events (member, filtered by status)
- `GET /api/orgs/:orgId/events/public` - list approved events (no auth)
- `POST /api/orgs/:orgId/events` - create event (member)
- `GET /api/orgs/:orgId/events/:eventId` - get event
- `PUT /api/orgs/:orgId/events/:eventId` - update event
- `DELETE /api/orgs/:orgId/events/:eventId` - delete event
- `POST /api/orgs/:orgId/events/:eventId/approve` - approve (admin)
- `POST /api/orgs/:orgId/events/:eventId/reject` - reject (admin)

## Roles
- `owner`: full access, can transfer ownership, can delete org
- `admin`: manage members, approve/reject events, edit any event
- `member`: create events (pending), edit own pending events
- `viewer`: read-only (optional, not MVP)

## Moderation workflow
1. Member creates event → status = `pending` (or `approved` if creator is admin)
2. Admin reviews pending events
3. Admin approves → status = `approved` (visible in public agenda)
4. Admin rejects → status = `rejected` (with reason)
5. Only approved events show in public calendar

## UI pages (Vue3 CDN)
- **Auth**: Login / Register forms
- **Dashboard**: Org switcher, create org
- **Org settings** (admin): Edit org, manage members, invites, public join toggle
- **Calendar**: FullCalendar with approved events, "Add event" modal
- **Moderation queue** (admin): List pending events, approve/reject buttons

## File structure
```
ref-enbauges/
├── server.js                 # Express app, mounts saasbackend + enbauges routes
├── package.json
├── .env.example
├── docs/
│   └── plan.md               # This file
├── src/
│   ├── models/
│   │   └── OrgEvent.js
│   ├── controllers/
│   │   └── event.controller.js
│   ├── routes/
│   │   └── event.routes.js
│   └── middleware/
│       └── orgContext.js     # If not using saasbackend's
├── views/
│   └── app.ejs               # Single-page shell
└── public/
    ├── js/
    │   ├── app.js            # Vue app entry
    │   ├── api.js            # Fetch wrapper
    │   ├── store.js          # Simple reactive state
    │   └── components/
    │       ├── auth.js
    │       ├── org-switcher.js
    │       ├── org-settings.js
    │       ├── calendar.js
    │       └── moderation.js
    └── css/
        └── custom.css        # Minimal overrides if needed
```

## Implementation phases

### Phase 1: saasbackend features
- Organization + OrganizationMember models
- Org controller + routes + middleware
- Invitation system

### Phase 2: enbauges scaffold
- Server setup with saasbackend middleware
- OrgEvent model + controller + routes
- Basic views/public structure

### Phase 3: Frontend
- Auth components
- Org management
- Calendar with FullCalendar
- Moderation queue

### Phase 4: Polish
- Email notifications
- Activity logging
- Error handling
- Testing
