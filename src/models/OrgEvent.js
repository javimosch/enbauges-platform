const mongoose = require('mongoose');

const orgEventSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  createdByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  startAt: {
    type: Date,
    required: true,
    index: true
  },
  endAt: {
    type: Date,
    required: true
  },
  location: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  moderation: {
    reviewedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    rejectionReason: String
  }
}, {
  timestamps: true
});

orgEventSchema.index({ orgId: 1, status: 1, startAt: 1 });
orgEventSchema.index({ orgId: 1, createdByUserId: 1 });

orgEventSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('OrgEvent', orgEventSchema);
