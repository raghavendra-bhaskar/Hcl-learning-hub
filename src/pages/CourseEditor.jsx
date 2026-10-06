import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  ArrowLeft, Plus, Trash2, ChevronDown, Edit2, Check, X,
  Save, ExternalLink, GripVertical, Pencil,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { getAuth } from './LoginPage.jsx';
import { validateEmbeddableVideoResource } from '../lib/learningResourceEmbeds.js';
import { useAppStore } from '../App.jsx';

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

const cardStyle = { background: 'var(--course-editor-card-bg)', border: '1px solid var(--course-editor-card-border)' };
const inputStyle = { background: 'var(--course-editor-input-bg)', border: '1px solid var(--course-editor-input-border)', color: 'var(--course-editor-input-text)' };
const focusStyle = { border: '1px solid var(--course-editor-focus-border)' };
const BUILDER_MODES = [
  { id: 'create', label: 'Create full course', hint: 'Build a full learning path and add missing modules without duplicating existing ones.' },
  { id: 'modify', label: 'Modify existing course', hint: 'Improve or extend the current course structure based on your request.' },
  { id: 'quests-only', label: 'Recreate quests only', hint: 'Refresh learn content and quiz quests for existing modules without rebuilding the whole course.' },
];

function cleanBuilderDisplayTitle(value, fallback = '') {
  return String(value || fallback)
    .replace(/^week\s*\d+\s*[:\-–—]?\s*/i, '')
    .replace(/^module\s*\d+\s*[:\-–—]?\s*/i, '')
    .replace(/^[A-Z]\.[\s-]*/i, '')
    .replace(/\s+learning path$/i, '')
    .replace(/\s+learn and practice$/i, '')
    .trim() || fallback;
}

const normalizeBuilderKey = (value) => cleanBuilderDisplayTitle(value, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const TEXT_ATTACHMENT_EXTENSIONS = /\.(txt|md|csv|json|ya?ml|xml|html?|js|jsx|ts|tsx|py|java|sql|log|ini|cfg)$/i;
const SPREADSHEET_ATTACHMENT_EXTENSIONS = /\.(xlsx|xls|xlsm|xlsb|ods|csv)$/i;
const SPREADSHEET_MIME_PATTERN = /(spreadsheet|excel|sheet|csv|opendocument)/i;

function formatAttachmentSize(sizeBytes) {
  if (!sizeBytes) return '0 B';
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizeAttachmentPreview(value) {
  return String(value || '')
    .replace(/\u0000/g, ' ')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 12000);
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Could not read file'));
    reader.readAsArrayBuffer(file);
  });
}

function decodeArrayBufferToText(buffer) {
  const attempts = ['utf-8', 'utf-16le', 'utf-16be', 'windows-1252'];
  for (const encoding of attempts) {
    try {
      const decoded = new TextDecoder(encoding, { fatal: false }).decode(buffer);
      const normalized = normalizeAttachmentPreview(decoded);
      if (normalized) return normalized;
    } catch {}
  }
  return '';
}

async function readFileAsText(file) {
  const buffer = await readFileAsArrayBuffer(file);
  return decodeArrayBufferToText(buffer);
}

async function extractSpreadsheetPreview(file) {
  const buffer = await readFileAsArrayBuffer(file);
  const workbook = XLSX.read(buffer, { type: 'array', dense: true, raw: false, cellText: true, cellDates: true });
  const sections = workbook.SheetNames.slice(0, 4).map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, blankrows: false, defval: '' })
      .slice(0, 14)
      .map((row) => Array.isArray(row)
        ? row.map((cell) => String(cell ?? '').trim()).filter(Boolean).join(' | ')
        : String(row || '').trim())
      .filter(Boolean);
    return [`Sheet: ${sheetName}`, ...rows].join('\n');
  }).filter(Boolean);
  return normalizeAttachmentPreview(sections.join('\n\n'));
}

async function buildAttachmentPayload(file) {
  const type = file.type || 'application/octet-stream';
  const isSpreadsheet = SPREADSHEET_ATTACHMENT_EXTENSIONS.test(file.name || '') || SPREADSHEET_MIME_PATTERN.test(type);
  const canPreviewAsText = type.startsWith('text/')
    || /json|xml|javascript/i.test(type)
    || TEXT_ATTACHMENT_EXTENSIONS.test(file.name || '');
  let previewText = '';
  if (isSpreadsheet) {
    try {
      previewText = await extractSpreadsheetPreview(file);
    } catch {}
  } else if (canPreviewAsText) {
    try {
      previewText = normalizeAttachmentPreview(await readFileAsText(file));
    } catch {}
  }
  return {
    name: file.name,
    type,
    sizeBytes: Number(file.size || 0),
    summary: previewText
      ? `${file.name} uploaded with readable ${isSpreadsheet ? 'spreadsheet' : 'text'} preview.`
      : `${file.name} uploaded (${type}, ${formatAttachmentSize(Number(file.size || 0))}).`,
    previewText,
  };
}

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
function CourseInfoPanel({ course, onUpdate, isLight }) {
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
            <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${isLight ? 'text-slate-700' : 'text-slate-600'}`}>Course Title</label>
            <input value={draft.title} onChange={e => setDraft(p => ({ ...p, title: e.target.value }))}
              className="w-full rounded-xl px-4 py-2.5 font-orbitron font-bold text-xl focus:outline-none" style={{ ...inputStyle, ...focusStyle }} />
          </div>
          <div>
            <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${isLight ? 'text-slate-700' : 'text-slate-600'}`}>Tagline</label>
            <input value={draft.tagline || ''} onChange={e => setDraft(p => ({ ...p, tagline: e.target.value }))}
              placeholder="Short subtitle shown on course page"
              className="w-full rounded-xl px-4 py-2 text-sm focus:outline-none" style={inputStyle} />
          </div>
          <div>
            <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${isLight ? 'text-slate-700' : 'text-slate-600'}`}>Description</label>
            <textarea value={draft.description || ''} onChange={e => setDraft(p => ({ ...p, description: e.target.value }))}
              placeholder="Short overview shown on the course page and learning-path hero"
              rows={2} className="w-full rounded-xl px-4 py-2 text-sm focus:outline-none resize-none" style={inputStyle} />
          </div>
          <div>
            <label className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${isLight ? 'text-slate-700' : 'text-slate-600'}`}>Accent Color</label>
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
        <p className={`text-[11px] ${isLight ? 'text-slate-700' : 'text-slate-600'}`}>Slug: <code className={isLight ? 'text-slate-800' : 'text-slate-500'}>{course.slug}</code></p>
      </div>
    </div>
  );
}

// ── Help Session panel ────────────────────────────────────────────────────────
function HelpSessionPanel({ course, onUpdate, isLight }) {
  const [d, setD] = useState({
    instructorName:  course.instructorName  || '',
    instructorEmail: course.instructorEmail || '',
    helpSpaceUrl:    course.helpSpaceUrl    || '',
    helpSpaceName:   course.helpSpaceName   || '',
    helpSpaceHint:   course.helpSpaceHint   || '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  useEffect(() => {
    setD({
      instructorName:  course.instructorName  || '',
      instructorEmail: course.instructorEmail || '',
      helpSpaceUrl:    course.helpSpaceUrl    || '',
      helpSpaceName:   course.helpSpaceName   || '',
      helpSpaceHint:   course.helpSpaceHint   || '',
    });
  }, [course.id, course.instructorName, course.instructorEmail, course.helpSpaceUrl, course.helpSpaceName, course.helpSpaceHint]);

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

  return (
    <div className="rounded-2xl p-6 mb-8" style={cardStyle}>
      <div className="flex items-center gap-3 mb-5">
        <span className="text-lg">💬</span>
        <div>
          <h3 className={`font-orbitron text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Help Session</h3>
          <p className={`text-[11px] mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-600'}`}>Moderator & chat space shown when learners click Help on this course. Leave blank to use global defaults.</p>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${isLight ? 'text-slate-700' : 'text-slate-600'}`}>Moderator Name</label>
          <input value={d.instructorName} onChange={f('instructorName')} placeholder="e.g. John Smith"
            className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none" style={inputStyle} />
        </div>
        <div>
          <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${isLight ? 'text-slate-700' : 'text-slate-600'}`}>Moderator Email</label>
          <input value={d.instructorEmail} onChange={f('instructorEmail')} placeholder="john@example.com"
            className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none" style={inputStyle} />
        </div>
        <div className="sm:col-span-2">
          <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${isLight ? 'text-slate-700' : 'text-slate-600'}`}>Chat Space URL</label>
          <input value={d.helpSpaceUrl} onChange={f('helpSpaceUrl')} placeholder="https://chat.google.com/room/..."
            className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none" style={inputStyle} />
        </div>
        <div>
          <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${isLight ? 'text-slate-700' : 'text-slate-600'}`}>Chat Space Display Name</label>
          <input value={d.helpSpaceName} onChange={f('helpSpaceName')} placeholder="Security Support Space"
            className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none" style={inputStyle} />
        </div>
        <div>
          <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${isLight ? 'text-slate-700' : 'text-slate-600'}`}>Chat Space Hint</label>
          <input value={d.helpSpaceHint} onChange={f('helpSpaceHint')} placeholder="Security course questions, labs & quests"
            className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none" style={inputStyle} />
        </div>
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

function AICourseOutlinePanel({ course, weeks, onCreated, isLight }) {
  const [open, setOpen] = useState(false);
  const [outline, setOutline] = useState('');
  const [resourceUrls, setResourceUrls] = useState(['']);
  const [attachments, setAttachments] = useState([]);
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('create');

  const currentModuleCount = weeks.reduce((count, week) => count + (Array.isArray(week.modules) ? week.modules.length : 0), 0);
  const activeMode = BUILDER_MODES.find(item => item.id === mode) || BUILDER_MODES[0];
  const cleanupSummary = plan?.cleanup ? [
    plan.cleanup.replaceExistingCourse ? 'Replace existing course structure' : '',
    plan.cleanup.deleteAllQuests ? 'Delete all existing quests' : '',
    ...(plan.cleanup.deleteWeeks || []).map(title => `Delete week: ${title}`),
    ...(plan.cleanup.deleteModules || []).map(title => `Delete module: ${title}`),
    ...(plan.cleanup.deleteQuestTitles || []).map(title => `Delete quest: ${title}`),
  ].filter(Boolean) : [];

  const generate = async () => {
    setBusy(true); setError('');
    try {
      const cleanedUrls = resourceUrls.map(value => value.trim()).filter(Boolean);
      const invalidUrl = cleanedUrls.find(value => {
        try {
          new URL(value);
          return false;
        } catch {
          return true;
        }
      });
      if (invalidUrl) throw new Error(`Invalid URL: ${invalidUrl}`);
      const nextPlan = await api.post('/ai/course-builder', { courseId: course.id, outline, mode, resourceUrls: cleanedUrls, attachments });
      setPlan(nextPlan);
    } catch (e) { setError(e?.message || 'Could not generate course topics'); }
    finally { setBusy(false); }
  };

  const updateResourceUrl = (index, value) => {
    setResourceUrls(previous => previous.map((item, itemIndex) => itemIndex === index ? value : item));
  };

  const addResourceUrl = () => {
    setResourceUrls(previous => previous.length >= 12 ? previous : [...previous, '']);
  };

  const removeResourceUrl = (index) => {
    setResourceUrls(previous => {
      const next = previous.filter((_, itemIndex) => itemIndex !== index);
      return next.length ? next : [''];
    });
  };

  const onAttachmentChange = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    try {
      const remainingSlots = Math.max(0, 8 - attachments.length);
      const nextFiles = files.slice(0, remainingSlots);
      const nextAttachments = await Promise.all(nextFiles.map(buildAttachmentPayload));
      setAttachments(previous => [...previous, ...nextAttachments].slice(0, 8));
    } catch (e) {
      setError(e?.message || 'Could not read attachments');
    }
  };

  const removeAttachment = (index) => {
    setAttachments(previous => previous.filter((_, itemIndex) => itemIndex !== index));
  };

  const addPlan = async () => {
    if (!plan?.weeks?.length) return;
    setBusy(true); setError('');
    try {
      const currentCourse = await api.get(`/courses-api/${course.slug}`);
      const currentQuests = await api.get(`/courses-api/${course.id}/quests`);
      const workingWeeks = Array.isArray(currentCourse.weeks)
        ? currentCourse.weeks.map(week => ({
            ...week,
            modules: Array.isArray(week.modules)
              ? week.modules.map(module => ({
                  ...module,
                  topics: Array.isArray(module.topics) ? [...module.topics] : [],
                  resources: Array.isArray(module.resources) ? [...module.resources] : [],
                }))
              : [],
          }))
        : [];
      const workingQuests = Array.isArray(currentQuests) ? [...currentQuests] : [];

      const removeQuestById = async (questId) => {
        await api.delete(`/courses-api/quests/${questId}`);
        const index = workingQuests.findIndex(quest => quest.id === questId);
        if (index >= 0) workingQuests.splice(index, 1);
      };

      const removeQuestsForModule = async (moduleId) => {
        for (const quest of [...workingQuests].filter(item => item.moduleId === moduleId)) {
          await removeQuestById(quest.id);
        }
      };

      const removeModuleById = async (moduleId) => {
        await removeQuestsForModule(moduleId);
        await api.delete(`/courses-api/modules/${moduleId}`);
        workingWeeks.forEach((week) => {
          week.modules = (week.modules || []).filter(module => module.id !== moduleId);
        });
      };

      const removeWeekById = async (weekId) => {
        const week = workingWeeks.find(item => item.id === weekId);
        if (week) {
          for (const module of [...(week.modules || [])]) {
            await removeQuestsForModule(module.id);
          }
        }
        await api.delete(`/courses-api/weeks/${weekId}`);
        const index = workingWeeks.findIndex(item => item.id === weekId);
        if (index >= 0) workingWeeks.splice(index, 1);
      };

      const cleanup = plan?.cleanup || {};
      const weekDeleteKeys = new Set((cleanup.deleteWeeks || []).map(title => normalizeBuilderKey(title)).filter(Boolean));
      const moduleDeleteKeys = new Set((cleanup.deleteModules || []).map(title => normalizeBuilderKey(title)).filter(Boolean));
      const questDeleteKeys = new Set((cleanup.deleteQuestTitles || []).map(title => normalizeBuilderKey(title)).filter(Boolean));

      if (cleanup.replaceExistingCourse) {
        for (const quest of [...workingQuests]) await removeQuestById(quest.id);
        for (const week of [...workingWeeks].sort((a, b) => (b.weekNumber ?? 0) - (a.weekNumber ?? 0))) {
          await removeWeekById(week.id);
        }
      } else {
        if (cleanup.deleteAllQuests) {
          for (const quest of [...workingQuests]) await removeQuestById(quest.id);
        } else if (questDeleteKeys.size > 0) {
          for (const quest of [...workingQuests]) {
            if (questDeleteKeys.has(normalizeBuilderKey(quest.title))) await removeQuestById(quest.id);
          }
        }

        for (const week of [...workingWeeks].sort((a, b) => (b.weekNumber ?? 0) - (a.weekNumber ?? 0))) {
          if (weekDeleteKeys.has(normalizeBuilderKey(week.title))) await removeWeekById(week.id);
        }

        for (const week of [...workingWeeks]) {
          for (const module of [...(week.modules || [])]) {
            if (moduleDeleteKeys.has(normalizeBuilderKey(module.title))) await removeModuleById(module.id);
          }
        }
      }

      let nextWeekNumber = workingWeeks.length + 1;
      let nextQuestOrder = workingQuests.reduce((max, quest) => Math.max(max, Number(quest.order ?? -1)), -1) + 1;

      const replaceWeek = (updatedWeek) => {
        const index = workingWeeks.findIndex(week => week.id === updatedWeek.id);
        if (index >= 0) workingWeeks[index] = { ...workingWeeks[index], ...updatedWeek, modules: workingWeeks[index].modules };
      };

      const replaceModule = (weekId, updatedModule) => {
        const week = workingWeeks.find(item => item.id === weekId);
        if (!week) return;
        const index = week.modules.findIndex(module => module.id === updatedModule.id);
        if (index >= 0) week.modules[index] = { ...week.modules[index], ...updatedModule };
      };

      for (const [weekIndex, generatedWeek] of plan.weeks.entries()) {
        const generatedWeekTitle = cleanBuilderDisplayTitle(generatedWeek.title, `Week ${weekIndex + 1}`);
        let week = workingWeeks.find(item => normalizeBuilderKey(item.title) === normalizeBuilderKey(generatedWeekTitle));
        if (!week && mode !== 'create') week = workingWeeks[weekIndex];
        if (!week) {
          const createdWeek = await api.post(`/courses-api/${course.id}/weeks`, { title: generatedWeekTitle, weekNumber: nextWeekNumber });
          nextWeekNumber += 1;
          week = { ...createdWeek, modules: [] };
          workingWeeks.push(week);
        } else if (mode !== 'quests-only' && normalizeBuilderKey(week.title) !== normalizeBuilderKey(generatedWeekTitle)) {
          week = { ...week, ...(await api.put(`/courses-api/weeks/${week.id}`, { title: generatedWeekTitle })) };
          replaceWeek(week);
        }

        for (const [moduleIndex, generatedModule] of generatedWeek.modules.entries()) {
          const generatedModuleTitle = cleanBuilderDisplayTitle(generatedModule.title, generatedModule.topics?.[0]?.title || `Module ${moduleIndex + 1}`);
          let module = week.modules.find(item => normalizeBuilderKey(item.title) === normalizeBuilderKey(generatedModuleTitle));
          if (!module && mode !== 'create') module = week.modules[moduleIndex];
          if (!module) {
            const createdModule = await api.post(`/courses-api/weeks/${week.id}/modules`, {
              title: generatedModuleTitle, icon: '📖', color: course.accentColor || '#06b6d4', order: moduleIndex, number: moduleIndex + 1,
            });
            module = { ...createdModule, topics: [], resources: [] };
            week.modules.push(module);
          } else if (mode !== 'quests-only') {
            module = {
              ...module,
              ...(await api.put(`/courses-api/modules/${module.id}`, { title: generatedModuleTitle, order: moduleIndex, number: moduleIndex + 1 })),
            };
            replaceModule(week.id, module);
          }

          const primaryTopic = generatedModule.topics?.[0];
          if (!primaryTopic) continue;
          const moduleResources = Array.isArray(primaryTopic.resources) ? primaryTopic.resources : [];

          if (mode !== 'quests-only') {
            if (Array.isArray(module.topics) && module.topics[0]) {
              const updatedTopic = await api.put(`/courses-api/topics/${module.topics[0].id}`, { content: primaryTopic.content, order: 0 });
              module.topics = [updatedTopic, ...module.topics.slice(1)];
            } else {
              const createdTopic = await api.post(`/courses-api/modules/${module.id}/topics`, { content: primaryTopic.content, order: 0 });
              module.topics = [...(module.topics || []), createdTopic];
            }

            const existingUrls = new Set((module.resources || []).map(resource => resource.url).filter(Boolean));
            for (const [resourceIndex, resource] of moduleResources.entries()) {
              if (existingUrls.has(resource.url)) continue;
              const createdResource = await api.post(`/courses-api/modules/${module.id}/resources`, {
                label: resource.label, type: resource.type, url: resource.url, order: (module.resources || []).length + resourceIndex,
              });
              module.resources = [...(module.resources || []), createdResource];
              existingUrls.add(resource.url);
            }
          }

          const questKeyCandidates = new Set([
            normalizeBuilderKey(primaryTopic.quest?.title),
            normalizeBuilderKey(generatedModuleTitle),
            normalizeBuilderKey(primaryTopic.title),
          ]);
          let existingQuest = workingQuests.find(quest => quest.moduleId === module.id && questKeyCandidates.has(normalizeBuilderKey(quest.title)));
          if (!existingQuest && mode !== 'create') existingQuest = workingQuests.find(quest => quest.moduleId === module.id);

          const questPayload = {
            title: primaryTopic.quest.title,
            scenario: primaryTopic.quest.scenario,
            optionA: primaryTopic.quest.optionA,
            optionB: primaryTopic.quest.optionB,
            optionC: primaryTopic.quest.optionC,
            optionD: primaryTopic.quest.optionD,
            correct: primaryTopic.quest.correct,
            explanation: primaryTopic.quest.explanation,
            xp: existingQuest?.xp || 15,
            moduleId: module.id,
            learnTopics: [{ content: primaryTopic.content, order: 0 }],
            learnResources: moduleResources.map((resource, resourceIndex) => ({ ...resource, order: resourceIndex })),
          };

          if (existingQuest) {
            const updatedQuest = await api.put(`/courses-api/quests/${existingQuest.id}`, { ...questPayload, order: existingQuest.order ?? 0 });
            const questIndex = workingQuests.findIndex(quest => quest.id === existingQuest.id);
            if (questIndex >= 0) workingQuests[questIndex] = updatedQuest;
          } else {
            const createdQuest = await api.post(`/courses-api/${course.id}/quests`, { ...questPayload, order: nextQuestOrder });
            workingQuests.push(createdQuest);
            nextQuestOrder += 1;
          }
        }
      }

      const refreshedCourse = await api.get(`/courses-api/${course.slug}`);
      onCreated(refreshedCourse.weeks || []);
      setPlan(null); setOutline(''); setOpen(false);
      setResourceUrls(['']);
      setAttachments([]);
    } catch (e) { setError(e?.message || 'Could not add generated topics'); }
    finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl p-5 mb-8 border" style={{ background: isLight ? 'rgba(6,182,212,0.08)' : 'rgba(6,182,212,0.04)', borderColor: isLight ? 'rgba(6,182,212,0.22)' : 'rgba(6,182,212,0.20)' }}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className={`font-orbitron text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>AI Full Course Builder</h3>
          <p className={`text-[11px] mt-1 ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>Build small topics, learning content, resource links, a learning map, course diagram, and a quiz quest for every topic.</p>
        </div>
        <button onClick={() => setOpen(value => !value)} className="px-3 py-2 rounded-lg text-xs font-bold border"
          style={{ color: isLight ? '#0f766e' : '#bae6fd', borderColor: isLight ? 'rgba(8,145,178,0.28)' : 'rgba(34,211,238,0.30)', background: isLight ? 'rgba(236,254,255,0.96)' : 'rgba(6,182,212,0.10)' }}>
          {open ? 'Close' : 'Build full course'}
        </button>
      </div>
      {open && <div className="mt-4 space-y-3">
        <div className="grid gap-2 md:grid-cols-3">
          {BUILDER_MODES.map(item => (
            <button
              key={item.id}
              onClick={() => setMode(item.id)}
              className="rounded-xl border px-3 py-3 text-left transition-all"
              style={mode === item.id
                ? { background: isLight ? 'rgba(236,254,255,0.95)' : 'rgba(6,182,212,0.12)', borderColor: isLight ? 'rgba(8,145,178,0.28)' : 'rgba(34,211,238,0.30)' }
                : { background: isLight ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.02)', borderColor: isLight ? 'rgba(148,163,184,0.18)' : 'rgba(255,255,255,0.08)' }}>
              <p className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{item.label}</p>
              <p className={`text-[10px] mt-1 leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>{item.hint}</p>
            </button>
          ))}
        </div>
        <div className="rounded-xl border px-4 py-3" style={{ background: isLight ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.02)', borderColor: isLight ? 'rgba(148,163,184,0.18)' : 'rgba(255,255,255,0.08)' }}>
          <p className={`text-xs font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Current course structure</p>
          <p className={`text-[11px] mt-1 ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>{weeks.length} week{weeks.length === 1 ? '' : 's'} · {currentModuleCount} module{currentModuleCount === 1 ? '' : 's'} · duplicate module names will update existing content instead of creating extra copies.</p>
        </div>
        <div className="rounded-xl border px-4 py-3 space-y-3" style={{ background: isLight ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.02)', borderColor: isLight ? 'rgba(148,163,184,0.18)' : 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className={`text-xs font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Reference URLs</p>
              <p className={`text-[10px] mt-1 ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>Add multiple documentation or tutorial links for the builder to use.</p>
            </div>
            <button onClick={addResourceUrl} type="button" className="px-3 py-1.5 rounded-lg text-[11px] font-bold border"
              style={{ color: isLight ? '#0f766e' : '#67e8f9', borderColor: isLight ? 'rgba(8,145,178,0.28)' : 'rgba(34,211,238,0.30)', background: isLight ? 'rgba(236,254,255,0.96)' : 'rgba(6,182,212,0.10)' }}>
              + Add URL
            </button>
          </div>
          <div className="space-y-2">
            {resourceUrls.map((value, index) => (
              <div key={index} className="flex gap-2">
                <input value={value} onChange={event => updateResourceUrl(index, event.target.value)} placeholder="https://www.ibm.com/docs/..."
                  className="flex-1 rounded-xl px-3 py-2 text-sm focus:outline-none" style={inputStyle} />
                {resourceUrls.length > 1 && <button onClick={() => removeResourceUrl(index)} type="button" className={`px-3 rounded-lg text-xs ${isLight ? 'text-slate-500 hover:text-red-600' : 'text-slate-500 hover:text-red-300'}`}>Remove</button>}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border px-4 py-3 space-y-3" style={{ background: isLight ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.02)', borderColor: isLight ? 'rgba(148,163,184,0.18)' : 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className={`text-xs font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Attachments</p>
              <p className={`text-[10px] mt-1 ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>Upload screenshots, spreadsheets, PDFs, or notes to guide the builder. Text files are previewed automatically.</p>
            </div>
            <label className="px-3 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer"
              style={{ color: isLight ? '#0f766e' : '#67e8f9', borderColor: isLight ? 'rgba(8,145,178,0.28)' : 'rgba(34,211,238,0.30)', background: isLight ? 'rgba(236,254,255,0.96)' : 'rgba(6,182,212,0.10)' }}>
              Upload files
              <input type="file" multiple onChange={onAttachmentChange} className="hidden" />
            </label>
          </div>
          {attachments.length > 0 ? <div className="space-y-2">
            {attachments.map((attachment, index) => <div key={`${attachment.name}-${index}`} className="flex items-start gap-3 rounded-xl px-3 py-2 border"
              style={{ background: isLight ? 'rgba(248,250,252,0.95)' : 'rgba(255,255,255,0.03)', borderColor: isLight ? 'rgba(148,163,184,0.18)' : 'rgba(255,255,255,0.08)' }}>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>{attachment.name}</p>
                <p className={`text-[10px] mt-1 ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>{attachment.type || 'application/octet-stream'} · {formatAttachmentSize(attachment.sizeBytes)}</p>
                {attachment.previewText && <p className={`text-[10px] mt-1 line-clamp-2 ${isLight ? 'text-slate-500' : 'text-slate-600'}`}>{attachment.previewText.slice(0, 220)}</p>}
              </div>
              <button onClick={() => removeAttachment(index)} type="button" className={`text-xs ${isLight ? 'text-slate-500 hover:text-red-600' : 'text-slate-500 hover:text-red-300'}`}>Remove</button>
            </div>)}
          </div> : <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-600'}`}>No attachments added yet.</p>}
        </div>
        <textarea value={outline} onChange={e => setOutline(e.target.value)} rows={5} maxLength={12000}
          placeholder={mode === 'quests-only'
            ? 'Example: Recreate all duplicate AWS quests, keep the existing modules, improve scenario quality, and make each quest look like the AI Training experience.'
            : mode === 'modify'
              ? 'Example: Improve the AWS course by removing duplicate modules, expanding security and observability, and rewriting weak quests.'
              : 'Example: Teach AWS fundamentals, IAM, networking, EC2, containers, observability, cost control, security, and a production deployment exercise.'}
          className="w-full rounded-xl px-3 py-2.5 text-sm resize-y focus:outline-none" style={inputStyle} />
        <button onClick={generate} disabled={busy || outline.trim().length < 20}
          className="px-4 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-40" style={{ background: 'linear-gradient(135deg,#06b6d4,#7c3aed)' }}>
          {busy && !plan ? 'Researching resources and building course…' : mode === 'quests-only' ? 'Generate Quest Refresh Preview' : mode === 'modify' ? 'Generate Course Update Preview' : 'Generate Full Course Preview'}
        </button>
        {plan && <div className="space-y-3 rounded-xl p-4 border" style={{ background: isLight ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.16)', borderColor: isLight ? 'rgba(100,116,139,0.18)' : 'rgba(255,255,255,0.10)' }}>
          <p className={`text-xs ${isLight ? 'text-cyan-700' : 'text-cyan-300'}`}>Preview: {plan.weeks.length} week{plan.weeks.length === 1 ? '' : 's'} · {activeMode.label.toLowerCase()} · review before applying</p>
          {cleanupSummary.length > 0 && <div className="rounded-lg border p-3" style={{ borderColor: isLight ? 'rgba(248,113,113,0.22)' : 'rgba(248,113,113,0.18)', background: isLight ? 'rgba(254,242,242,0.95)' : 'rgba(127,29,29,0.12)' }}>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${isLight ? 'text-red-700' : 'text-red-300'}`}>Cleanup actions</p>
            <ul className={`mt-2 list-disc pl-4 text-xs space-y-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              {cleanupSummary.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
            </ul>
            {plan.cleanup?.rationale && <p className={`mt-2 text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{plan.cleanup.rationale}</p>}
          </div>}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border p-3" style={{ borderColor: isLight ? 'rgba(8,145,178,0.20)' : 'rgba(34,211,238,0.20)', background: isLight ? 'rgba(236,254,255,0.95)' : 'rgba(34,211,238,0.05)' }}>
              <p className={`text-[10px] font-bold uppercase tracking-widest ${isLight ? 'text-cyan-700' : 'text-cyan-300'}`}>Learning map</p>
              <p className={`mt-2 whitespace-pre-wrap text-xs leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{plan.learningMap}</p>
            </div>
            <div className="rounded-lg border p-3" style={{ borderColor: isLight ? 'rgba(124,58,237,0.20)' : 'rgba(196,181,253,0.20)', background: isLight ? 'rgba(245,243,255,0.95)' : 'rgba(167,139,250,0.05)' }}>
              <p className={`text-[10px] font-bold uppercase tracking-widest ${isLight ? 'text-violet-700' : 'text-violet-300'}`}>Course diagram</p>
              <pre className={`mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-[10px] leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{plan.diagram}</pre>
            </div>
          </div>
          {plan.weeks.map((week, weekIndex) => <div key={weekIndex}>
            <p className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Week {weeks.length + weekIndex + 1}: {week.title}</p>
            <ul className={`mt-1 pl-4 list-disc text-xs space-y-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              {week.modules.map((module, moduleIndex) => <li key={moduleIndex}><span className={isLight ? 'text-slate-800' : 'text-slate-300'}>{module.title}</span> · {module.topics.length} topics · {module.topics.reduce((count, topic) => count + (topic.resources?.length || 0), 0)} resources · {module.topics.length} quests</li>)}
            </ul>
          </div>)}
          <button onClick={addPlan} disabled={busy} className="px-4 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-40" style={{ background: 'rgba(16,185,129,0.7)' }}>
            {busy ? 'Applying builder changes…' : mode === 'quests-only' ? 'Apply Quest Refresh' : mode === 'modify' ? 'Apply Course Updates' : 'Create Full Course Content'}
          </button>
        </div>}
        {error && <p role="alert" className={`text-xs ${isLight ? 'text-red-600' : 'text-red-300'}`}>{error}</p>}
        <p className={`text-[10px] ${isLight ? 'text-slate-600' : 'text-slate-600'}`}>The builder searches public web results for candidate resources and uses the configured model to structure the course. Review technical accuracy, licensing, and links before publishing.</p>
      </div>}
    </div>
  );
}

// ── Main CourseEditor page ────────────────────────────────────────────────────
export default function CourseEditor() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const auth = getAuth();
  const { theme } = useAppStore();
  const isLight = theme === 'light';
  const isAdmin = auth?.role === 'ADMIN';
  const backPath = isAdmin ? '/admin' : '/courses';
  const backLabel = isAdmin ? 'Admin Panel' : 'Course Hub';

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
      <button onClick={() => navigate(backPath)} className="text-cyan-400 text-sm">← {backLabel}</button>
    </div>
  );

  const accent = course?.accentColor || '#06b6d4';
  const editorVars = {
    '--course-editor-card-bg': isLight ? 'rgba(255,255,255,0.96)' : 'rgba(3,10,20,0.7)',
    '--course-editor-card-border': isLight ? 'rgba(100,116,139,0.18)' : 'rgba(255,255,255,0.07)',
    '--course-editor-input-bg': isLight ? 'rgba(248,250,252,0.98)' : 'rgba(255,255,255,0.05)',
    '--course-editor-input-border': isLight ? 'rgba(148,163,184,0.35)' : 'rgba(255,255,255,0.10)',
    '--course-editor-input-text': isLight ? '#0f172a' : '#e2e8f0',
    '--course-editor-focus-border': 'rgba(6,182,212,0.5)',
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: isLight ? 'linear-gradient(160deg, #f8fafc 0%, #eef6ff 52%, #f8fafc 100%)' : undefined, ...editorVars }}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 backdrop-blur-md border-b" style={{ background: isLight ? 'rgba(255,255,255,0.94)' : 'rgba(3,10,20,0.92)', borderColor: isLight ? 'rgba(100,116,139,0.18)' : 'rgba(255,255,255,0.05)' }}>
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(backPath)} className={`flex items-center gap-1.5 text-xs transition-colors ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}>
            <ArrowLeft size={14} /> {backLabel}
          </button>
          <span className={isLight ? 'text-slate-400' : 'text-slate-700'}>/</span>
          <span className={`text-xs font-bold font-orbitron ${isLight ? 'text-slate-900' : 'text-white'}`}>{course?.title}</span>
          <span className={`text-[10px] ml-1 ${isLight ? 'text-slate-500' : 'text-slate-600'}`}>· Course Editor</span>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => navigate(backPath)}
              className={`flex items-center gap-1.5 text-[11px] rounded-lg px-2.5 py-1 transition-colors border ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-500 hover:text-slate-300'}`}
              style={{ borderColor: isLight ? 'rgba(148,163,184,0.35)' : 'rgba(255,255,255,0.08)' }}>
              <X size={11} /> Cancel
            </button>
            <a href={slug === 'devops-loop' ? '/devops-loop' : slug === 'ai-quest' ? '/ai-quest' : `/c/${slug}`}
              target="_blank" rel="noopener noreferrer"
              className={`flex items-center gap-1.5 text-[11px] rounded-lg px-2.5 py-1 transition-colors border ${isLight ? 'text-slate-600 hover:text-cyan-700' : 'text-slate-600 hover:text-cyan-400'}`}
              style={{ borderColor: isLight ? 'rgba(148,163,184,0.35)' : 'rgba(255,255,255,0.08)' }}>
              <ExternalLink size={11} /> Preview
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 pt-8">
        {/* Course info */}
        {course && <CourseInfoPanel course={course} onUpdate={c => setCourse(c)} isLight={isLight} />}

        {/* Help session */}
        {course && <HelpSessionPanel course={course} onUpdate={c => setCourse(c)} isLight={isLight} />}

        {course && <AICourseOutlinePanel course={course} weeks={weeks} onCreated={created => setWeeks(created)} isLight={isLight} />}

        {/* Weeks */}
        <div className="flex items-center gap-3 mb-6">
          <h2 className={`font-orbitron text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Learning Path</h2>
          <span className="text-[10px] px-2 py-0.5 rounded font-bold"
            style={{ color: isLight ? '#475569' : '#64748b', border: isLight ? '1px solid rgba(148,163,184,0.35)' : '1px solid rgba(255,255,255,0.08)' }}>
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
  const { theme } = useAppStore();
  const isLight = theme === 'light';

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
      className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === id ? 'text-white' : (isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-500 hover:text-slate-300')}`}
      style={activeTab === id ? { background: 'rgba(6,182,212,0.2)', border: '1px solid rgba(6,182,212,0.35)' } : { border: isLight ? '1px solid rgba(148,163,184,0.18)' : '1px solid transparent', background: isLight ? 'rgba(248,250,252,0.72)' : 'transparent' }}>
      {label}
    </button>
  );

  return (
    <div className="rounded-2xl border border-cyan-500/20" style={{ background: isLight ? 'rgba(255,255,255,0.94)' : 'rgba(6,182,212,0.04)', boxShadow: isLight ? '0 12px 28px rgba(15,23,42,0.06)' : 'none' }}>
      {/* Title bar + tabs */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b" style={{ borderColor: isLight ? 'rgba(148,163,184,0.18)' : 'rgba(255,255,255,0.06)' }}>
        <div className="flex-1 min-w-0">
          <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${isLight ? 'text-slate-700' : 'text-slate-600'}`}>Quest Title *</label>
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
            <p className={`text-xs font-bold mb-0.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>Solution Request <span className={isLight ? 'text-slate-500 font-normal' : 'text-slate-600 font-normal'}>(optional)</span></p>
            <p className={`text-[10px] mb-2 ${isLight ? 'text-slate-600' : 'text-slate-600'}`}>Business scenario shown as a pinned context box in the Learn view. Describe the real-world mission the learner is solving.</p>
            <textarea value={q.solutionRequest} onChange={e => setQ(p => ({ ...p, solutionRequest: e.target.value }))} rows={3}
              placeholder="e.g. The security team noticed expired SSL certificates causing login failures. Help the team diagnose the root cause before the scheduled maintenance window."
              className="w-full rounded-xl px-3 py-2.5 text-xs resize-none focus:outline-none" style={inputStyle} />
          </div>

          {/* Slides / Topics */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Learn Slides</p>
                <p className={`text-[10px] ${isLight ? 'text-slate-600' : 'text-slate-600'}`}>Each slide is one screen in the Learn view. The scenario question is always shown as the first content pane.</p>
              </div>
              <button onClick={addTopic}
                className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-400 border border-cyan-500/30 px-3 py-1.5 rounded-lg hover:bg-cyan-500/10 transition-all">
                <Plus size={11} /> Add Slide
              </button>
            </div>
            <div className="space-y-2">
              {q.learnTopics.length === 0 && (
                <p className={`text-[11px] italic ${isLight ? 'text-slate-500' : 'text-slate-700'}`}>No extra slides — learners will only see the scenario text.</p>
              )}
              {q.learnTopics.map((t, i) => (
                <div key={t._id || i} className="flex gap-2 items-start">
                  <span className={`text-[10px] font-bold w-5 mt-2.5 flex-shrink-0 ${isLight ? 'text-slate-500' : 'text-slate-600'}`}>S{i + 2}</span>
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
                <p className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Resources</p>
                <p className={`text-[10px] ${isLight ? 'text-slate-600' : 'text-slate-600'}`}>Only direct playable YouTube, playlist, Google Drive file, or MP4/WebM video URLs are accepted for inline embeds.</p>
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
                <p className={`text-[11px] italic ${isLight ? 'text-slate-500' : 'text-slate-700'}`}>No resources yet.</p>
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
              <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${isLight ? 'text-slate-700' : 'text-slate-600'}`}>Scenario / Question *</label>
              <textarea value={q.scenario} onChange={f('scenario')} rows={3}
                placeholder="You are a system administrator and a user reports that they cannot connect to the VPN. Which SSL command would you run first?"
                className="w-full rounded-xl px-3 py-2 text-sm resize-none focus:outline-none" style={inputStyle} />
            </div>
            {['A','B','C','D'].map(letter => (
              <div key={letter}>
                <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${isLight ? 'text-slate-700' : 'text-slate-600'}`}>Option {letter} *</label>
                <input value={q[`option${letter}`]} onChange={f(`option${letter}`)} placeholder={`Answer ${letter}`}
                  className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none" style={inputStyle} />
              </div>
            ))}
            <div>
              <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${isLight ? 'text-slate-700' : 'text-slate-600'}`}>Correct Answer *</label>
              <select value={q.correct} onChange={f('correct')}
                className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none" style={inputStyle}>
                {CORRECT_OPTIONS.map(o => <option key={o} value={o}>Option {o}</option>)}
              </select>
            </div>
            <div>
              <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${isLight ? 'text-slate-700' : 'text-slate-600'}`}>XP Value</label>
              <input type="number" value={q.xp} onChange={f('xp')} min={1} max={100}
                className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none" style={inputStyle} />
            </div>
            <div className="sm:col-span-2">
              <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${isLight ? 'text-slate-700' : 'text-slate-600'}`}>Expert Explanation *</label>
              <textarea value={q.explanation} onChange={f('explanation')} rows={3}
                placeholder="Explain why this answer is correct, referencing official documentation or best practices..."
                className="w-full rounded-xl px-3 py-2 text-sm resize-none focus:outline-none" style={inputStyle} />
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex gap-2 justify-end px-5 pb-4 pt-2 border-t" style={{ borderColor: isLight ? 'rgba(148,163,184,0.18)' : 'rgba(255,255,255,0.06)' }}>
        <button onClick={onCancel} className={`text-xs px-3 py-1.5 rounded-lg ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-500 hover:text-slate-300'}`}>Cancel</button>
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
  const { theme } = useAppStore();
  const isLight = theme === 'light';
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingQuest, setAddingQuest] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (!course?.id) return;
    setLoading(true);
    api.get(`/courses-api/${course.id}/quests`)
      .then(d => setQuests(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [course?.id, weeks]);

  const addQuest = (q) => { setQuests(p => [...p, q]); setAddingQuest(false); };
  const updateQuest = (updated) => { setQuests(p => p.map(q => q.id === updated.id ? updated : q)); setEditingId(null); };
  const deleteQuest = async (id) => {
    if (!confirm('Delete this quest?')) return;
    try { await api.delete(`/courses-api/quests/${id}`); setQuests(p => p.filter(q => q.id !== id)); }
    catch (e) { alert(e?.message); }
  };

  const accentBg = { background: accent + '15', border: `1px solid ${accent}30`, color: accent };

  return (
    <div className="mt-12 pt-8 border-t" style={{ borderColor: isLight ? 'rgba(148,163,184,0.18)' : 'rgba(255,255,255,0.08)' }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className={`font-orbitron text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Quests</h2>
          <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${isLight ? 'text-slate-600' : 'text-slate-500'}`} style={{ borderColor: isLight ? 'rgba(148,163,184,0.18)' : 'rgba(255,255,255,0.08)' }}>
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

      <p className={`text-xs mb-5 ${isLight ? 'text-slate-600' : 'text-slate-600'}`}>
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
          <div className="rounded-2xl p-10 text-center border border-dashed" style={{ borderColor: isLight ? 'rgba(148,163,184,0.24)' : 'rgba(255,255,255,0.10)', background: isLight ? 'rgba(255,255,255,0.72)' : 'transparent' }}>
            <p className={isLight ? 'text-slate-600 mb-2' : 'text-slate-600 mb-2'}>No quests yet</p>
            <p className={isLight ? 'text-slate-500 text-sm' : 'text-slate-700 text-sm'}>Add scenario-based quests for learners to complete</p>
          </div>
        )}
        {quests.map((q, i) => (
          <div key={q.id}>
            {editingId === q.id ? (
              <QuestForm initialData={q} courseId={course.id} weeks={weeks} onSave={updateQuest} onCancel={() => setEditingId(null)} />
            ) : (
              <div className="rounded-xl border overflow-hidden" style={{ background: isLight ? 'rgba(255,255,255,0.94)' : 'rgba(255,255,255,0.02)', borderColor: isLight ? 'rgba(148,163,184,0.20)' : 'rgba(255,255,255,0.07)', boxShadow: isLight ? '0 10px 24px rgba(15,23,42,0.04)' : 'none' }}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded font-orbitron flex-shrink-0" style={accentBg}>Q{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>{q.title}</p>
                    <p className={`text-xs truncate mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>{q.scenario.slice(0, 90)}…</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {(q.moduleId || (Array.isArray(q.learnTopics) && q.learnTopics.length > 0) || (Array.isArray(q.learnResources) && q.learnResources.length > 0)) && (
                      <span className="text-[10px] text-cyan-600 font-medium" title="Learn content added">
                        📖 {Array.isArray(q.learnTopics) ? q.learnTopics.length : 0}s {Array.isArray(q.learnResources) ? q.learnResources.length : 0}r
                      </span>
                    )}
                    <span className={`text-[10px] ${isLight ? 'text-slate-600' : 'text-slate-600'}`}>✓ {q.correct} · {q.xp} XP</span>
                  </div>
                  <button onClick={() => setEditingId(q.id)} className={`flex-shrink-0 ml-2 ${isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-600 hover:text-slate-300'}`}><Edit2 size={13} /></button>
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
