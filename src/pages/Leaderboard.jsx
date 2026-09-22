import { useNavigate } from 'react-router-dom';
import { Trophy, Zap, Medal, Map, ArrowLeft, Pencil } from 'lucide-react';
import { useAppStore } from '../App.jsx';
import { QUESTS } from '../data/index.js';
import Header from '../components/Header.jsx';
import XPBar from '../components/XPBar.jsx';
import AvatarDisplay from '../components/AvatarDisplay.jsx';

const RANK_COLORS = ['text-yellow-400', 'text-slate-300', 'text-amber-600'];
const RANK_BG = ['bg-yellow-500/10 border-yellow-500/20', 'bg-slate-500/10 border-slate-500/20', 'bg-amber-700/10 border-amber-700/20'];
const RANK_ICONS = ['🥇', '🥈', '🥉'];

export default function Leaderboard() {
  const navigate = useNavigate();
  const { leaderboard, playerName, totalXP, earnedBadges, completedQuests, levelInfo, avatar, resetProgress } = useAppStore();

  const completedCount = Object.keys(completedQuests).length;

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center gap-4 mb-10">
          <button onClick={() => navigate('/paths')} className="text-slate-500 hover:text-slate-300 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-orbitron text-4xl font-black bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              Leaderboard
            </h1>
            <p className="text-slate-400 text-sm mt-1">Team AI Quest Rankings</p>
          </div>
          <div className="ml-auto text-4xl animate-float">🏆</div>
        </div>

        {/* Player card */}
        {playerName && (
          <div className="glass-card rounded-2xl p-6 mb-8 border border-cyan-500/20 neon-blue">
            <div className="flex items-center gap-4 mb-5">
              {avatar
                ? <AvatarDisplay avatar={avatar} size="md" />
                : (
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-2xl font-bold shadow-lg">
                    {playerName[0]?.toUpperCase()}
                  </div>
                )
              }
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-xl text-white">{playerName}</h2>
                  <span className="text-lg">{levelInfo.icon}</span>
                  <button
                    onClick={() => navigate('/avatar')}
                    className="ml-1 p-1 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"
                    title="Edit Avatar"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
                <p className="text-sm text-slate-400">{levelInfo.title} · Level {levelInfo.level}</p>
              </div>
              <div className="ml-auto text-right">
                <div className="flex items-center gap-1 text-yellow-400 font-bold text-xl justify-end">
                  <Zap size={16} />
                  {totalXP.toLocaleString()}
                </div>
                <p className="text-xs text-slate-500">Total XP</p>
              </div>
            </div>

            <XPBar xp={totalXP} />

            <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-white/5">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{completedCount}</p>
                <p className="text-xs text-slate-500">Quests Done</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{earnedBadges.length}</p>
                <p className="text-xs text-slate-500">Badges</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{Math.round((completedCount / QUESTS.length) * 100)}%</p>
                <p className="text-xs text-slate-500">Completion</p>
              </div>
            </div>

            {earnedBadges.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="text-xs text-slate-500 mb-2">Earned Badges</p>
                <div className="flex gap-2 flex-wrap">
                  {earnedBadges.map(badge => (
                    <div
                      key={badge.name}
                      title={badge.name}
                      className={`w-10 h-10 rounded-xl bg-gradient-to-br ${badge.color} flex items-center justify-center text-lg shadow-md badge-earned`}
                    >
                      {badge.icon}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Leaderboard table */}
        <div className="glass-card rounded-2xl overflow-hidden border border-white/5">
          <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
            <Medal size={16} className="text-yellow-400" />
            <h2 className="font-semibold text-white">Team Rankings</h2>
          </div>
          <div className="divide-y divide-white/5">
            {leaderboard.map((member, idx) => (
              <div
                key={member.id}
                className={`flex items-center gap-4 px-6 py-4 transition-colors ${
                  member.isYou
                    ? 'bg-cyan-500/5 border-l-2 border-cyan-500'
                    : 'hover:bg-white/2'
                }`}
              >
                {/* Rank */}
                <div className="w-8 text-center shrink-0">
                  {idx < 3 ? (
                    <span className="text-xl">{RANK_ICONS[idx]}</span>
                  ) : (
                    <span className="text-slate-500 font-bold text-sm">#{idx + 1}</span>
                  )}
                </div>

                {/* Avatar */}
                <div className="shrink-0">
                  {member.avatarConfig
                    ? <AvatarDisplay avatar={member.avatarConfig} size="sm" />
                    : (
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                        member.isYou ? 'bg-gradient-to-br from-cyan-500 to-violet-500 shadow-lg' : 'bg-white/5'
                      }`}>
                        {member.name[0]}
                      </div>
                    )
                  }
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold truncate ${member.isYou ? 'text-cyan-300' : 'text-white'}`}>
                    {member.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500">{member.badges} badges</span>
                  </div>
                </div>

                {/* XP */}
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 text-yellow-400 font-bold justify-end">
                    <Zap size={13} />
                    {member.xp.toLocaleString()}
                  </div>
                  <p className="text-xs text-slate-500">XP</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <button
            onClick={() => navigate('/paths')}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-violet-500 rounded-xl font-semibold text-white hover:opacity-90 transition-all"
          >
            <Map size={16} />
            Go to Quests
          </button>
          <button
            onClick={() => {
              if (window.confirm('Reset all your progress? This cannot be undone.')) {
                resetProgress();
                navigate('/');
              }
            }}
            className="text-sm text-slate-600 hover:text-red-400 transition-colors"
          >
            Reset My Progress
          </button>
        </div>
      </div>
    </div>
  );
}
