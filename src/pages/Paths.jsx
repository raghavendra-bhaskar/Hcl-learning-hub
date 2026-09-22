import { useNavigate } from 'react-router-dom';
import { Lock, CheckCircle, ChevronRight, Zap, Clock } from 'lucide-react';
import { useAppStore } from '../App.jsx';
import { LEARNING_PATHS, QUESTS } from '../data/index.js';
import Header from '../components/Header.jsx';

function QuestCard({ quest, isCompleted, onClick }) {
  const score = isCompleted?.score;
  return (
    <div
      onClick={onClick}
      className="quest-card glass-card glass-card-hover rounded-2xl p-5 border border-white/5 group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{quest.icon}</div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">{quest.subtitle}</p>
            <h3 className="font-semibold text-white text-sm leading-tight">{quest.title}</h3>
          </div>
        </div>
        {isCompleted ? (
          <CheckCircle size={20} className="text-emerald-400 shrink-0" />
        ) : (
          <ChevronRight size={18} className="text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
        )}
      </div>

      <p className="text-slate-500 text-xs leading-relaxed mb-4 line-clamp-2">{quest.description}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
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

      {isCompleted && (
        <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
          <span className="text-xs text-slate-500">Badge:</span>
          <span className="text-sm">{quest.badge.icon}</span>
          <span className="text-xs text-slate-400">{quest.badge.name}</span>
        </div>
      )}
    </div>
  );
}

function PathSection({ path }) {
  const navigate = useNavigate();
  const { completedQuests } = useAppStore();
  const pathQuests = path.quests.map(id => QUESTS.find(q => q.id === id)).filter(Boolean);
  const completedCount = pathQuests.filter(q => completedQuests[q.id]).length;

  return (
    <div className="mb-10">
      <div className="flex items-center gap-4 mb-5">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${path.gradient} flex items-center justify-center text-2xl shadow-lg`}>
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
              style={{ width: `${(completedCount / pathQuests.length) * 100}%` }}
            />
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
              : navigate(`/solution/${quest.id}`)
            }
          />
        ))}
      </div>
    </div>
  );
}

export default function Paths() {
  const { completedQuests } = useAppStore();
  const totalCompleted = Object.keys(completedQuests).length;

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-10">
          <h1 className="font-orbitron text-4xl font-black mb-2 bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
            Learning Paths
          </h1>
          <p className="text-slate-400">
            {totalCompleted}/{QUESTS.length} quests completed across 5 AI learning paths
          </p>
        </div>
        {LEARNING_PATHS.map(path => (
          <PathSection key={path.id} path={path} />
        ))}
      </div>
    </div>
  );
}
