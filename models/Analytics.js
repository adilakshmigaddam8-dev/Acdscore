const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    page: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      default: 'pageview',
    },
    device: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'unknown'],
      default: 'unknown',
    },
    country: {
      type: String,
      default: 'unknown',
    },
    referralSource: {
      type: String,
      default: 'direct',
    },
    ipAddress: String,
    userAgent: String,
    sessionId: String,
  },
  {
    timestamps: true,
  }
);

analyticsSchema.index({ createdAt: -1 });
analyticsSchema.index({ page: 1, createdAt: -1 });
analyticsSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Analytics', analyticsSchema);
