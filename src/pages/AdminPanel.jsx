import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { getAuth } from './LoginPage.jsx';
import LearnerTracker from './LearnerTracker.jsx';
import AIProviderTab from '../components/AIProviderTab.jsx';

const ROLE_LABELS = { ADMIN: 'Administrator', MANAGER: 'Manager', USER: 'Learner' };
const ROLE_ORDER  = ['USER', 'MANAGER', 'ADMIN'];

const ROLE_BADGE = {
  ADMIN:   { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.4)',   text: '#f87171' },
  MANAGER: { bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.35)', text: '#fbbf24' },
  USER:    { bg: 'rgba(6,182,212,0.12)',  border: 'rgba(6,182,212,0.3)',   text: '#67e8f9' },
};

function RoleBadge({ role }) {
  const s = ROLE_BADGE[role] || ROLE_BADGE.USER;
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text }}
    >
      {ROLE_LABELS[role] || role}
    </span>
  );
}

function RoleSelect({ userId, currentRole, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [value, setValue]     = useState(currentRole);

  useEffect(() => { setValue(currentRole); }, [currentRole]);

  const save = async () => {
    if (value === currentRole) { setEditing(false); return; }
    setSaving(true);
    try {
      const updated = await api.patch(`/admin/users/${userId}`, { role: value });
      onUpdated(updated);
      setEditing(false);
    } catch (err) {
      alert(err?.message || 'Failed to update role');
      setValue(currentRole);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} title="Click to change role">
        <RoleBadge role={currentRole} />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        onChange={e => setValue(e.target.value)}
        autoFocus
        className="text-xs font-bold text-white rounded-lg px-2 py-1 focus:outline-none"
        style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.4)' }}
      >
        {ROLE_ORDER.map(r => (
          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
        ))}
      </select>
      <button
        onClick={save}
        disabled={saving}
        className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50"
      >
        {saving ? '…' : 'Save'}
      </button>
      <button
        onClick={() => { setValue(currentRole); setEditing(false); }}
        className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}

function UserRow({ user, onUpdated, onDelete, allManagers }) {
  const initials = (user.name || user.email || '?')
    .split(' ').slice(0, 2).map(p => p[0]?.toUpperCase()).join('');

  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #7c3aed)' }}
          >
            {initials}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{user.name}</p>
            <p className="text-[11px] text-slate-500">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <RoleSelect userId={user.id} currentRole={user.role} onUpdated={onUpdated} />
      </td>
      <td className="px-4 py-3">
        <ManagerAssign
          userId={user.id}
          assignedManagers={user.assignedManagers || []}
          allManagers={allManagers || []}
          onSaved={(newMgrs) => onUpdated({ ...user, assignedManagers: newMgrs.map(m => ({ manager: m })) })}
        />
      </td>
      <td className="px-4 py-3 text-[11px] text-slate-600">
        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
      </td>
      <td className="px-4 py-3">
        <span
          className="text-[10px] px-2 py-0.5 rounded font-medium"
          style={{ background: 'rgba(255,255,255,0.04)', color: '#64748b' }}
        >
          {user.oktaSub ? 'Okta' : 'Local'}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={() => onDelete(user.id, user.name)}
          title="Delete user"
          className="text-slate-700 hover:text-red-400 transition-colors text-xs px-2 py-1 rounded hover:bg-red-500/10"
        >
          ✕
        </button>
      </td>
    </tr>
  );
}

// ── Manager multi-select component ──────────────────────────────────────────
function ManagerAssign({ userId, assignedManagers, allManagers, onSaved }) {
  const [open, setOpen]           = useState(false);
  const [saving, setSaving]       = useState(false);
  const [emailDraft, setEmailDraft] = useState('');
  const [emailMode, setEmailMode] = useState(false);
  const current = (assignedManagers || []).map(am => am.manager || am).filter(Boolean);
  const [selected, setSelected] = useState(current);

  const toggle = (mgr) =>
    setSelected(prev =>
      prev.some(m => m.id === mgr.id) ? prev.filter(m => m.id !== mgr.id) : [...prev, mgr]
    );

  const save = async () => {
    setSaving(true);
    try {
      await api.post(`/admin/users/${userId}/managers`, { managerIds: selected.map(m => m.id) });
      onSaved(selected);
      setOpen(false);
    } catch (err) { alert(err?.message || 'Failed to save managers'); }
    finally { setSaving(false); }
  };

  const saveByEmail = async () => {
    if (!emailDraft.trim()) return;
    setSaving(true);
    try {
      const updated = await api.patch(`/admin/users/${userId}`, { managerEmail: emailDraft.trim().toLowerCase() });
      const newMgrs = (updated.assignedManagers || []).map(am => am.manager).filter(Boolean);
      setSelected(newMgrs);
      onSaved(newMgrs);
      setEmailDraft('');
      setEmailMode(false);
      setOpen(false);
    } catch (err) { alert(err?.message || 'Failed to set manager'); }
    finally { setSaving(false); }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex flex-wrap gap-1 items-center min-w-[6rem] text-left"
      >
        {selected.length === 0
          ? <span className="text-[11px] text-slate-700 hover:text-slate-500">— Assign</span>
          : selected.map(m => (
              <span key={m.id}
                className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24' }}
              >{m.name}</span>
            ))
        }
      </button>
      {open && (
        <div
          className="absolute z-30 top-full left-0 mt-1 w-64 rounded-xl py-2 shadow-2xl"
          style={{ background: 'rgba(3,10,25,0.98)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          {emailMode ? (
            <div className="px-3 py-2">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 pb-1.5">Set Manager by Email</p>
              <input
                autoFocus
                type="email"
                value={emailDraft}
                onChange={e => setEmailDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveByEmail(); if (e.key === 'Escape') setEmailMode(false); }}
                placeholder="manager@company.com"
                className="w-full text-xs rounded-lg px-2.5 py-1.5 text-white focus:outline-none mb-2"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(251,191,36,0.35)' }}
              />
              <div className="flex gap-2">
                <button onClick={saveByEmail} disabled={saving || !emailDraft.trim()}
                  className="flex-1 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg,#f59e0b,#ea580c)' }}>
                  {saving ? '…' : 'Assign'}
                </button>
                <button onClick={() => setEmailMode(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-300">Back</button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 px-3 pb-1">Select Managers</p>
              <div className="max-h-32 overflow-y-auto">
                {allManagers.length === 0
                  ? <p className="text-[11px] text-slate-600 px-3 py-2">No managers in system yet.</p>
                  : allManagers.map(mgr => (
                      <label key={mgr.id}
                        className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-white/5 transition-colors"
                      >
                        <input
                          type="checkbox"
                          className="accent-amber-400 w-3.5 h-3.5 shrink-0"
                          checked={selected.some(m => m.id === mgr.id)}
                          onChange={() => toggle(mgr)}
                        />
                        <div className="min-w-0">
                          <p className="text-xs text-white truncate">{mgr.name}</p>
                          <p className="text-[10px] text-slate-600 truncate">{mgr.email}</p>
                        </div>
                      </label>
                    ))
                }
              </div>
              <div className="px-3 pt-1.5 pb-1">
                <button onClick={() => setEmailMode(true)}
                  className="text-[10px] text-amber-600 hover:text-amber-400 transition-colors">
                  + Set by email (Okta manager)
                </button>
              </div>
              <div className="flex gap-2 px-3 pt-2 border-t border-white/5 mt-1">
                <button onClick={save} disabled={saving}
                  className="flex-1 py-1.5 rounded-lg text-xs font-bold text-white transition-all"
                  style={{ background: saving ? 'rgba(6,182,212,0.3)' : 'linear-gradient(135deg,#06b6d4,#7c3aed)' }}
                >{saving ? '…' : 'Save'}</button>
                <button onClick={() => { setSelected(current); setOpen(false); }}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >Cancel</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Shared style helpers ─────────────────────────────────────────────────────
const cardStyle  = { background: 'rgba(3,10,20,0.6)', border: '1px solid rgba(255,255,255,0.06)' };
const inputStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' };
const onFocus    = (e) => (e.target.style.border = '1px solid rgba(6,182,212,0.4)');
const onBlur     = (e) => (e.target.style.border = '1px solid rgba(255,255,255,0.08)');

// ── Okta Users tab ───────────────────────────────────────────────────────────
function OktaUsersTab() {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [search, setSearch]   = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [syncing, setSyncing]   = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true); setError('');
    try { setUsers(Array.isArray(await api.get('/admin/users')) ? await api.get('/admin/users') : []); }
    catch (err) { setError(err?.message || 'Failed to load users'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true); setError('');
      try { const d = await api.get('/admin/users'); setUsers(Array.isArray(d) ? d : []); }
      catch (err) { setError(err?.message || 'Failed to load users'); }
      finally { setLoading(false); }
    })();
  }, []);

  const handleUpdated = (u) => setUsers(prev => prev.map(p => p.id === u.id ? { ...p, ...u } : p));

  const syncManagers = async () => {
    setSyncing(true); setSyncResult(null);
    try {
      const r = await api.post('/admin/users/sync-okta-managers', {});
      setSyncResult(r);
      const d = await api.get('/admin/users');
      if (Array.isArray(d)) setUsers(d);
    } catch (err) { setSyncResult({ error: err?.message || 'Sync failed' }); }
    finally { setSyncing(false); }
  };

  const allManagers = users.filter(u => u.role === 'MANAGER');

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete user "${name}"? This will remove all their progress data and cannot be undone.`)) return;
    try { await api.delete(`/admin/users/${id}`); setUsers(prev => prev.filter(u => u.id !== id)); }
    catch (err) { alert(err?.message || 'Failed to delete user'); }
  };
  const filtered = users.filter(u => {
    const ms = !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    return ms && (filterRole === 'ALL' || u.role === filterRole);
  });
  const counts = { ADMIN: 0, MANAGER: 0, USER: 0 };
  users.forEach(u => { if (counts[u.role] !== undefined) counts[u.role]++; });

  return (
    <>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[['Learners','USER','#67e8f9'],['Managers','MANAGER','#fbbf24'],['Admins','ADMIN','#f87171']].map(([label,role,color]) => (
          <button key={role} onClick={() => setFilterRole(p => p === role ? 'ALL' : role)}
            className="rounded-xl p-4 text-left hover:scale-[1.02] transition-all"
            style={{ background: filterRole===role ? `${color}22` : 'rgba(255,255,255,0.03)', border: `1px solid ${filterRole===role ? color+'55' : 'rgba(255,255,255,0.06)'}` }}>
            <p className="text-2xl font-black" style={{color}}>{counts[role]}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </button>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…"
          className="flex-1 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none"
          style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
        <div className="flex gap-2 flex-wrap">
          {['ALL',...ROLE_ORDER].map(r => (
            <button key={r} onClick={() => setFilterRole(r)} className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
              style={{ background: filterRole===r?'rgba(6,182,212,0.2)':'rgba(255,255,255,0.04)', border: filterRole===r?'1px solid rgba(6,182,212,0.4)':'1px solid rgba(255,255,255,0.08)', color: filterRole===r?'#67e8f9':'#64748b' }}>
              {r==='ALL'?'All':ROLE_LABELS[r]}
            </button>
          ))}
          <button onClick={syncManagers} disabled={syncing}
            className="px-3 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5"
            style={{ background:'rgba(251,191,36,0.12)', border:'1px solid rgba(251,191,36,0.3)', color:'#fbbf24' }}
            title="Sync manager assignments from Okta Management API (requires API token in Authentication Realm)">
            {syncing ? '⏳ Syncing…' : '⟳ Sync Managers from Okta'}
          </button>
          <button onClick={() => { setLoading(true); setUsers([]); setTimeout(() => window.location.reload(), 10); }}
            className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-300" style={inputStyle} title="Refresh">↻</button>
        </div>
      </div>
      {syncResult && (
        <div className="rounded-xl p-4 mb-4 text-xs"
          style={{ background: syncResult.error ? 'rgba(248,113,113,0.08)' : 'rgba(16,185,129,0.08)', border: `1px solid ${syncResult.error ? 'rgba(248,113,113,0.3)' : 'rgba(16,185,129,0.3)'}` }}>
          {syncResult.error ? (
            <p className="text-red-400">⚠ {syncResult.error}</p>
          ) : (
            <>
              <p className="text-emerald-400 font-bold mb-2">✓ Sync complete — {syncResult.assigned}/{syncResult.total} managers assigned</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {(syncResult.results || []).map((r, i) => (
                  <p key={i} className={r.status === 'assigned' ? 'text-emerald-300' : r.status === 'error' || r.status === 'okta-error' ? 'text-red-400' : 'text-slate-500'}>
                    {r.status === 'assigned' ? `✓ ${r.email} → ${r.managerEmail}` :
                     r.status === 'no-manager' || r.status === 'no-manager-in-okta' ? `– ${r.email} (no manager in Okta)` :
                     `✗ ${r.email}: ${r.detail || r.status}`}
                  </p>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      <div className="rounded-2xl overflow-hidden" style={cardStyle}>
        {loading ? <div className="flex items-center justify-center py-20 gap-3"><div className="w-6 h-6 border-2 border-white/20 border-t-cyan-400 rounded-full animate-spin"/><span className="text-slate-500 text-sm">Loading…</span></div>
         : error   ? <div className="py-20 text-center"><p className="text-red-400 text-sm mb-3">⚠ {error}</p></div>
         : filtered.length===0 ? <div className="py-20 text-center text-slate-600 text-sm">No users match.</div>
         : <div className="overflow-x-auto"><table className="w-full">
              <thead><tr className="border-b border-white/5">{['User','Role','Manager','Joined','Source',''].map(h => <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-600">{h}</th>)}</tr></thead>
              <tbody>{filtered.map(u => <UserRow key={u.id} user={u} onUpdated={handleUpdated} onDelete={handleDelete} allManagers={allManagers}/>)}</tbody>
           </table></div>}
      </div>
      <p className="text-center text-slate-700 text-xs mt-3">{filtered.length} of {users.length} users · Click any role badge to change it</p>
    </>
  );
}

// ── Local Users tab ──────────────────────────────────────────────────────────
function LocalUsersTab() {
  const [localUsers, setLocalUsers] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [form, setForm]             = useState({ name:'', email:'', password:'', role:'USER' });
  const [saving, setSaving]         = useState(false);
  const [msg, setMsg]               = useState({ text:'', ok: true });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await api.get('/admin/users');
      setLocalUsers((all || []).filter(u => u.isLocalUser));
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { setMsg({ text:'All fields required', ok:false }); return; }
    setSaving(true); setMsg({ text:'', ok:true });
    try {
      await api.post('/admin/local-users', form);
      setMsg({ text:'User created successfully', ok:true });
      setForm({ name:'', email:'', password:'', role:'USER' });
      load();
    } catch(err) {
      setMsg({ text: err?.message || 'Failed to create user', ok:false });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete local user "${name}"? This cannot be undone.`)) return;
    try { await api.delete(`/admin/local-users/${id}`); load(); }
    catch(err) { alert(err?.message || 'Failed to delete'); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Create form */}
      <div className="rounded-2xl p-6" style={cardStyle}>
        <h3 className="font-bold text-white mb-1">Create Local User</h3>
        <p className="text-slate-500 text-xs mb-5">Accounts not linked to Okta — authenticated with email + password.</p>
        <form onSubmit={handleCreate} className="space-y-3">
          {[['Name','text','name','Full name'],['Email','email','email','user@example.com'],['Password','password','password','Min 6 characters']].map(([label,type,field,ph]) => (
            <div key={field}>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">{label}</label>
              <input type={type} value={form[field]} placeholder={ph}
                onChange={e => setForm(f => ({...f,[field]:e.target.value}))}
                className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none"
                style={inputStyle} onFocus={onFocus} onBlur={onBlur}/>
            </div>
          ))}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Role</label>
            <select value={form.role} onChange={e => setForm(f => ({...f,role:e.target.value}))}
              className="w-full rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none"
              style={inputStyle}>
              {ROLE_ORDER.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          {msg.text && <p className={`text-xs ${msg.ok?'text-emerald-400':'text-red-400'}`}>{msg.ok?'✓':' ⚠'} {msg.text}</p>}
          <button type="submit" disabled={saving}
            className="w-full py-2.5 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90"
            style={{ background: saving?'rgba(6,182,212,0.3)':'linear-gradient(135deg,#06b6d4,#7c3aed)' }}>
            {saving ? 'Creating…' : 'Create Local User'}
          </button>
        </form>
      </div>

      {/* Local users list */}
      <div className="rounded-2xl overflow-hidden" style={cardStyle}>
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Local Accounts</span>
          <span className="text-[10px] text-slate-600">{localUsers.length} users</span>
        </div>
        {loading ? <div className="py-10 flex justify-center"><div className="w-5 h-5 border-2 border-white/20 border-t-cyan-400 rounded-full animate-spin"/></div>
         : localUsers.length === 0 ? <div className="py-10 text-center text-slate-600 text-sm">No local users yet.</div>
         : <div className="divide-y divide-white/5">
            {localUsers.map(u => (
              <div key={u.id} className="px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background:'rgba(251,191,36,0.2)', color:'#fbbf24', border:'1px solid rgba(251,191,36,0.3)' }}>
                  {(u.name||u.email)[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{u.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                </div>
                <RoleBadge role={u.role}/>
                <button onClick={() => handleDelete(u.id, u.name)} className="text-slate-600 hover:text-red-400 text-xs transition-colors ml-2" title="Delete">✕</button>
              </div>
            ))}
          </div>}
      </div>
    </div>
  );
}

// ── Courses tab ──────────────────────────────────────────────────────────────
const ACCENT_COLORS_PREVIEW = { '#06b6d4':'Cyan','#f97316':'Orange','#7c3aed':'Violet','#10b981':'Emerald','#f59e0b':'Amber','#f43f5e':'Rose','#3b82f6':'Blue','#6366f1':'Indigo' };

const PLATFORM_ROUTES = { 'devops-loop': '/devops-loop', 'ai-quest': '/ai-quest' };
const courseRoute = (slug) => PLATFORM_ROUTES[slug] || `/c/${slug}`;

function CoursesTab() {
  const navigate = useNavigate();
  const [courses, setCourses]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm]         = useState({ title:'', slug:'', tagline:'', emoji:'📚', accentColor:'#06b6d4' });
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm]   = useState({});
  const [dragId, setDragId]       = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const d = await api.get('/courses-api');
      const sorted = Array.isArray(d)
        ? [...d].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        : [];
      setCourses(sorted);
    }
    catch (e) {
      const msg = e?.message || 'Failed to load courses';
      const is401 = e?.status === 401 || msg.toLowerCase().includes('token') || msg.toLowerCase().includes('expired');
      setError(is401 ? 'Session expired — please log out and log back in.' : msg);
    }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const autoSlug = (title) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.slug.trim()) return;
    setSaving(true);
    try {
      const maxOrder = courses.reduce((m, c) => Math.max(m, c.order ?? 0), -1);
      const c = await api.post('/courses-api', { ...form, order: maxOrder + 1 });
      setCourses(p => [...p, c]);
      setCreating(false);
      setForm({ title:'', slug:'', tagline:'', emoji:'📚', accentColor:'#06b6d4' });
    } catch (e) { setError(e?.message || 'Create failed'); }
    finally { setSaving(false); }
  };

  const deleteCourse = async (id, title) => {
    if (!confirm(`Delete course "${title}" and ALL its content?`)) return;
    try { await api.delete(`/courses-api/${id}`); setCourses(p => p.filter(c => c.id !== id)); }
    catch (e) { alert(e?.message || 'Delete failed'); }
  };

  const toggleStatus = async (c) => {
    const next = c.status === 'live' ? 'coming-soon' : 'live';
    try {
      const updated = await api.put(`/courses-api/${c.id}`, { status: next });
      setCourses(p => p.map(x => x.id === c.id ? { ...x, status: next } : x));
    } catch (e) { alert(e?.message || 'Update failed'); }
  };

  const startEdit = (c) => {
    setEditingId(c.id);
    setEditForm({ title: c.title, tagline: c.tagline || '', emoji: c.emoji || '📚', accentColor: c.accentColor || '#06b6d4', description: c.description || '' });
  };

  const saveEdit = async (id) => {
    try {
      const updated = await api.put(`/courses-api/${id}`, editForm);
      setCourses(p => p.map(c => c.id === id ? { ...c, ...editForm } : c));
      setEditingId(null);
    } catch (e) { alert(e?.message || 'Update failed'); }
  };

  const handleDrop = async (targetId) => {
    if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return; }
    const list = [...courses];
    const from = list.findIndex(c => c.id === dragId);
    const to   = list.findIndex(c => c.id === targetId);
    if (from < 0 || to < 0) return;
    const [item] = list.splice(from, 1);
    list.splice(to, 0, item);
    const reordered = list.map((c, i) => ({ ...c, order: i }));
    setCourses(reordered);
    setDragId(null); setDragOverId(null);
    try { await api.put('/courses-api/reorder', { orders: reordered.map(c => ({ id: c.id, order: c.order })) }); } catch {}
  };

  const weekCount = c => c._count?.weeks ?? c.weeks?.length ?? 0;
  const modCount  = c => c.weeks?.reduce((a, w) => a + (w.modules?.length || 0), 0) ?? 0;

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-orbitron text-sm font-bold text-white">Manage Courses</h3>
          <p className="text-[11px] text-slate-600 mt-0.5">Create and edit courses visible in the Course Hub</p>
        </div>
        <button onClick={() => { setCreating(v => !v); setError(''); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white"
          style={{ background: 'linear-gradient(135deg,#06b6d4,#7c3aed)' }}>
          {creating ? 'Cancel' : '+ New Course'}
        </button>
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="rounded-2xl p-5 mb-6 space-y-4" style={cardStyle}>
          <h4 className="text-sm font-bold text-white mb-3">New Course</h4>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 block mb-1">Title *</label>
              <input value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value, slug: autoSlug(e.target.value) }))}
                placeholder="IBM Cloud Security" required
                className="w-full rounded-xl px-3 py-2 text-sm text-white focus:outline-none" style={inputStyle} />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 block mb-1">Slug (URL) *</label>
              <input value={form.slug}
                onChange={e => setForm(p => ({ ...p, slug: autoSlug(e.target.value) }))}
                placeholder="ibm-cloud-security" required
                className="w-full rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none" style={inputStyle} />
              <p className="text-[10px] text-slate-700 mt-0.5">URL: /c/{form.slug || 'slug'}</p>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 block mb-1">Tagline</label>
              <input value={form.tagline}
                onChange={e => setForm(p => ({ ...p, tagline: e.target.value }))}
                placeholder="Short subtitle"
                className="w-full rounded-xl px-3 py-2 text-sm text-white focus:outline-none" style={inputStyle} />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 block mb-1">Emoji</label>
              <input value={form.emoji} maxLength={4}
                onChange={e => setForm(p => ({ ...p, emoji: e.target.value }))}
                className="w-full rounded-xl px-3 py-2 text-2xl text-center text-white focus:outline-none" style={inputStyle} />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 block mb-2">Accent Color</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(ACCENT_COLORS_PREVIEW).map(([c, label]) => (
                <button key={c} type="button" onClick={() => setForm(p => ({ ...p, accentColor: c }))}
                  className="w-6 h-6 rounded-full border-2 transition-all"
                  style={{ background: c, borderColor: form.accentColor===c?'#fff':'transparent', transform: form.accentColor===c?'scale(1.25)':'scale(1)' }}
                  title={label} />
              ))}
            </div>
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button type="submit" disabled={saving || !form.title.trim()}
            className="px-6 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#06b6d4,#7c3aed)' }}>
            {saving ? 'Creating…' : 'Create Course'}
          </button>
        </form>
      )}

      {/* All courses — unified list */}
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-3">All Courses <span className="text-slate-700 font-normal normal-case">(drag to reorder)</span></p>
      {error && !creating && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-3 mb-3 text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <span className="text-red-400">⚠</span>
          <span className="text-red-300 flex-1">{error}</span>
          <button onClick={load} className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 rounded-lg px-2 py-1">Retry</button>
        </div>
      )}
      <div className="rounded-2xl overflow-hidden" style={cardStyle}>
        {loading
          ? <div className="py-12 flex justify-center"><div className="w-6 h-6 border-2 border-white/20 border-t-cyan-400 rounded-full animate-spin"/></div>
          : courses.length === 0 && !error
            ? <div className="py-12 text-center text-slate-600 text-sm">No courses yet. Click "+ New Course" to create one.</div>
            : <div className="divide-y divide-white/5">
                {courses.map(c => (
                  <div key={c.id}
                    draggable
                    onDragStart={e => { setDragId(c.id); e.dataTransfer.effectAllowed = 'move'; }}
                    onDragOver={e => { e.preventDefault(); setDragOverId(c.id); }}
                    onDrop={e => { e.preventDefault(); handleDrop(c.id); }}
                    onDragEnd={() => { setDragId(null); setDragOverId(null); }}
                    className={`transition-all ${dragOverId === c.id ? 'ring-1 ring-cyan-400' : ''} ${dragId === c.id ? 'opacity-40' : ''}`}
                  >
                    {editingId === c.id ? (
                      <div className="p-4 space-y-3" style={{ background: 'rgba(6,182,212,0.04)' }}>
                        <div className="grid sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2">
                            <label className="text-[10px] text-slate-600 block mb-1">Title</label>
                            <input value={editForm.title} onChange={e => setEditForm(p => ({...p, title: e.target.value}))}
                              className="w-full rounded-xl px-3 py-2 text-sm text-white focus:outline-none" style={inputStyle} />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-600 block mb-1">Emoji</label>
                            <input value={editForm.emoji} maxLength={4} onChange={e => setEditForm(p => ({...p, emoji: e.target.value}))}
                              className="w-full rounded-xl px-3 py-2 text-2xl text-center text-white focus:outline-none" style={inputStyle} />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="text-[10px] text-slate-600 block mb-1">Tagline</label>
                            <input value={editForm.tagline} onChange={e => setEditForm(p => ({...p, tagline: e.target.value}))}
                              className="w-full rounded-xl px-3 py-2 text-sm text-white focus:outline-none" style={inputStyle} />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-600 block mb-1">Accent Color</label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {Object.entries(ACCENT_COLORS_PREVIEW).map(([col]) => (
                                <button key={col} type="button" onClick={() => setEditForm(p => ({...p, accentColor: col}))}
                                  className="w-5 h-5 rounded-full border-2 transition-all"
                                  style={{ background: col, borderColor: editForm.accentColor===col?'#fff':'transparent' }} />
                              ))}
                            </div>
                          </div>
                          <div className="sm:col-span-3">
                            <label className="text-[10px] text-slate-600 block mb-1">Description</label>
                            <textarea value={editForm.description} rows={2} onChange={e => setEditForm(p => ({...p, description: e.target.value}))}
                              className="w-full rounded-xl px-3 py-2 text-sm text-white resize-none focus:outline-none" style={inputStyle} />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => saveEdit(c.id)}
                            className="px-4 py-1.5 rounded-xl text-xs font-bold text-white"
                            style={{ background: 'linear-gradient(135deg,#06b6d4,#7c3aed)' }}>Save</button>
                          <button onClick={() => setEditingId(null)} className="px-4 py-1.5 rounded-xl text-xs text-slate-500 hover:text-slate-300">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                        <span className="text-slate-600 cursor-grab text-sm select-none">⠿</span>
                        <span className="text-xl">{c.emoji || '📚'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{c.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <code className="text-[10px] text-slate-600">{courseRoute(c.slug)}</code>
                            <span className="text-slate-700">·</span>
                            <span className="text-[10px] text-slate-600">{weekCount(c)} wk · {modCount(c)} mod</span>
                          </div>
                        </div>
                        {/* Status toggle */}
                        <button onClick={() => toggleStatus(c)}
                          className={`text-[10px] px-2.5 py-1 rounded-full font-bold border transition-all hover:scale-105 ${c.status === 'live' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25 hover:bg-emerald-500/20' : 'text-slate-500 bg-slate-700/20 border-slate-600/20 hover:text-amber-400 hover:border-amber-400/30'}`}
                          title="Click to toggle Live/Coming Soon">
                          {c.status === 'live' ? '● LIVE' : '○ COMING SOON'}
                        </button>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button onClick={() => startEdit(c)}
                            className="text-[10px] px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-200 border border-white/8 hover:border-white/20 transition-all">
                            ✎ Info
                          </button>
                          <button onClick={() => navigate(`/admin/courses/${c.slug}/edit`)}
                            className="text-[10px] px-3 py-1 rounded-lg font-bold text-white"
                            style={{ background: 'linear-gradient(135deg,#06b6d4,#7c3aed)' }}>
                            Edit Content
                          </button>
                          <button onClick={() => deleteCourse(c.id, c.title)}
                            className="text-slate-700 hover:text-red-400 transition-colors px-1 py-1 rounded hover:bg-red-500/10">
                            ✕
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
        }
      </div>
    </>
  );
}

// ── Authentication Realm tab ──────────────────────────────────────────────────
const EMPTY_CONFIG = { enabled:true, realmName:'', description:'', issuer:'', clientId:'', clientSecret:'', scopes:'openid profile email groups', jwksUri:'', authorizationEndpoint:'', tokenEndpoint:'', userinfoEndpoint:'', endSessionEndpoint:'', managerClaim:'manager', managerIdClaim:'managerId', oktaApiToken:'' };

function AuthRealmTab() {
  const [cfg, setCfg]           = useState(EMPTY_CONFIG);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [msg, setMsg]           = useState({ text:'', ok:true });
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    (async () => {
      try { const d = await api.get('/admin/oidc-config'); setCfg(c => ({...c,...d})); }
      catch {}
      finally { setLoading(false); }
    })();
  }, []);

  const discover = async () => {
    if (!cfg.issuer) { setMsg({ text:'Enter issuer URL first', ok:false }); return; }
    setDiscovering(true); setMsg({ text:'', ok:true });
    try {
      const d = await api.post('/admin/oidc-config/discover', { issuer: cfg.issuer });
      setCfg(c => ({ ...c, ...d }));
      setMsg({ text:'Endpoints discovered successfully', ok:true });
    } catch(err) { setMsg({ text: err?.message || 'Discovery failed', ok:false }); }
    finally { setDiscovering(false); }
  };

  const save = async (e) => {
    e.preventDefault(); setSaving(true); setMsg({ text:'', ok:true });
    try { await api.put('/admin/oidc-config', cfg); setMsg({ text:'Configuration saved. Restart the backend to apply.', ok:true }); }
    catch(err) { setMsg({ text: err?.message || 'Save failed', ok:false }); }
    finally { setSaving(false); }
  };

  const Field = ({ label, field, type='text', placeholder='', hint='' }) => (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">{label}</label>
      <input type={type} value={cfg[field]||''} placeholder={placeholder}
        onChange={e => setCfg(c => ({...c,[field]:e.target.value}))}
        className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none"
        style={inputStyle} onFocus={onFocus} onBlur={onBlur}/>
      {hint && <p className="text-[10px] text-slate-600 mt-0.5">{hint}</p>}
    </div>
  );

  if (loading) return <div className="py-20 flex justify-center"><div className="w-6 h-6 border-2 border-white/20 border-t-cyan-400 rounded-full animate-spin"/></div>;

  return (
    <form onSubmit={save} className="max-w-2xl space-y-6">
      {/* Realm info */}
      <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
        <h3 className="font-bold text-white text-base">Authentication Realm</h3>
        <Field label="Realm Name *" field="realmName" placeholder="HCL Learning Hub"/>
        <Field label="Description" field="description" placeholder="HCL Okta SSO Authentication"/>
        <div className="flex items-center gap-3">
          <input type="checkbox" id="oidcEnabled" checked={!!cfg.enabled} onChange={e => setCfg(c => ({...c,enabled:e.target.checked}))} className="w-4 h-4 accent-cyan-400"/>
          <label htmlFor="oidcEnabled" className="text-sm text-slate-300">Enable SSO login for this realm</label>
        </div>
      </div>

      {/* OpenID Provider */}
      <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
        <h3 className="font-bold text-white text-base">OpenID Provider &amp; Client Identity</h3>
        <Field label="Client ID *" field="clientId" placeholder="0oa13io7fhtx5FBLw1d8"/>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Client Secret</label>
          <div className="relative">
            <input type={showSecret?'text':'password'} value={cfg.clientSecret||''} placeholder="Leave blank for PKCE (recommended)"
              onChange={e => setCfg(c => ({...c,clientSecret:e.target.value}))}
              className="w-full rounded-xl px-3 py-2.5 pr-20 text-sm text-white placeholder-slate-600 focus:outline-none"
              style={inputStyle} onFocus={onFocus} onBlur={onBlur}/>
            <button type="button" onClick={() => setShowSecret(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 hover:text-slate-300">
              {showSecret?'HIDE':'SHOW'}
            </button>
          </div>
          <p className="text-[10px] text-slate-600 mt-0.5">PKCE does not require a client secret. Only set for confidential clients.</p>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Issuer *</label>
          <div className="flex gap-2">
            <input type="url" value={cfg.issuer||''} placeholder="https://hcl-software.oktapreview.com/oauth2/default"
              onChange={e => setCfg(c => ({...c,issuer:e.target.value}))}
              className="flex-1 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none"
              style={inputStyle} onFocus={onFocus} onBlur={onBlur}/>
            <button type="button" onClick={discover} disabled={discovering}
              className="px-4 py-2 rounded-xl font-bold text-sm transition-all"
              style={{ background:'rgba(6,182,212,0.2)', border:'1px solid rgba(6,182,212,0.4)', color:'#67e8f9', minWidth:'100px' }}>
              {discovering ? '…' : 'Discover'}
            </button>
          </div>
        </div>
        <Field label="Scopes" field="scopes" placeholder="openid profile email groups"/>
      </div>

      {/* OpenID Endpoints */}
      <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
        <h3 className="font-bold text-white text-base">OpenID Endpoints <span className="text-[10px] font-normal text-slate-500 ml-1">(auto-filled by Discover)</span></h3>
        <Field label="JWKS URI *"               field="jwksUri"               placeholder="https://…/v1/keys"/>
        <Field label="Authorization Endpoint *"  field="authorizationEndpoint" placeholder="https://…/v1/authorize"/>
        <Field label="Token Endpoint *"          field="tokenEndpoint"          placeholder="https://…/v1/token"/>
        <Field label="Userinfo Endpoint *"       field="userinfoEndpoint"       placeholder="https://…/v1/userinfo"/>
        <Field label="End Session Endpoint"      field="endSessionEndpoint"     placeholder="https://…/v1/logout"/>
      </div>

      {/* Manager claims */}
      <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
        <h3 className="font-bold text-white text-base">Manager Claim Mapping</h3>
        <p className="text-[11px] text-slate-500">If Okta returns manager in the userinfo endpoint these claim names are used. If no claims are found, the Okta Management API (below) is used as fallback.</p>
        <Field label="Manager Email Claim" field="managerClaim"   placeholder="manager"   hint="Userinfo claim that carries the learner's manager email"/>
        <Field label="Manager ID Claim"    field="managerIdClaim" placeholder="managerId" hint="Userinfo claim for manager employee ID or email"/>
      </div>

      {/* Okta Management API */}
      <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
        <h3 className="font-bold text-white text-base">Okta Management API <span className="text-[10px] font-normal text-amber-500 ml-1">Required for bulk manager sync</span></h3>
        <p className="text-[11px] text-slate-500 leading-relaxed">Generate a Read-Only API token from your Okta Admin Console → Security → API → Tokens. This allows the server to call <code className="text-amber-400">/api/v1/users/&#123;id&#125;/manager</code> to automatically assign managers — even without OIDC claim mapping.</p>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Okta API Token</label>
          <input type="password" value={cfg.oktaApiToken||''} placeholder="SSWS 00abc123... (Read-only scope)"
            onChange={e => setCfg(c => ({...c,oktaApiToken:e.target.value}))}
            className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none"
            style={inputStyle} onFocus={onFocus} onBlur={onBlur}/>
          <p className="text-[10px] text-slate-600 mt-0.5">Okta Admin → Security → API → Tokens → Create Token. Prefix &quot;SSWS &quot; is added automatically.</p>
        </div>
      </div>

      {msg.text && (
        <p className={`text-sm ${msg.ok?'text-emerald-400':'text-red-400'} px-1`}>{msg.ok?'✓':'⚠'} {msg.text}</p>
      )}

      <button type="submit" disabled={saving}
        className="px-8 py-3 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90"
        style={{ background: saving?'rgba(6,182,212,0.3)':'linear-gradient(135deg,#06b6d4,#7c3aed)', boxShadow: saving?'none':'0 0 20px rgba(6,182,212,0.3)' }}>
        {saving ? 'Saving…' : 'Save Configuration'}
      </button>
    </form>
  );
}

// ── Help Settings tab ────────────────────────────────────────────────────────
const HELP_KEYS = [
  { key: 'help.instructor.name',          label: 'Global Moderator Name',        placeholder: 'Raghavendra B' },
  { key: 'help.instructor.title',         label: 'Global Moderator Title',       placeholder: 'AI Transformation Moderator · HCL Software' },
  { key: 'help.instructor.email',         label: 'Global Moderator Email',       placeholder: 'raghavendrab@hcl-software.com' },
  { key: 'help.spaces.generic.url',       label: 'General Help Space URL',       placeholder: 'https://chat.google.com/room/...' },
  { key: 'help.spaces.generic.name',      label: 'General Help Space Name',      placeholder: 'HCL Software — General Help Space' },
  { key: 'help.spaces.generic.hint',      label: 'General Help Space Hint',      placeholder: 'Any generic issues, login problems, or platform questions' },
];

function HelpSettingsTab() {
  const [values, setValues] = useState({});
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [courseDraft, setCourseDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(null);
  const [msg, setMsg]         = useState({ text: '', ok: true });

  useEffect(() => {
    Promise.all([api.get('/settings'), api.get('/courses-api')]).then(([settings, courseList]) => {
      const globalSettings = settings || {};
      setValues(globalSettings);
      const list = (Array.isArray(courseList) ? courseList : []).map(course => {
        const prefix = course.slug === 'ai-quest' ? 'aiQuest' : course.slug === 'devops-loop' ? 'devops' : 'generic';
        const platformDefaults = course.slug === 'ai-quest'
          ? { url: 'https://chat.google.com/room/AAQAKyozwQ8?cls=7', name: 'HCL Software Support AI Hackathon 2026', hint: 'AI Quest questions, quests, curriculum & workshops' }
          : course.slug === 'devops-loop'
          ? { url: 'https://chat.google.com/room/AAAA0fg_fTQ?cls=7', name: 'DevOps Loop Support', hint: 'DevOps Loop questions, installation, quests & curriculum' }
          : { url: 'https://chat.google.com/room/AAAAE-llN3w?cls=7', name: 'HCL Software — General Help Space', hint: 'Any generic issues, login problems, or platform questions' };
        return {
          ...course,
          instructorName: course.instructorName || globalSettings['help.instructor.name'] || 'Raghavendra B',
          instructorEmail: course.instructorEmail || globalSettings['help.instructor.email'] || 'raghavendrab@hcl-software.com',
          helpSpaceUrl: course.helpSpaceUrl || globalSettings[`help.spaces.${prefix}.url`] || platformDefaults.url,
          helpSpaceName: course.helpSpaceName || globalSettings[`help.spaces.${prefix}.name`] || platformDefaults.name,
          helpSpaceHint: course.helpSpaceHint || globalSettings[`help.spaces.${prefix}.hint`] || platformDefaults.hint,
        };
      });
      setCourses(list);
      if (list.length) {
        setSelectedCourseId(list[0].id);
        setCourseDraft(list[0]);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const selectCourse = (id) => {
    const next = courses.find(course => course.id === id);
    setSelectedCourseId(id);
    setCourseDraft(next || {});
  };

  const saveCourse = async () => {
    if (!selectedCourseId) return;
    setSaving(`course:${selectedCourseId}`);
    try {
      const updated = await api.put(`/courses-api/${selectedCourseId}`, {
        instructorName: courseDraft.instructorName || '',
        instructorEmail: courseDraft.instructorEmail || '',
        helpSpaceUrl: courseDraft.helpSpaceUrl || '',
        helpSpaceName: courseDraft.helpSpaceName || '',
        helpSpaceHint: courseDraft.helpSpaceHint || '',
      });
      setCourses(previous => previous.map(course => course.id === updated.id ? { ...course, ...updated } : course));
      setCourseDraft(previous => ({ ...previous, ...updated }));
      setMsg({ text: 'Course Help Session saved!', ok: true });
      setTimeout(() => setMsg({ text: '', ok: true }), 2500);
    } catch (e) { setMsg({ text: e?.message || 'Save failed', ok: false }); }
    finally { setSaving(null); }
  };

  const save = async (key) => {
    setSaving(key);
    try {
      await api.put(`/settings/${encodeURIComponent(key)}`, { value: values[key] ?? '' });
      setMsg({ text: 'Saved!', ok: true });
      setTimeout(() => setMsg({ text: '', ok: true }), 2000);
    } catch (e) { setMsg({ text: e?.message || 'Save failed', ok: false }); }
    finally { setSaving(null); }
  };

  const saveAll = async () => {
    setSaving('all');
    try {
      await Promise.all(HELP_KEYS.map(({ key }) =>
        api.put(`/settings/${encodeURIComponent(key)}`, { value: values[key] ?? '' })
      ));
      setMsg({ text: 'All settings saved!', ok: true });
      setTimeout(() => setMsg({ text: '', ok: true }), 2500);
    } catch (e) { setMsg({ text: e?.message || 'Save failed', ok: false }); }
    finally { setSaving(null); }
  };

  if (loading) return <div className="py-16 flex justify-center"><div className="w-6 h-6 border-2 border-white/20 border-t-cyan-400 rounded-full animate-spin"/></div>;

  const sections = [
    { title: 'Instructor', keys: HELP_KEYS.slice(0, 3) },
    { title: 'General Help Space', keys: HELP_KEYS.slice(3, 6) },
  ];
  const selectedCourseName = courses.find(course => course.id === selectedCourseId)?.title || 'Course';
  const courseField = (key) => e => setCourseDraft(previous => ({ ...previous, [key]: e.target.value }));

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-orbitron text-sm font-bold text-white">Help Session Settings</h3>
          <p className="text-[11px] text-slate-600 mt-0.5">Instructor contact info and Google Chat Space links shown in the Help Session modal</p>
        </div>
        <button onClick={saveAll} disabled={saving === 'all'}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg,#06b6d4,#7c3aed)' }}>
          {saving === 'all' ? 'Saving…' : 'Save All'}
        </button>
      </div>
      {msg.text && (
        <div className={`mb-4 px-4 py-2.5 rounded-xl text-xs font-semibold ${msg.ok ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' : 'bg-red-500/10 text-red-400 border border-red-500/25'}`}>
          {msg.text}
        </div>
      )}
      <div className="space-y-5">
        {sections.map(sec => (
          <div key={sec.title} className="rounded-2xl p-5 space-y-4" style={cardStyle}>
            <h4 className="text-xs font-bold text-white">{sec.title}</h4>
            {sec.keys.map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 block mb-1">{label}</label>
                <div className="flex gap-2">
                  <input
                    value={values[key] ?? ''}
                    onChange={e => setValues(p => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="flex-1 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-700 focus:outline-none"
                    style={inputStyle}
                  />
                  <button onClick={() => save(key)} disabled={saving === key}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40 flex-shrink-0"
                    style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)', color: '#67e8f9' }}>
                    {saving === key ? '…' : 'Save'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
        <div className="rounded-2xl p-5 space-y-4" style={cardStyle}>
          <div>
            <h4 className="text-xs font-bold text-white">Course Help Sessions</h4>
            <p className="text-[11px] text-slate-600 mt-1">Each course has its own moderator and support space. New courses appear here automatically.</p>
          </div>
          {courses.length ? (
            <>
              <select value={selectedCourseId} onChange={e => selectCourse(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none" style={inputStyle}>
                {courses.map(course => <option key={course.id} value={course.id}>{course.emoji || '📚'} {course.title}</option>)}
              </select>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  ['instructorName', 'Moderator Name', 'e.g. John Smith'],
                  ['instructorEmail', 'Moderator Email', 'john@example.com'],
                  ['helpSpaceUrl', 'Chat Space URL', 'https://chat.google.com/room/...'],
                  ['helpSpaceName', 'Chat Space Display Name', `${selectedCourseName} Support`],
                  ['helpSpaceHint', 'Chat Space Hint', `${selectedCourseName} questions, labs & quests`],
                ].map(([key, label, placeholder]) => <label key={key} className={key === 'helpSpaceUrl' || key === 'helpSpaceHint' ? 'sm:col-span-2' : ''}>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 block mb-1">{label}</span>
                  <input value={courseDraft[key] || ''} onChange={courseField(key)} placeholder={placeholder}
                    className="w-full rounded-xl px-3 py-2 text-sm text-white placeholder-slate-700 focus:outline-none" style={inputStyle} />
                </label>)}
              </div>
              <button onClick={saveCourse} disabled={saving === `course:${selectedCourseId}`}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40"
                style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)', color: '#67e8f9' }}>
                {saving === `course:${selectedCourseId}` ? 'Saving…' : `Save ${selectedCourseName} Help`}
              </button>
            </>
          ) : <p className="text-xs text-slate-500">No courses have been created yet.</p>}
        </div>
      </div>
    </div>
  );
}

// ── Main AdminPanel ───────────────────────────────────────────────────────────
const TABS = [
  { id:'okta-users',      label:'Okta Users'           },
  { id:'local-users',     label:'Local Users'           },
  { id:'courses',         label:'Courses'               },
  { id:'learner-tracker', label:'Learner Tracker'       },
  { id:'help-settings',   label:'Help Settings'         },
  { id:'ai-provider',     label:'AI Provider'           },
  { id:'auth-realm',      label:'Authentication Realm'  },
];

export default function AdminPanel() {
  const auth = getAuth();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'okta-users';
  const [activeTab, setActiveTab] = useState(TABS.some(t => t.id === initialTab) ? initialTab : 'okta-users');

  return (
    <div className="min-h-screen px-4 py-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/courses" className="text-slate-500 hover:text-slate-300 transition-colors text-sm">← Back</Link>
        <div>
          <h1 className="font-orbitron text-2xl font-black bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
            Administration
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Signed in as <span className="text-cyan-400">{auth?.name}</span>
            <span className="ml-2 text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full uppercase tracking-widest">Admin</span>
          </p>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex flex-wrap gap-1 mb-6 p-1 rounded-xl w-fit max-w-full" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className="px-5 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ background: activeTab===t.id?'rgba(6,182,212,0.2)':'transparent', color: activeTab===t.id?'#67e8f9':'#64748b', border: activeTab===t.id?'1px solid rgba(6,182,212,0.35)':'1px solid transparent' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab==='okta-users'      && <OktaUsersTab/>}
      {activeTab==='local-users'     && <LocalUsersTab/>}
      {activeTab==='courses'         && <CoursesTab/>}
      {activeTab==='learner-tracker' && <LearnerTracker asTab={true}/>}
      {activeTab==='help-settings'   && <HelpSettingsTab/>}
      {activeTab==='ai-provider'     && <AIProviderTab/>}
      {activeTab==='auth-realm'      && <AuthRealmTab/>}
    </div>
  );
}
