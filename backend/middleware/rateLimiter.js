/**
 * In-Memory Sliding Window Rate Limiter Middleware
 * Protects auth and attendance endpoints from brute-force & API spam
 */

const requestMap = new Map();

/**
 * Creates a rate limiter middleware
 * @param {number} windowMs - Time frame in milliseconds
 * @param {number} maxRequests - Max allowed requests per IP in the window
 * @param {string} message - Custom error message
 */
const createRateLimiter = ({ windowMs = 60000, maxRequests = 10, message = 'Too many requests. Please try again later.' }) => {
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown_ip';
    const key = `${req.baseUrl}${req.path}:${ip}`;
    const now = Date.now();

    if (!requestMap.has(key)) {
      requestMap.set(key, []);
    }

    const timestamps = requestMap.get(key).filter((time) => now - time < windowMs);
    timestamps.push(now);
    requestMap.set(key, timestamps);

    if (timestamps.length > maxRequests) {
      return res.status(429).json({
        success: false,
        message,
        retryAfterSeconds: Math.ceil((windowMs - (now - timestamps[0])) / 1000),
      });
    }

    next();
  };
};

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of requestMap.entries()) {
    const valid = timestamps.filter((time) => now - time < 300000);
    if (valid.length === 0) {
      requestMap.delete(key);
    } else {
      requestMap.set(key, valid);
    }
  }
}, 300000);

module.exports = {
  authRateLimiter: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 60,
    message: 'Too many login/registration attempts. Please wait 1 minute.',
  }),
  attendanceRateLimiter: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 60,
    message: 'Attendance submission rate limit exceeded. Please wait a moment.',
  }),
  createRateLimiter,
};
