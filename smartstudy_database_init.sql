-- ========================================================
-- SMARTSTUDY - PHSS PANDALLUR
-- COMPLETE DATABASE INITIALIZATION SCRIPT
-- ========================================================
-- INSTRUCTIONS FOR SETUP:
-- 1. Create a free project on Supabase (https://supabase.com).
-- 2. Once your project is created, click on "SQL Editor" on the left menu.
-- 3. Click "New Query".
-- 4. Paste this entire script into the editor.
-- 5. Click "Run" (or Ctrl + Enter).
-- 6. Go to "Project Settings" -> "API", copy:
--    - Project URL
--    - Project API anon key (public)
--    and paste them into SmartStudy's .env.local file!
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

-- 4. Enable Row Level Security (RLS)
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_stats ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies if re-running script
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

-- 6. Performance Indices
CREATE INDEX IF NOT EXISTS idx_attendance_date_rank ON attendance(date, rank_today);
CREATE INDEX IF NOT EXISTS idx_stats_total_points ON student_stats(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);

-- 7. Automatic Daily Ranking Trigger
CREATE OR REPLACE FUNCTION update_daily_ranks()
RETURNS TRIGGER AS $$
BEGIN
  -- Update all ranks for the given date, ordered by checkin_time
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

-- Drop trigger if already exists
DROP TRIGGER IF EXISTS trigger_update_ranks ON attendance;

-- Create trigger on attendance insert
CREATE TRIGGER trigger_update_ranks
AFTER INSERT ON attendance
FOR EACH ROW
EXECUTE FUNCTION update_daily_ranks();

-- Success Notice
DO $$
BEGIN
  RAISE NOTICE '✅ SmartStudy database for PHSS Pandallur initialized successfully!';
END $$;
