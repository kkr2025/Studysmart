import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.ts';
import { Student, Attendance, StudentStats, Announcement } from '../types.ts';
import { getFormattedDate, calculatePoints } from '../logic/utils.ts';
import { updateStudentStats } from '../logic/statsUpdater.ts';
import ExamCountdown from '../components/ExamCountdown.tsx';
import StudyPlanner from '../components/StudyPlanner.tsx';
import DonutChart from '../components/DonutChart.tsx';

interface DashboardProps {
  studentId: string;
}

const Dashboard: React.FC<DashboardProps> = ({ studentId }) => {
  const [student, setStudent] = useState<Student | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [totalAwakeCount, setTotalAwakeCount] = useState<number>(0);
  const [studyQuote, setStudyQuote] = useState<string>('');

  const quotes = [
    "The early morning has gold in its mouth.",
    "Focus is the key to all power.",
    "Your future is created by what you do today, not tomorrow.",
    "Discipline is freedom.",
    "Small daily improvements are the key to staggering long-term results.",
    "The sun has not caught me in bed in fifty years.",
    "Lose an hour in the morning, and you will spend all day looking for it."
  ];

  useEffect(() => {
    fetchInitialData();
    fetchAnnouncement();
    setStudyQuote(quotes[Math.floor(Math.random() * quotes.length)]);
  }, [studentId]);

  const fetchAnnouncement = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data?.message) {
        setAnnouncement(data.message);
      } else {
        const local = localStorage.getItem('smartstudy_custom_message');
        if (local) setAnnouncement(local);
      }
    } catch (e) {
      const local = localStorage.getItem('smartstudy_custom_message');
      if (local) setAnnouncement(local);
    }
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const today = getFormattedDate();

      const { data: std, error: stdErr } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .maybeSingle();

      if (stdErr) throw stdErr;
      if (!std) {
        alert('Student profile not found. Please register again.');
        localStorage.removeItem('student_id');
        localStorage.removeItem('student_batch');
        window.location.href = '/setup';
        return;
      }
      // Cache the student's class so the Leaderboard auto-filters to their class
      if (std.batch) {
        localStorage.setItem('student_batch', std.batch);
      }
      setStudent(std);

      const { data: att, error: attErr } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', studentId)
        .eq('date', today)
        .maybeSingle();

      if (attErr) throw attErr;
      setTodayAttendance(att);

      const { data: st, error: stErr } = await supabase
        .from('student_stats')
        .select('*')
        .eq('student_id', studentId)
        .maybeSingle();

      if (stErr && stErr.code !== 'PGRST116') throw stErr;
      setStats(st);

      // If not marked, get total count of students awake today for motivation
      if (!att) {
        const { count, error: countErr } = await supabase
          .from('attendance')
          .select('*', { count: 'exact', head: true })
          .eq('date', today);

        if (!countErr) setTotalAwakeCount(count || 0);
      }
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const markAttendance = async () => {
    if (todayAttendance || actionLoading) return;

    const now = new Date();
    const currentHour = now.getHours();
    if (currentHour >= 0 && currentHour < 3) {
      alert('🌙 Time to Rest & Recharge! 😴\n\n📚 Great minds need great rest!\n\nAttendance is restricted between 12 AM - 3 AM.\n\n💤 Take proper rest now\n🌅 Wake up fresh at 3 AM\n⚡ Restart your studies with renewed energy\n\n"Success is the sum of small efforts repeated day in and day out."\n\nYour health = Your wealth! 💚✨');
      return;
    }

    setActionLoading(true);
    try {
      const today = getFormattedDate();
      const points = calculatePoints(now.toISOString());

      const { data: newAtt, error } = await supabase
        .from('attendance')
        .insert([{
          student_id: studentId,
          date: today,
          checkin_time: now.toISOString(),
          points: points,
        }])
        .select()
        .single();

      if (error) throw error;

      await updateStudentStats(studentId, points, today);
      setTodayAttendance(newAtt);
      fetchInitialData();
    } catch (error: any) {
      if (error.code === '23505' || error.status === 409) {
        await fetchInitialData();
      } else {
        alert('Error marking attendance: ' + error.message);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Do you want to log out from SmartStudy on this device?')) {
      localStorage.removeItem('student_id');
      localStorage.removeItem('student_batch');
      window.location.href = '/setup';
    }
  };

  const getOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F0FDF4]">
        <div className="relative w-20 h-20 mb-4">
          <div className="absolute inset-0 bg-[#10B981] rounded-full animate-ping opacity-25"></div>
          <div className="relative w-full h-full bg-gradient-to-br from-[#064E3B] to-[#059669] rounded-3xl flex items-center justify-center text-4xl shadow-xl">
            🦅
          </div>
        </div>
        <p className="text-xs font-bold text-[#064E3B] uppercase tracking-wider animate-pulse">
          Opening SmartStudy...
        </p>
      </div>
    );
  }

  const medalLevel = stats?.medal_level || 'Seeker';
  const getRankBadge = (rank: number | undefined) => {
    if (!rank) return { label: 'Not Yet', color: 'text-[#64748B]', bg: 'bg-[#F1F5F9]' };
    if (rank === 1) return { label: '1st Place 🏆', color: 'text-amber-700', bg: 'bg-amber-50' };
    if (rank <= 3) return { label: `${getOrdinal(rank)} - Top 3 🥇`, color: 'text-emerald-700', bg: 'bg-emerald-50' };
    if (rank <= 5) return { label: `${getOrdinal(rank)} - Top 5 🥈`, color: 'text-teal-700', bg: 'bg-teal-50' };
    if (rank <= 10) return { label: `${getOrdinal(rank)} - Top 10 🥉`, color: 'text-cyan-700', bg: 'bg-cyan-50' };
    return { label: `Rank #${rank}`, color: 'text-[#064E3B]', bg: 'bg-[#ECFDF5]' };
  };

  const rankBadge = getRankBadge(todayAttendance?.rank_today);
  const currentStreak = stats?.current_streak || 0;
  // Calculate attendance consistency score (e.g., target 30 days milestone)
  const attendanceScore = Math.min(100, Math.round((currentStreak / 30) * 100));

  return (
    <div className="w-full min-h-screen bg-[#F0FDF4] px-4 pt-4 pb-24">
      <div className="w-full max-w-md mx-auto space-y-4">

        {/* Top Header with Student Info and Logout */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-[#D1FAE5] flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#064E3B] to-[#059669] flex items-center justify-center text-white text-xl font-black shadow-md">
              {student?.name?.charAt(0) || 'S'}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
                  Class {student?.batch}
                </span>
                <span className="text-[10px] text-[#64748B] font-semibold">PHSS Pandallur</span>
              </div>
              <h1 className="text-lg font-black text-[#064E3B] tracking-tight truncate max-w-[190px]">
                {student?.name}
              </h1>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            title="Log out from this device"
            className="p-2.5 rounded-xl border border-[#E2E8F0] hover:bg-[#FEE2E2] hover:border-[#EF4444] text-[#64748B] hover:text-[#DC2626] transition-all flex flex-col items-center"
          >
            <span className="text-base">🚪</span>
            <span className="text-[9px] font-bold uppercase mt-0.5">Logout</span>
          </button>
        </div>

        {/* Admin Announcement Banner */}
        {announcement && (
          <div className="bg-gradient-to-r from-[#064E3B] to-[#047857] text-white p-4 rounded-2xl shadow-md border border-[#059669] flex items-start gap-3 animate-pop">
            <span className="text-2xl flex-shrink-0">📢</span>
            <div>
              <p className="text-[10px] uppercase font-extrabold text-emerald-200 tracking-wider">Teacher Announcement</p>
              <p className="text-xs font-bold text-white mt-0.5 leading-relaxed">{announcement}</p>
            </div>
          </div>
        )}

        {/* Exam Countdown Component */}
        <ExamCountdown />

        {/* Study Planner Component */}
        <StudyPlanner studentId={studentId} studentBatch={student?.batch || 'All'} />

        {/* Morning Attendance Check-In Card */}
        <div className="bg-white rounded-3xl p-5 border border-[#D1FAE5] shadow-lg shadow-emerald-950/5">
          {!todayAttendance ? (
            <div>
              {new Date().getHours() >= 0 && new Date().getHours() < 3 ? (
                <div className="p-6 text-center border-2 border-dashed border-amber-200 bg-amber-50 rounded-2xl">
                  <div className="text-5xl mb-2">😴</div>
                  <h3 className="text-lg font-black text-amber-900 mb-1">Rest & Recharge Time</h3>
                  <p className="text-xs text-amber-700 font-medium mb-3">
                    Great minds take proper rest! Attendance opens at 3:00 AM.
                  </p>
                  <button disabled className="btn bg-amber-200 text-amber-800 font-bold opacity-60 w-full rounded-xl py-3 border border-amber-300">
                    Sleep Well 🌙
                  </button>
                </div>
              ) : (
                <div>
                  <div className="text-center mb-3">
                    <p className="text-xs font-bold text-[#059669] uppercase tracking-wider">
                      {totalAwakeCount > 0 ? `🌟 ${totalAwakeCount} Early Birds Already Up!` : '🌅 Be the first to rise today!'}
                    </p>
                  </div>
                  <button
                    onClick={markAttendance}
                    disabled={actionLoading}
                    className="w-full bg-gradient-to-br from-[#064E3B] via-[#047857] to-[#059669] text-white py-8 rounded-2xl shadow-xl shadow-emerald-950/15 flex flex-col items-center justify-center transition-all active:scale-98 disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin mb-3"></div>
                        <span className="text-xs font-bold uppercase tracking-wider">Marking Presence...</span>
                      </div>
                    ) : (
                      <>
                        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-5xl mb-3 backdrop-blur-sm">
                          ☀️
                        </div>
                        <span className="text-2xl font-black uppercase tracking-tight">I Am Awake</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">
                          Tap to Log Attendance
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center">
              <div className="inline-block p-3 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] mb-3">
                <span className="text-4xl">✅</span>
              </div>
              <h2 className="text-xl font-black text-[#064E3B] mb-1">Attendance Marked!</h2>
              <div className="inline-block px-3 py-1 rounded-full text-xs font-black uppercase mb-4" style={{ backgroundColor: rankBadge.bg, color: rankBadge.color }}>
                {rankBadge.label}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-[#F0FDF4] p-3 rounded-xl border border-[#D1FAE5]">
                  <p className="text-[10px] font-bold text-[#059669] uppercase">Points Earned</p>
                  <p className="text-xl font-black text-[#064E3B]">+{todayAttendance.points} pts</p>
                </div>
                <div className="bg-[#F0FDF4] p-3 rounded-xl border border-[#D1FAE5]">
                  <p className="text-[10px] font-bold text-[#059669] uppercase">Check-in Time</p>
                  <p className="text-xl font-black text-[#064E3B]">
                    {new Date(todayAttendance.checkin_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats & Donut Consistency Card */}
        <div className="bg-white rounded-3xl p-5 border border-[#D1FAE5] shadow-sm">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#D1FAE5]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#064E3B]">Your Consistency Overview</h3>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#047857]">
              {medalLevel} Badge
            </span>
          </div>

          <div className="flex items-center justify-around py-2">
            <DonutChart
              percentage={attendanceScore}
              label="Streak Pace"
              sublabel={`${currentStreak} / 30 Days`}
              size={120}
              strokeWidth={12}
              primaryColor="#047857"
              trackColor="#D1FAE5"
            />

            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">💎</span>
                <div>
                  <span className="block text-[10px] font-bold text-[#64748B] uppercase">Total Points</span>
                  <span className="text-lg font-black text-[#064E3B]">{stats?.total_points || 0}</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🔥</span>
                <div>
                  <span className="block text-[10px] font-bold text-[#64748B] uppercase">Current Streak</span>
                  <span className="text-lg font-black text-[#047857]">{currentStreak} Days</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🏅</span>
                <div>
                  <span className="block text-[10px] font-bold text-[#64748B] uppercase">Best Streak</span>
                  <span className="text-lg font-black text-[#064E3B]">{stats?.best_streak || 0} Days</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Motivation Quote */}
        <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-2xl p-4 text-center">
          <p className="text-[10px] font-bold text-[#047857] uppercase tracking-wider mb-1">💡 Daily Wisdom</p>
          <p className="text-xs font-semibold text-[#064E3B] italic">"{studyQuote}"</p>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
