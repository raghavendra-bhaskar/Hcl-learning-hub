import { useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Trophy, Zap, ChevronRight, Map, RotateCcw } from 'lucide-react';
import { useAppStore } from '../App.jsx';
import { getQuest, getPath } from '../data/index.js';
import Header from '../components/Header.jsx';
import { CertificationPanel, LabLaunchCard } from '../components/ExternalHandoff.jsx';
import { getCertification, getQuestLab } from '../data/externalLinks.js';

function Firework({ show }) {
  useEffect(() => {
    if (!show) return;
    let confetti;
    import('canvas-confetti').then(mod => {
      confetti = mod.default;
      confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 }, colors: ['#00d4ff', '#8b5cf6', '#10b981', '#fbbf24'] });
      setTimeout(() => confetti({ particleCount: 60, spread: 120, origin: { y: 0.4 } }), 300);
    });
  }, [show]);
  return null;
}

export default function Results() {
  const { questId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { completeQuest, completedQuests, totalXP, theme } = useAppStore();
  const isLight = theme === 'light';
  const savedRef = useRef(false);

  const quest = getQuest(questId);
  const path = quest ? getPath(quest.pathId) : null;
  const { answers = [], totalXPEarned = 0 } = location.state || {};

  const correctCount = answers.filter(a => a.correct).length;
  const totalQ = quest?.questions.length || 0;
  const pct = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;

  useEffect(() => {
    if (quest && !savedRef.current) {
      savedRef.current = true;
      completeQuest(questId, correctCount, totalXPEarned, quest.badge);
    }
  }, []);

  if (!quest) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-slate-400">Quest not found.</p>
    </div>
  );

  const isPerfect = correctCount === totalQ;
  const isGood = pct >= 67;

  const grade = isPerfect ? { label: 'Perfect Score!', icon: '🏆', color: 'from-yellow-400 to-orange-400' }
    : isGood ? { label: 'Well Done!', icon: '🎉', color: 'from-emerald-400 to-teal-400' }
    : { label: 'Keep Practicing!', icon: '💪', color: 'from-blue-400 to-violet-400' };

  return (
    <div className="min-h-screen" style={{ background: isLight ? 'linear-gradient(160deg, #f0f9ff 0%, #f8fafc 60%, #f5f0ff 100%)' : undefined }}>
      <Header />
      <Firework show={isGood} />
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Score card */}
        <div className="glass-card rounded-3xl p-8 mb-6 text-center border animate-scale-in" style={{ borderColor: isLight ? 'rgba(100,116,139,0.18)' : 'rgba(255,255,255,0.05)' }}>
          <div className="text-6xl mb-3">{grade.icon}</div>
          <h1 className={`font-orbitron text-3xl font-black mb-1 bg-clip-text text-transparent ${isLight ? 'bg-gradient-to-r from-cyan-700 to-violet-700' : 'bg-gradient-to-r from-cyan-400 to-violet-400'}`}>
            {grade.label}
          </h1>
          <p className={`mb-6 text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{quest.title} — {quest.subtitle}</p>

          <div className="relative w-36 h-36 mx-auto mb-6">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke={isLight ? 'rgba(100,116,139,0.12)' : 'rgba(255,255,255,0.05)'} strokeWidth="8" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke="url(#scoreGrad)" strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (1 - pct / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
              <defs>
                <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#00d4ff" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`font-orbitron text-3xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{pct}%</span>
              <span className="text-xs text-slate-400">{correctCount}/{totalQ}</span>
            </div>
          </div>

          <div className="flex justify-center gap-6">
            <div className="text-center">
              <div className="flex items-center gap-1 text-yellow-400 font-bold text-xl mb-0.5">
                <Zap size={16} />
                {totalXPEarned}
              </div>
              <p className="text-xs text-slate-500">XP Earned</p>
            </div>
            <div className={`w-px ${isLight ? 'bg-slate-200' : 'bg-white/10'}`} />
            <div className="text-center">
              <div className={`text-xl font-bold mb-0.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>{correctCount}</div>
              <p className="text-xs text-slate-500">Correct</p>
            </div>
            <div className={`w-px ${isLight ? 'bg-slate-200' : 'bg-white/10'}`} />
            <div className="text-center">
              <div className={`text-xl font-bold mb-0.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>{totalQ - correctCount}</div>
              <p className="text-xs text-slate-500">Missed</p>
            </div>
          </div>
        </div>

        {/* Badge earned */}
        <div className={`glass-card rounded-2xl p-5 mb-6 border ${isGood ? 'border-yellow-500/20 bg-yellow-500/5' : 'border-white/5'} flex items-center gap-4 animate-slide-up`}>
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${quest.badge.color} flex items-center justify-center text-2xl shadow-lg ${isGood ? 'badge-earned' : 'opacity-50 grayscale'}`}>
            {quest.badge.icon}
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">{isGood ? 'Badge Unlocked!' : 'Badge — Score 67%+ to unlock'}</p>
            <p className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>{quest.badge.name}</p>
            <p className="text-xs text-slate-400">{quest.title}</p>
          </div>
          {isGood && (
            <div className="ml-auto">
              <Trophy size={20} className="text-yellow-400" />
            </div>
          )}
        </div>

        {/* Question review */}
        <div className="glass-card rounded-2xl p-6 mb-6 border animate-slide-up" style={{ borderColor: isLight ? 'rgba(100,116,139,0.18)' : 'rgba(255,255,255,0.05)' }}>
          <h2 className={`font-semibold mb-4 ${isLight ? 'text-slate-900' : 'text-white'}`}>Question Review</h2>
          <div className="space-y-4">
            {quest.questions.map((q, i) => {
              const answer = answers.find(a => a.questionId === q.id);
              const wasCorrect = answer?.correct;
              return (
                <div key={q.id} className={`rounded-xl p-4 border ${wasCorrect ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                  <div className="flex items-start gap-2 mb-2">
                    <span className={`text-sm font-bold shrink-0 ${wasCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                      {wasCorrect ? '✓' : '✗'}
                    </span>
                    <p className={`text-sm font-medium leading-snug ${isLight ? 'text-slate-900' : 'text-white'}`}>{q.question}</p>
                  </div>
                  {!wasCorrect && (
                    <div className="ml-4">
                      <p className="text-xs text-slate-500 mb-1">Correct: <span className="text-emerald-400">{q.options[q.correct]}</span></p>
                      <p className="text-xs text-slate-400 leading-relaxed">{q.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Next steps — hands-on lab + formal certification in CNAPP */}
        {(getQuestLab(questId) || getCertification('ai-quest')) && (
          <div className="mb-6 space-y-3 animate-slide-up">
            <p className="text-[10px] font-black tracking-widest uppercase text-slate-500">Next Steps</p>
            {getQuestLab(questId) && <LabLaunchCard lab={getQuestLab(questId)} accent="cyan" />}
            {isGood && <CertificationPanel certification={getCertification('ai-quest')} moduleAccent="cyan" />}
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => navigate(`/quiz/${questId}`)}
            className={`flex flex-col items-center gap-2 py-4 glass-card rounded-xl border transition-all text-sm ${isLight ? 'text-slate-700 border-slate-200 hover:border-slate-300' : 'text-slate-300 border-white/5 hover:border-white/10'}`}
          >
            <RotateCcw size={18} />
            Replay
          </button>
          <button
            onClick={() => navigate('/paths')}
            className={`flex flex-col items-center gap-2 py-4 glass-card rounded-xl border transition-all text-sm ${isLight ? 'text-slate-700 border-slate-200 hover:border-slate-300' : 'text-slate-300 border-white/5 hover:border-white/10'}`}
          >
            <Map size={18} />
            All Quests
          </button>
          <button
            onClick={() => navigate('/leaderboard')}
            className="flex flex-col items-center gap-2 py-4 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl border border-yellow-500/20 hover:border-yellow-500/40 transition-all text-sm text-yellow-300"
          >
            <Trophy size={18} />
            Leaderboard
          </button>
        </div>
      </div>
    </div>
  );
}
