import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OktaAuth } from '@okta/okta-auth-js';
import { storeToken, api } from '../lib/api.js';
import { useAppStore } from '../App.jsx';

const AUTH_KEY = 'hcl-quest-auth';

export default function LoginCallback() {
  const navigate = useNavigate();
  const { setAvatar, setPlayerName } = useAppStore();
  const exchangedRef = useRef(false);
  const [error, setError]   = useState('');
  const [status, setStatus] = useState('Completing HCL SSO sign-in…');

  useEffect(() => {
    if (exchangedRef.current) return;
    exchangedRef.current = true;
    (async () => {
      try {
        setStatus('Loading OIDC configuration…');
        const cfg = await api.get('/oidc-config').catch(() => null);
        if (!cfg?.issuer || !cfg?.clientId) throw new Error('OIDC not configured on server.');

        const avatarStored = (() => {
          try { return !!JSON.parse(localStorage.getItem('ai-quest-progress') || '{}')?.avatar; }
          catch { return false; }
        })();

        if (cfg.confidential) {
          // ── Confidential client: backend handles code exchange with client secret ──
          const params   = new URLSearchParams(window.location.search);
          const code     = params.get('code');
          const errParam = params.get('error');
          const errDesc  = params.get('error_description');

          if (errParam) throw new Error(errDesc || errParam);
          if (!code) throw new Error('No authorization code returned from Okta.');

          setStatus('Completing HCL SSO sign-in…');
          const result = await api.post('/auth/okta/callback', {
            code,
            redirectUri: `${window.location.origin}/login/callback`,
          });

          storeToken(result.token);

          const groups = Array.isArray(result.claims?.groups) ? result.claims.groups : [];
          localStorage.setItem(AUTH_KEY, JSON.stringify({
            isLoggedIn:         true,
            source:             'okta',
            name:               result.user?.name  || result.claims?.name  || '',
            email:              result.user?.email || result.claims?.email || '',
            role:               result.user?.role  || 'USER',
            sub:                result.claims?.sub || '',
            groups,
            endSessionEndpoint: cfg.endSessionEndpoint || '',
            oktaIdToken:        result.oktaIdToken  || '',
            loginAt:            Date.now(),
            hasAvatar:          !!result.user?.hasAvatar,
          }));

          try {
            const me = await api.get('/me');
            const ad = me?.avatarData;
            if (ad?.avatar) { setAvatar(ad.avatar); if (ad.playerName) setPlayerName(ad.playerName); }
          } catch {}

          navigate(result.user?.hasAvatar ? '/courses' : '/avatar', { replace: true });

        } else {
          // ── Public client: PKCE flow — browser exchanges code directly ──
          const oktaAuth = new OktaAuth({
            issuer:               cfg.issuer,
            clientId:             cfg.clientId,
            redirectUri:          `${window.location.origin}/login/callback`,
            postLogoutRedirectUri:`${window.location.origin}/login`,
            scopes:               (cfg.scopes || 'openid profile email').split(/\s+/).filter(Boolean),
            pkce:                 true,
            responseMode:         'query',
            tokenManager:         { storage: 'localStorage' },
          });

          setStatus('Verifying identity with Okta…');
          const { tokens } = await oktaAuth.token.parseFromUrl();
          oktaAuth.tokenManager.setTokens(tokens);
          const claims = tokens?.idToken?.claims;
          if (!claims) throw new Error('No ID token claims received from Okta.');

          const rawIdToken = tokens?.idToken?.idToken;
          storeToken(rawIdToken);

          setStatus('Fetching your profile…');
          let dbRole = 'USER', hasAvatarInDb = false;
          try {
            const me = await api.get('/me');
            dbRole       = me?.role      ?? 'USER';
            hasAvatarInDb = !!me?.hasAvatar;
            const ad = me?.avatarData;
            if (ad?.avatar) { setAvatar(ad.avatar); if (ad.playerName) setPlayerName(ad.playerName); }
          } catch {}

          const groups = Array.isArray(claims.groups) ? claims.groups : [];
          localStorage.setItem(AUTH_KEY, JSON.stringify({
            isLoggedIn:         true,
            source:             'okta',
            name:               claims.name || claims.preferred_username || claims.email || 'Commander',
            email:              claims.email || '',
            role:               dbRole,
            sub:                claims.sub || '',
            groups,
            endSessionEndpoint: cfg.endSessionEndpoint || '',
            hasAvatar:          hasAvatarInDb,
            loginAt:            Date.now(),
          }));

          navigate(hasAvatarInDb ? '/courses' : '/avatar', { replace: true });
        }
      } catch (err) {
        console.error('[okta] callback failed:', err);
        const detail = err?.body?.detail;
        setError((err?.message || 'Sign-in failed.') + (detail ? ` — ${detail}` : ''));
      }
    })();
  }, [navigate, setAvatar, setPlayerName]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {error ? (
          <>
            <div className="text-4xl mb-4">⚠️</div>
            <h1 className="font-orbitron text-xl font-bold text-white mb-2">Sign-in failed</h1>
            <p className="text-red-400 text-sm mb-6">{error}</p>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="px-6 py-2.5 rounded-xl font-bold text-white text-sm bg-gradient-to-r from-cyan-500 to-violet-500 hover:opacity-90"
            >
              Back to login
            </button>
          </>
        ) : (
          <>
            <div className="w-12 h-12 mx-auto mb-4 border-2 border-white/20 border-t-cyan-400 rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">{status}</p>
          </>
        )}
      </div>
    </div>
  );
}
