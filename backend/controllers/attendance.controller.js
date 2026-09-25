const { generateQRToken, verifyQRToken, shouldRefreshQR, QR_EXPIRY_SECONDS } = require('../services/qr.service');
const { validateBLEProximity } = require('../services/ble.service');
const { calculateVerificationScore } = require('../services/security.service');
const { supabase } = require('../config/supabase');
const attendanceService = require('../services/attendance.service');
const { validateAttendanceEligibility } = require('../services/academic.service');

/**
 * POST /api/attendance/sessions/start (or /api/sessions/start)
 * Faculty starts an attendance session for a subject/class.
 */
exports.startSession = async (req, res, next) => {
  try {
    const { subjectId, departmentId, year, division, lectureNumber, topic, classId, location } = req.body;
    const facultyId = req.user.id;

    // Ensure no active session by this faculty
    const { data: existing } = await supabase
      .from('attendance_sessions')
      .select('id')
      .eq('faculty_id', facultyId)
      .eq('is_active', true)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active session. End it before starting a new one.',
        sessionId: existing.id,
      });
    }

    // Validate subject belongs to this faculty (direct or via teacher_subjects)
    const { data: subject } = await supabase
      .from('subjects')
      .select('id, name, faculty_id, department_id')
      .eq('id', subjectId)
      .maybeSingle();

    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }

    let isAssigned = subject.faculty_id === facultyId;
    if (!isAssigned) {
      const { data: tsMatch } = await supabase
        .from('teacher_subjects')
        .select('id')
        .eq('teacher_id', facultyId)
        .eq('subject_id', subjectId)
        .maybeSingle();
      if (tsMatch) isAssigned = true;
    }

    if (!isAssigned) {
      return res.status(403).json({ success: false, message: 'Subject not found or not assigned to you.' });
    }

    // Resolve classId from department / year / division if not directly supplied
    let classIdToUse = classId;
    if (!classIdToUse) {
      let classQuery = supabase.from('classes').select('id, student_ids').eq('is_active', true);
      const targetDept = departmentId || subject.department_id;
      if (targetDept) classQuery = classQuery.eq('department_id', targetDept);
      if (year) classQuery = classQuery.eq('year', parseInt(year));
      if (division) classQuery = classQuery.eq('division', division);
      
      const { data: matchedClass } = await classQuery.maybeSingle();

      if (matchedClass) {
        classIdToUse = matchedClass.id;
      } else {
        const { data: fallbackClass } = await supabase
          .from('classes')
          .select('id')
          .eq('department_id', targetDept)
          .maybeSingle();

        if (fallbackClass) {
          classIdToUse = fallbackClass.id;
        } else {
          // Create a class record if none exists for this department
          const { data: newClass } = await supabase
            .from('classes')
            .insert({
              name: `${year ? `${year} Year` : 'Class'} - Div ${division || 'A'}`,
              year: year ? parseInt(year) : 1,
              division: division || 'A',
              department_id: targetDept,
            })
            .select()
            .single();
          if (newClass) classIdToUse = newClass.id;
        }
      }
    }

    // Bundle session metadata into location JSON (kept for backwards compat)
    const sessionMetadata = {
      ...(location || {}),
      lectureNumber: lectureNumber || '01',
      topic: topic || '',
      year: year ? parseInt(year) : 1,
      division: division || 'A',
      departmentId: departmentId || subject.department_id,
    };

    // Derive semester from the subject if not explicitly provided
    const { data: subjectFull } = await supabase
      .from('subjects')
      .select('semester, year')
      .eq('id', subjectId)
      .maybeSingle();

    const sessionYear = year ? parseInt(year) : (subjectFull?.year || 1);
    const sessionSemester = subjectFull?.semester || ((sessionYear * 2) - 1);
    const sessionDeptId = departmentId || subject.department_id;
    const sessionDivision = division || 'A';

    // Create session with proper academic columns
    const { data: session, error } = await supabase
      .from('attendance_sessions')
      .insert({
        faculty_id: facultyId,
        subject_id: subjectId,
        class_id: classIdToUse,
        location: sessionMetadata,
        current_qr_token: 'init_token',
        department_id: sessionDeptId,
        year: sessionYear,
        semester: sessionSemester,
        division: sessionDivision,
      })
      .select()
      .single();

    if (error) throw error;

    // Generate first QR token
    const { token, nonce, issuedAt, expiresAt } = generateQRToken(session.id);
    const { data: updatedSession, error: updateError } = await supabase
      .from('attendance_sessions')
      .update({
        current_qr_token: token,
        qr_nonce: nonce,
        qr_generated_at: new Date(issuedAt).toISOString(),
      })
      .eq('id', session.id)
      .select()
      .single();

    if (updateError) throw updateError;

    await supabase.from('activity_logs').insert({
      user_id: facultyId,
      action: 'START_SESSION',
      details: `Session started for subject: ${subject.name} (Lecture ${lectureNumber || '01'})`,
      metadata: { sessionId: updatedSession.id, bleUUID: updatedSession.ble_uuid },
    });

    const parsedYr = year ? parseInt(year) : 1;
    const yearLabel = parsedYr === 1 ? '1st Year' : parsedYr === 2 ? '2nd Year' : parsedYr === 3 ? '3rd Year' : parsedYr === 4 ? '4th Year' : `${parsedYr} Year`;

    res.status(201).json({
      success: true,
      message: 'Attendance session started successfully',
      session: {
        id: updatedSession.id,
        _id: updatedSession.id,
        bleUUID: updatedSession.ble_uuid,
        qrToken: updatedSession.current_qr_token,
        qrExpiresAt: expiresAt,
        qrExpirySeconds: QR_EXPIRY_SECONDS,
        subject: subject.name,
        subjectId: subject.id,
        lectureNumber: lectureNumber || '01',
        topic: topic || '',
        year: parsedYr,
        yearLabel,
        division: division || 'A',
        departmentId: departmentId || subject.department_id,
        startTime: updatedSession.start_time,
        presentCount: 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/attendance/sessions/qr-refresh/:sessionId
 */
exports.refreshQR = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { data: session } = await supabase
      .from('attendance_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (!session || !session.is_active) {
      return res.status(404).json({ success: false, message: 'Session not found or already ended.' });
    }

    if (session.faculty_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const { token, nonce, issuedAt, expiresAt } = generateQRToken(sessionId);
    await supabase
      .from('attendance_sessions')
      .update({
        current_qr_token: token,
        qr_nonce: nonce,
        qr_generated_at: new Date(issuedAt).toISOString(),
      })
      .eq('id', sessionId);

    res.status(200).json({
      success: true,
      qrToken: token,
      qrExpiresAt: expiresAt,
      qrExpirySeconds: QR_EXPIRY_SECONDS,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/attendance/mark
 */
exports.markAttendance = async (req, res, next) => {
  try {
    const { sessionId, qrToken, bleRSSI, scannedBLEUUID, deviceId, deviceInfo = {} } = req.body;
    const studentId = req.user.id;

    // 1. Validate session exists and is active
    const { data: session } = await supabase
      .from('attendance_sessions')
      .select('*, subjects(id, name, faculty_id, department_id, year, semester)')
      .eq('id', sessionId)
      .maybeSingle();

    if (!session || !session.is_active) {
      return res.status(400).json({ success: false, message: 'Attendance session has ended or does not exist.' });
    }

    // Check session expiry
    if (session.end_time && new Date(session.end_time) < new Date()) {
      return res.status(400).json({ success: false, message: 'Attendance session has expired.' });
    }

    // 2. Validate teacher authorization for subject
    const subjectRow = session.subjects;
    if (subjectRow && subjectRow.faculty_id !== session.faculty_id) {
      const { data: tsCheck } = await supabase
        .from('teacher_subjects')
        .select('id')
        .eq('teacher_id', session.faculty_id)
        .eq('subject_id', session.subject_id)
        .maybeSingle();
      if (!tsCheck) {
        return res.status(403).json({ success: false, message: 'Teacher is not authorized for this subject.' });
      }
    }

    // 3. Check duplicate attendance (DB UNIQUE constraint is the real guard)
    const { data: existing } = await supabase
      .from('attendance_records')
      .select('id, status, marked_at')
      .eq('session_id', sessionId)
      .eq('student_id', studentId)
      .maybeSingle();

    if (existing) {
      return res.status(200).json({
        success: true,
        alreadyMarked: true,
        message: 'Attendance already recorded for this lecture.',
        record: {
          id: existing.id,
          _id: existing.id,
          status: existing.status,
          markedAt: existing.marked_at,
        },
      });
    }

    // 4. Server-side academic eligibility check
    //    Fetch student profile from DB — never trust client-sent academic data
    const { data: studentUser } = await supabase
      .from('users')
      .select('department_id, year, semester, division, bound_device_id, role')
      .eq('id', studentId)
      .maybeSingle();

    if (!studentUser) {
      return res.status(403).json({ success: false, message: 'Student profile not found.' });
    }

    if (studentUser.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Only students can mark attendance.' });
    }

    // Build student profile from DB
    const studentProfile = {
      departmentId: studentUser.department_id,
      year: studentUser.year,
      semester: studentUser.semester,
      division: studentUser.division,
    };

    // Build session academic context from DB (prefer dedicated columns, fall back to location JSONB)
    const loc = session.location || {};
    const sessionProfile = {
      departmentId: session.department_id || (loc.departmentId ? loc.departmentId : null),
      year: session.year || (loc.year ? parseInt(loc.year) : null),
      semester: session.semester || null,
      division: session.division || loc.division || null,
    };

    const { eligible, reason } = validateAttendanceEligibility(studentProfile, sessionProfile);
    if (!eligible) {
      return res.status(403).json({
        success: false,
        message: reason || 'You are not eligible to mark attendance for this session.',
      });
    }

    // 5. Verify BLE Session UUID
    if (!scannedBLEUUID || scannedBLEUUID.toLowerCase() !== (session.ble_uuid || '').toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: 'Bluetooth session mismatch. You must be in range of the teacher device advertising this session.',
      });
    }

    // 6. Verify Dynamic QR token (accepts client scannedAt timestamp if offline synced)
    const clientScanTime = req.body.scannedAt || req.body.timestamp;
    const qrResult = verifyQRToken(qrToken, sessionId, clientScanTime);
    if (!qrResult.valid) {
      return res.status(400).json({
        success: false,
        message: 'QR code is invalid or has expired. Please scan the newly refreshed QR code on the teacher screen.',
      });
    }
    const qrAgeMs = qrResult.payload ? Date.now() - qrResult.payload.issuedAt : 999999;

    // 7. Verify BLE Proximity & RSSI
    const bleResult = validateBLEProximity(bleRSSI, scannedBLEUUID, session.ble_uuid);

    // 8. Verify Device Binding (use already-fetched studentUser)
    let deviceIdMatch = true;
    if (studentUser.bound_device_id && deviceId) {
      deviceIdMatch = studentUser.bound_device_id === deviceId;
    } else if (deviceId && !studentUser.bound_device_id) {
      await supabase.from('users').update({ bound_device_id: deviceId }).eq('id', studentId);
    }

    // 9. Compute Multi-Factor Verification Score
    const { score, status, factors, reasons } = calculateVerificationScore({
      bleValid: bleResult.valid,
      bleRSSI,
      qrValid: qrResult.valid,
      qrAgeMs,
      deviceIdMatch,
      deviceInfo,
    });

    if (status === 'rejected') {
      return res.status(400).json({
        success: false,
        message: reasons.length > 0 ? reasons.join(' ') : 'Proximity attestation failed. Please ensure Bluetooth is enabled and you are inside the classroom.',
        verificationScore: score,
        reasons,
      });
    }

    const markedAtISO = clientScanTime && !isNaN(Number(clientScanTime))
      ? new Date(Number(clientScanTime)).toISOString()
      : new Date().toISOString();

    // 10. Insert record
    const { data: record, error: recordErr } = await supabase
      .from('attendance_records')
      .insert({
        session_id: sessionId,
        student_id: studentId,
        subject_id: session.subject_id,
        ble_rssi: bleRSSI,
        distance_meters: bleResult.distanceMeters,
        ble_verified: bleResult.valid,
        qr_verified: qrResult.valid,
        device_id: deviceId || studentUser?.bound_device_id || req.user?.bound_device_id,
        verification_score: score,
        trust_factors: factors,
        flagged_reasons: reasons,
        status,
        marked_at: markedAtISO,
        ip_address: req.ip,
        device_info: req.headers['user-agent'],
      })
      .select()
      .single();

    if (recordErr) throw recordErr;

    // 8. If status is present, increment session count
    if (status === 'present') {
      await supabase
        .from('attendance_sessions')
        .update({ present_count: (session.present_count || 0) + 1 })
        .eq('id', sessionId);
    }

    await supabase.from('activity_logs').insert({
      user_id: studentId,
      action: 'MARK_ATTENDANCE',
      details: `Attendance marked (${status}) for ${session.subjects?.name || 'subject'}`,
      metadata: { sessionId, score, status, bleRSSI },
    });

    const isFlagged = status === 'flagged';
    res.status(200).json({
      success: true,
      message: isFlagged
        ? 'Attendance submitted and queued for faculty review (signal/device borderline).'
        : 'Attendance marked successfully! ✅',
      record: {
        id: record.id,
        _id: record.id,
        subject: session.subjects?.name || 'Subject',
        markedAt: record.marked_at,
        bleRSSI,
        distanceMeters: bleResult.distanceMeters,
        verificationScore: score,
        status: record.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/attendance/session/:sessionId/flagged
 */
exports.getFlaggedRecords = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { data: session } = await supabase.from('attendance_sessions').select('faculty_id').eq('id', sessionId).maybeSingle();

    if (!session || session.faculty_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const { data: records, error } = await supabase
      .from('attendance_records')
      .select('*, student:users!attendance_records_student_id_fkey(name, email, profile_pic, phone)')
      .eq('session_id', sessionId)
      .eq('status', 'flagged')
      .order('marked_at', { ascending: false });

    if (error) {
      const { data: fbRecords } = await supabase
        .from('attendance_records')
        .select('*, users!student_id(name, email, profile_pic, phone)')
        .eq('session_id', sessionId)
        .eq('status', 'flagged');
      return res.status(200).json({ success: true, records: fbRecords || [], count: fbRecords?.length || 0 });
    }

    res.status(200).json({ success: true, records: records || [], count: records?.length || 0 });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/attendance/record/:recordId/review
 */
exports.reviewRecord = async (req, res, next) => {
  try {
    const { recordId } = req.params;
    const { status, reviewNote } = req.body;

    if (!['present', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be present or rejected.' });
    }

    const { data: record } = await supabase
      .from('attendance_records')
      .select('*, attendance_sessions(faculty_id, id, present_count)')
      .eq('id', recordId)
      .maybeSingle();

    if (!record) {
      return res.status(404).json({ success: false, message: 'Attendance record not found.' });
    }

    if (record.attendance_sessions?.faculty_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const prevStatus = record.status;
    const { data: updatedRecord, error } = await supabase
      .from('attendance_records')
      .update({
        status,
        review_note: reviewNote || `Reviewed by faculty (${status})`,
        reviewed_by: req.user.id,
      })
      .eq('id', recordId)
      .select()
      .single();

    if (error) throw error;

    if (prevStatus !== 'present' && status === 'present') {
      await supabase
        .from('attendance_sessions')
        .update({ present_count: (record.attendance_sessions?.present_count || 0) + 1 })
        .eq('id', record.session_id);
    }

    res.status(200).json({ success: true, message: `Record marked as ${status}`, record: updatedRecord });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/attendance/sessions/end/:sessionId
 */
exports.endSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    let session = null;

    if (sessionId && sessionId !== 'active' && sessionId !== 'undefined') {
      const { data } = await supabase.from('attendance_sessions').select('*').eq('id', sessionId).maybeSingle();
      session = data;
    }

    // Fallback: look up any currently active session for this faculty
    if (!session) {
      const { data } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('faculty_id', req.user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      session = data;
    }

    if (!session || session.faculty_id !== req.user.id) {
      return res.status(200).json({ success: true, message: 'No active session found to end.' });
    }

    const actualSessionId = session.id;
    const nowISO = new Date().toISOString();
    await supabase
      .from('attendance_sessions')
      .update({
        is_active: false,
        end_time: nowISO,
        current_qr_token: '',
      })
      .eq('id', actualSessionId);

    const [presentRes, flaggedRes] = await Promise.all([
      supabase.from('attendance_records').select('*', { count: 'exact', head: true }).eq('session_id', actualSessionId).eq('status', 'present'),
      supabase.from('attendance_records').select('*', { count: 'exact', head: true }).eq('session_id', actualSessionId).eq('status', 'flagged'),
    ]);

    let totalStudents = 0;
    if (session.class_id) {
      const classRes = await supabase.from('classes').select('student_ids').eq('id', session.class_id).maybeSingle();
      totalStudents = classRes.data?.student_ids?.length || 0;
    }

    const presentCount = presentRes?.count || 0;
    const flaggedCount = flaggedRes?.count || 0;
    const durationMinutes = Math.round((new Date(nowISO).getTime() - new Date(session.start_time).getTime()) / 60000);

    res.status(200).json({
      success: true,
      message: 'Attendance session ended successfully',
      summary: {
        presentCount,
        flaggedCount,
        totalStudents,
        absentCount: Math.max(0, totalStudents - presentCount),
        durationMinutes,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/attendance/sessions/active
 */
exports.getActiveSession = async (req, res, next) => {
  try {
    const { data: session } = await supabase
      .from('attendance_sessions')
      .select('*, subjects(id, name, subject_code), classes(id, name, year, division)')
      .eq('faculty_id', req.user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (!session) {
      return res.status(200).json({ success: true, session: null });
    }

    const needsRefresh = shouldRefreshQR(session.qr_generated_at);
    let currentToken = session.current_qr_token;
    if (needsRefresh) {
      const { token, nonce, issuedAt } = generateQRToken(session.id);
      currentToken = token;
      await supabase
        .from('attendance_sessions')
        .update({
          current_qr_token: token,
          qr_nonce: nonce,
          qr_generated_at: new Date(issuedAt).toISOString(),
        })
        .eq('id', session.id);
    }

    const { data: presentStudents } = await supabase
      .from('attendance_records')
      .select('id, marked_at, ble_rssi, verification_score, status, users!student_id(id, name, email, profile_pic)')
      .eq('session_id', session.id)
      .in('status', ['present', 'flagged'])
      .order('marked_at', { ascending: false });

    const loc = session.location || {};
    const yr = loc.year || session.classes?.year || 1;
    const yrLabel = yr === 1 ? '1st Year' : yr === 2 ? '2nd Year' : yr === 3 ? '3rd Year' : yr === 4 ? '4th Year' : `${yr} Year`;
    const totalStudents = session.classes?.student_ids?.length || 42; // default realistic class capacity if empty

    res.status(200).json({
      success: true,
      session: {
        id: session.id,
        _id: session.id,
        subject: session.subjects,
        class: session.classes,
        bleUUID: session.ble_uuid,
        qrToken: currentToken,
        presentCount: session.present_count,
        totalStudents,
        startTime: session.start_time,
        lectureNumber: loc.lectureNumber || '01',
        topic: loc.topic || '',
        year: yr,
        yearLabel: yrLabel,
        division: loc.division || session.classes?.division || 'A',
      },
      presentStudents: (presentStudents || []).map((r) => ({
        id: r.id,
        student: r.users,
        markedAt: r.marked_at,
        bleRSSI: r.ble_rssi,
        verificationScore: r.verification_score,
        status: r.status,
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/attendance/history/student
 */
exports.getStudentAttendanceHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, subjectId } = req.query;
    let query = supabase
      .from('attendance_records')
      .select('*, subjects(id, name, subject_code), attendance_sessions(start_time, end_time, faculty_id, users(name))', { count: 'exact' })
      .eq('student_id', req.user.id);

    if (subjectId) query = query.eq('subject_id', subjectId);

    const from = (parseInt(page) - 1) * parseInt(limit);
    const to = from + parseInt(limit) - 1;

    const { data: records, count, error } = await query
      .order('marked_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    const mapped = (records || []).map((r) => ({
      ...r,
      _id: r.id,
      subject: r.subjects,
      session: {
        startTime: r.attendance_sessions?.start_time,
        endTime: r.attendance_sessions?.end_time,
        faculty: r.attendance_sessions?.users,
      },
      markedAt: r.marked_at,
    }));

    res.status(200).json({ success: true, records: mapped, total: count || 0, page: parseInt(page) });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/attendance/stats
 * Returns current-semester subject-wise and overall attendance for the authenticated student.
 * Uses unified attendance.service for consistent, accurate calculation.
 */
exports.getStudentAttendanceStats = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const result = await attendanceService.getCurrentSemesterAttendance(studentId);
    const recentRecords = await attendanceService.getRecentAttendance(studentId, 5);

    res.status(200).json({
      success: true,
      overallPercentage: result.overallPercentage,
      totalPresent: result.totalPresent,
      totalSessions: result.totalConducted,
      totalConducted: result.totalConducted,
      subjectStats: result.subjectStats,
      hasSubjects: result.hasSubjects,
      profile: result.profile,
      recentAttendance: recentRecords,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/attendance/subject/:subjectId/history
 * Returns lecture-by-lecture history (Present & Absent) for a specific subject
 * for the authenticated student in the current semester.
 */
exports.getSubjectHistory = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { subjectId } = req.params;
    const result = await attendanceService.getSubjectAttendanceHistory(studentId, subjectId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};


/**
 * GET /api/attendance/session/:sessionId/records
 */
exports.getSessionRecords = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { data: session } = await supabase.from('attendance_sessions').select('faculty_id').eq('id', sessionId).maybeSingle();

    if (!session || session.faculty_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const { data: records, error } = await supabase
      .from('attendance_records')
      .select('*, users!student_id(name, email, profile_pic, phone)')
      .eq('session_id', sessionId)
      .order('marked_at', { ascending: false });

    if (error) throw error;
    res.status(200).json({ success: true, records: records || [], count: records?.length || 0 });
  } catch (error) {
    next(error);
  }
};
