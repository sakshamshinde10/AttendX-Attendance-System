const bcrypt = require('bcryptjs');
const { supabase } = require('../config/supabase');

/**
 * GET /api/admin/dashboard
 * System-wide stats for admin overview
 */
exports.getAdminDashboard = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowISO = tomorrow.toISOString();

    const [
      studentsRes, facultyRes, subjectsRes, deptsRes,
      todaySessionsRes, activeSessionsRes, todayAttendanceRes,
      recentLogsRes, recentRecordsRes
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student').eq('is_active', true),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'faculty').eq('is_active', true),
      supabase.from('subjects').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('departments').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('attendance_sessions').select('*', { count: 'exact', head: true }).gte('start_time', todayISO).lt('start_time', tomorrowISO),
      supabase.from('attendance_sessions').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('attendance_records').select('*', { count: 'exact', head: true }).gte('marked_at', todayISO).lt('marked_at', tomorrowISO),
      supabase.from('activity_logs').select('*, users(name, role)').order('created_at', { ascending: false }).limit(10),
      supabase.from('attendance_records').select('marked_at').gte('marked_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

    // Calculate monthly attendance trend
    const monthCounts = {};
    (recentRecordsRes.data || []).forEach((r) => {
      const d = new Date(r.marked_at);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      monthCounts[key] = (monthCounts[key] || 0) + 1;
    });

    const monthlyTrend = Object.entries(monthCounts).map(([k, count]) => {
      const [year, month] = k.split('-').map(Number);
      return { _id: { year, month }, count };
    });

    res.status(200).json({
      success: true,
      stats: {
        totalStudents: studentsRes.count || 0,
        totalFaculty: facultyRes.count || 0,
        totalSubjects: subjectsRes.count || 0,
        totalDepartments: deptsRes.count || 0,
        todaySessions: todaySessionsRes.count || 0,
        activeSessions: activeSessionsRes.count || 0,
        todayAttendance: todayAttendanceRes.count || 0,
      },
      monthlyTrend,
      recentActivity: recentLogsRes.data || [],
    });
  } catch (error) {
    next(error);
  }
};

// ─── Students ─────────────────────────────────────────────────────────────────
exports.getAllStudents = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, department, year, semester, division } = req.query;
    let query = supabase
      .from('users')
      .select('*, departments!users_department_id_fkey(id, name, code)', { count: 'exact' })
      .eq('role', 'student');

    // Academic filters working together
    if (department && department !== 'ALL') {
      query = query.eq('department_id', department);
    }
    if (year && year !== 'ALL') {
      const parsedYear = parseInt(year, 10);
      if (!isNaN(parsedYear)) {
        query = query.eq('year', parsedYear);
      }
    }
    if (semester && semester !== 'ALL') {
      const parsedSem = parseInt(semester, 10);
      if (!isNaN(parsedSem)) {
        query = query.eq('semester', parsedSem);
      }
    }
    if (division && division !== 'ALL') {
      query = query.ilike('division', division.trim());
    }

    // Search across Name, Student ID, Roll Number, and Email
    if (search && search.trim()) {
      const s = search.trim();
      query = query.or(`name.ilike.%${s}%,student_id.ilike.%${s}%,roll_number.ilike.%${s}%,email.ilike.%${s}%`);
    }

    const from = (parseInt(page) - 1) * parseInt(limit);
    const to = from + parseInt(limit) - 1;

    const { data: students, count, error } = await query
      .order('name', { ascending: true })
      .range(from, to);

    if (error) throw error;

    const mapped = (students || []).map((s) => ({
      ...s,
      _id: s.id,
      studentId: s.student_id,
      rollNumber: s.roll_number || '',
      department: s.departments || s.department_id,
      boundDeviceId: s.bound_device_id,
      isActive: s.is_active,
    }));

    res.status(200).json({ success: true, students: mapped, total: count || 0 });
  } catch (error) {
    next(error);
  }
};

exports.createStudent = async (req, res, next) => {
  try {
    const { name, email, password = 'password123', studentId, rollNumber, department, phone, year, semester, division } = req.body;
    const hashedPassword = await bcrypt.hash(password, 12);

    const { data: student, error } = await supabase
      .from('users')
      .insert({
        name,
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: 'student',
        student_id: studentId || null,
        roll_number: rollNumber || null,
        department_id: department || null,
        phone,
        year: year ? parseInt(year) : null,
        semester: semester ? parseInt(semester) : null,
        division: division || null,
        is_active: true,
        is_approved: true,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, student: { ...student, _id: student.id, studentId: student.student_id, rollNumber: student.roll_number } });
  } catch (error) {
    next(error);
  }
};

exports.updateStudent = async (req, res, next) => {
  try {
    const updateData = {};
    if (req.body.name) updateData.name = req.body.name;
    if (req.body.email) updateData.email = req.body.email.toLowerCase().trim();
    if (req.body.studentId !== undefined) updateData.student_id = req.body.studentId;
    if (req.body.rollNumber !== undefined) updateData.roll_number = req.body.rollNumber;
    if (req.body.roll_number !== undefined) updateData.roll_number = req.body.roll_number;
    if (req.body.department !== undefined) updateData.department_id = req.body.department;
    if (req.body.phone !== undefined) updateData.phone = req.body.phone;
    if (req.body.year !== undefined) updateData.year = req.body.year ? parseInt(req.body.year) : null;
    if (req.body.semester !== undefined) updateData.semester = req.body.semester ? parseInt(req.body.semester) : null;
    if (req.body.division !== undefined) updateData.division = req.body.division || null;
    if (req.body.isActive !== undefined) updateData.is_active = req.body.isActive;

    const { data: student, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.status(200).json({ success: true, student: { ...student, _id: student.id } });
  } catch (error) {
    next(error);
  }
};

exports.deleteStudent = async (req, res, next) => {
  try {
    const { error } = await supabase.from('users').update({ is_active: false }).eq('id', req.params.id);
    if (error) throw error;
    res.status(200).json({ success: true, message: 'Student deactivated' });
  } catch (error) {
    next(error);
  }
};

// ─── Faculty ──────────────────────────────────────────────────────────────────
exports.getAllFaculty = async (req, res, next) => {
  try {
    const { department, year, semester, subject } = req.query;

    const { data: faculty, error } = await supabase
      .from('users')
      .select('*, departments!users_department_id_fkey(id, name, code)')
      .eq('role', 'faculty')
      .order('name');

    if (error) throw error;

    // Fetch all active subjects with department details (fallback if join fails)
    let allSubjects = [];
    try {
      const { data: subjectsWithDept, error: subErr } = await supabase
        .from('subjects')
        .select('id, name, subject_code, department_id, faculty_id, year, semester, departments(id, name, code)')
        .eq('is_active', true);
      if (!subErr) {
        allSubjects = subjectsWithDept || [];
      } else {
        // Fallback: fetch without department join
        const { data: subjectsPlain } = await supabase
          .from('subjects')
          .select('id, name, subject_code, department_id, faculty_id, year, semester')
          .eq('is_active', true);
        allSubjects = subjectsPlain || [];
      }
    } catch (_) {
      allSubjects = [];
    }

    // Fetch teacher_subjects associations if table exists
    let teacherSubjectMap = {};
    try {
      const { data: tsData } = await supabase
        .from('teacher_subjects')
        .select('teacher_id, subject_id');
      if (tsData) {
        tsData.forEach((ts) => {
          if (!teacherSubjectMap[ts.teacher_id]) teacherSubjectMap[ts.teacher_id] = new Set();
          teacherSubjectMap[ts.teacher_id].add(ts.subject_id);
        });
      }
    } catch (_) {}

    // Fetch lecture session counts conducted by teachers
    let sessionCountMap = {}; // { facultyId: totalSessions }
    let subjectSessionMap = {}; // { `${facultyId}_${subjectId}`: sessionCount }
    try {
      const { data: sessionRows } = await supabase
        .from('attendance_sessions')
        .select('faculty_id, subject_id, is_active');
      if (sessionRows) {
        sessionRows.forEach((s) => {
          if (!s.is_active) {
            sessionCountMap[s.faculty_id] = (sessionCountMap[s.faculty_id] || 0) + 1;
            const key = `${s.faculty_id}_${s.subject_id}`;
            subjectSessionMap[key] = (subjectSessionMap[key] || 0) + 1;
          }
        });
      }
    } catch (_) {}

    // Attach assigned subjects & lecture counts to each faculty member
    let mapped = (faculty || []).map((f) => {
      const teacherSubjects = (allSubjects || []).filter((s) => {
        if (s.faculty_id === f.id) return true;
        if (teacherSubjectMap[f.id] && teacherSubjectMap[f.id].has(s.id)) return true;
        return false;
      }).map((s) => ({
        id: s.id,
        _id: s.id,
        name: s.name,
        subjectCode: s.subject_code,
        departmentId: s.department_id,
        departmentName: s.departments?.name || '',
        year: s.year,
        semester: s.semester,
        lecturesConducted: subjectSessionMap[`${f.id}_${s.id}`] || 0,
      }));

      const uniqueYears = Array.from(new Set(teacherSubjects.map((s) => s.year).filter(Boolean)));
      const uniqueSemesters = Array.from(new Set(teacherSubjects.map((s) => s.semester).filter(Boolean)));

      return {
        ...f,
        _id: f.id,
        department: f.departments || f.department_id,
        isApproved: f.is_approved,
        isActive: f.is_active,
        assignedSubjects: teacherSubjects,
        totalLecturesConducted: sessionCountMap[f.id] || 0,
        yearsTaught: uniqueYears,
        semestersTaught: uniqueSemesters,
      };
    });

    // Apply filtering if query parameters are provided
    if (department && department !== 'ALL') {
      mapped = mapped.filter((f) => {
        const directMatch = (f.department_id === department) || (f.department?.id === department);
        const subjectMatch = f.assignedSubjects.some((s) => s.departmentId === department);
        return directMatch || subjectMatch;
      });
    }

    if (year && year !== 'ALL') {
      const targetYear = parseInt(year);
      mapped = mapped.filter((f) => f.yearsTaught.includes(targetYear));
    }

    if (semester && semester !== 'ALL') {
      const targetSemester = parseInt(semester);
      mapped = mapped.filter((f) => f.semestersTaught.includes(targetSemester));
    }

    if (subject && subject !== 'ALL') {
      mapped = mapped.filter((f) => f.assignedSubjects.some((s) => s.id === subject || s._id === subject));
    }

    res.status(200).json({ success: true, faculty: mapped, total: mapped.length });
  } catch (error) {
    next(error);
  }
};

exports.getPendingFaculty = async (req, res, next) => {
  try {
    const { data: pendingFaculty, error } = await supabase
      .from('users')
      .select('*, departments!users_department_id_fkey(id, name, code)')
      .eq('role', 'faculty')
      .eq('is_approved', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    const mapped = (pendingFaculty || []).map((f) => ({
      ...f,
      _id: f.id,
      department: f.departments || f.department_id,
      isApproved: f.is_approved,
    }));
    res.status(200).json({ success: true, pendingFaculty: mapped });
  } catch (error) {
    next(error);
  }
};

exports.approveFaculty = async (req, res, next) => {
  try {
    const { data: faculty, error } = await supabase
      .from('users')
      .update({ is_approved: true, is_active: true })
      .eq('id', req.params.id)
      .select('*, departments!users_department_id_fkey(id, name, code)')
      .single();

    if (error || !faculty) return res.status(404).json({ success: false, message: 'Faculty account not found' });
    res.status(200).json({
      success: true,
      message: 'Teacher account approved successfully',
      faculty: { ...faculty, _id: faculty.id, isApproved: true, isActive: true },
    });
  } catch (error) {
    next(error);
  }
};

exports.rejectFaculty = async (req, res, next) => {
  try {
    const { error } = await supabase.from('users').delete().eq('id', req.params.id);
    if (error) throw error;
    res.status(200).json({ success: true, message: 'Teacher registration request rejected' });
  } catch (error) {
    next(error);
  }
};

exports.createFaculty = async (req, res, next) => {
  try {
    const { name, email, password = 'password123', department, subjects, phone } = req.body;
    const hashedPassword = await bcrypt.hash(password, 12);

    const { data: faculty, error } = await supabase
      .from('users')
      .insert({
        name,
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: 'faculty',
        department_id: department || null,
        subjects: Array.isArray(subjects) ? subjects : [],
        phone,
        is_approved: true,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, faculty: { ...faculty, _id: faculty.id } });
  } catch (error) {
    next(error);
  }
};

exports.updateFaculty = async (req, res, next) => {
  try {
    const updateData = {};
    if (req.body.name) updateData.name = req.body.name;
    if (req.body.email) updateData.email = req.body.email.toLowerCase().trim();
    if (req.body.department) updateData.department_id = req.body.department;
    if (req.body.subjects) updateData.subjects = req.body.subjects;
    if (req.body.phone) updateData.phone = req.body.phone;

    const { data: faculty, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.status(200).json({ success: true, faculty: { ...faculty, _id: faculty.id } });
  } catch (error) {
    next(error);
  }
};

exports.assignSubjectToFaculty = async (req, res, next) => {
  try {
    const { id: facultyId } = req.params;
    const { subjectId } = req.body;

    if (!subjectId) {
      return res.status(400).json({ success: false, message: 'subjectId is required.' });
    }

    // 1. Verify faculty exists
    const { data: faculty, error: fError } = await supabase
      .from('users')
      .select('id, name, email, subjects, role')
      .eq('id', facultyId)
      .eq('role', 'faculty')
      .maybeSingle();

    if (fError || !faculty) {
      return res.status(404).json({ success: false, message: 'Faculty member not found.' });
    }

    // 2. Verify subject exists
    const { data: subject, error: sError } = await supabase
      .from('subjects')
      .select('id, name, subject_code, faculty_id')
      .eq('id', subjectId)
      .maybeSingle();

    if (sError || !subject) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }

    // 3. Ensure record in teacher_subjects table
    const { data: existingTS } = await supabase
      .from('teacher_subjects')
      .select('id')
      .eq('teacher_id', facultyId)
      .eq('subject_id', subjectId)
      .maybeSingle();

    if (!existingTS) {
      await supabase.from('teacher_subjects').insert({
        teacher_id: facultyId,
        subject_id: subjectId,
      });
    }

    // 4. Update subjects.faculty_id
    await supabase
      .from('subjects')
      .update({ faculty_id: facultyId })
      .eq('id', subjectId);

    // 5. Update user's subjects array if not already present
    const currentSubjects = Array.isArray(faculty.subjects) ? faculty.subjects : [];
    if (!currentSubjects.includes(subject.name)) {
      await supabase
        .from('users')
        .update({ subjects: [...currentSubjects, subject.name] })
        .eq('id', facultyId);
    }

    // 6. Log activity
    await supabase.from('activity_logs').insert({
      user_id: req.user.id,
      action: 'ASSIGN_SUBJECT',
      details: `Assigned subject ${subject.name} (${subject.subject_code}) to teacher ${faculty.name}`,
      metadata: { facultyId, subjectId },
    });

    res.status(200).json({
      success: true,
      message: `Subject '${subject.name}' assigned to ${faculty.name} successfully.`,
      subject: {
        id: subject.id,
        _id: subject.id,
        name: subject.name,
        subjectCode: subject.subject_code,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.unassignSubjectFromFaculty = async (req, res, next) => {
  try {
    const { id: facultyId, subjectId } = req.params;

    // 1. Verify faculty exists
    const { data: faculty } = await supabase
      .from('users')
      .select('id, name, subjects')
      .eq('id', facultyId)
      .maybeSingle();

    // 2. Verify subject exists
    const { data: subject } = await supabase
      .from('subjects')
      .select('id, name, subject_code, faculty_id')
      .eq('id', subjectId)
      .maybeSingle();

    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }

    // 3. Delete from teacher_subjects
    await supabase
      .from('teacher_subjects')
      .delete()
      .eq('teacher_id', facultyId)
      .eq('subject_id', subjectId);

    // 4. If subject.faculty_id was this faculty, assign back to admin
    if (subject.faculty_id === facultyId) {
      const { data: adminUser } = await supabase.from('users').select('id').eq('role', 'admin').limit(1).maybeSingle();
      if (adminUser) {
        await supabase.from('subjects').update({ faculty_id: adminUser.id }).eq('id', subjectId);
      }
    }

    // 5. Remove from users.subjects array
    if (faculty && Array.isArray(faculty.subjects)) {
      const updatedList = faculty.subjects.filter((s) => s !== subject.name && s !== subject.subject_code);
      await supabase.from('users').update({ subjects: updatedList }).eq('id', facultyId);
    }

    // 6. Log activity
    await supabase.from('activity_logs').insert({
      user_id: req.user.id,
      action: 'UNASSIGN_SUBJECT',
      details: `Unassigned subject ${subject.name} from teacher ${faculty?.name || facultyId}`,
      metadata: { facultyId, subjectId },
    });

    res.status(200).json({
      success: true,
      message: `Subject '${subject.name}' unassigned successfully.`,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Departments ──────────────────────────────────────────────────────────────
exports.getAllDepartments = async (req, res, next) => {
  try {
    // Try with HOD join first; fall back gracefully if FK name differs
    let departments = null;
    const { data: deptWithHod, error: hodError } = await supabase
      .from('departments')
      .select('*, hod:users!departments_hod_id_fkey(name, email)')
      .order('name');

    if (hodError) {
      // Fallback: try without the named FK join
      const { data: fallbackDepts, error: err2 } = await supabase.from('departments').select('*').order('name');
      if (err2) throw err2;
      departments = fallbackDepts;
    } else {
      departments = deptWithHod;
    }

    if (!departments) {
      return res.status(200).json({ success: true, departments: [] });
    }

    // Also get teacher count for each department
    const { data: facultyUsers } = await supabase
      .from('users')
      .select('department_id')
      .eq('role', 'faculty')
      .eq('is_active', true);

    const countMap = {};
    (facultyUsers || []).forEach((f) => {
      if (f.department_id) {
        countMap[f.department_id] = (countMap[f.department_id] || 0) + 1;
      }
    });

    const mapped = (departments || []).map((d) => ({
      ...d,
      _id: d.id,
      teacherCount: countMap[d.id] || 0,
    }));
    res.status(200).json({ success: true, departments: mapped });
  } catch (error) {
    next(error);
  }
};

exports.getDepartmentTeachers = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Fetch Department Details
    const { data: dept, error: deptError } = await supabase
      .from('departments')
      .select('id, name, code, description')
      .eq('id', id)
      .maybeSingle();

    if (deptError || !dept) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    // 2. Fetch Teachers belonging to this department
    const { data: teachers, error: teacherError } = await supabase
      .from('users')
      .select('id, name, email, role, subjects, phone, is_active, is_approved')
      .eq('role', 'faculty')
      .eq('department_id', id)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (teacherError) throw teacherError;

    const mappedTeachers = (teachers || []).map((t) => ({
      ...t,
      _id: t.id,
      isApproved: t.is_approved,
      isActive: t.is_active,
    }));

    res.status(200).json({
      success: true,
      department: { ...dept, _id: dept.id },
      teachers: mappedTeachers,
      totalTeachers: mappedTeachers.length,
    });
  } catch (error) {
    next(error);
  }
};

exports.createDepartment = async (req, res, next) => {
  try {
    const { name, code, description, hod } = req.body;
    const { data: dept, error } = await supabase
      .from('departments')
      .insert({ name, code: code.toUpperCase(), description, hod_id: hod || null })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, department: { ...dept, _id: dept.id } });
  } catch (error) {
    next(error);
  }
};

exports.updateDepartment = async (req, res, next) => {
  try {
    const { data: dept, error } = await supabase
      .from('departments')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.status(200).json({ success: true, department: { ...dept, _id: dept.id } });
  } catch (error) {
    next(error);
  }
};

exports.deleteDepartment = async (req, res, next) => {
  try {
    const { error } = await supabase.from('departments').update({ is_active: false }).eq('id', req.params.id);
    if (error) throw error;
    res.status(200).json({ success: true, message: 'Department deactivated' });
  } catch (error) {
    next(error);
  }
};

// ─── Subjects ─────────────────────────────────────────────────────────────────
exports.getAllSubjects = async (req, res, next) => {
  try {
    const { department, year, semester } = req.query;
    let query = supabase
      .from('subjects')
      .select('*, departments(id, name, code), users(id, name, email)')
      .eq('is_active', true);

    if (department && department !== 'ALL') {
      query = query.eq('department_id', department);
    }
    if (year && year !== 'ALL') {
      query = query.eq('year', parseInt(year));
    }
    if (semester && semester !== 'ALL') {
      query = query.eq('semester', parseInt(semester));
    }

    const { data: subjects, error } = await query.order('name');

    if (error) throw error;
    const mapped = (subjects || []).map((s) => ({
      ...s,
      _id: s.id,
      department: s.departments || s.department_id,
      faculty: s.users || s.faculty_id,
      subjectCode: s.subject_code,
      totalLectures: s.total_lectures,
    }));
    res.status(200).json({ success: true, subjects: mapped });
  } catch (error) {
    next(error);
  }
};

exports.createSubject = async (req, res, next) => {
  try {
    const { name, subjectCode, department, faculty, year, semester } = req.body;
    const { data: subject, error } = await supabase
      .from('subjects')
      .insert({
        name,
        subject_code: subjectCode.toUpperCase(),
        department_id: department,
        faculty_id: faculty,
        year: year ? parseInt(year) : null,
        semester: semester ? parseInt(semester) : null,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, subject: { ...subject, _id: subject.id } });
  } catch (error) {
    next(error);
  }
};

exports.updateSubject = async (req, res, next) => {
  try {
    const { data: subject, error } = await supabase
      .from('subjects')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.status(200).json({ success: true, subject: { ...subject, _id: subject.id } });
  } catch (error) {
    next(error);
  }
};

// ─── Classes ──────────────────────────────────────────────────────────────────
exports.getAllClasses = async (req, res, next) => {
  try {
    const { data: classes, error } = await supabase
      .from('classes')
      .select('*, departments(id, name)')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    const mapped = (classes || []).map((c) => ({
      ...c,
      _id: c.id,
      department: c.departments || c.department_id,
    }));
    res.status(200).json({ success: true, classes: mapped });
  } catch (error) {
    next(error);
  }
};

exports.createClass = async (req, res, next) => {
  try {
    const { name, year, division, department } = req.body;
    const { data: cls, error } = await supabase
      .from('classes')
      .insert({
        name,
        year: parseInt(year),
        division,
        department_id: department,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, class: { ...cls, _id: cls.id } });
  } catch (error) {
    next(error);
  }
};

exports.addStudentToClass = async (req, res, next) => {
  try {
    const { classId, studentId } = req.params;
    const { data: currentClass } = await supabase.from('classes').select('student_ids').eq('id', classId).single();
    const students = currentClass?.student_ids || [];
    if (!students.includes(studentId)) {
      students.push(studentId);
      await supabase.from('classes').update({ student_ids: students }).eq('id', classId);
    }
    res.status(200).json({ success: true, message: 'Student added to class' });
  } catch (error) {
    next(error);
  }
};
