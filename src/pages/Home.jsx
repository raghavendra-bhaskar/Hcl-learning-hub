import { useNavigate } from 'react-router-dom';
import { ChevronRight, Star, ArrowLeft, ExternalLink } from 'lucide-react';
import { buildHandoffUrl } from '../components/ExternalHandoff.jsx';

const AI_CERTIFICATION_URL = 'https://cnapp.prod.hclpnp.com/lms/course/index.php?categoryid=20';

export default function Home() {
  const navigate = useNavigate();

  const arsenalItems = [
    // ── Navigational cards (each goes to a unique page) ──────────────────────
    { icon: '🗺️', title: 'AI Transformation Path', desc: '6-week structured roadmap from AI Foundations to Intelligent Automation. 9 modules with curated videos, Udemy courses & workshops.', action: () => navigate('/learning-path'), highlight: true },
   
    { icon: '🎯', title: '21 AI Quests',        desc: 'Real-world scenarios covering GenAI, ML, NLP, Computer Vision, RAG, AI Security, Prompt Engineering, Python, APIs, and Docker across 5 learning paths.', action: () => navigate('/paths') },
    { icon: '🏆', title: 'Team Leaderboard',    desc: 'Compete with your team, track everyone\'s progress, and celebrate who earns the most XP this week.',            action: () => navigate('/leaderboard') },
    { icon: '🎨', title: 'Avatar & Commander', desc: 'Customize your commander — choose your character, skin tone, accessories, and color theme. Your identity in the arena.', action: () => navigate('/avatar') },
    // ── Feature info tiles (static — describe how the platform works) ────────
    { icon: '⚡', title: 'XP & Leveling',       desc: 'Earn XP for correct answers, level up from AI Rookie to AI Grandmaster, and unlock exclusive badges per quest completed.' },
    { icon: '💡', title: 'Expert Explanations', desc: 'Every answer includes a detailed expert explanation — learn why you were right or wrong to reinforce understanding.' },
    { icon: '🎭', title: 'Scenario-Based',      desc: 'Every question is framed as a real workplace scenario. Learn what to actually do, not just memorize definitions.' },
    {
      icon: '🎓',
      title: 'Get AI Certified',
      desc: 'Enroll for the assignment · take the examination · earn your official AI certificate in CNAPP LMS.',
      action: () => window.open(
        buildHandoffUrl(AI_CERTIFICATION_URL, { handoffType: 'certification-catalog', certificationId: 'ai-quest' }),
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
      {/* Back to Course Hub */}
      <div className="sticky top-0 z-40 backdrop-blur-md border-b border-white/5" style={{ background: 'rgba(3,10,20,0.88)' }}>
        <div className="max-w-6xl mx-auto px-4 h-11 flex items-center gap-3">
          <button
            onClick={() => navigate('/courses')}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-cyan-400 transition-colors"
          >
            <ArrowLeft size={13} />
            Course Hub
          </button>
          <span className="text-slate-700 text-xs">/</span>
          <span className="text-xs font-bold text-cyan-400 font-orbitron">AI Quest</span>
        </div>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-transparent to-violet-900/20 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 pt-16 pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-[12px] font-medium mb-6 animate-fade-in">
            <Star size={12} className="animate-pulse-slow" />
            Gamified AI Learning for Teams
          </div>

          <h1 className="font-orbitron text-3xl md:text-5xl font-black mb-6 animate-slide-up">
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
              AI QUEST
            </span>
          </h1>

          <p className="text-base md:text-xl text-slate-300 mb-4 max-w-3xl mx-auto animate-slide-up">
            Conquer <span className="text-cyan-400 font-semibold">21 AI learning quests</span> through real-world scenarios.
            Earn XP, unlock badges, and climb the leaderboard.
          </p>
          <p className="text-slate-500 text-[12px] mb-10 animate-fade-in">
            Generative AI • Machine Learning • MLOps • NLP • Computer Vision • LLM Architecture • RAG • AI Security • Prompt Engineering • Python • APIs • Docker
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <h2 className="font-orbitron text-2xl font-bold text-center mb-10 text-slate-200">
          Your Learning Arsenal
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {arsenalItems.map(f => {
            const isStatic = !f.action;
            const Wrapper = isStatic ? 'div' : 'button';
            const isViolet = f.accent === 'violet';
            const highlightBorder = isViolet ? 'border-violet-500/40 hover:border-violet-400/60' : 'border-cyan-500/40 hover:border-cyan-400/60';
            const highlightBg = isViolet
              ? { background: 'linear-gradient(135deg, rgba(139,92,246,0.10), rgba(217,70,239,0.06))' }
              : { background: 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(99,102,241,0.06))' };
            const highlightTitleHover = isViolet ? 'group-hover:text-violet-300' : 'group-hover:text-cyan-400';
            const highlightBadgeBg = isViolet ? 'rgba(139,92,246,0.15)' : 'rgba(6,182,212,0.15)';
            const highlightBadgeText = isViolet ? '#c4b5fd' : '#22d3ee';
            const highlightBadgeBorder = isViolet ? 'rgba(139,92,246,0.3)' : 'rgba(6,182,212,0.3)';
            const highlightCtaBg = isViolet ? 'rgba(139,92,246,0.15)' : 'rgba(6,182,212,0.15)';
            const highlightCtaBorder = isViolet ? 'rgba(139,92,246,0.35)' : 'rgba(6,182,212,0.35)';
            const highlightCtaText = isViolet ? '#c4b5fd' : '#22d3ee';
            return (
              <Wrapper
                key={f.title}
                onClick={isStatic ? undefined : f.action}
                className={`glass-card rounded-2xl p-6 border transition-all text-left ${
                  f.highlight
                    ? `glass-card-hover group active:scale-98 cursor-pointer ${highlightBorder} col-span-full md:col-span-3`
                    : isStatic
                    ? 'border-white/5 cursor-default opacity-80'
                    : 'glass-card-hover group active:scale-98 cursor-pointer border-white/5 hover:border-cyan-500/30'
                }`}
                style={f.highlight ? highlightBg : {}}
              >
                {f.highlight ? (
                  <div className="flex items-center gap-6">
                    <div className="text-5xl flex-shrink-0">{f.icon}</div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className={`font-orbitron font-bold text-white text-lg ${highlightTitleHover} transition-colors`}>{f.title}</h3>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-bold tracking-widest"
                          style={{ background: highlightBadgeBg, color: highlightBadgeText, border: `1px solid ${highlightBadgeBorder}` }}
                        >
                          {f.external ? 'CNAPP LMS' : 'NEW'}
                        </span>
                      </div>
                      <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                    </div>
                    <div
                      className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all group-hover:gap-3"
                      style={{ background: highlightCtaBg, border: `1px solid ${highlightCtaBorder}`, color: highlightCtaText }}
                    >
                      {f.external
                        ? (<>{f.cta || 'Open'} <ExternalLink size={14} className="transition-transform group-hover:translate-x-1" /></>)
                        : (<>{f.cta || 'Start Path'} <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" /></>)}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={`text-4xl mb-4 ${isStatic ? '' : ''}`}>{f.icon}</div>
                    <h3 className={`font-semibold text-white mb-2 flex items-center gap-2 ${isStatic ? '' : 'group-hover:text-cyan-400 transition-colors'}`}>
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
