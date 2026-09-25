const mongoose = require('mongoose');

/**
 * AttendanceRecord - single attendance mark for one student in one session.
 * Stores RSSI, verification score, trust factors, and bound device ID.
 */
const AttendanceRecordSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AttendanceSession',
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    // RSSI value from BLE scan (e.g. -65 dBm = nearby, -90 dBm = far)
    bleRSSI: {
      type: Number,
    },
    // Estimated distance in meters
    distanceMeters: {
      type: Number,
      default: -1,
    },
    // Whether BLE verification passed
    bleVerified: {
      type: Boolean,
      default: false,
    },
    // Whether QR token was valid at time of scan
    qrVerified: {
      type: Boolean,
      default: false,
    },
    // Unique device ID hardware binding
    deviceId: {
      type: String,
    },
    // Overall multi-factor trust score (0 - 100)
    verificationScore: {
      type: Number,
      default: 0,
    },
    // Detailed factor breakdown
    trustFactors: {
      type: Object,
      default: {},
    },
    flaggedReasons: {
      type: [String],
      default: [],
    },
    // Final attendance status
    status: {
      type: String,
      enum: ['present', 'flagged', 'rejected', 'absent'],
      default: 'present',
    },
    reviewNote: {
      type: String,
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    markedAt: {
      type: Date,
      default: Date.now,
    },
    // IP address for security audit
    ipAddress: String,
    deviceInfo: String,
  },
  { timestamps: true }
);

// Prevent duplicate attendance for same student in same session
AttendanceRecordSchema.index({ session: 1, student: 1 }, { unique: true });
AttendanceRecordSchema.index({ student: 1, subject: 1 });
AttendanceRecordSchema.index({ session: 1, status: 1 });

module.exports = mongoose.model('AttendanceRecord', AttendanceRecordSchema);
