import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.ts';
import { Exam } from '../types.ts';
import { getFormattedDate } from '../logic/utils.ts';

// Default upcoming SSLC dates (calculated relative to today or standard schedule)
const getInitialDefaultExams = (): Exam[] => {
  const now = new Date();
  const year = now.getFullYear();
  // If we are late in the year, board exams are in March next year
  const examYear = now.getMonth() >= 6 ? year + 1 : year;

  return [
    { id: 'def-1', name: 'SSLC Model Exam', exam_date: `${examYear}-01-15` },
    { id: 'def-2', name: 'First Language Exam', exam_date: `${examYear}-03-04` },
    { id: 'def-3', name: 'English Board Exam', exam_date: `${examYear}-03-08` },
    { id: 'def-4', name: 'Mathematics Board Exam', exam_date: `${examYear}-03-15` },
    { id: 'def-5', name: 'Physics Board Exam', exam_date: `${examYear}-03-18` },
    { id: 'def-6', name: 'Chemistry Board Exam', exam_date: `${examYear}-03-22` },
    { id: 'def-7', name: 'Biology Board Exam', exam_date: `${examYear}-03-26` },
    { id: 'def-8', name: 'Social Science Board Exam', exam_date: `${examYear}-03-29` },
  ];
};

export const ExamCountdown: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>(getInitialDefaultExams());
  const [showAll, setShowAll] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number; isToday?: boolean } | null>(null);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const today = getFormattedDate();
      let combinedExams: Exam[] = [];

      // 1. Check local storage first for instant display
      const localExamsRaw = localStorage.getItem('smartstudy_custom_exams');
      if (localExamsRaw) {
        try {
          const parsed = JSON.parse(localExamsRaw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            combinedExams = [...parsed];
          }
        } catch (e) {}
      }

      // 2. Query Supabase
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .order('exam_date', { ascending: true });

      if (!error && data && data.length > 0) {
        // Merge Supabase exams, avoiding duplicates
        const dbIds = new Set(data.map(d => d.id));
        const merged = [
          ...data,
          ...combinedExams.filter(ce => !dbIds.has(ce.id) && !data.some(d => d.name === ce.name && d.exam_date === ce.exam_date))
        ];
        combinedExams = merged;
      }

      // If no custom exams at all, use default schedule
      if (combinedExams.length === 0) {
        combinedExams = getInitialDefaultExams();
      }

      // Sort by date
      combinedExams.sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime());
      setExams(combinedExams);
    } catch (e) {
      console.warn('Error fetching exams:', e);
    }
  };

  const today = getFormattedDate();
  // Filter for exams today or in the future
  const upcomingExams = exams.filter(e => e.exam_date >= today);
  const nextExam = upcomingExams.length > 0 ? upcomingExams[0] : (exams.length > 0 ? exams[exams.length - 1] : null);

  // Real-time countdown calculation
  useEffect(() => {
    if (!nextExam) return;

    const calculateTimeLeft = () => {
      const examDateStr = nextExam.exam_date;
      const examTime = new Date(`${examDateStr}T09:30:00`).getTime();
      const now = new Date().getTime();
      const diff = examTime - now;

      if (examDateStr === today) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isToday: true });
        return;
      }

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isToday: false });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds, isToday: false });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [nextExam, today]);

  return (
    <div className="mb-6 rounded-3xl overflow-hidden border-2 border-[#D1FAE5] shadow-lg shadow-emerald-950/5 bg-white">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#064E3B] via-[#047857] to-[#059669] px-4 py-3.5 text-white flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl animate-pulse">🎯</span>
          <div>
            <p className="text-[10px] uppercase font-extrabold text-emerald-200 tracking-wider">Exam Countdown</p>
            <h3 className="text-sm sm:text-base font-black text-white truncate max-w-[200px]">
              {nextExam ? nextExam.name : 'Target Board Exam'}
            </h3>
          </div>
        </div>
        {nextExam && (
          <span className="text-xs bg-white/20 text-white px-2.5 py-1 rounded-full font-extrabold border border-white/20">
            {new Date(nextExam.exam_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>

      {/* Countdown Digits */}
      <div className="p-4 bg-gradient-to-b from-[#F0FDF4] to-white">
        {timeLeft?.isToday ? (
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl text-center mb-3">
            <span className="text-2xl">📝</span>
            <p className="text-sm font-black text-amber-900">TODAY IS EXAM DAY!</p>
            <p className="text-xs text-amber-700 font-bold">Give your 100% effort. Best of luck! 🌟</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 text-center mb-3">
            <div className="bg-white p-2.5 rounded-2xl border border-[#D1FAE5] shadow-sm">
              <span className="block text-2xl font-black text-[#064E3B]">{timeLeft ? timeLeft.days : '--'}</span>
              <span className="text-[9px] uppercase font-extrabold text-[#059669]">Days</span>
            </div>
            <div className="bg-white p-2.5 rounded-2xl border border-[#D1FAE5] shadow-sm">
              <span className="block text-2xl font-black text-[#064E3B]">{timeLeft ? timeLeft.hours : '--'}</span>
              <span className="text-[9px] uppercase font-extrabold text-[#059669]">Hours</span>
            </div>
            <div className="bg-white p-2.5 rounded-2xl border border-[#D1FAE5] shadow-sm">
              <span className="block text-2xl font-black text-[#064E3B]">{timeLeft ? timeLeft.minutes : '--'}</span>
              <span className="text-[9px] uppercase font-extrabold text-[#059669]">Mins</span>
            </div>
            <div className="bg-white p-2.5 rounded-2xl border border-[#D1FAE5] shadow-sm">
              <span className="block text-2xl font-black text-[#059669]">{timeLeft ? timeLeft.seconds : '--'}</span>
              <span className="text-[9px] uppercase font-extrabold text-[#059669]">Secs</span>
            </div>
          </div>
        )}

        {/* View All Exam Schedule Toggle */}
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full text-center text-xs font-bold text-[#047857] hover:text-[#064E3B] py-1 flex items-center justify-center gap-1"
        >
          <span>{showAll ? '▲ Hide Full Exam List' : `▼ View All Scheduled Exams (${upcomingExams.length})`}</span>
        </button>

        {showAll && (
          <div className="mt-3 pt-3 border-t border-[#D1FAE5] space-y-1.5 max-h-48 overflow-y-auto">
            {upcomingExams.map((ex, idx) => (
              <div key={ex.id || idx} className="flex justify-between items-center text-xs p-2 rounded-xl bg-white border border-[#D1FAE5]">
                <div className="flex items-center gap-2">
                  <span className="text-sm">📌</span>
                  <span className="font-bold text-[#0F172A]">{ex.name}</span>
                </div>
                <span className="text-[#047857] font-black text-[11px] bg-[#ECFDF5] px-2 py-0.5 rounded-md">
                  {new Date(ex.exam_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamCountdown;
