import React, { useState } from 'react';
import { supabase } from '../supabaseClient.ts';
import { Link } from 'react-router-dom';

interface SetupProps {
  onComplete: (id: string) => void;
}

const CLASSES = ['10A', '10B', '10C', '10D', '10E', '10F', '10G', '10H', '10I', '10J', '10K', '10L', '10M', '10N'];

const Setup: React.FC<SetupProps> = ({ onComplete }) => {
  const [name, setName] = useState('');
  const [batch, setBatch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !batch) {
      setError('Please enter your full name and select your class.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Register student
      const { data: student, error: studentError } = await supabase
        .from('students')
        .insert([{ name: name.trim().toUpperCase(), batch }])
        .select()
        .single();

      if (studentError) throw studentError;

      // 2. Initialize stats
      const { error: statsError } = await supabase
        .from('student_stats')
        .insert([{
          student_id: student.id,
          total_points: 0,
          current_streak: 0,
          best_streak: 0,
          medal_level: 'Seeker'
        }]);

      if (statsError) throw statsError;

      onComplete(student.id);
    } catch (err: any) {
      console.error("Setup Error:", err);
      setError(err.message || 'Connection issue. Please verify your internet and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F0FDF4] px-4 py-8 flex flex-col justify-center items-center">
      <div className="w-full max-w-md mx-auto">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-[#064E3B] to-[#059669] rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-emerald-900/20">
            <span className="text-4xl">🦅</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#064E3B] tracking-tight">SmartStudy</h1>
          <p className="text-xs font-bold text-[#059669] uppercase tracking-widest mt-1">
            PHSS Pandallur Edition
          </p>
          <p className="text-xs text-[#64748B] mt-2 font-medium">Daily Attendance & Study Motivation Platform</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-emerald-950/5 border border-[#D1FAE5]">
          <h2 className="text-xl font-bold text-[#064E3B] mb-1">Student Registration</h2>
          <p className="text-xs text-[#64748B] mb-6">Enter your details once to get started</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Student Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#064E3B] mb-2">
                Student Full Name
              </label>
              <input
                type="text"
                className="w-full px-4 py-3.5 rounded-xl border-2 border-[#D1FAE5] bg-[#F8FAFC] focus:bg-white focus:border-[#059669] focus:outline-none text-[#0F172A] font-bold text-base transition-all placeholder:text-[#94A3B8]"
                placeholder="e.g. MUHAMMED NIHAL"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>

            {/* Class & Division */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#064E3B] mb-2">
                Class & Division
              </label>
              <div className="relative">
                <select
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-[#D1FAE5] bg-[#F8FAFC] focus:bg-white focus:border-[#059669] focus:outline-none text-[#0F172A] font-bold text-base transition-all appearance-none cursor-pointer"
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                  disabled={loading}
                >
                  <option value="" disabled className="text-gray-400">Select your class (10A to 10N)</option>
                  {CLASSES.map((cls) => (
                    <option key={cls} value={cls} className="text-[#0F172A] py-1">
                      Class {cls}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#059669] font-bold text-xs">
                  ▼
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-[#FEE2E2] border border-[#EF4444]/30 rounded-xl text-xs font-bold text-[#DC2626] flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#064E3B] via-[#047857] to-[#059669] text-white font-extrabold py-4 rounded-xl shadow-lg shadow-emerald-900/20 active:scale-98 transition-all flex justify-center items-center text-base tracking-wide mt-6 disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Setting Up Profile...</span>
                </div>
              ) : (
                'Start Learning 🚀'
              )}
            </button>
          </form>

          {/* Quick link for Admin */}
          <div className="mt-6 pt-5 border-t border-[#E2E8F0] text-center">
            <Link to="/admin" className="text-xs font-bold text-[#047857] hover:underline flex items-center justify-center gap-1.5">
              <span>🛡️</span>
              <span>Teacher / Admin Login</span>
            </Link>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center text-xs font-semibold text-[#059669]/70">
          SmartStudy &copy; 2026 • PHSS Pandallur
        </div>
      </div>
    </div>
  );
};

export default Setup;
