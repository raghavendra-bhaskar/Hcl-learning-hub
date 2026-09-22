import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, Clock, CheckCircle, Play, BookOpen } from 'lucide-react';
import { useAppStore } from '../App.jsx';
import { getQuest, getPath } from '../data/index.js';
import Header from '../components/Header.jsx';
import QuestBrief from '../components/QuestBrief.jsx';
import { LabLaunchCard } from '../components/ExternalHandoff.jsx';
import { getQuestLab } from '../data/externalLinks.js';

export default function QuestDetail() {
  const { questId } = useParams();
  const navigate = useNavigate();
  const { completedQuests } = useAppStore();
  const [showBrief, setShowBrief] = useState(false);

  const quest = getQuest(questId);
  const path = quest ? getPath(quest.pathId) : null;
  const completed = completedQuests[questId];

  if (!quest) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-4">🔍</p>
          <p className="text-slate-400">Quest not found</p>
          <button onClick={() => navigate('/paths')} className="mt-4 text-cyan-400 hover:underline">Back to Paths</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-10">
        <button
          onClick={() => navigate('/paths')}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-200 mb-8 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Learning Paths
        </button>

        {/* Quest header */}
        <div className="glass-card rounded-3xl p-8 mb-6 border border-white/5">
          <div className="flex items-start gap-5 mb-6">
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${path?.gradient || 'from-cyan-500 to-blue-600'} flex items-center justify-center text-4xl shadow-xl shrink-0`}>
              {quest.icon}
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">{quest.subtitle}</p>
              <h1 className="font-orbitron text-3xl font-bold text-white mb-2">{quest.title}</h1>
              <p className="text-slate-400 leading-relaxed">{quest.description}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 py-5 border-y border-white/5">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-sm">Difficulty</span>
              <span className={`font-semibold text-sm ${quest.difficultyColor}`}>{quest.difficulty}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-slate-500" />
              <span className="text-sm text-slate-300">{quest.timeEstimate}</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-yellow-400" />
              <span className="text-sm text-yellow-400 font-semibold">{quest.xp} XP</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-sm">Questions</span>
              <span className="text-sm text-slate-300">{quest.questions.length}</span>
            </div>
          </div>

          {/* Badge */}
          <div className="mt-5 flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${quest.badge.color} flex items-center justify-center text-2xl shadow-lg`}>
              {quest.badge.icon}
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Completion Reward</p>
              <p className="font-semibold text-white">{quest.badge.name} Badge</p>
              <p className="text-xs text-slate-400">Earn by completing all questions</p>
            </div>
            {completed && (
              <div className="ml-auto flex items-center gap-2 text-emerald-400">
                <CheckCircle size={20} />
                <span className="font-semibold text-sm">Earned!</span>
              </div>
            )}
          </div>
        </div>

        {/* What you will learn */}
        <div className="glass-card rounded-2xl p-6 mb-6 border border-white/5">
          <h2 className="font-semibold text-white mb-4">What You Will Learn</h2>
          <div className="space-y-3">
            {quest.questions.map((q, i) => (
              <div key={q.id} className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                  completed
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/5 text-slate-400 border border-white/10'
                }`}>
                  {i + 1}
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">{q.question}</p>
              </div>
            ))}
          </div>
        </div>

        {getQuestLab(questId) && (
          <div className="mb-6">
            <LabLaunchCard lab={getQuestLab(questId)} accent="cyan" />
          </div>
        )}

        {completed && (
          <div className="glass-card rounded-2xl p-5 mb-6 border border-emerald-500/20 bg-emerald-500/5">
            <div className="flex items-center gap-3">
              <CheckCircle size={24} className="text-emerald-400" />
              <div>
                <p className="font-semibold text-emerald-300">Quest Completed!</p>
                <p className="text-sm text-slate-400">
                  Score: {completed.score}/{quest.questions.length} · {completed.xpEarned} XP earned
                </p>
              </div>
            </div>
          </div>
        )}

        {!completed ? (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate(`/solution/${questId}`)}
              className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-cyan-500 to-violet-500 rounded-2xl font-bold text-lg text-white hover:opacity-90 transition-all active:scale-98 shadow-lg shadow-cyan-500/20"
            >
              <Play size={20} />
              Start Learning
            </button>
            <button
              onClick={() => setShowBrief(true)}
              className="flex items-center justify-center gap-2 py-3 glass-card rounded-2xl font-medium text-slate-300 border border-white/10 hover:border-cyan-500/30 hover:text-white transition-all text-sm"
            >
              <BookOpen size={15} className="text-cyan-400" />
              View Story Brief (NPC Dialog)
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate(`/solution/${questId}`)}
              className="flex items-center justify-center gap-2 py-4 glass-card rounded-2xl font-bold text-white border border-cyan-500/20 hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all"
            >
              <BookOpen size={18} className="text-cyan-400" />
              Learn Again
            </button>
            <button
              onClick={() => navigate(`/quiz/${questId}`)}
              className="flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-cyan-500 to-violet-500 rounded-2xl font-bold text-lg text-white hover:opacity-90 transition-all active:scale-98 shadow-lg shadow-cyan-500/20"
            >
              <Play size={20} />
              Replay Quiz
            </button>
          </div>
        )}
      </div>

      {showBrief && (
        <QuestBrief
          quest={quest}
          onClose={() => setShowBrief(false)}
          onStart={() => { setShowBrief(false); navigate(`/solution/${questId}`); }}
        />
      )}
    </div>
  );
}
