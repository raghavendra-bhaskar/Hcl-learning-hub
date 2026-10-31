import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { OktaAuth } from '@okta/okta-auth-js';
import { Eye, EyeOff } from 'lucide-react';
import { api, storeToken, clearToken } from '../lib/api.js';
import { useAppStore } from '../App.jsx';
import HCLSoftwareWordmark from '../components/HCLSoftwareWordmark.jsx';

const AUTH_KEY = 'hcl-quest-auth';

export function getAuth() {
  try {
    const saved = localStorage.getItem(AUTH_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
}

export function clearAuth() {
  localStorage.removeItem(AUTH_KEY);
  clearToken();
}

export async function signOut() {
  const auth = getAuth();
  clearAuth();
  if (auth?.source === 'okta' && auth?.endSessionEndpoint) {
    const params = new URLSearchParams({
      post_logout_redirect_uri: window.location.origin + '/login',
    });
    if (auth.oktaIdToken) params.set('id_token_hint', auth.oktaIdToken);
    window.location.href = `${auth.endSessionEndpoint}?${params}`;
  } else {
    window.location.replace('/login');
  }
}

function buildOktaAuth(cfg) {
  if (!cfg?.issuer || !cfg?.clientId) return null;
  return new OktaAuth({
    issuer:               cfg.issuer,
    clientId:             cfg.clientId,
    redirectUri:          `${window.location.origin}/login/callback`,
    postLogoutRedirectUri:`${window.location.origin}/login`,
    scopes:               (cfg.scopes || 'openid profile email').split(/\s+/).filter(Boolean),
    pkce:                 !cfg.confidential,
    responseType:         'code',
    responseMode:         'query',
    tokenManager:         { storage: 'localStorage' },
  });
}

const iStyle  = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' };
const iFocus  = (e) => (e.target.style.border = '1px solid rgba(6,182,212,0.5)');
const iBlur   = (e) => (e.target.style.border = '1px solid rgba(255,255,255,0.08)');

// ── Controlled desk lamp — pull to reveal the login form ─────────────────────
function DeskLamp({ on, onToggle }) {
  const [cordPull, setCordPull] = useState(false);

  const playSound = (turningOn) => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const audioCtx = new Ctx();
      const now = audioCtx.currentTime;
      if (turningOn) {
        const hum = audioCtx.createOscillator();
        const humGain = audioCtx.createGain();
        hum.type = 'sine';
        hum.frequency.setValueAtTime(120, now + 0.05);
        humGain.gain.setValueAtTime(0.001, now);
        humGain.gain.linearRampToValueAtTime(0.06, now + 0.08);
        humGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        hum.connect(humGain);
        humGain.connect(audioCtx.destination);
        hum.start(now + 0.05);
        hum.stop(now + 0.38);
      } else {
        const bufLen = Math.ceil(audioCtx.sampleRate * 0.07);
        const buf = audioCtx.createBuffer(1, bufLen, audioCtx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.1));
        const src = audioCtx.createBufferSource();
        src.buffer = buf;
        const g = audioCtx.createGain();
        g.gain.setValueAtTime(0.3, now);
        src.connect(g); g.connect(audioCtx.destination);
        src.start();
      }
    } catch {}
  };

  const handleClick = () => {
    setCordPull(true);
    setTimeout(() => setCordPull(false), 300);
    playSound(!on);
    onToggle();
  };

  return (
    <div
      onClick={handleClick}
      title={on ? 'Click to turn off' : 'Pull to turn on'}
      style={{ cursor: 'pointer', userSelect: 'none', position: 'relative' }}
    >
      {/* Ambient floor glow */}
      <div style={{
        position: 'absolute', bottom: -30, left: '50%', transform: 'translateX(-50%)',
        width: 440, height: 340,
        background: on
          ? 'radial-gradient(ellipse 75% 55% at 50% 5%, rgba(255,220,90,0.3) 0%, rgba(255,165,40,0.1) 55%, transparent 80%)'
          : 'transparent',
        filter: 'blur(14px)',
        transition: 'background 0.7s ease',
        pointerEvents: 'none',
        zIndex: 0,
      }}/>

      <svg
        viewBox="0 0 140 210"
        width="190"
        height="285"
        overflow="visible"
        style={{
          position: 'relative', zIndex: 1,
          filter: on
            ? 'drop-shadow(0 0 18px rgba(255,210,60,0.65)) drop-shadow(0 0 50px rgba(255,195,50,0.3))'
            : 'none',
          transition: 'filter 0.55s ease',
        }}
      >
        <defs>
          <linearGradient id="dlCone" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%"  stopColor="rgba(255,225,80,0.6)"/>
            <stop offset="85%" stopColor="rgba(255,200,60,0.04)"/>
            <stop offset="100%" stopColor="rgba(255,200,60,0)"/>
          </linearGradient>
        </defs>

        <polygon points="70,123 2,208 138,208" fill="url(#dlCone)"
          opacity={on ? 1 : 0} style={{ transition: 'opacity 0.55s ease' }}/>

        <rect x="23" y="192" width="94" height="16" rx="6" fill="#141424" stroke="#1d1d38" strokeWidth="1"/>
        <rect x="37" y="184" width="66" height="11" rx="4" fill="#181832" stroke="#1d1d38" strokeWidth="1"/>
        <rect x="66" y="106" width="8" height="80" rx="4" fill="#181830"/>
        <rect x="70" y="107" width="2" height="78" rx="1" fill="rgba(255,255,255,0.04)"/>
        <path d="M48,50 C38,50 13,80 13,122 L127,122 C127,80 102,50 92,50 Z"
          fill="#181832" stroke="#1d1d38" strokeWidth="1"/>
        <path d="M50,52 C40,52 16,80 16,120 L124,120 C124,80 100,52 90,52 Z"
          fill={on ? '#3d1f00' : '#0e0e20'} style={{ transition: 'fill 0.45s ease' }}/>
        <path d="M55,57 C46,57 22,82 22,118 L118,118 C118,82 94,57 85,57 Z"
          fill={on ? 'rgba(255,180,30,0.18)' : 'rgba(255,180,30,0)'} style={{ transition: 'fill 0.45s ease' }}/>
        <ellipse cx="70" cy="110" rx="22" ry="7"
          fill={on ? 'rgba(255,252,190,0.88)' : 'rgba(255,252,190,0)'}
          style={{ filter: on ? 'blur(4px)' : 'none', transition: 'fill 0.4s ease' }}/>
        <ellipse cx="70" cy="122" rx="57" ry="11"
          fill={on ? '#ffd740' : '#0c0c1e'} style={{ transition: 'fill 0.4s ease' }}/>
        <ellipse cx="70" cy="122" rx="57" ry="11" fill="none" stroke="#1d1d38" strokeWidth="2"/>
        <ellipse cx="70" cy="50" rx="22" ry="5" fill="#181832" stroke="#1d1d38" strokeWidth="1"/>
        <rect x="64" y="46" width="12" height="10" rx="3" fill="#181832"/>
        <ellipse cx="70" cy="106" rx="7" ry="4" fill="#1d1d38" stroke="#252545" strokeWidth="1"/>
        <line x1="70" y1="123" x2="70" y2={cordPull ? 152 : 144}
          stroke="#6b7280" strokeWidth="1.2" strokeDasharray="4,3"/>
        <circle cx="70" cy={cordPull ? 156 : 148} r="3.5" fill="#6b7280"/>
      </svg>

      <p style={{
        textAlign: 'center', fontSize: '10px', letterSpacing: '0.16em',
        textTransform: 'uppercase', fontWeight: 700,
        color: on ? 'rgba(255,218,90,0.5)' : 'rgba(100,116,139,0.55)',
        transition: 'color 0.5s ease',
        marginTop: 10, userSelect: 'none',
      }}>
        {on ? 'click to turn off' : 'pull to turn on'}
      </p>
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAvatar, setPlayerName } = useAppStore();
  const [oidcCfg, setOidcCfg]         = useState(null);
  const [cfgLoading, setCfgLoading]   = useState(true);
  const [error, setError]             = useState('');
  const [ssoLoading, setSsoLoading]   = useState(false);
  const [showLocal, setShowLocal]     = useState(false);
  const [localEmail, setLocalEmail]   = useState('');
  const [localPass, setLocalPass]     = useState('');
  const [showPass, setShowPass]       = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [lampOn, setLampOn]             = useState(false);
  const [formVisible, setFormVisible]   = useState(false);

  const hasAvatar = () => {
    try { return !!JSON.parse(localStorage.getItem('ai-quest-progress') || '{}')?.avatar; }
    catch { return false; }
  };

  useEffect(() => {
    const auth = getAuth();
    if (auth?.isLoggedIn) { navigate(auth.hasAvatar ? '/courses' : '/avatar', { replace: true }); return; }
    (async () => {
      try {
        const cfg = await api.get('/oidc-config');
        setOidcCfg(cfg);
      } catch { setOidcCfg(null); }
      finally { setCfgLoading(false); }
    })();
  }, [navigate]);

  const ssoEnabled = oidcCfg?.enabled && oidcCfg?.issuer && oidcCfg?.clientId;

  const handleOidcLogin = async () => {
    const oktaAuth = buildOktaAuth(oidcCfg);
    if (!oktaAuth) { setError('SSO is not configured. Contact your administrator.'); return; }
    try {
      setError(''); setSsoLoading(true);
      await oktaAuth.signInWithRedirect();
    } catch (err) {
      console.error('[okta] redirect failed:', err);
      setSsoLoading(false);
      setError(err?.message || 'Unable to start SSO sign-in. Try again or contact support.');
    }
  };

  const handleLocalLogin = async (e) => {
    e.preventDefault();
    if (!localEmail.trim() || !localPass.trim()) { setError('Enter email and password.'); return; }
    try {
      setError(''); setLocalLoading(true);
      const data = await api.post('/auth/local/login', { email: localEmail.trim(), password: localPass });
      storeToken(data.token);
      localStorage.setItem(AUTH_KEY, JSON.stringify({
        isLoggedIn: true,
        source: 'local-user',
        name: data.user?.name || localEmail,
        email: data.user?.email || localEmail,
        role: data.user?.role || 'USER',
        hasAvatar: !!data.user?.hasAvatar,
        loginAt: Date.now(),
      }));
      try {
        const me = await api.get('/me');
        const ad = me?.avatarData;
        if (ad?.avatar) { setAvatar(ad.avatar); if (ad.playerName) setPlayerName(ad.playerName); }
      } catch {}
      navigate(data.user?.hasAvatar ? '/courses' : '/avatar', { replace: true });
    } catch (err) {
      setLocalLoading(false);
      setError(err?.message || 'Invalid credentials.');
    }
  };

  const handleLampToggle = () => {
    if (!lampOn) {
      setLampOn(true);
      setTimeout(() => setFormVisible(true), 250);
    } else {
      setFormVisible(false);
      setTimeout(() => setLampOn(false), 450);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#020617', position: 'relative', overflow: 'hidden' }}>

      {/* ── Lamp panel: full-screen → slides to left 40% when form reveals ── */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: formVisible ? '40%' : '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'width 0.9s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 2,
      }}>
        <DeskLamp on={lampOn} onToggle={handleLampToggle} />
      </div>

      {/* ── Divider glow when lamp is on ── */}
      {lampOn && (
        <div style={{
          position: 'absolute', top: 0, bottom: 0,
          left: formVisible ? '40%' : '100%',
          width: 1,
          background: 'linear-gradient(to bottom, transparent, rgba(255,210,60,0.25), transparent)',
          transition: 'left 0.9s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease',
          opacity: formVisible ? 1 : 0,
          zIndex: 3,
        }}/>
      )}

      {/* ── Form panel: hidden → slides in from right ── */}
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0,
        width: formVisible ? '60%' : '0%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: formVisible ? 1 : 0,
        transition: 'width 0.9s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.7s ease 0.45s',
        overflow: 'hidden',
        zIndex: 2,
      }}>
        <div style={{ width: '100%', maxWidth: 460, padding: '0 2.5rem' }}>

          {/* Branding */}
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 80, height: 80, borderRadius: 24, marginBottom: 20,
              background: 'linear-gradient(135deg, #06b6d4 0%, #7c3aed 100%)',
              boxShadow: '0 0 48px rgba(6,182,212,0.45), 0 0 80px rgba(124,58,237,0.2)',
            }}>
              <span className="font-orbitron font-black text-xl text-white tracking-tighter">HCL</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
              <HCLSoftwareWordmark textClassName="text-4xl text-white" />
              <h1 className="font-orbitron text-3xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">Learning Hub</h1>
            </div>
            <p style={{ color: '#64748b', fontSize: 14 }}>HCL Software · Gamified Learning Across all Technology Tracks</p>
          </div>

          {/* Card */}
          <div style={{
            borderRadius: 16, padding: '2rem',
            background: 'rgba(3,10,20,0.88)',
            border: '1px solid rgba(6,182,212,0.2)',
            boxShadow: '0 0 40px rgba(6,182,212,0.07)',
            backdropFilter: 'blur(14px)',
          }}>
            <h2 className="font-bold text-white text-xl mb-1">Welcome</h2>
            <p className="text-slate-500 text-sm mb-7">Sign in with your HCL software account.</p>

            <div className="space-y-4">
              {cfgLoading ? (
                <div className="flex items-center justify-center py-6 gap-3">
                  <div className="w-5 h-5 border-2 border-white/20 border-t-cyan-400 rounded-full animate-spin"/>
                  <span className="text-slate-500 text-sm">Loading configuration…</span>
                </div>
              ) : (
                <>
                  <button onClick={handleOidcLogin} disabled={ssoLoading || !ssoEnabled}
                    className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90 active:scale-95 flex items-center justify-center gap-2"
                    style={{ background: (!ssoEnabled||ssoLoading) ? 'rgba(6,182,212,0.3)' : 'linear-gradient(135deg, #06b6d4 0%, #7c3aed 100%)', boxShadow: (!ssoEnabled||ssoLoading) ? 'none' : '0 0 24px rgba(6,182,212,0.35)' }}>
                    {ssoLoading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Redirecting to HCL Okta…</>
                     : <><svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" opacity=".3"/><path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm0 18a8 8 0 110-16 8 8 0 010 16zm-1-5h2V8h-2v7zm0 4h2v-2h-2v2z"/></svg>Sign in with HCL SSO</>
                    }
                  </button>

                  {!ssoEnabled && (
                    <p className="text-amber-400/80 text-xs text-center bg-amber-500/10 rounded-lg px-3 py-2 border border-amber-500/20">
                      ⚠ SSO not configured — go to <strong>Admin → Authentication Realm</strong> to set up Okta
                    </p>
                  )}

                  {error && (
                    <p className="text-red-400 text-xs flex items-center gap-1.5 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">
                      <span>⚠</span> {error}
                    </p>
                  )}

                  <button onClick={() => { setShowLocal(v => !v); setError(''); }}
                    className="w-full text-center text-[10px] text-slate-600 hover:text-slate-400 tracking-widest uppercase transition-colors py-1">
                    {showLocal ? '▲ Hide' : '▼ Local account login'}
                  </button>

                  {showLocal && (
                    <form onSubmit={handleLocalLogin} className="space-y-3 pt-1">
                      <input value={localEmail} type="email" placeholder="Email address"
                        onChange={e => { setLocalEmail(e.target.value); setError(''); }}
                        className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none"
                        style={iStyle} onFocus={iFocus} onBlur={iBlur}/>
                      <div className="relative">
                        <input value={localPass} type={showPass ? 'text' : 'password'} placeholder="Password"
                          onChange={e => { setLocalPass(e.target.value); setError(''); }}
                          className="w-full rounded-xl pl-4 pr-11 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none"
                          style={iStyle} onFocus={iFocus} onBlur={iBlur}/>
                        <button type="button" onClick={() => setShowPass(v => !v)}
                          aria-label={showPass ? 'Hide password' : 'Show password'}
                          aria-pressed={showPass}
                          className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-500 hover:text-cyan-400 transition-colors focus:outline-none">
                          {showPass ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                        </button>
                      </div>
                      <button type="submit" disabled={localLoading}
                        className="w-full py-2.5 rounded-xl font-bold text-white text-sm hover:opacity-90 flex items-center justify-center gap-2"
                        style={{ background: localLoading ? 'rgba(6,182,212,0.3)' : 'rgba(6,182,212,0.25)', border: '1px solid rgba(6,182,212,0.4)' }}>
                        {localLoading ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Signing in…</> : 'Sign in with Local Account'}
                      </button>
                    </form>
                  )}
                </>
              )}
            </div>
          </div>

          <p style={{ textAlign: 'center', color: '#334155', fontSize: 12, marginTop: 24, lineHeight: 1.6 }}>
            Covering AI, Kubernetes, AWS, GCP, Azure, OpenShift, MCP, Observability &amp; DevOps Loop.
          </p>
        </div>
      </div>
    </div>
  );
}
