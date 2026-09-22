import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronRight, Play, ExternalLink, X, BookOpen, Layers } from 'lucide-react';
import { DEVOPS_LEARNING_PATH_NOTE, DEVOPS_LEARNING_PATH_WEEKS } from '../data/devopsLearningPath.js';

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

function VideoModal({ video, onClose }) {
  if (!video) return null;
  const embedUrl = video.embedUrl;
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-3xl rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(249,115,22,0.3)' }}>
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ background: 'rgba(8,18,32,0.98)' }}
        >
          <span className="text-white text-xs font-semibold truncate pr-4">{video.label}</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors flex-shrink-0">
            <X size={16} />
          </button>
        </div>
        {embedUrl ? (
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <iframe
              className="absolute inset-0 w-full h-full"
              src={embedUrl}
              title={video.label}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center gap-4 py-12"
            style={{ background: 'rgba(8,18,32,0.98)' }}
          >
            <p className="text-slate-400 text-sm">Opens on YouTube</p>
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white"
              style={{ background: '#ef4444' }}
            >
              <Play size={15} fill="white" /> Open on YouTube
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DevOpsLearningPath() {
  const navigate = useNavigate();
  const [openMods, setOpenMods] = useState({ 'devops-mod-1': true });
  const [video, setVideo] = useState(null);
  const [showNote, setShowNote] = useState(true);

  const toggleMod = id => setOpenMods(p => ({ ...p, [id]: !p[id] }));

  return (
    <div className="min-h-screen pb-24">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 backdrop-blur-md border-b border-white/5"
        style={{ background: 'rgba(3,10,20,0.88)' }}
      >
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate('/devops-loop')}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={14} />
            DevOps Loop
          </button>
          <span className="text-slate-700">/</span>
          <span className="text-xs text-orange-400 font-semibold">Learning Path</span>
        </div>
      </header>

      {/* ── Title ───────────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 pt-10 pb-6">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)' }}
          >
            📚
          </div>
          <div>
            <h1 className="font-orbitron text-2xl font-bold text-white">DevOps Loop Learning Path</h1>
            <p className="text-orange-400 text-xs font-semibold mt-0.5">
              IBM DevOps Loop Practitioner Guide · 4 Weeks · 8 Modules
            </p>
          </div>
        </div>
      </div>

      {/* ── Note ────────────────────────────────────────────────────────────── */}
      {showNote && (
        <div className="max-w-4xl mx-auto px-4 mb-8">
          <div
            className="rounded-2xl p-6 relative"
            style={{
              background: 'linear-gradient(135deg, rgba(249,115,22,0.07), rgba(239,68,68,0.04))',
              border: '1px solid rgba(249,115,22,0.2)',
            }}
          >
            <button
              onClick={() => setShowNote(false)}
              className="absolute top-4 right-4 text-slate-600 hover:text-slate-400 transition-colors"
            >
              <X size={14} />
            </button>
            <h3 className="font-orbitron text-sm font-bold text-white mb-4">{DEVOPS_LEARNING_PATH_NOTE.title}</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {DEVOPS_LEARNING_PATH_NOTE.points.map((pt, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-xl flex-shrink-0 mt-0.5">{pt.icon}</span>
                  <div>
                    <p className="text-white text-xs font-semibold mb-0.5">{pt.title}</p>
                    <p className="text-slate-500 text-[11px] leading-relaxed">{pt.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Weeks & Modules ─────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 space-y-10">
        {DEVOPS_LEARNING_PATH_WEEKS.map(week => (
          <section key={week.week}>
            {/* Week label */}
            <div className="flex items-center gap-4 mb-5">
              <div
                className="px-3 py-1 rounded-lg text-xs font-bold font-orbitron tracking-wider"
                style={{ background: 'rgba(249,115,22,0.12)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.25)' }}
              >
                {week.label}
              </div>
              <div className="flex-1 h-px" style={{ background: 'rgba(249,115,22,0.12)' }} />
              <span className="text-slate-600 text-xs font-semibold">{week.theme}</span>
            </div>

            {/* Modules */}
            <div className="space-y-4">
              {week.modules.map(mod => {
                const isOpen = !!openMods[mod.id];
                return (
                  <div
                    key={mod.id}
                    className="rounded-2xl border overflow-hidden"
                    style={{
                      border: isOpen ? `1px solid ${mod.color}35` : '1px solid rgba(255,255,255,0.07)',
                      background: isOpen ? mod.color + '06' : 'rgba(255,255,255,0.02)',
                    }}
                  >
                    {/* Module header */}
                    <button
                      onClick={() => toggleMod(mod.id)}
                      className="w-full flex items-center gap-4 px-5 py-4 text-left"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{ background: mod.color + '18', border: `1px solid ${mod.color}30` }}
                      >
                        {mod.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-[10px] font-bold tracking-widest uppercase mb-0.5"
                          style={{ color: mod.color }}
                        >
                          Module {mod.number}
                        </div>
                        <div className="text-white font-bold text-sm">{mod.title}</div>
                        <div className="text-slate-600 text-xs mt-0.5">
                          {mod.topics.length} topics · {mod.resources.length} resources
                        </div>
                      </div>
                      <ChevronDown
                        size={16}
                        className="text-slate-600 flex-shrink-0 transition-transform"
                        style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      />
                    </button>

                    {/* Module body */}
                    {isOpen && (
                      <div className="px-5 pb-5 border-t border-white/5">
                        <div className="grid md:grid-cols-2 gap-6 pt-4">
                          {/* Topics */}
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <Layers size={13} style={{ color: mod.color }} />
                              <span className="text-xs font-bold text-slate-300">Topics Covered</span>
                            </div>
                            <ul className="space-y-2">
                              {mod.topics.map((t, ti) => (
                                <li key={ti} className="flex items-start gap-2 text-xs text-slate-400">
                                  <span
                                    className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full"
                                    style={{ background: mod.color + 'aa' }}
                                  />
                                  <span className="leading-relaxed">{t}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Resources */}
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <BookOpen size={13} style={{ color: mod.color }} />
                              <span className="text-xs font-bold text-slate-300">Resources</span>
                            </div>
                            <div className="space-y-2">
                              {mod.resources.map((res, ri) => (
                                <ResourceButton key={ri} res={res} onVideo={setVideo} />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Video Modal */}
      {video && <VideoModal video={video} onClose={() => setVideo(null)} />}
    </div>
  );
}
