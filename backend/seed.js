const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const bcrypt = require('bcryptjs');
const { supabase, checkSupabaseConnection } = require('./config/supabase');

const seedDB = async () => {
  try {
    const isConnected = await checkSupabaseConnection();
    if (!isConnected) {
      console.log('⚠️  Please verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env');
      process.exit(1);
    }

    console.log('🗑️  Clearing all existing data from Supabase...');

    // Delete in reverse foreign-key order
    await supabase.from('attendance_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('attendance_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('activity_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('classes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('subjects').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('departments').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log('🌱 Seeding fresh mock data for BeaconAttend...');

    // 1. Insert Departments
    const { data: depts, error: deptErr } = await supabase
      .from('departments')
      .insert([
        { name: 'Computer Engineering', code: 'COMP', description: 'Department of Computer Engineering' },
        { name: 'Information Technology', code: 'IT', description: 'Department of Information Technology' },
        { name: 'Artificial Intelligence & Data Science', code: 'AIDS', description: 'Department of AI & Data Science' },
        { name: 'Electronics & Telecommunication', code: 'EXTC', description: 'Department of EXTC' },
        { name: 'Mechanical Engineering', code: 'MECH', description: 'Department of Mechanical Engineering' },
      ])
      .select();

    if (deptErr) throw deptErr;
    const compDept = depts.find((d) => d.code === 'COMP');
    const itDept = depts.find((d) => d.code === 'IT');
    const aidsDept = depts.find((d) => d.code === 'AIDS');

    console.log(`🏛️  Created ${depts.length} departments.`);

    // 2. Hash default password
    const hashedPassword = await bcrypt.hash('password123', 12);

    // 3. Insert Users (Admin, Teachers, Students)
    const { data: users, error: userErr } = await supabase
      .from('users')
      .insert([
        // Master Admin
        {
          name: 'System Admin',
          email: 'admin@example.com',
          password: hashedPassword,
          role: 'admin',
          is_active: true,
          is_approved: true,
        },
        // Teacher 1
        {
          name: 'Dr. Sarah Connor',
          email: 'teacher@college.edu',
          password: hashedPassword,
          role: 'faculty',
          department_id: compDept?.id,
          subjects: ['Data Structures', 'Database Systems'],
          phone: '+91 9876543210',
          is_active: true,
          is_approved: true,
        },
        // Teacher 2
        {
          name: 'Prof. Alex Rivera',
          email: 'faculty.alex@college.edu',
          password: hashedPassword,
          role: 'faculty',
          department_id: itDept?.id,
          subjects: ['Wireless Networks', 'Operating Systems'],
          phone: '+91 9876543211',
          is_active: true,
          is_approved: true,
        },
        // Student 1 (Primary Demo Student)
        {
          name: 'Alex Johnson',
          email: 'student@college.edu',
          password: hashedPassword,
          role: 'student',
          student_id: 'STU2026001',
          department_id: compDept?.id,
          year: 2,
          semester: 3,
          division: 'A',
          phone: '+91 9876543220',
          is_active: true,
          is_approved: true,
        },
        // Student 2
        {
          name: 'Emma Watson',
          email: 'emma.watson@college.edu',
          password: hashedPassword,
          role: 'student',
          student_id: 'STU2026002',
          department_id: itDept?.id,
          year: 3,
          semester: 5,
          division: 'B',
          phone: '+91 9876543221',
          is_active: true,
          is_approved: true,
        },
        // Student 3
        {
          name: 'Rohit Sharma',
          email: 'rohit.sharma@college.edu',
          password: hashedPassword,
          role: 'student',
          student_id: 'STU2026003',
          department_id: aidsDept?.id,
          year: 2,
          semester: 3,
          division: 'A',
          phone: '+91 9876543222',
          is_active: true,
          is_approved: true,
        },
      ])
      .select();

    if (userErr) throw userErr;

    const teacher1 = users.find((u) => u.email === 'teacher@college.edu');
    const teacher2 = users.find((u) => u.email === 'faculty.alex@college.edu');
    const student1 = users.find((u) => u.email === 'student@college.edu');
    const student2 = users.find((u) => u.email === 'emma.watson@college.edu');
    const student3 = users.find((u) => u.email === 'rohit.sharma@college.edu');

    console.log(`👤 Created ${users.length} user accounts.`);

    // 4. Insert Subjects
    const { data: subjects, error: subjErr } = await supabase
      .from('subjects')
      .insert([
        {
          name: 'Data Structures & Algorithms',
          subject_code: 'CS301',
          department_id: compDept.id,
          faculty_id: teacher1.id,
          year: 2,
          semester: 3,
          total_lectures: 24,
        },
        {
          name: 'Database Management Systems',
          subject_code: 'CS302',
          department_id: compDept.id,
          faculty_id: teacher1.id,
          year: 2,
          semester: 3,
          total_lectures: 20,
        },
        {
          name: 'Wireless & Mobile Networks',
          subject_code: 'IT401',
          department_id: itDept.id,
          faculty_id: teacher2.id,
          year: 3,
          semester: 5,
          total_lectures: 18,
        },
      ])
      .select();

    if (subjErr) throw subjErr;
    console.log(`📚 Created ${subjects.length} academic subjects.`);

    // 5. Insert Classes
    const studentIds = [student1.id, student2.id, student3.id];
    const { data: classes, error: classErr } = await supabase
      .from('classes')
      .insert([
        {
          name: 'SE Computer Engineering - Div A',
          year: 2,
          division: 'A',
          department_id: compDept.id,
          student_ids: studentIds,
        },
        {
          name: 'TE Information Technology - Div B',
          year: 3,
          division: 'B',
          department_id: itDept.id,
          student_ids: [student2.id],
        },
      ])
      .select();

    if (classErr) throw classErr;
    console.log(`🏫 Created ${classes.length} classes with enrolled students.`);

    console.log('\n========================================================');
    console.log('🎉 SUPABASE DATABASE RESET & SEEDED WITH READY-TO-USE DEMO DATA');
    console.log('========================================================');
    console.log('🔑 CREDENTIALS FOR IMMEDIATE LOGIN:');
    console.log('--------------------------------------------------------');
    console.log('👑 Admin:   email: admin@example.com          password: password123');
    console.log('👨‍🏫 Teacher: email: teacher@college.edu        password: password123');
    console.log('👨‍🏫 Teacher: email: faculty.alex@college.edu    password: password123');
    console.log('🎓 Student: email: student@college.edu        password: password123');
    console.log('🎓 Student: email: emma.watson@college.edu    password: password123');
    console.log('🎓 Student: email: rohit.sharma@college.edu   password: password123');
    console.log('========================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  }
};

seedDB();
