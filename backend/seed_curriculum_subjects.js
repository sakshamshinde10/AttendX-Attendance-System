const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { supabase, checkSupabaseConnection } = require('./config/supabase');

/**
 * Non-destructive seeder to ensure 5 subjects exist for EVERY department and academic year.
 * (5 departments × 4 years × 5 subjects = 100 curriculum subjects)
 */
const seedCurriculumSubjects = async () => {
  try {
    const isConnected = await checkSupabaseConnection();
    if (!isConnected) {
      console.error('❌ Could not connect to Supabase.');
      process.exit(1);
    }

    console.log('📚 Fetching departments and admin user...');
    const { data: depts, error: deptErr } = await supabase.from('departments').select('id, code, name');
    if (deptErr || !depts || depts.length === 0) {
      throw new Error(`Failed to fetch departments: ${deptErr?.message}`);
    }

    // Use admin user as the fallback / default owner for unassigned subjects
    const { data: adminUser } = await supabase.from('users').select('id').eq('role', 'admin').limit(1).maybeSingle();
    const fallbackFacultyId = adminUser?.id;

    const deptMap = {};
    depts.forEach((d) => {
      deptMap[d.code] = d.id;
    });

    console.log('🏛️ Departments found:', Object.keys(deptMap));

    // Define 5 subjects for each year for each department
    const curriculum = [
      // ─── 1. COMPUTER ENGINEERING (COMP) ──────────────────────────────────
      // Year 1
      { name: 'Programming in C', code: 'CS101', dept: 'COMP', year: 1, sem: 1 },
      { name: 'Engineering Mathematics I', code: 'CS102', dept: 'COMP', year: 1, sem: 1 },
      { name: 'Basic Electrical & Electronics', code: 'CS103', dept: 'COMP', year: 1, sem: 1 },
      { name: 'Object Oriented Programming with C++', code: 'CS104', dept: 'COMP', year: 1, sem: 2 },
      { name: 'Discrete Mathematics', code: 'CS105', dept: 'COMP', year: 1, sem: 2 },
      // Year 2
      { name: 'Data Structures & Algorithms', code: 'CS201', dept: 'COMP', year: 2, sem: 3 },
      { name: 'Database Management Systems', code: 'CS202', dept: 'COMP', year: 2, sem: 3 },
      { name: 'Computer Organization & Architecture', code: 'CS203', dept: 'COMP', year: 2, sem: 3 },
      { name: 'Operating Systems', code: 'CS204', dept: 'COMP', year: 2, sem: 4 },
      { name: 'Design & Analysis of Algorithms', code: 'CS205', dept: 'COMP', year: 2, sem: 4 },
      // Year 3
      { name: 'Computer Networks', code: 'CS301', dept: 'COMP', year: 3, sem: 5 },
      { name: 'Software Engineering', code: 'CS302', dept: 'COMP', year: 3, sem: 5 },
      { name: 'Theory of Computation', code: 'CS303', dept: 'COMP', year: 3, sem: 5 },
      { name: 'Cloud Computing & DevOps', code: 'CS304', dept: 'COMP', year: 3, sem: 6 },
      { name: 'Cyber Security & Cryptography', code: 'CS305', dept: 'COMP', year: 3, sem: 6 },
      // Year 4
      { name: 'Distributed Systems', code: 'CS401', dept: 'COMP', year: 4, sem: 7 },
      { name: 'High Performance Computing', code: 'CS402', dept: 'COMP', year: 4, sem: 7 },
      { name: 'Artificial Intelligence & Neural Networks', code: 'CS403', dept: 'COMP', year: 4, sem: 7 },
      { name: 'Big Data Analytics', code: 'CS404', dept: 'COMP', year: 4, sem: 8 },
      { name: 'Capstone Project & Ethics', code: 'CS405', dept: 'COMP', year: 4, sem: 8 },

      // ─── 2. INFORMATION TECHNOLOGY (IT) ──────────────────────────────────
      // Year 1
      { name: 'Fundamentals of Programming', code: 'IT101', dept: 'IT', year: 1, sem: 1 },
      { name: 'Applied Mathematics', code: 'IT102', dept: 'IT', year: 1, sem: 1 },
      { name: 'Digital Logic & Design', code: 'IT103', dept: 'IT', year: 1, sem: 1 },
      { name: 'Python Programming', code: 'IT104', dept: 'IT', year: 1, sem: 2 },
      { name: 'Web Technologies Fundamentals', code: 'IT105', dept: 'IT', year: 1, sem: 2 },
      // Year 2
      { name: 'Data Structures with Java', code: 'IT201', dept: 'IT', year: 2, sem: 3 },
      { name: 'Relational Database Systems', code: 'IT202', dept: 'IT', year: 2, sem: 3 },
      { name: 'Computer Architecture', code: 'IT203', dept: 'IT', year: 2, sem: 3 },
      { name: 'Operating System Internals', code: 'IT204', dept: 'IT', year: 2, sem: 4 },
      { name: 'Information Security', code: 'IT205', dept: 'IT', year: 2, sem: 4 },
      // Year 3
      { name: 'Wireless & Mobile Networks', code: 'IT301', dept: 'IT', year: 3, sem: 5 },
      { name: 'Enterprise Java & Spring', code: 'IT302', dept: 'IT', year: 3, sem: 5 },
      { name: 'Software Testing & QA', code: 'IT303', dept: 'IT', year: 3, sem: 5 },
      { name: 'Full Stack Web Development', code: 'IT304', dept: 'IT', year: 3, sem: 6 },
      { name: 'Network Security & Firewall', code: 'IT305', dept: 'IT', year: 3, sem: 6 },
      // Year 4
      { name: 'Internet of Things (IoT)', code: 'IT401', dept: 'IT', year: 4, sem: 7 },
      { name: 'Cloud Infrastructure & Services', code: 'IT402', dept: 'IT', year: 4, sem: 7 },
      { name: 'Data Mining & Business Intelligence', code: 'IT403', dept: 'IT', year: 4, sem: 7 },
      { name: 'Blockchain Technology', code: 'IT404', dept: 'IT', year: 4, sem: 8 },
      { name: 'Information Systems Management', code: 'IT405', dept: 'IT', year: 4, sem: 8 },

      // ─── 3. ARTIFICIAL INTELLIGENCE & DATA SCIENCE (AIDS) ────────────────
      // Year 1
      { name: 'Introduction to AI & Data Science', code: 'AI101', dept: 'AIDS', year: 1, sem: 1 },
      { name: 'Linear Algebra & Calculus', code: 'AI102', dept: 'AIDS', year: 1, sem: 1 },
      { name: 'Python for Data Science', code: 'AI103', dept: 'AIDS', year: 1, sem: 1 },
      { name: 'Probability & Statistics for AI', code: 'AI104', dept: 'AIDS', year: 1, sem: 2 },
      { name: 'Data Structures for Machine Learning', code: 'AI105', dept: 'AIDS', year: 1, sem: 2 },
      // Year 2
      { name: 'Machine Learning Foundations', code: 'AI201', dept: 'AIDS', year: 2, sem: 3 },
      { name: 'Database & SQL for Analytics', code: 'AI202', dept: 'AIDS', year: 2, sem: 3 },
      { name: 'Data Visualization & Exploratory Analysis', code: 'AI203', dept: 'AIDS', year: 2, sem: 3 },
      { name: 'Advanced Machine Learning Algorithms', code: 'AI204', dept: 'AIDS', year: 2, sem: 4 },
      { name: 'R Programming & Statistical Modeling', code: 'AI205', dept: 'AIDS', year: 2, sem: 4 },
      // Year 3
      { name: 'Deep Learning & Neural Networks', code: 'AI301', dept: 'AIDS', year: 3, sem: 5 },
      { name: 'Natural Language Processing (NLP)', code: 'AI302', dept: 'AIDS', year: 3, sem: 5 },
      { name: 'Big Data Tools & Spark', code: 'AI303', dept: 'AIDS', year: 3, sem: 5 },
      { name: 'Computer Vision & Image Processing', code: 'AI304', dept: 'AIDS', year: 3, sem: 6 },
      { name: 'Reinforcement Learning', code: 'AI305', dept: 'AIDS', year: 3, sem: 6 },
      // Year 4
      { name: 'Generative AI & LLMs', code: 'AI401', dept: 'AIDS', year: 4, sem: 7 },
      { name: 'MLOps & Model Deployment', code: 'AI402', dept: 'AIDS', year: 4, sem: 7 },
      { name: 'Ethics & Safety in Artificial Intelligence', code: 'AI403', dept: 'AIDS', year: 4, sem: 7 },
      { name: 'Robotics & Intelligent Systems', code: 'AI404', dept: 'AIDS', year: 4, sem: 8 },
      { name: 'AI Industrial Capstone Project', code: 'AI405', dept: 'AIDS', year: 4, sem: 8 },

      // ─── 4. ELECTRONICS & TELECOMMUNICATION (EXTC) ───────────────────────
      // Year 1
      { name: 'Basic Electrical Engineering', code: 'ET101', dept: 'EXTC', year: 1, sem: 1 },
      { name: 'Applied Physics for Engineers', code: 'ET102', dept: 'EXTC', year: 1, sem: 1 },
      { name: 'Engineering Calculus', code: 'ET103', dept: 'EXTC', year: 1, sem: 1 },
      { name: 'Electronic Devices & Circuits', code: 'ET104', dept: 'EXTC', year: 1, sem: 2 },
      { name: 'Circuit Theory & Network Analysis', code: 'ET105', dept: 'EXTC', year: 1, sem: 2 },
      // Year 2
      { name: 'Analog Communication Systems', code: 'ET201', dept: 'EXTC', year: 2, sem: 3 },
      { name: 'Digital Electronics & Logic Design', code: 'ET202', dept: 'EXTC', year: 2, sem: 3 },
      { name: 'Signals & Systems', code: 'ET203', dept: 'EXTC', year: 2, sem: 3 },
      { name: 'Microprocessors & Microcontrollers', code: 'ET204', dept: 'EXTC', year: 2, sem: 4 },
      { name: 'Electromagnetic Waves & Transmission Lines', code: 'ET205', dept: 'EXTC', year: 2, sem: 4 },
      // Year 3
      { name: 'Digital Communication & Coding', code: 'ET301', dept: 'EXTC', year: 3, sem: 5 },
      { name: 'Digital Signal Processing (DSP)', code: 'ET302', dept: 'EXTC', year: 3, sem: 5 },
      { name: 'VLSI Design & VHDL', code: 'ET303', dept: 'EXTC', year: 3, sem: 5 },
      { name: 'Antenna & Wave Propagation', code: 'ET304', dept: 'EXTC', year: 3, sem: 6 },
      { name: 'Optical Fiber Communication', code: 'ET305', dept: 'EXTC', year: 3, sem: 6 },
      // Year 4
      { name: 'Wireless Cellular Communication (4G/5G)', code: 'ET401', dept: 'EXTC', year: 4, sem: 7 },
      { name: 'Embedded System Design', code: 'ET402', dept: 'EXTC', year: 4, sem: 7 },
      { name: 'Satellite Communication & Radar', code: 'ET403', dept: 'EXTC', year: 4, sem: 7 },
      { name: 'Microwave Engineering', code: 'ET404', dept: 'EXTC', year: 4, sem: 8 },
      { name: 'Telecom Network Management', code: 'ET405', dept: 'EXTC', year: 4, sem: 8 },

      // ─── 5. MECHANICAL ENGINEERING (MECH) ────────────────────────────────
      // Year 1
      { name: 'Engineering Mechanics', code: 'ME101', dept: 'MECH', year: 1, sem: 1 },
      { name: 'Engineering Drawing & CAD', code: 'ME102', dept: 'MECH', year: 1, sem: 1 },
      { name: 'Applied Chemistry & Materials', code: 'ME103', dept: 'MECH', year: 1, sem: 1 },
      { name: 'Workshop Technology & Manufacturing', code: 'ME104', dept: 'MECH', year: 1, sem: 2 },
      { name: 'Thermodynamics Fundamentals', code: 'ME105', dept: 'MECH', year: 1, sem: 2 },
      // Year 2
      { name: 'Strength of Materials', code: 'ME201', dept: 'MECH', year: 2, sem: 3 },
      { name: 'Fluid Mechanics & Hydraulics', code: 'ME202', dept: 'MECH', year: 2, sem: 3 },
      { name: 'Material Science & Metallurgy', code: 'ME203', dept: 'MECH', year: 2, sem: 3 },
      { name: 'Kinematics of Machinery', code: 'ME204', dept: 'MECH', year: 2, sem: 4 },
      { name: 'Applied Thermal Engineering', code: 'ME205', dept: 'MECH', year: 2, sem: 4 },
      // Year 3
      { name: 'Dynamics of Machines', code: 'ME301', dept: 'MECH', year: 3, sem: 5 },
      { name: 'Heat & Mass Transfer', code: 'ME302', dept: 'MECH', year: 3, sem: 5 },
      { name: 'Design of Machine Elements', code: 'ME303', dept: 'MECH', year: 3, sem: 5 },
      { name: 'Manufacturing Processes & Tool Design', code: 'ME304', dept: 'MECH', year: 3, sem: 6 },
      { name: 'Control Systems & Mechatronics', code: 'ME305', dept: 'MECH', year: 3, sem: 6 },
      // Year 4
      { name: 'Finite Element Analysis (FEA)', code: 'ME401', dept: 'MECH', year: 4, sem: 7 },
      { name: 'CAD/CAM & Automation', code: 'ME402', dept: 'MECH', year: 4, sem: 7 },
      { name: 'Power Plant Engineering', code: 'ME403', dept: 'MECH', year: 4, sem: 7 },
      { name: 'Automobile Engineering & EV Tech', code: 'ME404', dept: 'MECH', year: 4, sem: 8 },
      { name: 'Industrial Engineering & Management', code: 'ME405', dept: 'MECH', year: 4, sem: 8 },
    ];

    console.log(`📋 Preparing ${curriculum.length} subjects for insertion...`);

    // Fetch existing subjects to avoid duplicate codes
    const { data: existingSubjects } = await supabase.from('subjects').select('id, subject_code');
    const existingCodeMap = new Set((existingSubjects || []).map((s) => s.subject_code.toUpperCase()));

    let inserted = 0;
    let skipped = 0;

    for (const sub of curriculum) {
      const deptId = deptMap[sub.dept];
      if (!deptId) {
        console.warn(`⚠️ Department ${sub.dept} not found, skipping ${sub.name}`);
        continue;
      }

      if (existingCodeMap.has(sub.code.toUpperCase())) {
        skipped++;
        continue;
      }

      const { error: insertErr } = await supabase.from('subjects').insert({
        name: sub.name,
        subject_code: sub.code.toUpperCase(),
        department_id: deptId,
        faculty_id: fallbackFacultyId,
        year: sub.year,
        semester: sub.sem,
        total_lectures: 0,
        is_active: true,
      });

      if (insertErr) {
        console.error(`❌ Failed to insert ${sub.code} (${sub.name}):`, insertErr.message);
      } else {
        inserted++;
        existingCodeMap.add(sub.code.toUpperCase());
      }
    }

    console.log(`\n🎉 Curriculum Seeding Complete!`);
    console.log(`✅ Newly Inserted: ${inserted}`);
    console.log(`⏩ Already Existed: ${skipped}`);

    const { count: totalSubjects } = await supabase.from('subjects').select('*', { count: 'exact', head: true }).eq('is_active', true);
    console.log(`📊 Total Active Subjects in Database: ${totalSubjects}\n`);
  } catch (err) {
    console.error('❌ Error seeding curriculum subjects:', err);
  }
};

seedCurriculumSubjects();
