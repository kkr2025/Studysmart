export interface Student {
  id: string;
  name: string;
  batch: string;
  created_at: string;
}

export interface Attendance {
  id: string;
  student_id: string;
  date: string;
  checkin_time: string;
  points: number;
  rank_today: number;
}

export interface StudentStats {
  student_id: string;
  total_points: number;
  current_streak: number;
  best_streak: number;
  last_checkin_date: string | null;
  medal_level: string;
}

export interface LeaderboardEntry extends Attendance {
  students: {
    name: string;
    batch: string;
  };
}

export interface Announcement {
  id: string;
  message: string;
  created_by?: string;
  created_at: string;
}

export interface Exam {
  id: string;
  name: string;
  exam_date: string;
  created_at?: string;
}

export interface StudyTask {
  id: string;
  title: string;
  subject: string;
  target_batch: string;
  assigned_date: string;
  created_at?: string;
}

export interface TaskCompletion {
  id: string;
  task_id: string;
  student_id: string;
  completed_at: string;
}
