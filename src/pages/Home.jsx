import { useNavigate } from 'react-router-dom';
import { ChevronRight, Star, ArrowLeft } from 'lucide-react';
import { useAppStore } from '../App.jsx';

export default function Home() {
  const navigate = useNavigate();
  const { theme } = useAppStore();
  const isLight = theme === 'light';

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
  ];

  return (
    <div className="min-h-screen" style={{ background: isLight ? 'linear-gradient(160deg, #f0f9ff 0%, #e8f4fd 50%, #f5f0ff 100%)' : undefined }}>
      {/* Back to Course Hub */}
      <div className="sticky top-0 z-40 backdrop-blur-md border-b" style={{ background: isLight ? 'rgba(203,213,225,0.94)' : 'rgba(3,10,20,0.88)', borderColor: isLight ? 'rgba(71,85,105,0.22)' : 'rgba(255,255,255,0.05)' }}>
        <div className="max-w-6xl mx-auto px-4 h-11 flex items-center gap-3">
          <button
            onClick={() => navigate('/courses')}
            className={`flex items-center gap-1.5 text-xs transition-colors ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-500 hover:text-cyan-400'}`}
          >
            <ArrowLeft size={13} />
            Course Hub
          </button>
          <span className="text-slate-700 text-xs">/</span>
          <span className="text-xs font-bold text-cyan-400 font-orbitron">AI Quest</span>
        </div>
      </div>

      {/* Hero */}
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

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <h2 className={`font-orbitron text-xl md:text-2xl font-bold text-center mb-10 ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
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
            const highlightCtaBg    = isLight ? (isViolet ? '#7c3aed' : '#0891b2') : (isViolet ? 'rgba(139,92,246,0.15)' : 'rgba(6,182,212,0.15)');
            const highlightCtaBorder = isLight ? (isViolet ? '#7c3aed' : '#0891b2') : (isViolet ? 'rgba(139,92,246,0.35)' : 'rgba(6,182,212,0.35)');
            const highlightCtaText   = isLight ? '#ffffff' : (isViolet ? '#c4b5fd' : '#22d3ee');
            return (
              <Wrapper
                key={f.title}
                onClick={isStatic ? undefined : f.action}
                className={`glass-card rounded-2xl p-6 border transition-all text-left ${
                  f.highlight
                    ? `glass-card-hover group active:scale-98 cursor-pointer ${highlightBorder} col-span-full md:col-span-3`
                    : isStatic
                    ? 'cursor-default opacity-80'
                    : 'glass-card-hover group active:scale-98 cursor-pointer hover:border-cyan-500/30'
                }`}
                style={f.highlight
                  ? { background: isLight ? 'linear-gradient(135deg,rgba(6,182,212,0.10),rgba(99,102,241,0.08))' : highlightBg.background, borderColor: isLight ? 'rgba(6,182,212,0.28)' : 'rgba(6,182,212,0.3)' }
                  : { borderColor: isLight ? 'rgba(100,116,139,0.18)' : 'rgba(255,255,255,0.05)' }}
              >
                {f.highlight ? (
                  <div className="flex items-center gap-6">
                    <div className="text-5xl flex-shrink-0">{f.icon}</div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className={`font-orbitron font-bold text-base md:text-lg ${isLight ? 'text-slate-900' : 'text-white'} ${highlightTitleHover} transition-colors`}>{f.title}</h3>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-bold tracking-widest"
                          style={{ background: highlightBadgeBg, color: highlightBadgeText, border: `1px solid ${highlightBadgeBorder}` }}
                        >
                          {f.external ? 'CNAPP LMS' : 'NEW'}
                        </span>
                      </div>
                      <p className={`text-sm leading-relaxed ${isLight ? 'text-slate-800' : 'text-slate-400'}`}>{f.desc}</p>
                    </div>
                    <div
                      className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all group-hover:gap-3"
                      style={{ background: highlightCtaBg, border: `1px solid ${highlightCtaBorder}`, color: highlightCtaText }}
                    >
                      {f.cta || 'Start Path'} <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={`text-4xl mb-4 ${isStatic ? '' : ''}`}>{f.icon}</div>
                    <h3 className={`font-semibold mb-2 flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'} ${isStatic ? '' : 'group-hover:text-cyan-400 transition-colors'}`}>
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
