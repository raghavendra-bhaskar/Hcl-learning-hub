import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Target, ChevronRight, Clock, Moon, Sun, Search } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAppStore } from '../App.jsx';

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

function cleanDisplayTitle(value, fallback = '') {
  return String(value || fallback)
    .replace(/^week\s*\d+\s*[:\-–—]?\s*/i, '')
    .replace(/^module\s*\d+\s*[:\-–—]?\s*/i, '')
    .replace(/^[A-Z]\.[\s-]*/i, '')
    .replace(/\s+learning path$/i, '')
    .replace(/\s+learn and practice$/i, '')
    .trim() || fallback;
}

function normalizeSearchText(value) {
  return cleanDisplayTitle(value, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getQuestSymbol(title, index) {
  const text = cleanDisplayTitle(title, '').toLowerCase();
  if (/security|identity|access|iam|policy/.test(text)) return '🛡️';
  if (/billing|cost|pricing|budget/.test(text)) return '💰';
  if (/region|network|vpc|dns|edge|route/.test(text)) return '🌐';
  if (/storage|backup|archive|file|block|object/.test(text)) return '🗄️';
  if (/database|sql|nosql|rds|dynamo/.test(text)) return '🛢️';
  if (/compute|server|instance|lambda|container|kubernetes/.test(text)) return '⚙️';
  if (/monitor|observability|logging|alert/.test(text)) return '📡';
  if (/ai|ml|model|prompt/.test(text)) return '🤖';
  return ['☁️', '🚀', '🧠', '🧭', '🛰️', '🔧'][index % 6];
}

function QuestCard({ quest, index, slug, navigate, accent, isLight }) {
  const diff = getDifficulty(quest.xp);
  const time = getTime(quest.xp);
  const questTitle = cleanDisplayTitle(quest.title, `Quest ${index + 1}`);
  const questSymbol = getQuestSymbol(questTitle, index);
  return (
    <div className="glass-card rounded-2xl overflow-hidden flex flex-col border transition-all group hover:-translate-y-0.5"
      style={{ background: isLight ? 'rgba(255,255,255,0.94)' : 'rgba(10,18,34,0.78)', borderColor: isLight ? 'rgba(100,116,139,0.18)' : 'rgba(255,255,255,0.08)', boxShadow: isLight ? '0 8px 22px rgba(15,23,42,0.05)' : '0 10px 24px rgba(2,6,23,0.18)' }}>
      <div className="px-4 pt-4 pb-3 flex-1 min-h-[178px]">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg flex-shrink-0 transition-transform group-hover:scale-105"
              style={{ background: accent + '20', border: `1px solid ${accent}35` }}>
              {questSymbol}
            </div>
            <div className="min-w-0">
              <p className={`text-[11px] mb-0.5 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Quest {index + 1}</p>
              <h3 className={`font-semibold text-sm leading-tight line-clamp-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>{questTitle}</h3>
            </div>
          </div>
          <ChevronRight size={16} className={`transition-colors flex-shrink-0 mt-1 ${isLight ? 'text-slate-400 group-hover:text-slate-700' : 'text-slate-700 group-hover:text-slate-400'}`} />
        </div>

        <p className={`text-xs leading-relaxed line-clamp-3 mb-3 min-h-[54px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
          {quest.scenario}
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ color: diff.color, background: diff.color + '15', border: `1px solid ${diff.color}25` }}>
            {diff.label}
          </span>
          <span className={`flex items-center gap-1 text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
            <Clock size={10} /> {time}
          </span>
          <span className="text-[10px] font-bold ml-auto" style={{ color: accent }}>⚡ {quest.xp} XP</span>
        </div>
      </div>

      <div className="flex border-t" style={{ borderColor: isLight ? 'rgba(100,116,139,0.12)' : 'rgba(255,255,255,0.06)' }}>
        <button onClick={() => navigate(`/c/${slug}/learn/${quest.id}`)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold transition-all border-r ${isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'}`}
          style={{ borderColor: isLight ? 'rgba(100,116,139,0.12)' : 'rgba(255,255,255,0.06)' }}>
          <BookOpen size={12} /> Learn
        </button>
        <button onClick={() => navigate(`/c/${slug}/quiz/${quest.id}`)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold transition-all ${isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'}`}>
          <Target size={12} /> Practice
        </button>
      </div>
    </div>
  );
}

export default function CourseQuestsPage() {
  const { slug } = useParams();
  const navigate  = useNavigate();
  const { theme, setTheme, courseCompletedQuests } = useAppStore();
  const isLight = theme === 'light';

  const [course, setCourse]   = useState(null);
  const [quests, setQuests]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [search, setSearch]   = useState('');

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
  const completedMap = courseCompletedQuests?.[slug] || {};

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
  const completedTotal = quests.filter(q => completedMap[q.id]).length;
  const searchText = normalizeSearchText(search);
  const filteredGroups = searchText
    ? flatGroups
        .map(group => {
          const moduleText = normalizeSearchText([group.module?.title, group.module?.weekTitle].filter(Boolean).join(' '));
          const matchingQuests = group.quests.filter(q => {
            const questText = normalizeSearchText([q.title, q.scenario, q.explanation].filter(Boolean).join(' '));
            return moduleText.includes(searchText) || questText.includes(searchText);
          });
          return { ...group, quests: matchingQuests };
        })
        .filter(group => group.quests.length > 0)
    : flatGroups;

  const questIndexOffset = (groupIdx) => {
    let offset = 0;
    for (let i = 0; i < groupIdx; i++) offset += filteredGroups[i].quests.length;
    return offset;
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: isLight ? 'linear-gradient(160deg, #f0f9ff 0%, #f8fafc 60%, #eef2ff 100%)' : undefined }}>
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md border-b"
        style={{ background: isLight ? 'rgba(248,250,252,0.94)' : 'rgba(3,10,20,0.88)', borderColor: isLight ? 'rgba(71,85,105,0.18)' : 'rgba(255,255,255,0.05)' }}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(`/c/${slug}`)}
            className={`flex items-center gap-1.5 text-xs transition-colors ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}>
            <ArrowLeft size={14} /> {course.title}
          </button>
          <span className="text-slate-500">/</span>
          <span className="text-xs font-semibold" style={{ color: accent }}>Quests</span>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setTheme(isLight ? 'dark' : 'light')}
              className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${isLight ? 'text-slate-700' : 'text-slate-300'}`}
              style={{ border: isLight ? '1px solid rgba(100,116,139,0.2)' : '1px solid rgba(255,255,255,0.07)', background: isLight ? '#ffffff' : 'rgba(255,255,255,0.03)' }}
              title={isLight ? 'Dark mode' : 'Light mode'}>
              {isLight ? <Moon size={13} /> : <Sun size={13} />}
            </button>
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
        <h1 className={`font-orbitron text-2xl font-black mb-1 ${isLight ? 'text-slate-900' : ''}`}
          style={isLight ? undefined : { background: `linear-gradient(135deg,${accent},${accent}99)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {course.title} Quests
        </h1>
        <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>
          {quests.length > 0
            ? `${completedTotal}/${quests.length} quests completed across ${flatGroups.length} ${flatGroups.length === 1 ? 'path' : 'learning paths'}`
            : 'No quests available yet for this course.'}
        </p>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 space-y-10">
        {quests.length > 0 && (
          <div className="rounded-2xl border px-4 py-3" style={{ background: isLight ? 'rgba(255,255,255,0.9)' : 'rgba(3,10,20,0.55)', borderColor: isLight ? 'rgba(100,116,139,0.16)' : 'rgba(255,255,255,0.08)' }}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Smart quest search</p>
                <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>Search by quest title, scenario, module, or week.</p>
              </div>
              <div className="relative w-full md:w-[22rem]">
                <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-400' : 'text-slate-600'}`} />
                <input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Search quests, modules, or week topics"
                  className={`w-full rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none ${isLight ? 'text-slate-900 placeholder:text-slate-400' : 'text-white placeholder:text-slate-600'}`}
                  style={{ background: isLight ? 'rgba(248,250,252,0.95)' : 'rgba(255,255,255,0.03)', border: isLight ? '1px solid rgba(100,116,139,0.18)' : '1px solid rgba(255,255,255,0.08)' }}
                />
              </div>
            </div>
          </div>
        )}
        {quests.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center mt-4" style={isLight ? { background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(100,116,139,0.16)' } : undefined}>
            <div className="text-4xl mb-4">🚧</div>
            <p className={isLight ? 'text-slate-700' : 'text-slate-500'}>Quests are being prepared. Check back soon!</p>
            <button onClick={() => navigate(`/c/${slug}`)}
              className="mt-6 px-5 py-2 rounded-xl text-sm font-bold text-white mx-auto block"
              style={{ background: `linear-gradient(135deg,${accent},${accent}cc)` }}>
              ← Back to {course.title}
            </button>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="rounded-2xl border p-10 text-center" style={{ background: isLight ? 'rgba(255,255,255,0.88)' : 'rgba(3,10,20,0.55)', borderColor: isLight ? 'rgba(100,116,139,0.16)' : 'rgba(255,255,255,0.08)' }}>
            <p className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>No matching quests</p>
            <p className={`text-xs mt-2 ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>Try a broader search term or clear the search box.</p>
          </div>
        ) : filteredGroups.map((group, gi) => {
          const mod = group.module;
          const offset = questIndexOffset(gi);
          const completedCount = group.quests.filter(q => completedMap[q.id]).length;
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
                  <h2 className={`font-orbitron text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {cleanDisplayTitle(mod?.title, 'General Quests')}
                  </h2>
                  {mod?.weekTitle && (
                    <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>{cleanDisplayTitle(mod.weekTitle, mod.weekTitle)}</p>
                  )}
                </div>
                {/* Progress */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-600'}`}>{completedCount}/{total}</span>
                  <div className="w-20 h-1.5 rounded-full" style={{ background: isLight ? 'rgba(148,163,184,0.22)' : 'rgba(255,255,255,0.08)' }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: total > 0 ? `${(completedCount / total) * 100}%` : '0%', background: mod?.color || accent }} />
                  </div>
                </div>
              </div>

              {/* Quest cards grid */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {group.quests.map((q, qi) => (
                  <QuestCard key={q.id} quest={q} index={offset + qi} slug={slug}
                    navigate={navigate} accent={mod?.color || accent} isLight={isLight} />
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
