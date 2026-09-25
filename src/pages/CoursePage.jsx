import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, Star, ArrowLeft, Pencil, ExternalLink } from 'lucide-react';
import { getAuth } from './LoginPage.jsx';
import { api } from '../lib/api.js';
import { buildHandoffUrl } from '../components/ExternalHandoff.jsx';

const CERTIFICATION_CATALOG_URL = 'https://cnapp.prod.hclpnp.com/lms/course/index.php?categoryid=20';

export default function CoursePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const auth = getAuth();
  const isAdmin = auth?.role === 'ADMIN';

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
  const moduleCount = course.weeks?.reduce((a, w) => a + (w.modules?.length || 0), 0) || 0;
  const weekCount   = course.weeks?.length || 0;
  const heroTitleClass = course.title.length > 24
    ? 'font-orbitron text-2xl md:text-4xl font-black mb-6 animate-slide-up leading-[0.95]'
    : 'font-orbitron text-3xl md:text-5xl font-black mb-6 animate-slide-up';

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

  const certificationUrl = buildHandoffUrl(CERTIFICATION_CATALOG_URL, {
    handoffType: 'certification-catalog', certificationId: course.slug,
  });

  return (
    <div className="min-h-screen">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 backdrop-blur-md border-b border-white/5" style={{ background: 'rgba(3,10,20,0.88)' }}>
        <div className="max-w-6xl mx-auto px-4 h-11 flex items-center gap-3">
          <button onClick={() => navigate('/courses')}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors">
            <ArrowLeft size={13} /> Course Hub
          </button>
          <span className="text-slate-700 text-xs">/</span>
          <span className="text-xs font-bold font-orbitron" style={{ color: accent }}>{course.title}</span>
          {isAdmin && (
            <button onClick={() => navigate(`/admin/courses/${course.slug}/edit`)}
              className="ml-auto flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-cyan-400 transition-colors border border-white/8 rounded-lg px-2.5 py-1">
              <Pencil size={11} /> Edit Course
            </button>
          )}
        </div>
      </div>

      {/* ── Mission Hero ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at top, ${accent}18 0%, transparent 65%)` }} />
        <div className="max-w-6xl mx-auto px-4 pt-16 pb-20 text-center">
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
            <p className="text-base md:text-xl text-slate-300 mb-4 max-w-3xl mx-auto">
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
        <h2 className="font-orbitron text-xl md:text-2xl font-bold text-center mb-10 text-slate-200">
          {course.title} Arsenal
        </h2>

        {weekCount === 0 && isAdmin && (
          <div className="glass-card rounded-2xl p-6 mb-6 flex items-center gap-4 border"
            style={{ borderColor: accent + '30', background: accent + '06' }}>
            <div className="text-3xl">🚧</div>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">Course content is empty</p>
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
                    ? 'border-white/5 cursor-default opacity-80'
                    : 'glass-card-hover group cursor-pointer active:scale-[0.99] border-white/5'
                }`}
                style={f.highlight ? { background: accent + '08', borderColor: accent + '50' } : {}}>
                {f.highlight ? (
                  <div className="flex items-center gap-6">
                    <div className="text-5xl flex-shrink-0">{f.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-orbitron font-bold text-white text-lg">{f.title}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ ...accentBg, color: accent }}>NEW</span>
                      </div>
                      <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all"
                      style={{ ...accentBg, color: accent }}>
                      {f.cta || 'Start'} <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-4xl mb-4">{f.icon}</div>
                    <h3 className={`font-semibold text-white mb-2 flex items-center gap-2 ${!isStatic ? 'group-hover:text-cyan-400 transition-colors' : ''}`}
                      style={!isStatic ? {} : {}}>
                      {f.title}
                      {!isStatic && <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />}
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                    {isStatic && <p className="text-xs text-slate-600 mt-3 italic">Platform feature</p>}
                  </>
                )}
              </Tag>
            );
          })}
        </div>

        <a href={certificationUrl} target="_blank" rel="noopener noreferrer"
          className="mt-6 flex items-center gap-5 rounded-2xl p-6 border transition-all hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(6,182,212,0.06))', borderColor: 'rgba(139,92,246,0.35)' }}>
          <div className="text-4xl flex-shrink-0">🎓</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-orbitron font-bold text-white text-lg">Get {course.title} Certified</h3>
            <p className="text-slate-400 text-sm leading-relaxed mt-1">Enroll for the assignment, take the examination, and earn your official {course.title} certificate in CNAPP LMS.</p>
          </div>
          <span className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-violet-200 border border-violet-400/30 bg-violet-500/10 flex-shrink-0">
            Certify <ExternalLink size={14} />
          </span>
        </a>
      </section>
    </div>
  );
}
