import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, Star, ArrowLeft, Pencil } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAppStore } from '../App.jsx';

export default function CoursePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { theme } = useAppStore();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [questCount, setQuestCount] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const c = await api.get(`/courses-api/${slug}`);
        setCourse(c);
        setQuestCount(c._count?.quests ?? 0);
      } catch (e) { setError(e?.message || 'Course not found'); }
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
  const heroTitleClass = course.title.length > 24
    ? 'font-orbitron text-xl md:text-3xl font-black mb-5 animate-slide-up leading-[0.98]'
    : 'font-orbitron text-2xl md:text-4xl font-black mb-5 animate-slide-up';

  const accentBg  = { background: accent + '18', border: `1px solid ${accent}35` };

  const arsenal = [
    {
      icon: '🗺️', title: `${course.title} Learning Path`, highlight: true,
      desc: `${weekCount}-week structured roadmap. ${moduleCount} modules with curated resources, topics, and hands-on exercises.`,
      action: () => navigate(`/c/${slug}/learning-path`),
      cta: 'Start Path',
    },
    {
      icon: '🎯', title: `${questCount} ${course.title} Quests`,
      desc: questCount > 0
        ? `Scenario-based questions across ${weekCount} week${weekCount !== 1 ? 's' : ''} of the ${course.title} course. Earn XP and unlock badges.`
        : 'Quests are being prepared — check back soon. Earn XP and badges as you complete them.',
      action: questCount > 0 ? () => navigate(`/c/${slug}/quests`) : undefined,
    },
    {
      icon: '🏆', title: 'Team Leaderboard',
      desc: 'Compete with your team, track everyone\'s progress, and celebrate who earns the most XP this week.',
      action: () => navigate('/leaderboard'),
    },
    {
      icon: '🎨', title: 'Avatar & Commander',
      desc: 'Customize your commander and make your identity your own in the learning arena.',
      action: () => navigate('/avatar'),
    },
    {
      icon: '⚡', title: 'XP & Leveling',
      desc: `Earn XP for correct answers on every ${course.title} quest. Each path contributes toward your total score and unlocks exclusive badges.`,
    },
    {
      icon: '💡', title: 'Expert Explanations',
      desc: 'Every answer includes a detailed expert explanation drawn from official documentation — learn why you were right or wrong.',
    },
    {
      icon: '🎭', title: 'Scenario-Based',
      desc: 'Every question is framed as a real workplace scenario so you learn what to do, not just definitions.',
    },
  ];
  return (
    <div className="min-h-screen" style={{ background: isLight ? `linear-gradient(160deg, #f0f9ff 0%, #f8fafc 60%, ${accent}08 100%)` : undefined }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 backdrop-blur-md border-b" style={{ background: isLight ? 'rgba(248,250,252,0.97)' : 'rgba(3,10,20,0.88)', borderColor: isLight ? 'rgba(100,116,139,0.18)' : 'rgba(255,255,255,0.05)' }}>
        <div className="max-w-6xl mx-auto px-4 h-11 flex items-center gap-3">
          <button onClick={() => navigate('/courses')}
            className={`flex items-center gap-1.5 text-xs transition-colors ${isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-500 hover:text-white'}`}>
            <ArrowLeft size={13} /> Course Hub
          </button>
          <span className="text-slate-700 text-xs">/</span>
          <span className="text-xs font-bold font-orbitron" style={{ color: accent }}>{course.title}</span>
          {canEdit && (
            <button onClick={() => navigate(`/admin/courses/${course.slug}/edit`)}
              className={`ml-auto flex items-center gap-1.5 text-[11px] transition-colors border rounded-lg px-2.5 py-1 ${isLight ? 'text-slate-600 hover:text-cyan-600' : 'text-slate-600 hover:text-cyan-400'}`}
              style={{ borderColor: isLight ? 'rgba(148,163,184,0.22)' : 'rgba(255,255,255,0.08)' }}>
              <Pencil size={11} /> Edit Course
            </button>
          )}
        </div>
      </div>

      {/* ── Mission Hero ─────────────────────────────────────────────────── */}
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
        </div>
      </section>

      {/* ── Arsenal ──────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <h2 className={`font-orbitron text-xl md:text-2xl font-bold text-center mb-10 ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
          {course.title} Arsenal
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

        <div className="grid md:grid-cols-3 gap-6">
          {arsenal.map(f => {
            const isStatic = !f.action;
            const Tag = isStatic ? 'div' : 'button';
            return (
              <Tag key={f.title} onClick={isStatic ? undefined : f.action}
                className={`glass-card rounded-2xl p-6 border text-left transition-all ${
                  f.highlight
                    ? 'col-span-full md:col-span-3 group cursor-pointer glass-card-hover active:scale-[0.99]'
                    : isStatic
                    ? 'cursor-default opacity-80'
                    : 'glass-card-hover group cursor-pointer active:scale-[0.99]'
                }`}
                style={f.highlight
                  ? { background: isLight ? accent + '12' : accent + '08', borderColor: isLight ? accent + '35' : accent + '50' }
                  : { borderColor: isLight ? 'rgba(100,116,139,0.18)' : 'rgba(255,255,255,0.05)' }}>
                {f.highlight ? (
                  <div className="flex items-center gap-6">
                    <div className="text-5xl flex-shrink-0">{f.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className={`font-orbitron font-bold text-lg ${isLight ? 'text-slate-900' : 'text-white'}`}>{f.title}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ ...accentBg, color: accent }}>NEW</span>
                      </div>
                      <p className={`text-sm leading-relaxed ${isLight ? 'text-slate-800' : 'text-slate-400'}`}>{f.desc}</p>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all"
                      style={isLight ? { background: accent, color: '#ffffff', border: `1px solid ${accent}` } : { ...accentBg, color: accent }}>
                      {f.cta || 'Start'} <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-4xl mb-4">{f.icon}</div>
                    <h3 className={`font-semibold mb-2 flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'} ${!isStatic ? 'group-hover:text-cyan-400 transition-colors' : ''}`}
                      style={!isStatic ? {} : {}}>
                      {f.title}
                      {!isStatic && <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />}
                    </h3>
                    <p className={`text-sm leading-relaxed ${isLight ? 'text-slate-800' : 'text-slate-400'}`}>{f.desc}</p>
                    {isStatic && <p className={`text-xs mt-3 italic ${isLight ? 'text-slate-700' : 'text-slate-600'}`}>Platform feature</p>}
                  </>
                )}
              </Tag>
            );
          })}
        </div>
      </section>
    </div>
  );
}
