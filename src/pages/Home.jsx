import { useNavigate } from 'react-router-dom';
import { ChevronRight, Star, ArrowLeft, CheckCircle, Clock, Zap } from 'lucide-react';
import { useAppStore } from '../App.jsx';
import { LEARNING_PATHS, QUESTS } from '../data/index.js';

// Quest card used inside each AI Quest learning path section.
function QuestCard({ quest, isCompleted, onClick }) {
  const { theme } = useAppStore();
  const isLight = theme === 'light';
  const score = isCompleted?.score;

  return (
    <div
      onClick={onClick}
      className="quest-card glass-card glass-card-hover rounded-2xl p-5 border group cursor-pointer"
      style={{ borderColor: isLight ? 'rgba(100,116,139,0.18)' : 'rgba(255,255,255,0.05)', boxShadow: isLight ? '0 2px 12px rgba(0,0,0,0.07)' : 'none' }}>
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="text-3xl">{quest.icon}</div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 mb-0.5">{quest.subtitle}</p>
            <h3 className={`font-semibold text-sm leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>{quest.title}</h3>
          </div>
        </div>
        {isCompleted ? (
          <CheckCircle size={20} className="text-emerald-400 shrink-0" />
        ) : (
          <ChevronRight size={18} className="text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
        )}
      </div>

      <p className={`text-xs leading-relaxed mb-4 line-clamp-2 ${isLight ? 'text-slate-700' : 'text-slate-500'}`}>{quest.description}</p>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`text-xs font-medium ${quest.difficultyColor}`}>{quest.difficulty}</span>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Clock size={11} />
            {quest.timeEstimate}
          </div>
          <div className="flex items-center gap-1 text-xs text-yellow-400">
            <Zap size={11} />
            {quest.xp} XP
          </div>
        </div>
        {isCompleted && score !== undefined && (
          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
            {score}/{quest.questions.length} ✓
          </span>
        )}
      </div>
    </div>
  );
}

// Path section groups quest cards and shows completion progress for that path.
function PathSection({ path }) {
  const navigate = useNavigate();
  const { completedQuests, theme } = useAppStore();
  const isLight = theme === 'light';
  const pathQuests = path.quests.map(id => QUESTS.find(q => q.id === id)).filter(Boolean);
  const completedCount = pathQuests.filter(q => completedQuests[q.id]).length;

  return (
    <div className="mb-10">
      <div className="flex items-center gap-4 mb-5">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${path.gradient} flex items-center justify-center text-2xl shadow-lg`}>
          {path.icon}
        </div>
        <div>
          <h2 className={`font-orbitron font-bold text-xl ${isLight ? 'text-slate-900' : 'text-white'}`}>{path.title}</h2>
          <p className={`text-sm ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>{path.description}</p>
        </div>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <span className="text-sm text-slate-400">{completedCount}/{pathQuests.length}</span>
          <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className={`h-full bg-gradient-to-r ${path.gradient} rounded-full transition-all duration-500`}
              style={{ width: `${(completedCount / pathQuests.length) * 100}%` }} />
          </div>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {pathQuests.map((quest) => (
          <QuestCard
            key={quest.id}
            quest={quest}
            isCompleted={completedQuests[quest.id]}
            onClick={() => completedQuests[quest.id]
              ? navigate(`/quest/${quest.id}`)
              : navigate(`/solution/${quest.id}`)}
          />
        ))}
      </div>
    </div>
  );
}

// AI Quest landing page with hero content, learning-path shortcut, and grouped quest paths.
export default function Home() {
  const navigate = useNavigate();
  const { theme, completedQuests } = useAppStore();
  const isLight = theme === 'light';
  const totalCompleted = Object.keys(completedQuests).length;

  return (
    <div className="min-h-screen" style={{ background: isLight ? 'linear-gradient(160deg, #f0f9ff 0%, #e8f4fd 50%, #f5f0ff 100%)' : undefined }}>
      {/* Lightweight page header for contextual back navigation and Course Hub access. */}
      <div className="sticky top-0 z-40 backdrop-blur-md border-b" style={{ background: isLight ? 'rgba(203,213,225,0.94)' : 'rgba(3,10,20,0.88)', borderColor: isLight ? 'rgba(71,85,105,0.22)' : 'rgba(255,255,255,0.05)' }}>
        <div className="max-w-6xl mx-auto px-4 h-11 flex items-center gap-3">
          <button
            onClick={() => navigate('/courses')}
            className={`flex items-center gap-1.5 text-xs transition-colors ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-500 hover:text-cyan-400'}`}
          >
            <ArrowLeft size={13} />
            Back
          </button>
          <span className="text-slate-700 text-xs">/</span>
          <span className="text-xs font-bold text-cyan-400 font-orbitron">AI Quest</span>
          <button
            onClick={() => navigate('/courses')}
            className={`ml-auto px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors border ${isLight ? 'text-slate-700 hover:text-slate-900' : 'text-slate-300 hover:text-white'}`}
            style={{ borderColor: isLight ? 'rgba(148,163,184,0.22)' : 'rgba(255,255,255,0.08)' }}
          >
            Home
          </button>
        </div>
      </div>

      {/* Page hero that introduces the AI Quest module and its learning scope. */}
      <section className="relative">
        <div className="absolute inset-0 pointer-events-none" style={{ background: isLight ? 'radial-gradient(circle at top, rgba(6,182,212,0.12), transparent 60%)' : undefined }} />
        <div className="max-w-6xl mx-auto px-4 pt-16 pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-[12px] font-medium mb-6 animate-fade-in" style={{ borderColor: 'rgba(6,182,212,0.3)', background: isLight ? 'rgba(6,182,212,0.12)' : 'rgba(6,182,212,0.10)', color: '#0891b2' }}>
            <Star size={12} className="animate-pulse-slow" />
            Gamified AI Learning for Teams
          </div>

          <h1 className="font-orbitron text-2xl md:text-4xl font-black mb-6 animate-slide-up">
            <span className={isLight
              ? 'bg-gradient-to-r from-cyan-700 via-blue-700 to-violet-700 bg-clip-text text-transparent'
              : 'bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent'}>
              AI QUEST
            </span>
          </h1>

          <p className={`text-base md:text-lg mb-4 max-w-3xl mx-auto animate-slide-up ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
            Conquer <span className={`font-semibold ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>21 AI learning quests</span> through real-world scenarios.
            Earn XP, unlock badges, and climb the leaderboard.
          </p>
          <p className={`text-[12px] mb-10 animate-fade-in ${isLight ? 'text-slate-700' : 'text-slate-500'}`}>
            Generative AI • Machine Learning • MLOps • NLP • Computer Vision • LLM Architecture • RAG • AI Security • Prompt Engineering • Python • APIs • Docker
          </p>
        </div>
      </section>

      {/* Main content area with the featured learning path and all quest groups. */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="max-w-5xl mx-auto">
          <h2 className={`font-orbitron text-xl md:text-2xl font-bold text-center mb-10 ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
            AI Transformation Learning Path
          </h2>
          <button
            onClick={() => navigate('/learning-path')}
            className="w-full glass-card rounded-2xl p-6 border transition-all text-left glass-card-hover group active:scale-98 cursor-pointer"
            style={{ background: isLight ? 'linear-gradient(135deg,rgba(6,182,212,0.10),rgba(99,102,241,0.08))' : 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(99,102,241,0.06))', borderColor: isLight ? 'rgba(6,182,212,0.28)' : 'rgba(6,182,212,0.3)' }}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
              <div className="flex items-center gap-6 flex-1 text-left">
                <div className="text-5xl flex-shrink-0">🗺️</div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className={`font-orbitron font-bold text-base md:text-lg ${isLight ? 'text-slate-900' : 'text-white'} group-hover:text-cyan-400 transition-colors`}>AI Transformation Path</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold tracking-widest"
                      style={{ background: 'rgba(6,182,212,0.15)', color: '#22d3ee', border: '1px solid rgba(6,182,212,0.3)' }}>
                      NEW
                    </span>
                  </div>
                  <p className={`text-sm leading-relaxed ${isLight ? 'text-slate-800' : 'text-slate-400'}`}>6-week structured roadmap from AI Foundations to Intelligent Automation. 9 modules with curated videos, Udemy courses & workshops.</p>
                </div>
              </div>
              <div className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all group-hover:gap-3"
                style={isLight
                  ? { background: '#0891b2', border: '1px solid #0891b2', color: '#ffffff' }
                  : { background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.35)', color: '#22d3ee' }}>
                Start Path <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </button>
        </div>

        <div className="max-w-6xl mx-auto mt-14">
          <div className="mb-10">
            <h2 className={`font-orbitron text-xl md:text-2xl font-bold mb-2 text-center ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
              AI Quest Quests
            </h2>
            <p className={`text-center ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
              {totalCompleted}/{QUESTS.length} quests completed across {LEARNING_PATHS.length} AI learning paths
            </p>
          </div>
          {LEARNING_PATHS.map(path => (
            <PathSection key={path.id} path={path} />
          ))}
        </div>
      </section>

    </div>
  );
}
