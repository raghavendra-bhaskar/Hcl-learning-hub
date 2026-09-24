import { useNavigate } from 'react-router-dom';
import { Trophy, Map, ChevronRight, Star, ArrowLeft } from 'lucide-react';
import { buildHandoffUrl } from '../components/ExternalHandoff.jsx';

const DEVOPS_CERTIFICATION_URL = 'https://cnapp.prod.hclpnp.com/lms/course/index.php?categoryid=20';

export default function DevOpsHome() {
  const navigate = useNavigate();

  const arsenalItems = [
    {
      icon: '🗺️', title: 'DevOps Loop Learning Path', highlight: true,
      desc: '4-week structured roadmap from Loop Foundations to Value Stream Insights. 8 modules with curated IBM docs, O\'Reilly resources & live workshops.',
      action: () => navigate('/devops-loop/learning-path'),
    },
    {
      icon: '🎯', title: '21 DevOps Quests',
      desc: 'Real-world scenarios covering Loop Setup, Plan, Control, Build, Deploy, Test, Measure, and CNAPP installation across 6 learning paths.',
      action: () => navigate('/devops-loop/paths'),
    },
    {
      icon: '🏆', title: 'Team Leaderboard',
      desc: 'Compete with your team, track everyone\'s progress, and celebrate who earns the most XP this week.',
      action: () => navigate('/leaderboard'),
    },
    {
      icon: '🎨', title: 'Avatar & Commander',
      desc: 'Customize your commander — choose your character, skin tone, accessories, and color theme. Your identity in the arena.',
      action: () => navigate('/avatar'),
    },
    {
      icon: '⚡', title: 'XP & Leveling',
      desc: 'Earn XP for correct answers on every DevOps Loop quest. Each path contributes toward your total score and unlocks exclusive badges.',
    },
    {
      icon: '💡', title: 'Expert Explanations',
      desc: 'Every answer includes a detailed expert explanation drawn from IBM documentation — learn why you were right or wrong to reinforce understanding.',
    },
    {
      icon: '🎭', title: 'Scenario-Based',
      desc: 'Every question is framed as a real DevOps workplace scenario — installation issues, build failures, state transitions. Learn what to actually do.',
    },
    {
      icon: '🎓',
      title: 'Get DevOps Loop Certified',
      desc: 'Enroll for the assignment · take the examination · earn your official DevOps Loop certificate in CNAPP LMS.',
      action: () => window.open(
        buildHandoffUrl(DEVOPS_CERTIFICATION_URL, { handoffType: 'certification-catalog', certificationId: 'devops-loop' }),
        '_blank',
        'noopener,noreferrer',
      ),
      highlight: true,
      accent: 'violet',
      external: true,
      cta: 'Enroll · Assignment · Certify',
    },
  ];

  return (
    <div className="min-h-screen">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 backdrop-blur-md border-b border-white/5" style={{ background: 'rgba(3,10,20,0.88)' }}>
        <div className="max-w-6xl mx-auto px-4 h-11 flex items-center gap-3">
          <button
            onClick={() => navigate('/courses')}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-orange-400 transition-colors"
          >
            <ArrowLeft size={13} />
            Course Hub
          </button>
          <span className="text-slate-700 text-xs">/</span>
          <span className="text-xs font-bold text-orange-400 font-orbitron">DevOps Loop</span>
        </div>
      </div>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-900/20 via-transparent to-red-900/20 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 pt-16 pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-[12px] font-medium mb-6 animate-fade-in">
            <Star size={12} className="animate-pulse-slow" />
            Gamified DevOps Learning for Teams
          </div>

          <h1 className="font-orbitron text-4xl md:text-6xl font-black mb-6 animate-slide-up">
            <span className="bg-gradient-to-r from-orange-400 via-red-400 to-rose-400 bg-clip-text text-transparent">
              DEVOPS LOOP
            </span>
          </h1>

          <p className="text-base md:text-xl text-slate-300 mb-4 max-w-3xl mx-auto animate-slide-up">
            Conquer <span className="text-orange-400 font-semibold">21 DevOps Loop quests</span> through real-world IBM scenarios.
            Earn XP, unlock badges, and master the full CI/CD lifecycle.
          </p>
          <p className="text-slate-500 text-[12px] mb-10 animate-fade-in">
            DevOps Plan • DevOps Control • DevOps Build • DevOps Deploy • DevOps Test • DevOps Measure • CNAPP Installation • Value Streams
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-scale-in">
            <button
              onClick={() => navigate('/devops-loop/paths')}
              className="group flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-lg text-white hover:opacity-90 transition-all active:scale-95 shadow-lg"
              style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)', boxShadow: '0 8px 32px rgba(249,115,22,0.3)' }}
            >
              <Map size={20} />
              Continue Mission
              <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate('/leaderboard')}
              className="flex items-center gap-2 px-8 py-4 glass-card rounded-2xl font-bold text-lg hover:border-orange-500/30 transition-all"
            >
              <Trophy size={20} className="text-orange-400" />
              Leaderboard
            </button>
          </div>
        </div>
      </section>

      {/* ── Arsenal ────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <h2 className="font-orbitron text-2xl font-bold text-center mb-10 text-slate-200">
          Your DevOps Loop Arsenal
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {arsenalItems.map(f => {
            const isStatic = !f.action;
            const Wrapper = isStatic ? 'div' : 'button';
            return (
              <Wrapper
                key={f.title}
                onClick={isStatic ? undefined : f.action}
                className={`glass-card rounded-2xl p-6 border transition-all text-left ${
                  f.highlight
                    ? 'glass-card-hover group active:scale-98 cursor-pointer col-span-full md:col-span-3'
                    : isStatic
                    ? 'border-white/5 cursor-default opacity-80'
                    : 'glass-card-hover group active:scale-98 cursor-pointer border-white/5'
                }`}
                style={
                  f.highlight
                    ? { background: 'linear-gradient(135deg, rgba(249,115,22,0.08), rgba(239,68,68,0.06))', borderColor: 'rgba(249,115,22,0.4)' }
                    : !isStatic
                    ? {}
                    : {}
                }
              >
                {f.highlight ? (
                  <div className="flex items-center gap-6">
                    <div className="text-5xl flex-shrink-0">{f.icon}</div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-orbitron font-bold text-white text-lg group-hover:text-orange-400 transition-colors">{f.title}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold tracking-widest" style={{ background: 'rgba(249,115,22,0.15)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.3)' }}>NEW</span>
                      </div>
                      <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all group-hover:gap-3" style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.35)', color: '#fb923c' }}>
                      Start Path <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-4xl mb-4">{f.icon}</div>
                    <h3 className={`font-semibold text-white mb-2 flex items-center gap-2 ${isStatic ? '' : 'group-hover:text-orange-400 transition-colors'}`}>
                      {f.title}
                      {!isStatic && <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" />}
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                    {isStatic && <p className="text-xs text-slate-600 mt-3 italic">Platform feature</p>}
                  </>
                )}
              </Wrapper>
            );
          })}
        </div>
      </section>

    </div>
  );
}
