import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Users } from 'lucide-react';
import { api } from '../lib/api.js';
import { getAuth } from './LoginPage.jsx';

const MODULE_META = {
  'ai-quest':    { label: 'AI Quest',    color: '#06b6d4', bg: 'rgba(6,182,212,0.12)',  border: 'rgba(6,182,212,0.3)'  },
  'devops-loop': { label: 'DevOps Loop', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.3)' },
};

const CERT_STATUS_STYLE = {
  achieved:    { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.3)'  },
  'in-progress': { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)'  },
  assigned:    { color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)' },
};

const cardStyle = { background: 'rgba(3,10,20,0.6)', border: '1px solid rgba(255,255,255,0.06)' };

function StatCard({ value, label, color = '#67e8f9' }) {
  return (
    <div className="rounded-xl p-4" style={cardStyle}>
      <p className="text-2xl font-black" style={{ color }}>{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

function ModuleChip({ module, quests, xp }) {
  const m = MODULE_META[module] || { label: module, color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)' };
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: m.bg, border: `1px solid ${m.border}`, color: m.color }}
    >
      {m.label}: {quests}Q · {xp.toLocaleString()} XP
    </span>
  );
}

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

function LearnerRow({ learner, expanded, onToggle }) {
  const initials = (learner.name || learner.email || '?')
    .split(' ').slice(0, 2).map(p => p[0]?.toUpperCase()).join('');

  const achievedCerts  = learner.certifications.filter(c => c.status === 'achieved');
  const inProgressCerts = learner.certifications.filter(c => c.status === 'in-progress');
  const allCerts = [...achievedCerts, ...inProgressCerts, ...learner.certifications.filter(c => c.status === 'assigned')];

  const modules = Object.entries(learner.byModule);
  const lastDate = learner.lastActivity ? new Date(learner.lastActivity).toLocaleDateString() : '—';

  return (
    <>
      <tr
        className="border-b border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer"
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
              <p className="text-sm font-semibold text-white">{learner.name}</p>
              <p className="text-[11px] text-slate-500">{learner.email}</p>
            </div>
          </div>
        </td>

        {/* Managers */}
        <td className="px-4 py-3">
          {(!learner.managers || learner.managers.length === 0)
            ? <span className="text-[11px] text-slate-700">—</span>
            : <div className="flex flex-wrap gap-1">
                {learner.managers.map(m => (
                  <span key={m.id}
                    className="text-[10px] px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', color: '#fbbf24' }}
                  >{m.name}</span>
                ))}
              </div>
          }
        </td>

        {/* Modules */}
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {modules.length === 0
              ? <span className="text-[11px] text-slate-700">No activity</span>
              : modules.map(([mod, data]) => (
                  <ModuleChip key={mod} module={mod} quests={data.quests} xp={data.xp} />
                ))}
          </div>
        </td>

        {/* Quests + XP */}
        <td className="px-4 py-3 text-center">
          <p className="text-sm font-bold text-white">{learner.questsCompleted}</p>
          <p className="text-[10px] text-slate-600">{learner.totalXP.toLocaleString()} XP</p>
        </td>

        {/* Certifications */}
        <td className="px-4 py-3">
          {allCerts.length === 0
            ? <span className="text-[11px] text-slate-700">None</span>
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
        <td className="px-4 py-3 text-[11px] text-slate-500">{lastDate}</td>

        {/* Expand */}
        <td className="px-4 py-3 text-center">
          <span className="text-slate-600 text-xs">{expanded ? '▲' : '▼'}</span>
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-white/5">
          <td colSpan={7} className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* Module breakdown */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Module Progress</p>
                {modules.length === 0
                  ? <p className="text-[11px] text-slate-700">No quests completed yet.</p>
                  : modules.map(([mod, data]) => {
                      const m = MODULE_META[mod] || { label: mod, color: '#94a3b8' };
                      return (
                        <div key={mod} className="mb-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span style={{ color: m.color }}>{m.label}</span>
                            <span className="text-slate-400">{data.quests} quests · {data.xp.toLocaleString()} XP</span>
                          </div>
                          {data.lastActivity && (
                            <p className="text-[10px] text-slate-600">
                              Last: {new Date(data.lastActivity).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      );
                    })}
              </div>

              {/* Certifications */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Certifications</p>
                {allCerts.length === 0
                  ? <p className="text-[11px] text-slate-700">No certifications assigned.</p>
                  : <div className="flex flex-wrap gap-1.5">
                      {allCerts.map((c, i) => <CertBadge key={i} cert={c} />)}
                    </div>}
              </div>

              {/* Badges + stats */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Stats</p>
                <div className="space-y-1.5 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>Badges earned</span>
                    <span className="text-amber-400 font-bold">{learner.badgeCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total XP</span>
                    <span className="text-cyan-400 font-bold">{learner.totalXP.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Certs achieved</span>
                    <span className="text-emerald-400 font-bold">{achievedCerts.length}</span>
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
function TeamSection({ node, depth = 0 }) {
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
        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all hover:bg-white/[0.03]"
        style={{ background: depth === 0 ? 'rgba(124,58,237,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${depth === 0 ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.06)'}` }}>
        {open
          ? <ChevronDown size={14} className="text-slate-500 flex-shrink-0" />
          : <ChevronRight size={14} className="text-slate-500 flex-shrink-0" />}
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
          style={{ background: depth === 0 ? 'linear-gradient(135deg,#7c3aed,#6366f1)' : 'rgba(255,255,255,0.08)' }}>
          {node.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{node.name}</p>
          <p className="text-[10px] text-slate-500 truncate">{node.email}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 text-right">
          {hasSubTeams && <span className="text-[10px] text-violet-400 font-bold">{node.directReports.length} sub-manager{node.directReports.length !== 1 ? 's' : ''}</span>}
          <span className="text-[10px] text-slate-500">{totalLearners + totalSubLearners} learner{(totalLearners + totalSubLearners) !== 1 ? 's' : ''}</span>
        </div>
      </button>

      {open && (
        <div className="mt-2 ml-3 pl-3" style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Direct learners of this manager */}
          {node.learners && node.learners.length > 0 && (
            <div className="mb-3">
              {depth > 0 && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-1.5 px-1">Direct Team</p>
              )}
              <div className="rounded-xl overflow-hidden" style={cardStyle}>
                <table className="w-full">
                  <tbody>
                    {node.learners.map(l => (
                      <LearnerRow key={l.id} learner={l} expanded={expandedId === l.id}
                        onToggle={() => setExpandedId(id => id === l.id ? null : l.id)} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub-manager sections */}
          {hasSubTeams && node.directReports.map(sub => (
            <TeamSection key={sub.id} node={sub} depth={depth + 1} />
          ))}

          {node.learners?.length === 0 && !hasSubTeams && (
            <p className="text-[11px] text-slate-700 italic px-2 py-1">No team members yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function LearnerTracker({ asTab = false }) {
  const auth = getAuth();
  const [learners, setLearners]   = useState([]);
  const [tree, setTree]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');
  const [moduleFilter, setModuleFilter] = useState('ALL');
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

  const filtered = useMemo(() => {
    let list = learners;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(l => l.name?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q));
    }
    if (moduleFilter !== 'ALL') {
      list = list.filter(l => Boolean(l.byModule?.[moduleFilter]));
    }
    if (sortBy === 'name')    list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === 'xp')      list = [...list].sort((a, b) => b.totalXP - a.totalXP);
    if (sortBy === 'quests')  list = [...list].sort((a, b) => b.questsCompleted - a.questsCompleted);
    if (sortBy === 'certs')   list = [...list].sort((a, b) => b.certifications.filter(c => c.status === 'achieved').length - a.certifications.filter(c => c.status === 'achieved').length);
    if (sortBy === 'activity') list = [...list].sort((a, b) => (b.lastActivity || '').localeCompare(a.lastActivity || ''));
    return list;
  }, [learners, search, moduleFilter, sortBy]);

  const stats = useMemo(() => ({
    total:     learners.length,
    active:    learners.filter(l => l.questsCompleted > 0).length,
    totalXP:   learners.reduce((s, l) => s + l.totalXP, 0),
    certsAchieved: learners.reduce((s, l) => s + l.certifications.filter(c => c.status === 'achieved').length, 0),
  }), [learners]);

  const content = (
    <div className={asTab ? '' : 'min-h-screen px-4 py-8 max-w-7xl mx-auto'}>
      {!asTab && (
        <div className="flex items-center gap-4 mb-6">
          <Link to="/courses" className="text-slate-500 hover:text-slate-300 transition-colors text-sm">← Back</Link>
          <div className="flex-1">
            <h1 className="font-orbitron text-2xl font-black bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
              Learner Tracker
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {auth?.role === 'MANAGER' ? 'Team learning progress overview' : 'All learner progress across modules'}
            </p>
          </div>
          {/* View mode toggle */}
          {tree && (
            <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <button onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                ≡ List
              </button>
              <button onClick={() => setViewMode('tree')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'tree' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                <Users size={11} /> Tree
              </button>
            </div>
          )}
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard value={stats.total}                      label="Total Learners"    color="#67e8f9"/>
        <StatCard value={stats.active}                     label="Active Learners"   color="#a78bfa"/>
        <StatCard value={stats.totalXP.toLocaleString()}   label="Total XP Earned"   color="#fbbf24"/>
        <StatCard value={stats.certsAchieved}              label="Certs Achieved"    color="#34d399"/>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="flex-1 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        />
        <div className="flex gap-2 flex-wrap">
          {['ALL', 'ai-quest', 'devops-loop'].map(m => {
            const label = m === 'ALL' ? 'All Modules' : MODULE_META[m]?.label;
            const active = moduleFilter === m;
            return (
              <button key={m} onClick={() => setModuleFilter(m)}
                className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: active ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.04)',
                  border: active ? '1px solid rgba(6,182,212,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  color: active ? '#67e8f9' : '#64748b',
                }}>
                {label}
              </button>
            );
          })}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-bold focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b' }}
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
        <div className="flex items-center justify-center py-20 gap-3 rounded-2xl" style={cardStyle}>
          <div className="w-6 h-6 border-2 border-white/20 border-t-cyan-400 rounded-full animate-spin"/>
          <span className="text-slate-500 text-sm">Loading learner data…</span>
        </div>
      ) : error ? (
        <div className="py-20 text-center rounded-2xl" style={cardStyle}>
          <p className="text-red-400 text-sm">⚠ {error}</p>
        </div>
      ) : viewMode === 'tree' && tree ? (
        <div>
          <TeamSection node={tree} depth={0} />
          <p className="text-center text-slate-700 text-xs mt-3">
            {learners.length} learner{learners.length !== 1 ? 's' : ''} across your team tree
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl overflow-hidden" style={cardStyle}>
            {filtered.length === 0 ? (
              <div className="py-20 text-center text-slate-600 text-sm">No learners match.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      {['Learner', 'Manager(s)', 'Module Progress', 'Quests / XP', 'Certifications', 'Last Active', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(l => (
                      <LearnerRow key={l.id} learner={l} expanded={expandedId === l.id}
                        onToggle={() => setExpandedId(id => id === l.id ? null : l.id)} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <p className="text-center text-slate-700 text-xs mt-3">
            {filtered.length} of {learners.length} learners · Click any row to expand details
          </p>
        </>
      )}
    </div>
  );

  return content;
}
