import { ExternalLink, GraduationCap, Terminal } from 'lucide-react';
import { getAuth } from '../pages/LoginPage.jsx';

export function buildHandoffUrl(url, metadata = {}) {
  const auth = getAuth();
  const identity = {
    learnerId: auth?.sub || auth?.email || '',
    learnerEmail: auth?.email || '',
    learnerName: auth?.name || '',
    managerId: auth?.managerId || '',
    managerEmail: auth?.managerEmail || '',
    ...metadata,
  };

  try {
    const target = new URL(url, window.location.origin);
    Object.entries(identity).forEach(([key, value]) => {
      if (value) target.searchParams.set(key, value);
    });
    return target.toString();
  } catch {
    return url;
  }
}

const ACCENTS = {
  cyan:     { ring: 'rgba(6,182,212,0.45)',  glow: 'rgba(6,182,212,0.15)',  text: '#67e8f9', chip: '#0e7490' },
  teal:     { ring: 'rgba(20,184,166,0.45)', glow: 'rgba(20,184,166,0.15)', text: '#5eead4', chip: '#0f766e' },
  emerald:  { ring: 'rgba(16,185,129,0.45)', glow: 'rgba(16,185,129,0.15)', text: '#6ee7b7', chip: '#047857' },
  violet:   { ring: 'rgba(139,92,246,0.45)', glow: 'rgba(139,92,246,0.15)', text: '#c4b5fd', chip: '#6d28d9' },
  fuchsia:  { ring: 'rgba(217,70,239,0.45)', glow: 'rgba(217,70,239,0.15)', text: '#f0abfc', chip: '#a21caf' },
  orange:   { ring: 'rgba(249,115,22,0.45)', glow: 'rgba(249,115,22,0.15)', text: '#fdba74', chip: '#c2410c' },
};

export function CertificationPanel({ certification, moduleAccent = 'cyan' }) {
  if (!certification) return null;
  return (
    <div className="glass-card rounded-3xl p-6 md:p-7 border border-white/5">
      <div className="flex items-start gap-4 mb-5">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: ACCENTS[moduleAccent].glow, border: `1px solid ${ACCENTS[moduleAccent].ring}` }}>
          <GraduationCap size={22} style={{ color: ACCENTS[moduleAccent].text }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-orbitron font-bold text-white text-lg">{certification.title}</h3>
          <p className="text-slate-400 text-xs mt-0.5">{certification.subtitle}</p>
        </div>
        <a
          href={buildHandoffUrl(certification.catalogUrl, { handoffType: 'certification-catalog', certificationId: certification.id })}
          target="_blank" rel="noopener noreferrer"
          className="hidden md:inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          Open catalog <ExternalLink size={12} />
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {certification.tracks.map((t) => {
          const a = ACCENTS[t.accent] || ACCENTS.cyan;
          return (
            <a
              key={t.level}
              href={buildHandoffUrl(t.enrolUrl, { handoffType: 'certification-assignment', certificationId: certification.id, certificationLevel: t.level })}
              target="_blank" rel="noopener noreferrer"
              className="group block rounded-2xl p-4 transition-all hover:-translate-y-0.5"
              style={{ background: a.glow, border: `1px solid ${a.ring}`, boxShadow: `0 0 24px ${a.glow}` }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black tracking-widest uppercase" style={{ color: a.text }}>
                  {t.level}
                </span>
                <ExternalLink size={12} className="text-slate-400 group-hover:text-white transition-colors" />
              </div>
              <p className="text-sm text-slate-200 leading-snug">{t.description}</p>
              <div className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold text-white px-2 py-1 rounded-md"
                style={{ background: a.chip }}>
                Enrol in CNAPP LMS
              </div>
            </a>
          );
        })}
      </div>

      <p className="text-[11px] text-slate-500 mt-4 leading-relaxed">
        Opens in a new tab. You may be asked to sign in to CNAPP separately.
      </p>
    </div>
  );
}

export function LabLaunchCard({ lab, accent = 'orange' }) {
  if (!lab) return null;
  const a = ACCENTS[accent] || ACCENTS.orange;
  return (
    <a
      href={buildHandoffUrl(lab.url, { handoffType: 'lab', labId: lab.id || lab.title })}
      target="_blank" rel="noopener noreferrer"
      className="group flex items-center gap-4 rounded-2xl p-4 transition-all hover:-translate-y-0.5"
      style={{ background: a.glow, border: `1px solid ${a.ring}` }}
    >
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(0,0,0,0.35)', border: `1px solid ${a.ring}` }}>
        <Terminal size={20} style={{ color: a.text }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black tracking-widest uppercase" style={{ color: a.text }}>
            Hands-on Lab
          </span>
          {lab.duration && (
            <span className="text-[10px] text-slate-500">· {lab.duration}</span>
          )}
        </div>
        <p className="text-sm font-semibold text-white mt-0.5 truncate">{lab.title}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">Launches in CNAPP · new tab</p>
      </div>
      <ExternalLink size={16} className="text-slate-400 group-hover:text-white transition-colors" />
    </a>
  );
}
