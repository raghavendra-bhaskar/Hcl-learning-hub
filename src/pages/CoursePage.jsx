import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, Star, ArrowLeft, Pencil, BookOpen, Target, Clock } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAppStore } from '../App.jsx';

function getDifficulty(xp) {
  if (xp < 150) return { label: 'Beginner', color: '#10b981' };
  if (xp < 225) return { label: 'Intermediate', color: '#f59e0b' };
  return { label: 'Advanced', color: '#ef4444' };
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

function QuestCard({ quest, index, slug, navigate, accent, isLight, isCompleted }) {
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
          {isCompleted && <span className="text-[10px] font-bold text-emerald-500">Completed</span>}
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

// Shared course landing page for database-backed courses.
export default function CoursePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { theme, courseCompletedQuests } = useAppStore();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quests, setQuests] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const c = await api.get(`/courses-api/${slug}`);
        setCourse(c);
        const q = await api.get(`/courses-api/${c.id}/quests`);
        setQuests(Array.isArray(q) ? q : []);
      } catch (e) {
        setError(e?.message || 'Course not found');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white/20 border-t-cyan-400 rounded-full animate-spin" />
    </div>
  );

  if (error || !course) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="max-w-lg rounded-2xl border border-red-500/20 bg-red-500/5 px-6 py-5">
        <p className="text-red-300 font-semibold">{error || 'Course not found'}</p>
        <p className="text-slate-500 text-xs mt-2">The course could not be loaded. Check your session and API connection, then try again.</p>
      </div>
      <button onClick={() => navigate('/courses')} className="text-cyan-400 hover:text-cyan-300 text-sm">← Back to Course Hub</button>
    </div>
  );

  const accent      = course.accentColor || '#06b6d4';
  const canEdit     = Boolean(course.canEdit);
  const isLight     = theme === 'light';
  const moduleCount = course.weeks?.reduce((a, w) => a + (w.modules?.length || 0), 0) || 0;
  const weekCount   = course.weeks?.length || 0;
  const questCount  = quests.length || course._count?.quests || 0;
  const completedMap = courseCompletedQuests?.[slug] || {};
  const completedTotal = quests.filter(quest => completedMap[quest.id]).length;
  const heroTitleClass = course.title.length > 24
    ? 'font-orbitron text-xl md:text-3xl font-black mb-5 animate-slide-up leading-[0.98]'
    : 'font-orbitron text-2xl md:text-4xl font-black mb-5 animate-slide-up';

  const accentBg  = { background: accent + '18', border: `1px solid ${accent}35` };

  return (
    <div className="min-h-screen" style={{ background: isLight ? `linear-gradient(160deg, #f0f9ff 0%, #f8fafc 60%, ${accent}08 100%)` : undefined }}>
      {/* Context header for going back, returning to the Course Hub, and editing when permitted. */}
      <div className="sticky top-0 z-40 backdrop-blur-md border-b" style={{ background: isLight ? 'rgba(248,250,252,0.97)' : 'rgba(3,10,20,0.88)', borderColor: isLight ? 'rgba(100,116,139,0.18)' : 'rgba(255,255,255,0.05)' }}>
        <div className="max-w-6xl mx-auto px-4 h-11 flex items-center gap-3">
          <button onClick={() => navigate('/courses')}
            className={`flex items-center gap-1.5 text-xs transition-colors ${isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-500 hover:text-white'}`}>
            <ArrowLeft size={13} /> Back
          </button>
          <span className="text-slate-700 text-xs">/</span>
          <span className="text-xs font-bold font-orbitron" style={{ color: accent }}>{course.title}</span>
          <button onClick={() => navigate(`/c/${slug}`)}
            className={`ml-auto px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors border ${isLight ? 'text-slate-700 hover:text-slate-900' : 'text-slate-300 hover:text-white'}`}
            style={{ borderColor: isLight ? 'rgba(148,163,184,0.22)' : 'rgba(255,255,255,0.08)' }}>
            Course Home
          </button>
          {canEdit && (
            <button onClick={() => navigate(`/admin/courses/${course.slug}/edit`)}
              className={`flex items-center gap-1.5 text-[11px] transition-colors border rounded-lg px-2.5 py-1 ${isLight ? 'text-slate-600 hover:text-cyan-600' : 'text-slate-600 hover:text-cyan-400'}`}
              style={{ borderColor: isLight ? 'rgba(148,163,184,0.22)' : 'rgba(255,255,255,0.08)' }}>
              <Pencil size={11} /> Edit Course
            </button>
          )}
        </div>
      </div>

      {/* Hero section summarizing the selected course and its content footprint. */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at top, ${accent}18 0%, transparent 65%)` }} />
        <div className="max-w-6xl mx-auto px-4 pt-14 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-[12px] font-medium mb-6"
            style={{ ...accentBg, color: accent }}>
            <Star size={12} className="animate-pulse-slow" />
            {course.tagline || `${course.title} Mission`}
          </div>

          <h1 className={heroTitleClass}>
            <span style={{ background: `linear-gradient(135deg, ${accent}, ${accent}99)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {course.title.toUpperCase()}
            </span>
          </h1>

          {course.description && (
            <p className={`text-sm md:text-lg mb-4 max-w-3xl mx-auto ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
              {course.description}
            </p>
          )}
          <p className="text-slate-500 mb-2">
            {weekCount} Week{weekCount !== 1 ? 's' : ''} · {moduleCount} Module{moduleCount !== 1 ? 's' : ''} · {questCount} Quest{questCount !== 1 ? 's' : ''}
          </p>
          <p className="text-slate-500 text-sm">
            {completedTotal}/{questCount} quest{questCount !== 1 ? 's' : ''} completed
          </p>
        </div>
      </section>

      {/* Main content area with the course learning path shortcut and course quest cards. */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="max-w-5xl mx-auto">
          <h2 className={`font-orbitron text-xl md:text-2xl font-bold text-center mb-10 ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
            {course.title} Learning Path
          </h2>

          {weekCount === 0 && canEdit && (
            <div className="glass-card rounded-2xl p-6 mb-6 flex items-center gap-4 border"
              style={{ borderColor: accent + '30', background: isLight ? accent + '10' : accent + '06' }}>
              <div className="text-3xl">🚧</div>
              <div className="flex-1">
                <p className={`font-semibold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>Course content is empty</p>
                <p className="text-slate-500 text-xs mt-0.5">Add weeks, modules, topics, and resources to this course</p>
              </div>
              <button onClick={() => navigate(`/admin/courses/${course.slug}/edit`)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#06b6d4,#7c3aed)' }}>
                <Pencil size={13} /> Add Content
              </button>
            </div>
          )}

          <button onClick={() => navigate(`/c/${slug}/learning-path`)}
            className="w-full glass-card rounded-2xl p-6 border text-left transition-all group glass-card-hover active:scale-[0.99]"
            style={{ background: isLight ? accent + '12' : accent + '08', borderColor: isLight ? accent + '35' : accent + '50' }}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
              <div className="flex items-center gap-5 flex-1 min-w-0">
                <div className="text-5xl flex-shrink-0">🗺️</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className={`font-orbitron font-bold text-lg ${isLight ? 'text-slate-900' : 'text-white'}`}>{course.title} Learning Path</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ ...accentBg, color: accent }}>NEW</span>
                  </div>
                  <p className={`text-sm leading-relaxed ${isLight ? 'text-slate-800' : 'text-slate-400'}`}>
                    {weekCount}-week structured roadmap. {moduleCount} modules with curated resources, topics, and hands-on exercises.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap lg:justify-end">
                <span className="text-[11px] px-3 py-1 rounded-full font-bold" style={{ ...accentBg, color: accent }}>
                  {weekCount} Week{weekCount !== 1 ? 's' : ''}
                </span>
                <span className="text-[11px] px-3 py-1 rounded-full font-bold" style={{ ...accentBg, color: accent }}>
                  {moduleCount} Module{moduleCount !== 1 ? 's' : ''}
                </span>
                <div className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all"
                  style={isLight ? { background: accent, color: '#ffffff', border: `1px solid ${accent}` } : { ...accentBg, color: accent }}>
                  Start Path <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </button>
        </div>

        <div className="max-w-6xl mx-auto mt-14">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
            <div>
              <h2 className={`font-orbitron text-xl md:text-2xl font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                {course.title} Quests
              </h2>
              <p className={`text-sm mt-2 ${isLight ? 'text-slate-700' : 'text-slate-500'}`}>
                {questCount > 0
                  ? `${completedTotal}/${questCount} quests completed. Practice directly from this page.`
                  : 'Quests are being prepared for this course.'}
              </p>
            </div>
          </div>

          {questCount === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center" style={isLight ? { background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(100,116,139,0.16)' } : undefined}>
              <div className="text-4xl mb-4">🚧</div>
              <p className={isLight ? 'text-slate-700' : 'text-slate-500'}>Quests are being prepared. Check back soon!</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {quests.map((quest, index) => (
                <QuestCard key={quest.id} quest={quest} index={index} slug={slug}
                  navigate={navigate} accent={accent} isLight={isLight} isCompleted={Boolean(completedMap[quest.id])} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
