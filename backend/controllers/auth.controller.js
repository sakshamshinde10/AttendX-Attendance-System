const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { supabase } = require('../config/supabase');

/**
 * Generate a signed JWT token for a user
 */
const generateToken = (userId, role) => {
  const expiresIn = role === 'admin' ? process.env.JWT_ADMIN_EXPIRE : process.env.JWT_EXPIRE;
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, { expiresIn: expiresIn || '7d' });
};

/**
 * GET /api/auth/departments
 * Public endpoint to fetch active departments for registration forms
 */
exports.getPublicDepartments = async (req, res, next) => {
  try {
    const { data: departments, error } = await supabase
      .from('departments')
      .select('id, name, code, _id:id')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    res.status(200).json({ success: true, departments: departments || [] });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/register
 * Register a new student or faculty
 */
exports.register = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      role = 'student',
      department,
      phone,
      deviceId,
      studentId,
      rollNumber,
      subjects,
      year,
      semester,
      division,
    } = req.body;

    if (role === 'admin') {
      return res.status(403).json({ success: false, message: 'Admin accounts cannot be self-registered.' });
    }

    // Check if email already registered
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    let finalStudentId = studentId ? studentId.trim() : undefined;
    let parsedYear = null;
    let parsedSemester = null;
    let finalDivision = null;

    if (role === 'student') {
      if (!department) {
        return res.status(400).json({ success: false, message: 'Please select a department.' });
      }
      if (!year) {
        return res.status(400).json({ success: false, message: 'Please select an academic year.' });
      }
      parsedYear = parseInt(year, 10);
      if (isNaN(parsedYear) || parsedYear < 1 || parsedYear > 4) {
        return res.status(400).json({ success: false, message: 'Academic year must be between 1 and 4.' });
      }

      if (semester) {
        parsedSemester = parseInt(semester, 10);
        if (isNaN(parsedSemester) || parsedSemester < 1 || parsedSemester > 8) {
          parsedSemester = (parsedYear * 2) - 1;
        }
      } else {
        parsedSemester = (parsedYear * 2) - 1;
      }

      if (division) {
        finalDivision = String(division).trim().toUpperCase();
      }

      if (!finalStudentId) {
        const { count } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'student');

        finalStudentId = `STU${new Date().getFullYear()}${((count || 0) + 101).toString().padStart(4, '0')}`;
      } else {
        const { data: existingId } = await supabase
          .from('users')
          .select('id')
          .eq('student_id', finalStudentId)
          .maybeSingle();

        if (existingId) {
          return res.status(400).json({ success: false, message: `Student ID '${finalStudentId}' is already registered.` });
        }
      }
    }

    // Resolve Department ID (handles UUID or string code e.g. 'COMP')
    let resolvedDepartmentId = null;
    if (department) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(department);
      if (isUUID) {
        resolvedDepartmentId = department;
      } else {
        const { data: dept } = await supabase
          .from('departments')
          .select('id')
          .or(`code.eq.${department},name.eq.${department}`)
          .maybeSingle();
        if (dept) resolvedDepartmentId = dept.id;
      }
    }

    // Process faculty subjects
    let subjectsList = [];
    if (role === 'faculty' && subjects) {
      if (Array.isArray(subjects)) {
        subjectsList = subjects.map((s) => String(s).trim()).filter(Boolean);
      } else if (typeof subjects === 'string') {
        subjectsList = subjects.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }

    const isApproved = role === 'faculty' ? false : true;
    const hashedPassword = await bcrypt.hash(password, 12);

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role,
        student_id: role === 'student' ? finalStudentId : null,
        roll_number: role === 'student' ? (rollNumber || req.body.roll_number || null) : null,
        department_id: resolvedDepartmentId,
        year: role === 'student' ? parsedYear : null,
        semester: role === 'student' ? parsedSemester : null,
        division: role === 'student' ? finalDivision : null,
        subjects: role === 'faculty' ? subjectsList : [],
        phone: phone ? phone.trim() : null,
        bound_device_id: deviceId || null,
        is_approved: isApproved,
        is_active: isApproved,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Auto-enroll student in a matching class (prioritizing department + year + division)
    if (role === 'student' && resolvedDepartmentId) {
      try {
        let matchingClass = null;
        if (parsedYear) {
          if (finalDivision) {
            const { data: divClass } = await supabase
              .from('classes')
              .select('id, student_ids')
              .eq('department_id', resolvedDepartmentId)
              .eq('year', parsedYear)
              .eq('division', finalDivision)
              .eq('is_active', true)
              .maybeSingle();
            matchingClass = divClass;
          }
          if (!matchingClass) {
            const { data: yrClass } = await supabase
              .from('classes')
              .select('id, student_ids')
              .eq('department_id', resolvedDepartmentId)
              .eq('year', parsedYear)
              .eq('is_active', true)
              .maybeSingle();
            matchingClass = yrClass;
          }
        }

        if (!matchingClass) {
          const { data: anyClass } = await supabase
            .from('classes')
            .select('id, student_ids')
            .eq('department_id', resolvedDepartmentId)
            .eq('is_active', true)
            .maybeSingle();
          matchingClass = anyClass;
        }

        if (matchingClass) {
          const currentIds = matchingClass.student_ids || [];
          if (!currentIds.includes(newUser.id)) {
            await supabase
              .from('classes')
              .update({ student_ids: [...currentIds, newUser.id] })
              .eq('id', matchingClass.id);
          }
        }
      } catch (enrollErr) {
        // Non-fatal: log but don't block registration
        console.warn('Auto-enroll student in class failed:', enrollErr);
      }
    }

    // Log Activity
    await supabase.from('activity_logs').insert({
      user_id: newUser.id,
      action: 'REGISTER',
      details: `New ${role} registered: ${newUser.email}`,
      metadata: { deviceId, isApproved },
    });

    if (role === 'faculty') {
      return res.status(201).json({
        success: true,
        message: 'Teacher account created! Your account is pending Admin approval before you can log in.',
        requiresApproval: true,
      });
    }

    const token = generateToken(newUser.id, newUser.role);

    // Fetch department details for populated response
    let departmentInfo = null;
    if (resolvedDepartmentId) {
      const { data: dept } = await supabase
        .from('departments')
        .select('id, name, code')
        .eq('id', resolvedDepartmentId)
        .maybeSingle();
      departmentInfo = dept;
    }

    res.status(201).json({
      success: true,
      message: 'Student account created successfully',
      token,
      user: {
        id: newUser.id,
        _id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        studentId: newUser.student_id,
        student_id: newUser.student_id,
        rollNumber: newUser.roll_number || rollNumber || null,
        roll_number: newUser.roll_number || rollNumber || null,
        department: departmentInfo || newUser.department_id,
        department_id: newUser.department_id,
        departments: departmentInfo,
        year: newUser.year || parsedYear || null,
        semester: newUser.semester || parsedSemester || null,
        division: newUser.division || finalDivision || null,
        profilePic: newUser.profile_pic,
        boundDeviceId: newUser.bound_device_id,
      },
    });
  } catch (error) {
    next(error);
  }
};


/**
 * POST /api/auth/login
 * Login with email and password
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password, deviceId } = req.body;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (error || !user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (!user.is_active || user.is_approved === false) {
      if (user.role === 'faculty' && user.is_approved === false) {
        return res.status(403).json({
          success: false,
          message: 'Teacher account pending Admin approval. Please wait for an administrator to approve your account.',
          requiresApproval: true,
        });
      }
      return res.status(403).json({ success: false, message: 'Account has been deactivated. Contact admin.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Auto-bind device on first login for students
    let boundDeviceId = user.bound_device_id;
    if (deviceId && !boundDeviceId && user.role === 'student') {
      boundDeviceId = deviceId;
      await supabase.from('users').update({ bound_device_id: deviceId }).eq('id', user.id);
    }

    // Update last login
    await supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', user.id);

    // Audit log
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      action: 'LOGIN',
      details: 'Successful login',
      metadata: { deviceId },
    });

    const token = generateToken(user.id, user.role);

    // Fetch department details for the response
    let departmentInfo = null;
    if (user.department_id) {
      const { data: dept } = await supabase
        .from('departments')
        .select('id, name, code')
        .eq('id', user.department_id)
        .maybeSingle();
      departmentInfo = dept;
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.student_id,
        student_id: user.student_id,
        rollNumber: user.roll_number || null,
        roll_number: user.roll_number || null,
        department: user.department_id,
        department_id: user.department_id,
        departments: departmentInfo,
        year: user.year || null,
        semester: user.semester || null,
        division: user.division || null,
        subjects: user.subjects,
        profilePic: user.profile_pic,
        boundDeviceId: boundDeviceId,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/logout
 */
exports.logout = async (req, res, next) => {
  try {
    await supabase.from('activity_logs').insert({
      user_id: req.user.id,
      action: 'LOGOUT',
      details: 'User logged out successfully',
      ip_address: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/forgot-password
 */
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (!user) {
      return res.status(200).json({ success: true, message: 'If that email exists, a reset link was sent.' });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expireTime = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await supabase
      .from('users')
      .update({
        reset_password_token: hashedToken,
        reset_password_expire: expireTime,
      })
      .eq('id', user.id);

    res.status(200).json({
      success: true,
      message: 'Password reset token generated',
      resetToken,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/auth/reset-password/:token
 */
exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const { data: user } = await supabase
      .from('users')
      .select('id, role, reset_password_expire')
      .eq('reset_password_token', hashedToken)
      .maybeSingle();

    if (!user || new Date(user.reset_password_expire).getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await supabase
      .from('users')
      .update({
        password: hashedPassword,
        reset_password_token: null,
        reset_password_expire: null,
      })
      .eq('id', user.id);

    const newToken = generateToken(user.id, user.role);

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
      token: newToken,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 */
exports.getMe = async (req, res, next) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*, departments!users_department_id_fkey(id, name, code)')
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { password, reset_password_token, reset_password_expire, ...safeUser } = user;
    res.status(200).json({
      success: true,
      user: {
        ...safeUser,
        _id: safeUser.id,
        department: safeUser.departments || safeUser.department_id,
        department_id: safeUser.department_id,
        departments: safeUser.departments,
        year: safeUser.year || null,
        semester: safeUser.semester || null,
        division: safeUser.division || null,
        studentId: safeUser.student_id,
        student_id: safeUser.student_id,
        rollNumber: safeUser.roll_number || null,
        roll_number: safeUser.roll_number || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/auth/update-fcm-token
 */
exports.updateFCMToken = async (req, res, next) => {
  try {
    const { fcmToken } = req.body;
    await supabase.from('users').update({ fcm_token: fcmToken }).eq('id', req.user.id);
    res.status(200).json({ success: true, message: 'FCM token updated' });
  } catch (error) {
    next(error);
  }
};
