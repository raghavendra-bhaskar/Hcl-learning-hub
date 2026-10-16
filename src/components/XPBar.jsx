import { Zap } from 'lucide-react';
import { useAppStore } from '../App.jsx';
import { getLevels, getLevelInfo, getNextLevel } from '../lib/courseLevels.js';

export default function XPBar({ xp, showLevels = false, course = { slug: 'ai-quest' } }) {
  const { theme } = useAppStore();
  const isLight = theme === 'light';
  const levels = getLevels(course);
  const levelInfo = getLevelInfo(xp, course);
  const nextLevel = getNextLevel(xp, course);
  const progress = nextLevel
    ? ((xp - levelInfo.minXP) / (nextLevel.minXP - levelInfo.minXP)) * 100
    : 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="text-xl">{levelInfo.icon}</span>
          <div>
            <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Level {levelInfo.level}</span>
            <span className={`ml-2 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{levelInfo.title}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-yellow-400 font-bold">
          <Zap size={14} />
          <span>{xp.toLocaleString()} XP</span>
          {nextLevel && <span className={`font-normal ${isLight ? 'text-slate-500' : 'text-slate-500'}`}> / {nextLevel.minXP.toLocaleString()}</span>}
        </div>
      </div>
      <div className="h-3 rounded-full overflow-hidden" style={{ background: isLight ? 'rgba(148,163,184,0.18)' : 'rgba(255,255,255,0.10)' }}>
        <div
          className="h-full bg-gradient-to-r from-cyan-400 to-violet-400 rounded-full transition-all duration-700 progress-glow"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      {nextLevel && (
        <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>
          {(nextLevel.minXP - xp).toLocaleString()} XP until Level {nextLevel.level} — {nextLevel.title} {nextLevel.icon}
        </p>
      )}
      {showLevels && (
        <div className="grid grid-cols-7 gap-1 mt-4">
          {levels.map(l => (
            <div
              key={l.level}
              className={`text-center p-2 rounded-lg border ${
                l.level === levelInfo.level
                  ? 'border-cyan-500/50 bg-cyan-500/10'
                  : xp >= l.minXP
                  ? 'border-violet-500/30 bg-violet-500/5'
                  : isLight ? 'border-slate-200 opacity-50' : 'border-white/5 opacity-40'
              }`}
            >
              <div className="text-lg">{l.icon}</div>
              <div className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{l.level}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
