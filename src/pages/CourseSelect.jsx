import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Lock, LogOut, ChevronDown, UserCircle, Pencil, GraduationCap, Map, ExternalLink, MessageCircleQuestion, ShieldCheck, Search, BookOpen } from 'lucide-react';
import { getAuth, signOut } from './LoginPage.jsx';
import { useAppStore } from '../App.jsx';
import { api } from '../lib/api.js';
import AvatarDisplay from '../components/AvatarDisplay.jsx';
import { buildHandoffUrl } from '../components/ExternalHandoff.jsx';

const CNAPP_CATALOG_URL = 'https://cnapp.prod.hclpnp.com/lms/?redirect=0';
const HELP_SPACE_URL = 'https://chat.google.com/room/AAAAE-llN3w?cls=7';

const PLATFORM_FEATURES = [
  { icon: '⚡', title: 'XP & Leveling',       desc: 'Earn XP for correct answers on every quest. Unlock exclusive badges as you progress.' },
  { icon: '💡', title: 'Expert Explanations', desc: 'Every answer includes an expert explanation drawn from official docs — learn why.' },
  { icon: '🎭', title: 'Scenario-Based',      desc: 'Every question is a real workplace scenario. Learn what to actually do, not memorize.' },
];

// DevOps Loop and AI Quest remain hardcoded (they have their own full route implementations).
// K8s, AWS, GCP, MCP, Observability, Azure, OpenShift are now DB-managed (seeded on server startup).
const COURSES = [
  {
    id: 'devops-loop',
    icon: '🔄',
    title: 'DevOps Loop',
    subtitle: 'End-to-End DevOps Lifecycle',
    desc: 'The complete IBM DevOps Loop — Plan, Control, Build, Deploy, Test, and Measure. Hands-on CI/CD using JPetStore as the reference application.',
    topics: ['DevOps Plan', 'DevOps Control', 'DevOps Build', 'DevOps Deploy', 'DevOps Test', 'DevOps Measure'],
    color: '#f97316',
    gradient: 'from-orange-500 to-red-500',
    status: 'live',
    route: '/devops-loop',
    badge: '8 Modules',
  },
  {
    id: 'ai-quest',
    icon: '🤖',
    title: 'AI Quest',
    subtitle: 'Generative AI & Machine Learning',
    desc: '21 gamified quests covering GenAI, ML, NLP, Computer Vision, RAG, AI Security, Prompt Engineering, Python, APIs, and Docker.',
    topics: ['Generative AI', 'Machine Learning', 'NLP', 'RAG Systems', 'AI Security', 'Prompt Engineering', 'Python & APIs'],
    color: '#06b6d4',
    gradient: 'from-cyan-500 to-blue-600',
    status: 'live',
    route: '/ai-quest',
    badge: '21 Quests',
  },
  // kubernetes, aws, gcp, mcp, observability, azure, openshift are now DB-managed (auto-seeded on server startup)
];

// ── Add-to-Path modal ─────────────────────────────────────────────────────────
function PathEnrollModal({ course, onClose }) {
  const navigate = useNavigate();
  const [paths, setPaths]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [addingId, setAddingId] = useState(null);
  const [done, setDone]         = useState({});

  useEffect(() => {
    api.get('/learning-paths').then(d => {
      setPaths(Array.isArray(d) ? d : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const addToPath = async (pathId) => {
    setAddingId(pathId);
    try {
      const slug = course.slug || course.id;
      await api.post(`/learning-paths/${pathId}/items`, {
        type: 'course',
        refId: slug,
        title: course.title || course.name,
        subtitle: course.tagline || course.subtitle || '',
        emoji: course.emoji || '📚',
        accentColor: course.accentColor || course.color || '#06b6d4',
      });
      setDone(d => ({ ...d, [pathId]: true }));
    } catch (e) { alert(e?.message || 'Add failed'); }
    finally { setAddingId(null); }
  };

  const accent = course.accentColor || course.color || '#06b6d4';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: 'rgba(6,12,28,0.98)', border: '1px solid rgba(124,58,237,0.3)' }}>
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-white/6">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
            style={{ background: accent + '25', border: `1px solid ${accent}40` }}>
            {course.emoji || '📚'}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white truncate">Add to Learning Path</h3>
            <p className="text-[10px] text-slate-500 truncate">{course.title || course.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-300 text-xl leading-none">×</button>
        </div>
        <div className="px-4 py-3 max-h-64 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-white/10 border-t-violet-400 rounded-full animate-spin" />
            </div>
          ) : paths.length === 0 ? (
            <div className="text-center py-6">
              <BookOpen size={24} className="text-slate-700 mx-auto mb-2" />
              <p className="text-slate-500 text-xs mb-3">No learning paths yet.</p>
              <button onClick={() => navigate('/my-paths')}
                className="text-xs font-bold text-violet-400 hover:text-violet-300">
                + Create a path first
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {paths.map(path => (
                <div key={path.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/7"
                  style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <span className="text-base">🗺️</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{path.title}</p>
                    {path.description && <p className="text-[10px] text-slate-600 truncate">{path.description}</p>}
                  </div>
                  <button onClick={() => addToPath(path.id)}
                    disabled={!!addingId || done[path.id]}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all disabled:opacity-50 flex-shrink-0"
                    style={done[path.id]
                      ? { background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }
                      : { background: 'rgba(124,58,237,0.2)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.35)' }}>
                    {addingId === path.id ? '…' : done[path.id] ? '✓ Added' : '+ Add'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="px-4 pb-4 pt-2 border-t border-white/5">
          <button onClick={() => navigate('/my-paths')}
            className="w-full py-2 rounded-xl text-xs text-slate-400 hover:text-white transition-colors text-center">
            Manage Learning Paths →
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CourseSelect() {
  const navigate = useNavigate();
  const auth = getAuth();
  const { playerName, avatar, dbCourses: storeDbCourses, setDbCourses } = useAppStore();
  const isAdmin = auth?.role === 'ADMIN';
  const [enrollingCourse, setEnrollingCourse] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [dragId, setDragId] = useState(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const [courseSearch, setCourseSearch] = useState('');
  useEffect(() => {
    api.get('/courses-api').then(d => {
      const sorted = Array.isArray(d) ? [...d].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) : [];
      setDbCourses(sorted);
    }).catch(() => {});
  }, []);

  // Filter helper
  const matchesSearch = (title, tagline, desc) => {
    if (!courseSearch) return true;
    const q = courseSearch.toLowerCase();
    return (title || '').toLowerCase().includes(q) || (tagline || '').toLowerCase().includes(q) || (desc || '').toLowerCase().includes(q);
  };

  // Read platform course status from DB record (devops-loop, ai-quest seeded to DB)
  const dbCourseMap = Object.fromEntries((storeDbCourses || []).map(c => [c.slug, c]));
  const visibleHardcoded = COURSES.map(c => ({
    ...c,
    status: dbCourseMap[c.id]?.status || c.status,
  }));

  // Exclude hardcoded slugs from DB list to avoid duplicates in the grid
  const HARDCODED_SLUGS = new Set(COURSES.map(c => c.id));
  const visibleDbCourses = (storeDbCourses || []).filter(c => !HARDCODED_SLUGS.has(c.slug));

  // Drag-and-drop handlers (admin only)
  const handleDragStart = (e, id) => { setDragId(id); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver  = (e, id) => { e.preventDefault(); setDragOverId(id); };
  const handleDrop      = async (e, targetId) => {
    e.preventDefault();
    if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return; }
    const list = [...(storeDbCourses || [])];
    const from = list.findIndex(c => c.id === dragId);
    const to   = list.findIndex(c => c.id === targetId);
    if (from < 0 || to < 0) return;
    const [item] = list.splice(from, 1);
    list.splice(to, 0, item);
    const reordered = list.map((c, i) => ({ ...c, order: i }));
    setDbCourses(reordered);
    setDragId(null); setDragOverId(null);
    try { await api.put('/courses-api/reorder', { orders: reordered.map(c => ({ id: c.id, order: c.order })) }); }
    catch {}
  };

  const handleCourseClick = (course) => {
    if (course.status === 'live' && course.route) {
      navigate(course.route);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen">

      {/* ── Sticky Header ───────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 backdrop-blur-md border-b border-white/5"
        style={{ background: 'rgba(3,10,20,0.88)' }}
      >
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-orbitron font-black text-xs text-white"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #7c3aed)' }}
            >
              HCL
            </div>
            <span className="font-orbitron font-bold text-white text-sm tracking-wide">Software Learning Hub</span>
          </div>
          {/* ── Profile dropdown ── */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(o => !o)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all hover:border-white/15"
              style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' }}
            >
              {avatar
                ? <AvatarDisplay avatar={avatar} size="xs" />
                : <UserCircle size={18} className="text-slate-400" />}
              <span className="text-xs text-slate-300 hidden sm:block max-w-[120px] truncate">
                {playerName || auth?.name || 'Commander'}
              </span>
              <ChevronDown
                size={12}
                className="text-slate-500 transition-transform"
                style={{ transform: profileOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>

            {profileOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-56 rounded-xl overflow-hidden z-50"
                style={{
                  background: 'rgba(8,18,32,0.97)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(16px)',
                }}
              >
                {/* User info */}
                <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center gap-3">
                    {avatar
                      ? <AvatarDisplay avatar={avatar} size="sm" />
                      : <div className="w-9 h-9 rounded-xl bg-cyan-500/20 flex items-center justify-center"><UserCircle size={20} className="text-cyan-400" /></div>}
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{playerName || auth?.name || 'Commander'}</p>
                      {auth?.email && <p className="text-[10px] text-slate-500 truncate">{auth.email}</p>}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="py-1">
                  <button
                    onClick={() => { setProfileOpen(false); navigate('/avatar'); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-slate-300 hover:bg-white/5 hover:text-white transition-colors text-left"
                  >
                    <Pencil size={13} className="text-cyan-400" />
                    Edit Commander
                  </button>
                  {auth?.role === 'ADMIN' && (
                    <button
                      onClick={() => { setProfileOpen(false); navigate('/admin'); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-red-300 hover:bg-red-500/10 hover:text-red-200 transition-colors text-left"
                    >
                      <ShieldCheck size={13} className="text-red-400" />
                      User Management
                    </button>
                  )}
                  {(auth?.role === 'ADMIN' || auth?.role === 'MANAGER') && (
                    <button
                      onClick={() => { setProfileOpen(false); navigate('/tracker'); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-amber-300 hover:bg-amber-500/10 hover:text-amber-200 transition-colors text-left"
                    >
                      <GraduationCap size={13} className="text-amber-400" />
                      Learner Tracker
                    </button>
                  )}
                  {auth?.role === 'ADMIN' && (
                    <button
                      onClick={() => { setProfileOpen(false); navigate('/admin?tab=courses'); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-violet-300 hover:bg-violet-500/10 hover:text-violet-200 transition-colors text-left"
                    >
                      <Map size={13} className="text-violet-400" />
                      Courses
                    </button>
                  )}
                  <div className="my-1 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }} />
                  <button
                    onClick={() => { setProfileOpen(false); handleLogout(); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-slate-400 hover:bg-red-500/8 hover:text-red-400 transition-colors text-left"
                  >
                    <LogOut size={13} />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 pt-14 pb-8 text-center">
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-6"
          style={{ border: '1px solid rgba(6,182,212,0.3)', background: 'rgba(6,182,212,0.08)', color: '#22d3ee' }}
        >
          ✦ HCL Software Learning Hub · {COURSES.length + visibleDbCourses.length} Technology Tracks
        </div>
        <h1 className="font-orbitron text-4xl md:text-5xl font-black mb-4 bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
          Choose Your Learning Path
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-sm leading-relaxed">
          Select a skill area to begin. Each learning path contains gamified quests, curated O'Reilly resources, and hands-on assessments built for HCL Software engineers navigating the AI &amp; cloud transformation.
        </p>
      </div>

      {/* ── Main: side rail + course grid ───────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 pb-16">
        <div className="lg:flex lg:gap-8">
          {/* Side rail (desktop only) */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-20 flex flex-col gap-2">
              <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase mb-1 px-1">Quick Access</p>

              <button
                onClick={() => navigate('/my-paths')}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 w-full text-left transition-all hover:opacity-90 active:scale-95"
                style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.4)' }}
              >
                <BookOpen size={16} className="text-violet-400" />
                <span className="text-sm font-semibold text-violet-300">Learning Paths</span>
                <ChevronRight size={13} className="ml-auto text-violet-500" />
              </button>

              <a
                href={buildHandoffUrl(CNAPP_CATALOG_URL, { handoffType: 'certification-catalog' })}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/5 transition-colors border border-white/5 hover:border-violet-500/40 group"
              >
                <GraduationCap size={16} className="text-violet-400" />
                <span className="text-sm font-semibold text-slate-300 group-hover:text-white">Certifications</span>
                <ExternalLink size={12} className="ml-auto text-slate-500 group-hover:text-slate-200" />
              </a>

              <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase mt-6 mb-1 px-1">Platform Features</p>
              {PLATFORM_FEATURES.map(f => (
                <div
                  key={f.title}
                  className="rounded-xl px-3 py-2.5 border border-white/5"
                  style={{ background: 'rgba(255,255,255,0.02)' }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base leading-none">{f.icon}</span>
                    <span className="text-xs font-bold text-slate-200">{f.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">{f.desc}</p>
                </div>
              ))}

              <a
                href={HELP_SPACE_URL}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 mt-4 font-bold text-sm text-white transition-all hover:opacity-90 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                  boxShadow: '0 0 18px rgba(124,58,237,0.35)',
                  border: '1px solid rgba(167,139,250,0.4)',
                }}
              >
                <MessageCircleQuestion size={16} />
                Help Session
                <ExternalLink size={12} className="ml-auto opacity-80" />
              </a>
            </div>
          </aside>

          {/* Course grid */}
          <div className="flex-1 min-w-0 mt-4 lg:mt-0">
            {/* Search bar */}
            <div className="relative mb-5">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
              <input
                value={courseSearch}
                onChange={e => setCourseSearch(e.target.value)}
                placeholder="Search courses…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-slate-300 focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
              {courseSearch && (
                <button onClick={() => setCourseSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400">
                  ✕
                </button>
              )}
            </div>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">

              {/* Hardcoded courses (DevOps Loop, AI Quest) — always rendered first */}
              {visibleHardcoded.filter(c => matchesSearch(c.title, c.subtitle, c.desc)).map(course => {
            const isLive = course.status === 'live';
            return (
              <div
                key={course.id}
                onClick={() => handleCourseClick(course)}
                className={`relative rounded-2xl p-6 border transition-all duration-200 ${
                  isLive
                    ? 'cursor-pointer group hover:scale-[1.01] active:scale-[0.99]'
                    : 'cursor-default'
                }`}
                style={{
                  background: isLive
                    ? 'linear-gradient(135deg, rgba(6,182,212,0.07), rgba(124,58,237,0.04))'
                    : 'rgba(255,255,255,0.02)',
                  border: isLive
                    ? `1px solid ${course.color}45`
                    : '1px solid rgba(255,255,255,0.06)',
                  boxShadow: isLive ? `0 0 32px ${course.color}12` : 'none',
                  opacity: isLive ? 1 : 0.72,
                }}
              >
                {isLive ? (
                  <span className="absolute top-4 right-4 text-[10px] px-2.5 py-0.5 rounded-full font-bold tracking-wider"
                    style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>LIVE</span>
                ) : (
                  <span className="absolute top-4 right-4 text-[10px] px-2.5 py-0.5 rounded-full font-bold tracking-wider"
                    style={{ background: 'rgba(100,116,139,0.12)', color: '#475569', border: '1px solid rgba(100,116,139,0.2)' }}>COMING SOON</span>
                )}
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-5"
                  style={{ background: course.color + '18', border: `1px solid ${course.color}35`, boxShadow: isLive ? `0 0 20px ${course.color}20` : 'none' }}>
                  {course.icon}
                </div>
                <h3 className={`font-orbitron font-bold text-white text-base mb-0.5 transition-colors ${isLive ? 'group-hover:text-cyan-400' : ''}`}>
                  {course.title}
                </h3>
                <p className="text-xs font-semibold mb-3" style={{ color: course.color }}>{course.subtitle}</p>
                <p className="text-slate-500 text-xs leading-relaxed mb-4">{course.desc}</p>
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {course.topics.map(t => (
                    <span key={t} className="text-[10px] px-2 py-0.5 rounded font-medium"
                      style={{ background: course.color + '14', color: isLive ? course.color : '#475569', border: `1px solid ${isLive ? course.color + '28' : 'rgba(100,116,139,0.15)'}` }}>{t}</span>
                  ))}
                </div>
                {isLive ? (
                  <div className="flex items-center text-xs font-bold" style={{ color: course.color }}>
                    {course.badge && <span>{course.badge} • Leaderboard • Learning Path</span>}
                    <ChevronRight size={15} className="ml-auto group-hover:translate-x-1 transition-transform" />
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Lock size={11} />
                    Coming soon — join the Google Space for updates
                  </div>
                )}
                {/* Enroll / Add to Path */}
                <button
                  onClick={e => { e.stopPropagation(); setEnrollingCourse({ ...course, accentColor: course.color }); }}
                  className="mt-3 w-full text-[10px] font-bold py-1.5 rounded-lg transition-all hover:opacity-90"
                  style={{ background: 'rgba(124,58,237,0.12)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.25)' }}>
                  + Add to Learning Path
                </button>
              </div>
            );
          })}

              {/* No results state */}
              {courseSearch && visibleHardcoded.filter(c => matchesSearch(c.title, c.subtitle, c.desc)).length === 0 &&
               visibleDbCourses.filter(c => matchesSearch(c.title, c.tagline, c.description)).length === 0 && (
                <div className="sm:col-span-2 xl:col-span-3 rounded-2xl p-10 text-center border border-dashed border-white/8">
                  <Search size={24} className="text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No courses match "<span className="text-slate-300">{courseSearch}</span>"</p>
                  <button onClick={() => setCourseSearch('')} className="text-xs text-cyan-500 hover:text-cyan-400 mt-2">Clear search</button>
                </div>
              )}

              {/* DB courses — created by admin / platform-seeded */}
              {visibleDbCourses.filter(c => matchesSearch(c.title, c.tagline, c.description)).map(c => {
                const accent   = c.accentColor || '#06b6d4';
                const isLive   = c.status !== 'coming-soon';
                const isDragging  = dragId === c.id;
                const isDropTarget = dragOverId === c.id;
                return (
                  <div key={c.id}
                    draggable={isAdmin}
                    onDragStart={isAdmin ? e => handleDragStart(e, c.id) : undefined}
                    onDragOver={isAdmin ? e => handleDragOver(e, c.id) : undefined}
                    onDrop={isAdmin ? e => handleDrop(e, c.id) : undefined}
                    onDragEnd={() => { setDragId(null); setDragOverId(null); }}
                    onClick={() => isLive ? navigate(`/c/${c.slug}`) : undefined}
                    className={`relative rounded-2xl p-6 border transition-all duration-200 ${isLive ? 'cursor-pointer group hover:scale-[1.01] active:scale-[0.99]' : 'cursor-default'} ${isDragging ? 'opacity-40' : ''} ${isDropTarget ? 'ring-2 ring-cyan-400' : ''}`}
                    style={{
                      background: isLive ? `linear-gradient(135deg, ${accent}10, ${accent}06)` : 'rgba(255,255,255,0.02)',
                      border: isLive ? `1px solid ${accent}45` : '1px solid rgba(255,255,255,0.06)',
                      boxShadow: isLive ? `0 0 32px ${accent}12` : 'none',
                      opacity: isLive ? 1 : (isAdmin ? 0.8 : 0.65),
                    }}
                  >
                    {/* Status badge */}
                    {isLive ? (
                      <span className="absolute top-4 right-4 text-[10px] px-2.5 py-0.5 rounded-full font-bold tracking-wider"
                        style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>LIVE</span>
                    ) : (
                      <span className="absolute top-4 right-4 text-[10px] px-2.5 py-0.5 rounded-full font-bold tracking-wider"
                        style={{ background: 'rgba(100,116,139,0.12)', color: '#475569', border: '1px solid rgba(100,116,139,0.2)' }}>COMING SOON</span>
                    )}
                    {/* Admin edit button */}
                    {isAdmin && (
                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/admin/courses/${c.slug}/edit`); }}
                        className="absolute top-4 right-28 text-[10px] px-2.5 py-0.5 rounded-full font-bold tracking-wider border transition-colors hover:text-white"
                        style={{ background: 'rgba(6,182,212,0.1)', color: '#67e8f9', border: '1px solid rgba(6,182,212,0.3)' }}
                      >
                        ✎ Edit
                      </button>
                    )}
                    {/* Drag handle for admin */}
                    {isAdmin && <span className="absolute top-4 left-4 text-slate-700 cursor-grab text-xs" title="Drag to reorder">⠿</span>}
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-5"
                      style={{ background: accent + '18', border: `1px solid ${accent}35`, boxShadow: `0 0 20px ${accent}20` }}>
                      {c.emoji || '📚'}
                    </div>
                    <h3 className="font-orbitron font-bold text-white text-base mb-0.5 transition-colors group-hover:text-cyan-400">{c.title}</h3>
                    {c.tagline && <p className="text-xs font-semibold mb-3" style={{ color: accent }}>{c.tagline}</p>}
                    {c.description && <p className="text-slate-500 text-xs leading-relaxed mb-4 line-clamp-2">{c.description}</p>}
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {(c.weeks || []).slice(0,4).map(w => w.modules?.slice(0,2).map(m => (
                        <span key={m.id} className="text-[10px] px-2 py-0.5 rounded font-medium"
                          style={{ background: accent + '15', color: accent, border: `1px solid ${accent}25` }}>
                          {m.title}
                        </span>
                      )))}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        {c.weeks?.length || 0} week{(c.weeks?.length || 0) !== 1 ? 's' : ''}
                      </span>
                      <ChevronRight size={16} style={{ color: accent }} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                    {/* Enroll / Add to Path */}
                    <button
                      onClick={e => { e.stopPropagation(); setEnrollingCourse(c); }}
                      className="mt-3 w-full text-[10px] font-bold py-1.5 rounded-lg transition-all hover:opacity-90"
                      style={{ background: 'rgba(124,58,237,0.12)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.25)' }}>
                      + Add to Learning Path
                    </button>
                  </div>
                );
              })}

            </div>
          </div>
        </div>
      </div>

      {enrollingCourse && (
        <PathEnrollModal course={enrollingCourse} onClose={() => setEnrollingCourse(null)} />
      )}

      {/* ── Dive into Certifications ─────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 pb-24">
        <div
          className="rounded-3xl p-10 md:p-12 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(6,182,212,0.05) 100%)',
            border: '1px solid rgba(139,92,246,0.22)',
            boxShadow: '0 0 60px rgba(139,92,246,0.06)',
          }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.35)' }}
          >
            <GraduationCap size={30} className="text-violet-300" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase mb-4"
            style={{ background: 'rgba(139,92,246,0.12)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.3)' }}>
            Credentials
          </div>
          <h2 className="font-orbitron text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
            Dive into Certifications
          </h2>
          <p className="text-slate-400 mb-8 max-w-xl mx-auto leading-relaxed text-sm">
            Validate your expertise with industry-recognized HCL certifications. Enroll for the assignment, take the examination, and earn your official credentials in CNAPP LMS.
          </p>
          <a
            href={buildHandoffUrl(CNAPP_CATALOG_URL, { handoffType: 'certification-catalog' })}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)', boxShadow: '0 0 28px rgba(139,92,246,0.35)' }}
          >
            Explore CNAPP LMS Catalog
            <ExternalLink size={14} />
          </a>
          <p className="text-slate-600 text-xs mt-6">
            Opens in a new tab. You may be asked to sign in to CNAPP separately.
          </p>
        </div>
      </section>

    </div>

  );
}
