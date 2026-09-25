const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleGuard');
const admin = require('../controllers/admin.controller');

// Dashboard
router.get('/dashboard', protect, authorize('admin'), admin.getAdminDashboard);

// Students
router.get('/students', protect, authorize('admin'), admin.getAllStudents);
router.post('/students', protect, authorize('admin'), admin.createStudent);
router.put('/students/:id', protect, authorize('admin'), admin.updateStudent);
router.delete('/students/:id', protect, authorize('admin'), admin.deleteStudent);

// Faculty
router.get('/faculty', protect, authorize('admin'), admin.getAllFaculty);
router.get('/faculty/pending', protect, authorize('admin'), admin.getPendingFaculty);
router.put('/faculty/:id/approve', protect, authorize('admin'), admin.approveFaculty);
router.delete('/faculty/:id/reject', protect, authorize('admin'), admin.rejectFaculty);
router.post('/faculty', protect, authorize('admin'), admin.createFaculty);
router.put('/faculty/:id', protect, authorize('admin'), admin.updateFaculty);
router.post('/faculty/:id/assign-subject', protect, authorize('admin'), admin.assignSubjectToFaculty);
router.delete('/faculty/:id/subjects/:subjectId', protect, authorize('admin'), admin.unassignSubjectFromFaculty);

// Departments
router.get('/departments', protect, authorize('admin'), admin.getAllDepartments);
router.get('/departments/:id/teachers', protect, authorize('admin'), admin.getDepartmentTeachers);
router.post('/departments', protect, authorize('admin'), admin.createDepartment);
router.put('/departments/:id', protect, authorize('admin'), admin.updateDepartment);
router.delete('/departments/:id', protect, authorize('admin'), admin.deleteDepartment);

// Subjects
router.get('/subjects', protect, authorize('admin'), admin.getAllSubjects);
router.post('/subjects', protect, authorize('admin'), admin.createSubject);
router.put('/subjects/:id', protect, authorize('admin'), admin.updateSubject);

// Classes
router.get('/classes', protect, authorize('admin'), admin.getAllClasses);
router.post('/classes', protect, authorize('admin'), admin.createClass);
router.post('/classes/:classId/students/:studentId', protect, authorize('admin'), admin.addStudentToClass);

module.exports = router;
