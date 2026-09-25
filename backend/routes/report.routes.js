const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleGuard');
const { downloadSessionPDF, downloadSessionExcel, getSubjectSummary, getSessionRosterAttendance, getOverallAttendanceReport } = require('../controllers/report.controller');

router.get('/session/:sessionId/roster', protect, authorize('faculty', 'admin'), getSessionRosterAttendance);
router.get('/session/:sessionId/pdf', protect, authorize('faculty', 'admin'), downloadSessionPDF);
router.get('/session/:sessionId/excel', protect, authorize('faculty', 'admin'), downloadSessionExcel);
router.get('/subject/:subjectId/summary', protect, authorize('faculty', 'admin'), getSubjectSummary);
router.get('/overall', protect, authorize('faculty', 'admin'), getOverallAttendanceReport);

module.exports = router;
