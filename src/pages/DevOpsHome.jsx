import { useNavigate } from 'react-router-dom';
import { ChevronRight, Star, ArrowLeft } from 'lucide-react';
import { useAppStore } from '../App.jsx';

export default function DevOpsHome() {
  const navigate = useNavigate();
  const { theme } = useAppStore();
  const isLight = theme === 'light';

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
  ];

  return (
    <div className="min-h-screen" style={{ background: isLight ? 'linear-gradient(160deg, #fff7ed 0%, #fef3eb 50%, #fff1f2 100%)' : undefined }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 backdrop-blur-md border-b" style={{ background: isLight ? 'rgba(203,213,225,0.94)' : 'rgba(3,10,20,0.88)', borderColor: isLight ? 'rgba(71,85,105,0.22)' : 'rgba(255,255,255,0.05)' }}>
        <div className="max-w-6xl mx-auto px-4 h-11 flex items-center gap-3">
          <button
            onClick={() => navigate('/courses')}
            className={`flex items-center gap-1.5 text-xs transition-colors ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-500 hover:text-orange-400'}`}
          >
            <ArrowLeft size={13} />
            Course Hub
          </button>
          <span className="text-slate-700 text-xs">/</span>
          <span className="text-xs font-bold text-orange-400 font-orbitron">DevOps Loop</span>
        </div>
      </div>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
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

      {/* ── Arsenal ────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <h2 className={`font-orbitron text-xl md:text-2xl font-bold text-center mb-10 ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
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
                    ? 'cursor-default opacity-80'
                    : 'glass-card-hover group active:scale-98 cursor-pointer'
                }`}
                style={
                  f.highlight
                    ? { background: isLight ? 'linear-gradient(135deg,rgba(249,115,22,0.10),rgba(239,68,68,0.07))' : 'linear-gradient(135deg, rgba(249,115,22,0.08), rgba(239,68,68,0.06))', borderColor: isLight ? 'rgba(249,115,22,0.28)' : 'rgba(249,115,22,0.4)' }
                    : { borderColor: isLight ? 'rgba(100,116,139,0.18)' : 'rgba(255,255,255,0.05)' }
                }
              >
                {f.highlight ? (
                  <div className="flex items-center gap-6">
                    <div className="text-5xl flex-shrink-0">{f.icon}</div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className={`font-orbitron font-bold text-base md:text-lg transition-colors ${isLight ? 'text-slate-900' : 'text-white'} group-hover:text-orange-400`}>{f.title}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold tracking-widest" style={{ background: 'rgba(249,115,22,0.15)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.3)' }}>NEW</span>
                      </div>
                      <p className={`text-sm leading-relaxed ${isLight ? 'text-slate-800' : 'text-slate-400'}`}>{f.desc}</p>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all group-hover:gap-3"
                      style={{ background: isLight ? '#c2410c' : 'rgba(249,115,22,0.15)', border: `1px solid ${isLight ? '#c2410c' : 'rgba(249,115,22,0.35)'}`, color: isLight ? '#ffffff' : '#fb923c' }}>
                      Start Path <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-4xl mb-4">{f.icon}</div>
                    <h3 className={`font-semibold mb-2 flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'} ${isStatic ? '' : 'group-hover:text-orange-400 transition-colors'}`}>
                      {f.title}
                      {!isStatic && <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" />}
                    </h3>
                    <p className={`text-sm leading-relaxed ${isLight ? 'text-slate-800' : 'text-slate-400'}`}>{f.desc}</p>
                    {isStatic && <p className={`text-xs mt-3 italic ${isLight ? 'text-slate-700' : 'text-slate-600'}`}>Platform feature</p>}
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
