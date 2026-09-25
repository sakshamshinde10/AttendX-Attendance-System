const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

/**
 * QR Service - handles encrypted QR token generation, validation, and refresh
 * 
 * Token structure (before encryption):
 * { sessionId, nonce, issuedAt, expiresAt }
 * 
 * The token is AES-256-CBC encrypted so students cannot forge it.
 */

const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = Buffer.from(
  crypto.createHash('sha256').update(process.env.JWT_SECRET || 'beaconattend_secret').digest('hex').slice(0, 32)
);
const QR_EXPIRY_SECONDS = parseInt(process.env.QR_EXPIRY_SECONDS || '30');

/**
 * Generate a new encrypted QR token for an active session
 * @param {string} sessionId - The MongoDB session ID
 * @returns {object} { token, nonce, issuedAt, expiresAt }
 */
const generateQRToken = (sessionId) => {
  const nonce = uuidv4(); // Unique per generation to prevent replay
  const issuedAt = Date.now();
  const expiresAt = issuedAt + QR_EXPIRY_SECONDS * 1000;

  const payload = JSON.stringify({ sessionId, nonce, issuedAt, expiresAt });

  // Encrypt with random IV for each token
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
  let encrypted = cipher.update(payload, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Prepend IV to token so we can decrypt later
  const token = iv.toString('hex') + ':' + encrypted;

  return { token, nonce, issuedAt, expiresAt };
};

/**
 * Verify and decrypt a QR token
 * @param {string} token - The encrypted token from the QR scan
 * @param {string} expectedSessionId - The session ID to validate against
 * @param {number|null} scannedAt - Optional client scan timestamp for offline sync
 * @returns {object} { valid: boolean, reason?: string, payload?: object }
 */
const verifyQRToken = (token, expectedSessionId, scannedAt = null) => {
  try {
    const [ivHex, encryptedData] = token.split(':');
    if (!ivHex || !encryptedData) {
      return { valid: false, reason: 'Malformed QR token' };
    }

    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    const payload = JSON.parse(decrypted);

    // Check expiry: use scannedAt if offline synced, otherwise Date.now()
    const checkTime = scannedAt && !isNaN(Number(scannedAt)) ? Number(scannedAt) : Date.now();
    if (checkTime > payload.expiresAt + 10000) {
      return { valid: false, reason: 'QR code was expired when scanned. Please scan the new code.' };
    }

    // Check session ID matches
    if (payload.sessionId !== expectedSessionId) {
      return { valid: false, reason: 'QR code does not match the active session.' };
    }

    return { valid: true, payload };
  } catch (err) {
    return { valid: false, reason: 'Invalid or tampered QR code.' };
  }
};

/**
 * Check if a QR token needs to be refreshed (older than threshold)
 * @param {Date} qrGeneratedAt - When the current QR was generated
 */
const shouldRefreshQR = (qrGeneratedAt) => {
  const elapsed = (Date.now() - new Date(qrGeneratedAt).getTime()) / 1000;
  return elapsed >= QR_EXPIRY_SECONDS;
};

module.exports = { generateQRToken, verifyQRToken, shouldRefreshQR, QR_EXPIRY_SECONDS };
