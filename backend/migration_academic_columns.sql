-- ==============================================================================
-- BeaconAttend — Academic Columns Migration
-- Run this ONCE in your Supabase Dashboard → SQL Editor
-- ==============================================================================

-- 1. Add academic and identity columns to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS year INT CHECK (year BETWEEN 1 AND 4),
  ADD COLUMN IF NOT EXISTS semester INT CHECK (semester BETWEEN 1 AND 8),
  ADD COLUMN IF NOT EXISTS division TEXT,
  ADD COLUMN IF NOT EXISTS roll_number TEXT;

CREATE INDEX IF NOT EXISTS idx_users_roll_number
  ON public.users(roll_number);

-- 2. Add proper indexed columns to attendance_sessions (replace JSONB blob approach)
ALTER TABLE public.attendance_sessions
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS year INT CHECK (year BETWEEN 1 AND 4),
  ADD COLUMN IF NOT EXISTS semester INT CHECK (semester BETWEEN 1 AND 8),
  ADD COLUMN IF NOT EXISTS division TEXT;

-- 3. Index the new session academic columns for fast eligibility queries
CREATE INDEX IF NOT EXISTS idx_sessions_academic
  ON public.attendance_sessions(department_id, year, semester, division);

CREATE INDEX IF NOT EXISTS idx_users_academic
  ON public.users(department_id, year, semester, division);

-- 4. Backfill student year / semester / division from the classes table
UPDATE public.users u
SET
  year = c.year,
  division = c.division,
  semester = CASE
    WHEN c.year = 1 THEN 1
    WHEN c.year = 2 THEN 3
    WHEN c.year = 3 THEN 5
    WHEN c.year = 4 THEN 7
    ELSE 1
  END
FROM public.classes c
WHERE c.student_ids @> ARRAY[u.id]
  AND u.role = 'student'
  AND u.year IS NULL;

-- 5. Backfill attendance_sessions academic columns from location JSONB + joined tables
UPDATE public.attendance_sessions s
SET
  department_id = COALESCE(
    s.department_id,
    (s.location->>'departmentId')::UUID,
    sub.department_id
  ),
  year = COALESCE(
    s.year,
    (s.location->>'year')::INT,
    cls.year
  ),
  division = COALESCE(
    s.division,
    s.location->>'division',
    cls.division
  ),
  semester = COALESCE(
    s.semester,
    CASE
      WHEN COALESCE((s.location->>'year')::INT, cls.year) = 1 THEN 1
      WHEN COALESCE((s.location->>'year')::INT, cls.year) = 2 THEN 3
      WHEN COALESCE((s.location->>'year')::INT, cls.year) = 3 THEN 5
      WHEN COALESCE((s.location->>'year')::INT, cls.year) = 4 THEN 7
      ELSE NULL
    END
  )
FROM
  public.subjects sub,
  public.classes cls
WHERE sub.id = s.subject_id
  AND cls.id = s.class_id
  AND (s.department_id IS NULL OR s.year IS NULL OR s.division IS NULL);

-- 6. Helper function: validate year/semester combination
CREATE OR REPLACE FUNCTION public.is_valid_year_semester(p_year INT, p_semester INT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN CASE
    WHEN p_year = 1 AND p_semester IN (1, 2) THEN TRUE
    WHEN p_year = 2 AND p_semester IN (3, 4) THEN TRUE
    WHEN p_year = 3 AND p_semester IN (5, 6) THEN TRUE
    WHEN p_year = 4 AND p_semester IN (7, 8) THEN TRUE
    ELSE FALSE
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 7. Ensure unique attendance constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'unique_session_student'
      AND table_name = 'attendance_records'
  ) THEN
    ALTER TABLE public.attendance_records
      ADD CONSTRAINT unique_session_student UNIQUE (session_id, student_id);
  END IF;
END $$;

-- 8. Fixed Subject Mapping & Teacher Assignments Table
CREATE TABLE IF NOT EXISTS public.teacher_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_teacher_subject UNIQUE (teacher_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_subjects_teacher
  ON public.teacher_subjects(teacher_id);

CREATE INDEX IF NOT EXISTS idx_teacher_subjects_subject
  ON public.teacher_subjects(subject_id);

-- Backfill teacher_subjects from existing subjects table faculty_id
INSERT INTO public.teacher_subjects (teacher_id, subject_id)
SELECT s.faculty_id, s.id
FROM public.subjects s
WHERE s.faculty_id IS NOT NULL
ON CONFLICT (teacher_id, subject_id) DO NOTHING;

SELECT 'Migration complete.' AS status;
