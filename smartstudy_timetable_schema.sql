-- ========================================================
-- SMARTSTUDY - WEEKLY TIMETABLE & EXAMS SCHEMA UPDATE
-- ========================================================
-- Run this in your Supabase SQL Editor: https://supabase.com
-- ========================================================

-- 1. Exams Table
CREATE TABLE IF NOT EXISTS exams (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  exam_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Weekly Timetable / Multi-Subject Study Planner
CREATE TABLE IF NOT EXISTS weekly_timetable (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  day_of_week TEXT NOT NULL, -- 'Monday', 'Tuesday', 'Wednesday', etc.
  class_name TEXT NOT NULL DEFAULT 'All', -- '10A', '10B' or 'All'
  slot_number INT DEFAULT 1,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Study Tasks (Specific date tasks)
CREATE TABLE IF NOT EXISTS study_tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT DEFAULT 'General',
  target_batch TEXT DEFAULT 'All',
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Timetable / Task Completions
CREATE TABLE IF NOT EXISTS timetable_completions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id TEXT NOT NULL, -- references weekly_timetable id or study_tasks id
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  completion_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(item_id, student_id, completion_date)
);

-- 5. Announcements Table
CREATE TABLE IF NOT EXISTS announcements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL,
  created_by TEXT DEFAULT 'Admin',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- 7. Drop policies if re-running
DROP POLICY IF EXISTS "Public select exams" ON exams;
DROP POLICY IF EXISTS "Public insert exams" ON exams;
DROP POLICY IF EXISTS "Public delete exams" ON exams;

DROP POLICY IF EXISTS "Public select weekly_timetable" ON weekly_timetable;
DROP POLICY IF EXISTS "Public insert weekly_timetable" ON weekly_timetable;
DROP POLICY IF EXISTS "Public delete weekly_timetable" ON weekly_timetable;

DROP POLICY IF EXISTS "Public select timetable_completions" ON timetable_completions;
DROP POLICY IF EXISTS "Public insert timetable_completions" ON timetable_completions;
DROP POLICY IF EXISTS "Public delete timetable_completions" ON timetable_completions;

DROP POLICY IF EXISTS "Public select announcements" ON announcements;
DROP POLICY IF EXISTS "Public insert announcements" ON announcements;

-- 8. Create Policies
CREATE POLICY "Public select exams" ON exams FOR SELECT USING (true);
CREATE POLICY "Public insert exams" ON exams FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete exams" ON exams FOR DELETE USING (true);

CREATE POLICY "Public select weekly_timetable" ON weekly_timetable FOR SELECT USING (true);
CREATE POLICY "Public insert weekly_timetable" ON weekly_timetable FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete weekly_timetable" ON weekly_timetable FOR DELETE USING (true);

CREATE POLICY "Public select timetable_completions" ON timetable_completions FOR SELECT USING (true);
CREATE POLICY "Public insert timetable_completions" ON timetable_completions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete timetable_completions" ON timetable_completions FOR DELETE USING (true);

CREATE POLICY "Public select announcements" ON announcements FOR SELECT USING (true);
CREATE POLICY "Public insert announcements" ON announcements FOR INSERT WITH CHECK (true);

-- 9. Indexes for speed
CREATE INDEX IF NOT EXISTS idx_timetable_day ON weekly_timetable(day_of_week, class_name);
CREATE INDEX IF NOT EXISTS idx_completions_student ON timetable_completions(student_id, completion_date);
CREATE INDEX IF NOT EXISTS idx_exams_date ON exams(exam_date);

-- Done
DO $$
BEGIN
  RAISE NOTICE '✅ SmartStudy Timetable and Exams schema ready!';
END $$;
