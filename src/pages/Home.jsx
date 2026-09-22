import { useNavigate } from 'react-router-dom';
import { Trophy, Map, ChevronRight, Star, UserCircle, ArrowLeft, GraduationCap, ExternalLink } from 'lucide-react';
import { useAppStore } from '../App.jsx';
import { QUESTS } from '../data/index.js';
import XPBar from '../components/XPBar.jsx';
import AvatarDisplay from '../components/AvatarDisplay.jsx';
import { buildHandoffUrl } from '../components/ExternalHandoff.jsx';

const AI_CERTIFICATION_URL = 'https://cnapp.prod.hclpnp.com/lms/course/index.php?categoryid=20';

export default function Home() {
  const navigate = useNavigate();
  const { playerName, avatar, totalXP, earnedBadges, completedQuests, levelInfo } = useAppStore();
  const isSetup = !!playerName;

  const completedCount = Object.keys(completedQuests).length;
  const progressPct = Math.round((completedCount / QUESTS.length) * 100);

  const stats = [
    { label: 'Quests Completed', value: `${completedCount} / ${QUESTS.length}`, icon: '⚔️' },
    { label: 'Total XP Earned', value: totalXP.toLocaleString(), icon: '⚡' },
    { label: 'Badges Earned', value: earnedBadges.length, icon: '🏅' },
    { label: 'Completion', value: `${progressPct}%`, icon: '🎯' },
  ];

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
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-sm font-medium mb-6 animate-fade-in">
            <Star size={14} className="animate-pulse-slow" />
            Gamified AI Learning for Teams
          </div>

          <h1 className="font-orbitron text-5xl md:text-7xl font-black mb-6 animate-slide-up">
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
              AI QUEST
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-slate-300 mb-4 max-w-3xl mx-auto animate-slide-up">
            Conquer <span className="text-cyan-400 font-semibold">21 AI learning quests</span> through real-world scenarios.
            Earn XP, unlock badges, and climb the leaderboard.
          </p>
          <p className="text-slate-500 mb-10 animate-fade-in">
            Generative AI • Machine Learning • MLOps • NLP • Computer Vision • LLM Architecture • RAG • AI Security • Prompt Engineering • Python • APIs • Docker
          </p>

          {!isSetup ? (
            <div className="flex flex-col items-center gap-4 animate-scale-in">
              <p className="text-slate-400 text-sm">Create your commander to begin the mission</p>
              <button
                onClick={() => navigate('/avatar')}
                className="group flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-violet-500 rounded-2xl font-bold text-lg text-white hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-cyan-500/25"
              >
                <UserCircle size={22} />
                Create Your Commander
                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-scale-in">
              <button
                onClick={() => navigate('/paths')}
                className="group flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl font-bold text-lg text-white hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-cyan-500/25"
              >
                <Map size={20} />
                Continue Mission
                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => navigate('/leaderboard')}
                className="flex items-center gap-2 px-8 py-4 glass-card rounded-2xl font-bold text-lg hover:border-yellow-500/30 transition-all"
              >
                <Trophy size={20} className="text-yellow-400" />
                Leaderboard
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Stats */}
      {isSetup && (
        <section className="max-w-6xl mx-auto px-4 pb-12">
          <div className="glass-card rounded-2xl p-6 mb-8 neon-blue">
            <div className="flex items-center gap-4 mb-4">
              {avatar && <AvatarDisplay avatar={avatar} size="lg" />}
              <div className="flex-1">
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Commander</p>
                <h2 className="font-orbitron font-bold text-xl text-white">{playerName}</h2>
                <p className="text-sm text-slate-400">{levelInfo.icon} {levelInfo.title} — Level {levelInfo.level}</p>
              </div>
              <button onClick={() => navigate('/avatar')} className="text-xs text-slate-500 hover:text-cyan-400 transition-colors border border-white/10 rounded-lg px-3 py-1.5 hover:border-cyan-500/30">
                Edit Avatar
              </button>
            </div>
            <XPBar xp={totalXP} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {stats.map(stat => (
              <div key={stat.label} className="glass-card rounded-xl p-5 text-center">
                <div className="text-3xl mb-2">{stat.icon}</div>
                <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-xs text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

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

      {/* CTA */}
      {!isSetup && (
        <section className="max-w-6xl mx-auto px-4 pb-20 text-center">
          <div className="glass-card rounded-3xl p-12 border border-cyan-500/10">
            <div className="text-5xl mb-4">🚀</div>
            <h2 className="font-orbitron text-3xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
              Ready to Launch?
            </h2>
            <p className="text-slate-400 mb-8 max-w-xl mx-auto">
              Join your team and master AI through adventure. Each quest takes 8-20 minutes and teaches real skills you can apply immediately.
            </p>
            <button
              onClick={() => navigate('/avatar')}
              className="flex items-center gap-2 mx-auto px-8 py-4 bg-gradient-to-r from-cyan-500 to-violet-500 rounded-2xl font-bold text-white hover:opacity-90 transition-all"
            >
              <UserCircle size={20} />
              Create Your Commander
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
