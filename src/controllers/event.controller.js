const OrgEvent = require('../models/OrgEvent');

exports.listEvents = async (req, res) => {
  try {
    const { status, from, to, limit = 50, offset = 0 } = req.query;
    const query = { orgId: req.org._id };

    if (status) {
      query.status = status;
    }
    if (from) {
      query.startAt = { $gte: new Date(from) };
    }
    if (to) {
      query.endAt = { ...query.endAt, $lte: new Date(to) };
    }

    const events = await OrgEvent.find(query)
      .populate('createdByUserId', 'name email')
      .sort({ startAt: 1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .lean();

    const total = await OrgEvent.countDocuments(query);

    res.json({
      events,
      pagination: { total, limit: parseInt(limit), offset: parseInt(offset) }
    });
  } catch (error) {
    console.error('Error listing events:', error);
    res.status(500).json({ error: 'Failed to list events' });
  }
};

exports.listPublicEvents = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { from, to, limit = 100 } = req.query;

    const query = { orgId, status: 'approved' };

    if (from) {
      query.startAt = { $gte: new Date(from) };
    }
    if (to) {
      query.endAt = { ...query.endAt, $lte: new Date(to) };
    }

    const events = await OrgEvent.find(query)
      .select('title description startAt endAt location category')
      .sort({ startAt: 1 })
      .limit(parseInt(limit))
      .lean();

    res.json({ events });
  } catch (error) {
    console.error('Error listing public events:', error);
    res.status(500).json({ error: 'Failed to list events' });
  }
};

exports.getEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await OrgEvent.findOne({ _id: eventId, orgId: req.org._id })
      .populate('createdByUserId', 'name email')
      .populate('moderation.reviewedByUserId', 'name email');

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ event });
  } catch (error) {
    console.error('Error getting event:', error);
    res.status(500).json({ error: 'Failed to get event' });
  }
};

exports.createEvent = async (req, res) => {
  try {
    const { title, description, startAt, endAt, location, category } = req.body;

    if (!title || !startAt || !endAt) {
      return res.status(400).json({ error: 'Title, startAt, and endAt are required' });
    }

    const start = new Date(startAt);
    const end = new Date(endAt);

    if (end <= start) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    const isAdmin = ['owner', 'admin'].includes(req.orgMember.role);

    const event = await OrgEvent.create({
      orgId: req.org._id,
      createdByUserId: req.user._id,
      title: title.trim(),
      description: description?.trim(),
      startAt: start,
      endAt: end,
      location: location?.trim(),
      category: category?.trim(),
      status: isAdmin ? 'approved' : 'pending'
    });

    res.status(201).json({
      message: isAdmin ? 'Event created and approved' : 'Event created, pending approval',
      event
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { title, description, startAt, endAt, location, category } = req.body;

    const event = await OrgEvent.findOne({ _id: eventId, orgId: req.org._id });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const isAdmin = ['owner', 'admin'].includes(req.orgMember.role);
    const isOwner = event.createdByUserId.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Not authorized to edit this event' });
    }

    if (!isAdmin && event.status !== 'pending' && event.status !== 'draft') {
      return res.status(403).json({ error: 'Can only edit pending or draft events' });
    }

    if (title) event.title = title.trim();
    if (description !== undefined) event.description = description?.trim();
    if (startAt) event.startAt = new Date(startAt);
    if (endAt) event.endAt = new Date(endAt);
    if (location !== undefined) event.location = location?.trim();
    if (category !== undefined) event.category = category?.trim();

    if (event.endAt <= event.startAt) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    await event.save();

    res.json({ message: 'Event updated', event });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await OrgEvent.findOne({ _id: eventId, orgId: req.org._id });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const isAdmin = ['owner', 'admin'].includes(req.orgMember.role);
    const isOwner = event.createdByUserId.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Not authorized to delete this event' });
    }

    await OrgEvent.deleteOne({ _id: eventId });

    res.json({ message: 'Event deleted' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
};

exports.approveEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await OrgEvent.findOne({ _id: eventId, orgId: req.org._id });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.status !== 'pending') {
      return res.status(400).json({ error: 'Can only approve pending events' });
    }

    event.status = 'approved';
    event.moderation = {
      reviewedByUserId: req.user._id,
      reviewedAt: new Date()
    };
    await event.save();

    res.json({ message: 'Event approved', event });
  } catch (error) {
    console.error('Error approving event:', error);
    res.status(500).json({ error: 'Failed to approve event' });
  }
};

exports.rejectEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { reason } = req.body;

    const event = await OrgEvent.findOne({ _id: eventId, orgId: req.org._id });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.status !== 'pending') {
      return res.status(400).json({ error: 'Can only reject pending events' });
    }

    event.status = 'rejected';
    event.moderation = {
      reviewedByUserId: req.user._id,
      reviewedAt: new Date(),
      rejectionReason: reason?.trim()
    };
    await event.save();

    res.json({ message: 'Event rejected', event });
  } catch (error) {
    console.error('Error rejecting event:', error);
    res.status(500).json({ error: 'Failed to reject event' });
  }
};

exports.getPendingCount = async (req, res) => {
  try {
    const count = await OrgEvent.countDocuments({ orgId: req.org._id, status: 'pending' });
    res.json({ count });
  } catch (error) {
    console.error('Error getting pending count:', error);
    res.status(500).json({ error: 'Failed to get count' });
  }
};
