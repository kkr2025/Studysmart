-- ========================================================
-- SMARTSTUDY - PHSS PANDALLUR
-- COMPLETE DATABASE INITIALIZATION SCRIPT (V2)
-- ========================================================
-- INSTRUCTIONS FOR SETUP:
-- 1. Open your Supabase Dashboard: https://supabase.com
-- 2. Click on "SQL Editor" on the left menu.
-- 3. Click "New Query".
-- 4. Paste this entire script into the editor.
-- 5. Click "Run" (or Ctrl + Enter).
-- ========================================================

-- 1. Create Students Table
CREATE TABLE IF NOT EXISTS students (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  batch TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  checkin_time TIMESTAMPTZ DEFAULT now(),
  points INT DEFAULT 0,
  rank_today INT DEFAULT 0,
  UNIQUE(student_id, date)
);

-- 3. Create Student Stats Table
CREATE TABLE IF NOT EXISTS student_stats (
  student_id uuid PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  total_points INT DEFAULT 0,
  current_streak INT DEFAULT 0,
  best_streak INT DEFAULT 0,
  last_checkin_date DATE,
  medal_level TEXT DEFAULT 'None'
);

-- 4. Create Announcements / Custom Messages Table
CREATE TABLE IF NOT EXISTS announcements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL,
  created_by TEXT DEFAULT 'Admin',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create Exams Countdown Table
CREATE TABLE IF NOT EXISTS exams (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  exam_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Create Study Tasks / Planner Table
CREATE TABLE IF NOT EXISTS study_tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT DEFAULT 'General',
  target_batch TEXT DEFAULT 'All',
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Create Task Completions Table
CREATE TABLE IF NOT EXISTS task_completions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid REFERENCES study_tasks(id) ON DELETE CASCADE,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(task_id, student_id)
);

-- 8. Enable Row Level Security (RLS)
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

-- 9. Drop existing policies if re-running
DROP POLICY IF EXISTS "Public select students" ON students;
DROP POLICY IF EXISTS "Public insert students" ON students;
DROP POLICY IF EXISTS "Public update students" ON students;
DROP POLICY IF EXISTS "Public delete students" ON students;

DROP POLICY IF EXISTS "Public select attendance" ON attendance;
DROP POLICY IF EXISTS "Public insert attendance" ON attendance;
DROP POLICY IF EXISTS "Public update attendance" ON attendance;
DROP POLICY IF EXISTS "Public delete attendance" ON attendance;

DROP POLICY IF EXISTS "Public select student_stats" ON student_stats;
DROP POLICY IF EXISTS "Public insert student_stats" ON student_stats;
DROP POLICY IF EXISTS "Public update student_stats" ON student_stats;
DROP POLICY IF EXISTS "Public delete student_stats" ON student_stats;

DROP POLICY IF EXISTS "Public select announcements" ON announcements;
DROP POLICY IF EXISTS "Public insert announcements" ON announcements;
DROP POLICY IF EXISTS "Public update announcements" ON announcements;
DROP POLICY IF EXISTS "Public delete announcements" ON announcements;

DROP POLICY IF EXISTS "Public select exams" ON exams;
DROP POLICY IF EXISTS "Public insert exams" ON exams;
DROP POLICY IF EXISTS "Public update exams" ON exams;
DROP POLICY IF EXISTS "Public delete exams" ON exams;

DROP POLICY IF EXISTS "Public select study_tasks" ON study_tasks;
DROP POLICY IF EXISTS "Public insert study_tasks" ON study_tasks;
DROP POLICY IF EXISTS "Public update study_tasks" ON study_tasks;
DROP POLICY IF EXISTS "Public delete study_tasks" ON study_tasks;

DROP POLICY IF EXISTS "Public select task_completions" ON task_completions;
DROP POLICY IF EXISTS "Public insert task_completions" ON task_completions;
DROP POLICY IF EXISTS "Public update task_completions" ON task_completions;
DROP POLICY IF EXISTS "Public delete task_completions" ON task_completions;

-- Create Public Access Policies
CREATE POLICY "Public select students" ON students FOR SELECT USING (true);
CREATE POLICY "Public insert students" ON students FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update students" ON students FOR UPDATE USING (true);
CREATE POLICY "Public delete students" ON students FOR DELETE USING (true);

CREATE POLICY "Public select attendance" ON attendance FOR SELECT USING (true);
CREATE POLICY "Public insert attendance" ON attendance FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update attendance" ON attendance FOR UPDATE USING (true);
CREATE POLICY "Public delete attendance" ON attendance FOR DELETE USING (true);

CREATE POLICY "Public select student_stats" ON student_stats FOR SELECT USING (true);
CREATE POLICY "Public insert student_stats" ON student_stats FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update student_stats" ON student_stats FOR UPDATE USING (true);
CREATE POLICY "Public delete student_stats" ON student_stats FOR DELETE USING (true);

CREATE POLICY "Public select announcements" ON announcements FOR SELECT USING (true);
CREATE POLICY "Public insert announcements" ON announcements FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update announcements" ON announcements FOR UPDATE USING (true);
CREATE POLICY "Public delete announcements" ON announcements FOR DELETE USING (true);

CREATE POLICY "Public select exams" ON exams FOR SELECT USING (true);
CREATE POLICY "Public insert exams" ON exams FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update exams" ON exams FOR UPDATE USING (true);
CREATE POLICY "Public delete exams" ON exams FOR DELETE USING (true);

CREATE POLICY "Public select study_tasks" ON study_tasks FOR SELECT USING (true);
CREATE POLICY "Public insert study_tasks" ON study_tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update study_tasks" ON study_tasks FOR UPDATE USING (true);
CREATE POLICY "Public delete study_tasks" ON study_tasks FOR DELETE USING (true);

CREATE POLICY "Public select task_completions" ON task_completions FOR SELECT USING (true);
CREATE POLICY "Public insert task_completions" ON task_completions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update task_completions" ON task_completions FOR UPDATE USING (true);
CREATE POLICY "Public delete task_completions" ON task_completions FOR DELETE USING (true);

-- 10. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_date_rank ON attendance(date, rank_today);
CREATE INDEX IF NOT EXISTS idx_stats_total_points ON student_stats(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_study_tasks_date ON study_tasks(assigned_date);
CREATE INDEX IF NOT EXISTS idx_task_completions_student ON task_completions(student_id);

-- 11. Automatic Daily Ranking Trigger
CREATE OR REPLACE FUNCTION update_daily_ranks()
RETURNS TRIGGER AS $$
BEGIN
  WITH ranked AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (ORDER BY checkin_time ASC) as new_rank
    FROM attendance
    WHERE date = NEW.date
  )
  UPDATE attendance a
  SET rank_today = r.new_rank
  FROM ranked r
  WHERE a.id = r.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_ranks ON attendance;

CREATE TRIGGER trigger_update_ranks
AFTER INSERT ON attendance
FOR EACH ROW
EXECUTE FUNCTION update_daily_ranks();

-- 12. Optional Initial Announcement
INSERT INTO announcements (message)
VALUES ('Welcome to SmartStudy! Early mornings lead to great success. 🌅')
ON CONFLICT DO NOTHING;

-- Done
DO $$
BEGIN
  RAISE NOTICE '✅ SmartStudy V2 database for PHSS Pandallur initialized successfully!';
END $$;
