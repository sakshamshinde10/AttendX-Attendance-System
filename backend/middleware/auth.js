const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');

/**
 * JWT Authentication Middleware
 * Verifies token from Authorization header and attaches user to req
 */
const protect = async (req, res, next) => {
  let token;

  // Extract token from Authorization header (Bearer <token>)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authentication token provided.',
    });
  }

  try {
    // Verify and decode the JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user from Supabase DB (fresh lookup to check if still active)
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, role, student_id, department_id, subjects, bound_device_id, profile_pic, phone, is_active, is_approved, fcm_token')
      .eq('id', decoded.id)
      .single();

    if (error || !user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'User not found or account deactivated.',
      });
    }

    // Standardize object fields for backward compatibility
    req.user = {
      ...user,
      _id: user.id,
      studentId: user.student_id,
      department: user.department_id,
      boundDeviceId: user.bound_device_id,
      profilePic: user.profile_pic,
      isActive: user.is_active,
      isApproved: user.is_approved,
      fcmToken: user.fcm_token,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired. Please login again.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

module.exports = { protect };

