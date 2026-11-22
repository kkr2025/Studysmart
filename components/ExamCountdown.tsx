import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.ts';
import { Exam } from '../types.ts';
import { getFormattedDate } from '../logic/utils.ts';

// Default SSLC fallback exam schedule if none configured in database yet
const DEFAULT_EXAMS: Exam[] = [
  { id: '1', name: 'First Language', exam_date: '2026-03-05' },
  { id: '2', name: 'English', exam_date: '2026-03-09' },
  { id: '3', name: 'Malayalam 2', exam_date: '2026-03-11' },
  { id: '4', name: 'Hindi', exam_date: '2026-03-13' },
  { id: '5', name: 'Mathematics', exam_date: '2026-03-16' },
  { id: '6', name: 'Physics', exam_date: '2026-03-18' },
  { id: '7', name: 'Social Science', exam_date: '2026-03-23' },
  { id: '8', name: 'Chemistry', exam_date: '2026-03-25' },
  { id: '9', name: 'Biology', exam_date: '2026-03-30' },
];

export const ExamCountdown: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>(DEFAULT_EXAMS);
  const [showAll, setShowAll] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const today = getFormattedDate();
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .gte('exam_date', today)
        .order('exam_date', { ascending: true });

      if (!error && data && data.length > 0) {
        setExams(data);
      }
    } catch (e) {
      // Use fallback defaults
    }
  };

  const today = getFormattedDate();
  const upcomingExams = exams.filter(e => e.exam_date >= today);
  const nextExam = upcomingExams.length > 0 ? upcomingExams[0] : null;

  // Realtime countdown clock
  useEffect(() => {
    if (!nextExam) return;

    const calculateTimeLeft = () => {
      const examTime = new Date(`${nextExam.exam_date}T09:30:00`).getTime();
      const now = new Date().getTime();
      const diff = examTime - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [nextExam]);

  if (!nextExam) return null;

  return (
    <div className="mb-6 rounded-3xl overflow-hidden border border-[#D1FAE5] shadow-lg shadow-emerald-950/5 bg-white">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#064E3B] to-[#047857] px-5 py-4 text-white flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎯</span>
          <div>
            <p className="text-[10px] uppercase font-bold text-emerald-200 tracking-wider">Next Target Exam</p>
            <h3 className="text-base font-black text-white">{nextExam.name}</h3>
          </div>
        </div>
        <span className="text-xs bg-white/15 px-2.5 py-1 rounded-full font-bold">
          {new Date(nextExam.exam_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </span>
      </div>

      {/* Countdown Digits */}
      <div className="p-4 bg-gradient-to-b from-[#F0FDF4] to-white">
        <div className="grid grid-cols-4 gap-2 text-center mb-3">
          <div className="bg-white p-2.5 rounded-2xl border border-[#D1FAE5] shadow-sm">
            <span className="block text-2xl font-black text-[#064E3B]">{timeLeft ? timeLeft.days : '--'}</span>
            <span className="text-[9px] uppercase font-bold text-[#059669]">Days</span>
          </div>
          <div className="bg-white p-2.5 rounded-2xl border border-[#D1FAE5] shadow-sm">
            <span className="block text-2xl font-black text-[#064E3B]">{timeLeft ? timeLeft.hours : '--'}</span>
            <span className="text-[9px] uppercase font-bold text-[#059669]">Hours</span>
          </div>
          <div className="bg-white p-2.5 rounded-2xl border border-[#D1FAE5] shadow-sm">
            <span className="block text-2xl font-black text-[#064E3B]">{timeLeft ? timeLeft.minutes : '--'}</span>
            <span className="text-[9px] uppercase font-bold text-[#059669]">Mins</span>
          </div>
          <div className="bg-white p-2.5 rounded-2xl border border-[#D1FAE5] shadow-sm">
            <span className="block text-2xl font-black text-[#059669]">{timeLeft ? timeLeft.seconds : '--'}</span>
            <span className="text-[9px] uppercase font-bold text-[#059669]">Secs</span>
          </div>
        </div>

        {/* View All Toggle */}
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full text-center text-xs font-bold text-[#047857] hover:text-[#064E3B] py-1 flex items-center justify-center gap-1"
        >
          <span>{showAll ? '▲ Hide Full Schedule' : '▼ View Full Exam Schedule'}</span>
        </button>

        {showAll && (
          <div className="mt-3 pt-3 border-t border-[#D1FAE5] space-y-2">
            {upcomingExams.map((ex, idx) => (
              <div key={ex.id || idx} className="flex justify-between items-center text-xs px-2 py-1.5 rounded-lg hover:bg-emerald-50">
                <span className="font-bold text-[#0F172A]">{ex.name}</span>
                <span className="text-[#059669] font-semibold">
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
