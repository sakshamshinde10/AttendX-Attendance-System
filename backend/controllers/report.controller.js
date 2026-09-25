const { generatePDFReport, generateExcelReport } = require('../services/report.service');
const { supabase } = require('../config/supabase');

/**
 * GET /api/reports/session/:sessionId/pdf
 */
exports.downloadSessionPDF = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { data: session } = await supabase
      .from('attendance_sessions')
      .select('*, subjects(name, subject_code), users(name), classes(name, student_ids)')
      .eq('id', sessionId)
      .maybeSingle();

    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    const { data: records } = await supabase
      .from('attendance_records')
      .select('*, users!student_id(name, email)')
      .eq('session_id', sessionId)
      .order('marked_at', { ascending: true });

    const recordList = records || [];
    const presentCount = recordList.filter((r) => r.status === 'present').length;
    const totalStudents = session.classes?.student_ids?.length || 0;

    const reportData = {
      subject: session.subjects,
      sessionDate: session.start_time,
      faculty: session.users?.name || 'Faculty',
      presentCount,
      totalStudents,
      records: recordList.map((r, i) => ({
        no: i + 1,
        studentName: r.users?.name,
        studentEmail: r.users?.email,
        status: r.status,
        bleRSSI: r.ble_rssi,
        markedAt: r.marked_at,
      })),
    };

    const pdfBuffer = await generatePDFReport(reportData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_${sessionId}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/session/:sessionId/excel
 */
exports.downloadSessionExcel = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { data: session } = await supabase
      .from('attendance_sessions')
      .select('*, subjects(name, subject_code), users(name), classes(name, student_ids)')
      .eq('id', sessionId)
      .maybeSingle();

    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    const { data: records } = await supabase
      .from('attendance_records')
      .select('*, users!student_id(name, email)')
      .eq('session_id', sessionId)
      .order('marked_at', { ascending: true });

    const recordList = records || [];
    const presentCount = recordList.filter((r) => r.status === 'present').length;
    const totalStudents = session.classes?.student_ids?.length || 0;

    const reportData = {
      subject: session.subjects,
      sessionDate: session.start_time,
      faculty: session.users?.name || 'Faculty',
      presentCount,
      totalStudents,
      records: recordList.map((r, i) => ({
        no: i + 1,
        studentName: r.users?.name,
        studentEmail: r.users?.email,
        status: r.status,
        bleRSSI: r.ble_rssi,
        markedAt: r.marked_at,
      })),
    };

    const excelBuffer = await generateExcelReport(reportData);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_${sessionId}.xlsx`);
    res.send(excelBuffer);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/subject/:subjectId/summary
 */
exports.getSubjectSummary = async (req, res, next) => {
  try {
    const { subjectId } = req.params;
    const { data: sessions } = await supabase
      .from('attendance_sessions')
      .select('id')
      .eq('subject_id', subjectId)
      .eq('is_active', false);

    const sessionList = sessions || [];

    const { data: records } = await supabase
      .from('attendance_records')
      .select('*, users!student_id(id, name, email)')
      .eq('subject_id', subjectId);

    const studentMap = {};
    (records || []).forEach((r) => {
      const u = r.users;
      if (!u) return;
      const id = u.id;
      if (!studentMap[id]) {
        studentMap[id] = { student: u, present: 0, total: sessionList.length };
      }
      if (r.status === 'present') studentMap[id].present++;
    });

    const summary = Object.values(studentMap).map((s) => ({
      ...s,
      percentage: ((s.present / Math.max(s.total, 1)) * 100).toFixed(1),
    }));

    res.status(200).json({ success: true, totalSessions: sessionList.length, summary });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/session/:sessionId/roster
 * Fetches complete class roster with PRESENT and ABSENT attendance for CSV generation
 */
exports.getSessionRosterAttendance = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    // 1. Fetch Session with related metadata
    const { data: session, error: sessErr } = await supabase
      .from('attendance_sessions')
      .select('*, subjects(id, name, subject_code, department_id, departments(id, name, code)), users(id, name, email), classes(id, name, year, division, department_id, student_ids, departments(id, name, code))')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessErr || !session) {
      return res.status(404).json({ success: false, message: 'Attendance session not found.' });
    }

    // 2. Security Check: Authenticated teacher must own the session (or be admin)
    if (req.user.role !== 'admin' && session.faculty_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You can only export attendance for your own sessions.',
      });
    }

    // 3. Extract Session Details
    const deptName =
      session.classes?.departments?.name ||
      session.subjects?.departments?.name ||
      'Computer Engineering';
    const deptId =
      session.classes?.department_id ||
      session.subjects?.department_id ||
      session.location?.departmentId;
    const academicYear =
      session.classes?.year ||
      session.location?.year ||
      session.subjects?.year ||
      3;
    const division =
      session.classes?.division ||
      session.location?.division ||
      'A';
    const subjectName =
      session.subjects?.name ||
      'Database Management System';
    const subjectCode =
      session.subjects?.subject_code ||
      'DBMS';
    const lectureNumber =
      session.location?.lectureNumber ||
      '01';
    const topic =
      session.location?.topic ||
      '';

    const startDate = session.start_time ? new Date(session.start_time) : new Date();
    const dateStr = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const startTimeStr = startDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    let endTimeStr = '11:00';
    if (session.end_time) {
      endTimeStr = new Date(session.end_time).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } else {
      const endCalculated = new Date(startDate.getTime() + 60 * 60 * 1000);
      endTimeStr = endCalculated.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    }

    // 4. Fetch Attendance Records for this Session
    const { data: attendanceRecords, error: recErr } = await supabase
      .from('attendance_records')
      .select('*, users!student_id(id, name, email, student_id)')
      .eq('session_id', sessionId);

    if (recErr) throw recErr;

    const recordMap = new Map();
    (attendanceRecords || []).forEach((r) => {
      const sId = r.student_id;
      if (sId) recordMap.set(sId, r);
    });

    // 5. Fetch Complete Class Roster (Academic query + Enrolled classes)
    let classStudentIds = session.classes?.student_ids || [];
    let students = [];

    // Query students matching session's academic criteria
    let studentQuery = supabase
      .from('users')
      .select('id, name, email, student_id, roll_number, department_id, year, semester, division')
      .eq('role', 'student')
      .eq('is_active', true);

    if (deptId) {
      studentQuery = studentQuery.eq('department_id', deptId);
    }
    if (academicYear) {
      const yrInt = parseInt(academicYear, 10);
      if (!isNaN(yrInt)) studentQuery = studentQuery.eq('year', yrInt);
    }
    if (division) {
      studentQuery = studentQuery.ilike('division', String(division).trim());
    }

    const { data: matchedStudents } = await studentQuery;
    students = matchedStudents || [];

    // If class student_ids had specific students not matched above, include them
    if (Array.isArray(classStudentIds) && classStudentIds.length > 0) {
      const { data: enrolledStudents } = await supabase
        .from('users')
        .select('id, name, email, student_id, roll_number, department_id, year, semester, division')
        .in('id', classStudentIds)
        .eq('is_active', true);
      if (enrolledStudents) {
        const idSet = new Set(students.map((s) => s.id));
        for (const es of enrolledStudents) {
          if (!idSet.has(es.id)) {
            students.push(es);
            idSet.add(es.id);
          }
        }
      }
    }

    // Include any students who recorded attendance but were not in the filter
    const enrolledIdSet = new Set(students.map((s) => s.id));
    (attendanceRecords || []).forEach((r) => {
      if (r.users && !enrolledIdSet.has(r.users.id)) {
        students.push(r.users);
        enrolledIdSet.add(r.users.id);
      }
    });

    // Sort students by roll_number or student_id or name
    students.sort((a, b) => {
      const rollA = a.roll_number || a.student_id || a.name || '';
      const rollB = b.roll_number || b.student_id || b.name || '';
      return rollA.localeCompare(rollB, undefined, { numeric: true, sensitivity: 'base' });
    });

    // 6. Combine Datasets into Complete Attendance Roster (Exact 5 columns + backward compat)
    let presentCount = 0;
    const roster = students.map((stu, index) => {
      const rec = recordMap.get(stu.id);
      const isPresent = !!rec && (rec.status === 'present' || rec.status === 'flagged');

      if (isPresent) {
        presentCount++;
      }

      const rollNumber =
        stu.roll_number ||
        String(index + 1);

      const studentId =
        stu.student_id ||
        `STU${String(index + 1).padStart(3, '0')}`;

      let scanTimeStr = '';
      if (isPresent && rec && rec.marked_at) {
        const d = new Date(rec.marked_at);
        scanTimeStr = d.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        });
      }

      return {
        rollNumber,
        studentId,
        studentName: stu.name || 'Student',
        attendance: isPresent ? 'Present' : 'Absent',
        scanTime: isPresent ? scanTimeStr : '',
        // Backwards compatibility for app screens
        rollNo: rollNumber,
        status: isPresent ? 'Present' : 'Absent',
        department: deptName,
        year: String(academicYear),
        division: String(division),
        subject: subjectName,
        lectureNumber: String(lectureNumber).padStart(2, '0'),
        topic: topic || 'General Lecture',
        date: dateStr,
        startTime: startTimeStr,
        endTime: endTimeStr,
        qrVerified: isPresent && rec?.qr_verified ? 'YES' : 'NO',
        bluetoothVerified: isPresent && rec?.ble_verified ? 'YES' : 'NO',
      };
    });

    res.status(200).json({
      success: true,
      sessionInfo: {
        id: session.id,
        department: deptName,
        academicYear,
        division,
        subject: subjectName,
        subjectCode,
        lectureNumber,
        topic,
        date: dateStr,
        startTime: startTimeStr,
        endTime: endTimeStr,
        presentCount,
        totalStudents: roster.length,
        absentCount: Math.max(0, roster.length - presentCount),
      },
      roster,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/overall
 * Calculates overall attendance for Teacher + Subject + Class
 * Returns student roster with Total Lectures, Present, Absent, Attendance %
 */
exports.getOverallAttendanceReport = async (req, res, next) => {
  try {
    const teacherId = req.user.role === 'admin' && req.query.teacherId ? req.query.teacherId : req.user.id;
    const { subjectId, departmentId, year, semester, division } = req.query;

    if (!subjectId) {
      return res.status(400).json({ success: false, message: 'Subject ID is required for overall attendance report.' });
    }

    // 1. Fetch subject details
    const { data: subject, error: subjErr } = await supabase
      .from('subjects')
      .select('id, name, subject_code, department_id, year, semester, departments(id, name, code)')
      .eq('id', subjectId)
      .maybeSingle();

    if (subjErr || !subject) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }

    const targetDeptId = departmentId || subject.department_id;
    const targetYear = year ? parseInt(year, 10) : subject.year;
    const targetSem = semester ? parseInt(semester, 10) : subject.semester;
    const targetDiv = division ? String(division).trim().toUpperCase() : null;

    // 2. Fetch all completed sessions for this teacher + subject
    let sessionQuery = supabase
      .from('attendance_sessions')
      .select('id, subject_id, faculty_id, department_id, year, semester, division, is_active, location, start_time')
      .eq('faculty_id', teacherId)
      .eq('subject_id', subjectId)
      .eq('is_active', false); // Only completed lectures

    if (targetDeptId) {
      sessionQuery = sessionQuery.or(`department_id.eq.${targetDeptId},department_id.is.null`);
    }
    if (targetYear) {
      sessionQuery = sessionQuery.or(`year.eq.${targetYear},year.is.null`);
    }
    if (targetSem) {
      sessionQuery = sessionQuery.or(`semester.eq.${targetSem},semester.is.null`);
    }

    const { data: sessions, error: sessErr } = await sessionQuery;
    if (sessErr) throw sessErr;

    // Filter sessions matching division if specified
    const completedSessions = (sessions || []).filter((s) => {
      if (!targetDiv) return true;
      const sDiv = s.division || s.location?.division;
      return !sDiv || String(sDiv).toUpperCase() === targetDiv;
    });

    const sessionIds = completedSessions.map((s) => s.id);
    const totalLectures = completedSessions.length;

    // 3. Fetch all eligible students for this class
    let studentQuery = supabase
      .from('users')
      .select('id, name, email, student_id, roll_number, department_id, year, semester, division')
      .eq('role', 'student')
      .eq('is_active', true);

    if (targetDeptId) {
      studentQuery = studentQuery.eq('department_id', targetDeptId);
    }
    if (targetYear) {
      studentQuery = studentQuery.eq('year', targetYear);
    }
    if (targetSem) {
      studentQuery = studentQuery.eq('semester', targetSem);
    }
    if (targetDiv) {
      studentQuery = studentQuery.ilike('division', targetDiv);
    }

    const { data: eligibleStudents, error: stuErr } = await studentQuery;
    if (stuErr) throw stuErr;

    let students = eligibleStudents || [];

    // 4. Fetch attendance records for these completed sessions
    const studentPresentCounts = new Map();
    if (sessionIds.length > 0) {
      const { data: records, error: recErr } = await supabase
        .from('attendance_records')
        .select('student_id, session_id, status, users!student_id(id, name, email, student_id, roll_number, department_id, year, semester, division)')
        .in('session_id', sessionIds)
        .in('status', ['present', 'flagged']);

      if (recErr) throw recErr;

      const recordStudentMap = new Map();
      (records || []).forEach((r) => {
        const sId = r.student_id;
        if (!sId) return;
        studentPresentCounts.set(sId, (studentPresentCounts.get(sId) || 0) + 1);
        if (r.users) {
          recordStudentMap.set(sId, r.users);
        }
      });

      // Include any students who attended these sessions even if not in the default filter
      const existingIdSet = new Set(students.map((s) => s.id));
      recordStudentMap.forEach((u, uId) => {
        if (!existingIdSet.has(uId)) {
          students.push(u);
          existingIdSet.add(uId);
        }
      });
    }

    // Sort students by roll_number or student_id or name
    students.sort((a, b) => {
      const rollA = a.roll_number || a.student_id || a.name || '';
      const rollB = b.roll_number || b.student_id || b.name || '';
      return rollA.localeCompare(rollB, undefined, { numeric: true, sensitivity: 'base' });
    });

    // 5. Generate Overall Attendance Rows
    const rows = students.map((stu, index) => {
      const present = studentPresentCounts.get(stu.id) || 0;
      const absent = Math.max(0, totalLectures - present);
      const pctNumber = totalLectures > 0 ? Math.round((present / totalLectures) * 100) : 0;
      const percentageStr = `${pctNumber}%`;

      const rollNumber =
        stu.roll_number ||
        String(index + 1);

      const studentId =
        stu.student_id ||
        `STU${String(index + 1).padStart(3, '0')}`;

      return {
        rollNumber,
        studentId,
        studentName: stu.name || 'Student',
        totalLectures,
        present,
        absent,
        attendancePercentage: percentageStr,
      };
    });

    res.status(200).json({
      success: true,
      meta: {
        teacherName: req.user.name,
        subjectName: subject.name,
        subjectCode: subject.subject_code,
        departmentName: subject.departments?.name,
        year: targetYear,
        semester: targetSem,
        division: targetDiv,
        totalCompletedLectures: totalLectures,
        totalEligibleStudents: rows.length,
      },
      rows,
    });
  } catch (error) {
    next(error);
  }
};
