import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, BookOpen, Clock, Award, Trash2, ChevronRight, Edit2, Search, Moon, Sun } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAppStore } from '../App.jsx';

function fmtDuration(mins) {
  if (!mins) return '0m';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function totalMins(items) {
  return (items || []).reduce((s, i) => s + (i.durationMinutes || 0), 0);
}

export default function LearningPathsPage() {
  const navigate = useNavigate();
  const { theme, setTheme } = useAppStore();
  const isLight = theme === 'light';

  const [paths, setPaths]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [creating, setCreating]   = useState(false);
  const [form, setForm]           = useState({ title: '', description: '' });
  const [saving, setSaving]       = useState(false);
  const [search, setSearch]       = useState('');
  const [deleteId, setDeleteId]   = useState(null);
  const titleRef = useRef(null);

  useEffect(() => {
    api.get('/learning-paths').then(d => {
      setPaths(Array.isArray(d) ? d : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (creating && titleRef.current) titleRef.current.focus();
  }, [creating]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const p = await api.post('/learning-paths', form);
      navigate(`/my-paths/${p.id}/edit`);
    } catch (e) { alert(e?.message || 'Create failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this learning path?')) return;
    try {
      await api.delete(`/learning-paths/${id}`);
      setPaths(ps => ps.filter(p => p.id !== id));
    } catch (e) { alert(e?.message || 'Delete failed'); }
    setDeleteId(null);
  };

  const filtered = paths.filter(p =>
    !search || p.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen" style={{ background: isLight ? 'linear-gradient(180deg, #cbd5e1 0%, #94a3b8 100%)' : 'rgba(3,10,20,1)' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md border-b"
        style={{ background: isLight ? 'rgba(203,213,225,0.94)' : 'rgba(3,10,20,0.92)', borderColor: isLight ? 'rgba(71,85,105,0.22)' : 'rgba(255,255,255,0.05)' }}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
          <button onClick={() => navigate('/courses')}
            className={`flex items-center gap-1.5 text-xs transition-colors ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}>
            <ArrowLeft size={14} /> Course Hub
          </button>
          <span className="text-slate-500">/</span>
          <span className={`font-orbitron text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Learning Paths</span>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setTheme(isLight ? 'dark' : 'light')}
              className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${isLight ? 'text-amber-600' : 'text-slate-300'}`}
              style={{ border: isLight ? '1px solid rgba(100,116,139,0.3)' : '1px solid rgba(255,255,255,0.07)', background: isLight ? 'rgba(203,213,225,0.9)' : 'rgba(255,255,255,0.03)' }}
              title={isLight ? 'Dark mode' : 'Light mode'}>
              {isLight ? <Moon size={13} /> : <Sun size={13} />}
            </button>
            <button onClick={() => setCreating(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-white px-4 py-2 rounded-xl transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)' }}>
              <Plus size={13} /> Create Path
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-4 pt-12 pb-8">
        <div className="rounded-3xl p-8 md:p-10 mb-8 relative overflow-hidden"
          style={{ background: isLight ? 'linear-gradient(135deg, rgba(167,139,250,0.26) 0%, rgba(34,211,238,0.16) 100%)' : 'linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(6,182,212,0.07) 100%)', border: isLight ? '1px solid rgba(124,58,237,0.26)' : '1px solid rgba(124,58,237,0.2)' }}>
          <div className="absolute top-0 right-0 w-48 h-48 opacity-5"
            style={{ background: 'radial-gradient(circle, #7c3aed, transparent)', borderRadius: '50%', transform: 'translate(30%, -30%)' }} />
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase mb-4"
              style={{ background: isLight ? 'rgba(124,58,237,0.18)' : 'rgba(124,58,237,0.15)', color: isLight ? '#5b21b6' : '#c4b5fd', border: '1px solid rgba(124,58,237,0.3)' }}>
              <BookOpen size={10} /> Learning Paths
            </div>
            <h1 className={`font-orbitron text-3xl md:text-4xl font-black mb-3 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Your Learning Paths
            </h1>
            <p className={`text-sm max-w-xl leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
              Build custom learning journeys by combining courses and modules. Set timelines, track progress, and earn certifications on your own terms.
            </p>
          </div>
        </div>

        {/* Create form */}
        {creating && (
          <div className="rounded-2xl p-6 mb-6 border border-violet-500/30 animate-in fade-in"
            style={{ background: isLight ? 'rgba(255,255,255,0.42)' : 'rgba(124,58,237,0.06)' }}>
            <h3 className={`text-sm font-bold mb-4 ${isLight ? 'text-slate-900' : 'text-white'}`}>Create New Learning Path</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${isLight ? 'text-slate-700' : 'text-slate-600'}`}>Path Title *</label>
                <input ref={titleRef} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. My DevOps Mastery Path"
                  className={`w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none ${isLight ? 'text-slate-900 placeholder:text-slate-500' : 'text-white'}`}
                  style={{ background: isLight ? 'rgba(226,232,240,0.95)' : 'rgba(255,255,255,0.05)', border: isLight ? '1px solid rgba(100,116,139,0.24)' : '1px solid rgba(255,255,255,0.1)' }} />
              </div>
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${isLight ? 'text-slate-700' : 'text-slate-600'}`}>Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="What will you learn in this path?"
                  rows={2}
                  className={`w-full rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none ${isLight ? 'text-slate-900 placeholder:text-slate-500' : 'text-white'}`}
                  style={{ background: isLight ? 'rgba(226,232,240,0.95)' : 'rgba(255,255,255,0.05)', border: isLight ? '1px solid rgba(100,116,139,0.24)' : '1px solid rgba(255,255,255,0.1)' }} />
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <button type="button" onClick={() => { setCreating(false); setForm({ title:'', description:'' }); }}
                  className={`text-xs px-3 py-2 rounded-lg ${isLight ? 'text-slate-700 hover:text-slate-900' : 'text-slate-500 hover:text-slate-300'}`}>Cancel</button>
                <button type="submit" disabled={!form.title.trim() || saving}
                  className="text-xs font-bold text-white px-5 py-2 rounded-xl disabled:opacity-40 transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)' }}>
                  {saving ? 'Creating…' : 'Create & Edit'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search */}
        {paths.length > 3 && (
          <div className="flex items-center gap-3 mb-5">
            <div className="relative flex-1 max-w-xs">
              <Search size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-500' : 'text-slate-600'}`} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search paths…"
                className={`w-full pl-8 pr-3 py-2 rounded-xl text-sm focus:outline-none ${isLight ? 'text-slate-900 placeholder:text-slate-500' : 'text-slate-300'}`}
                style={{ background: isLight ? 'rgba(226,232,240,0.98)' : 'rgba(255,255,255,0.04)', border: isLight ? '1px solid rgba(100,116,139,0.24)' : '1px solid rgba(255,255,255,0.08)' }} />
            </div>
          </div>
        )}

        {/* Paths list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-white/10 border-t-violet-400 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl p-12 text-center border border-dashed"
            style={{ borderColor: isLight ? 'rgba(100,116,139,0.24)' : 'rgba(255,255,255,0.08)', background: isLight ? 'rgba(226,232,240,0.42)' : 'transparent' }}>
            <BookOpen size={32} className={`${isLight ? 'text-slate-600' : 'text-slate-700'} mx-auto mb-4`} />
            <p className={`text-sm mb-2 ${isLight ? 'text-slate-700' : 'text-slate-500'}`}>
              {search ? 'No paths match your search.' : 'No learning paths yet.'}
            </p>
            {!search && (
              <button onClick={() => setCreating(true)}
                className="text-xs font-bold text-violet-400 hover:text-violet-300 mt-2">
                + Create your first path
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(path => {
              const totalMin = totalMins(path.items || []);
              const count = path._count?.items ?? (path.items?.length ?? 0);
              return (
                <div key={path.id}
                  className="rounded-2xl border overflow-hidden transition-all"
                  style={{ background: isLight ? 'rgba(226,232,240,0.82)' : 'rgba(255,255,255,0.02)', borderColor: isLight ? 'rgba(71,85,105,0.18)' : 'rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center gap-4 px-5 py-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(6,182,212,0.15))', border: '1px solid rgba(124,58,237,0.3)' }}>
                      🗺️
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-sm font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>{path.title}</h3>
                      {path.description && (
                        <p className={`text-xs truncate mt-0.5 ${isLight ? 'text-slate-700' : 'text-slate-500'}`}>{path.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className={`text-[10px] flex items-center gap-1 ${isLight ? 'text-slate-700' : 'text-slate-600'}`}>
                          <BookOpen size={9} /> {count} item{count !== 1 ? 's' : ''}
                        </span>
                        <span className={`text-[10px] flex items-center gap-1 ${isLight ? 'text-slate-700' : 'text-slate-600'}`}>
                          <Clock size={9} /> Learning time: {fmtDuration(totalMin)}
                        </span>
                        {path.certificate && (
                          <span className="text-[10px] text-amber-600 flex items-center gap-1">
                            <Award size={9} /> {path.certificate}
                          </span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ background: path.visibility === 'public' ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.12)', color: path.visibility === 'public' ? '#10b981' : '#64748b' }}>
                          {path.visibility === 'public' ? 'Public' : 'Private'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => navigate(`/my-paths/${path.id}/edit`)}
                        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all hover:opacity-90 ${isLight ? 'text-slate-900' : 'text-white'}`}
                        style={{ background: isLight ? 'rgba(167,139,250,0.22)' : 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)' }}>
                        <Edit2 size={11} /> Edit
                      </button>
                      <button onClick={() => handleDelete(path.id)}
                        className={`p-1.5 rounded-lg transition-colors ${isLight ? 'text-slate-700 hover:text-red-600' : 'text-slate-700 hover:text-red-400'}`}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
