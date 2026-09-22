import { useNavigate } from 'react-router-dom';
import { CheckCircle, ChevronRight, Zap, Clock, ArrowLeft, BookOpen, Play } from 'lucide-react';
import { useAppStore } from '../App.jsx';
import { DEVOPS_LOOP_PATHS, DEVOPS_QUESTS, DEVOPS_TOTAL_QUESTS, DEVOPS_TOTAL_PATHS } from '../data/devopsIndex.js';

function QuestCard({ quest, isCompleted, onLearn, onPractice }) {
  const score = isCompleted?.score;
  return (
    <div
      className="rounded-2xl border flex flex-col overflow-hidden transition-all hover:scale-[1.005]"
      style={{
        background: isCompleted ? 'rgba(16,185,129,0.04)' : 'rgba(255,255,255,0.02)',
        border: isCompleted ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Card header */}
      <div className="p-5 flex-1">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{quest.icon}</div>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">{quest.subtitle}</p>
              <h3 className="font-semibold text-white text-sm leading-tight">{quest.title}</h3>
            </div>
          </div>
          {isCompleted && <CheckCircle size={18} className="text-emerald-400 shrink-0" />}
        </div>
        <p className="text-slate-500 text-xs leading-relaxed mb-4 line-clamp-2">{quest.description}</p>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`text-xs font-medium ${quest.difficultyColor}`}>{quest.difficulty}</span>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Clock size={11} />{quest.timeEstimate}
          </div>
          <div className="flex items-center gap-1 text-xs text-yellow-400">
            <Zap size={11} />{quest.xp} XP
          </div>
          {isCompleted && score !== undefined && (
            <span className="ml-auto text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              {score}/{quest.questions.length} ✓
            </span>
          )}
        </div>
        {isCompleted && (
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
            <span className="text-xs text-slate-500">Badge:</span>
            <span className="text-sm">{quest.badge.icon}</span>
            <span className="text-xs text-slate-400">{quest.badge.name}</span>
          </div>
        )}
      </div>

      {/* Action buttons: Learn + Practice */}
      <div className="flex border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <button
          onClick={onLearn}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-all hover:bg-orange-500/10"
          style={{ borderRight: '1px solid rgba(255,255,255,0.06)', color: '#fb923c' }}
        >
          <BookOpen size={12} />
          Learn
        </button>
        <button
          onClick={onPractice}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-all hover:bg-white/5"
          style={{ color: isCompleted ? '#6ee7b7' : '#94a3b8' }}
        >
          <Play size={12} />
          {isCompleted ? 'Retake' : 'Practice'}
        </button>
      </div>
    </div>
  );
}

function PathSection({ path }) {
  const navigate = useNavigate();
  const { devopsCompletedQuests } = useAppStore();
  const pathQuests = path.quests.map(id => DEVOPS_QUESTS.find(q => q.id === id)).filter(Boolean);
  const completedCount = pathQuests.filter(q => devopsCompletedQuests?.[q.id]).length;

  return (
    <div className="mb-12">
      <div className="flex items-center gap-4 mb-5">
        <div
          className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${path.gradient} flex items-center justify-center text-2xl shadow-lg`}
        >
          {path.icon}
        </div>
        <div>
          <h2 className="font-orbitron font-bold text-xl text-white">{path.title}</h2>
          <p className="text-slate-400 text-sm">{path.description}</p>
        </div>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <span className="text-sm text-slate-400">{completedCount}/{pathQuests.length}</span>
          <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${path.gradient} rounded-full transition-all duration-500`}
              style={{ width: `${pathQuests.length ? (completedCount / pathQuests.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {pathQuests.map(quest => (
          <QuestCard
            key={quest.id}
            quest={quest}
            isCompleted={devopsCompletedQuests?.[quest.id]}
            onLearn={() => navigate(`/devops-loop/solution/${quest.id}`)}
            onPractice={() => navigate(`/devops-loop/quiz/${quest.id}`)}
          />
        ))}
      </div>
    </div>
  );
}

export default function DevOpsPaths() {
  const navigate = useNavigate();
  const { devopsCompletedQuests } = useAppStore();
  const totalCompleted = Object.keys(devopsCompletedQuests || {}).length;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header
        className="sticky top-0 z-40 backdrop-blur-md border-b border-white/5"
        style={{ background: 'rgba(3,10,20,0.88)' }}
      >
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate('/devops-loop')}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={14} />
            DevOps Loop
          </button>
          <span className="text-slate-700">/</span>
          <span className="text-xs text-orange-400 font-semibold">Learning Paths</span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Title */}
        <div className="mb-10">
          <h1 className="font-orbitron text-4xl font-black mb-2 bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
            Learning Paths
          </h1>
          <p className="text-slate-400">
            {totalCompleted}/{DEVOPS_TOTAL_QUESTS} quests completed across {DEVOPS_TOTAL_PATHS} DevOps Loop learning paths
          </p>
        </div>

        {/* Path sections */}
        {DEVOPS_LOOP_PATHS.map(path => (
          <PathSection key={path.id} path={path} />
        ))}
      </div>
    </div>
  );
}
