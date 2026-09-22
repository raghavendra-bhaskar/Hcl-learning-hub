import { Zap } from 'lucide-react';
import { getLevelInfo, getNextLevel, LEVELS } from '../data/index.js';

export default function XPBar({ xp, showLevels = false }) {
  const levelInfo = getLevelInfo(xp);
  const nextLevel = getNextLevel(xp);
  const progress = nextLevel
    ? ((xp - levelInfo.minXP) / (nextLevel.minXP - levelInfo.minXP)) * 100
    : 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="text-xl">{levelInfo.icon}</span>
          <div>
            <span className="font-semibold text-white">Level {levelInfo.level}</span>
            <span className="text-slate-400 ml-2">{levelInfo.title}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-yellow-400 font-bold">
          <Zap size={14} />
          <span>{xp.toLocaleString()} XP</span>
          {nextLevel && <span className="text-slate-500 font-normal"> / {nextLevel.minXP.toLocaleString()}</span>}
        </div>
      </div>
      <div className="h-3 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-cyan-400 to-violet-400 rounded-full transition-all duration-700 progress-glow"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      {nextLevel && (
        <p className="text-xs text-slate-500">
          {(nextLevel.minXP - xp).toLocaleString()} XP until Level {nextLevel.level} — {nextLevel.title} {nextLevel.icon}
        </p>
      )}
      {showLevels && (
        <div className="grid grid-cols-7 gap-1 mt-4">
          {LEVELS.map(l => (
            <div
              key={l.level}
              className={`text-center p-2 rounded-lg border ${
                l.level === levelInfo.level
                  ? 'border-cyan-500/50 bg-cyan-500/10'
                  : xp >= l.minXP
                  ? 'border-violet-500/30 bg-violet-500/5'
                  : 'border-white/5 opacity-40'
              }`}
            >
              <div className="text-lg">{l.icon}</div>
              <div className="text-xs text-slate-400 mt-1">{l.level}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
