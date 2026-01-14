const express = require('express');
const router = express.Router();

if(!globalThis?.saasbackend?.helpers?.auth){
    console.error('Error: saasbackend helpers not found');
    process.exit(1)
}

const { authenticate } = globalThis.saasbackend.helpers.auth;
const { loadOrgContext, requireOrgMember, requireOrgRoleAtLeast } = globalThis.saasbackend.helpers.org
const eventController = require('../controllers/event.controller');

router.get('/events/public', eventController.listPublicEventsAll);
router.get('/orgs/:orgId/events/public', eventController.listPublicEvents);

router.get('/orgs/:orgId/events', authenticate, loadOrgContext, requireOrgMember, eventController.listEvents);
router.post('/orgs/:orgId/events', authenticate, loadOrgContext, requireOrgMember, eventController.createEvent);
router.get('/orgs/:orgId/events/pending-count', authenticate, loadOrgContext, requireOrgRoleAtLeast('admin'), eventController.getPendingCount);
router.get('/orgs/:orgId/events/:eventId', authenticate, loadOrgContext, requireOrgMember, eventController.getEvent);
router.put('/orgs/:orgId/events/:eventId', authenticate, loadOrgContext, requireOrgMember, eventController.updateEvent);
router.delete('/orgs/:orgId/events/:eventId', authenticate, loadOrgContext, requireOrgMember, eventController.deleteEvent);
router.post('/orgs/:orgId/events/:eventId/approve', authenticate, loadOrgContext, requireOrgRoleAtLeast('admin'), eventController.approveEvent);
router.post('/orgs/:orgId/events/:eventId/reject', authenticate, loadOrgContext, requireOrgRoleAtLeast('admin'), eventController.rejectEvent);

module.exports = router;
