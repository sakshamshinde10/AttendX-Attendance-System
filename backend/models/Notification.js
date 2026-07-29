const mongoose = require('mongoose');

/**
 * Notification model - system push notifications sent to users
 */
const NotificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
    type: {
      type: String,
      enum: ['attendance', 'announcement', 'alert', 'report'],
      default: 'announcement',
    },
    // Can be targeted at 'all', 'students', 'faculty', or specific user IDs
    targetRole: {
      type: String,
      enum: ['all', 'student', 'faculty', 'admin'],
    },
    recipients: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isRead: { type: Boolean, default: false },
    data: mongoose.Schema.Types.Mixed, // Extra metadata
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', NotificationSchema);
