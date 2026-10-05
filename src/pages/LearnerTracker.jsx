import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Users } from 'lucide-react';
import { api } from '../lib/api.js';
import { getAuth } from './LoginPage.jsx';
import { useAppStore } from '../App.jsx';

const MODULE_META = {
  'ai-quest':    { label: 'AI Quest',    color: '#06b6d4', bg: 'rgba(6,182,212,0.12)',  border: 'rgba(6,182,212,0.3)'  },
  'devops-loop': { label: 'DevOps Loop', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.3)' },
};

const CERT_STATUS_STYLE = {
  achieved:    { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.3)'  },
  'in-progress': { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)'  },
  assigned:    { color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)' },
};

const COURSE_STATUS_STYLE = {
  completed:  { color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.28)', label: 'Completed' },
  opted:      { color: '#6366f1', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.28)', label: 'Opted' },
  'not-started': { color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)', label: 'Not Started' },
};

const getCardStyle = (isLight) => ({
  background: isLight ? 'rgba(148,163,184,0.28)' : 'rgba(3,10,20,0.6)',
  border: isLight ? '1px solid rgba(71,85,105,0.24)' : '1px solid rgba(255,255,255,0.06)',
});

function CertBadge({ cert }) {
  const s = CERT_STATUS_STYLE[cert.status] || CERT_STATUS_STYLE.assigned;
  const label = `${cert.certId === 'devops-loop' ? 'DevOps' : 'AI'} ${cert.level}`;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}
    >
      {cert.status === 'achieved' ? '✓' : cert.status === 'in-progress' ? '◐' : '○'} {label}
    </span>
  );
}

function LearnerRow({ learner, expanded, onToggle, isLight }) {
  const initials = (learner.name || learner.email || '?')
    .split(' ').slice(0, 2).map(p => p[0]?.toUpperCase()).join('');

  const achievedCerts  = learner.certifications.filter(c => c.status === 'achieved');
  const inProgressCerts = learner.certifications.filter(c => c.status === 'in-progress');
  const allCerts = [...achievedCerts, ...inProgressCerts, ...learner.certifications.filter(c => c.status === 'assigned')];

  const trackedCourses = Array.isArray(learner.courseProgress) ? learner.courseProgress : [];
  const startedCourses = trackedCourses;
  const completedCourses = trackedCourses.filter(course => course.status === 'completed');
  const activeCourses = trackedCourses.filter(course => course.status === 'in-progress');
  const lastDate = learner.lastActivity ? new Date(learner.lastActivity).toLocaleDateString() : '—';

  return (
    <>
      <tr
        className={`border-b transition-colors cursor-pointer ${isLight ? 'border-slate-500/10 hover:bg-slate-300/30' : 'border-white/5 hover:bg-white/[0.02]'}`}
        onClick={onToggle}
      >
        {/* Learner */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0"
              style={{ background: 'linear-gradient(135deg,#06b6d4,#7c3aed)' }}
            >
              {initials}
            </div>
            <div>
              <p className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>{learner.name}</p>
              <p className={`text-[11px] ${isLight ? 'text-slate-700' : 'text-slate-500'}`}>{learner.email}</p>
            </div>
          </div>
        </td>

        {/* Managers */}
        <td className="px-4 py-3">
          {(!learner.managers || learner.managers.length === 0)
            ? <span className={`text-[11px] ${isLight ? 'text-slate-700' : 'text-slate-700'}`}>—</span>
            : <div className="flex flex-wrap gap-1">
                {learner.managers.map(m => (
                  <span key={m.id}
                    className="text-[10px] px-1.5 py-0.5 rounded-full"
                    style={{ background: isLight ? 'rgba(217,119,6,0.12)' : 'rgba(251,191,36,0.1)', border: isLight ? '1px solid rgba(217,119,6,0.24)' : '1px solid rgba(251,191,36,0.25)', color: isLight ? '#92400e' : '#fbbf24' }}
                  >{m.name}</span>
                ))}
              </div>
          }
        </td>

        {/* Courses */}
        <td className="px-4 py-3">
          {startedCourses.length === 0 ? (
            <span className={`text-[11px] ${isLight ? 'text-slate-700' : 'text-slate-700'}`}>No started courses</span>
          ) : (
            <span className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{startedCourses.length}</span>
          )}
        </td>

        {/* Certifications */}
        <td className="px-4 py-3">
          {allCerts.length === 0
            ? <span className={`text-[11px] ${isLight ? 'text-slate-700' : 'text-slate-700'}`}>None</span>
            : <div className="flex flex-wrap gap-1">
                {achievedCerts.length > 0 && (
                  <span className="text-[10px] font-bold text-emerald-400">
                    {achievedCerts.length} achieved
                  </span>
                )}
                {inProgressCerts.length > 0 && (
                  <span className="text-[10px] text-amber-400">
                    · {inProgressCerts.length} in progress
                  </span>
                )}
              </div>}
        </td>

        {/* Last activity */}
        <td className={`px-4 py-3 text-[11px] ${isLight ? 'text-slate-700' : 'text-slate-500'}`}>{lastDate}</td>

        {/* Expand */}
        <td className="px-4 py-3 text-center">
          <span className={`text-xs ${isLight ? 'text-slate-700' : 'text-slate-600'}`}>{expanded ? '▲' : '▼'}</span>
        </td>
      </tr>

      {expanded && (
        <tr className={isLight ? 'border-b border-slate-500/10' : 'border-b border-white/5'}>
          <td colSpan={6} className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* Course status */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Started Courses</p>
                {trackedCourses.length === 0
                  ? <p className={`text-[11px] ${isLight ? 'text-slate-700' : 'text-slate-700'}`}>No started course activity yet.</p>
                  : trackedCourses.map((course) => {
                      const style = COURSE_STATUS_STYLE[course.status] || COURSE_STATUS_STYLE['not-started'];
                      return (
                        <div key={course.slug} className="mb-2 rounded-lg px-3 py-2" style={{ background: isLight ? 'rgba(248,250,252,0.95)' : 'rgba(255,255,255,0.03)', border: isLight ? '1px solid rgba(148,163,184,0.18)' : '1px solid rgba(255,255,255,0.06)' }}>
                          <div className="flex justify-between gap-3 text-xs mb-1">
                            <span className={isLight ? 'text-slate-900 font-semibold' : 'text-slate-200 font-semibold'}>{course.title}</span>
                            <span style={{ color: style.color }}>{style.label}</span>
                          </div>
                          <div className="flex justify-between gap-3 text-[10px]">
                            <span className={isLight ? 'text-slate-700' : 'text-slate-400'}>{course.completedQuests} / {course.totalQuests} quests</span>
                            <span className={isLight ? 'text-slate-700' : 'text-slate-400'}>{course.percentage}% complete</span>
                          </div>
                        </div>
                      );
                    })}
              </div>

              {/* Certifications */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Certifications</p>
                {allCerts.length === 0
                  ? <p className={`text-[11px] ${isLight ? 'text-slate-700' : 'text-slate-700'}`}>No certifications assigned.</p>
                  : <div className="flex flex-wrap gap-1.5">
                      {allCerts.map((c, i) => <CertBadge key={i} cert={c} />)}
                    </div>}
              </div>

              {/* Badges + stats */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Stats</p>
                <div className={`space-y-1.5 text-xs ${isLight ? 'text-slate-800' : 'text-slate-400'}`}>
                  <div className="flex justify-between">
                    <span>Courses started</span>
                    <span className="text-cyan-400 font-bold">{startedCourses.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Courses completed</span>
                    <span className="text-emerald-400 font-bold">{completedCourses.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Courses in progress</span>
                    <span className="text-amber-400 font-bold">{activeCourses.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Tree Node component (recursive) ──────────────────────────────────────────
function TeamSection({ node, depth = 0, isLight }) {
  const [open, setOpen] = useState(depth < 2);
  const [expandedId, setExpandedId] = useState(null);
  const hasSubTeams = node.directReports && node.directReports.length > 0;
  const totalLearners = node.learners?.length || 0;
  const totalSubLearners = (node.directReports || []).reduce((s, r) => s + (r.learners?.length || 0), 0);

  const indent = { marginLeft: `${depth * 20}px` };

  return (
    <div className="mb-3" style={indent}>
      {/* Manager header */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all ${isLight ? 'hover:bg-slate-300/30' : 'hover:bg-white/[0.03]'}`}
        style={{ background: depth === 0 ? (isLight ? 'rgba(167,139,250,0.16)' : 'rgba(124,58,237,0.06)') : (isLight ? 'rgba(148,163,184,0.18)' : 'rgba(255,255,255,0.02)'), border: `1px solid ${depth === 0 ? (isLight ? 'rgba(124,58,237,0.3)' : 'rgba(124,58,237,0.2)') : (isLight ? 'rgba(71,85,105,0.18)' : 'rgba(255,255,255,0.06)')}` }}>
        {open
          ? <ChevronDown size={14} className={`${isLight ? 'text-slate-700' : 'text-slate-500'} flex-shrink-0`} />
          : <ChevronRight size={14} className={`${isLight ? 'text-slate-700' : 'text-slate-500'} flex-shrink-0`} />}
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
          style={{ background: depth === 0 ? 'linear-gradient(135deg,#7c3aed,#6366f1)' : 'rgba(255,255,255,0.08)' }}>
          {node.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>{node.name}</p>
          <p className={`text-[10px] truncate ${isLight ? 'text-slate-700' : 'text-slate-500'}`}>{node.email}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 text-right">
          {hasSubTeams && <span className="text-[10px] text-violet-400 font-bold">{node.directReports.length} sub-manager{node.directReports.length !== 1 ? 's' : ''}</span>}
          <span className={`text-[10px] ${isLight ? 'text-slate-700' : 'text-slate-500'}`}>{totalLearners + totalSubLearners} learner{(totalLearners + totalSubLearners) !== 1 ? 's' : ''}</span>
        </div>
      </button>

      {open && (
        <div className="mt-2 ml-3 pl-3" style={{ borderLeft: isLight ? '1px solid rgba(71,85,105,0.18)' : '1px solid rgba(255,255,255,0.06)' }}>
          {/* Direct learners of this manager */}
          {node.learners && node.learners.length > 0 && (
            <div className="mb-3">
              {depth > 0 && (
                <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 px-1 ${isLight ? 'text-slate-700' : 'text-slate-600'}`}>Direct Team</p>
              )}
              <div className="rounded-xl overflow-hidden" style={getCardStyle(isLight)}>
                <table className="w-full">
                  <tbody>
                    {node.learners.map(l => (
                      <LearnerRow key={l.id} learner={l} expanded={expandedId === l.id} isLight={isLight}
                        onToggle={() => setExpandedId(id => id === l.id ? null : l.id)} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub-manager sections */}
          {hasSubTeams && node.directReports.map(sub => (
            <TeamSection key={sub.id} node={sub} depth={depth + 1} isLight={isLight} />
          ))}

          {node.learners?.length === 0 && !hasSubTeams && (
            <p className={`text-[11px] italic px-2 py-1 ${isLight ? 'text-slate-700' : 'text-slate-700'}`}>No team members yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function LearnerTracker({ asTab = false }) {
  const auth = getAuth();
  const { theme } = useAppStore();
  const isLight = theme === 'light';
  const [learners, setLearners]   = useState([]);
  const [tree, setTree]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');
  const [courseFilter, setCourseFilter] = useState('ALL');
  const [expandedId, setExpandedId]     = useState(null);
  const [sortBy, setSortBy]             = useState('name');
  const [viewMode, setViewMode]         = useState('list'); // 'list' | 'tree'

  useEffect(() => {
    (async () => {
      setLoading(true); setError('');
      try {
        const [data, treeData] = await Promise.all([
          api.get('/manager/all-learners'),
          api.get('/manager/tree').catch(() => null),
        ]);
        setLearners(Array.isArray(data) ? data : []);
        if (treeData) setTree(treeData);
      } catch (err) {
        setError(err?.message || 'Failed to load learner data');
      } finally { setLoading(false); }
    })();
  }, []);

  const courseOptions = useMemo(() => {
    const map = new Map();
    learners.forEach((learner) => {
      (learner.courseProgress || []).forEach((course) => {
        if (!course?.slug || map.has(course.slug)) return;
        map.set(course.slug, course.title || course.slug);
      });
    });

    const preferred = ['ai-quest', 'devops-loop'];
    const ordered = [];
    preferred.forEach((slug) => {
      if (map.has(slug)) ordered.push({ slug, title: map.get(slug) });
      map.delete(slug);
    });
    return [
      { slug: 'ALL', title: 'All Courses' },
      ...ordered,
      ...Array.from(map.entries())
        .map(([slug, title]) => ({ slug, title }))
        .sort((a, b) => a.title.localeCompare(b.title)),
    ];
  }, [learners]);

  const filtered = useMemo(() => {
    let list = learners;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(l => l.name?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q));
    }
    if (courseFilter !== 'ALL') {
      list = list.filter((learner) => (learner.courseProgress || []).some((course) => course.slug === courseFilter && course.status !== 'not-started'));
    }
    if (sortBy === 'name')    list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === 'xp')      list = [...list].sort((a, b) => b.totalXP - a.totalXP);
    if (sortBy === 'quests')  list = [...list].sort((a, b) => b.questsCompleted - a.questsCompleted);
    if (sortBy === 'certs')   list = [...list].sort((a, b) => b.certifications.filter(c => c.status === 'achieved').length - a.certifications.filter(c => c.status === 'achieved').length);
    if (sortBy === 'activity') list = [...list].sort((a, b) => (b.lastActivity || '').localeCompare(a.lastActivity || ''));
    return list;
  }, [learners, search, courseFilter, sortBy]);

  const content = (
    <div className={asTab ? '' : 'min-h-screen px-4 py-8 max-w-7xl mx-auto'}>
      {!asTab && (
        <div className="flex items-center gap-4 mb-6">
          <Link to="/courses" className={`transition-colors text-sm ${isLight ? 'text-slate-700 hover:text-slate-900' : 'text-slate-500 hover:text-slate-300'}`}>← Back</Link>
          <div className="flex-1">
            <h1 className="font-orbitron text-2xl font-black bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
              Learner Tracker
            </h1>
            <p className={`text-sm mt-0.5 ${isLight ? 'text-slate-700' : 'text-slate-500'}`}>
              {auth?.role === 'MANAGER' ? 'Team learning progress overview' : 'All learner progress across tracked courses'}
            </p>
          </div>
          {/* View mode toggle */}
          {tree && (
            <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: isLight ? 'rgba(148,163,184,0.22)' : 'rgba(255,255,255,0.04)', border: isLight ? '1px solid rgba(71,85,105,0.2)' : '1px solid rgba(255,255,255,0.08)' }}>
              <button onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'list' ? (isLight ? 'bg-slate-200 text-slate-900' : 'bg-white/10 text-white') : (isLight ? 'text-slate-700 hover:text-slate-900' : 'text-slate-500 hover:text-slate-300')}`}>
                ≡ List
              </button>
              <button onClick={() => setViewMode('tree')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'tree' ? (isLight ? 'bg-slate-200 text-slate-900' : 'bg-white/10 text-white') : (isLight ? 'text-slate-700 hover:text-slate-900' : 'text-slate-500 hover:text-slate-300')}`}>
                <Users size={11} /> Tree
              </button>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm focus:outline-none ${isLight ? 'text-slate-900 placeholder:text-slate-600' : 'text-white placeholder-slate-600'}`}
          style={{ background: isLight ? 'rgba(226,232,240,0.98)' : 'rgba(255,255,255,0.04)', border: isLight ? '1px solid rgba(100,116,139,0.28)' : '1px solid rgba(255,255,255,0.08)' }}
        />
        <div className="flex gap-2 flex-wrap">
          <select
            value={courseFilter}
            onChange={e => setCourseFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-bold focus:outline-none"
            style={{ background: isLight ? 'rgba(226,232,240,0.98)' : 'rgba(255,255,255,0.04)', border: isLight ? '1px solid rgba(100,116,139,0.28)' : '1px solid rgba(255,255,255,0.08)', color: isLight ? '#334155' : '#cbd5e1' }}
          >
            {courseOptions.map((course) => (
              <option key={course.slug} value={course.slug}>{course.title}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-bold focus:outline-none"
            style={{ background: isLight ? 'rgba(226,232,240,0.98)' : 'rgba(255,255,255,0.04)', border: isLight ? '1px solid rgba(100,116,139,0.28)' : '1px solid rgba(255,255,255,0.08)', color: isLight ? '#334155' : '#cbd5e1' }}
          >
            <option value="name">Sort: Name</option>
            <option value="xp">Sort: Top XP</option>
            <option value="quests">Sort: Most Quests</option>
            <option value="certs">Sort: Certs Achieved</option>
            <option value="activity">Sort: Recent Activity</option>
          </select>
        </div>
      </div>

      {/* ── Table or Tree ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 rounded-2xl" style={getCardStyle(isLight)}>
          <div className="w-6 h-6 border-2 border-white/20 border-t-cyan-400 rounded-full animate-spin"/>
          <span className={`text-sm ${isLight ? 'text-slate-700' : 'text-slate-500'}`}>Loading learner data…</span>
        </div>
      ) : error ? (
        <div className="py-20 text-center rounded-2xl" style={getCardStyle(isLight)}>
          <p className="text-red-400 text-sm">⚠ {error}</p>
        </div>
      ) : viewMode === 'tree' && tree ? (
        <div>
          <TeamSection node={tree} depth={0} isLight={isLight} />
          <p className={`text-center text-xs mt-3 ${isLight ? 'text-slate-700' : 'text-slate-700'}`}>
            {learners.length} learner{learners.length !== 1 ? 's' : ''} across your team tree
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl overflow-hidden" style={getCardStyle(isLight)}>
            {filtered.length === 0 ? (
              <div className={`py-20 text-center text-sm ${isLight ? 'text-slate-700' : 'text-slate-600'}`}>No learners match.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={isLight ? 'border-b border-slate-500/10' : 'border-b border-white/5'}>
                      {['Learner', 'Manager(s)', 'Courses Started', 'Certifications', 'Last Active', ''].map(h => (
                        <th key={h} className={`px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest ${isLight ? 'text-slate-700' : 'text-slate-600'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(l => (
                      <LearnerRow key={l.id} learner={l} expanded={expandedId === l.id} isLight={isLight}
                        onToggle={() => setExpandedId(id => id === l.id ? null : l.id)} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <p className={`text-center text-xs mt-3 ${isLight ? 'text-slate-700' : 'text-slate-700'}`}>
            {filtered.length} of {learners.length} learners · Click any row to expand details
          </p>
        </>
      )}
    </div>
  );

  return content;
}
