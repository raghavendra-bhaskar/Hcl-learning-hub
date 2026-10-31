import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, Mail, Calendar, Trophy, ChevronLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAppStore } from '../App.jsx';
import { getAuth } from './LoginPage.jsx';

const PREF_META = {
  quest_completion:  { icon: Trophy,    label: 'Quest Completion',  desc: 'Get an email each time you complete a quest.' },
  course_completion: { icon: CheckCircle2, label: 'Course Completion', desc: 'Get an email when you finish all quests in a course.' },
  weekly_report:     { icon: Calendar,  label: 'Weekly Team Report', desc: 'Monday digest summarising your team\'s learning activity. (Managers & Admins)' },
};

export default function NotificationPrefsPage() {
  const navigate = useNavigate();
  const { theme } = useAppStore();
  const user = getAuth();
  const isLight = theme === 'light';

  const [prefs, setPrefs]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testStatus, setTestStatus] = useState(null);
  const [saveMsg, setSaveMsg]   = useState('');

  useEffect(() => {
    api.get('/notifications/prefs')
      .then(data => setPrefs(data))
      .catch(() => setPrefs([]))
      .finally(() => setLoading(false));
  }, []);

  async function togglePref(type) {
    const updated = prefs.map(p => p.type === type ? { ...p, enabled: !p.enabled } : p);
    setPrefs(updated);
    setSaving(true);
    try {
      await api.put('/notifications/prefs', updated);
      setSaveMsg('Preferences saved.');
    } catch {
      setSaveMsg('Failed to save — please try again.');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(''), 3000);
    }
  }

  async function handleTestEmail(e) {
    e.preventDefault();
    setTestStatus('sending');
    try {
      const body = {};
      if (testEmail) body.to = testEmail;
      const res = await api.post('/notifications/test', body);
      setTestStatus(res.ok ? 'sent' : 'failed');
    } catch {
      setTestStatus('failed');
    }
    setTimeout(() => setTestStatus(null), 5000);
  }

  const cardStyle = isLight
    ? { background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(100,116,139,0.16)' }
    : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' };

  return (
    <div className="min-h-screen" style={{ background: isLight ? 'linear-gradient(160deg, #f8fafc 0%, #eef2ff 100%)' : undefined }}>
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Header */}
        <button onClick={() => navigate(-1)}
          className={`flex items-center gap-1.5 text-xs mb-6 transition-colors ${isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}>
          <ChevronLeft size={14} /> Back
        </button>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#06b6d422' }}>
            <Bell size={20} style={{ color: '#06b6d4' }} />
          </div>
          <div>
            <h1 className={`text-xl font-bold font-orbitron ${isLight ? 'text-slate-900' : 'text-white'}`}>Notification Preferences</h1>
            <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Choose what emails you receive from HCL Learning Hub.</p>
          </div>
        </div>

        {/* Save feedback */}
        {saveMsg && (
          <div className="mb-4 px-4 py-2.5 rounded-xl text-sm flex items-center gap-2" style={{ background: '#06b6d420', border: '1px solid #06b6d440', color: '#06b6d4' }}>
            <CheckCircle2 size={14} /> {saveMsg}
          </div>
        )}

        {/* Preferences list */}
        <div className="rounded-2xl overflow-hidden mb-6" style={cardStyle}>
          <div className="px-5 py-4 border-b" style={{ borderColor: isLight ? 'rgba(100,116,139,0.12)' : 'rgba(255,255,255,0.06)' }}>
            <h2 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Email Notifications</h2>
          </div>

          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-white/20 border-t-cyan-400 rounded-full animate-spin" />
            </div>
          ) : prefs.map(({ type, enabled }, idx) => {
            const meta = PREF_META[type];
            if (!meta) return null;
            const Icon = meta.icon;
            return (
              <div key={type}
                className={`flex items-center gap-4 px-5 py-4 transition-colors ${idx < prefs.length - 1 ? 'border-b' : ''}`}
                style={{ borderColor: isLight ? 'rgba(100,116,139,0.1)' : 'rgba(255,255,255,0.05)' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: enabled ? '#06b6d418' : isLight ? 'rgba(148,163,184,0.12)' : 'rgba(255,255,255,0.04)' }}>
                  <Icon size={15} style={{ color: enabled ? '#06b6d4' : isLight ? '#94a3b8' : '#475569' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>{meta.label}</p>
                  <p className={`text-[12px] mt-0.5 leading-snug ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>{meta.desc}</p>
                </div>
                <button
                  onClick={() => togglePref(type)}
                  disabled={saving}
                  className="flex-shrink-0 w-11 h-6 rounded-full relative transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                  style={{ background: enabled ? '#06b6d4' : isLight ? '#cbd5e1' : '#334155' }}
                  aria-checked={enabled}
                  role="switch">
                  <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200"
                    style={{ transform: enabled ? 'translateX(20px)' : 'none' }} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Admin: Test email */}
        {(user?.role === 'ADMIN') && (
          <div className="rounded-2xl overflow-hidden" style={cardStyle}>
            <div className="px-5 py-4 border-b" style={{ borderColor: isLight ? 'rgba(100,116,139,0.12)' : 'rgba(255,255,255,0.06)' }}>
              <h2 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Test Email Configuration</h2>
            </div>
            <form onSubmit={handleTestEmail} className="px-5 py-4 flex flex-col gap-3">
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Send a test email to verify SMTP settings are working. Requires <code className="text-[11px] px-1 rounded" style={{ background: isLight ? 'rgba(148,163,184,0.15)' : 'rgba(255,255,255,0.08)' }}>SMTP_ENABLED=true</code> in the server environment.</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={testEmail}
                  onChange={e => setTestEmail(e.target.value)}
                  placeholder={user?.email || 'recipient@example.com'}
                  className={`flex-1 text-sm rounded-xl px-3 py-2 outline-none border ${isLight ? 'bg-white border-slate-200 text-slate-900 placeholder-slate-400' : 'bg-white/5 border-white/10 text-white placeholder-slate-600'}`}
                />
                <button type="submit" disabled={testStatus === 'sending'}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-all flex items-center gap-2 disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#06b6d4,#0891b2)' }}>
                  <Mail size={13} />
                  {testStatus === 'sending' ? 'Sending…' : 'Send Test'}
                </button>
              </div>
              {testStatus === 'sent' && (
                <p className="text-xs flex items-center gap-1.5" style={{ color: '#10b981' }}>
                  <CheckCircle2 size={12} /> Test email sent successfully.
                </p>
              )}
              {testStatus === 'failed' && (
                <p className="text-xs flex items-center gap-1.5 text-red-400">
                  <AlertCircle size={12} /> Failed to send. Check SMTP settings and server logs.
                </p>
              )}
            </form>
          </div>
        )}

        {/* Opt-out note */}
        {!loading && prefs.some(p => !p.enabled) && (
          <p className={`mt-4 text-xs text-center ${isLight ? 'text-slate-400' : 'text-slate-600'}`}>
            <BellOff size={11} className="inline mr-1" />
            Some notifications are disabled. You can re-enable them at any time.
          </p>
        )}
      </div>
    </div>
  );
}
