import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, MessageCircleQuestion, Settings } from 'lucide-react';
import { getAuth } from '../pages/LoginPage.jsx';
import { api } from '../lib/api.js';

const DEFAULTS = {
  moderatorName:  'Raghavendra B',
  moderatorTitle: 'AI Transformation Moderator · HCL Software',
  moderatorEmail: 'raghavendrab@hcl-software.com',
  genericUrl:      'https://chat.google.com/room/AAAAE-llN3w?cls=7',
  genericName:     'HCL Software — General Help Space',
  genericHint:     'Any generic issues, login problems, or platform questions',
  aiQuestUrl:      'https://chat.google.com/room/AAQAKyozwQ8?cls=7',
  aiQuestName:     'HCL Software Support AI Hackathon 2026',
  aiQuestHint:     'AI Quest questions, quests, curriculum & workshops',
  devopsUrl:       'https://chat.google.com/room/AAAA0fg_fTQ?cls=7',
  devopsName:      'DevOps Loop Support',
  devopsHint:      'DevOps Loop questions, installation, quests & curriculum',
};

const AI_QUEST_PATHS = [
  '/ai-quest', '/paths', '/quest', '/quiz',
  '/results', '/leaderboard', '/solution', '/learning-path',
];

const DEVOPS_LOOP_PATHS_PREFIXES = [
  '/devops-loop',
];

export default function HelpButton() {
  const [open, setOpen] = useState(false);
  const [cfg, setCfg]   = useState(DEFAULTS);
  const location = useLocation();
  const navigate  = useNavigate();
  const auth = getAuth();
  const isAdmin = auth?.role === 'ADMIN';

  // Resolve slug: /c/:slug routes or platform routes
  const dbCourseSlugMatch = location.pathname.match(/^\/c\/([^/]+)/);
  const dbCourseSlug = dbCourseSlugMatch ? dbCourseSlugMatch[1]
    : location.pathname.startsWith('/devops-loop') ? 'devops-loop'
    : location.pathname === '/ai-quest' || location.pathname.startsWith('/ai-quest/') ? 'ai-quest'
    : null;

  useEffect(() => {
    api.get('/settings').then(s => {
      if (!s || typeof s !== 'object') return;
      setCfg({
        moderatorName:  s['help.instructor.name']  || DEFAULTS.moderatorName,
        moderatorTitle: s['help.instructor.title'] || DEFAULTS.moderatorTitle,
        moderatorEmail: s['help.instructor.email'] || DEFAULTS.moderatorEmail,
        genericUrl:      s['help.spaces.generic.url']  || DEFAULTS.genericUrl,
        genericName:     s['help.spaces.generic.name'] || DEFAULTS.genericName,
        genericHint:     s['help.spaces.generic.hint'] || DEFAULTS.genericHint,
        aiQuestUrl:      s['help.spaces.aiQuest.url']  || DEFAULTS.aiQuestUrl,
        aiQuestName:     s['help.spaces.aiQuest.name'] || DEFAULTS.aiQuestName,
        aiQuestHint:     s['help.spaces.aiQuest.hint'] || DEFAULTS.aiQuestHint,
        devopsUrl:       s['help.spaces.devops.url']   || DEFAULTS.devopsUrl,
        devopsName:      s['help.spaces.devops.name']  || DEFAULTS.devopsName,
        devopsHint:      s['help.spaces.devops.hint']  || DEFAULTS.devopsHint,
      });
    }).catch(() => {});
  }, []);

  // Load per-course help settings from DB (covers /c/:slug AND /devops-loop AND /ai-quest)
  const [courseHelp, setCourseHelp] = useState(null);
  useEffect(() => {
    if (!dbCourseSlug) { setCourseHelp(null); return; }
    api.get(`/courses-api/${dbCourseSlug}`).then(c => {
      if (c && (c.instructorName || c.helpSpaceUrl)) {
        setCourseHelp({
          instructorName:  c.instructorName  || null,
          instructorEmail: c.instructorEmail || null,
          helpSpaceUrl:    c.helpSpaceUrl    || null,
          helpSpaceName:   c.helpSpaceName   || null,
          helpSpaceHint:   c.helpSpaceHint   || null,
          accentColor:     c.accentColor     || '#06b6d4',
        });
      } else {
        setCourseHelp(null);
      }
    }).catch(() => setCourseHelp(null));
  }, [dbCourseSlug]);

  const isAIQuest    = AI_QUEST_PATHS.some(p => location.pathname.startsWith(p));
  const isDevOpsLoop = DEVOPS_LOOP_PATHS_PREFIXES.some(p => location.pathname.startsWith(p));

  // Per-course space: DB course record takes priority, then platform defaults, then generic
  const space = courseHelp?.helpSpaceUrl
    ? { url: courseHelp.helpSpaceUrl, name: courseHelp.helpSpaceName || 'Course Support Space', hint: courseHelp.helpSpaceHint || '', color: courseHelp.accentColor, glow: courseHelp.accentColor + '66' }
    : isDevOpsLoop
    ? { url: cfg.devopsUrl,  name: cfg.devopsName,  hint: cfg.devopsHint,  color: '#f97316', glow: 'rgba(249,115,22,0.4)' }
    : isAIQuest
    ? { url: cfg.aiQuestUrl, name: cfg.aiQuestName, hint: cfg.aiQuestHint, color: '#1a73e8', glow: 'rgba(26,115,232,0.4)' }
    : { url: cfg.genericUrl, name: cfg.genericName, hint: cfg.genericHint, color: '#34a853', glow: 'rgba(52,168,83,0.35)' };

  // Per-course moderator: DB course record takes priority over global
  const moderator = {
    name:  courseHelp?.instructorName  || cfg.moderatorName,
    title: cfg.moderatorTitle,
    email: courseHelp?.instructorEmail || cfg.moderatorEmail,
  };

  const hideFloating = location.pathname === '/' || location.pathname === '/courses';
  if (hideFloating) return null;

  return (
    <>
      {/* ── Floating Help Button ── */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-16 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full font-bold text-sm text-white shadow-lg transition-all hover:scale-105 active:scale-95"
        style={{
          background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
          boxShadow: '0 0 20px rgba(124,58,237,0.5), 0 4px 16px rgba(0,0,0,0.4)',
          border: '1px solid rgba(167,139,250,0.4)',
        }}
        title="Help Session"
      >
        <MessageCircleQuestion size={18} />
        <span>Help Session</span>
      </button>

      {/* ── Modal ── */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            className="relative w-full max-w-md rounded-2xl p-8 text-center"
            style={{
              background: 'linear-gradient(160deg, #0b1220 0%, #0d1a2e 100%)',
              border: '1.5px solid rgba(124,58,237,0.5)',
              boxShadow: '0 0 60px rgba(124,58,237,0.2), 0 20px 60px rgba(0,0,0,0.6)',
            }}
          >
            {/* Close */}
            <button onClick={() => setOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all">
              <X size={16} />
            </button>

            {/* Admin edit link */}
            {isAdmin && (
              <button onClick={() => {
                setOpen(false);
                if (dbCourseSlug) navigate(`/admin/courses/${dbCourseSlug}/edit`);
                else navigate('/admin?tab=help-settings');
              }}
                className="absolute top-4 right-14 w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:text-violet-400 hover:bg-white/5 transition-all"
                title={dbCourseSlug ? 'Edit Course Help Settings' : 'Edit Global Help Settings'}>
                <Settings size={14} />
              </button>
            )}

            {/* Context badge */}
            <div className="flex justify-center mb-4">
              <span className="text-[10px] font-bold tracking-widest px-3 py-1 rounded-full uppercase"
                style={{
                  background: isDevOpsLoop ? 'rgba(249,115,22,0.12)' : isAIQuest ? 'rgba(6,182,212,0.12)' : 'rgba(52,168,83,0.12)',
                  color: isDevOpsLoop ? '#fb923c' : isAIQuest ? '#22d3ee' : '#4ade80',
                  border: `1px solid ${isDevOpsLoop ? 'rgba(249,115,22,0.3)' : isAIQuest ? 'rgba(6,182,212,0.3)' : 'rgba(52,168,83,0.3)'}`,
                }}>
                {isDevOpsLoop ? '🔄 DevOps Loop Support' : isAIQuest ? '🤖 AI Quest Support' : '🌐 General Platform Support'}
              </span>
            </div>

            {/* Icon */}
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(79,70,229,0.3))', border: '1px solid rgba(167,139,250,0.4)' }}>
              <MessageCircleQuestion size={32} style={{ color: '#a78bfa' }} />
            </div>

            <h2 className="font-orbitron text-xl font-bold text-white mb-2">Need Help?</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-5">
              {isDevOpsLoop
                ? 'Questions about DevOps Loop installation, quests, or curriculum? Reach out via the DevOps Loop Support Google Space.'
                : isAIQuest
                ? 'Stuck on a quest or have questions about the AI Transformation curriculum? Reach out via the AI Quest Google Space.'
                : 'Login issues, platform access, or general questions? Reach out via the General Help Space.'}
            </p>

            {/* Logged-in user card */}
            {(auth?.name || auth?.email) && (
              <div className="flex items-center gap-3 rounded-xl p-3 mb-4 text-left"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-black flex-shrink-0 text-white"
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #7c3aed)' }}>
                  {(auth.name?.[0] || '?').toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{auth.name}</p>
                  {auth.email && <p className="text-slate-500 text-xs truncate font-mono">{auth.email}</p>}
                </div>
                <span className="ml-auto text-[10px] text-slate-600 shrink-0">You</span>
              </div>
            )}

            {/* Moderator card */}
            <div className="flex items-center gap-4 rounded-xl p-4 mb-5 text-left"
              style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)' }}>
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-black flex-shrink-0 text-white"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', border: '2px solid rgba(167,139,250,0.5)' }}>
                {(moderator.name?.[0] || 'R').toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-0.5">Moderator</p>
                <p className="text-white font-bold text-sm">{moderator.name}</p>
                <p className="text-slate-400 text-xs">{moderator.title}</p>
                <p className="text-xs mt-0.5 font-mono truncate" style={{ color: '#a78bfa' }}>{moderator.email}</p>
              </div>
            </div>

            {/* Google Space button */}
            <button onClick={() => window.open(space.url, '_blank', 'noopener,noreferrer')}
              className="flex flex-col items-center justify-center gap-1 w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 active:scale-95"
              style={{ background: `linear-gradient(135deg, ${space.color}, ${space.color}cc)`, boxShadow: `0 0 18px ${space.glow}` }}>
              <div className="flex items-center gap-2">
                <span className="text-base leading-none">💬</span>
                <span>{space.name}</span>
              </div>
              <span className="text-[10px] font-normal opacity-80">{space.hint}</span>
            </button>

            <p className="text-xs text-slate-600 mt-4">
              Google Chat will open in a new tab — sign in with your HCL account.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
