import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronRight, Play, ExternalLink, X, BookOpen, Layers } from 'lucide-react';
import { LEARNING_PATH_NOTE, LEARNING_PATH_WEEKS } from '../data/learningPath.js';

// ── helpers ──────────────────────────────────────────────────────────────────
function getEmbedUrl(url) {
  if (!url) return null;
  const m = url.match(/youtube\.com\/watch\?v=([^&]+)/);
  return m ? `https://www.youtube.com/embed/${m[1]}?autoplay=1` : null;
}

const TYPE_META = {
  video:    { icon: '▶',  label: 'Video',     color: '#ef4444', bg: 'rgba(239,68,68,0.15)'   },
  playlist: { icon: '▶',  label: 'YouTube',   color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   },
  read:     { icon: '📖', label: 'Read',      color: '#22d3ee', bg: 'rgba(34,211,238,0.12)'  },
  udemy:    { icon: '🎓', label: 'Udemy',     color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  oreilly:  { icon: '📕', label: "O'Reilly",  color: '#d97706', bg: 'rgba(217,119,6,0.12)'   },
  chapter:  { icon: '📚', label: 'Chapter',   color: '#94a3b8', bg: 'rgba(148,163,184,0.08)' },
  workshop: { icon: '🛠️', label: 'Workshop',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
};

// ── ResourceButton ────────────────────────────────────────────────────────────
function ResourceButton({ res, onVideo }) {
  const meta = TYPE_META[res.type] || TYPE_META.read;
  const embedUrl = getEmbedUrl(res.url);
  const isEmbeddable = res.type === 'video' && embedUrl;
  const isSearchable = res.type === 'playlist' && res.url;
  const noLink = !res.url;

  const handleClick = () => {
    if (isEmbeddable || isSearchable) {
      onVideo({ label: res.label, url: res.url, embedUrl });
    } else if (res.url) {
      window.open(res.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <button
      onClick={noLink ? undefined : handleClick}
      disabled={noLink}
      className="flex items-start gap-3 w-full text-left px-3.5 py-3 rounded-lg text-xs transition-all active:scale-95"
      style={{
        background: noLink ? 'rgba(255,255,255,0.03)' : meta.bg,
        border: `1px solid ${noLink ? 'rgba(255,255,255,0.06)' : meta.color + '30'}`,
        color: noLink ? '#64748b' : meta.color,
        cursor: noLink ? 'default' : 'pointer',
        opacity: noLink ? 0.7 : 1,
      }}
    >
      <span className="flex-shrink-0 mt-0.5 text-sm">{meta.icon}</span>
      <span className="flex-1 leading-relaxed font-medium" style={{ color: noLink ? '#64748b' : '#e2e8f0' }}>
        {res.label}
        {noLink && <span className="ml-2 text-[10px]" style={{ color: meta.color }}>(TBD)</span>}
      </span>
      {!noLink && (
        <span className="flex-shrink-0 mt-0.5 text-[10px] font-bold tracking-wider" style={{ color: meta.color }}>
          {isEmbeddable ? 'PLAY' : isSearchable ? 'YT' : '↗'}
        </span>
      )}
    </button>
  );
}

// ── ModuleCard ────────────────────────────────────────────────────────────────
function ModuleCard({ mod, onVideo }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{ border: `1px solid ${mod.color}25`, background: 'rgba(3,10,20,0.7)' }}
    >
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left transition-all hover:bg-white/[0.03]"
      >
        {/* Number badge */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0"
          style={{ background: mod.color + '22', border: `1px solid ${mod.color}55`, color: mod.color }}
        >
          {mod.number}
        </div>

        {/* Icon + title */}
        <div className="text-2xl flex-shrink-0">{mod.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm">{mod.title}</span>
            {mod.optional && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                OPTIONAL
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {mod.topics.length} topics · {mod.resources.length} resources
          </div>
        </div>

        {/* Chevron */}
        <ChevronDown
          size={16}
          className="flex-shrink-0 text-slate-500 transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {/* Expanded body */}
      {open && (
        <div className="px-5 pb-5 border-t" style={{ borderColor: mod.color + '20' }}>
          {/* Topics */}
          <div className="pt-4 mb-4">
            <p className="text-[10px] font-bold tracking-widest text-slate-500 mb-3 uppercase">Topics Covered</p>
            <ul className="space-y-2">
              {mod.topics.map((t, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
                  <span className="mt-0.5 w-4 h-4 rounded flex items-center justify-center flex-shrink-0 text-[9px] font-black"
                    style={{ background: mod.color + '22', color: mod.color }}>
                    {i + 1}
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <p className="text-[10px] font-bold tracking-widest text-slate-500 mb-3 uppercase">Learning Resources</p>
            <div className="space-y-2">
              {mod.resources.map((res, i) => (
                <ResourceButton key={i} res={res} onVideo={onVideo} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── VideoModal ────────────────────────────────────────────────────────────────
function VideoModal({ info, onClose }) {
  if (!info) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl rounded-2xl overflow-hidden"
        style={{ border: '1px solid rgba(6,182,212,0.3)', background: '#030e18' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: '1px solid rgba(6,182,212,0.15)', background: 'rgba(6,182,212,0.05)' }}>
          <span className="text-xs font-bold tracking-widest text-cyan-400" style={{ fontFamily: "'Courier New', monospace" }}>
            ▶ {info.label}
          </span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-white font-black text-sm transition-all hover:scale-110"
            style={{ background: 'rgba(6,182,212,0.7)', border: '1px solid rgba(6,182,212,0.5)' }}
          >
            ✕
          </button>
        </div>

        {/* Video or search card */}
        {info.embedUrl ? (
          <div className="relative" style={{ paddingTop: '56.25%' }}>
            <iframe
              key={info.embedUrl}
              src={info.embedUrl}
              className="absolute inset-0 w-full h-full"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              title={info.label}
              style={{ border: 'none' }}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-6 py-16 px-8 text-center">
            <div className="text-6xl">🎬</div>
            <div>
              <p className="text-white font-bold text-lg mb-2">{info.label}</p>
              <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
                YouTube search results can't be embedded directly. Click below to open curated search results on YouTube.
              </p>
            </div>
            <button
              onClick={() => window.open(info.url, '_blank', 'noopener,noreferrer')}
              className="flex items-center gap-3 px-8 py-3 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg,#dc2626,#991b1b)', boxShadow: '0 0 20px rgba(220,38,38,0.35)' }}
            >
              <span className="text-xl">▶</span> Open on YouTube
            </button>
            <button onClick={onClose} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              ← Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main LearningPath page ────────────────────────────────────────────────────
export default function LearningPath() {
  const navigate = useNavigate();
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [showNote, setShowNote] = useState(true);
  const [videoModal, setVideoModal] = useState(null);

  const week = LEARNING_PATH_WEEKS[selectedWeek];

  return (
    <div className="min-h-screen pb-20">
      <VideoModal info={videoModal} onClose={() => setVideoModal(null)} />

      {/* ── TOP BAR ── */}
      <div
        className="sticky top-0 z-40 flex items-center gap-4 px-4 py-3"
        style={{
          background: 'rgba(3,6,12,0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(6,182,212,0.15)',
        }}
      >
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft size={14} /> Home
        </button>

        <div className="flex-1 text-center">
          <p className="text-[11px] font-bold tracking-widest text-cyan-500 uppercase" style={{ fontFamily: "'Courier New', monospace" }}>
            AI Enablement Series
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <Layers size={12} className="text-cyan-500" />
          <span className="text-[11px] text-slate-500">6 Weeks · 9 Modules</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4">

        {/* ── HERO HEADER ── */}
        <div className="pt-10 pb-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-xs font-bold mb-5 tracking-widest uppercase">
            <BookOpen size={12} /> AI Transformation Learning Path
          </div>
          <h1 className="font-orbitron text-3xl md:text-4xl font-black mb-4 leading-tight">
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
              AI Transformation:
            </span>
            <br />
            <span className="text-white text-2xl md:text-3xl">From Foundations to Intelligent Automation</span>
          </h1>
          <p className="text-slate-400 text-sm max-w-2xl mx-auto leading-relaxed">
            A 6-week strategic roadmap designed for HCL Software Support teams to master Generative AI,
            automation, and modern development practices.
          </p>
        </div>

        {/* ── NOTE BEFORE YOU START ── */}
        <div
          className="rounded-2xl mb-8 overflow-hidden"
          style={{ border: '1px solid rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.04)' }}
        >
          <button
            className="w-full flex items-center justify-between px-5 py-4 text-left"
            onClick={() => setShowNote(n => !n)}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">📋</span>
              <div>
                <p className="font-bold text-amber-400 text-sm">{LEARNING_PATH_NOTE.title}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Read before starting your journey</p>
              </div>
            </div>
            <ChevronDown
              size={16}
              className="text-amber-400 transition-transform"
              style={{ transform: showNote ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </button>

          {showNote && (
            <div className="grid md:grid-cols-2 gap-3 px-5 pb-5 pt-1 border-t" style={{ borderColor: 'rgba(245,158,11,0.2)' }}>
              {LEARNING_PATH_NOTE.points.map((p, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.06)' }}>
                  <span className="text-xl flex-shrink-0">{p.icon}</span>
                  <div>
                    <p className="font-bold text-amber-300 text-xs mb-1">{p.title}</p>
                    <p className="text-slate-400 text-xs leading-relaxed">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── WEEK SELECTOR TABS ── */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {LEARNING_PATH_WEEKS.map((w, i) => (
            <button
              key={w.week}
              onClick={() => setSelectedWeek(i)}
              className="flex-shrink-0 flex flex-col items-center gap-1 px-5 py-3 rounded-xl font-bold text-xs transition-all"
              style={{
                background: selectedWeek === i ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${selectedWeek === i ? 'rgba(6,182,212,0.5)' : 'rgba(255,255,255,0.08)'}`,
                color: selectedWeek === i ? '#22d3ee' : '#64748b',
                boxShadow: selectedWeek === i ? '0 0 16px rgba(6,182,212,0.2)' : 'none',
              }}
            >
              <span className="font-orbitron text-base font-black">{w.label}</span>
              <span className="text-[10px] tracking-wider opacity-80">{w.theme}</span>
            </button>
          ))}
        </div>

        {/* ── WEEK HEADER ── */}
        <div
          className="flex items-center gap-4 px-5 py-4 rounded-xl mb-6"
          style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)' }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center font-orbitron font-black text-lg text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.4), rgba(99,102,241,0.4))', border: '1px solid rgba(6,182,212,0.4)' }}
          >
            W{week.week}
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-0.5">Now Learning</p>
            <p className="font-bold text-white text-lg">{week.label} — {week.theme}</p>
            <p className="text-xs text-slate-500">{week.modules.length} module{week.modules.length > 1 ? 's' : ''} · click any module to expand</p>
          </div>
        </div>

        {/* ── MODULE CARDS ── */}
        <div className="space-y-3">
          {week.modules.map(mod => (
            <ModuleCard key={mod.id} mod={mod} onVideo={setVideoModal} />
          ))}
        </div>

        {/* ── WEEK NAVIGATION ── */}
        <div className="flex justify-between items-center mt-8 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => setSelectedWeek(w => Math.max(0, w - 1))}
            disabled={selectedWeek === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-30 hover:bg-white/5"
            style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}
          >
            ← Previous Week
          </button>
          <span className="text-xs text-slate-600">
            {selectedWeek + 1} / {LEARNING_PATH_WEEKS.length}
          </span>
          <button
            onClick={() => setSelectedWeek(w => Math.min(LEARNING_PATH_WEEKS.length - 1, w + 1))}
            disabled={selectedWeek === LEARNING_PATH_WEEKS.length - 1}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-30 hover:bg-cyan-500/10"
            style={{ border: '1px solid rgba(6,182,212,0.3)', color: '#22d3ee' }}
          >
            Next Week →
          </button>
        </div>
      </div>
    </div>
  );
}
