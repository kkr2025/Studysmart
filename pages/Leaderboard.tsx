import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.ts';
import { LeaderboardEntry } from '../types.ts';
import { getFormattedDate } from '../logic/utils.ts';

const CLASSES = ['All', '10A', '10B', '10C', '10D', '10E', '10F', '10G', '10H', '10I', '10J', '10K', '10L', '10M', '10N'];

const Leaderboard: React.FC = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [selectedClass, setSelectedClass] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const today = getFormattedDate();
      const { data, error } = await supabase
        .from('attendance')
        .select('*, students(name, batch)')
        .eq('date', today)
        .order('rank_today', { ascending: true })
        .limit(50);

      if (error) throw error;
      setEntries(data || []);
    } catch (err: any) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = selectedClass === 'All'
    ? entries
    : entries.filter(e => e.students?.batch === selectedClass);

  return (
    <div className="w-full min-h-screen bg-[#F0FDF4] px-4 pt-4 pb-24">
      <div className="w-full max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="text-center pt-2 pb-1">
          <div className="inline-block p-3 bg-gradient-to-br from-[#064E3B] to-[#059669] rounded-2xl shadow-md text-white text-2xl mb-2">
            🏆
          </div>
          <h1 className="text-2xl font-black text-[#064E3B] tracking-tight">Today's Early Birds</h1>
          <p className="text-xs font-semibold text-[#059669] mt-0.5">Top Morning Achievers • PHSS Pandallur</p>
        </div>

        {/* Class Filter Bar */}
        <div className="bg-white p-2 rounded-2xl border border-[#D1FAE5] shadow-sm">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CLASSES.map((cls) => (
              <button
                key={cls}
                onClick={() => setSelectedClass(cls)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedClass === cls
                    ? 'bg-[#047857] text-white shadow-sm'
                    : 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#ECFDF5]'
                }`}
              >
                {cls === 'All' ? 'All Classes' : `Class ${cls}`}
              </button>
            ))}
          </div>
        </div>

        {/* Entries List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-4 border-[#047857] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-[#D1FAE5] shadow-sm">
            <div className="text-5xl mb-3">🌅</div>
            <p className="text-sm font-bold text-[#064E3B]">No Check-Ins Yet Today</p>
            <p className="text-xs text-[#64748B] mt-1">
              {selectedClass === 'All'
                ? 'Be the first student to log attendance at 3:00 AM!'
                : `No check-ins yet for Class ${selectedClass}`}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredEntries.map((entry, index) => {
              const isTop3 = index < 3;
              const medals = ['🥇', '🥈', '🥉'];

              return (
                <div
                  key={entry.id}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between shadow-sm ${
                    isTop3
                      ? 'bg-white border-[#10B981] shadow-emerald-950/5'
                      : 'bg-white border-[#E2E8F0]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 text-center flex-shrink-0">
                      {isTop3 ? (
                        <span className="text-3xl">{medals[index]}</span>
                      ) : (
                        <span className="text-base font-black text-[#64748B]">#{entry.rank_today}</span>
                      )}
                    </div>
                    <div>
                      <p className="font-black text-sm text-[#0F172A] truncate max-w-[170px]">
                        {entry.students?.name}
                      </p>
                      <span className="inline-block mt-0.5 text-[10px] font-bold text-[#047857] bg-[#ECFDF5] px-2 py-0.5 rounded-md border border-[#A7F3D0]">
                        Class {entry.students?.batch}
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-black text-[#064E3B] tabular-nums">
                      {new Date(entry.checkin_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-[10px] font-bold text-[#10B981]">+{entry.points} pts</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Motivational Banner */}
        <div className="bg-[#ECFDF5] rounded-2xl p-4 text-center border border-[#A7F3D0]">
          <p className="text-xs font-bold text-[#047857]">Rise and Shine! 🌅</p>
          <p className="text-[11px] text-[#064E3B] mt-0.5 italic">
            "The secret of getting ahead is getting started."
          </p>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
