const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

/**
 * AttendanceSession model - created by faculty when they start a lecture
 * Contains the encrypted QR token and BLE UUID for that session.
 * QR token auto-refreshes every 30 seconds via a cron-like mechanism.
 */
const AttendanceSessionSchema = new mongoose.Schema(
  {
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
    },
    // Unique BLE UUID broadcast by faculty device during this session
    bleUUID: {
      type: String,
      default: () => uuidv4(),
    },
    // Encrypted QR token payload (refreshes every 30s)
    currentQRToken: {
      type: String,
      required: true,
    },
    // Timestamp when QR was last generated
    qrGeneratedAt: {
      type: Date,
      default: Date.now,
    },
    // Nonce to prevent QR replay attacks - changes with each refresh
    qrNonce: {
      type: String,
      default: () => uuidv4(),
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: Date,
    // Whether session is currently accepting attendance
    isActive: {
      type: Boolean,
      default: true,
    },
    // Count of students who marked attendance
    presentCount: {
      type: Number,
      default: 0,
    },
    location: {
      room: String,
      building: String,
    },
  },
  { timestamps: true }
);

// Index for fast active session lookups
AttendanceSessionSchema.index({ faculty: 1, isActive: 1 });
AttendanceSessionSchema.index({ bleUUID: 1 });

module.exports = mongoose.model('AttendanceSession', AttendanceSessionSchema);
