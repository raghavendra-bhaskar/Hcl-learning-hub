import { Link, useLocation } from 'react-router-dom';
import { Trophy, Map, Home, Zap, UserCircle } from 'lucide-react';
import { useAppStore } from '../App.jsx';
import { getNextLevel } from '../data/index.js';
import AvatarDisplay from './AvatarDisplay.jsx';

export default function Header() {
  const store = useAppStore();
  const { totalXP, levelInfo, playerName, avatar } = store;
  const location = useLocation();
  const nextLevel = getNextLevel(totalXP);
  const progress = nextLevel
    ? ((totalXP - levelInfo.minXP) / (nextLevel.minXP - levelInfo.minXP)) * 100
    : 100;

  const navLinks = [
    { to: '/ai-quest', icon: Home, label: 'Home' },
    { to: '/paths', icon: Map, label: 'Quests' },
    { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
    { to: '/avatar', icon: UserCircle, label: 'Avatar' },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-cyan-500/10 bg-space-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link to="/ai-quest" className="flex items-center gap-2 shrink-0">
          <span className="text-2xl">🤖</span>
          <span className="font-orbitron font-bold text-lg bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent hidden sm:block">
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
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
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
                <span className="text-xs text-slate-400">{levelInfo.title}</span>
                <span className="flex items-center gap-0.5 text-xs font-bold text-yellow-400">
                  <Zap size={10} />
                  {totalXP.toLocaleString()} XP
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
          {playerName && (
            <Link to="/avatar" title="Edit Avatar">
              {avatar
                ? <AvatarDisplay avatar={avatar} size="xs" />
                : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-sm font-bold">
                    {playerName[0]?.toUpperCase()}
                  </div>
                )
              }
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
