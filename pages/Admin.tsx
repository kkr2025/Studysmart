import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient.ts';
import { getFormattedDate } from '../logic/utils.ts';
import { generateAttendancePDF, generateMonthlyPDF } from '../logic/pdfGenerator.ts';
import DonutChart from '../components/DonutChart.tsx';
import { Exam, WeeklyTimetableItem } from '../types.ts';

const ADMIN_PASSWORD = 'tracker2026';
const CLASSES = ['10A', '10B', '10C', '10D', '10E', '10F', '10G', '10H', '10I', '10J', '10K', '10L', '10M', '10N'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const DEFAULT_TIMETABLE: WeeklyTimetableItem[] = [
  // Monday
  { id: 'def-m1', day_of_week: 'Monday', class_name: 'All', slot_number: 1, subject: 'Mathematics', topic: 'Circles & Geometry Practice' },
  { id: 'def-m2', day_of_week: 'Monday', class_name: 'All', slot_number: 2, subject: 'Physics', topic: 'Reflection & Refraction of Light' },
  { id: 'def-m3', day_of_week: 'Monday', class_name: 'All', slot_number: 3, subject: 'English', topic: 'Grammar & Reading Comprehension' },
  // Tuesday
  { id: 'def-t1', day_of_week: 'Tuesday', class_name: 'All', slot_number: 1, subject: 'Chemistry', topic: 'Periodic Classification & Chemical Reactions' },
  { id: 'def-t2', day_of_week: 'Tuesday', class_name: 'All', slot_number: 2, subject: 'Biology', topic: 'Life Processes & Heredity' },
  { id: 'def-t3', day_of_week: 'Tuesday', class_name: 'All', slot_number: 3, subject: 'Malayalam', topic: 'Literature & Prose Analysis' },
  // Wednesday
  { id: 'def-w1', day_of_week: 'Wednesday', class_name: 'All', slot_number: 1, subject: 'Mathematics', topic: 'Trigonometry & Quadratic Equations' },
  { id: 'def-w2', day_of_week: 'Wednesday', class_name: 'All', slot_number: 2, subject: 'Social Science', topic: 'Indian National Movement' },
  { id: 'def-w3', day_of_week: 'Wednesday', class_name: 'All', slot_number: 3, subject: 'Hindi', topic: 'Grammar & Composition' },
  // Thursday
  { id: 'def-th1', day_of_week: 'Thursday', class_name: 'All', slot_number: 1, subject: 'Physics', topic: 'Electricity & Magnetic Effects' },
  { id: 'def-th2', day_of_week: 'Thursday', class_name: 'All', slot_number: 2, subject: 'Chemistry', topic: 'Carbon and its Compounds' },
  { id: 'def-th3', day_of_week: 'Thursday', class_name: 'All', slot_number: 3, subject: 'Mathematics', topic: 'Arithmetic Progressions' },
  // Friday
  { id: 'def-f1', day_of_week: 'Friday', class_name: 'All', slot_number: 1, subject: 'Biology', topic: 'Control & Coordination' },
  { id: 'def-f2', day_of_week: 'Friday', class_name: 'All', slot_number: 2, subject: 'Social Science', topic: 'Resources and Development' },
  { id: 'def-f3', day_of_week: 'Friday', class_name: 'All', slot_number: 3, subject: 'English', topic: 'Writing Skills & Letter Writing' },
  // Saturday
  { id: 'def-s1', day_of_week: 'Saturday', class_name: 'All', slot_number: 1, subject: 'Mathematics', topic: 'Model Paper Solving' },
  { id: 'def-s2', day_of_week: 'Saturday', class_name: 'All', slot_number: 2, subject: 'Science (PCB)', topic: 'Combined Science Questions Revision' },
  // Sunday
  { id: 'def-su1', day_of_week: 'Sunday', class_name: 'All', slot_number: 1, subject: 'Weekly Revision', topic: 'Review Mistakes & Formula Practice' },
  { id: 'def-su2', day_of_week: 'Sunday', class_name: 'All', slot_number: 2, subject: 'Model Test', topic: 'Self Assessment Speed Test' },
];

const Admin: React.FC = () => {
  // Authentication & Class Gate
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [hasSelectedClass, setHasSelectedClass] = useState(false);
  const [selectedClass, setSelectedClass] = useState('10A');

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'attendance' | 'planner' | 'exams' | 'announcement' | 'data'>('attendance');

  // Core Data
  const [selectedDate, setSelectedDate] = useState(getFormattedDate());
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [allAttendance, setAllAttendance] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Student Profile Modal State
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [studentCompletions, setStudentCompletions] = useState<any[]>([]);

  // Announcement State
  const [announcementText, setAnnouncementText] = useState('');

  // Weekly Timetable / Study Planner State
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [timetable, setTimetable] = useState<WeeklyTimetableItem[]>([]);
  const [newSlotNumber, setNewSlotNumber] = useState(1);
  const [newSubject, setNewSubject] = useState('Mathematics');
  const [newTopic, setNewTopic] = useState('');

  // Exam Countdown State
  const [exams, setExams] = useState<Exam[]>([]);
  const [newExamName, setNewExamName] = useState('');
  const [newExamDate, setNewExamDate] = useState('');

  // Data Reset State
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);

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
      if (!sErr && students) {
        setAllStudents(students);
      }

      // 2. Fetch Attendance for Selected Date
      const { data: attData } = await supabase
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

      if (attData) {
        setAllAttendance(attData);
      }

      // 3. Fetch Announcement
      const { data: annData } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (annData?.message) {
        setAnnouncementText(annData.message);
      } else {
        const localMsg = localStorage.getItem('smartstudy_custom_message');
        if (localMsg) setAnnouncementText(localMsg);
      }

      // 4. Load Weekly Timetable (Combine Supabase + LocalStorage + Defaults)
      let combinedTimetable: WeeklyTimetableItem[] = [];
      const localTimetable = localStorage.getItem('smartstudy_weekly_timetable');
      if (localTimetable) {
        try {
          combinedTimetable = JSON.parse(localTimetable);
        } catch (e) {}
      }

      const { data: ttData } = await supabase.from('weekly_timetable').select('*');
      if (ttData && ttData.length > 0) {
        const dbIds = new Set(ttData.map(d => d.id));
        combinedTimetable = [
          ...ttData,
          ...combinedTimetable.filter(ct => !dbIds.has(ct.id))
        ];
      }

      if (combinedTimetable.length === 0) {
        combinedTimetable = DEFAULT_TIMETABLE;
        localStorage.setItem('smartstudy_weekly_timetable', JSON.stringify(DEFAULT_TIMETABLE));
      }

      setTimetable(combinedTimetable);

      // 5. Load Exams (Combine Supabase + LocalStorage)
      let combinedExams: Exam[] = [];
      const localExamsRaw = localStorage.getItem('smartstudy_custom_exams');
      if (localExamsRaw) {
        try {
          combinedExams = JSON.parse(localExamsRaw);
        } catch (e) {}
      }

      const { data: examData } = await supabase
        .from('exams')
        .select('*')
        .order('exam_date', { ascending: true });

      if (examData && examData.length > 0) {
        const dbIds = new Set(examData.map(d => d.id));
        combinedExams = [
          ...examData,
          ...combinedExams.filter(ce => !dbIds.has(ce.id))
        ];
      }

      setExams(combinedExams);

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

  // Timetable items for currently selected day & class
  const dayTimetableItems = useMemo(() => {
    return timetable.filter(
      item => item.day_of_week === selectedDay &&
             (item.class_name === 'All' || item.class_name === selectedClass)
    ).sort((a, b) => (a.slot_number || 1) - (b.slot_number || 1));
  }, [timetable, selectedDay, selectedClass]);

  // Save Announcement
  const handleSaveAnnouncement = async () => {
    if (!announcementText.trim()) return;
    localStorage.setItem('smartstudy_custom_message', announcementText.trim());

    try {
      await supabase.from('announcements').insert([{ message: announcementText.trim() }]);
    } catch (e) {}

    alert('✅ Announcement broadcasted! All student dashboards will display this message. 📢');
  };

  // Add Subject to Weekly Timetable
  const handleAddTimetableSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim()) {
      alert('Please enter a topic or chapter description.');
      return;
    }

    const newItem: WeeklyTimetableItem = {
      id: 'tt-' + Date.now(),
      day_of_week: selectedDay,
      class_name: selectedClass,
      slot_number: Number(newSlotNumber) || (dayTimetableItems.length + 1),
      subject: newSubject,
      topic: newTopic.trim(),
    };

    const updated = [...timetable, newItem];
    setTimetable(updated);
    localStorage.setItem('smartstudy_weekly_timetable', JSON.stringify(updated));

    try {
      await supabase.from('weekly_timetable').insert([newItem]);
    } catch (e) {}

    setNewTopic('');
    setNewSlotNumber(dayTimetableItems.length + 2);
    alert(`✅ Added ${newSubject} to ${selectedDay}'s timetable for Class ${selectedClass}!`);
  };

  // Delete Timetable Item
  const handleDeleteTimetableItem = async (itemId: string) => {
    const updated = timetable.filter(t => t.id !== itemId);
    setTimetable(updated);
    localStorage.setItem('smartstudy_weekly_timetable', JSON.stringify(updated));

    try {
      await supabase.from('weekly_timetable').delete().eq('id', itemId);
    } catch (e) {}
  };

  // Add Exam
  const handleAddExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamName.trim() || !newExamDate) {
      alert('Please enter both exam name and date.');
      return;
    }

    const newExamObj: Exam = {
      id: 'exam-' + Date.now(),
      name: newExamName.trim(),
      exam_date: newExamDate,
    };

    // Update state immediately
    const updated = [...exams, newExamObj];
    setExams(updated);

    // Save to local storage for guaranteed persistence
    localStorage.setItem('smartstudy_custom_exams', JSON.stringify(updated));

    // Also attempt Supabase insert
    try {
      const { data, error } = await supabase.from('exams').insert([{
        name: newExamObj.name,
        exam_date: newExamObj.exam_date,
      }]).select().single();

      if (!error && data) {
        // Replace temporary ID with Supabase UUID
        setExams(prev => prev.map(ex => ex.id === newExamObj.id ? data : ex));
      }
    } catch (err: any) {
      console.warn('Synced exam locally:', err);
    }

    setNewExamName('');
    setNewExamDate('');
    alert(`✅ Exam "${newExamObj.name}" created successfully! The countdown is now LIVE on all student screens. 🎯`);
  };

  // Delete Exam
  const handleDeleteExam = async (examId: string) => {
    const updated = exams.filter(e => e.id !== examId);
    setExams(updated);
    localStorage.setItem('smartstudy_custom_exams', JSON.stringify(updated));

    try {
      await supabase.from('exams').delete().eq('id', examId);
    } catch (e) {}
  };

  // Open Student Profile Modal
  const openStudentProfile = async (student: any) => {
    setSelectedStudent(student);
    const todayDateStr = getFormattedDate();

    // Load student completions
    let completionsList: any[] = [];

    // Local storage check
    const localCompRaw = localStorage.getItem(`smartstudy_comp_${student.id}_${todayDateStr}`);
    if (localCompRaw) {
      try {
        const itemIds: string[] = JSON.parse(localCompRaw);
        completionsList = itemIds.map(id => {
          const item = timetable.find(t => t.id === id);
          return {
            id,
            subject: item?.subject || 'Study Subject',
            topic: item?.topic || 'Completed',
            completed_at: new Date().toISOString(),
          };
        });
      } catch (e) {}
    }

    // Supabase check
    try {
      const { data } = await supabase
        .from('timetable_completions')
        .select('*')
        .eq('student_id', student.id)
        .eq('completion_date', todayDateStr);

      if (data && data.length > 0) {
        completionsList = data;
      }
    } catch (e) {}

    setStudentCompletions(completionsList);
  };

  const copyToppersToWhatsApp = () => {
    const toppers = classAttendance.slice(0, 5);
    if (toppers.length === 0) return alert('No attendance records yet for this class.');

    let text = `*🦅 SMARTSTUDY | TOP EARLY RISERS (${selectedDate})*\n*PHSS Pandallur - Class ${selectedClass}*\n\n`;
    toppers.forEach((item, index) => {
      const time = new Date(item.checkin_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      text += `${index + 1}. *${item.students?.name}* - ${time} (Class ${item.students?.batch})\n`;
    });
    text += `\nKeep rising! 🔥📚`;

    navigator.clipboard.writeText(text);
    alert('Top 5 copied to clipboard!');
  };

  const copyLateToWhatsApp = () => {
    if (lateStudents.length === 0) return alert('Perfect attendance in this class today! ✨');

    let text = `*⚠️ SMARTSTUDY | PENDING ATTENDANCE (${selectedDate})*\n*PHSS Pandallur - Class ${selectedClass}*\n\n`;
    text += `The following students have not logged morning attendance yet:\n\n`;
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

  // 1. Reset Today's Attendance (for selected class or all classes)
  const handleResetTodayAttendance = async () => {
    const scopeName = selectedClass === 'All' ? 'ALL classes' : `Class ${selectedClass}`;
    if (!window.confirm(`⚠️ RESET TODAY'S ATTENDANCE (${selectedDate})\n\nAre you sure you want to delete today's attendance records for ${scopeName}?\n\nStudents will be marked absent and can re-check in.`)) {
      return;
    }

    setResetting(true);
    try {
      if (selectedClass === 'All') {
        const { error } = await supabase
          .from('attendance')
          .delete()
          .eq('date', selectedDate);
        if (error) throw error;
      } else {
        const studentIds = classStudents.map(s => s.id);
        if (studentIds.length > 0) {
          const { error } = await supabase
            .from('attendance')
            .delete()
            .eq('date', selectedDate)
            .in('student_id', studentIds);
          if (error) throw error;
        }
      }

      // Also remove today's study task completions for this class/day
      try {
        const studentIds = classStudents.map(s => s.id);
        if (studentIds.length > 0) {
          await supabase
            .from('timetable_completions')
            .delete()
            .eq('completion_date', selectedDate)
            .in('student_id', studentIds);
        }
      } catch (e) {}

      alert(`✅ Attendance for ${selectedDate} (${scopeName}) has been reset successfully!`);
      setShowResetModal(false);
      fetchData();
    } catch (err: any) {
      console.error('Reset Today Error:', err);
      alert('Failed to reset attendance: ' + err.message);
    } finally {
      setResetting(false);
    }
  };

  // 2. Reset All Attendance & Points (Keep Student Accounts)
  const handleResetAllAttendance = async () => {
    if (!window.confirm('⚠️ RESET ALL ATTENDANCE & LEADERBOARD SCORES\n\nAre you sure? This will:\n- Delete ALL attendance records across all dates\n- Reset all student points, streaks and ranks to 0\n- Delete all study task completion logs\n- KEEP all registered students in the system\n\nThis cannot be undone!')) {
      return;
    }

    setResetting(true);
    try {
      // Delete attendance
      const { error: attErr } = await supabase
        .from('attendance')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (attErr) throw attErr;

      // Reset student stats
      try {
        await supabase
          .from('student_stats')
          .update({ total_points: 0, current_streak: 0, best_streak: 0, last_checkin_date: null, medal_level: 'None' })
          .neq('student_id', '00000000-0000-0000-0000-000000000000');
      } catch (e) {
        await supabase.from('student_stats').delete().neq('student_id', '00000000-0000-0000-0000-000000000000');
      }

      // Delete task completions
      try {
        await supabase.from('timetable_completions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      } catch (e) {}

      localStorage.removeItem('smartstudy_local_completions');

      alert('✅ All attendance records and leaderboard stats have been reset to 0!');
      setShowResetModal(false);
      fetchData();
    } catch (err: any) {
      console.error('Reset All Attendance Error:', err);
      alert('Failed to reset data: ' + err.message);
    } finally {
      setResetting(false);
    }
  };

  // 3. Factory Reset (Danger Zone)
  const handleFactoryReset = async () => {
    if (!window.confirm('🚨 DANGER ZONE - COMPLETE FACTORY RESET 🚨\n\nThis will permanently delete:\n- All registered students\n- All attendance history\n- All student stats & ranks\n- All study completions\n\nAre you absolutely sure?')) {
      return;
    }

    const confirmText = window.prompt('To confirm, type "DELETE" below:');
    if (confirmText !== 'DELETE') {
      alert('Reset cancelled. You must type "DELETE" exactly.');
      return;
    }

    setResetting(true);
    try {
      try {
        await supabase.from('timetable_completions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      } catch (e) {}

      const { error: attErr } = await supabase.from('attendance').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (attErr) console.warn('Attendance delete:', attErr);

      const { error: statErr } = await supabase.from('student_stats').delete().neq('student_id', '00000000-0000-0000-0000-000000000000');
      if (statErr) console.warn('Stats delete:', statErr);

      const { error: stuErr } = await supabase.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (stuErr) throw stuErr;

      localStorage.removeItem('smartstudy_local_completions');

      alert('✅ All data has been successfully reset. Application will now refresh.');
      setShowResetModal(false);
      window.location.reload();
    } catch (err: any) {
      console.error('Factory Reset Error:', err);
      alert('Failed to reset: ' + err.message);
    } finally {
      setResetting(false);
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

  // 2. Class Selection Gate
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

  // ─── BACKUP FUNCTIONS ────────────────────────────────────────────────────
  // Full Backup: exports all data as a JSON file download
  const handleFullBackup = async () => {
    setResetting(true);
    try {
      const { data: students } = await supabase.from('students').select('*');
      const { data: attendance } = await supabase.from('attendance').select('*');
      const { data: stats } = await supabase.from('student_stats').select('*');
      const { data: examsDb } = await supabase.from('exams').select('*');
      const { data: timetable } = await supabase.from('weekly_timetable').select('*');
      const { data: completions } = await supabase.from('timetable_completions').select('*');
      const { data: announcements } = await supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(50);

      const backup = {
        backup_created_at: new Date().toISOString(),
        school: 'PHSS Pandallur',
        app: 'SmartStudy',
        version: '2.0',
        data: {
          students: students || [],
          attendance: attendance || [],
          student_stats: stats || [],
          exams: examsDb || [],
          weekly_timetable: timetable || [],
          timetable_completions: completions || [],
          announcements: announcements || [],
        },
        summary: {
          total_students: (students || []).length,
          total_attendance_records: (attendance || []).length,
          total_exams: (examsDb || []).length,
        }
      };

      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `SmartStudy_Backup_PHSS_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert(`✅ Backup downloaded!\n📁 SmartStudy_Backup_PHSS_${dateStr}.json\n\n📊 Summary:\n• ${(students || []).length} students\n• ${(attendance || []).length} attendance records\n• ${(examsDb || []).length} exams`);
    } catch (err: any) {
      console.error('Backup Error:', err);
      alert('Backup failed: ' + err.message);
    } finally {
      setResetting(false);
    }
  };

  // CSV Backup: exports attendance as CSV spreadsheet
  const handleCSVBackup = async () => {
    setResetting(true);
    try {
      const { data: attData } = await supabase
        .from('attendance')
        .select(`
          date,
          checkin_time,
          points,
          rank_today,
          students ( name, batch )
        `)
        .order('date', { ascending: false });

      if (!attData || attData.length === 0) {
        alert('No attendance data to export yet.');
        setResetting(false);
        return;
      }

      const headers = ['Date', 'Student Name', 'Class', 'Check-in Time', 'Rank', 'Points'];
      const rows = attData.map((r: any) => [
        r.date,
        r.students?.name || 'Unknown',
        r.students?.batch || '-',
        r.checkin_time ? new Date(r.checkin_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-',
        r.rank_today || '-',
        r.points || 0,
      ]);

      const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `SmartStudy_Attendance_${dateStr}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert(`✅ CSV exported!\n📊 ${attData.length} attendance records downloaded as spreadsheet.`);
    } catch (err: any) {
      console.error('CSV Export Error:', err);
      alert('CSV export failed: ' + err.message);
    } finally {
      setResetting(false);
    }
  };

  // Students CSV export
  const handleStudentsCSVExport = async () => {
    setResetting(true);
    try {
      const { data: studentsData } = await supabase
        .from('students')
        .select(`*, student_stats ( total_points, current_streak, best_streak, medal_level )`)
        .order('batch', { ascending: true });

      if (!studentsData || studentsData.length === 0) {
        alert('No student data to export.');
        setResetting(false);
        return;
      }

      const headers = ['Name', 'Class', 'Total Points', 'Current Streak', 'Best Streak', 'Medal', 'Registered On'];
      const rows = studentsData.map((s: any) => [
        s.name,
        s.batch,
        s.student_stats?.total_points || 0,
        s.student_stats?.current_streak || 0,
        s.student_stats?.best_streak || 0,
        s.student_stats?.medal_level || 'None',
        s.created_at ? new Date(s.created_at).toLocaleDateString('en-GB') : '-',
      ]);

      const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `SmartStudy_Students_${dateStr}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert(`✅ Students list exported!\n👥 ${studentsData.length} students downloaded.`);
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    } finally {
      setResetting(false);
    }
  };

  // ─── IMPORT / RESTORE from JSON Backup ──────────────────────────────────
  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      alert('⚠️ Please select a SmartStudy JSON backup file (.json).');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const backup = JSON.parse(evt.target?.result as string);
        if (!backup?.data || !backup?.app) {
          alert('❌ Invalid backup file. Please use a SmartStudy backup JSON.');
          return;
        }

        const summary = backup.summary || {};
        const confirmed = window.confirm(
          `📦 RESTORE BACKUP\n\nBackup from: ${backup.backup_created_at ? new Date(backup.backup_created_at).toLocaleString() : 'Unknown'}\n\n📊 Contains:\n• ${backup.data.students?.length || 0} students\n• ${backup.data.attendance?.length || 0} attendance records\n• ${backup.data.exams?.length || 0} exams\n• ${backup.data.weekly_timetable?.length || 0} timetable entries\n\n⚠️ This will ADD data from backup on top of existing data (no overwrite).\n\nProceed with restore?`
        );

        if (!confirmed) return;

        setResetting(true);
        let restored = 0;
        let errors = 0;

        // Restore students (upsert by id)
        if (backup.data.students?.length > 0) {
          const { error } = await supabase.from('students').upsert(
            backup.data.students.map((s: any) => ({ id: s.id, name: s.name, batch: s.batch, created_at: s.created_at })),
            { onConflict: 'id' }
          );
          if (!error) restored += backup.data.students.length;
          else errors++;
        }

        // Restore attendance
        if (backup.data.attendance?.length > 0) {
          const chunks = [];
          for (let i = 0; i < backup.data.attendance.length; i += 50) {
            chunks.push(backup.data.attendance.slice(i, i + 50));
          }
          for (const chunk of chunks) {
            const { error } = await supabase.from('attendance').upsert(
              chunk.map((a: any) => ({ id: a.id, student_id: a.student_id, date: a.date, checkin_time: a.checkin_time, points: a.points, rank_today: a.rank_today })),
              { onConflict: 'id' }
            );
            if (!error) restored += chunk.length;
            else errors++;
          }
        }

        // Restore exams
        if (backup.data.exams?.length > 0) {
          const { error } = await supabase.from('exams').upsert(
            backup.data.exams.map((ex: any) => ({ id: ex.id, name: ex.name, exam_date: ex.exam_date })),
            { onConflict: 'id' }
          );
          if (!error) restored += backup.data.exams.length;
          else errors++;
        }

        // Restore timetable
        if (backup.data.weekly_timetable?.length > 0) {
          const { error } = await supabase.from('weekly_timetable').upsert(
            backup.data.weekly_timetable.map((t: any) => ({ id: t.id, day_of_week: t.day_of_week, class_name: t.class_name, slot_number: t.slot_number, subject: t.subject, topic: t.topic })),
            { onConflict: 'id' }
          );
          if (!error) restored += backup.data.weekly_timetable.length;
          else errors++;
        }

        setResetting(false);

        if (errors === 0) {
          alert(`✅ Restore Complete!\n\n${restored} records successfully restored from backup.\n\nRefreshing data...`);
        } else {
          alert(`⚠️ Restore completed with some issues.\n${restored} records restored, ${errors} tables had errors.\nSome data may already exist (that's OK).`);
        }

        fetchData();
      } catch (err: any) {
        setResetting(false);
        alert('❌ Restore failed: Invalid or corrupted backup file.\n' + err.message);
      }
    };

    reader.readAsText(file);
    // Reset the input so the same file can be selected again
    e.target.value = '';
  };

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

          {/* Class Switcher */}
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

        {/* Navigation Tabs */}
        <div className="bg-white p-1.5 rounded-2xl border border-[#D1FAE5] grid grid-cols-5 gap-1 text-center shadow-sm">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'attendance'
                ? 'bg-[#047857] text-white shadow-sm'
                : 'text-[#64748B] hover:text-[#064E3B]'
            }`}
          >
            📋 Attend
          </button>
          <button
            onClick={() => setActiveTab('planner')}
            className={`py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'planner'
                ? 'bg-[#047857] text-white shadow-sm'
                : 'text-[#64748B] hover:text-[#064E3B]'
            }`}
          >
            📅 Plan
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
            📢 Msg
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'data'
                ? 'bg-[#DC2626] text-white shadow-sm'
                : 'text-[#DC2626] hover:bg-red-50'
            }`}
          >
            🗄️ Data
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

        {/* TAB 2: WEEKLY STUDY TIMETABLE & MULTI-SUBJECT PLANNER */}
        {activeTab === 'planner' && (
          <div className="space-y-4">
            {/* Day Selector Bar */}
            <div className="bg-white p-2 rounded-2xl border border-[#D1FAE5] shadow-sm">
              <label className="block text-[10px] font-extrabold uppercase text-[#064E3B] px-1 mb-1.5">
                Select Day to Manage Timetable:
              </label>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {DAYS.map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      selectedDay === day
                        ? 'bg-[#047857] text-white shadow-sm'
                        : 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#ECFDF5]'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            {/* Add Subject to Selected Day Form */}
            <div className="bg-white rounded-3xl p-5 border border-[#D1FAE5] shadow-sm">
              <h3 className="text-sm font-black text-[#064E3B] mb-1 flex items-center gap-1.5">
                <span>➕</span>
                <span>Add Study Subject for {selectedDay} (Class {selectedClass})</span>
              </h3>
              <p className="text-xs text-[#64748B] mb-4">
                Students will automatically see {selectedDay}'s subjects on their dashboard
              </p>

              <form onSubmit={handleAddTimetableSubject} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#064E3B] mb-1">Subject</label>
                    <select
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-[#D1FAE5] text-xs font-bold text-[#0F172A]"
                    >
                      {['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Social Science', 'English', 'Malayalam', 'Hindi', 'Special Revision'].map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#064E3B] mb-1">Slot / Period</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={newSlotNumber}
                      onChange={(e) => setNewSlotNumber(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl border border-[#D1FAE5] text-xs font-bold text-[#0F172A]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#064E3B] mb-1">Chapter / Topics to Study</label>
                  <input
                    type="text"
                    placeholder="e.g. Chapter 4: Circles - Ex 4.2 all problems"
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D1FAE5] text-xs font-bold text-[#0F172A] focus:outline-none focus:border-[#047857]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#047857] text-white py-3 rounded-xl font-bold text-xs shadow-md hover:bg-[#064E3B] transition-all"
                >
                  Save Subject to {selectedDay}'s Timetable 📖
                </button>
              </form>
            </div>

            {/* List of Subjects for Selected Day */}
            <div className="bg-white rounded-3xl p-5 border border-[#D1FAE5] shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold uppercase text-[#064E3B]">
                  {selectedDay}'s Scheduled Subjects ({dayTimetableItems.length})
                </h3>
                <span className="text-[10px] font-bold text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded">
                  Class {selectedClass}
                </span>
              </div>

              {dayTimetableItems.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No subjects set for {selectedDay} yet</p>
              ) : (
                <div className="space-y-2">
                  {dayTimetableItems.map((item, idx) => (
                    <div key={item.id || idx} className="p-3 bg-[#F0FDF4] rounded-xl border border-[#D1FAE5] flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase text-[#047857] bg-white px-2 py-0.5 rounded border border-[#D1FAE5]">
                            Slot {item.slot_number || idx + 1}
                          </span>
                          <span className="text-xs font-black text-[#0F172A]">{item.subject}</span>
                        </div>
                        <p className="text-xs text-[#064E3B] font-semibold mt-1">{item.topic}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteTimetableItem(item.id)}
                        className="p-2 text-xs text-red-500 hover:bg-red-50 rounded-lg font-bold"
                        title="Delete slot"
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

        {/* TAB 3: EXAM COUNTDOWN CREATOR (Fixed & Live) */}
        {activeTab === 'exams' && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-5 border border-[#D1FAE5] shadow-sm">
              <h3 className="text-sm font-black text-[#064E3B] mb-1 flex items-center gap-1.5">
                <span>🎯</span>
                <span>Create Exam Reminder</span>
              </h3>
              <p className="text-xs text-[#64748B] mb-4">
                Students will immediately see a live countdown clock ticking on their dashboard!
              </p>

              <form onSubmit={handleAddExam} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#064E3B] mb-1">Exam Name</label>
                  <input
                    type="text"
                    placeholder="e.g. SSLC Physics Model Exam"
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
                  className="w-full bg-[#047857] text-white py-3.5 rounded-xl font-bold text-xs shadow-md hover:bg-[#064E3B] transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Add Exam Countdown 🎯</span>
                </button>
              </form>
            </div>

            {/* Scheduled Exams List */}
            <div className="bg-white rounded-3xl p-5 border border-[#D1FAE5] shadow-sm">
              <h3 className="text-xs font-bold uppercase text-[#064E3B] mb-3">
                Scheduled Exams ({exams.length})
              </h3>
              {exams.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No custom exams added yet</p>
              ) : (
                <div className="space-y-2">
                  {exams.map(e => (
                    <div key={e.id} className="p-3 bg-[#F0FDF4] rounded-xl border border-[#D1FAE5] flex justify-between items-center">
                      <div>
                        <p className="text-xs font-bold text-[#0F172A]">{e.name}</p>
                        <p className="text-[11px] font-extrabold text-[#047857]">
                          📅 {new Date(e.exam_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteExam(e.id)}
                        className="p-2 text-xs text-red-500 hover:bg-red-50 rounded-lg font-bold"
                        title="Delete exam"
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

        {/* TAB 5: DATA MANAGEMENT (Backup & Reset) */}
        {activeTab === 'data' && (
          <div className="space-y-4">

            {/* Backup Section */}
            <div className="bg-white rounded-3xl p-5 border border-[#D1FAE5] shadow-sm space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-[#D1FAE5]">
                <span className="text-xl">💾</span>
                <div>
                  <h3 className="text-sm font-black text-[#064E3B]">Backup & Export Data</h3>
                  <p className="text-[10px] text-[#64748B]">Download your data before making any changes</p>
                </div>
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={handleFullBackup}
                  disabled={resetting}
                  className="w-full flex items-center justify-between px-4 py-3.5 bg-[#ECFDF5] border-2 border-[#10B981] rounded-2xl hover:bg-[#D1FAE5] transition-all disabled:opacity-50"
                >
                  <div className="text-left">
                    <p className="text-xs font-black text-[#064E3B]">🗃️ Full Database Backup</p>
                    <p className="text-[10px] text-[#059669] font-semibold">Students, Attendance, Exams, Timetable, Announcements</p>
                  </div>
                  <span className="text-[10px] font-black text-[#047857] bg-white px-2 py-1 rounded-lg border border-[#D1FAE5]">JSON</span>
                </button>

                <button
                  onClick={handleCSVBackup}
                  disabled={resetting}
                  className="w-full flex items-center justify-between px-4 py-3.5 bg-[#ECFDF5] border-2 border-[#10B981] rounded-2xl hover:bg-[#D1FAE5] transition-all disabled:opacity-50"
                >
                  <div className="text-left">
                    <p className="text-xs font-black text-[#064E3B]">📊 Attendance Log Export</p>
                    <p className="text-[10px] text-[#059669] font-semibold">All check-in records with times, ranks & points</p>
                  </div>
                  <span className="text-[10px] font-black text-[#047857] bg-white px-2 py-1 rounded-lg border border-[#D1FAE5]">CSV</span>
                </button>

                <button
                  onClick={handleStudentsCSVExport}
                  disabled={resetting}
                  className="w-full flex items-center justify-between px-4 py-3.5 bg-[#ECFDF5] border-2 border-[#10B981] rounded-2xl hover:bg-[#D1FAE5] transition-all disabled:opacity-50"
                >
                  <div className="text-left">
                    <p className="text-xs font-black text-[#064E3B]">👥 Student List with Stats</p>
                    <p className="text-[10px] text-[#059669] font-semibold">Names, classes, points, streaks and medals</p>
                  </div>
                  <span className="text-[10px] font-black text-[#047857] bg-white px-2 py-1 rounded-lg border border-[#D1FAE5]">CSV</span>
                </button>
              </div>

              {resetting && (
                <div className="flex items-center gap-2 text-xs text-[#059669] font-bold pt-1">
                  <div className="w-4 h-4 border-2 border-[#059669] border-t-transparent rounded-full animate-spin" />
                  Processing...
                </div>
              )}
            </div>

            {/* Import / Restore Section */}
            <div className="bg-white rounded-3xl p-5 border border-blue-100 shadow-sm space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-blue-100">
                <span className="text-xl">📥</span>
                <div>
                  <h3 className="text-sm font-black text-blue-700">Import / Restore from Backup</h3>
                  <p className="text-[10px] text-blue-500">Select a SmartStudy JSON backup file to restore</p>
                </div>
              </div>

              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl">
                <p className="text-xs font-black text-blue-700 mb-1">📂 Restore from JSON Backup</p>
                <p className="text-[10px] text-blue-500 font-semibold mb-3">
                  Merges backup data with existing database (safe – no overwrites of current data)
                </p>
                <label className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl text-xs font-bold cursor-pointer transition-all border-2 border-dashed border-blue-400 text-blue-700 hover:bg-blue-100 ${resetting ? 'opacity-50 pointer-events-none' : ''}`}>
                  <span>📁 Choose Backup File (.json)</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportBackup}
                    className="hidden"
                    disabled={resetting}
                  />
                </label>
              </div>

              <div className="p-3 bg-blue-50 rounded-xl text-[10px] text-blue-600 font-semibold">
                💡 <strong>How it works:</strong> Students and records from the backup are added using upsert — existing matching records are skipped, so no data is lost.
              </div>
            </div>

            {/* Reset Section */}
            <div className="bg-white rounded-3xl p-5 border border-red-100 shadow-sm space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-red-100">
                <span className="text-xl">⚠️</span>
                <div>
                  <h3 className="text-sm font-black text-red-600">Reset Data</h3>
                  <p className="text-[10px] text-red-400">Always backup first before resetting!</p>
                </div>
              </div>

              <div className="space-y-2.5">
                {/* Reset Today */}
                <div className="p-3.5 bg-orange-50 border border-orange-200 rounded-2xl">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-xs font-black text-orange-700">🔄 Reset Today's Attendance</p>
                      <p className="text-[10px] text-orange-500 font-semibold mt-0.5">
                        Clear {selectedDate} records for Class {selectedClass}
                      </p>
                    </div>
                    <span className="text-[9px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded">Safe</span>
                  </div>
                  <button
                    onClick={handleResetTodayAttendance}
                    disabled={resetting}
                    className="w-full py-2 bg-orange-500 text-white text-xs font-bold rounded-xl hover:bg-orange-600 transition-all disabled:opacity-50"
                  >
                    Reset Today ({selectedDate})
                  </button>
                </div>

                {/* Reset All Attendance */}
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-xs font-black text-red-700">🗑️ Reset All Attendance & Scores</p>
                      <p className="text-[10px] text-red-500 font-semibold mt-0.5">
                        Clear all records but keep student accounts
                      </p>
                    </div>
                    <span className="text-[9px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">Careful</span>
                  </div>
                  <button
                    onClick={handleResetAllAttendance}
                    disabled={resetting}
                    className="w-full py-2 bg-red-500 text-white text-xs font-bold rounded-xl hover:bg-red-600 transition-all disabled:opacity-50"
                  >
                    Reset All Attendance & Leaderboard
                  </button>
                </div>

                {/* Factory Reset */}
                <div className="p-3.5 bg-red-50 border-2 border-red-400 rounded-2xl">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-xs font-black text-red-800">🚨 Factory Reset</p>
                      <p className="text-[10px] text-red-600 font-semibold mt-0.5">
                        Delete ALL students + ALL data permanently
                      </p>
                    </div>
                    <span className="text-[9px] font-bold text-white bg-red-600 px-2 py-0.5 rounded">DANGER</span>
                  </div>
                  <button
                    onClick={handleFactoryReset}
                    disabled={resetting}
                    className="w-full py-2 bg-red-700 text-white text-xs font-bold rounded-xl hover:bg-red-800 transition-all disabled:opacity-50"
                  >
                    🚨 Complete Factory Reset
                  </button>
                </div>
              </div>
            </div>

            {/* Info box */}
            <div className="bg-[#FFFBEB] rounded-2xl p-4 border border-amber-200 text-xs text-amber-800">
              <p className="font-black mb-1.5">💡 Admin Data Guide</p>
              <div className="space-y-1 font-semibold leading-relaxed">
                <p>📊 <strong>CSV exports</strong> open in Excel / Google Sheets — share with management.</p>
                <p>🗃️ <strong>JSON backup</strong> saves everything — use before any reset.</p>
                <p>📥 <strong>Import</strong> restores from JSON backup safely (no data loss).</p>
                <p>🔄 <strong>Reset Today</strong> is safe — students can re-check in.</p>
                <p>🚨 <strong>Factory Reset</strong> is permanent — always backup first!</p>
              </div>
            </div>
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
                  percentage={dayTimetableItems.length > 0 ? Math.round((studentCompletions.length / dayTimetableItems.length) * 100) : 0}
                  label="Completed"
                  size={110}
                  strokeWidth={11}
                  primaryColor="#059669"
                  trackColor="#D1FAE5"
                />
                <div className="text-right">
                  <p className="text-[10px] font-bold text-[#64748B] uppercase">Study Activity</p>
                  <p className="text-xl font-black text-[#064E3B]">
                    {studentCompletions.length} / {dayTimetableItems.length} Subjects
                  </p>
                  <p className="text-[10px] font-semibold text-[#059669] mt-0.5">Today's Timetable</p>
                </div>
              </div>

              {/* Attendance Details Today */}
              <div className="mb-4 p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                <p className="text-[10px] font-bold text-[#64748B] uppercase mb-1">Morning Attendance</p>
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

              {/* Completed Tasks History with Submitted Times */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-[#064E3B] uppercase tracking-wider">Subjects Completed Today & Submitted Time</p>
                {studentCompletions.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-2 text-center">No subjects marked complete yet today</p>
                ) : (
                  studentCompletions.map((comp: any) => (
                    <div key={comp.id} className="p-2.5 bg-[#F0FDF4] rounded-lg border border-[#A7F3D0] text-xs">
                      <div className="flex justify-between font-bold text-[#0F172A]">
                        <span>{comp.subject || comp.study_tasks?.title || 'Subject Task'}</span>
                        <span className="text-[#047857]">✓ Done</span>
                      </div>
                      <div className="text-[10px] text-[#64748B] mt-0.5">
                        Submitted: {new Date(comp.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
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
