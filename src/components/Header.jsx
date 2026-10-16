import { Link, useLocation } from 'react-router-dom';
import { Map, Home, Zap } from 'lucide-react';
import { useAppStore } from '../App.jsx';
import { getNextLevel } from '../data/index.js';

export default function Header() {
  const store = useAppStore();
  const { aiQuestXP, levelInfo, theme } = store;
  const isLight = theme === 'light';
  const location = useLocation();
  const nextLevel = getNextLevel(aiQuestXP);
  const progress = nextLevel
    ? ((aiQuestXP - levelInfo.minXP) / (nextLevel.minXP - levelInfo.minXP)) * 100
    : 100;

  const navLinks = [
    { to: '/courses', icon: Home, label: 'Course Hub' },
    { to: '/paths', icon: Map, label: 'Quests' },
  ];

  return (
    <header className="sticky top-0 z-50 border-b backdrop-blur-xl" style={{ background: isLight ? 'rgba(248,250,252,0.96)' : 'rgba(7,15,28,0.80)', borderColor: isLight ? 'rgba(100,116,139,0.18)' : 'rgba(6,182,212,0.1)' }}>
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link to="/ai-quest" className="flex items-center gap-2 shrink-0">
          <span className="text-2xl">🤖</span>
          <span className={`font-orbitron font-bold text-lg bg-clip-text text-transparent hidden sm:block ${isLight ? 'bg-gradient-to-r from-cyan-700 to-violet-700' : 'bg-gradient-to-r from-cyan-400 to-violet-400'}`}>
            AI Quest
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {navLinks.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                location.pathname === to
                  ? (isLight ? 'bg-cyan-700/12 text-cyan-700 border border-cyan-700/30' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30')
                  : isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Icon size={15} />
              <span className="hidden sm:block">{label}</span>
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">{levelInfo.icon}</span>
            <div className="hidden md:block">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={`text-xs ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>{levelInfo.title}</span>
                <span className="flex items-center gap-0.5 text-xs font-bold text-yellow-400">
                  <Zap size={10} />
                  {aiQuestXP.toLocaleString()} XP
                </span>
              </div>
              <div className="w-28 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-violet-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
