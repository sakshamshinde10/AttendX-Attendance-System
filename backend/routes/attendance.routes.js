const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleGuard');
const {
  startSession, refreshQR, markAttendance, endSession,
  getActiveSession, getStudentAttendanceHistory, getStudentAttendanceStats,
  getSessionRecords, getSubjectHistory
} = require('../controllers/attendance.controller');

// Faculty routes
router.post('/sessions/start', protect, authorize('faculty'), startSession);
router.get('/sessions/active', protect, authorize('faculty'), getActiveSession);
router.get('/sessions/qr-refresh/:sessionId', protect, authorize('faculty'), refreshQR);
router.put('/sessions/end/:sessionId', protect, authorize('faculty'), endSession);
router.get('/sessions/:sessionId/records', protect, authorize('faculty', 'admin'), getSessionRecords);

// Student routes
router.post('/mark', protect, authorize('student'), markAttendance);
router.get('/history', protect, authorize('student'), getStudentAttendanceHistory);
router.get('/stats', protect, authorize('student'), getStudentAttendanceStats);
router.get('/subject/:subjectId/history', protect, authorize('student'), getSubjectHistory);

module.exports = router;

