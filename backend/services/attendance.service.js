/**
 * Unified Attendance Service
 *
 * Provides a single source of truth for:
 * 1. Student Academic Profile (Department, Year, Semester, Division)
 *    — reads year/semester/division directly from the users table (canonical)
 * 2. Current Semester Determination & Current Semester Subjects
 * 3. Accurate Subject-wise & Overall Attendance Calculation:
 *    - Total Conducted = completed sessions (is_active = false) for the student's department/year/semester/division
 *    - Total Present = attendance_records with status = 'present' for completed sessions
 *    - Percentage = (Present / Conducted) * 100 (or null if 0 conducted)
 * 4. Subject-wise Lecture History (Present & Absent records)
 * 5. Recent Attendance Events
 */

const { supabase } = require('../config/supabase');
const {
  getYearLabel,
  getDefaultSemesterForYear,
  isValidYearSemester,
  YEAR_SEMESTER_MAP,
} = require('./academic.service');

// YEAR_SEMESTER_MAP is imported from academic.service

/**
 * Resolve student's academic profile from users and classes tables
 *
 * @param {string} studentId
 * @returns {Promise<object>}
 */
const getStudentAcademicProfile = async (studentId) => {
  // 1. Fetch user record — canonical source of year/semester/division
  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('*, departments:departments!users_department_id_fkey(id, name, code)')
    .eq('id', studentId)
    .maybeSingle();

  if (userErr || !user) {
    throw new Error(`Student user record not found: ${userErr?.message || 'not found'}`);
  }

  const department = user.departments || null;
  const departmentId = user.department_id || null;

  // 2. Read academic fields directly from users table (canonical — set by admin or registration)
  let year = user.year || null;
  let division = user.division || null;
  let semester = user.semester || null;

  // 3. Fallback: if users table columns are not yet populated, attempt to derive from classes
  //    This handles legacy data before the migration was run.
  if (!year || !division) {
    let { data: enrolledClass } = await supabase
      .from('classes')
      .select('id, year, division, name, department_id')
      .contains('student_ids', [studentId])
      .eq('is_active', true)
      .maybeSingle();

    if (!enrolledClass && departmentId) {
      const { data: deptClass } = await supabase
        .from('classes')
        .select('id, year, division, name, department_id')
        .eq('department_id', departmentId)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (deptClass) enrolledClass = deptClass;
    }

    if (enrolledClass) {
      year = year || enrolledClass.year;
      division = division || enrolledClass.division;
    }
  }

  // 4. Determine semester from the users table value or fall back to the odd semester for the year
  if (!semester && year) {
    // Check if any active subjects for this department/year have a semester value
    if (departmentId) {
      const { data: activeSubject } = await supabase
        .from('subjects')
        .select('semester')
        .eq('department_id', departmentId)
        .eq('year', year)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      if (activeSubject?.semester) semester = activeSubject.semester;
    }
    // Last resort: default odd semester for the year
    if (!semester) semester = getDefaultSemesterForYear(year);
  }

  // 5. If still no year, we cannot calculate attendance correctly — return a profile with null year
  //    so callers can detect and report the incomplete profile to the user
  const yearLabel = year ? getYearLabel(year) : null;

  return {
    studentId,
    studentName: user.name,
    studentEmail: user.email,
    studentCode: user.student_id,
    departmentId,
    departmentName: department?.name || null,
    departmentCode: department?.code || null,
    department,
    year,
    yearLabel,
    semester,
    semesterLabel: semester ? `Semester ${semester}` : null,
    division,
    isProfileComplete: !!(departmentId && year && semester && division),
  };
};

/**
 * Fetch subjects belonging ONLY to the student's current semester
 *
 * @param {string} studentId
 * @returns {Promise<object>}
 */
const getCurrentSemesterSubjects = async (studentId) => {
  const profile = await getStudentAcademicProfile(studentId);

  if (!profile.departmentId) {
    return { profile, subjects: [] };
  }

  const { data: subjects, error } = await supabase
    .from('subjects')
    .select('*, departments(id, name, code), users(id, name, email)')
    .eq('department_id', profile.departmentId)
    .eq('year', profile.year)
    .eq('semester', profile.semester)
    .eq('is_active', true)
    .order('name');

  if (error) throw error;

  return {
    profile,
    subjects: subjects || [],
  };
};

/**
 * Calculate dynamic attendance for current semester
 *
 * @param {string} studentId
 * @returns {Promise<object>}
 */
const getCurrentSemesterAttendance = async (studentId) => {
  const { profile, subjects } = await getCurrentSemesterSubjects(studentId);

  if (subjects.length === 0) {
    return {
      success: true,
      profile,
      overallPercentage: null,
      totalPresent: 0,
      totalConducted: 0,
      totalSessions: 0,
      subjectStats: [],
      hasSubjects: false,
    };
  }

  const subjectIds = subjects.map((s) => s.id);

  // 1. Fetch all completed sessions for these current semester subjects
  // A lecture belongs to this student if:
  // - subject_id is in current semester subjects
  // - is_active is false (lecture completed)
  // - class matches student's class, OR location metadata matches student's department, year, and division
  const { data: completedSessions, error: sessErr } = await supabase
    .from('attendance_sessions')
    .select('id, subject_id, class_id, location, start_time, end_time, classes(id, year, division, department_id)')
    .in('subject_id', subjectIds)
    .eq('is_active', false)
    .order('start_time', { ascending: true });

  if (sessErr) throw sessErr;

  // Filter sessions that actually belong to the student's class / division / year / department
  const filteredSessions = (completedSessions || []).filter((s) => {
    // If class_id matches directly
    if (profile.classId && s.class_id === profile.classId) return true;

    // Check class properties
    const c = s.classes;
    if (c) {
      const deptMatch = !c.department_id || c.department_id === profile.departmentId;
      const yrMatch = !c.year || c.year === profile.year;
      // Safe toUpperCase — guard against null division on either side
      const divMatch =
        !c.division ||
        !profile.division ||
        c.division.toUpperCase() === profile.division.toUpperCase();
      if (deptMatch && yrMatch && divMatch) return true;
    }

    // Check location JSON metadata
    const loc = s.location || {};
    const locDeptMatch = !loc.departmentId || loc.departmentId === profile.departmentId;
    const locYrMatch = !loc.year || parseInt(loc.year) === profile.year;
    const locDivMatch =
      !loc.division ||
      !profile.division ||
      String(loc.division).toUpperCase() === profile.division.toUpperCase();

    return locDeptMatch && locYrMatch && locDivMatch;
  });

  const sessionIds = filteredSessions.map((s) => s.id);

  // 2. Fetch student's attendance records for these filtered sessions
  let studentRecords = [];
  if (sessionIds.length > 0) {
    const { data: recs, error: recErr } = await supabase
      .from('attendance_records')
      .select('id, session_id, subject_id, status, marked_at')
      .eq('student_id', studentId)
      .in('session_id', sessionIds)
      .eq('status', 'present');

    if (recErr) throw recErr;
    studentRecords = recs || [];
  }

  const presentSessionSet = new Set(studentRecords.map((r) => r.session_id));

  // 3. Aggregate subject-wise stats
  // Group conducted sessions by subject
  const sessionsBySubject = {};
  for (const s of filteredSessions) {
    if (!sessionsBySubject[s.subject_id]) {
      sessionsBySubject[s.subject_id] = [];
    }
    sessionsBySubject[s.subject_id].push(s);
  }

  const subjectStats = subjects.map((sub) => {
    const conductedForSubject = sessionsBySubject[sub.id] || [];
    const totalConducted = conductedForSubject.length;

    // Count present records for this subject
    let presentCount = 0;
    for (const sess of conductedForSubject) {
      if (presentSessionSet.has(sess.id)) {
        presentCount++;
      }
    }

    // Percentage calculation: null if 0 conducted (avoids showing 0% for unconducted subjects)
    const percentage =
      totalConducted > 0
        ? Math.round((presentCount / totalConducted) * 1000) / 10
        : null;

    const isGood = percentage !== null ? percentage >= 75 : null;

    return {
      subject: {
        id: sub.id,
        _id: sub.id,
        name: sub.name,
        subjectCode: sub.subject_code,
        code: sub.subject_code,
        year: sub.year,
        semester: sub.semester,
        totalLectures: sub.total_lectures,
      },
      totalConducted,
      totalSessions: totalConducted,
      presentCount,
      attendedLectures: presentCount,
      percentage,
      isGood,
      statusLabel:
        percentage === null
          ? 'No lectures conducted yet'
          : percentage >= 75
          ? 'Good'
          : 'Needs Attention',
    };
  });

  // 4. Calculate overall attendance for the current semester
  const totalConductedAll = subjectStats.reduce((sum, item) => sum + item.totalConducted, 0);
  const totalPresentAll = subjectStats.reduce((sum, item) => sum + item.presentCount, 0);

  const overallPercentage =
    totalConductedAll > 0
      ? Math.round((totalPresentAll / totalConductedAll) * 1000) / 10
      : null;

  return {
    success: true,
    profile,
    overallPercentage,
    totalPresent: totalPresentAll,
    totalConducted: totalConductedAll,
    totalSessions: totalConductedAll,
    subjectStats,
    hasSubjects: true,
  };
};

/**
 * Get lecture-by-lecture history for a specific subject (includes both Present and Absent)
 *
 * @param {string} studentId
 * @param {string} subjectId
 * @returns {Promise<object>}
 */
const getSubjectAttendanceHistory = async (studentId, subjectId) => {
  const profile = await getStudentAcademicProfile(studentId);

  // 1. Fetch subject details
  const { data: subject, error: subErr } = await supabase
    .from('subjects')
    .select('*, departments(id, name, code), users(id, name, email)')
    .eq('id', subjectId)
    .single();

  if (subErr || !subject) {
    throw new Error('Subject not found');
  }

  // 2. Fetch completed sessions for this subject matching student class / criteria
  const { data: sessions, error: sessErr } = await supabase
    .from('attendance_sessions')
    .select('id, start_time, end_time, location, class_id, users(name), classes(id, year, division, department_id)')
    .eq('subject_id', subjectId)
    .eq('is_active', false)
    .order('start_time', { ascending: false });

  if (sessErr) throw sessErr;

  const filteredSessions = (sessions || []).filter((s) => {
    if (profile.classId && s.class_id === profile.classId) return true;
    const c = s.classes;
    if (c) {
      const deptMatch = !c.department_id || c.department_id === profile.departmentId;
      const yrMatch = !c.year || c.year === profile.year;
      const divMatch =
        !c.division || !profile.division ||
        c.division.toUpperCase() === profile.division.toUpperCase();
      if (deptMatch && yrMatch && divMatch) return true;
    }
    const loc = s.location || {};
    const locDeptMatch = !loc.departmentId || loc.departmentId === profile.departmentId;
    const locYrMatch = !loc.year || parseInt(loc.year) === profile.year;
    const locDivMatch =
      !loc.division || !profile.division ||
      String(loc.division).toUpperCase() === profile.division.toUpperCase();
    return locDeptMatch && locYrMatch && locDivMatch;
  });

  const sessionIds = filteredSessions.map((s) => s.id);

  // 3. Fetch student attendance records for these sessions
  let studentRecords = [];
  if (sessionIds.length > 0) {
    const { data: recs } = await supabase
      .from('attendance_records')
      .select('id, session_id, status, marked_at, ble_verified, qr_verified')
      .eq('student_id', studentId)
      .in('session_id', sessionIds);
    studentRecords = recs || [];
  }

  const recordBySession = {};
  for (const r of studentRecords) {
    recordBySession[r.session_id] = r;
  }

  // 4. Map each completed lecture into lecture history item
  // Assign Lecture 01, 02, etc. in ascending order
  const chronological = [...filteredSessions].reverse();
  const lectureMap = {};
  chronological.forEach((s, index) => {
    const num = (s.location && s.location.lectureNumber) || String(index + 1).padStart(2, '0');
    lectureMap[s.id] = `Lecture ${num}`;
  });

  const lectures = filteredSessions.map((s) => {
    const rec = recordBySession[s.id];
    const isPresent = rec && rec.status === 'present';

    return {
      sessionId: s.id,
      lectureLabel: lectureMap[s.id] || 'Lecture',
      topic: s.location?.topic || 'Classroom Session',
      date: s.start_time,
      status: isPresent ? 'Present' : 'Absent',
      statusColor: isPresent ? 'green' : 'orange',
      markedAt: rec?.marked_at || null,
    };
  });

  const presentCount = lectures.filter((l) => l.status === 'Present').length;
  const totalLectures = lectures.length;
  const percentage =
    totalLectures > 0 ? Math.round((presentCount / totalLectures) * 1000) / 10 : null;

  return {
    success: true,
    subject: {
      id: subject.id,
      name: subject.name,
      code: subject.subject_code,
      year: subject.year,
      semester: subject.semester,
      facultyName: subject.users?.name || 'Faculty',
    },
    profile,
    totalLectures,
    presentCount,
    percentage,
    lectures,
  };
};

/**
 * Get recent attendance records for student (within current semester)
 *
 * @param {string} studentId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
const getRecentAttendance = async (studentId, limit = 5) => {
  const { data: records, error } = await supabase
    .from('attendance_records')
    .select('id, status, marked_at, subjects(id, name, subject_code), attendance_sessions(id, start_time, location)')
    .eq('student_id', studentId)
    .order('marked_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (records || []).map((r) => ({
    id: r.id,
    subjectName: r.subjects?.name || 'Subject',
    subjectCode: r.subjects?.subject_code || '',
    date: r.marked_at,
    status: r.status === 'present' ? 'Present' : 'Absent',
    lectureNumber: r.attendance_sessions?.location?.lectureNumber || '01',
  }));
};

module.exports = {
  YEAR_SEMESTER_MAP,
  getStudentAcademicProfile,
  getCurrentSemesterSubjects,
  getCurrentSemesterAttendance,
  getSubjectAttendanceHistory,
  getRecentAttendance,
};
