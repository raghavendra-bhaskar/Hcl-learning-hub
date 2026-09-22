import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { OktaAuth } from '@okta/okta-auth-js';
import { api, storeToken, clearToken } from '../lib/api.js';
import { useAppStore } from '../App.jsx';

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
  const [localLoading, setLocalLoading] = useState(false);

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

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Branding */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-5"
            style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #7c3aed 100%)', boxShadow: '0 0 48px rgba(6,182,212,0.45), 0 0 80px rgba(124,58,237,0.2)' }}>
            <span className="font-orbitron font-black text-xl text-white tracking-tighter">HCL</span>
          </div>
          <h1 className="font-orbitron text-3xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent mb-2">
            Software Learning Hub
          </h1>
          <p className="text-slate-500 text-sm">HCL Software · Gamified Learning Across all Technology Tracks</p>
        </div>

        {/* Main card */}
        <div className="rounded-2xl p-8"
          style={{ background: 'rgba(3,10,20,0.85)', border: '1px solid rgba(6,182,212,0.2)', boxShadow: '0 0 40px rgba(6,182,212,0.06)', backdropFilter: 'blur(12px)' }}>
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
                {/* SSO button */}
                <button onClick={handleOidcLogin} disabled={ssoLoading || !ssoEnabled}
                  className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90 active:scale-95 flex items-center justify-center gap-2"
                  style={{ background: (!ssoEnabled||ssoLoading) ? 'rgba(6,182,212,0.3)' : 'linear-gradient(135deg, #06b6d4 0%, #7c3aed 100%)', boxShadow: (!ssoEnabled||ssoLoading) ? 'none' : '0 0 24px rgba(6,182,212,0.35)' }}>
                  {ssoLoading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Redirecting to HCL Okta…</>
                   : <><svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" opacity=".3"/><path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm0 18a8 8 0 110-16 8 8 0 010 16zm-1-5h2V8h-2v7zm0 4h2v-2h-2v2z"/></svg>Sign in with HCL SSO</>}
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

                {/* Local account toggle */}
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
                    <input value={localPass} type="password" placeholder="Password"
                      onChange={e => { setLocalPass(e.target.value); setError(''); }}
                      className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none"
                      style={iStyle} onFocus={iFocus} onBlur={iBlur}/>
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

        <p className="text-center text-slate-700 text-xs mt-6 leading-relaxed">
          Covering AI, Kubernetes, AWS, GCP, Azure, OpenShift, MCP, Observability & DevOps Loop.
        </p>
      </div>
    </div>
  );
}
