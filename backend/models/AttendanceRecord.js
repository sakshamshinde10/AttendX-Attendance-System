const mongoose = require('mongoose');

/**
 * AttendanceRecord - a single attendance mark for one student in one session.
 * Records RSSI for BLE proximity verification evidence.
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
    // Final attendance status
    status: {
      type: String,
      enum: ['present', 'absent', 'late'],
      default: 'present',
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

module.exports = mongoose.model('AttendanceRecord', AttendanceRecordSchema);
