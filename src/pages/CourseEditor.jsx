import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, ChevronDown, Edit2, Check, X,
  Save, ExternalLink, GripVertical, Pencil,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { validateEmbeddableVideoResource } from '../lib/learningResourceEmbeds.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const RESOURCE_TYPES = [
  { id: 'youtube',  label: 'YouTube',     icon: '▶',  color: '#ef4444' },
  { id: 'playlist', label: 'Playlist',    icon: '▶',  color: '#ef4444' },
  { id: 'video',    label: 'Video (MP4)', icon: '🎬', color: '#ef4444' },
  { id: 'udemy',    label: 'Udemy',       icon: '🎓', color: '#a78bfa' },
  { id: 'oreilly',  label: "O'Reilly",    icon: '📕', color: '#d97706' },
  { id: 'ibm',      label: 'IBM Docs',    icon: '📘', color: '#0f62fe' },
  { id: 'read',     label: 'Article',     icon: '📖', color: '#22d3ee' },
  { id: 'workshop', label: 'Workshop',    icon: '🛠️', color: '#f59e0b' },
  { id: 'link',     label: 'Link',        icon: '🔗', color: '#94a3b8' },
];

const ACCENT_COLORS = [
  '#06b6d4','#f97316','#7c3aed','#10b981',
  '#f59e0b','#f43f5e','#3b82f6','#6366f1',
];

const MODULE_ICONS = ['📖','📚','🔧','💡','🧪','🔬','🎓','🗺️','🏗️','🔐','📊','🎯','⚡','🚀','🔄','🛠️','🌐','🖥️','🤖','🔑'];
const COURSE_EMOJIS = ['📚','🚀','🤖','🔄','☸️','☁️','🛡️','📊','💻','🔐','⚡','🎓','🌐','🏗️','🔬'];

const cardStyle = { background: 'rgba(3,10,20,0.7)', border: '1px solid rgba(255,255,255,0.07)' };
const inputStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' };
const focusStyle = { border: '1px solid rgba(6,182,212,0.5)' };

// ── Tiny helpers ──────────────────────────────────────────────────────────────
function IconPicker({ value, options, onChange, className = '' }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`relative ${className}`}>
      <button type="button" onClick={() => setOpen(v => !v)}
        className="text-2xl w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 hover:border-white/30 transition-colors">
        {value}
      </button>
      {open && (
        <div className="absolute z-20 top-12 left-0 rounded-xl p-2 grid grid-cols-5 gap-1 shadow-2xl"
          style={{ background: 'rgba(3,10,25,0.98)', border: '1px solid rgba(255,255,255,0.1)', minWidth: '11rem' }}>
          {options.map(e => (
            <button key={e} type="button" onClick={() => { onChange(e); setOpen(false); }}
              className={`text-lg w-8 h-8 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center ${value === e ? 'bg-white/15' : ''}`}>
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ColorPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {ACCENT_COLORS.map(c => (
        <button key={c} type="button" onClick={() => onChange(c)}
          className="w-6 h-6 rounded-full border-2 transition-all"
          style={{ background: c, borderColor: value === c ? '#fff' : 'transparent', transform: value === c ? 'scale(1.2)' : 'scale(1)' }}
        />
      ))}
    </div>
  );
}

function InlineEdit({ value, onSave, placeholder = 'Click to edit', multiline = false, className = '' }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const commit = () => {
    if (draft.trim() !== (value || '').trim()) onSave(draft.trim() || value);
    setEditing(false);
  };
  if (editing) return multiline ? (
    <textarea value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit} autoFocus rows={2}
      className={`w-full rounded-lg px-3 py-2 text-sm resize-none focus:outline-none ${className}`} style={{ ...inputStyle, ...focusStyle }} />
  ) : (
    <input value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
      autoFocus className={`rounded-lg px-3 py-1.5 text-sm focus:outline-none ${className}`} style={{ ...inputStyle, ...focusStyle }} />
  );
  return (
    <span onDoubleClick={() => { setDraft(value || ''); setEditing(true); }}
      className={`cursor-text group ${className}`} title="Double-click to edit">
      {value || <span className="text-slate-600 italic text-sm">{placeholder}</span>}
      <Edit2 size={10} className="inline ml-1.5 text-slate-700 opacity-0 group-hover:opacity-60 transition-opacity" />
    </span>
  );
}

// ── Resource row ─────────────────────────────────────────────────────────────
function ResourceRow({ res, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(!res.label);
  const [label, setLabel] = useState(res.label || '');
  const [type, setType]   = useState(res.type  || 'link');
  const [url, setUrl]     = useState(res.url   || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!label.trim()) return;
    const validation = validateEmbeddableVideoResource({ type, url });
    if (!validation.valid) { alert(validation.message); return; }
    setSaving(true);
    try { const r = await api.put(`/courses-api/resources/${res.id}`, { label: label.trim(), type, url: url.trim() }); onUpdate(r); setEditing(false); }
    catch (e) { alert(e?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const typeMeta = RESOURCE_TYPES.find(t => t.id === type) || RESOURCE_TYPES[RESOURCE_TYPES.length - 1];

  return (
    <div className="rounded-lg border border-white/7 overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)' }}>
      {editing ? (
        <div className="p-3 space-y-2">
          <div className="flex gap-2">
            <select value={type} onChange={e => setType(e.target.value)}
              className="rounded-lg px-2 py-1.5 text-xs focus:outline-none flex-shrink-0"
              style={{ ...inputStyle, width: '9rem' }}>
              {RESOURCE_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
            </select>
            <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Resource title"
              className="flex-1 rounded-lg px-3 py-1.5 text-xs focus:outline-none" style={{ ...inputStyle }} />
          </div>
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="URL (https://...)"
            className="w-full rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none" style={{ ...inputStyle }} />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditing(false)} className="text-[11px] text-slate-500 hover:text-slate-300 px-2 py-1 rounded">Cancel</button>
            <button onClick={save} disabled={saving || !label.trim()}
              className="text-[11px] font-bold text-white px-3 py-1 rounded-lg disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#06b6d4,#7c3aed)' }}>
              {saving ? '…' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-3 py-2.5">
          <span style={{ color: typeMeta.color }} className="text-sm flex-shrink-0">{typeMeta.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-300 truncate">{res.label}</p>
            {res.url && <p className="text-[10px] text-slate-600 truncate font-mono">{res.url}</p>}
          </div>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
            style={{ background: typeMeta.color + '20', color: typeMeta.color }}>{typeMeta.label}</span>
          <button onClick={() => setEditing(true)} className="text-slate-600 hover:text-slate-300 flex-shrink-0"><Edit2 size={12} /></button>
          <button onClick={() => onDelete(res.id)} className="text-slate-700 hover:text-red-400 flex-shrink-0"><Trash2 size={12} /></button>
        </div>
      )}
    </div>
  );
}

// ── Module section ────────────────────────────────────────────────────────────
function ModuleSection({ mod, moduleNumber, onUpdate, onDelete }) {
  const [open, setOpen]           = useState(false);
  const [newTopic, setNewTopic]   = useState('');
  const [topics, setTopics]       = useState(mod.topics    || []);
  const [resources, setResources] = useState(mod.resources || []);
  const [addingRes, setAddingRes] = useState(false);
  const [saving, setSaving]       = useState(false);

  const addTopic = async () => {
    const t = newTopic.trim();
    if (!t) return;
    setSaving(true);
    try {
      const topic = await api.post(`/courses-api/modules/${mod.id}/topics`, { content: t, order: topics.length });
      setTopics(p => [...p, topic]);
      setNewTopic('');
    } catch (e) { alert(e?.message); }
    finally { setSaving(false); }
  };

  const deleteTopic = async (id) => {
    if (!confirm('Delete this topic?')) return;
    try { await api.delete(`/courses-api/topics/${id}`); setTopics(p => p.filter(t => t.id !== id)); }
    catch (e) { alert(e?.message); }
  };

  const addResource = async () => setAddingRes(true);

  const saveNewResource = async (label, type, url) => {
    try {
      const validation = validateEmbeddableVideoResource({ type, url });
      if (!validation.valid) throw new Error(validation.message);
      const r = await api.post(`/courses-api/modules/${mod.id}/resources`, { label, type, url, order: resources.length });
      setResources(p => [...p, r]);
      setAddingRes(false);
    } catch (e) { alert(e?.message); throw e; }
  };

  const updateResource = (updated) => setResources(p => p.map(r => r.id === updated.id ? updated : r));
  const deleteResource = async (id) => {
    if (!confirm('Delete this resource?')) return;
    try { await api.delete(`/courses-api/resources/${id}`); setResources(p => p.filter(r => r.id !== id)); }
    catch (e) { alert(e?.message); }
  };

  const modColor = mod.color || '#06b6d4';

  return (
    <div className="rounded-xl border overflow-hidden"
      style={{ border: open ? `1px solid ${modColor}30` : '1px solid rgba(255,255,255,0.06)', background: open ? modColor + '05' : 'transparent' }}>
      <div className="flex items-center gap-3 px-4 py-3">
        <IconPicker value={mod.icon || '📖'} options={MODULE_ICONS}
          onChange={async icon => { try { const m = await api.put(`/courses-api/modules/${mod.id}`, { icon }); onUpdate(m); } catch {} }} />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: modColor }}>Module {moduleNumber}</div>
          <InlineEdit value={mod.title} placeholder="Module title"
            className="font-semibold text-white text-sm"
            onSave={async t => { try { const m = await api.put(`/courses-api/modules/${mod.id}`, { title: t }); onUpdate(m); } catch {} }} />
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <ColorPicker value={modColor}
            onChange={async color => { try { const m = await api.put(`/courses-api/modules/${mod.id}`, { color }); onUpdate(m); } catch {} }} />
          <button onClick={() => setOpen(v => !v)} className="text-slate-600 hover:text-slate-300 ml-2">
            <ChevronDown size={15} style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.2s' }} />
          </button>
          <button onClick={() => onDelete(mod.id)} className="text-slate-700 hover:text-red-400"><Trash2 size={14} /></button>
        </div>
      </div>

      {open && (
        <div className="border-t border-white/5 px-4 pb-4 pt-4 grid md:grid-cols-2 gap-6">
          {/* Topics */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Topics Covered</p>
            <div className="space-y-1.5 mb-3">
              {topics.map(t => (
                <div key={t.id} className="flex items-start gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: modColor }} />
                  <span className="flex-1 text-xs text-slate-400 leading-relaxed">{t.content}</span>
                  <button onClick={() => deleteTopic(t.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-700 hover:text-red-400 flex-shrink-0 transition-opacity"><X size={11} /></button>
                </div>
              ))}
              {topics.length === 0 && <p className="text-xs text-slate-700 italic">No topics yet</p>}
            </div>
            <div className="flex gap-2">
              <input value={newTopic} onChange={e => setNewTopic(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTopic()}
                placeholder="Add topic (press Enter)"
                className="flex-1 rounded-lg px-3 py-1.5 text-xs focus:outline-none" style={inputStyle} />
              <button onClick={addTopic} disabled={saving || !newTopic.trim()}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#06b6d4,#7c3aed)' }}>+</button>
            </div>
          </div>

          {/* Resources */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Resources</p>
            <div className="space-y-1.5 mb-3">
              {resources.map(r => (
                <ResourceRow key={r.id} res={r} onUpdate={updateResource} onDelete={deleteResource} />
              ))}
              {resources.length === 0 && !addingRes && <p className="text-xs text-slate-700 italic">No resources yet</p>}
              {addingRes && <AddResourceForm onSave={saveNewResource} onCancel={() => setAddingRes(false)} />}
            </div>
            {!addingRes && (
              <button onClick={addResource}
                className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-cyan-400 transition-colors">
                <Plus size={12} /> Add Resource
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AddResourceForm({ onSave, onCancel }) {
  const [label, setLabel] = useState('');
  const [type, setType]   = useState('youtube');
  const [url, setUrl]     = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!label.trim()) return;
    setSaving(true);
    try { await onSave(label.trim(), type, url.trim()); }
    catch { setSaving(false); }
  };

  return (
    <div className="rounded-lg border border-white/10 p-3 space-y-2" style={{ background: 'rgba(255,255,255,0.02)' }}>
      <div className="flex gap-2">
        <select value={type} onChange={e => setType(e.target.value)}
          className="rounded-lg px-2 py-1.5 text-xs focus:outline-none flex-shrink-0"
          style={{ ...inputStyle, width: '9rem' }}>
          {RESOURCE_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
        </select>
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Resource title"
          className="flex-1 rounded-lg px-3 py-1.5 text-xs focus:outline-none" style={inputStyle} />
      </div>
      <input value={url} onChange={e => setUrl(e.target.value)} placeholder="URL (https://...)"
        className="w-full rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none" style={inputStyle} />
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="text-[11px] text-slate-500 hover:text-slate-300 px-2 py-1 rounded">Cancel</button>
        <button onClick={save} disabled={saving || !label.trim()}
          className="text-[11px] font-bold text-white px-3 py-1 rounded-lg disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg,#06b6d4,#7c3aed)' }}>
          {saving ? '…' : 'Add'}
        </button>
      </div>
    </div>
  );
}

// ── Week section ──────────────────────────────────────────────────────────────
function WeekSection({ week, accentColor, onUpdateWeek, onDeleteWeek, onReload }) {
  const [modules, setModules]       = useState(week.modules || []);
  const [addingModule, setAddingModule] = useState(false);
  const [newModTitle, setNewModTitle]   = useState('');
  const [saving, setSaving]             = useState(false);

  const accent = accentColor || '#06b6d4';

  const addModule = async () => {
    const t = newModTitle.trim();
    if (!t) return;
    setSaving(true);
    try {
      const mod = await api.post(`/courses-api/weeks/${week.id}/modules`, {
        title: t, icon: '📖', color: accent, order: modules.length, number: modules.length + 1,
      });
      setModules(p => [...p, { ...mod, topics: [], resources: [] }]);
      setNewModTitle('');
      setAddingModule(false);
    } catch (e) { alert(e?.message); }
    finally { setSaving(false); }
  };

  const updateModule = (updated) => setModules(p => p.map(m => m.id === updated.id ? { ...m, ...updated } : m));

  const deleteModule = async (id) => {
    if (!confirm('Delete this module and all its content?')) return;
    try { await api.delete(`/courses-api/modules/${id}`); setModules(p => p.filter(m => m.id !== id)); }
    catch (e) { alert(e?.message); }
  };

  return (
    <div className="rounded-2xl p-5" style={cardStyle}>
      <div className="flex items-center gap-3 mb-4">
        <div className="px-3 py-1 rounded-lg text-xs font-bold font-orbitron"
          style={{ background: accent + '18', color: accent, border: `1px solid ${accent}30` }}>
          Week {week.weekNumber}
        </div>
        <InlineEdit value={week.title} placeholder="Week theme/title"
          className="flex-1 text-sm font-semibold text-white"
          onSave={async t => { try { const w = await api.put(`/courses-api/weeks/${week.id}`, { title: t }); onUpdateWeek(w); } catch {} }} />
        <button onClick={() => onDeleteWeek(week.id)} title="Delete week"
          className="text-slate-700 hover:text-red-400 transition-colors"><Trash2 size={15} /></button>
      </div>

      <div className="space-y-3">
        {modules.map((mod, mi) => (
          <ModuleSection key={mod.id} mod={mod} moduleNumber={mi + 1}
            onUpdate={updateModule} onDelete={deleteModule} />
        ))}
        {modules.length === 0 && (
          <p className="text-xs text-slate-700 italic text-center py-3">No modules yet — add one below</p>
        )}
      </div>

      <div className="mt-4">
        {addingModule ? (
          <div className="flex gap-2 mt-3">
            <input value={newModTitle} onChange={e => setNewModTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addModule(); if (e.key === 'Escape') setAddingModule(false); }}
              placeholder="Module title…" autoFocus
              className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ ...inputStyle, ...focusStyle }} />
            <button onClick={addModule} disabled={saving || !newModTitle.trim()}
              className="px-4 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#06b6d4,#7c3aed)' }}>
              {saving ? '…' : 'Add'}
            </button>
            <button onClick={() => setAddingModule(false)} className="text-slate-500 hover:text-slate-300 px-2"><X size={14} /></button>
          </div>
        ) : (
          <button onClick={() => setAddingModule(true)}
            className="flex items-center gap-2 text-xs text-slate-600 hover:text-cyan-400 transition-colors mt-2">
            <Plus size={13} /> Add Module
          </button>
        )}
      </div>
    </div>
  );
}

// ── Course Info panel ─────────────────────────────────────────────────────────
function CourseInfoPanel({ course, onUpdate }) {
  const [draft, setDraft]   = useState({ ...course });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await api.put(`/courses-api/${course.id}`, {
        title:       draft.title,
        tagline:     draft.tagline,
        description: draft.description,
        emoji:       draft.emoji,
        accentColor: draft.accentColor,
      });
      onUpdate(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { alert(e?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="rounded-2xl p-6 mb-8" style={cardStyle}>
      <div className="flex items-start gap-4 mb-5">
        <IconPicker value={draft.emoji || '📚'} options={COURSE_EMOJIS}
          onChange={e => setDraft(p => ({ ...p, emoji: e }))} className="mt-1" />
        <div className="flex-1 space-y-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 block mb-1">Course Title</label>
            <input value={draft.title} onChange={e => setDraft(p => ({ ...p, title: e.target.value }))}
              className="w-full rounded-xl px-4 py-2.5 font-orbitron font-bold text-xl focus:outline-none" style={{ ...inputStyle, ...focusStyle }} />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 block mb-1">Tagline</label>
            <input value={draft.tagline || ''} onChange={e => setDraft(p => ({ ...p, tagline: e.target.value }))}
              placeholder="Short subtitle shown on course page"
              className="w-full rounded-xl px-4 py-2 text-sm focus:outline-none" style={inputStyle} />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 block mb-1">Description</label>
            <textarea value={draft.description || ''} onChange={e => setDraft(p => ({ ...p, description: e.target.value }))}
              placeholder="Short overview shown on the course page and learning-path hero"
              rows={2} className="w-full rounded-xl px-4 py-2 text-sm focus:outline-none resize-none" style={inputStyle} />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 block mb-2">Accent Color</label>
            <ColorPicker value={draft.accentColor || '#06b6d4'} onChange={c => setDraft(p => ({ ...p, accentColor: c }))} />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50"
          style={{ background: saving || saved ? 'rgba(16,185,129,0.7)' : 'linear-gradient(135deg,#06b6d4,#7c3aed)' }}>
          {saved ? <><Check size={14} /> Saved!</> : saving ? '…' : <><Save size={14} /> Save Info</>}
        </button>
        <p className="text-[11px] text-slate-600">Slug: <code className="text-slate-500">{course.slug}</code></p>
      </div>
    </div>
  );
}

// ── Help Session panel ────────────────────────────────────────────────────────
function HelpSessionPanel({ course, onUpdate }) {
  const [d, setD] = useState({
    instructorName:  course.instructorName  || '',
    instructorEmail: course.instructorEmail || '',
    helpSpaceUrl:    course.helpSpaceUrl    || '',
    helpSpaceName:   course.helpSpaceName   || '',
    helpSpaceHint:   course.helpSpaceHint   || '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  const f = k => e => setD(p => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      const updated = await api.put(`/courses-api/${course.id}`, d);
      onUpdate(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { alert(e?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const Field = ({ label, k, placeholder, hint }) => (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 block mb-1">{label}</label>
      <input value={d[k]} onChange={f(k)} placeholder={placeholder}
        className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none" style={inputStyle} />
      {hint && <p className="text-[10px] text-slate-700 mt-0.5">{hint}</p>}
    </div>
  );

  return (
    <div className="rounded-2xl p-6 mb-8" style={cardStyle}>
      <div className="flex items-center gap-3 mb-5">
        <span className="text-lg">💬</span>
        <div>
          <h3 className="font-orbitron text-sm font-bold text-white">Help Session</h3>
          <p className="text-[11px] text-slate-600 mt-0.5">Moderator & chat space shown when learners click Help on this course. Leave blank to use global defaults.</p>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Moderator Name"      k="instructorName"  placeholder="e.g. John Smith" />
        <Field label="Moderator Email"     k="instructorEmail" placeholder="john@example.com" />
        <div className="sm:col-span-2">
          <Field label="Chat Space URL" k="helpSpaceUrl" placeholder="https://chat.google.com/room/..." />
        </div>
        <Field label="Chat Space Display Name" k="helpSpaceName" placeholder="Security Support Space" />
        <Field label="Chat Space Hint"         k="helpSpaceHint" placeholder="Security course questions, labs & quests" />
      </div>
      <div className="mt-4">
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50"
          style={{ background: saving || saved ? 'rgba(16,185,129,0.7)' : 'linear-gradient(135deg,#06b6d4,#7c3aed)' }}>
          {saved ? <><Check size={14} /> Saved!</> : saving ? '…' : <><Save size={14} /> Save Help Settings</>}
        </button>
      </div>
    </div>
  );
}

function AICourseOutlinePanel({ course, weeks, onCreated }) {
  const [open, setOpen] = useState(false);
  const [outline, setOutline] = useState('');
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const generate = async () => {
    setBusy(true); setError('');
    try {
      const nextPlan = await api.post('/ai/course-outline', { courseId: course.id, outline });
      setPlan(nextPlan);
    } catch (e) { setError(e?.message || 'Could not generate course topics'); }
    finally { setBusy(false); }
  };

  const addPlan = async () => {
    if (!plan?.weeks?.length) return;
    setBusy(true); setError('');
    try {
      const createdWeeks = [];
      for (const [weekIndex, generatedWeek] of plan.weeks.entries()) {
        const week = await api.post(`/courses-api/${course.id}/weeks`, { title: generatedWeek.title, weekNumber: weeks.length + weekIndex + 1 });
        const modules = [];
        for (const [moduleIndex, generatedModule] of generatedWeek.modules.entries()) {
          const module = await api.post(`/courses-api/weeks/${week.id}/modules`, {
            title: generatedModule.title, icon: '📖', color: course.accentColor || '#06b6d4', order: moduleIndex, number: moduleIndex + 1,
          });
          for (const [topicIndex, topic] of generatedModule.topics.entries()) {
            await api.post(`/courses-api/modules/${module.id}/topics`, { content: topic.content, order: topicIndex });
          }
          modules.push({ ...module, topics: generatedModule.topics, resources: [] });
        }
        createdWeeks.push({ ...week, modules });
      }
      onCreated(createdWeeks);
      setPlan(null); setOutline(''); setOpen(false);
    } catch (e) { setError(e?.message || 'Could not add generated topics'); }
    finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl p-5 mb-8 border border-cyan-500/20" style={{ background: 'rgba(6,182,212,0.04)' }}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-orbitron text-sm font-bold text-white">AI Course Topic Builder</h3>
          <p className="text-[11px] text-slate-500 mt-1">Describe an outline and review generated weeks, modules, and topics before adding them.</p>
        </div>
        <button onClick={() => setOpen(value => !value)} className="px-3 py-2 rounded-lg text-xs font-bold text-cyan-200 border border-cyan-400/30 bg-cyan-500/10">
          {open ? 'Close' : 'Build with AI'}
        </button>
      </div>
      {open && <div className="mt-4 space-y-3">
        <textarea value={outline} onChange={e => setOutline(e.target.value)} rows={5} maxLength={12000}
          placeholder="Example: Teach GCP fundamentals, IAM, networking, Compute Engine, Cloud Run, GKE, observability, cost control, and a production deployment exercise."
          className="w-full rounded-xl px-3 py-2.5 text-sm text-white resize-y focus:outline-none" style={inputStyle} />
        <button onClick={generate} disabled={busy || outline.trim().length < 20}
          className="px-4 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-40" style={{ background: 'linear-gradient(135deg,#06b6d4,#7c3aed)' }}>
          {busy && !plan ? 'Researching outline…' : 'Generate Preview'}
        </button>
        {plan && <div className="space-y-3 rounded-xl p-4 border border-white/10" style={{ background: 'rgba(0,0,0,0.16)' }}>
          <p className="text-xs text-cyan-300">Preview: {plan.weeks.length} week{plan.weeks.length === 1 ? '' : 's'} · review before adding</p>
          {plan.weeks.map((week, weekIndex) => <div key={weekIndex}>
            <p className="text-sm font-semibold text-white">Week {weeks.length + weekIndex + 1}: {week.title}</p>
            <ul className="mt-1 pl-4 list-disc text-xs text-slate-400 space-y-1">
              {week.modules.map((module, moduleIndex) => <li key={moduleIndex}><span className="text-slate-300">{module.title}</span> · {module.topics.length} topics</li>)}
            </ul>
          </div>)}
          <button onClick={addPlan} disabled={busy} className="px-4 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-40" style={{ background: 'rgba(16,185,129,0.7)' }}>
            {busy ? 'Adding topics…' : 'Add Previewed Topics'}
          </button>
        </div>}
        {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
        <p className="text-[10px] text-slate-600">AI expands your outline using the configured local model. Verify technical accuracy and add official resources separately.</p>
      </div>}
    </div>
  );
}

// ── Main CourseEditor page ────────────────────────────────────────────────────
export default function CourseEditor() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [course, setCourse]   = useState(null);
  const [weeks, setWeeks]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [addingWeek, setAddingWeek]   = useState(false);
  const [newWeekTitle, setNewWeekTitle] = useState('');
  const [savingWeek, setSavingWeek]   = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const c = await api.get(`/courses-api/${slug}`);
        setCourse(c);
        setWeeks(c.weeks || []);
      } catch (e) { setError(e?.message || 'Failed to load course'); }
      finally { setLoading(false); }
    })();
  }, [slug]);

  const addWeek = async () => {
    const t = newWeekTitle.trim() || `Week ${weeks.length + 1} Theme`;
    setSavingWeek(true);
    try {
      const week = await api.post(`/courses-api/${course.id}/weeks`, {
        title: t, weekNumber: weeks.length + 1,
      });
      setWeeks(p => [...p, { ...week, modules: [] }]);
      setNewWeekTitle('');
      setAddingWeek(false);
    } catch (e) { alert(e?.message); }
    finally { setSavingWeek(false); }
  };

  const updateWeek  = (updated) => setWeeks(p => p.map(w => w.id === updated.id ? { ...w, ...updated } : w));
  const deleteWeek  = async (id) => {
    if (!confirm('Delete this week and all its content?')) return;
    try { await api.delete(`/courses-api/weeks/${id}`); setWeeks(p => p.filter(w => w.id !== id)); }
    catch (e) { alert(e?.message); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white/20 border-t-cyan-400 rounded-full animate-spin" />
    </div>
  );
  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-red-400">{error}</p>
      <button onClick={() => navigate('/admin')} className="text-cyan-400 text-sm">← Admin Panel</button>
    </div>
  );

  const accent = course?.accentColor || '#06b6d4';

  return (
    <div className="min-h-screen pb-24">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 backdrop-blur-md border-b border-white/5" style={{ background: 'rgba(3,10,20,0.92)' }}>
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate('/admin')} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={14} /> Admin Panel
          </button>
          <span className="text-slate-700">/</span>
          <span className="text-xs font-bold text-white font-orbitron">{course?.title}</span>
          <span className="text-[10px] text-slate-600 ml-1">· Course Editor</span>
          <div className="ml-auto flex items-center gap-2">
            <a href={slug === 'devops-loop' ? '/devops-loop' : slug === 'ai-quest' ? '/ai-quest' : `/c/${slug}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-cyan-400 border border-white/8 rounded-lg px-2.5 py-1 transition-colors">
              <ExternalLink size={11} /> Preview
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 pt-8">
        {/* Course info */}
        {course && <CourseInfoPanel course={course} onUpdate={c => setCourse(c)} />}

        {/* Help session */}
        {course && <HelpSessionPanel course={course} onUpdate={c => setCourse(c)} />}

        {course && <AICourseOutlinePanel course={course} weeks={weeks} onCreated={created => setWeeks(p => [...p, ...created])} />}

        {/* Weeks */}
        <div className="flex items-center gap-3 mb-6">
          <h2 className="font-orbitron text-lg font-bold text-white">Learning Path</h2>
          <span className="text-[10px] px-2 py-0.5 rounded font-bold text-slate-500 border border-white/8">
            {weeks.length} week{weeks.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="space-y-6">
          {weeks.map(week => (
            <WeekSection key={week.id} week={week} accentColor={accent}
              onUpdateWeek={updateWeek} onDeleteWeek={deleteWeek} onReload={() => {}} />
          ))}

          {weeks.length === 0 && (
            <div className="rounded-2xl p-10 text-center border border-dashed border-white/10">
              <p className="text-slate-600 mb-2">No weeks yet</p>
              <p className="text-slate-700 text-sm">Add weeks to structure your learning path</p>
            </div>
          )}

          {/* Add Week */}
          {addingWeek ? (
            <div className="rounded-2xl p-5 border border-dashed border-cyan-500/30" style={{ background: 'rgba(6,182,212,0.04)' }}>
              <p className="text-xs text-slate-500 mb-2">Week {weeks.length + 1} — Theme / Title</p>
              <div className="flex gap-2">
                <input value={newWeekTitle} onChange={e => setNewWeekTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addWeek(); if (e.key === 'Escape') setAddingWeek(false); }}
                  placeholder={`e.g. "Loop Foundations" or "Advanced Deploy"`} autoFocus
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm focus:outline-none" style={{ ...inputStyle, ...focusStyle }} />
                <button onClick={addWeek} disabled={savingWeek}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg,#06b6d4,#7c3aed)' }}>
                  {savingWeek ? '…' : 'Add Week'}
                </button>
                <button onClick={() => setAddingWeek(false)} className="text-slate-500 hover:text-slate-300 px-2"><X size={16} /></button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingWeek(true)}
              className="w-full rounded-2xl border-2 border-dashed border-white/8 py-6 flex flex-col items-center gap-2 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all text-slate-600 hover:text-cyan-400 group">
              <Plus size={24} className="group-hover:scale-110 transition-transform" />
              <span className="text-sm font-semibold">Add Week</span>
            </button>
          )}
        </div>

        {/* ── Quest Editor ─────────────────────────────────────────────────── */}
        {course && <QuestEditorPanel course={course} weeks={weeks} accent={accent} />}
      </div>
    </div>
  );
}

// ── Quest Editor Panel ────────────────────────────────────────────────────────
const CORRECT_OPTIONS = ['A', 'B', 'C', 'D'];
const QUEST_RESOURCE_TYPES = [
  { id:'youtube', label:'YouTube', icon:'▶' },
  { id:'playlist', label:'Playlist', icon:'▶' },
  { id:'video',   label:'Video (MP4)', icon:'🎬' },
  { id:'udemy',   label:'Udemy', icon:'🎓' },
  { id:'oreilly', label:"O'Reilly", icon:'📕' },
  { id:'ibm',     label:'IBM Docs', icon:'📘' },
  { id:'read',    label:'Article', icon:'📖' },
  { id:'link',    label:'Link', icon:'🔗' },
];
const EMPTY_QUEST = { title:'', scenario:'', optionA:'', optionB:'', optionC:'', optionD:'', correct:'A', explanation:'', xp:10, moduleId:'', learnTopics:[], learnResources:[], solutionRequest:'' };

function uid() { return Math.random().toString(36).slice(2); }

function QuestForm({ initialData, courseId, weeks = [], onSave, onCancel }) {
  const [activeTab, setActiveTab] = useState('quiz');

  // Extract solution request from learnTopics (stored as first entry with isSolutionRequest flag)
  const initSR = Array.isArray(initialData?.learnTopics)
    ? (initialData.learnTopics.find(t => t.isSolutionRequest)?.content || '')
    : '';
  const initTopics = Array.isArray(initialData?.learnTopics)
    ? initialData.learnTopics.filter(t => !t.isSolutionRequest)
    : [];

  const [q, setQ] = useState(() => ({
    ...EMPTY_QUEST,
    ...(initialData || {}),
    solutionRequest: initSR,
    learnTopics:     initTopics,
    learnResources:  Array.isArray(initialData?.learnResources) ? initialData.learnResources : [],
  }));
  const [saving, setSaving] = useState(false);

  const f = (field) => (e) => setQ(p => ({ ...p, [field]: e.target.value }));

  // ── Learn tab helpers ──────────────────────────────────────────────────────
  const addTopic = () => setQ(p => ({ ...p, learnTopics: [...p.learnTopics, { _id: uid(), content: '' }] }));
  const updateTopic = (idx, val) => setQ(p => { const t = [...p.learnTopics]; t[idx] = { ...t[idx], content: val }; return { ...p, learnTopics: t }; });
  const deleteTopic = (idx) => setQ(p => ({ ...p, learnTopics: p.learnTopics.filter((_, i) => i !== idx) }));

  const addResource = () => setQ(p => ({ ...p, learnResources: [...p.learnResources, { _id: uid(), type: 'link', label: '', url: '' }] }));
  const updateResource = (idx, key, val) => setQ(p => { const r = [...p.learnResources]; r[idx] = { ...r[idx], [key]: val }; return { ...p, learnResources: r }; });
  const deleteResource = (idx) => setQ(p => ({ ...p, learnResources: p.learnResources.filter((_, i) => i !== idx) }));

  // Auto-find YouTube videos for a given title query
  const autoFindVideos = (query) => {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' tutorial')}`;
    window.open(searchUrl, '_blank', 'noopener,noreferrer');
  };

  // ── Save ─────────────────────────────────────────────────────────────────
  const save = async () => {
    if (!q.title.trim() || !q.scenario.trim() || !q.optionA || !q.optionB || !q.optionC || !q.optionD || !q.explanation) {
      alert('All Quiz fields are required'); return;
    }
    setSaving(true);
    try {
      for (const resource of q.learnResources) {
        const validation = validateEmbeddableVideoResource(resource);
        if (!validation.valid) {
          throw new Error(`${resource.label || 'A video resource'}: ${validation.message}`);
        }
      }
      // Prepend solution request as a special first learnTopic
      const srEntry = q.solutionRequest?.trim()
        ? [{ content: q.solutionRequest.trim(), order: -1, isSolutionRequest: true }]
        : [];
      const payload = {
        ...q,
        xp:             Number(q.xp) || 10,
        moduleId:       q.moduleId || null,
        learnTopics:    [...srEntry, ...q.learnTopics.map(({ content }, i) => ({ content, order: i }))],
        learnResources: q.learnResources.map(({ type, label, url }, i) => ({ type, label, url, order: i })),
      };
      const result = q.id
        ? await api.put(`/courses-api/quests/${q.id}`, payload)
        : await api.post(`/courses-api/${courseId}/quests`, { ...payload, order: 0 });
      onSave(result);
    } catch (e) { alert(e?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const tabBtn = (id, label) => (
    <button onClick={() => setActiveTab(id)}
      className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === id ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
      style={activeTab === id ? { background: 'rgba(6,182,212,0.2)', border: '1px solid rgba(6,182,212,0.35)' } : { border: '1px solid transparent' }}>
      {label}
    </button>
  );

  return (
    <div className="rounded-2xl border border-cyan-500/20" style={{ background: 'rgba(6,182,212,0.04)' }}>
      {/* Title bar + tabs */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-white/6">
        <div className="flex-1 min-w-0">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 block mb-1">Quest Title *</label>
          <input value={q.title} onChange={f('title')} placeholder="e.g. SSL Handshake Failure"
            className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none" style={inputStyle} />
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 pt-5">
          {tabBtn('learn', '📖 Learn')}
          {tabBtn('quiz',  '🎯 Quiz')}
        </div>
      </div>

      {/* ── Learn tab ────────────────────────────────────────────────────────── */}
      {activeTab === 'learn' && (
        <div className="p-5 space-y-5">
          {/* Solution Request */}
          <div>
            <p className="text-xs font-bold text-white mb-0.5">Solution Request <span className="text-slate-600 font-normal">(optional)</span></p>
            <p className="text-[10px] text-slate-600 mb-2">Business scenario shown as a pinned context box in the Learn view. Describe the real-world mission the learner is solving.</p>
            <textarea value={q.solutionRequest} onChange={e => setQ(p => ({ ...p, solutionRequest: e.target.value }))} rows={3}
              placeholder="e.g. The security team noticed expired SSL certificates causing login failures. Help the team diagnose the root cause before the scheduled maintenance window."
              className="w-full rounded-xl px-3 py-2.5 text-xs resize-none focus:outline-none" style={inputStyle} />
          </div>

          {/* Slides / Topics */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs font-bold text-white">Learn Slides</p>
                <p className="text-[10px] text-slate-600">Each slide is one screen in the Learn view. The scenario question is always shown as the first content pane.</p>
              </div>
              <button onClick={addTopic}
                className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-400 border border-cyan-500/30 px-3 py-1.5 rounded-lg hover:bg-cyan-500/10 transition-all">
                <Plus size={11} /> Add Slide
              </button>
            </div>
            <div className="space-y-2">
              {q.learnTopics.length === 0 && (
                <p className="text-[11px] text-slate-700 italic">No extra slides — learners will only see the scenario text.</p>
              )}
              {q.learnTopics.map((t, i) => (
                <div key={t._id || i} className="flex gap-2 items-start">
                  <span className="text-[10px] font-bold text-slate-600 w-5 mt-2.5 flex-shrink-0">S{i + 2}</span>
                  <textarea value={t.content} onChange={e => updateTopic(i, e.target.value)} rows={2}
                    placeholder={`Slide ${i + 2} content — concept, step, or explanation…`}
                    className="flex-1 rounded-xl px-3 py-2 text-xs resize-none focus:outline-none" style={inputStyle} />
                  <button onClick={() => deleteTopic(i)} className="text-slate-700 hover:text-red-400 mt-2 flex-shrink-0"><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          </div>

          {/* Resources */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs font-bold text-white">Resources</p>
                <p className="text-[10px] text-slate-600">Only direct playable YouTube, playlist, Google Drive file, or MP4/WebM video URLs are accepted for inline embeds.</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => autoFindVideos(q.title || 'this topic')}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-lg hover:bg-amber-500/10 transition-all"
                  title="Search YouTube in a new tab and paste a direct playable video URL here">
                  🔍 Search YouTube
                </button>
                <button onClick={addResource}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-400 border border-cyan-500/30 px-3 py-1.5 rounded-lg hover:bg-cyan-500/10 transition-all">
                  <Plus size={11} /> Add Resource
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {q.learnResources.length === 0 && (
                <p className="text-[11px] text-slate-700 italic">No resources yet.</p>
              )}
              {q.learnResources.map((r, i) => (
                <div key={r._id || i} className="flex gap-2 items-center">
                  <select value={r.type} onChange={e => updateResource(i, 'type', e.target.value)}
                    className="rounded-lg px-2 py-1.5 text-xs focus:outline-none flex-shrink-0" style={{ ...inputStyle, width: '8rem' }}>
                    {QUEST_RESOURCE_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
                  </select>
                  <input value={r.label} onChange={e => updateResource(i, 'label', e.target.value)} placeholder="Display name"
                    className="w-28 rounded-lg px-2 py-1.5 text-xs focus:outline-none flex-shrink-0" style={inputStyle} />
                  <input value={r.url} onChange={e => updateResource(i, 'url', e.target.value)} placeholder="https://..."
                    className="flex-1 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none" style={inputStyle} />
                  <button onClick={() => deleteResource(i)} className="text-slate-700 hover:text-red-400 flex-shrink-0"><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Quiz tab ─────────────────────────────────────────────────────────── */}
      {activeTab === 'quiz' && (
        <div className="p-5">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 block mb-1">Scenario / Question *</label>
              <textarea value={q.scenario} onChange={f('scenario')} rows={3}
                placeholder="You are a system administrator and a user reports that they cannot connect to the VPN. Which SSL command would you run first?"
                className="w-full rounded-xl px-3 py-2 text-sm resize-none focus:outline-none" style={inputStyle} />
            </div>
            {['A','B','C','D'].map(letter => (
              <div key={letter}>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 block mb-1">Option {letter} *</label>
                <input value={q[`option${letter}`]} onChange={f(`option${letter}`)} placeholder={`Answer ${letter}`}
                  className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none" style={inputStyle} />
              </div>
            ))}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 block mb-1">Correct Answer *</label>
              <select value={q.correct} onChange={f('correct')}
                className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none" style={inputStyle}>
                {CORRECT_OPTIONS.map(o => <option key={o} value={o}>Option {o}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 block mb-1">XP Value</label>
              <input type="number" value={q.xp} onChange={f('xp')} min={1} max={100}
                className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none" style={inputStyle} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 block mb-1">Expert Explanation *</label>
              <textarea value={q.explanation} onChange={f('explanation')} rows={3}
                placeholder="Explain why this answer is correct, referencing official documentation or best practices..."
                className="w-full rounded-xl px-3 py-2 text-sm resize-none focus:outline-none" style={inputStyle} />
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex gap-2 justify-end px-5 pb-4 pt-2 border-t border-white/6">
        <button onClick={onCancel} className="text-xs text-slate-500 hover:text-slate-300 px-3 py-1.5 rounded-lg">Cancel</button>
        <button onClick={save} disabled={saving}
          className="text-xs font-bold text-white px-5 py-1.5 rounded-xl disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg,#06b6d4,#7c3aed)' }}>
          {saving ? '…' : q.id ? 'Update Quest' : 'Add Quest'}
        </button>
      </div>
    </div>
  );
}

function QuestEditorPanel({ course, weeks, accent }) {
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingQuest, setAddingQuest] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (!course?.id) return;
    api.get(`/courses-api/${course.id}/quests`)
      .then(d => setQuests(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [course?.id]);

  const addQuest = (q) => { setQuests(p => [...p, q]); setAddingQuest(false); };
  const updateQuest = (updated) => { setQuests(p => p.map(q => q.id === updated.id ? updated : q)); setEditingId(null); };
  const deleteQuest = async (id) => {
    if (!confirm('Delete this quest?')) return;
    try { await api.delete(`/courses-api/quests/${id}`); setQuests(p => p.filter(q => q.id !== id)); }
    catch (e) { alert(e?.message); }
  };

  const accentBg = { background: accent + '15', border: `1px solid ${accent}30`, color: accent };

  return (
    <div className="mt-12 pt-8 border-t border-white/8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="font-orbitron text-lg font-bold text-white">Quests</h2>
          <span className="text-[10px] px-2 py-0.5 rounded font-bold border border-white/8 text-slate-500">
            {quests.length} quest{quests.length !== 1 ? 's' : ''}
          </span>
        </div>
        {!addingQuest && (
          <button onClick={() => setAddingQuest(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#06b6d4,#7c3aed)' }}>
            <Plus size={13} /> Add Quest
          </button>
        )}
      </div>

      <p className="text-xs text-slate-600 mb-5">
        Scenario-based questions that learners answer to earn XP. Each quest has 4 options (A–D), one correct answer, and an expert explanation.
      </p>

      {addingQuest && (
        <div className="mb-6">
          <QuestForm courseId={course.id} weeks={weeks} onSave={addQuest} onCancel={() => setAddingQuest(false)} />
        </div>
      )}

      <div className="space-y-3">
        {loading && <div className="py-8 flex justify-center"><div className="w-5 h-5 border-2 border-white/20 border-t-cyan-400 rounded-full animate-spin"/></div>}
        {!loading && quests.length === 0 && !addingQuest && (
          <div className="rounded-2xl p-10 text-center border border-dashed border-white/10">
            <p className="text-slate-600 mb-2">No quests yet</p>
            <p className="text-slate-700 text-sm">Add scenario-based quests for learners to complete</p>
          </div>
        )}
        {quests.map((q, i) => (
          <div key={q.id}>
            {editingId === q.id ? (
              <QuestForm initialData={q} courseId={course.id} weeks={weeks} onSave={updateQuest} onCancel={() => setEditingId(null)} />
            ) : (
              <div className="rounded-xl border border-white/7 overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded font-orbitron flex-shrink-0" style={accentBg}>Q{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{q.title}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{q.scenario.slice(0, 90)}…</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {(q.moduleId || (Array.isArray(q.learnTopics) && q.learnTopics.length > 0) || (Array.isArray(q.learnResources) && q.learnResources.length > 0)) && (
                      <span className="text-[10px] text-cyan-600 font-medium" title="Learn content added">
                        📖 {Array.isArray(q.learnTopics) ? q.learnTopics.length : 0}s {Array.isArray(q.learnResources) ? q.learnResources.length : 0}r
                      </span>
                    )}
                    <span className="text-[10px] text-slate-600">✓ {q.correct} · {q.xp} XP</span>
                  </div>
                  <button onClick={() => setEditingId(q.id)} className="text-slate-600 hover:text-slate-300 flex-shrink-0 ml-2"><Edit2 size={13} /></button>
                  <button onClick={() => deleteQuest(q.id)} className="text-slate-700 hover:text-red-400 flex-shrink-0"><Trash2 size={13} /></button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
