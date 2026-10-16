import { useNavigate } from 'react-router-dom';
import { ChevronRight, Star, ArrowLeft, CheckCircle, Clock, Zap, BookOpen, Play } from 'lucide-react';
import { useAppStore } from '../App.jsx';
import { DEVOPS_LOOP_PATHS, DEVOPS_QUESTS, DEVOPS_TOTAL_QUESTS, DEVOPS_TOTAL_PATHS } from '../data/devopsIndex.js';

// Quest card used inside each DevOps Loop learning path section.
function QuestCard({ quest, isCompleted, onLearn, onPractice }) {
  const { theme } = useAppStore();
  const isLight = theme === 'light';
  const score = isCompleted?.score;

  return (
    <div
      className="rounded-2xl border flex flex-col overflow-hidden transition-all hover:scale-[1.005]"
      style={{
        background: isCompleted
          ? (isLight ? 'rgba(236,253,245,0.95)' : 'rgba(16,185,129,0.04)')
          : (isLight ? 'rgba(255,255,255,0.84)' : 'rgba(255,255,255,0.02)'),
        border: isCompleted ? '1px solid rgba(16,185,129,0.2)' : (isLight ? '1px solid rgba(71,85,105,0.16)' : '1px solid rgba(255,255,255,0.07)'),
      }}
    >
      <div className="p-5 flex-1">
        <div className="flex items-start justify-between mb-3 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="text-3xl">{quest.icon}</div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 mb-0.5">{quest.subtitle}</p>
              <h3 className={`font-semibold text-sm leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>{quest.title}</h3>
            </div>
          </div>
          {isCompleted && <CheckCircle size={18} className="text-emerald-400 shrink-0" />}
        </div>
        <p className={`text-xs leading-relaxed mb-4 line-clamp-2 ${isLight ? 'text-slate-700' : 'text-slate-500'}`}>{quest.description}</p>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`text-xs font-medium ${quest.difficultyColor}`}>{quest.difficulty}</span>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Clock size={11} />{quest.timeEstimate}
          </div>
          <div className={`flex items-center gap-1 text-xs ${isLight ? 'text-slate-700' : 'text-yellow-400'}`}>
            <Zap size={11} />{quest.xp} XP
          </div>
          {isCompleted && score !== undefined && (
            <span className="ml-auto text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              {score}/{quest.questions.length} ✓
            </span>
          )}
        </div>
      </div>

      <div className="flex border-t" style={{ borderColor: isLight ? 'rgba(71,85,105,0.18)' : 'rgba(255,255,255,0.06)' }}>
        <button
          onClick={onLearn}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-all ${isLight ? 'hover:bg-slate-100' : 'hover:bg-orange-500/10'}`}
          style={{ borderRight: isLight ? '1px solid rgba(71,85,105,0.18)' : '1px solid rgba(255,255,255,0.06)', color: isLight ? '#c2410c' : '#fb923c' }}
        >
          <BookOpen size={12} />
          Learn
        </button>
        <button
          onClick={onPractice}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-all ${isLight ? 'hover:bg-slate-100' : 'hover:bg-white/5'}`}
          style={{ color: isCompleted ? (isLight ? '#047857' : '#6ee7b7') : (isLight ? '#475569' : '#94a3b8') }}
        >
          <Play size={12} />
          {isCompleted ? 'Retake' : 'Practice'}
        </button>
      </div>
    </div>
  );
}

// Path section groups DevOps quests by learning path and shows completion progress.
function PathSection({ path }) {
  const navigate = useNavigate();
  const { devopsCompletedQuests, theme } = useAppStore();
  const isLight = theme === 'light';
  const pathQuests = path.quests.map(id => DEVOPS_QUESTS.find(q => q.id === id)).filter(Boolean);
  const completedCount = pathQuests.filter(q => devopsCompletedQuests?.[q.id]).length;

  return (
    <div className="mb-12">
      <div className="flex items-center gap-4 mb-5">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${path.gradient} flex items-center justify-center text-2xl shadow-lg`}>
          {path.icon}
        </div>
        <div>
          <h2 className={`font-orbitron font-bold text-xl ${isLight ? 'text-slate-900' : 'text-white'}`}>{path.title}</h2>
          <p className={`text-sm ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>{path.description}</p>
        </div>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <span className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{completedCount}/{pathQuests.length}</span>
          <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: isLight ? 'rgba(148,163,184,0.24)' : 'rgba(255,255,255,0.10)' }}>
            <div className={`h-full bg-gradient-to-r ${path.gradient} rounded-full transition-all duration-500`}
              style={{ width: `${pathQuests.length ? (completedCount / pathQuests.length) * 100 : 0}%` }} />
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

// DevOps Loop landing page with hero content, path shortcut, and grouped DevOps quests.
export default function DevOpsHome() {
  const navigate = useNavigate();
  const { theme, devopsCompletedQuests } = useAppStore();
  const isLight = theme === 'light';
  const totalCompleted = Object.keys(devopsCompletedQuests || {}).length;

  return (
    <div className="min-h-screen" style={{ background: isLight ? 'linear-gradient(160deg, #fff7ed 0%, #fef3eb 50%, #fff1f2 100%)' : undefined }}>

      {/* Lightweight page header for contextual back navigation and Course Hub access. */}
      <div className="sticky top-0 z-40 backdrop-blur-md border-b" style={{ background: isLight ? 'rgba(203,213,225,0.94)' : 'rgba(3,10,20,0.88)', borderColor: isLight ? 'rgba(71,85,105,0.22)' : 'rgba(255,255,255,0.05)' }}>
        <div className="max-w-6xl mx-auto px-4 h-11 flex items-center gap-3">
          <button
            onClick={() => navigate('/courses')}
            className={`flex items-center gap-1.5 text-xs transition-colors ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-500 hover:text-orange-400'}`}
          >
            <ArrowLeft size={13} />
            Back
          </button>
          <span className="text-slate-700 text-xs">/</span>
          <span className="text-xs font-bold text-orange-400 font-orbitron">DevOps Loop</span>
          <button
            onClick={() => navigate('/courses')}
            className={`ml-auto px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors border ${isLight ? 'text-slate-700 hover:text-slate-900' : 'text-slate-300 hover:text-white'}`}
            style={{ borderColor: isLight ? 'rgba(148,163,184,0.22)' : 'rgba(255,255,255,0.08)' }}
          >
            Course Home
          </button>
        </div>
      </div>

      {/* Page hero that introduces the DevOps Loop module and its learning scope. */}
      <section className="relative">
        <div className="absolute inset-0 pointer-events-none" style={{ background: isLight ? 'radial-gradient(circle at top, rgba(249,115,22,0.14), transparent 60%)' : undefined }} />
        <div className="max-w-6xl mx-auto px-4 pt-16 pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-[12px] font-medium mb-6 animate-fade-in" style={{ borderColor: 'rgba(249,115,22,0.3)', background: isLight ? 'rgba(249,115,22,0.14)' : 'rgba(249,115,22,0.10)', color: '#c2410c' }}>
            <Star size={12} className="animate-pulse-slow" />
            Gamified DevOps Learning for Teams
          </div>

          <h1 className="font-orbitron text-2xl md:text-4xl font-black mb-6 animate-slide-up">
            <span className={isLight
              ? 'bg-gradient-to-r from-orange-700 via-red-700 to-rose-700 bg-clip-text text-transparent'
              : 'bg-gradient-to-r from-orange-400 via-red-400 to-rose-400 bg-clip-text text-transparent'}>
              DEVOPS LOOP
            </span>
          </h1>

          <p className={`text-base md:text-lg mb-4 max-w-3xl mx-auto animate-slide-up ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
            Conquer <span className={`font-semibold ${isLight ? 'text-orange-700' : 'text-orange-400'}`}>21 DevOps Loop quests</span> through real-world IBM scenarios.
            Earn XP, unlock badges, and master the full CI/CD lifecycle.
          </p>
          <p className={`text-[12px] mb-10 animate-fade-in ${isLight ? 'text-slate-700' : 'text-slate-500'}`}>
            DevOps Plan • DevOps Control • DevOps Build • DevOps Deploy • DevOps Test • DevOps Measure • CNAPP Installation • Value Streams
          </p>
        </div>
      </section>

      {/* Main content area with the featured learning path and all DevOps quest groups. */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="max-w-5xl mx-auto">
          <h2 className={`font-orbitron text-xl md:text-2xl font-bold text-center mb-10 ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
            DevOps Loop Learning Path
          </h2>
          <button
            onClick={() => navigate('/devops-loop/learning-path')}
            className="w-full glass-card rounded-2xl p-6 border transition-all text-left glass-card-hover group active:scale-98 cursor-pointer"
            style={{ background: isLight ? 'linear-gradient(135deg,rgba(249,115,22,0.10),rgba(239,68,68,0.07))' : 'linear-gradient(135deg, rgba(249,115,22,0.08), rgba(239,68,68,0.06))', borderColor: isLight ? 'rgba(249,115,22,0.28)' : 'rgba(249,115,22,0.4)' }}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
              <div className="flex items-center gap-6 flex-1 text-left">
                <div className="text-5xl flex-shrink-0">🗺️</div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className={`font-orbitron font-bold text-base md:text-lg transition-colors ${isLight ? 'text-slate-900' : 'text-white'} group-hover:text-orange-400`}>DevOps Loop Learning Path</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold tracking-widest" style={{ background: 'rgba(249,115,22,0.15)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.3)' }}>NEW</span>
                  </div>
                  <p className={`text-sm leading-relaxed ${isLight ? 'text-slate-800' : 'text-slate-400'}`}>4-week structured roadmap from Loop Foundations to Value Stream Insights. 8 modules with curated IBM docs, O'Reilly resources & live workshops.</p>
                </div>
              </div>
              <div className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all group-hover:gap-3"
                style={{ background: isLight ? '#c2410c' : 'rgba(249,115,22,0.15)', border: `1px solid ${isLight ? '#c2410c' : 'rgba(249,115,22,0.35)'}`, color: isLight ? '#ffffff' : '#fb923c' }}>
                Start Path <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </button>
        </div>

        <div className="max-w-6xl mx-auto mt-14">
          <div className="mb-10">
            <h2 className={`font-orbitron text-xl md:text-2xl font-bold text-center mb-2 ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
              DevOps Loop Quests
            </h2>
            <p className={`text-center ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
              {totalCompleted}/{DEVOPS_TOTAL_QUESTS} quests completed across {DEVOPS_TOTAL_PATHS} DevOps Loop learning paths
            </p>
          </div>
          {DEVOPS_LOOP_PATHS.map(path => (
            <PathSection key={path.id} path={path} />
          ))}
        </div>
      </section>

    </div>
  );
}
