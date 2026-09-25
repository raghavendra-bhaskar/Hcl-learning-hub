import { useState, useEffect } from 'react';
import AITutor from '../components/AITutor.jsx';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Target, ChevronRight, Clock } from 'lucide-react';
import { api } from '../lib/api.js';

function getDifficulty(xp) {
  if (xp < 150) return { label: 'Beginner',     color: '#10b981' };
  if (xp < 225) return { label: 'Intermediate', color: '#f59e0b' };
  return           { label: 'Advanced',      color: '#ef4444' };
}

function getTime(xp) {
  if (xp < 150) return '8 min';
  if (xp < 200) return '10 min';
  if (xp < 250) return '12 min';
  return '14 min';
}

function QuestCard({ quest, index, slug, navigate, accent }) {
  const diff = getDifficulty(quest.xp);
  const time = getTime(quest.xp);
  return (
    <div className="glass-card rounded-xl overflow-hidden flex flex-col border border-white/8 hover:border-white/15 transition-all group cursor-pointer"
      style={{ background: 'rgba(3,10,20,0.6)' }}>
      {/* Card top */}
      <div className="px-4 pt-4 pb-3 flex-1">
        {/* Quest number + subtitle */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-orbitron font-black text-xs flex-shrink-0 transition-transform group-hover:scale-105"
            style={{ background: accent + '20', border: `1px solid ${accent}35`, color: accent }}>
            {index + 1}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-[10px] text-slate-600 font-medium">Quest {index + 1}</p>
            <h3 className="text-sm font-bold text-white leading-snug mt-0.5">{quest.title}</h3>
          </div>
          <ChevronRight size={14} className="text-slate-700 group-hover:text-slate-400 transition-colors flex-shrink-0 mt-1" />
        </div>

        {/* Scenario excerpt */}
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3">
          {quest.scenario}
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ color: diff.color, background: diff.color + '15', border: `1px solid ${diff.color}25` }}>
            {diff.label}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-slate-600">
            <Clock size={10} /> {time}
          </span>
          <span className="text-[10px] font-bold ml-auto" style={{ color: accent }}>⚡ {quest.xp} XP</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex border-t border-white/6">
        <button onClick={() => navigate(`/c/${slug}/learn/${quest.id}`)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold text-slate-500 hover:text-white hover:bg-white/[0.04] transition-all border-r border-white/6">
          <BookOpen size={12} /> Learn
        </button>
        <button onClick={() => navigate(`/c/${slug}/quiz/${quest.id}`)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold text-slate-500 hover:text-white hover:bg-white/[0.04] transition-all">
          <Target size={12} /> Practice
        </button>
      </div>
    </div>
  );
}

export default function CourseQuestsPage() {
  const { slug } = useParams();
  const navigate  = useNavigate();

  const [course, setCourse]   = useState(null);
  const [quests, setQuests]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    (async () => {
      try {
        const c = await api.get(`/courses-api/${slug}`);
        setCourse(c);
        const q = await api.get(`/courses-api/${c.id}/quests`);
        setQuests(Array.isArray(q) ? q : []);
      } catch (e) { setError(e?.message || 'Failed to load'); }
      finally { setLoading(false); }
    })();
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white/20 border-t-cyan-400 rounded-full animate-spin" />
    </div>
  );
  if (error || !course) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-red-400">{error || 'Course not found'}</p>
      <button onClick={() => navigate(`/c/${slug}`)} className="text-cyan-400 text-sm">← Back</button>
    </div>
  );

  const accent = course.accentColor || '#06b6d4';

  // Build module map from weeks data
  const moduleMap = {};
  (course.weeks || []).forEach(week => {
    (week.modules || []).forEach(mod => {
      moduleMap[mod.id] = { ...mod, weekTitle: week.title, weekNumber: week.weekNumber };
    });
  });

  // Group quests by module
  const grouped = [];
  const seenModules = new Set();
  const unassigned = [];

  quests.forEach(q => {
    if (q.moduleId && moduleMap[q.moduleId]) {
      if (!seenModules.has(q.moduleId)) {
        seenModules.add(q.moduleId);
        grouped.push({ module: moduleMap[q.moduleId], quests: [] });
      }
      grouped.find(g => g.module.id === q.moduleId)?.quests.push(q);
    } else {
      unassigned.push(q);
    }
  });

  const allGroups = [
    ...grouped,
    ...(unassigned.length > 0 ? [{ module: null, quests: unassigned }] : []),
  ];

  // If no grouping — flat list in one group
  const useFlat = grouped.length === 0;
  const flatGroups = useFlat
    ? [{ module: { title: `${course.title} Quests`, icon: course.emoji || '🎯', color: accent }, quests }]
    : allGroups;

  const questIndexOffset = (groupIdx) => {
    let offset = 0;
    for (let i = 0; i < groupIdx; i++) offset += flatGroups[i].quests.length;
    return offset;
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md border-b border-white/5"
        style={{ background: 'rgba(3,10,20,0.88)' }}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(`/c/${slug}`)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={14} /> {course.title}
          </button>
          <span className="text-slate-700">/</span>
          <span className="text-xs font-semibold" style={{ color: accent }}>Quests</span>
          <div className="ml-auto">
            <span className="text-[11px] px-3 py-1 rounded-full font-bold"
              style={{ background: accent + '18', border: `1px solid ${accent}30`, color: accent }}>
              {quests.length} Quest{quests.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-4 pt-8 pb-4 text-center">
        <div className="text-5xl mb-3">{course.emoji || '🎯'}</div>
        <h1 className="font-orbitron text-2xl font-black mb-1"
          style={{ background: `linear-gradient(135deg,${accent},${accent}99)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {course.title} Quests
        </h1>
        <p className="text-slate-500 text-sm">
          {quests.length > 0
            ? `${quests.length}/0 quests completed across ${flatGroups.length} ${flatGroups.length === 1 ? 'path' : 'learning paths'}`
            : 'No quests available yet for this course.'}
        </p>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 space-y-10">
        <AITutor key={slug} courseSlug={slug} />
        {quests.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center mt-4">
            <div className="text-4xl mb-4">🚧</div>
            <p className="text-slate-500">Quests are being prepared. Check back soon!</p>
            <button onClick={() => navigate(`/c/${slug}`)}
              className="mt-6 px-5 py-2 rounded-xl text-sm font-bold text-white mx-auto block"
              style={{ background: `linear-gradient(135deg,${accent},${accent}cc)` }}>
              ← Back to {course.title}
            </button>
          </div>
        ) : flatGroups.map((group, gi) => {
          const mod = group.module;
          const offset = questIndexOffset(gi);
          const completedCount = 0;
          const total = group.quests.length;

          return (
            <div key={gi}>
              {/* Path header */}
              <div className="flex items-start gap-4 mb-5">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: (mod?.color || accent) + '20', border: `1px solid ${(mod?.color || accent)}30` }}>
                  {mod?.icon || course.emoji || '🎯'}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-orbitron text-base font-bold text-white">
                    {mod?.title || 'General Quests'}
                  </h2>
                  {mod?.weekTitle && (
                    <p className="text-xs text-slate-500 mt-0.5">{mod.weekTitle}</p>
                  )}
                </div>
                {/* Progress */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-slate-600">{completedCount}/{total}</span>
                  <div className="w-20 h-1.5 rounded-full bg-white/8">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: total > 0 ? `${(completedCount / total) * 100}%` : '0%', background: mod?.color || accent }} />
                  </div>
                </div>
              </div>

              {/* Quest cards grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.quests.map((q, qi) => (
                  <QuestCard key={q.id} quest={q} index={offset + qi} slug={slug}
                    navigate={navigate} accent={mod?.color || accent} />
                ))}
              </div>
            </div>
          );
        })}

        {/* Start button */}
        {quests.length > 0 && (
          <div className="flex justify-center pb-4">
            <button onClick={() => navigate(`/c/${slug}/quiz/${quests[0].id}`)}
              className="flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-white hover:opacity-90 transition-all active:scale-95"
              style={{ background: `linear-gradient(135deg,${accent},${accent}cc)`, boxShadow: `0 8px 32px ${accent}40` }}>
              <Target size={18} /> Start from Quest 1
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
