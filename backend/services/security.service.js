/**
 * Security Service - SWAS Multi-Factor Proximity Attestation Engine
 * 
 * Computes a weighted verification score (0–100) combining:
 * 1. Signed BLE Proximity & RSSI signal strength (40% weight)
 * 2. Dynamic Rotating TOTP QR token validity & freshness (40% weight)
 * 3. Verified Bound Device ID & Hardware Attestation (20% weight)
 */

/**
 * Assess device risk based on headers / payload flags
 * @param {object} deviceInfo - Hardware / environment metadata from request
 */
const evaluateDeviceRisk = (deviceInfo = {}) => {
  let riskPenalty = 0;
  const flags = [];

  if (deviceInfo.isMockLocation) {
    riskPenalty += 30;
    flags.push('MOCK_LOCATION_DETECTED');
  }

  if (deviceInfo.isRooted) {
    riskPenalty += 20;
    flags.push('POSSIBLE_ROOT_OR_JAILBREAK');
  }

  if (deviceInfo.isEmulator) {
    riskPenalty += 40;
    flags.push('EMULATOR_ENVIRONMENT');
  }

  return { riskPenalty, flags };
};

/**
 * Calculate multi-factor verification score and status
 * 
 * @param {object} params
 * @param {boolean} params.bleValid - Whether BLE signature and UUID matched
 * @param {number} params.bleRSSI - Recorded signal strength in dBm (-30 to -100)
 * @param {boolean} params.qrValid - Whether dynamic QR token is valid and unexpired
 * @param {number} params.qrAgeMs - Age of scanned QR token in milliseconds
 * @param {boolean} params.deviceIdMatch - Whether submitted deviceId matches student's bound device
 * @param {object} params.deviceInfo - Device environment risk flags
 * 
 * @returns {object} { score, status, factors, reasons }
 */
const calculateVerificationScore = ({
  bleValid,
  bleRSSI,
  qrValid,
  qrAgeMs = 0,
  deviceIdMatch,
  studentHasBoundDevice = false,
  deviceInfo = {},
}) => {
  let score = 0;
  const reasons = [];

  // Factor 1: BLE Signal & Proximity (Max 40 pts)
  let bleScore = 0;
  if (bleValid) {
    if (bleRSSI >= -60) {
      bleScore = 40; // Excellent proximity (< 1-2m)
    } else if (bleRSSI >= -70) {
      bleScore = 35; // Good proximity (~2-3m)
    } else if (bleRSSI >= -80) {
      bleScore = 20; // Weak proximity (edge of room)
      reasons.push(`Weak BLE signal (${bleRSSI} dBm).`);
    } else {
      bleScore = 10; // Very weak signal
      reasons.push(`BLE signal critical (${bleRSSI} dBm).`);
    }
  } else {
    reasons.push('BLE proximity check failed or missing.');
  }
  score += bleScore;

  // Factor 2: Dynamic QR Freshness (Max 40 pts)
  let qrScore = 0;
  if (qrValid) {
    if (qrAgeMs <= 10000) {
      qrScore = 40; // Fresh (< 10s old)
    } else if (qrAgeMs <= 25000) {
      qrScore = 30; // Acceptable (< 25s old)
    } else {
      qrScore = 20; // Near expiry
      reasons.push('QR token near expiry window.');
    }
  } else {
    reasons.push('QR token verification failed or expired.');
  }
  score += qrScore;

  // Factor 3: Device Hardware Binding (Max 20 pts)
  let deviceScore = 0;
  if (deviceIdMatch) {
    deviceScore = 20;
  } else {
    reasons.push('Unrecognized device ID submitted for this account.');
  }
  score += deviceScore;

  // Deduct penalties for security risk flags
  const { riskPenalty, flags } = evaluateDeviceRisk(deviceInfo);
  score = Math.max(0, score - riskPenalty);

  // Determine attendance status based on score threshold
  // In Expo Go mode (where native BLE hardware is unavailable), valid QR + device is sufficient for present
  let status = 'rejected';
  const isExpoGo = deviceInfo?.isExpoGo || !deviceInfo?.hasNativeBLE;
  
  if (score >= 75) {
    status = 'present';
  } else if (isExpoGo && qrValid && (deviceIdMatch || !studentHasBoundDevice)) {
    // Student scanned dynamic rotating QR in classroom and device verified, but running inside Expo Go
    status = 'present';
    score = Math.max(score, 80);
    reasons.push('BLE hardware attestation skipped (Expo Go client constraint).');
  } else if (score >= 50) {
    status = 'flagged'; // Faculty review required
  }

  return {
    score,
    status,
    factors: {
      bleScore,
      qrScore,
      deviceScore,
      riskPenalty,
      flags,
      isExpoGo,
    },
    reasons,
  };
};

module.exports = {
  calculateVerificationScore,
  evaluateDeviceRisk,
};
