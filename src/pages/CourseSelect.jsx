import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Lock, LogOut, ChevronDown, UserCircle, Pencil, GraduationCap, Map, ShieldCheck, Search, BookOpen, Sparkles } from 'lucide-react';
import { clearAuth, getAuth, signOut } from './LoginPage.jsx';
import { useAppStore } from '../App.jsx';
import { api } from '../lib/api.js';
import { QUESTS } from '../data/index.js';
import { DEVOPS_QUESTS } from '../data/devopsIndex.js';
import AvatarDisplay from '../components/AvatarDisplay.jsx';
import HCLSoftwareWordmark from '../components/HCLSoftwareWordmark.jsx';

const COURSE_FILTERS = [
  { id: 'all', label: 'Courses', description: 'All technology tracks' },
  { id: 'live', label: 'Live', description: 'Ready to launch now' },
  { id: 'coming-soon', label: 'Coming Soon', description: 'Planned or locked tracks' },
];

const PLATFORM_FEATURES = [
  { icon: '⚡', title: 'XP & Leveling',       desc: 'Earn XP for correct answers on every quest. Unlock exclusive badges as you progress.' },
  { icon: '💡', title: 'Expert Explanations', desc: 'Every answer includes an expert explanation drawn from official docs — learn why.' },
  { icon: '🎭', title: 'Scenario-Based',      desc: 'Every question is a real workplace scenario. Learn what to actually do, not memorize.' },
];

const COURSES = [
  {
    id: 'devops-loop',
    icon: '🔄',
    title: 'DevOps Loop',
    subtitle: 'End-to-End DevOps Lifecycle',
    desc: 'The complete IBM DevOps Loop — Plan, Control, Build, Deploy, Test, and Measure. Hands-on CI/CD using JPetStore as the reference application.',
    topics: ['DevOps Plan', 'DevOps Control', 'DevOps Build', 'DevOps Deploy', 'DevOps Test', 'DevOps Measure'],
    color: '#f97316',
    status: 'live',
    route: '/devops-loop',
    badge: '8 Modules',
    totalQuests: 21,
  },
  {
    id: 'ai-quest',
    icon: '🤖',
    title: 'AI Quest',
    subtitle: 'Generative AI & Machine Learning',
    desc: '21 gamified quests covering GenAI, ML, NLP, Computer Vision, RAG, AI Security, Prompt Engineering, Python, APIs, and Docker.',
    topics: ['Generative AI', 'Machine Learning', 'NLP', 'RAG Systems', 'AI Security', 'Prompt Engineering', 'Python & APIs'],
    color: '#06b6d4',
    status: 'live',
    route: '/ai-quest',
    badge: '21 Quests',
    totalQuests: 21,
  },
];

const statusPriority = (status) => status === 'live' ? 0 : 1;
const HARD_CODED_SLUGS = new Set(COURSES.map(course => course.id));

function ModeratedCoursesSheet({ courses, onClose, onSelect, isLight }) {
  return (
    <div className="fixed inset-0 z-[80]" style={{ background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(4px)' }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className={`ml-auto h-full w-full max-w-sm border-l ${isLight ? 'bg-white' : 'bg-slate-950'}`}
        style={{ borderColor: isLight ? 'rgba(148,163,184,0.22)' : 'rgba(255,255,255,0.08)', boxShadow: '0 16px 48px rgba(0,0,0,0.30)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: isLight ? 'rgba(148,163,184,0.18)' : 'rgba(255,255,255,0.07)' }}>
          <div>
            <p className={`text-sm font-black tracking-wide ${isLight ? 'text-slate-900' : 'text-white'}`}>Moderated Courses</p>
            <p className="text-[11px] text-slate-500 mt-1">Select a course to edit.</p>
          </div>
          <button onClick={onClose} className={`text-xs font-bold px-2 py-1 rounded-lg ${isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>Close</button>
        </div>
        <div className="p-3 space-y-2 max-h-full overflow-y-auto">
          {courses.length ? courses.map(course => (
            <button key={course.slug || course.id} onClick={() => onSelect(course)}
              className={`w-full flex items-center gap-3 rounded-xl px-3 py-3 border text-left transition-colors ${isLight ? 'hover:bg-slate-50' : 'hover:bg-white/5'}`}
              style={{ borderColor: isLight ? 'rgba(148,163,184,0.20)' : 'rgba(255,255,255,0.08)' }}>
              <Pencil size={14} style={{ color: course.color || course.accentColor || '#06b6d4' }} />
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>{course.title}</p>
                <p className="text-[10px] text-slate-500 truncate">Open course editor</p>
              </div>
              <ChevronRight size={14} className="text-slate-400" />
            </button>
          )) : <div className="px-3 py-4 text-xs text-slate-500">No moderated courses assigned.</div>}
        </div>
      </div>
    </div>
  );
}

function PathEnrollModal({ course, onClose, isLight }) {
  const navigate = useNavigate();
  const [paths, setPaths]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [addingId, setAddingId] = useState(null);
  const [done, setDone]         = useState({});

  useEffect(() => {
    api.get('/learning-paths').then(data => {
      setPaths(Array.isArray(data) ? data : []);
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
      setDone(previous => ({ ...previous, [pathId]: true }));
    } catch (e) { alert(e?.message || 'Add failed'); }
    finally { setAddingId(null); }
  };

  const accent = course.accentColor || course.color || '#06b6d4';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{
          background: isLight ? 'rgba(226,232,240,0.98)' : 'rgba(6,12,28,0.98)',
          border: isLight ? '1px solid rgba(100,116,139,0.32)' : '1px solid rgba(124,58,237,0.3)',
        }}>
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b"
          style={{ borderColor: isLight ? 'rgba(148,163,184,0.18)' : 'rgba(255,255,255,0.06)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
            style={{ background: accent + '25', border: `1px solid ${accent}40` }}>
            {course.emoji || '📚'}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`text-sm font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>Add to Learning Path</h3>
            <p className="text-[10px] text-slate-500 truncate">{course.title || course.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
        </div>
        <div className="px-4 py-3 max-h-64 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 rounded-full animate-spin"
                style={{ borderColor: isLight ? 'rgba(148,163,184,0.22)' : 'rgba(255,255,255,0.1)', borderTopColor: '#8b5cf6' }} />
            </div>
          ) : paths.length === 0 ? (
            <div className="text-center py-6">
              <BookOpen size={24} className="text-slate-400 mx-auto mb-2" />
              <p className="text-slate-500 text-xs mb-3">No learning paths yet.</p>
              <button onClick={() => navigate('/my-paths')}
                className="text-xs font-bold text-violet-500 hover:text-violet-400">
                + Create a path first
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {paths.map(path => (
                <div key={path.id} className="flex items-center gap-3 p-3 rounded-xl border"
                  style={{ background: isLight ? 'rgba(203,213,225,0.72)' : 'rgba(255,255,255,0.02)', borderColor: isLight ? 'rgba(100,116,139,0.24)' : 'rgba(255,255,255,0.07)' }}>
                  <span className="text-base">🗺️</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>{path.title}</p>
                    {path.description && <p className="text-[10px] text-slate-500 truncate">{path.description}</p>}
                  </div>
                  <button onClick={() => addToPath(path.id)}
                    disabled={!!addingId || done[path.id]}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all disabled:opacity-50 flex-shrink-0"
                    style={done[path.id]
                      ? { background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }
                      : { background: 'rgba(124,58,237,0.12)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.25)' }}>
                    {addingId === path.id ? '…' : done[path.id] ? '✓ Added' : '+ Add'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="px-4 pb-4 pt-2 border-t"
          style={{ borderColor: isLight ? 'rgba(148,163,184,0.16)' : 'rgba(255,255,255,0.05)' }}>
          <button onClick={() => navigate('/my-paths')}
            className={`w-full py-2 rounded-xl text-xs transition-colors text-center ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}>
            Manage Learning Paths →
          </button>
        </div>
      </div>
    </div>
  );
}

function CourseCard({ course, isAdmin, isLight, dragId, dragOverId, onDragStart, onDragOver, onDrop, onDragEnd, onOpen, onNavigateEdit, onEnroll }) {
  const cardRef = useRef(null);
  const [showRight, setShowRight] = useState(true);

  const handleMouseEnter = () => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setShowRight(rect.left + rect.width + 340 < window.innerWidth);
  };

  const isLive = course.status === 'live';
  const boxAccent = course.color || course.accentColor || '#06b6d4';
  const topics = (course.topics || []).slice(0, 6);
  const draggable = isAdmin && course.source === 'db';
  const dragIdValue = dragId === course.id;
  const dropIdValue = dragOverId === course.id;
  const canEdit = isAdmin || course.canEdit;

  return (
    <div
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      draggable={draggable}
      onDragStart={draggable ? event => onDragStart(event, course.id) : undefined}
      onDragOver={draggable ? event => onDragOver(event, course.id) : undefined}
      onDrop={draggable ? event => onDrop(event, course.id) : undefined}
      onDragEnd={draggable ? onDragEnd : undefined}
      onClick={() => onOpen(course)}
      className={`group relative rounded-2xl border p-4 transition-all duration-200 min-h-[126px] overflow-visible ${isLive ? 'cursor-pointer hover:-translate-y-1 active:scale-[0.99] hover:z-30' : 'cursor-default'} ${dragIdValue ? 'opacity-40' : ''} ${dropIdValue ? 'ring-2 ring-cyan-400' : ''}`}
      style={{
        background: isLight
          ? (isLive ? '#ffffff' : 'rgba(248,250,252,0.85)')
          : (isLive ? `linear-gradient(135deg, ${boxAccent}12, rgba(124,58,237,0.05))` : 'rgba(255,255,255,0.02)'),
        borderColor: isLive ? `${boxAccent}45` : (isLight ? 'rgba(100,116,139,0.18)' : 'rgba(255,255,255,0.08)'),
        opacity: isLive ? 1 : 0.78,
      }}
    >
      <div className="flex items-start gap-3">
        {draggable && <span className="mt-1 text-slate-400 cursor-grab text-xs" title="Drag to reorder">⠿</span>}
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex flex-wrap items-center gap-1.5 mb-2 min-h-[22px]">
            {canEdit && (
              <button
                onClick={event => { event.stopPropagation(); onNavigateEdit(course.slug); }}
                className="text-[10px] px-2.5 py-0.5 rounded-full font-bold border transition-colors hover:text-white"
                style={{ background: 'rgba(6,182,212,0.12)', color: '#22d3ee', border: '1px solid rgba(6,182,212,0.28)' }}>
                Edit
              </button>
            )}
            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold tracking-wider"
              style={isLive
                ? { background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }
                : { background: 'rgba(100,116,139,0.12)', color: isLight ? '#475569' : '#94a3b8', border: '1px solid rgba(100,116,139,0.2)' }}>
              {isLive ? 'LIVE' : 'COMING SOON'}
            </span>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                style={{ background: boxAccent + '18', border: `1px solid ${boxAccent}35`, boxShadow: isLive ? `0 0 18px ${boxAccent}16` : 'none' }}>
                {course.icon || course.emoji || '📚'}
              </div>
              <h3 className={`font-orbitron font-bold text-[16px] leading-[1.08] whitespace-normal ${isLight ? 'text-slate-900' : 'text-slate-100'} ${isLive ? 'group-hover:text-cyan-500 transition-colors' : ''}`}
                style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'normal', overflowWrap: 'normal' }}>
                {course.title}
              </h3>
            </div>
          </div>
          {course.subtitle && <p className={`mt-3 text-[12px] leading-relaxed whitespace-normal break-words ${isLight ? 'text-slate-700' : 'text-white'}`}>{course.subtitle}</p>}
        </div>
      </div>

      <div
        className={`hidden xl:block absolute top-0 w-80 rounded-2xl p-4 opacity-0 pointer-events-none translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 group-hover:pointer-events-auto transition-all duration-200 z-40 ${showRight ? 'left-[calc(100%+0.75rem)]' : 'right-[calc(100%+0.75rem)]'} `}
        style={{ background: isLight ? '#ffffff' : 'rgba(7,15,28,0.98)', border: isLight ? `1px solid rgba(100,116,139,0.2)` : `1px solid ${boxAccent}30`, boxShadow: isLight ? '0 8px 32px rgba(0,0,0,0.14)' : '0 18px 44px rgba(0,0,0,0.24)' }}>
        {course.subtitle && <p className={`text-[11px] font-semibold mb-3 ${isLight ? 'text-slate-800' : 'text-white'}`}>{course.subtitle}</p>}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {topics.map(topic => (
            <span key={topic} className="text-[10px] px-2 py-0.5 rounded font-medium"
              style={{ background: boxAccent + '14', color: boxAccent, border: `1px solid ${boxAccent}28` }}>
              {topic}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2">
          {isLive ? (
            <span className="text-[11px] font-bold" style={{ color: boxAccent }}>{course.badge || 'Enter'} · Open</span>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500"><Lock size={11} />Coming soon</div>
          )}
          <ChevronRight size={15} style={{ color: boxAccent }} className="group-hover:translate-x-1 transition-transform" />
        </div>
        <button
          onClick={event => { event.stopPropagation(); onEnroll({ ...course, accentColor: boxAccent }); }}
          className="mt-3 w-full text-[10px] font-bold py-2 rounded-lg transition-all hover:opacity-90"
          style={{ background: isLight ? 'rgba(124,58,237,0.08)' : 'rgba(124,58,237,0.12)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.22)' }}>
          + Add to Learning Path
        </button>
      </div>

      <div className="mt-4 xl:hidden rounded-xl p-3"
        style={{ background: isLight ? 'rgba(203,213,225,0.42)' : 'rgba(255,255,255,0.03)', border: isLight ? '1px solid rgba(71,85,105,0.22)' : '1px solid rgba(255,255,255,0.05)' }}>
        {course.subtitle && <p className={`text-[11px] font-semibold mb-2 ${isLight ? 'text-slate-800' : 'text-white'}`}>{course.subtitle}</p>}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold" style={{ color: boxAccent }}>{course.badge || 'Course Track'}</span>
          <button
            onClick={event => { event.stopPropagation(); onEnroll({ ...course, accentColor: boxAccent }); }}
            className="text-[10px] font-bold px-2.5 py-1 rounded-lg"
            style={{ background: isLight ? 'rgba(124,58,237,0.08)' : 'rgba(124,58,237,0.12)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.2)' }}>
            Add to Path
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CourseSelect() {
  const navigate = useNavigate();
  const auth = getAuth();
  const {
    playerName,
    avatar,
    dbCourses: storeDbCourses,
    setDbCourses,
    theme,
    completedQuests,
    devopsCompletedQuests,
    courseCompletedQuests,
  } = useAppStore();

  const isAdmin = auth?.role === 'ADMIN';
  const isLight = theme === 'light';
  const lightPanel     = 'rgba(255,255,255,0.92)';

  const [enrollingCourse, setEnrollingCourse] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [moderatedCoursesOpen, setModeratedCoursesOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [myLearningOpen, setMyLearningOpen] = useState(false);
  const [courseQuestMap, setCourseQuestMap] = useState({});
  const [courseFilter, setCourseFilter] = useState('all');
  const [courseSearch, setCourseSearch] = useState('');
  const [dragOverId, setDragOverId] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [sessionInvalid, setSessionInvalid] = useState(false);

  const profileRef = useRef(null);
  const filterRef = useRef(null);
  const myLearningRef = useRef(null);

  useEffect(() => {
    const handleClick = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) setProfileOpen(false);
      if (filterRef.current && !filterRef.current.contains(event.target)) setFilterOpen(false);
      if (myLearningRef.current && !myLearningRef.current.contains(event.target)) setMyLearningOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    api.get('/courses-api').then(data => {
      const sorted = Array.isArray(data) ? [...data].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) : [];
      setSessionInvalid(false);
      setDbCourses(sorted);
    }).catch((error) => {
      if (error?.status === 401 || error?.status === 403) {
        clearAuth();
        setSessionInvalid(true);
        setDbCourses([]);
        return;
      }
    });
  }, [setDbCourses]);

  const scoreSearch = (course) => {
    if (!courseSearch.trim()) return 1;
    const query = courseSearch.trim().toLowerCase();
    const tokens = query.split(/\s+/).filter(Boolean);
    const title = String(course.title || '').toLowerCase();
    const subtitle = String(course.subtitle || course.tagline || '').toLowerCase();
    const desc = String(course.desc || course.description || '').toLowerCase();
    const topics = (course.topics || []).join(' ').toLowerCase();
    const haystack = `${title} ${subtitle} ${desc} ${topics}`;
    let score = 0;
    if (title.includes(query)) score += 10;
    if (subtitle.includes(query)) score += 7;
    if (topics.includes(query)) score += 5;
    if (desc.includes(query)) score += 3;
    tokens.forEach((token) => {
      if (title.includes(token)) score += 4;
      else if (subtitle.includes(token)) score += 3;
      else if (topics.includes(token)) score += 2;
      else if (desc.includes(token)) score += 1;
      else if (haystack.includes(token.slice(0, Math.max(3, token.length - 1)))) score += 0.5;
    });
    return score;
  };

  const matchesFilter = (status) => courseFilter === 'all' || status === courseFilter;
  const activeFilter = COURSE_FILTERS.find(filter => filter.id === courseFilter) || COURSE_FILTERS[0];
  const dbCourseMap = Object.fromEntries((storeDbCourses || []).map(course => [course.slug, course]));

  const normalizedDbCourses = useMemo(() => sessionInvalid ? [] : (storeDbCourses || [])
    .filter(course => !HARD_CODED_SLUGS.has(course.slug))
    .map((course, index) => ({
      ...course,
      source: 'db',
      desc: course.description,
      subtitle: course.tagline,
      topics: (course.weeks || []).flatMap(week => (week.modules || []).map(module => module.title)).slice(0, 6),
      sortOrder: typeof course.order === 'number' ? course.order : 100 + index,
      badge: course._count?.weeks ? `${course._count.weeks} Week${course._count.weeks === 1 ? '' : 's'}` : 'Course Track',
      totalQuests: course._count?.quests || null,
    })), [sessionInvalid, storeDbCourses]);

  const normalizedHardcodedCourses = useMemo(() => sessionInvalid ? [] : COURSES.map((course, index) => ({
    ...course,
    source: 'hardcoded',
    title: dbCourseMap[course.id]?.title || course.title,
    subtitle: dbCourseMap[course.id]?.tagline || course.subtitle,
    desc: dbCourseMap[course.id]?.description || course.desc,
    icon: dbCourseMap[course.id]?.emoji || course.icon,
    emoji: dbCourseMap[course.id]?.emoji || course.emoji,
    color: dbCourseMap[course.id]?.accentColor || course.color,
    accentColor: dbCourseMap[course.id]?.accentColor || course.accentColor || course.color,
    status: dbCourseMap[course.id]?.status || course.status,
    canEdit: Boolean(dbCourseMap[course.id]?.canEdit),
    moderatorIds: dbCourseMap[course.id]?.moderatorIds || [],
    order: dbCourseMap[course.id]?.order,
    slug: course.id,
    sortOrder: typeof dbCourseMap[course.id]?.order === 'number' ? dbCourseMap[course.id].order : index,
  })), [dbCourseMap, sessionInvalid]);

  const allCourses = useMemo(() => [...normalizedHardcodedCourses, ...normalizedDbCourses], [normalizedHardcodedCourses, normalizedDbCourses]);

  const visibleCourses = useMemo(() => allCourses
    .map(course => ({ ...course, searchScore: scoreSearch(course) }))
    .filter(course => course.searchScore > 0 && matchesFilter(course.status))
    .sort((a, b) => statusPriority(a.status) - statusPriority(b.status)
      || b.searchScore - a.searchScore
      || (a.sortOrder ?? 999) - (b.sortOrder ?? 999)
      || a.title.localeCompare(b.title)), [allCourses, courseSearch, courseFilter]);

  const moderatedCourses = useMemo(() => allCourses
    .filter(course => course.canEdit)
    .sort((a, b) => a.title.localeCompare(b.title)), [allCourses]);
  const hasModeratedCourses = moderatedCourses.length > 0;
  const showModeratedCoursesEntry = !isAdmin && hasModeratedCourses;

  useEffect(() => {
    const dbCoursesWithProgress = allCourses.filter(course => course.source === 'db' && Object.keys(courseCompletedQuests?.[course.slug || course.id] || {}).length > 0);
    dbCoursesWithProgress.forEach((course) => {
      const courseKey = course.slug || course.id;
      if (courseQuestMap[courseKey]) return;
      api.get(`/courses-api/${course.id}/quests`).then(data => {
        setCourseQuestMap(previous => ({
          ...previous,
          [courseKey]: Array.isArray(data) ? [...data].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) : [],
        }));
      }).catch(() => {
        setCourseQuestMap(previous => ({ ...previous, [courseKey]: [] }));
      });
    });
  }, [allCourses, courseCompletedQuests, courseQuestMap]);

  const myLearning = useMemo(() => {
    const entries = allCourses.map(course => {
      const courseKey = course.slug || course.id;
      const progressMap = courseKey === 'ai-quest'
        ? (completedQuests || {})
        : courseKey === 'devops-loop'
        ? (devopsCompletedQuests || {})
        : (courseCompletedQuests?.[courseKey] || {});
      const completed = Object.keys(progressMap || {}).length;
      const completionTimes = Object.values(progressMap || {}).map(item => item?.completedAt || 0);
      const latest = completionTimes.length ? Math.max(...completionTimes) : 0;
      const total = course.totalQuests || null;
      const percentage = total ? Math.round((completed / total) * 100) : null;
      const stage = total && completed >= total ? 'Completed' : 'In Progress';
      const progressText = total
        ? `${completed} / ${total} quests done · ${percentage}% complete`
        : `${completed} quest${completed === 1 ? '' : 's'} done`;
      return { ...course, completed, latest, total, percentage, stage, progressText, progressMap };
    });

    return entries
      .filter(course => course.completed > 0)
      .sort((a, b) => b.latest - a.latest
        || a.title.localeCompare(b.title))
      .slice(0, 5);
  }, [allCourses, completedQuests, devopsCompletedQuests, courseCompletedQuests]);

  const currentLearning = myLearning[0] || null;
  const totalVisibleCount = visibleCourses.length;

  const getResumeTarget = (course) => {
    const courseKey = course.slug || course.id;
    const progressMap = course.progressMap || {};
    const completedIds = Object.keys(progressMap);
    const latestEntry = completedIds
      .map(id => ({ id, completedAt: progressMap[id]?.completedAt || 0 }))
      .sort((a, b) => b.completedAt - a.completedAt)[0];

    if (!latestEntry || course.stage === 'Completed') {
      if (course.route) return course.route;
      if (course.slug) return `/c/${course.slug}`;
      return '/courses';
    }

    const orderedQuests = courseKey === 'ai-quest'
      ? QUESTS
      : courseKey === 'devops-loop'
      ? DEVOPS_QUESTS
      : (courseQuestMap[courseKey] || []);

    if (!orderedQuests.length) {
      if (course.route) return course.route;
      if (course.slug) return `/c/${course.slug}/quests`;
      return '/courses';
    }

    const latestIndex = orderedQuests.findIndex(quest => (quest.id || quest) === latestEntry.id);
    const nextQuest = orderedQuests.find((quest, index) => index > latestIndex && !progressMap[quest.id || quest])
      || orderedQuests.find(quest => !progressMap[quest.id || quest]);

    if (!nextQuest) {
      if (course.route) return course.route;
      if (course.slug) return `/c/${course.slug}`;
      return '/courses';
    }

    if (courseKey === 'ai-quest') return `/quest/${nextQuest.id}`;
    if (courseKey === 'devops-loop') return `/devops-loop/quest/${nextQuest.id}`;
    return `/c/${course.slug}/learn/${nextQuest.id}`;
  };

  const openLearning = (course) => {
    navigate(getResumeTarget(course));
  };

  const handleDragStart = (event, id) => {
    setDragId(id);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (event, id) => {
    event.preventDefault();
    setDragOverId(id);
  };

  const handleDrop = async (event, targetId) => {
    event.preventDefault();
    if (!dragId || dragId === targetId) {
      setDragId(null);
      setDragOverId(null);
      return;
    }
    const list = [...(storeDbCourses || [])];
    const from = list.findIndex(course => course.id === dragId);
    const to = list.findIndex(course => course.id === targetId);
    if (from < 0 || to < 0) return;
    const [item] = list.splice(from, 1);
    list.splice(to, 0, item);
    const reordered = list.map((course, index) => ({ ...course, order: index }));
    setDbCourses(reordered);
    setDragId(null);
    setDragOverId(null);
    try {
      await api.put('/courses-api/reorder', { orders: reordered.map(course => ({ id: course.id, order: course.order })) });
    } catch {}
  };

  const openCourse = (course) => {
    if (course.status !== 'live') return;
    try {
      const targetPath = course.route || (course.slug ? `/c/${course.slug}` : null);
      if (targetPath) sessionStorage.setItem('hcl-launch-route', targetPath);
    } catch {}
    if (course.route) navigate(course.route);
    else if (course.slug) navigate(`/c/${course.slug}`);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen" style={{ background: isLight ? 'linear-gradient(160deg, #f0f9ff 0%, #f8fafc 60%, #f5f0ff 100%)' : undefined }}>
      <header className="sticky top-0 z-40 backdrop-blur-md border-b"
        style={{ background: isLight ? 'rgba(248,250,252,0.97)' : 'rgba(3,10,20,0.88)', borderColor: isLight ? 'rgba(100,116,139,0.18)' : 'rgba(255,255,255,0.05)' }}>
        <div className="max-w-[92rem] mx-auto px-4 py-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex items-center gap-2 shrink-0">
              <HCLSoftwareWordmark textClassName={`text-base ${isLight ? 'text-slate-950' : 'text-white'}`} />
              <span className={`font-orbitron font-bold text-sm tracking-wide whitespace-nowrap ${isLight ? 'text-slate-900' : 'text-white'}`}>Learning Hub</span>
            </div>
            <div className="flex-1 min-w-[14rem] max-w-2xl relative">
              <Search size={14} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-400' : 'text-slate-600'}`} />
              <input
                value={courseSearch}
                onChange={event => setCourseSearch(event.target.value)}
                placeholder="Smart search courses, skills, modules..."
                className={`w-full pl-9 pr-10 py-2.5 rounded-xl text-sm focus:outline-none ${isLight ? 'text-slate-900 placeholder:text-slate-500' : 'text-slate-200 placeholder:text-slate-600'}`}
                style={{ background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.04)', border: isLight ? '1px solid rgba(100,116,139,0.25)' : '1px solid rgba(255,255,255,0.08)' }}
              />
              {courseSearch && <button onClick={() => setCourseSearch('')} className={`absolute right-3 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-400 hover:text-slate-700' : 'text-slate-600 hover:text-slate-300'}`}>✕</button>}
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end">
            {/* ── My Learning dropdown ── */}
            <div className="relative" ref={myLearningRef}>
              <button
                onClick={() => setMyLearningOpen(open => !open)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs transition-all ${isLight ? 'text-slate-700 hover:text-slate-900' : 'text-slate-300 hover:text-white'}`}
                style={{ border: isLight ? '1px solid rgba(100,116,139,0.3)' : '1px solid rgba(255,255,255,0.07)', background: isLight ? lightPanel : 'rgba(255,255,255,0.03)' }}>
                <GraduationCap size={13} className="text-cyan-400" />
                <span className="hidden sm:block">My Learning</span>
                <ChevronDown size={12} className={`transition-transform ${myLearningOpen ? 'rotate-180' : ''}`} />
              </button>
              {myLearningOpen && (
                <div className="absolute left-0 top-full mt-2 w-80 rounded-2xl overflow-hidden z-50"
                  style={{ background: isLight ? '#ffffff' : 'rgba(8,18,32,0.97)', border: isLight ? '1px solid rgba(100,116,139,0.2)' : '1px solid rgba(255,255,255,0.1)', boxShadow: isLight ? '0 8px 32px rgba(0,0,0,0.14)' : '0 16px 48px rgba(0,0,0,0.4)', backdropFilter: 'blur(16px)' }}>
                  <div className="px-4 py-3 border-b" style={{ borderColor: isLight ? 'rgba(148,163,184,0.18)' : 'rgba(255,255,255,0.07)' }}>
                    <p className={`text-xs font-black tracking-widest uppercase ${isLight ? 'text-slate-800' : 'text-white'}`}>My Learning</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Only your recent in-progress and completed tracks.</p>
                  </div>
                  <div className="py-2 max-h-[60vh] overflow-y-auto">
                    {currentLearning ? (
                      <button onClick={() => { setMyLearningOpen(false); openLearning(currentLearning); }} className="mx-4 mb-3 w-[calc(100%-2rem)] rounded-2xl p-4 text-left transition-all hover:opacity-90" style={{ background: isLight ? 'rgba(248,250,252,0.8)' : 'rgba(6,182,212,0.1)', border: `1px solid ${(currentLearning.color || currentLearning.accentColor || '#06b6d4')}33` }}>
                        <p className="text-[10px] font-black tracking-widest uppercase text-slate-500 mb-1">Current Course</p>
                        <p className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>{currentLearning.title}</p>
                        <p className="text-[11px] mt-1" style={{ color: currentLearning.color || currentLearning.accentColor || '#06b6d4' }}>{currentLearning.stage}</p>
                        <p className="text-[11px] text-slate-500 mt-1">{currentLearning.progressText}</p>
                      </button>
                    ) : (
                      <div className="mx-4 mb-3 rounded-2xl p-4" style={{ background: isLight ? '#f8fafc' : 'rgba(255,255,255,0.02)', border: isLight ? '1px solid rgba(100,116,139,0.18)' : '1px solid rgba(255,255,255,0.05)' }}>
                        <p className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>No learning progress yet</p>
                        <p className="text-[11px] text-slate-500 mt-1">Start a course and your recent progress will appear here.</p>
                      </div>
                    )}
                    <div className="px-4 pb-2 space-y-2">
                      {myLearning.map(course => (
                        <button key={course.slug || course.id} onClick={() => { setMyLearningOpen(false); openLearning(course); }} className="w-full rounded-xl px-3 py-2.5 text-left transition-all hover:opacity-90" style={{ background: isLight ? '#f8fafc' : 'rgba(255,255,255,0.02)', border: isLight ? '1px solid rgba(100,116,139,0.18)' : '1px solid rgba(255,255,255,0.05)' }}>
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0" style={{ background: (course.color || course.accentColor || '#06b6d4') + '18', border: `1px solid ${(course.color || course.accentColor || '#06b6d4')}35` }}>{course.icon || course.emoji || '📚'}</div>
                            <div className="min-w-0 flex-1">
                              <p className={`text-xs font-semibold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>{course.title}</p>
                              <p className="text-[10px] mt-0.5" style={{ color: course.color || course.accentColor || '#06b6d4' }}>{course.stage}</p>
                              <p className="text-[10px] text-slate-500 mt-1 truncate">{course.progressText}</p>
                            </div>
                            {course.percentage != null && <span className="text-[10px] font-bold text-slate-500">{course.percentage}%</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setFilterOpen(open => !open)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs transition-all ${isLight ? 'text-slate-700 hover:text-slate-900' : 'text-slate-300 hover:text-white'}`}
                style={{ border: isLight ? '1px solid rgba(100,116,139,0.3)' : '1px solid rgba(255,255,255,0.07)', background: isLight ? lightPanel : 'rgba(255,255,255,0.03)' }}>
                <Sparkles size={13} className="text-cyan-400" />
                {activeFilter.label}
                <ChevronDown size={12} className={`transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
              </button>
              {filterOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl overflow-hidden z-50"
                  style={{ background: isLight ? '#ffffff' : 'rgba(8,18,32,0.97)', border: isLight ? '1px solid rgba(100,116,139,0.2)' : '1px solid rgba(255,255,255,0.1)', boxShadow: isLight ? '0 8px 24px rgba(0,0,0,0.12)' : '0 16px 48px rgba(0,0,0,0.18)', backdropFilter: 'blur(16px)' }}>
                  {COURSE_FILTERS.map(option => (
                    <button key={option.id} onClick={() => { setCourseFilter(option.id); setFilterOpen(false); }} className={`w-full px-4 py-3 text-left transition-colors ${isLight ? 'hover:bg-slate-300/60' : 'hover:bg-white/5'}`}>
                      <p className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{option.label}</p>
                      <p className="text-[10px] text-slate-500">{option.description}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative" ref={profileRef}>
              <button onClick={() => setProfileOpen(open => !open)} className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${isLight ? 'text-slate-700 hover:text-slate-900' : 'text-slate-300 hover:text-white'}`} style={{ border: isLight ? '1px solid rgba(100,116,139,0.3)' : '1px solid rgba(255,255,255,0.07)', background: isLight ? lightPanel : 'rgba(255,255,255,0.03)' }}>
                {avatar ? <AvatarDisplay avatar={avatar} size="xs" /> : <UserCircle size={18} className={isLight ? 'text-slate-500' : 'text-slate-400'} />}
                <span className={`text-xs hidden sm:block max-w-[120px] truncate ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{playerName || auth?.name || 'Commander'}</span>
                <ChevronDown size={12} className="text-slate-500 transition-transform" style={{ transform: profileOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 rounded-xl overflow-hidden z-50" style={{ background: isLight ? '#ffffff' : 'rgba(8,18,32,0.97)', border: isLight ? '1px solid rgba(100,116,139,0.2)' : '1px solid rgba(255,255,255,0.1)', boxShadow: isLight ? '0 8px 32px rgba(0,0,0,0.14)' : '0 16px 48px rgba(0,0,0,0.4)', backdropFilter: 'blur(16px)' }}>
                  <div className="px-4 py-3 border-b" style={{ borderColor: isLight ? 'rgba(148,163,184,0.18)' : 'rgba(255,255,255,0.07)' }}>
                    <div className="flex items-center gap-3">
                      {avatar ? <AvatarDisplay avatar={avatar} size="sm" /> : <div className="w-9 h-9 rounded-xl bg-cyan-500/20 flex items-center justify-center"><UserCircle size={20} className="text-cyan-400" /></div>}
                      <div className="min-w-0">
                        <p className={`text-sm font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>{playerName || auth?.name || 'Commander'}</p>
                        {auth?.email && <p className="text-[10px] text-slate-500 truncate">{auth.email}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="py-1 max-h-[70vh] overflow-y-auto">
                    <button onClick={() => { setProfileOpen(false); navigate('/avatar'); }} className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs transition-colors text-left ${isLight ? 'text-slate-700 hover:bg-slate-300/50 hover:text-slate-900' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}><Pencil size={13} className="text-cyan-400" />Edit Commander</button>
                    {auth?.role === 'ADMIN' && <button onClick={() => { setProfileOpen(false); navigate('/admin'); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-red-300 hover:bg-red-500/10 hover:text-red-200 transition-colors text-left"><ShieldCheck size={13} className="text-red-400" />User Management</button>}
                    {(auth?.role === 'ADMIN' || auth?.role === 'MANAGER') && <button onClick={() => { setProfileOpen(false); navigate('/tracker'); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-amber-300 hover:bg-amber-500/10 hover:text-amber-200 transition-colors text-left"><GraduationCap size={13} className="text-amber-400" />Learner Tracker</button>}
                    {auth?.role === 'ADMIN' && <button onClick={() => { setProfileOpen(false); navigate('/admin?tab=courses'); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-violet-300 hover:bg-violet-500/10 hover:text-violet-200 transition-colors text-left"><Map size={13} className="text-violet-400" />Courses</button>}
                    {showModeratedCoursesEntry && (
                      <>
                        <div className="my-1 border-t" style={{ borderColor: isLight ? 'rgba(148,163,184,0.18)' : 'rgba(255,255,255,0.07)' }} />
                        <button onClick={() => { setProfileOpen(false); setModeratedCoursesOpen(true); }} className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs transition-colors text-left ${isLight ? 'text-slate-700 hover:bg-slate-300/50 hover:text-slate-900' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
                          <Pencil size={13} className="text-cyan-400" />
                          <span className="flex-1">Moderated Courses</span>
                          <ChevronRight size={13} className="text-slate-400" />
                        </button>
                      </>
                    )}
                    <div className="my-1 border-t" style={{ borderColor: isLight ? 'rgba(148,163,184,0.18)' : 'rgba(255,255,255,0.07)' }} />
                    <button onClick={() => { setProfileOpen(false); handleLogout(); }} className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs transition-colors text-left ${isLight ? 'text-slate-500 hover:bg-red-50 hover:text-red-500' : 'text-slate-400 hover:bg-red-500/8 hover:text-red-400'}`}><LogOut size={13} />Sign out</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[92rem] mx-auto px-4 pt-6 pb-16">
        <div className="lg:flex lg:gap-8 items-start">
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-20 flex flex-col gap-2">
              <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase mb-1 px-1">Quick Access</p>
              <button onClick={() => navigate('/my-paths')} className="flex items-center gap-3 rounded-xl px-3 py-2.5 w-full text-left transition-all hover:opacity-90 active:scale-95" style={{ background: isLight ? 'rgba(124,58,237,0.16)' : 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.28)' }}><BookOpen size={16} className="text-violet-400" /><span className={`text-sm font-semibold ${isLight ? 'text-violet-900' : 'text-violet-300'}`}>Learning Paths</span><ChevronRight size={13} className="ml-auto text-violet-500" /></button>
              <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase mt-6 mb-1 px-1">Platform Features</p>
              {PLATFORM_FEATURES.map(feature => (
                <div key={feature.title} className="rounded-xl px-3 py-2.5 border" style={{ background: isLight ? 'rgba(148,163,184,0.18)' : 'rgba(255,255,255,0.02)', borderColor: isLight ? 'rgba(71,85,105,0.22)' : 'rgba(255,255,255,0.05)' }}>
                  <div className="flex items-center gap-2 mb-1"><span className="text-base leading-none">{feature.icon}</span><span className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{feature.title}</span></div>
                  <p className={`text-[11px] leading-snug ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>{feature.desc}</p>
                </div>
              ))}
              <div className="mt-4 self-start rounded-xl px-3 py-2 text-[11px] font-bold" style={{ background: isLight ? 'rgba(124,58,237,0.16)' : 'rgba(124,58,237,0.14)', border: '1px solid rgba(124,58,237,0.25)', color: isLight ? '#4c1d95' : '#c4b5fd' }}>Help Session → bottom right</div>
            </div>
          </aside>

          <div className="flex-1 min-w-0 mt-4 lg:mt-0">
            <div className="min-w-0">
              <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
                <div>
                  <p className={`font-orbitron text-xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Technology Tracks</p>
                  <p className="text-xs text-slate-500">{totalVisibleCount} result{totalVisibleCount !== 1 ? 's' : ''} · {activeFilter.description}</p>
                </div>
              </div>

              {sessionInvalid && (
                <div className="mb-5 rounded-2xl border px-4 py-3" style={{ background: isLight ? 'rgba(254,242,242,0.95)' : 'rgba(127,29,29,0.18)', borderColor: isLight ? 'rgba(248,113,113,0.30)' : 'rgba(248,113,113,0.25)' }}>
                  <p className={`text-sm font-semibold ${isLight ? 'text-red-700' : 'text-red-200'}`}>Session expired — please log in again.</p>
                  <button onClick={() => navigate('/login', { replace: true })} className="mt-2 text-xs font-bold text-cyan-500 hover:text-cyan-400">Go to login</button>
                </div>
              )}

              <div className="grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {visibleCourses.map(course => (
                  <CourseCard
                    key={course.id || course.slug}
                    course={course}
                    isAdmin={isAdmin}
                    isLight={isLight}
                    dragId={dragId}
                    dragOverId={dragOverId}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onDragEnd={() => { setDragId(null); setDragOverId(null); }}
                    onOpen={openCourse}
                    onNavigateEdit={(slug) => navigate(`/admin/courses/${slug}/edit`)}
                    onEnroll={setEnrollingCourse}
                  />
                ))}

                {totalVisibleCount === 0 && (
                  <div className="sm:col-span-2 xl:col-span-3 2xl:col-span-4 rounded-2xl p-10 text-center border border-dashed" style={{ borderColor: isLight ? 'rgba(71,85,105,0.28)' : 'rgba(255,255,255,0.08)', background: isLight ? 'rgba(148,163,184,0.16)' : 'transparent' }}>
                    <Search size={24} className="text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">No courses match "<span className={isLight ? 'text-slate-700' : 'text-slate-300'}>{courseSearch}</span>"</p>
                    <button onClick={() => setCourseSearch('')} className="text-xs text-cyan-500 hover:text-cyan-400 mt-2">Clear search</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {enrollingCourse && (
        <PathEnrollModal course={enrollingCourse} onClose={() => setEnrollingCourse(null)} isLight={isLight} />
      )}
      {moderatedCoursesOpen && (
        <ModeratedCoursesSheet
          courses={moderatedCourses}
          isLight={isLight}
          onClose={() => setModeratedCoursesOpen(false)}
          onSelect={(course) => {
            setModeratedCoursesOpen(false);
            navigate(`/admin/courses/${course.slug}/edit`);
          }}
        />
      )}
    </div>
  );
}
