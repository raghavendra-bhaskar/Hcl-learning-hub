import { Mail, Send, Copy, Check } from 'lucide-react';
import { useState } from 'react';

// Builds a mailto: URL with a pre-filled progress report so learners can share
// their standing with their manager without a backend. Ships two actions:
// "Send email" (native mailto) and "Copy summary" (clipboard).
export default function ShareWithManager({
  playerName,
  managerEmail,
  totalXP,
  levelInfo,
  completedCount,
  badgeCount,
  moduleLabel = 'HCL Software Learning Hub',
  extraLines = [],
  accent = 'cyan',
}) {
  const [copied, setCopied] = useState(false);

  if (!managerEmail) return null;

  const subject = `${playerName || 'Learner'} — ${moduleLabel} progress update`;
  const bodyLines = [
    `Hi,`,
    ``,
    `Sharing my current progress on the ${moduleLabel}:`,
    ``,
    `• Commander:      ${playerName || '—'}`,
    `• Level:          ${levelInfo?.icon || ''} ${levelInfo?.title || '—'} (Level ${levelInfo?.level ?? '—'})`,
    `• Total XP:       ${totalXP?.toLocaleString?.() ?? totalXP ?? 0}`,
    `• Quests done:    ${completedCount ?? 0}`,
    `• Badges earned:  ${badgeCount ?? 0}`,
    ...extraLines.map(l => `• ${l}`),
    ``,
    `Live dashboard: ${typeof window !== 'undefined' ? window.location.origin : ''}`,
    ``,
    `Thanks,`,
    `${playerName || ''}`,
  ];
  const body = bodyLines.join('\n');
  const mailto = `mailto:${encodeURIComponent(managerEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — no-op */
    }
  };

  const accentMap = {
    cyan:   { ring: 'rgba(6,182,212,0.35)',  chip: '#0e7490', text: '#67e8f9' },
    orange: { ring: 'rgba(249,115,22,0.35)', chip: '#c2410c', text: '#fdba74' },
  };
  const a = accentMap[accent] || accentMap.cyan;

  return (
    <div className="rounded-2xl p-4 md:p-5"
      style={{ background: 'rgba(2,8,13,0.6)', border: `1px solid ${a.ring}` }}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(0,0,0,0.35)', border: `1px solid ${a.ring}` }}>
          <Mail size={16} style={{ color: a.text }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black tracking-widest uppercase" style={{ color: a.text }}>
            Share with your manager
          </p>
          <p className="text-sm text-white font-semibold truncate">{managerEmail}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Opens your mail client with an editable summary — nothing is sent automatically.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <a
          href={mailto}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95"
          style={{ background: a.chip }}
        >
          <Send size={13} />
          Send email
        </a>
        <button
          onClick={copySummary}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-slate-200 transition-all hover:bg-white/5 active:scale-95"
          style={{ border: '1px solid rgba(255,255,255,0.12)' }}
        >
          {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy summary'}
        </button>
      </div>
    </div>
  );
}
