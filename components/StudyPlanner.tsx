import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.ts';
import { WeeklyTimetableItem, TimetableCompletion } from '../types.ts';
import { getFormattedDate } from '../logic/utils.ts';
import DonutChart from './DonutChart.tsx';

interface StudyPlannerProps {
  studentId: string;
  studentBatch: string;
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Default high-yield timetable fallback if none configured in database yet
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

export const StudyPlanner: React.FC<StudyPlannerProps> = ({ studentId, studentBatch }) => {
  const [todayItems, setTodayItems] = useState<WeeklyTimetableItem[]>([]);
  const [completedItemIds, setCompletedItemIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const currentDayName = DAYS_OF_WEEK[now.getDay()]; // 'Sunday', 'Monday', etc.
  const todayDateStr = getFormattedDate();

  useEffect(() => {
    fetchTodaySchedule();
  }, [studentId, studentBatch]);

  const fetchTodaySchedule = async () => {
    try {
      setLoading(true);
      let scheduleItems: WeeklyTimetableItem[] = [];

      // 1. Fetch from local storage custom timetable
      const localTimetableRaw = localStorage.getItem('smartstudy_weekly_timetable');
      if (localTimetableRaw) {
        try {
          const parsed: WeeklyTimetableItem[] = JSON.parse(localTimetableRaw);
          const filtered = parsed.filter(
            item => item.day_of_week === currentDayName &&
                   (item.class_name === 'All' || item.class_name === studentBatch)
          );
          if (filtered.length > 0) {
            scheduleItems = filtered;
          }
        } catch (e) {}
      }

      // 2. Fetch from Supabase
      try {
        const { data, error } = await supabase
          .from('weekly_timetable')
          .select('*')
          .eq('day_of_week', currentDayName);

        if (!error && data && data.length > 0) {
          const classSpecific = data.filter(
            item => item.class_name === 'All' || item.class_name === studentBatch
          );
          if (classSpecific.length > 0) {
            scheduleItems = classSpecific;
          }
        }
      } catch (e) {}

      // 3. Fallback to high-yield default timetable for today if none set yet
      if (scheduleItems.length === 0) {
        scheduleItems = DEFAULT_TIMETABLE.filter(
          item => item.day_of_week === currentDayName &&
                 (item.class_name === 'All' || item.class_name === studentBatch)
        );
      }

      // Sort by slot number
      scheduleItems.sort((a, b) => (a.slot_number || 1) - (b.slot_number || 1));
      setTodayItems(scheduleItems);

      // 4. Fetch Completions for Today
      const completedSet = new Set<string>();

      // Check local storage completions for today
      const localCompRaw = localStorage.getItem(`smartstudy_comp_${studentId}_${todayDateStr}`);
      if (localCompRaw) {
        try {
          const parsed: string[] = JSON.parse(localCompRaw);
          parsed.forEach(id => completedSet.add(id));
        } catch (e) {}
      }

      // Check Supabase completions
      try {
        const { data: compData } = await supabase
          .from('timetable_completions')
          .select('item_id')
          .eq('student_id', studentId)
          .eq('completion_date', todayDateStr);

        if (compData) {
          compData.forEach((c: any) => completedSet.add(c.item_id));
        }
      } catch (e) {}

      setCompletedItemIds(completedSet);
    } catch (err) {
      console.error('Error fetching today timetable:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleComplete = async (item: WeeklyTimetableItem) => {
    const isCompleted = completedItemIds.has(item.id);
    const updated = new Set(completedItemIds);

    if (isCompleted) {
      updated.delete(item.id);
    } else {
      updated.add(item.id);
    }
    setCompletedItemIds(updated);

    // Persist to local storage
    localStorage.setItem(
      `smartstudy_comp_${studentId}_${todayDateStr}`,
      JSON.stringify(Array.from(updated))
    );

    // Sync to Supabase
    try {
      if (isCompleted) {
        await supabase
          .from('timetable_completions')
          .delete()
          .eq('item_id', item.id)
          .eq('student_id', studentId)
          .eq('completion_date', todayDateStr);
      } else {
        await supabase
          .from('timetable_completions')
          .insert([{
            item_id: item.id,
            student_id: studentId,
            subject: item.subject,
            completion_date: todayDateStr,
            completed_at: new Date().toISOString()
          }]);
      }
    } catch (e) {
      console.warn('Completion synced locally:', e);
    }
  };

  const totalSubjects = todayItems.length;
  const completedCount = todayItems.filter(item => completedItemIds.has(item.id)).length;
  const completionPercent = totalSubjects > 0 ? Math.round((completedCount / totalSubjects) * 100) : 0;

  const getSubjectIcon = (subject: string) => {
    const lower = subject.toLowerCase();
    if (lower.includes('math')) return '📐';
    if (lower.includes('phys')) return '⚡';
    if (lower.includes('chem')) return '🧪';
    if (lower.includes('bio')) return '🧬';
    if (lower.includes('eng')) return '📖';
    if (lower.includes('mal')) return '✍️';
    if (lower.includes('hin')) return '🗣️';
    if (lower.includes('soc')) return '🌍';
    return '📚';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-6 mb-6 text-center text-xs text-[#64748B] border border-[#D1FAE5]">
        Loading today's study schedule...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-5 mb-6 border-2 border-[#D1FAE5] shadow-lg shadow-emerald-950/5">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-[#D1FAE5]">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xl">📅</span>
            <h3 className="text-base font-black text-[#064E3B]">Today's Study Plan</h3>
          </div>
          <p className="text-[11px] font-bold text-[#059669]">
            {currentDayName} • Class {studentBatch}
          </p>
        </div>
        <span className="text-xs bg-[#ECFDF5] text-[#047857] px-3 py-1 rounded-full font-black border border-[#A7F3D0]">
          {completedCount} / {totalSubjects} Subjects
        </span>
      </div>

      {/* Donut Progress Card */}
      <div className="bg-gradient-to-r from-[#F0FDF4] to-[#ECFDF5] rounded-2xl p-4 mb-4 flex items-center justify-around border border-[#D1FAE5]">
        <DonutChart
          percentage={completionPercent}
          label="Done"
          size={110}
          strokeWidth={11}
          primaryColor="#047857"
          trackColor="#D1FAE5"
        />
        <div className="text-right">
          <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Today's Progress</p>
          <p className="text-2xl font-black text-[#064E3B]">
            {completedCount} <span className="text-sm font-bold text-[#059669]">/ {totalSubjects} Subjects</span>
          </p>
          <p className="text-xs font-bold text-[#047857] mt-1">
            {completionPercent === 100
              ? '🎉 Outstanding! All Done!'
              : `${totalSubjects - completedCount} subjects to complete`}
          </p>
        </div>
      </div>

      {/* Subjects Checklist */}
      <div className="space-y-2.5">
        {todayItems.map((item, index) => {
          const isDone = completedItemIds.has(item.id);
          const icon = getSubjectIcon(item.subject);

          return (
            <div
              key={item.id}
              onClick={() => toggleComplete(item)}
              className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between shadow-sm active:scale-98 ${
                isDone
                  ? 'bg-[#ECFDF5] border-[#10B981] text-[#064E3B]'
                  : 'bg-white border-[#E2E8F0] hover:border-[#10B981]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs transition-all ${
                    isDone
                      ? 'bg-[#047857] text-white shadow-sm scale-105'
                      : 'border-2 border-[#CBD5E1] bg-[#F8FAFC] text-transparent'
                  }`}
                >
                  ✓
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{icon}</span>
                    <span className="text-xs font-black text-[#064E3B] uppercase tracking-wide">
                      {item.subject}
                    </span>
                    <span className="text-[9px] font-bold text-[#64748B] bg-white px-1.5 py-0.5 rounded border border-[#E2E8F0]">
                      Slot {item.slot_number || index + 1}
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 font-bold ${isDone ? 'line-through text-[#047857]/70' : 'text-[#0F172A]'}`}>
                    {item.topic}
                  </p>
                </div>
              </div>

              <span
                className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg ${
                  isDone
                    ? 'bg-[#D1FAE5] text-[#064E3B] font-black'
                    : 'bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]'
                }`}
              >
                {isDone ? 'Done ✓' : 'Mark Done'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StudyPlanner;
