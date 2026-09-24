import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Plus, X, Clock, Award, ChevronDown, ChevronRight, GripVertical, Trash2, Edit2, Globe, Lock, BookOpen, Search } from 'lucide-react';
import { api } from '../lib/api.js';

// ── URL builder for course navigation ──────────────────────────────────────
const HARDCODED_ROUTES = { 'devops-loop':'/devops-loop', 'ai-quest':'/ai-quest' };
function buildCourseUrl(refId) {
  return HARDCODED_ROUTES[refId] || `/c/${refId}`;
}

function fmtDuration(mins) {
  if (!mins) return '';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60); const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function totalPathMins(items) {
  return (items || []).reduce((s, i) => s + (i.durationMinutes || 0), 0);
}

// ── Inline editable text ─────────────────────────────────────────────────────
function InlineEdit({ value, onChange, placeholder, className, large = false }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(value);
  const ref = useRef();
  const start = () => { setDraft(value); setEditing(true); setTimeout(() => ref.current?.focus(), 0); };
  const commit = () => { setEditing(false); if (draft.trim() !== value) onChange(draft.trim()); };
  if (editing) return large
    ? <textarea ref={ref} value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit}
        rows={2} placeholder={placeholder}
        className={`w-full bg-transparent border-b border-violet-500/50 focus:outline-none resize-none text-white pb-1 ${className}`} />
    : <input ref={ref} value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit}
        onKeyDown={e => e.key === 'Enter' && commit()}
        placeholder={placeholder}
        className={`w-full bg-transparent border-b border-violet-500/50 focus:outline-none text-white pb-1 ${className}`} />;
  return (
    <div onClick={start} className={`group flex items-center gap-2 cursor-text ${className}`}>
      <span className={value ? '' : 'text-slate-600'}>{value || placeholder}</span>
      <Edit2 size={12} className="text-slate-700 group-hover:text-slate-500 flex-shrink-0 transition-colors" />
    </div>
  );
}

// ── Duration input ───────────────────────────────────────────────────────────
function DurationInput({ value, onChange, accent }) {
  const [v, setV] = useState(value || '');
  const save = () => { const n = parseInt(v, 10); onChange(isNaN(n) ? null : n); };
  return (
    <div className="flex items-center gap-1">
      <Clock size={11} style={{ color: accent || '#06b6d4' }} />
      <input type="number" value={v} onChange={e => setV(e.target.value)} onBlur={save}
        placeholder="mins" min={0}
        className="w-16 text-[11px] text-center rounded-lg px-1.5 py-1 focus:outline-none"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}
        title="Duration in minutes" />
      <span className="text-[10px] text-slate-700">min</span>
    </div>
  );
}

// ── Course Browser (Add content modal) ──────────────────────────────────────
function CourseBrowser({ onAdd, existingRefIds, onClose }) {
  const [dbCourses, setDbCourses]   = useState([]);
  const [expanded, setExpanded]     = useState({});
  const [questsCache, setQuestsCache] = useState({});
  const [search, setSearch]         = useState('');

  useEffect(() => {
    api.get('/courses-api').then(d => {
      if (Array.isArray(d)) setDbCourses(d.sort((a,b) => (a.order??0)-(b.order??0)));
    }).catch(() => {});
  }, []);

  const allCourses = dbCourses;
  const filtered = allCourses.filter(c =>
    !search || c.title.toLowerCase().includes(search.toLowerCase()) ||
    (c.tagline || '').toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id) => {
    const willOpen = !expanded[id];
    setExpanded(e => ({ ...e, [id]: !e[id] }));
    if (willOpen && !questsCache[id]) {
      const course = allCourses.find(c => c.id === id);
      if (course) {
        api.get(`/courses-api/${course.id}/quests`)
          .then(d => setQuestsCache(q => ({ ...q, [id]: Array.isArray(d) ? d : [] })))
          .catch(() => setQuestsCache(q => ({ ...q, [id]: [] })));
      }
    }
  };

  const addItem = (type, refId, title, subtitle, emoji, accentColor) => {
    onAdd({ type, refId, title, subtitle, emoji: emoji || '📚', accentColor: accentColor || '#06b6d4' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-xl rounded-2xl overflow-hidden flex flex-col"
        style={{ background: 'rgba(6,12,28,0.98)', border: '1px solid rgba(124,58,237,0.3)', maxHeight: '80vh' }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-white/6">
          <BookOpen size={16} className="text-violet-400" />
          <div className="flex-1">
            <h3 className="text-sm font-bold text-white">Add Content</h3>
            <p className="text-[10px] text-slate-600">Select a course or specific module to add to your path</p>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-300"><X size={16} /></button>
        </div>
        {/* Search */}
        <div className="px-5 py-3 border-b border-white/5">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search courses…"
              className="w-full pl-8 pr-3 py-2 rounded-xl text-xs text-slate-300 focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
          </div>
        </div>
        {/* Course list */}
        <div className="overflow-y-auto flex-1 px-3 py-3 space-y-1">
          {filtered.map(course => {
            const accent = course.accentColor || '#06b6d4';
            const courseSlugKey = course.slug || course.id;
            const rawWeeks = course.weeks || [];
            const allModules = rawWeeks.flatMap(w => (w.modules || []).map(m => ({ ...m, weekTitle: w.title })));
            const slugKey = courseSlugKey;
            const alreadyAdded = existingRefIds.has(slugKey);
            return (
              <div key={course.id} className="rounded-xl overflow-hidden"
                style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                {/* Course row */}
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                    style={{ background: accent + '20', border: `1px solid ${accent}35` }}>
                    {course.emoji || '📚'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{course.title}</p>
                    {course.tagline && <p className="text-[10px] truncate" style={{ color: accent }}>{course.tagline}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => addItem('course', slugKey, course.title, course.tagline, course.emoji, accent)}
                      disabled={alreadyAdded}
                      className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all disabled:opacity-40"
                      style={{ background: alreadyAdded ? 'rgba(255,255,255,0.05)' : `${accent}25`, color: alreadyAdded ? '#475569' : accent, border: `1px solid ${alreadyAdded ? 'rgba(255,255,255,0.08)' : accent + '40'}` }}>
                      {alreadyAdded ? <Check size={10} /> : <Plus size={10} />}
                      {alreadyAdded ? 'Added' : 'Add'}
                    </button>
                    {(rawWeeks.length > 0 || allModules.length > 0) && (
                      <button onClick={() => toggle(course.id)}
                        className="text-slate-600 hover:text-slate-400 p-1">
                        {expanded[course.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                    )}
                  </div>
                </div>
                {/* Scenarios = Weeks (expanded) */}
                {expanded[course.id] && rawWeeks.length > 0 && (
                  <div className="border-t border-white/5 pl-11 pr-3 pb-2 space-y-1">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-700 pt-1.5 pb-0.5">Scenarios</p>
                    {rawWeeks.map(w => {
                      const scenAdded = existingRefIds.has(w.id);
                      return (
                        <div key={w.id} className="flex items-center gap-2 py-1">
                          <span className="text-sm">📋</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-slate-300 truncate">{w.title}</p>
                            <p className="text-[9px] text-slate-600">Week {w.weekNumber} · {(w.modules || []).length} module{(w.modules || []).length !== 1 ? 's' : ''}</p>
                          </div>
                          <button onClick={() => addItem('scenario', w.id, w.title, `${course.title} · Week ${w.weekNumber}`, '📋', '#10b981')}
                            disabled={scenAdded}
                            className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg transition-all disabled:opacity-40"
                            style={{ background: scenAdded ? 'rgba(255,255,255,0.04)' : 'rgba(16,185,129,0.1)', color: scenAdded ? '#475569' : '#10b981', border: `1px solid ${scenAdded ? 'rgba(255,255,255,0.08)' : 'rgba(16,185,129,0.25)'}` }}>
                            {scenAdded ? <Check size={9} /> : <Plus size={9} />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              {/* Modules (expanded) */}
                {expanded[course.id] && allModules.length > 0 && (
                  <div className="border-t border-white/5 pl-11 pr-3 pb-2 space-y-1">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 pt-1.5 pb-0.5">Modules</p>
                    {allModules.map(m => {
                      const moduleAdded = existingRefIds.has(m.id);
                      return (
                        <div key={m.id} className="flex items-center gap-2 py-1">
                          <span className="text-sm">{m.icon || '📖'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-slate-300 truncate">{m.title}</p>
                            <p className="text-[9px] text-slate-600">{m.weekTitle}</p>
                          </div>
                          <button onClick={() => addItem('module', m.id, m.title, `${course.title} · ${m.weekTitle}`, m.icon, accent)}
                            disabled={moduleAdded}
                            className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg transition-all disabled:opacity-40"
                            style={{ background: moduleAdded ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.06)', color: moduleAdded ? '#475569' : '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}>
                            {moduleAdded ? <Check size={9} /> : <Plus size={9} />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* Quests (DB courses only) */}
                {expanded[course.id] && (() => {
                  const quests = questsCache[course.id];
                  if (!quests) return (
                    <div className="border-t border-white/5 pl-11 pr-3 py-2">
                      <p className="text-[10px] text-slate-700 italic">Loading quests…</p>
                    </div>
                  );
                  if (quests.length === 0) return null;
                  return (
                    <div className="border-t border-white/5 pl-11 pr-3 pb-2 space-y-1">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-amber-700 pt-1.5 pb-0.5">Quests</p>
                      {quests.map(q => {
                        const questAdded = existingRefIds.has(q.id);
                        return (
                          <div key={q.id} className="flex items-center gap-2 py-1">
                            <span className="text-sm">🎯</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] text-slate-300 truncate">{q.title}</p>
                              <p className="text-[9px] text-slate-600">{q.xp} XP{q.difficulty ? ` · ${q.difficulty}` : ''}</p>
                            </div>
                            <button onClick={() => addItem('quest', q.id, q.title, `${course.title} · Quest`, '🎯', '#f59e0b')}
                              disabled={questAdded}
                              className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg transition-all disabled:opacity-40"
                              style={{ background: questAdded ? 'rgba(255,255,255,0.04)' : 'rgba(245,158,11,0.1)', color: questAdded ? '#475569' : '#f59e0b', border: `1px solid ${questAdded ? 'rgba(255,255,255,0.08)' : 'rgba(245,158,11,0.25)'}` }}>
                              {questAdded ? <Check size={9} /> : <Plus size={9} />}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-center text-slate-600 text-xs py-8">No courses found.</p>
          )}
        </div>
        <div className="px-5 py-3 border-t border-white/6">
          <button onClick={onClose}
            className="w-full py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)' }}>
            Done Adding Content
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main PathEditorPage ──────────────────────────────────────────────────────
export default function PathEditorPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();

  const [path, setPath]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [saving, setSaving]     = useState(false);
  const [showBrowser, setShowBrowser] = useState(false);
  const [addingSection, setAddingSection] = useState(false);
  const [sectionTitle, setSectionTitle]   = useState('');

  useEffect(() => {
    api.get(`/learning-paths/${id}`)
      .then(d => setPath(d))
      .catch(e => setError(e?.message || 'Not found'))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Metadata updates ───────────────────────────────────────────────────────
  const patchPath = async (data) => {
    try {
      const updated = await api.put(`/learning-paths/${id}`, data);
      setPath(updated);
    } catch (e) { alert(e?.message || 'Save failed'); }
  };

  // ── Item management ────────────────────────────────────────────────────────
  const addItem = async (itemData) => {
    try {
      const item = await api.post(`/learning-paths/${id}/items`, itemData);
      setPath(p => ({ ...p, items: [...(p.items || []), item] }));
    } catch (e) { alert(e?.message || 'Add failed'); }
  };

  const addSection = async () => {
    if (!sectionTitle.trim()) return;
    await addItem({ type: 'section', title: sectionTitle.trim() });
    setSectionTitle('');
    setAddingSection(false);
  };

  const removeItem = async (itemId) => {
    try {
      await api.delete(`/learning-paths/items/${itemId}`);
      setPath(p => ({ ...p, items: p.items.filter(i => i.id !== itemId) }));
    } catch (e) { alert(e?.message || 'Remove failed'); }
  };

  const updateItemDuration = async (itemId, durationMinutes) => {
    try {
      const updated = await api.put(`/learning-paths/items/${itemId}`, { durationMinutes });
      setPath(p => ({ ...p, items: p.items.map(i => i.id === itemId ? { ...i, ...updated } : i) }));
    } catch (e) { alert(e?.message || 'Update failed'); }
  };

  const handleAddFromBrowser = (itemData) => {
    const already = (path?.items || []).some(i => i.refId === itemData.refId);
    if (already) return;
    addItem(itemData);
  };

  const existingRefIds = new Set((path?.items || []).map(i => i.refId).filter(Boolean));

  const handleItemClick = (item) => {
    if (item.type === 'section') return;
    const url = item.type === 'module'
      ? null // modules don't have standalone pages yet
      : buildCourseUrl(item.refId);
    if (url) navigate(url);
  };
  const totalMin = totalPathMins(path?.items);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white/10 border-t-violet-400 rounded-full animate-spin" />
    </div>
  );
  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-red-400">{error}</p>
      <button onClick={() => navigate('/my-paths')} className="text-violet-400 text-sm">← Back to paths</button>
    </div>
  );

  const items = path?.items || [];

  return (
    <div className="min-h-screen" style={{ background: 'rgba(3,10,20,1)' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md border-b border-white/5"
        style={{ background: 'rgba(3,10,20,0.92)' }}>
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate('/my-paths')}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={14} /> My Paths
          </button>
          <span className="text-slate-700">/</span>
          <span className="text-xs text-slate-500 truncate max-w-[200px]">{path?.title}</span>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => navigate('/my-paths')}
              className="flex items-center gap-1.5 text-xs font-bold text-white px-4 py-2 rounded-xl transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)' }}>
              <Check size={13} /> Done
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-10 pb-20">
        {/* Title & Description */}
        <div className="mb-6">
          <InlineEdit
            value={path?.title || ''}
            onChange={v => patchPath({ title: v })}
            placeholder="Path title…"
            className="font-orbitron text-3xl font-black text-white mb-2"
          />
          <InlineEdit
            value={path?.description || ''}
            onChange={v => patchPath({ description: v })}
            placeholder="Add a description for this learning path…"
            className="text-slate-400 text-sm mt-2"
            large
          />
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-4 mb-8 pb-6 border-b border-white/6">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Clock size={12} />
            <span>Total duration: <span className="text-white font-semibold">{fmtDuration(totalMin) || '0m'}</span></span>
          </div>

          {/* Visibility toggle */}
          <button onClick={() => patchPath({ visibility: path?.visibility === 'public' ? 'private' : 'public' })}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-all"
            style={path?.visibility === 'public'
              ? { background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }
              : { background: 'rgba(100,116,139,0.08)', color: '#64748b', border: '1px solid rgba(100,116,139,0.2)' }}>
            {path?.visibility === 'public' ? <Globe size={11} /> : <Lock size={11} />}
            {path?.visibility === 'public' ? 'Public' : 'Private'}
          </button>

          {/* Certificate */}
          <div className="flex items-center gap-1.5">
            <Award size={12} className="text-amber-500 flex-shrink-0" />
            <InlineEdit
              value={path?.certificate || ''}
              onChange={v => patchPath({ certificate: v })}
              placeholder="Certificate (optional)"
              className="text-xs text-amber-500"
            />
          </div>
        </div>

        {/* ── Content list ─────────────────────────────────────────────────── */}
        {items.length === 0 ? (
          <div className="rounded-2xl p-10 text-center border border-dashed border-white/8 mb-6">
            <BookOpen size={28} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm mb-1">No content yet</p>
            <p className="text-slate-700 text-xs">Add courses, modules, or section headings to build your path</p>
          </div>
        ) : (
          <div className="space-y-2 mb-6">
            {items.map((item, idx) => {
              const accent = item.accentColor || '#06b6d4';
              const isSection = item.type === 'section';
              return (
                <div key={item.id}
                  className={`rounded-xl border transition-all ${isSection ? 'border-white/5' : 'border-white/7'}`}
                  style={{ background: isSection ? 'rgba(124,58,237,0.06)' : 'rgba(255,255,255,0.02)' }}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <GripVertical size={14} className="text-slate-700 flex-shrink-0 cursor-grab" />
                    {isSection ? (
                      <>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-violet-500 px-2 py-0.5 rounded"
                          style={{ background: 'rgba(124,58,237,0.15)' }}>SECTION</span>
                        <span className="text-sm font-bold text-white flex-1">{item.title}</span>
                      </>
                    ) : (
                      <>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                          style={{ background: accent + '20', border: `1px solid ${accent}35` }}>
                          {item.emoji || (item.type === 'module' ? '📖' : '📚')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                              style={{ background: accent + '20', color: accent }}>
                              {item.type}
                            </span>
                            {item.type === 'course' ? (
                              <button onClick={() => handleItemClick(item)}
                                className="text-xs font-semibold text-white truncate hover:underline flex items-center gap-1 group">
                                {item.title}
                                <ChevronRight size={11} className="text-slate-600 group-hover:text-white transition-colors" />
                              </button>
                            ) : item.type === 'quest' ? (
                              <p className="text-xs font-semibold truncate" style={{ color: '#fbbf24' }}>{item.title}</p>
                            ) : item.type === 'scenario' ? (
                              <p className="text-xs font-semibold truncate" style={{ color: '#10b981' }}>{item.title}</p>
                            ) : (
                              <p className="text-xs font-semibold text-white truncate">{item.title}</p>
                            )}
                          </div>
                          {item.subtitle && (
                            <p className="text-[10px] text-slate-600 truncate mt-0.5">{item.subtitle}</p>
                          )}
                        </div>
                        <DurationInput
                          value={item.durationMinutes}
                          onChange={v => updateItemDuration(item.id, v)}
                          accent={accent}
                        />
                      </>
                    )}
                    <button onClick={() => removeItem(item.id)}
                      className="text-slate-700 hover:text-red-400 transition-colors flex-shrink-0 ml-1">
                      <X size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Add content buttons ───────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setShowBrowser(true)}
            className="flex items-center gap-2 text-xs font-bold text-white px-4 py-2.5 rounded-xl transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.3),rgba(6,182,212,0.2))', border: '1px solid rgba(124,58,237,0.4)' }}>
            <Plus size={13} /> Add Course / Module
          </button>

          {addingSection ? (
            <div className="flex items-center gap-2">
              <input value={sectionTitle} onChange={e => setSectionTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addSection(); if (e.key === 'Escape') { setAddingSection(false); setSectionTitle(''); } }}
                placeholder="Section heading…" autoFocus
                className="text-xs rounded-xl px-3 py-2 text-white focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(124,58,237,0.4)', minWidth: '180px' }} />
              <button onClick={addSection}
                className="text-xs font-bold text-white px-3 py-2 rounded-xl"
                style={{ background: 'rgba(124,58,237,0.4)' }}>Add</button>
              <button onClick={() => { setAddingSection(false); setSectionTitle(''); }}
                className="text-xs text-slate-600 hover:text-slate-400 p-2"><X size={12} /></button>
            </div>
          ) : (
            <button onClick={() => setAddingSection(true)}
              className="flex items-center gap-2 text-xs text-slate-400 hover:text-white px-4 py-2.5 rounded-xl transition-all"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <Plus size={13} /> Add Section Heading
            </button>
          )}
        </div>

        {/* Summary card */}
        {items.length > 0 && (
          <div className="mt-10 rounded-2xl p-5 border border-white/6"
            style={{ background: 'rgba(255,255,255,0.02)' }}>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Path Summary</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] text-slate-600">Total Items</p>
                <p className="text-xl font-black text-white">{items.filter(i=>i.type!=='section').length}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-600">Courses</p>
                <p className="text-xl font-black text-white">{items.filter(i=>i.type==='course').length}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-600">Modules</p>
                <p className="text-xl font-black text-white">{items.filter(i=>i.type==='module').length}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-600">Scenarios</p>
                <p className="text-xl font-black text-white">{items.filter(i=>i.type==='scenario').length}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-600">Quests</p>
                <p className="text-xl font-black text-white">{items.filter(i=>i.type==='quest').length}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-600">Est. Duration</p>
                <p className="text-xl font-black text-white">{fmtDuration(totalMin) || '—'}</p>
              </div>
            </div>
            {path?.certificate && (
              <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2">
                <Award size={14} className="text-amber-500" />
                <div>
                  <p className="text-[10px] text-slate-600">Certificate</p>
                  <p className="text-sm font-semibold text-amber-400">{path.certificate}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Course browser modal */}
      {showBrowser && (
        <CourseBrowser
          onAdd={handleAddFromBrowser}
          existingRefIds={existingRefIds}
          onClose={() => setShowBrowser(false)}
        />
      )}
    </div>
  );
}
