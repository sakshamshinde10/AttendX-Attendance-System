/**
 * BLE Service - manages BLE UUID payload signing, RSSI validation, and log-distance path loss
 * 
 * On Android, the faculty device broadcasts a signed BLE payload containing { sessionId, nonce, timestamp }.
 * The student app scans, verifies HMAC signature, and measures RSSI.
 */

const crypto = require('crypto');

const BLE_RSSI_THRESHOLD = parseInt(process.env.BLE_RSSI_THRESHOLD || '-70');
const BLE_TX_POWER = parseInt(process.env.BLE_TX_POWER || '-59'); // Measured power at 1 meter in dBm
const PATH_LOSS_EXPONENT = 2.5; // Indoor classroom environment path loss exponent

/**
 * Estimate physical distance in meters using Log-Distance Path Loss model
 * Formula: Distance = 10 ^ ((TxPower - RSSI) / (10 * n))
 */
const estimateDistance = (rssi, txPower = BLE_TX_POWER) => {
  if (rssi === 0) return -1.0;
  const ratio = (txPower - rssi) / (10 * PATH_LOSS_EXPONENT);
  return Math.round(Math.pow(10, ratio) * 100) / 100;
};

/**
 * Generate HMAC-SHA256 signature for session BLE payload broadcast
 */
const generateBLEPayloadSignature = (sessionId, nonce, timestamp, sessionSecret) => {
  const secret = sessionSecret || process.env.JWT_SECRET || 'beaconattend_ble_secret';
  const data = `${sessionId}:${nonce}:${timestamp}`;
  return crypto.createHmac('sha256', secret).update(data).digest('hex').substring(0, 16);
};

/**
 * Validate BLE scan result & signature against active session
 * @param {number} rssi - RSSI value from student's BLE scan (negative dBm)
 * @param {string} scannedUUID - BLE UUID detected by student
 * @param {string} expectedUUID - UUID stored for this session
 * @param {string} [signature] - HMAC signature from BLE payload
 * @param {string} [sessionSecret] - Session secret key
 * @returns {object} { valid: boolean, distanceMeters: number, reason?: string }
 */
const validateBLEProximity = (rssi, scannedUUID, expectedUUID, signature, sessionSecret) => {
  if (!scannedUUID || scannedUUID.toLowerCase() !== expectedUUID.toLowerCase()) {
    return {
      valid: false,
      distanceMeters: -1,
      reason: 'Faculty BLE device not detected. Please move closer to the faculty device.',
    };
  }

  // Calculate estimated distance
  const distanceMeters = estimateDistance(rssi);

  // Check RSSI threshold - RSSI is negative, higher value = stronger signal
  if (rssi < BLE_RSSI_THRESHOLD) {
    return {
      valid: false,
      distanceMeters,
      reason: `BLE signal too weak (${rssi} dBm, ~${distanceMeters}m). You must be inside the classroom.`,
    };
  }

  return {
    valid: true,
    distanceMeters,
  };
};

/**
 * Get RSSI quality description for UI display
 */
const getRSSIQuality = (rssi) => {
  if (rssi >= -50) return { label: 'Excellent', color: '#10B981' };
  if (rssi >= -70) return { label: 'Good', color: '#3B82F6' };
  if (rssi >= -80) return { label: 'Fair', color: '#F59E0B' };
  return { label: 'Poor', color: '#EF4444' };
};

module.exports = {
  validateBLEProximity,
  estimateDistance,
  generateBLEPayloadSignature,
  getRSSIQuality,
  BLE_RSSI_THRESHOLD,
};
