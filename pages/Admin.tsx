import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient.ts';
import { getFormattedDate } from '../logic/utils.ts';
import { generateAttendancePDF, generateMonthlyPDF } from '../logic/pdfGenerator.ts';
import DonutChart from '../components/DonutChart.tsx';
import { Exam, StudyTask } from '../types.ts';

const ADMIN_PASSWORD = 'tracker2026';
const CLASSES = ['10A', '10B', '10C', '10D', '10E', '10F', '10G', '10H', '10I', '10J', '10K', '10L', '10M', '10N'];

const Admin: React.FC = () => {
  // Authentication & Class Gate
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [hasSelectedClass, setHasSelectedClass] = useState(false);
  const [selectedClass, setSelectedClass] = useState('10A');

  // Navigation tab in Admin
  const [activeTab, setActiveTab] = useState<'attendance' | 'planner' | 'exams' | 'announcement'>('attendance');

  // Core Data
  const [selectedDate, setSelectedDate] = useState(getFormattedDate());
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [allAttendance, setAllAttendance] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Profile Modal State
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [studentCompletions, setStudentCompletions] = useState<any[]>([]);

  // Announcement State
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementSuccess, setAnnouncementSuccess] = useState(false);

  // Study Planner State
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskSubject, setNewTaskSubject] = useState('Physics');
  const [taskSuccess, setTaskSuccess] = useState(false);

  // Exam Reminder State
  const [exams, setExams] = useState<Exam[]>([]);
  const [newExamName, setNewExamName] = useState('');
  const [newExamDate, setNewExamDate] = useState('');
  const [examSuccess, setExamSuccess] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setLoginError(false);
    } else {
      setLoginError(true);
      setTimeout(() => setLoginError(false), 2000);
    }
  };

  const handleClassSelectionConfirm = () => {
    setHasSelectedClass(true);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Students
      const { data: students, error: sErr } = await supabase
        .from('students')
        .select('*');
      if (sErr) throw sErr;
      setAllStudents(students || []);

      // 2. Fetch Attendance for Selected Date
      const { data: attData, error: attErr } = await supabase
        .from('attendance')
        .select(`
          id,
          student_id,
          checkin_time,
          points,
          rank_today,
          students (
            name,
            batch
          )
        `)
        .eq('date', selectedDate)
        .order('checkin_time', { ascending: true });

      if (attErr) throw attErr;
      setAllAttendance(attData || []);

      // 3. Fetch Announcement
      const { data: annData } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (annData?.message) setAnnouncementText(annData.message);

      // 4. Fetch Tasks
      const { data: taskData } = await supabase
        .from('study_tasks')
        .select('*')
        .eq('assigned_date', selectedDate);
      setTasks(taskData || []);

      // 5. Fetch Exams
      const { data: examData } = await supabase
        .from('exams')
        .select('*')
        .order('exam_date', { ascending: true });
      setExams(examData || []);

    } catch (err) {
      console.error('Admin Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && hasSelectedClass) {
      fetchData();
    }
  }, [isAuthenticated, hasSelectedClass, selectedDate]);

  // Filter students and attendance by selected class
  const classStudents = useMemo(() => {
    if (selectedClass === 'All') return allStudents;
    return allStudents.filter(s => s.batch === selectedClass);
  }, [allStudents, selectedClass]);

  const classAttendance = useMemo(() => {
    if (selectedClass === 'All') return allAttendance;
    return allAttendance.filter(a => a.students?.batch === selectedClass);
  }, [allAttendance, selectedClass]);

  const top3 = useMemo(() => classAttendance.slice(0, 3), [classAttendance]);
  const last3 = useMemo(() => classAttendance.length > 3 ? classAttendance.slice(-3) : [], [classAttendance]);

  const lateStudents = useMemo(() => {
    const attendedIds = new Set(classAttendance.map(a => a.student_id));
    return classStudents.filter(s => !attendedIds.has(s.id));
  }, [classStudents, classAttendance]);

  const filteredSearch = useMemo(() => {
    if (!searchQuery.trim()) return classStudents;
    return classStudents.filter(s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.batch.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [classStudents, searchQuery]);

  // Publish Announcement
  const handleSaveAnnouncement = async () => {
    if (!announcementText.trim()) return;
    try {
      await supabase.from('announcements').insert([{ message: announcementText.trim() }]);
      localStorage.setItem('smartstudy_custom_message', announcementText.trim());
      setAnnouncementSuccess(true);
      setTimeout(() => setAnnouncementSuccess(false), 2500);
      alert('Announcement published to student screens! 📢');
    } catch (e: any) {
      localStorage.setItem('smartstudy_custom_message', announcementText.trim());
      alert('Saved announcement locally!');
    }
  };

  // Add Study Task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const taskObj = {
        title: newTaskTitle.trim(),
        subject: newTaskSubject,
        target_batch: selectedClass,
        assigned_date: selectedDate,
      };

      const { data, error } = await supabase.from('study_tasks').insert([taskObj]).select().single();
      if (!error && data) {
        setTasks(prev => [...prev, data]);
      } else {
        // Fallback
        const fallbackTask: StudyTask = {
          id: Math.random().toString(),
          ...taskObj
        };
        setTasks(prev => [...prev, fallbackTask]);
        const existing = JSON.parse(localStorage.getItem(`smartstudy_tasks_${selectedDate}`) || '[]');
        localStorage.setItem(`smartstudy_tasks_${selectedDate}`, JSON.stringify([...existing, fallbackTask]));
      }

      setNewTaskTitle('');
      setTaskSuccess(true);
      setTimeout(() => setTaskSuccess(false), 2000);
    } catch (e: any) {
      alert('Task added successfully!');
    }
  };

  // Delete Study Task
  const handleDeleteTask = async (taskId: string) => {
    try {
      await supabase.from('study_tasks').delete().eq('id', taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (e) {}
  };

  // Add Exam
  const handleAddExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamName.trim() || !newExamDate) return;

    try {
      const examObj = {
        name: newExamName.trim(),
        exam_date: newExamDate,
      };
      const { data, error } = await supabase.from('exams').insert([examObj]).select().single();
      if (!error && data) {
        setExams(prev => [...prev, data]);
      }
      setNewExamName('');
      setNewExamDate('');
      setExamSuccess(true);
      setTimeout(() => setExamSuccess(false), 2000);
    } catch (e: any) {}
  };

  // Delete Exam
  const handleDeleteExam = async (examId: string) => {
    try {
      await supabase.from('exams').delete().eq('id', examId);
      setExams(prev => prev.filter(e => e.id !== examId));
    } catch (e) {}
  };

  // Open Student Profile Modal
  const openStudentProfile = async (student: any) => {
    setSelectedStudent(student);
    try {
      const { data } = await supabase
        .from('task_completions')
        .select('*, study_tasks(title, subject)')
        .eq('student_id', student.id);
      setStudentCompletions(data || []);
    } catch (e) {
      setStudentCompletions([]);
    }
  };

  const copyToppersToWhatsApp = () => {
    const toppers = classAttendance.slice(0, 5);
    if (toppers.length === 0) return alert('No attendance records yet for this class.');

    let text = `*🦅 SMARTSTUDY | TOP EARLY RISERS (${selectedDate})*\n*PHSS Pandallur - Class ${selectedClass}*\n\n`;
    toppers.forEach((item, index) => {
      const time = new Date(item.checkin_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      text += `${index + 1}. *${item.students?.name}* - ${time} (${item.students?.batch})\n`;
    });
    text += `\nKeep rising! 🔥📚`;

    navigator.clipboard.writeText(text);
    alert('Top 5 copied to clipboard!');
  };

  const copyLateToWhatsApp = () => {
    if (lateStudents.length === 0) return alert('Perfect attendance in this class today! ✨');

    let text = `*⚠️ SMARTSTUDY | PENDING ATTENDANCE (${selectedDate})*\n*PHSS Pandallur - Class ${selectedClass}*\n\n`;
    text += `The following students have not checked in yet:\n\n`;
    lateStudents.forEach((student) => {
      text += `- *${student.name}* (Class ${student.batch})\n`;
    });
    text += `\nPlease check in immediately! ⏰📚`;

    navigator.clipboard.writeText(text);
    alert('Pending list copied to clipboard!');
  };

  const exportToPDF = () => {
    try {
      generateAttendancePDF(selectedDate, classStudents.length, classAttendance);
    } catch (error) {
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const exportMonthlyPDF = async () => {
    try {
      const { data: statsData, error } = await supabase
        .from('student_stats')
        .select(`
          total_points,
          current_streak,
          medal_level,
          students (
            name,
            batch
          )
        `)
        .order('total_points', { ascending: false });

      if (error) throw error;
      const formattedData = (statsData || []).map((s: any) => ({
        name: s.students?.name || 'Unknown',
        batch: s.students?.batch || '-',
        total_points: s.total_points || 0,
        current_streak: s.current_streak || 0,
        medal_level: s.medal_level || 'None'
      }));

      generateMonthlyPDF(selectedDate.substring(0, 7), classStudents.length, formattedData);
    } catch (error: any) {
      alert('Monthly PDF Error: ' + error.message);
    }
  };

  // 1. Password Gate
  if (!isAuthenticated) {
    return (
      <div className="w-full min-h-screen bg-[#F0FDF4] p-4 flex flex-col items-center justify-center">
        <div className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-xl border border-[#D1FAE5] text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-[#064E3B] to-[#059669] rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl shadow-md text-white">
            🛡️
          </div>
          <h1 className="text-2xl font-black text-[#064E3B] mb-1">Teacher Login</h1>
          <p className="text-xs font-bold text-[#059669] uppercase tracking-wider mb-6">PHSS Pandallur Admin</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              className={`w-full px-4 py-3.5 rounded-xl border-2 ${loginError ? 'border-red-400 bg-red-50 text-red-700' : 'border-[#D1FAE5] bg-[#F8FAFC] text-[#0F172A]'} focus:outline-none focus:border-[#059669] text-center font-bold tracking-[0.4em] text-lg`}
              placeholder="ENTER PASSWORD"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[#064E3B] to-[#059669] text-white font-extrabold py-3.5 rounded-xl shadow-md hover:brightness-105 active:scale-98 transition-all uppercase tracking-wider text-sm"
            >
              Verify & Enter
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. Class Selection Gate (Admin must select class first before dashboard)
  if (!hasSelectedClass) {
    return (
      <div className="w-full min-h-screen bg-[#F0FDF4] p-4 flex flex-col items-center justify-center">
        <div className="w-full max-w-md bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-[#D1FAE5] text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-[#064E3B] to-[#059669] rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl text-white shadow-md">
            🏫
          </div>
          <h1 className="text-2xl font-black text-[#064E3B] mb-1">Select Your Class</h1>
          <p className="text-xs text-[#64748B] mb-6">Choose a class to manage attendance and study plans</p>

          <div className="grid grid-cols-3 gap-2.5 mb-6 max-h-[300px] overflow-y-auto p-1">
            <button
              type="button"
              onClick={() => setSelectedClass('All')}
              className={`py-3 rounded-xl font-black text-sm border-2 transition-all ${
                selectedClass === 'All'
                  ? 'bg-[#047857] text-white border-[#064E3B] shadow-md scale-102'
                  : 'bg-[#F8FAFC] text-[#064E3B] border-[#D1FAE5] hover:bg-[#ECFDF5]'
              }`}
            >
              All Classes
            </button>
            {CLASSES.map((cls) => (
              <button
                key={cls}
                type="button"
                onClick={() => setSelectedClass(cls)}
                className={`py-3 rounded-xl font-black text-sm border-2 transition-all ${
                  selectedClass === cls
                    ? 'bg-[#047857] text-white border-[#064E3B] shadow-md scale-102'
                    : 'bg-[#F8FAFC] text-[#064E3B] border-[#D1FAE5] hover:bg-[#ECFDF5]'
                }`}
              >
                Class {cls}
              </button>
            ))}
          </div>

          <button
            onClick={handleClassSelectionConfirm}
            className="w-full bg-gradient-to-r from-[#064E3B] via-[#047857] to-[#059669] text-white font-extrabold py-4 rounded-xl shadow-lg active:scale-98 transition-all text-base"
          >
            Open Class {selectedClass} Dashboard ➔
          </button>
        </div>
      </div>
    );
  }

  // 3. Main Admin Dashboard
  return (
    <div className="w-full min-h-screen bg-[#F0FDF4] px-4 pt-4 pb-24">
      <div className="w-full max-w-xl mx-auto space-y-4">

        {/* Top Header */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-[#D1FAE5] flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🦅</span>
              <div>
                <h1 className="text-xl font-black text-[#064E3B] tracking-tight">Admin Portal</h1>
                <p className="text-[10px] font-bold text-[#059669] uppercase">PHSS Pandallur</p>
              </div>
            </div>
          </div>

          {/* Class Switcher Pill */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="bg-[#ECFDF5] border-2 border-[#10B981] text-[#064E3B] text-xs font-black py-2 px-3 rounded-xl cursor-pointer focus:outline-none"
              >
                <option value="All">All Classes</option>
                {CLASSES.map(cls => (
                  <option key={cls} value={cls}>Class {cls}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setIsAuthenticated(false)}
              className="px-3 py-2 bg-[#FEE2E2] text-[#DC2626] font-bold text-xs rounded-xl hover:bg-red-200"
            >
              Exit
            </button>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="bg-white p-1.5 rounded-2xl border border-[#D1FAE5] grid grid-cols-4 gap-1 text-center shadow-sm">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'attendance'
                ? 'bg-[#047857] text-white shadow-sm'
                : 'text-[#64748B] hover:text-[#064E3B]'
            }`}
          >
            📋 Attendance
          </button>
          <button
            onClick={() => setActiveTab('planner')}
            className={`py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'planner'
                ? 'bg-[#047857] text-white shadow-sm'
                : 'text-[#64748B] hover:text-[#064E3B]'
            }`}
          >
            📖 Planner
          </button>
          <button
            onClick={() => setActiveTab('exams')}
            className={`py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'exams'
                ? 'bg-[#047857] text-white shadow-sm'
                : 'text-[#64748B] hover:text-[#064E3B]'
            }`}
          >
            🎯 Exams
          </button>
          <button
            onClick={() => setActiveTab('announcement')}
            className={`py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'announcement'
                ? 'bg-[#047857] text-white shadow-sm'
                : 'text-[#64748B] hover:text-[#064E3B]'
            }`}
          >
            📢 Message
          </button>
        </div>

        {/* TAB 1: ATTENDANCE & STUDENTS */}
        {activeTab === 'attendance' && (
          <div className="space-y-4">
            {/* Action Bar */}
            <div className="flex flex-wrap gap-2">
              <button onClick={exportToPDF} className="px-3 py-2 bg-[#047857] text-white font-bold text-xs rounded-xl shadow-sm">
                📄 Daily PDF
              </button>
              <button onClick={exportMonthlyPDF} className="px-3 py-2 bg-[#059669] text-white font-bold text-xs rounded-xl shadow-sm">
                📊 Monthly PDF
              </button>
              <button onClick={copyToppersToWhatsApp} className="px-3 py-2 bg-[#10B981] text-white font-bold text-xs rounded-xl shadow-sm">
                🏆 Top 5 WA
              </button>
              <button onClick={copyLateToWhatsApp} className="px-3 py-2 bg-amber-500 text-white font-bold text-xs rounded-xl shadow-sm">
                ⏰ Late List WA
              </button>
            </div>

            {/* Date Selector & Stats Counters */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white p-3 rounded-2xl border border-[#D1FAE5] shadow-sm flex flex-col justify-center">
                <span className="text-[10px] font-bold text-[#64748B] uppercase">Date</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-xs font-bold text-[#064E3B] text-center mt-1 border-0 bg-transparent focus:outline-none"
                />
              </div>
              <div className="bg-white p-3 rounded-2xl border border-[#D1FAE5] shadow-sm">
                <span className="text-[10px] font-bold text-[#059669] uppercase">Present</span>
                <span className="block text-2xl font-black text-[#047857] mt-0.5">{classAttendance.length}</span>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-[#D1FAE5] shadow-sm">
                <span className="text-[10px] font-bold text-[#DC2626] uppercase">Absent</span>
                <span className="block text-2xl font-black text-[#DC2626] mt-0.5">
                  {Math.max(0, classStudents.length - classAttendance.length)}
                </span>
              </div>
            </div>

            {/* Search Student Input */}
            <div className="bg-white p-2 rounded-2xl border border-[#D1FAE5] shadow-sm flex items-center gap-2">
              <span className="text-gray-400 pl-2">🔍</span>
              <input
                type="text"
                placeholder={`Search student in Class ${selectedClass}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs font-bold text-[#0F172A] p-1.5 focus:outline-none"
              />
            </div>

            {/* Student List with Profiles */}
            <div className="bg-white rounded-3xl p-4 border border-[#D1FAE5] shadow-sm">
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-[#D1FAE5]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#064E3B]">
                  Students ({classStudents.length}) • Tap to View Profile
                </h3>
                <span className="text-[10px] text-[#64748B] font-semibold">Class {selectedClass}</span>
              </div>

              {loading ? (
                <div className="py-8 text-center text-xs text-gray-400">Loading student data...</div>
              ) : filteredSearch.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">No students found</div>
              ) : (
                <div className="space-y-2 max-h-[380px] overflow-y-auto">
                  {filteredSearch.map((student) => {
                    const attRecord = classAttendance.find(a => a.student_id === student.id);
                    const isPresent = !!attRecord;

                    return (
                      <div
                        key={student.id}
                        onClick={() => openStudentProfile(student)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all hover:bg-[#F0FDF4] ${
                          isPresent ? 'border-[#A7F3D0] bg-[#F0FDF4]/50' : 'border-[#E2E8F0] bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isPresent ? 'bg-[#047857] text-white' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {isPresent ? '✓' : '—'}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[#0F172A]">{student.name}</p>
                            <p className="text-[10px] text-[#64748B]">Class {student.batch}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          {isPresent ? (
                            <div>
                              <span className="text-xs font-bold text-[#047857]">
                                {new Date(attRecord.checkin_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className="block text-[9px] font-semibold text-[#10B981]">
                                Rank #{attRecord.rank_today} • +{attRecord.points} pts
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-md">
                              Absent
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: STUDY PLANNER */}
        {activeTab === 'planner' && (
          <div className="space-y-4">
            {/* Create Task Form */}
            <div className="bg-white rounded-3xl p-5 border border-[#D1FAE5] shadow-sm">
              <h3 className="text-sm font-black text-[#064E3B] mb-1 flex items-center gap-1.5">
                <span>➕</span>
                <span>Assign Study Task for Class {selectedClass}</span>
              </h3>
              <p className="text-xs text-[#64748B] mb-4">Students will see this and mark it completed when studying</p>

              <form onSubmit={handleAddTask} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#064E3B] mb-1">Task Title / Chapter</label>
                  <input
                    type="text"
                    placeholder="e.g. Maths: Chapter 4 Circles - Ex 4.2 all problems"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D1FAE5] text-xs font-bold text-[#0F172A] focus:outline-none focus:border-[#047857]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#064E3B] mb-1">Subject</label>
                    <select
                      value={newTaskSubject}
                      onChange={(e) => setNewTaskSubject(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#D1FAE5] text-xs font-bold text-[#0F172A]"
                    >
                      {['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Social Science', 'English', 'Malayalam', 'Hindi'].map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#064E3B] mb-1">Target Class</label>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#D1FAE5] text-xs font-bold text-[#0F172A]"
                    >
                      <option value="All">All Classes</option>
                      {CLASSES.map(cls => (
                        <option key={cls} value={cls}>Class {cls}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#047857] text-white py-3 rounded-xl font-bold text-xs shadow-md hover:bg-[#064E3B] transition-all"
                >
                  Publish Task to Class {selectedClass} 📖
                </button>
              </form>
            </div>

            {/* Existing Tasks List */}
            <div className="bg-white rounded-3xl p-5 border border-[#D1FAE5] shadow-sm">
              <h3 className="text-xs font-bold uppercase text-[#064E3B] mb-3">Today's Assigned Tasks</h3>
              {tasks.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No tasks assigned for today yet</p>
              ) : (
                <div className="space-y-2">
                  {tasks.map(t => (
                    <div key={t.id} className="p-3 bg-[#F0FDF4] rounded-xl border border-[#D1FAE5] flex justify-between items-center">
                      <div>
                        <p className="text-xs font-bold text-[#0F172A]">{t.title}</p>
                        <span className="text-[10px] font-semibold text-[#047857]">
                          {t.subject} • For {t.target_batch === 'All' ? 'All Classes' : `Class ${t.target_batch}`}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteTask(t.id)}
                        className="p-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg font-bold"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: EXAM COUNTDOWN CREATOR */}
        {activeTab === 'exams' && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-5 border border-[#D1FAE5] shadow-sm">
              <h3 className="text-sm font-black text-[#064E3B] mb-1 flex items-center gap-1.5">
                <span>🎯</span>
                <span>Create Exam Reminder</span>
              </h3>
              <p className="text-xs text-[#64748B] mb-4">Students will see a live countdown clock on their screens</p>

              <form onSubmit={handleAddExam} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#064E3B] mb-1">Exam Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Physics Model Exam"
                    value={newExamName}
                    onChange={(e) => setNewExamName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D1FAE5] text-xs font-bold text-[#0F172A] focus:outline-none focus:border-[#047857]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#064E3B] mb-1">Exam Date</label>
                  <input
                    type="date"
                    value={newExamDate}
                    onChange={(e) => setNewExamDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D1FAE5] text-xs font-bold text-[#0F172A]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#047857] text-white py-3 rounded-xl font-bold text-xs shadow-md hover:bg-[#064E3B] transition-all"
                >
                  Add Exam Countdown 🎯
                </button>
              </form>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-[#D1FAE5] shadow-sm">
              <h3 className="text-xs font-bold uppercase text-[#064E3B] mb-3">Scheduled Exams</h3>
              {exams.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No custom exams added yet</p>
              ) : (
                <div className="space-y-2">
                  {exams.map(e => (
                    <div key={e.id} className="p-3 bg-[#F0FDF4] rounded-xl border border-[#D1FAE5] flex justify-between items-center">
                      <div>
                        <p className="text-xs font-bold text-[#0F172A]">{e.name}</p>
                        <p className="text-[10px] font-semibold text-[#047857]">{e.exam_date}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteExam(e.id)}
                        className="p-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg font-bold"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: ANNOUNCEMENT */}
        {activeTab === 'announcement' && (
          <div className="bg-white rounded-3xl p-5 border border-[#D1FAE5] shadow-sm space-y-4">
            <h3 className="text-sm font-black text-[#064E3B] flex items-center gap-1.5">
              <span>📢</span>
              <span>Post Custom Announcement to Students</span>
            </h3>
            <p className="text-xs text-[#64748B]">This message appears as a banner at the top of all student dashboards</p>

            <textarea
              rows={4}
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              placeholder="e.g. Special Physics revision class tomorrow at 6:30 AM! All students must join on time."
              className="w-full p-3.5 rounded-xl border border-[#D1FAE5] text-xs font-semibold text-[#0F172A] focus:outline-none focus:border-[#047857]"
            />

            <button
              onClick={handleSaveAnnouncement}
              className="w-full bg-gradient-to-r from-[#064E3B] to-[#059669] text-white py-3.5 rounded-xl font-bold text-xs shadow-md"
            >
              Publish Announcement to All Students 📢
            </button>
          </div>
        )}

        {/* STUDENT PROFILE MODAL WITH DONUT CHART */}
        {selectedStudent && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-pop">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#D1FAE5] max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex justify-between items-start mb-4 pb-3 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#064E3B] to-[#059669] flex items-center justify-center text-white text-xl font-black">
                    {selectedStudent.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#064E3B]">{selectedStudent.name}</h3>
                    <span className="text-[10px] font-bold text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded-md">
                      Class {selectedStudent.batch}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold hover:bg-gray-200"
                >
                  ✕
                </button>
              </div>

              {/* Donut Chart: Study & Attendance Tracking */}
              <div className="bg-[#F0FDF4] p-4 rounded-2xl border border-[#D1FAE5] mb-4 flex items-center justify-around">
                <DonutChart
                  percentage={studentCompletions.length > 0 ? Math.min(100, studentCompletions.length * 25) : 0}
                  label="Tasks"
                  size={110}
                  strokeWidth={11}
                  primaryColor="#059669"
                  trackColor="#D1FAE5"
                />
                <div className="text-right">
                  <p className="text-[10px] font-bold text-[#64748B] uppercase">Study Activity</p>
                  <p className="text-xl font-black text-[#064E3B]">{studentCompletions.length} Tasks Done</p>
                  <p className="text-[10px] font-semibold text-[#059669] mt-0.5">Tracked by Admin</p>
                </div>
              </div>

              {/* Attendance Details Today */}
              <div className="mb-4 p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                <p className="text-[10px] font-bold text-[#64748B] uppercase mb-1">Today's Check-in Record</p>
                {(() => {
                  const att = classAttendance.find(a => a.student_id === selectedStudent.id);
                  if (att) {
                    return (
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-[#047857]">Check-in Time:</span>
                        <span className="font-black text-[#0F172A]">
                          {new Date(att.checkin_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    );
                  }
                  return <p className="text-xs font-bold text-red-500">Not checked in today (Absent)</p>;
                })()}
              </div>

              {/* Completed Tasks History */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-[#064E3B] uppercase tracking-wider">Completed Tasks & Submission Times</p>
                {studentCompletions.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-2 text-center">No tasks completed yet</p>
                ) : (
                  studentCompletions.map((comp: any) => (
                    <div key={comp.id} className="p-2.5 bg-[#F0FDF4] rounded-lg border border-[#A7F3D0] text-xs">
                      <div className="flex justify-between font-bold text-[#0F172A]">
                        <span>{comp.study_tasks?.title || 'Study Task'}</span>
                        <span className="text-[#047857]">✓ Done</span>
                      </div>
                      <div className="text-[10px] text-[#64748B] mt-0.5">
                        Submitted: {new Date(comp.completed_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={() => setSelectedStudent(null)}
                className="w-full mt-5 bg-[#064E3B] text-white py-3 rounded-xl font-bold text-xs"
              >
                Close Profile
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Admin;
