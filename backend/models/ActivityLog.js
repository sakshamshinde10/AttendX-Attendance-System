const mongoose = require('mongoose');

/**
 * ActivityLog - audit trail of all important system actions
 */
const ActivityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    action: {
      type: String,
      required: true,
      // e.g. 'LOGIN', 'MARK_ATTENDANCE', 'START_SESSION', 'EXPORT_REPORT'
    },
    details: String,
    ipAddress: String,
    metadata: mongoose.Schema.Types.Mixed,
    success: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ActivityLogSchema.index({ user: 1, createdAt: -1 });
ActivityLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
