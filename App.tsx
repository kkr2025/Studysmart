import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import Setup from './pages/Setup.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Leaderboard from './pages/Leaderboard.tsx';
import Admin from './pages/Admin.tsx';

const App: React.FC = () => {
  const [studentId, setStudentId] = useState<string | null>(localStorage.getItem('student_id'));

  useEffect(() => {
    const handleStorageChange = () => {
      const id = localStorage.getItem('student_id');
      if (id !== studentId) setStudentId(id);
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [studentId]);

  const Navigation = () => {
    const location = useLocation();
    const noNavRoutes = ['/setup'];
    if (noNavRoutes.includes(location.pathname)) return null;

    return (
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#D1FAE5] px-6 py-2.5 flex justify-around items-center z-50 shadow-lg max-w-md mx-auto">
        <Link
          to="/"
          className={`flex flex-col items-center transition-all ${
            location.pathname === '/' ? 'text-[#047857] scale-105 font-black' : 'text-[#94A3B8] hover:text-[#047857]'
          }`}
        >
          <span className="text-xl">☀️</span>
          <span className="text-[10px] uppercase mt-0.5 tracking-tight font-extrabold">Study</span>
        </Link>
        <Link
          to="/leaderboard"
          className={`flex flex-col items-center transition-all ${
            location.pathname === '/leaderboard' ? 'text-[#047857] scale-105 font-black' : 'text-[#94A3B8] hover:text-[#047857]'
          }`}
        >
          <span className="text-xl">🏆</span>
          <span className="text-[10px] uppercase mt-0.5 tracking-tight font-extrabold">Ranks</span>
        </Link>
        <Link
          to="/admin"
          className={`flex flex-col items-center transition-all ${
            location.pathname === '/admin' ? 'text-[#047857] scale-105 font-black' : 'text-[#94A3B8] hover:text-[#047857]'
          }`}
        >
          <span className="text-xl">🛡️</span>
          <span className="text-[10px] uppercase mt-0.5 tracking-tight font-extrabold">Admin</span>
        </Link>
      </nav>
    );
  };

  const Footer = () => {
    const location = useLocation();
    if (location.pathname === '/setup') return null;
    return (
      <footer className="mt-auto py-6 text-center border-t border-[#D1FAE5] px-4 max-w-md mx-auto w-full">
        <p className="text-[10px] font-black text-[#047857] uppercase tracking-[0.2em]">
          SmartStudy &copy; 2026
        </p>
        <p className="text-[9px] font-semibold text-[#64748B] mt-0.5 uppercase tracking-widest">
          PHSS Pandallur
        </p>
      </footer>
    );
  };

  return (
    <Router>
      <div className="min-h-screen bg-[#E6F7ED] flex flex-col justify-center items-center">
        {/* Mobile-first centered frame */}
        <div className="w-full max-w-md min-h-screen bg-[#F0FDF4] shadow-2xl shadow-emerald-950/10 overflow-x-hidden flex flex-col relative">
          <main className="flex-1 pb-20 relative">
            <Routes>
              <Route
                path="/setup"
                element={studentId ? <Navigate to="/" replace /> : <Setup onComplete={(id) => {
                  localStorage.setItem('student_id', id);
                  setStudentId(id);
                }} />}
              />
              <Route
                path="/"
                element={studentId ? <Dashboard studentId={studentId} /> : <Navigate to="/setup" replace />}
              />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
          <Navigation />
        </div>
      </div>
    </Router>
  );
};

export default App;
