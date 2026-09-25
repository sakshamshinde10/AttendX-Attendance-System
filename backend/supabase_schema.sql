-- ==============================================================================
-- BeaconAttend - Complete Supabase PostgreSQL Schema & Seed Migration
-- ==============================================================================
-- Paste and run this script in your Supabase Dashboard -> SQL Editor
-- Run in FULL to create tables, disable RLS, add indexes and seed initial data
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. DEPARTMENTS TABLE
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    hod_id UUID,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('student', 'faculty', 'admin')),
    student_id TEXT UNIQUE,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    subjects TEXT[] DEFAULT ARRAY[]::TEXT[],
    bound_device_id TEXT,
    profile_pic TEXT,
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_approved BOOLEAN NOT NULL DEFAULT true,
    fcm_token TEXT,
    last_login TIMESTAMPTZ,
    reset_password_token TEXT,
    reset_password_expire TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add Foreign Key for Department HOD (after users table is created)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_departments_hod'
    ) THEN
        ALTER TABLE public.departments 
        ADD CONSTRAINT fk_departments_hod 
        FOREIGN KEY (hod_id) REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. SUBJECTS TABLE
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subject_code TEXT NOT NULL UNIQUE,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    faculty_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    year INT CHECK (year BETWEEN 1 AND 4),
    semester INT CHECK (semester BETWEEN 1 AND 8),
    total_lectures INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. CLASSES TABLE
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    year INT NOT NULL CHECK (year BETWEEN 1 AND 4),
    division TEXT,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    student_ids UUID[] DEFAULT ARRAY[]::UUID[],
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. ATTENDANCE SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    faculty_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    ble_uuid TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    current_qr_token TEXT NOT NULL,
    qr_nonce TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    qr_generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_time TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    present_count INT NOT NULL DEFAULT 0,
    location JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. ATTENDANCE RECORDS TABLE
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    ble_rssi NUMERIC,
    distance_meters NUMERIC DEFAULT -1,
    ble_verified BOOLEAN NOT NULL DEFAULT false,
    qr_verified BOOLEAN NOT NULL DEFAULT false,
    device_id TEXT,
    verification_score NUMERIC DEFAULT 0,
    trust_factors JSONB DEFAULT '{}'::JSONB,
    flagged_reasons TEXT[] DEFAULT ARRAY[]::TEXT[],
    status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'flagged', 'rejected', 'absent')),
    review_note TEXT,
    reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    marked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_address TEXT,
    device_info TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_session_student UNIQUE (session_id, student_id)
);

-- 7. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'announcement' CHECK (type IN ('attendance', 'announcement', 'alert', 'report')),
    target_role TEXT CHECK (target_role IN ('all', 'student', 'faculty', 'admin')),
    recipient_ids UUID[] DEFAULT ARRAY[]::UUID[],
    sent_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    data JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. ACTIVITY LOGS TABLE
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    success BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_student_id ON public.users(student_id);
CREATE INDEX IF NOT EXISTS idx_users_department ON public.users(department_id);

CREATE INDEX IF NOT EXISTS idx_sessions_faculty ON public.attendance_sessions(faculty_id, is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_ble_uuid ON public.attendance_sessions(ble_uuid);
CREATE INDEX IF NOT EXISTS idx_sessions_subject ON public.attendance_sessions(subject_id);

CREATE INDEX IF NOT EXISTS idx_records_student_subject ON public.attendance_records(student_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_records_session_status ON public.attendance_records(session_id, status);
CREATE INDEX IF NOT EXISTS idx_records_marked_at ON public.attendance_records(marked_at);

CREATE INDEX IF NOT EXISTS idx_activity_user ON public.activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_action ON public.activity_logs(action, created_at DESC);

-- ==============================================================================
-- DISABLE ROW LEVEL SECURITY (Allow service_role key full access from Node.js)
-- This is required for the backend to read/write all tables without RLS errors.
-- ==============================================================================
ALTER TABLE public.departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs DISABLE ROW LEVEL SECURITY;

-- Grant full access to service_role (in case of Supabase managed auth)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ==============================================================================
-- AUTOMATIC updated_at TRIGGER FUNCTION
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updated_at' AND table_schema = 'public'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS tr_%I_updated_at ON public.%I;', tbl, tbl);
        EXECUTE format('CREATE TRIGGER tr_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();', tbl, tbl);
    END LOOP;
END $$;

-- ==============================================================================
-- SEED INITIAL DATA (Departments + Master Admin)
-- ==============================================================================

-- Standard academic departments
INSERT INTO public.departments (name, code, description)
VALUES 
    ('Computer Engineering', 'COMP', 'Department of Computer Engineering'),
    ('Information Technology', 'IT', 'Department of Information Technology'),
    ('Artificial Intelligence & Data Science', 'AIDS', 'Department of AI & Data Science'),
    ('Electronics & Telecommunication', 'EXTC', 'Department of EXTC'),
    ('Mechanical Engineering', 'MECH', 'Department of Mechanical Engineering')
ON CONFLICT (code) DO NOTHING;

-- Master Admin Account (password: password123, bcrypt-hashed)
INSERT INTO public.users (name, email, password, role, is_active, is_approved)
VALUES (
    'System Admin',
    'admin@example.com',
    '$2a$12$4m26l0Otw41R76w8lP7ege8G9.s0O3Z7p5hM28tU4f6kK18e2j4wG', -- password123 (bcrypt salt 12)
    'admin',
    true,
    true
)
ON CONFLICT (email) DO NOTHING;
