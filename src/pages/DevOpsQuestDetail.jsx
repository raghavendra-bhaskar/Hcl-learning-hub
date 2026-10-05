import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Zap, Clock, ChevronRight, CheckCircle, BookOpen, Play } from 'lucide-react';
import { useAppStore } from '../App.jsx';
import { getDevOpsQuest } from '../data/devopsIndex.js';
import { LabLaunchCard } from '../components/ExternalHandoff.jsx';
import { getQuestLab } from '../data/externalLinks.js';

export default function DevOpsQuestDetail() {
  const { questId } = useParams();
  const navigate = useNavigate();
  const { devopsCompletedQuests, theme } = useAppStore();
  const isLight = theme === 'light';
  const quest = getDevOpsQuest(questId);

  if (!quest) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Quest not found.</p>
          <button onClick={() => navigate('/devops-loop/paths')} className="text-orange-400 hover:underline text-sm">
            ← Back to Paths
          </button>
        </div>
      </div>
    );
  }

  const isCompleted = devopsCompletedQuests?.[questId];

  return (
    <div className="min-h-screen pb-24" style={{ background: isLight ? 'linear-gradient(160deg, #f0f9ff 0%, #f8fafc 60%, #eef2ff 100%)' : undefined }}>
      {/* Header */}
      <header
        className="sticky top-0 z-40 backdrop-blur-md border-b border-white/5"
        style={{ background: isLight ? 'rgba(248,250,252,0.94)' : 'rgba(3,10,20,0.88)', borderColor: isLight ? 'rgba(71,85,105,0.18)' : 'rgba(255,255,255,0.05)' }}
      >
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate('/devops-loop/paths')}
            className={`flex items-center gap-1.5 text-xs transition-colors ${isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}
          >
            <ArrowLeft size={14} />
            Learning Paths
          </button>
          <span className={isLight ? 'text-slate-300' : 'text-slate-700'}>/</span>
          <span className={`text-xs font-semibold truncate ${isLight ? 'text-slate-900' : 'text-orange-400'}`}>{quest.title}</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-10">
        {/* Quest card */}
        <div
          className="rounded-3xl p-8 mb-8"
          style={{
            background: isLight ? 'rgba(255,255,255,0.86)' : 'linear-gradient(135deg, rgba(249,115,22,0.08), rgba(239,68,68,0.05))',
            border: isLight ? '1px solid rgba(71,85,105,0.16)' : '1px solid rgba(249,115,22,0.2)',
          }}
        >
          <div className="flex items-start gap-5">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0"
              style={{ background: isLight ? 'rgba(249,115,22,0.10)' : 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)' }}
            >
              {quest.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-orange-400 text-xs font-bold tracking-widest uppercase mb-1">{quest.subtitle}</p>
              <h1 className={`font-orbitron text-2xl font-bold mb-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>{quest.title}</h1>
              <p className={`text-sm leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>{quest.description}</p>
            </div>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-4 mt-6 pt-5 border-t" style={{ borderColor: isLight ? 'rgba(71,85,105,0.14)' : 'rgba(255,255,255,0.05)' }}>
            <span className={`text-xs font-bold ${quest.difficultyColor}`}>{quest.difficulty}</span>
            <div className={`flex items-center gap-1.5 text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              <Clock size={12} />
              {quest.timeEstimate}
            </div>
            <div className={`flex items-center gap-1.5 text-xs ${isLight ? 'text-slate-700' : 'text-yellow-400'}`}>
              <Zap size={12} />
              {quest.xp} XP
            </div>
            <div className={`flex items-center gap-1.5 text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              <span>{quest.questions.length} questions</span>
            </div>
          </div>
        </div>

        {/* Completed state */}
        {isCompleted && (
          <div
            className="rounded-2xl p-5 mb-6 flex items-center gap-4"
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}
          >
            <CheckCircle size={24} className="text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-emerald-400 font-bold text-sm">Quest Complete!</p>
              <p className={`text-xs ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
                Score: {isCompleted.score}/{quest.questions.length} · Badge: {quest.badge.icon} {quest.badge.name}
              </p>
            </div>
            <button
              onClick={() => navigate(`/devops-loop/quiz/${questId}`)}
              className={`ml-auto text-xs transition-colors px-3 py-1.5 rounded-lg ${isLight ? 'text-slate-700 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}
              style={{ border: isLight ? '1px solid rgba(71,85,105,0.18)' : '1px solid rgba(255,255,255,0.10)', background: isLight ? 'rgba(255,255,255,0.75)' : undefined }}
            >
              Retake
            </button>
          </div>
        )}

        {/* Questions preview */}
        <div className="mb-8">
          <h2 className={`font-orbitron text-sm font-bold mb-4 ${isLight ? 'text-slate-900' : 'text-white'}`}>What you'll be tested on:</h2>
          <div className="space-y-3">
            {quest.questions.map((q, i) => (
              <div
                key={q.id}
                className="flex items-start gap-3 p-4 rounded-xl"
                style={{ background: isLight ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.02)', border: isLight ? '1px solid rgba(71,85,105,0.14)' : '1px solid rgba(255,255,255,0.06)' }}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                  style={{ background: 'rgba(249,115,22,0.15)', color: '#fb923c' }}
                >
                  {i + 1}
                </div>
                <div>
                  <p className={`text-xs leading-relaxed italic mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{q.scenario}</p>
                  <p className={`text-sm font-medium ${isLight ? 'text-slate-900' : 'text-white'}`}>{q.question}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {getQuestLab(questId) && (
          <div className="mb-6">
            <LabLaunchCard lab={getQuestLab(questId)} accent="orange" />
          </div>
        )}

        {/* CTA buttons: Learn + Practice */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate(`/devops-loop/solution/${questId}`)}
            className="flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm transition-all hover:opacity-90 active:scale-98"
            style={{ background: isLight ? 'rgba(255,255,255,0.82)' : 'rgba(249,115,22,0.12)', border: isLight ? '1px solid rgba(71,85,105,0.16)' : '1px solid rgba(249,115,22,0.35)', color: isLight ? '#c2410c' : '#fb923c' }}
          >
            <BookOpen size={16} />
            Learn First
          </button>
          <button
            onClick={() => navigate(`/devops-loop/quiz/${questId}`)}
            className="flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm text-white transition-all hover:opacity-90 active:scale-98"
            style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)', boxShadow: '0 0 20px rgba(249,115,22,0.35)' }}
          >
            <Play size={16} />
            {isCompleted ? 'Retake' : 'Practice'}
          </button>
        </div>
      </div>
    </div>
  );
}
