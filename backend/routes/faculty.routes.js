const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleGuard');
const {
  getFacultyDashboard, getMySubjects, getDepartments, getMyClasses,
  getSessionHistory, getClassStudents, updateProfile
} = require('../controllers/faculty.controller');

router.get('/dashboard', protect, authorize('faculty'), getFacultyDashboard);
router.get('/subjects', protect, authorize('faculty'), getMySubjects);
router.get('/departments', protect, authorize('faculty'), getDepartments);
router.get('/classes', protect, authorize('faculty'), getMyClasses);
router.get('/sessions', protect, authorize('faculty'), getSessionHistory);
router.get('/students/:classId', protect, authorize('faculty'), getClassStudents);
router.put('/profile', protect, authorize('faculty'), updateProfile);

module.exports = router;
