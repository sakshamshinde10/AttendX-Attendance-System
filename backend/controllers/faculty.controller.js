const { supabase } = require('../config/supabase');

/**
 * GET /api/faculty/dashboard
 */
exports.getFacultyDashboard = async (req, res, next) => {
  try {
    const facultyId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowISO = tomorrow.toISOString();

    const [subjectsRes, todaySessionsRes, activeSessionRes, totalSessionsRes] = await Promise.all([
      supabase.from('subjects').select('*, departments(id, name)').eq('faculty_id', facultyId).eq('is_active', true),
      supabase
        .from('attendance_sessions')
        .select('*, subjects(name, subject_code), classes(name)')
        .eq('faculty_id', facultyId)
        .gte('start_time', todayISO)
        .lt('start_time', tomorrowISO),
      supabase
        .from('attendance_sessions')
        .select('*, subjects(name, subject_code)')
        .eq('faculty_id', facultyId)
        .eq('is_active', true)
        .maybeSingle(),
      supabase.from('attendance_sessions').select('*', { count: 'exact', head: true }).eq('faculty_id', facultyId),
    ]);

    const active = activeSessionRes.data;

    res.status(200).json({
      success: true,
      dashboard: {
        subjectsCount: subjectsRes.data?.length || 0,
        subjects: subjectsRes.data || [],
        todaySessionsCount: todaySessionsRes.data?.length || 0,
        todaySessions: todaySessionsRes.data || [],
        activeSession: active
          ? {
              id: active.id,
              _id: active.id,
              subject: active.subjects,
              presentCount: active.present_count,
              startTime: active.start_time,
              bleUUID: active.ble_uuid,
            }
          : null,
        totalSessions: totalSessionsRes.count || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/faculty/subjects
 */
exports.getMySubjects = async (req, res, next) => {
  try {
    // 1. Direct subjects where faculty_id = req.user.id
    const { data: directSubjects } = await supabase
      .from('subjects')
      .select('*, departments(id, name, code)')
      .eq('faculty_id', req.user.id)
      .eq('is_active', true)
      .order('name');

    // 2. Also check teacher_subjects mapping table
    let assignedSubjectIds = [];
    const { data: tsRows } = await supabase
      .from('teacher_subjects')
      .select('subject_id')
      .eq('teacher_id', req.user.id);
    if (tsRows && tsRows.length > 0) {
      assignedSubjectIds = tsRows.map((r) => r.subject_id);
    }

    let mappedSubjects = directSubjects || [];
    if (assignedSubjectIds.length > 0) {
      const { data: moreSubjects } = await supabase
        .from('subjects')
        .select('*, departments(id, name, code)')
        .in('id', assignedSubjectIds)
        .eq('is_active', true);

      if (moreSubjects) {
        // Merge without duplicates
        const existingIds = new Set(mappedSubjects.map((s) => s.id));
        for (const s of moreSubjects) {
          if (!existingIds.has(s.id)) {
            mappedSubjects.push(s);
          }
        }
      }
    }

    const mapped = mappedSubjects.map((s) => ({
      ...s,
      _id: s.id,
      department: s.departments || s.department_id,
      subjectCode: s.subject_code,
    }));
    res.status(200).json({ success: true, subjects: mapped });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/faculty/departments
 */
exports.getDepartments = async (req, res, next) => {
  try {
    const { data: departments, error } = await supabase
      .from('departments')
      .select('id, name, code, description')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    const mapped = (departments || []).map((d) => ({
      ...d,
      _id: d.id,
    }));
    res.status(200).json({ success: true, departments: mapped });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/faculty/classes
 */
exports.getMyClasses = async (req, res, next) => {
  try {
    const { data: subjects } = await supabase.from('subjects').select('department_id').eq('faculty_id', req.user.id);
    const deptIds = [...new Set((subjects || []).map((s) => s.department_id).filter(Boolean))];

    const { data: classes, error } = await supabase
      .from('classes')
      .select('*, departments(name)')
      .in('department_id', deptIds.length > 0 ? deptIds : ['00000000-0000-0000-0000-000000000000'])
      .eq('is_active', true);

    if (error) throw error;
    const mapped = (classes || []).map((c) => ({
      ...c,
      _id: c.id,
      department: c.departments,
    }));
    res.status(200).json({ success: true, classes: mapped });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/faculty/sessions
 */
exports.getSessionHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, subjectId } = req.query;
    let query = supabase
      .from('attendance_sessions')
      .select('*, subjects(id, name, subject_code), classes(id, name, year, division, student_ids)', { count: 'exact' })
      .eq('faculty_id', req.user.id)
      .eq('is_active', false);

    if (subjectId) query = query.eq('subject_id', subjectId);

    const from = (parseInt(page) - 1) * parseInt(limit);
    const to = from + parseInt(limit) - 1;

    const { data: sessions, error } = await query.order('start_time', { ascending: false }).range(from, to);
    if (error) throw error;

    const sessionsWithCounts = (sessions || []).map((s) => {
      const totalStudents = s.classes?.student_ids?.length || 0;
      const presentCount = s.present_count || 0;
      return {
        ...s,
        _id: s.id,
        subject: s.subjects,
        class: s.classes,
        startTime: s.start_time,
        endTime: s.end_time,
        presentCount,
        totalStudents,
        attendanceRate: totalStudents > 0 ? ((presentCount / totalStudents) * 100).toFixed(1) : 0,
      };
    });

    res.status(200).json({ success: true, sessions: sessionsWithCounts });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/faculty/students/:classId
 */
exports.getClassStudents = async (req, res, next) => {
  try {
    const { classId } = req.params;
    const { data: cls, error } = await supabase.from('classes').select('*').eq('id', classId).maybeSingle();

    if (error || !cls) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    const studentIds = cls.student_ids || [];
    const { data: students } = await supabase
      .from('users')
      .select('id, name, email, phone, profile_pic, student_id')
      .in('id', studentIds.length > 0 ? studentIds : ['00000000-0000-0000-0000-000000000000']);

    res.status(200).json({
      success: true,
      class: {
        ...cls,
        _id: cls.id,
        students: (students || []).map((s) => ({ ...s, _id: s.id, studentId: s.student_id })),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/faculty/profile
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, profilePic } = req.body;
    const { data: user, error } = await supabase
      .from('users')
      .update({ name, phone, profile_pic: profilePic })
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.status(200).json({ success: true, user: { ...user, _id: user.id } });
  } catch (error) {
    next(error);
  }
};
