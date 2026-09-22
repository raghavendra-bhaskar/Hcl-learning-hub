import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Play, X, BookOpen, Layers, Pencil } from 'lucide-react';
import { api } from '../lib/api.js';
import { getAuth } from './LoginPage.jsx';

const TYPE_META = {
  video:    { icon: '▶',  label: 'Video',        color: '#ef4444', bg: 'rgba(239,68,68,0.15)'   },
  youtube:  { icon: '▶',  label: 'YouTube',       color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   },
  playlist: { icon: '▶',  label: 'YouTube',       color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   },
  read:     { icon: '📖', label: 'Read',          color: '#22d3ee', bg: 'rgba(34,211,238,0.12)'  },
  udemy:    { icon: '🎓', label: 'Udemy',         color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  oreilly:  { icon: '📕', label: "O'Reilly",      color: '#d97706', bg: 'rgba(217,119,6,0.12)'   },
  product:  { icon: '📘', label: 'Product Docs',  color: '#0f62fe', bg: 'rgba(15,98,254,0.12)'   },
  chapter:  { icon: '📚', label: 'Chapter',       color: '#94a3b8', bg: 'rgba(148,163,184,0.08)' },
  workshop: { icon: '🛠️', label: 'Workshop',      color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  link:     { icon: '🔗', label: 'Link',          color: '#94a3b8', bg: 'rgba(148,163,184,0.08)' },
};

function getEmbedUrl(type, url) {
  if (!url) return null;
  if (type === 'youtube' || type === 'playlist' || type === 'video') {
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1`;
    if (url.includes('youtube.com/embed/')) return url.replace('?', '?autoplay=1&');
  }
  if (type === 'video' && (url.endsWith('.mp4') || url.includes('/videos/'))) return url;
  return null;
}

function ResourceButton({ res, onVideo }) {
  const meta = TYPE_META[res.type] || TYPE_META.link;
  const embedUrl = getEmbedUrl(res.type, res.url);
  const isEmbeddable = !!embedUrl;
  const noLink = !res.url;

  const handleClick = () => {
    if (isEmbeddable) { onVideo({ label: res.label, url: res.url, embedUrl }); }
    else if (res.url) { window.open(res.url, '_blank', 'noopener,noreferrer'); }
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
          {isEmbeddable ? 'PLAY' : '↗'}
        </span>
      )}
    </button>
  );
}

function VideoModal({ video, onClose }) {
  if (!video) return null;
  const isYT = video.embedUrl?.includes('youtube.com/embed');
  const isDirect = !isYT && video.embedUrl;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative w-full max-w-3xl rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ background: 'rgba(8,18,32,0.98)' }}>
          <span className="text-white text-xs font-semibold truncate pr-4">{video.label}</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors flex-shrink-0"><X size={16} /></button>
        </div>
        {video.embedUrl ? (
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            {isDirect ? (
              <video className="absolute inset-0 w-full h-full bg-black" src={video.embedUrl} controls autoPlay />
            ) : (
              <iframe className="absolute inset-0 w-full h-full" src={video.embedUrl} title={video.label}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 py-12" style={{ background: 'rgba(8,18,32,0.98)' }}>
            <p className="text-slate-400 text-sm">Opens in a new tab</p>
            <a href={video.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white" style={{ background: '#ef4444' }}>
              <Play size={15} fill="white" /> Open Link
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CoursePathPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const auth = getAuth();
  const isAdmin = auth?.role === 'ADMIN';

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openMods, setOpenMods] = useState({});
  const [video, setVideo] = useState(null);
  const [showNote, setShowNote] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const c = await api.get(`/courses-api/${slug}`);
        setCourse(c);
        if (c.weeks?.[0]?.modules?.[0]) {
          setOpenMods({ [c.weeks[0].modules[0].id]: true });
        }
      } catch (e) { setError(e?.message || 'Course not found'); }
      finally { setLoading(false); }
    })();
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white/20 border-t-cyan-400 rounded-full animate-spin" />
    </div>
  );

  if (error || !course) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-red-400">{error || 'Course not found'}</p>
      <button onClick={() => navigate('/courses')} className="text-cyan-400 hover:text-cyan-300 text-sm">← Course Hub</button>
    </div>
  );

  const accent = course.accentColor || '#06b6d4';
  const accentBg = { background: accent + '18', border: `1px solid ${accent}30`, color: accent };

  const toggleMod = id => setOpenMods(p => ({ ...p, [id]: !p[id] }));

  return (
    <div className="min-h-screen pb-24">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 backdrop-blur-md border-b border-white/5" style={{ background: 'rgba(3,10,20,0.88)' }}>
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(`/c/${slug}`)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={14} /> {course.title}
          </button>
          <span className="text-slate-700">/</span>
          <span className="text-xs font-semibold" style={{ color: accent }}>Learning Path</span>
          {isAdmin && (
            <button onClick={() => navigate(`/admin/courses/${course.id}/edit`)}
              className="ml-auto flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-cyan-400 border border-white/8 rounded-lg px-2.5 py-1">
              <Pencil size={11} /> Edit
            </button>
          )}
        </div>
      </header>

      {/* ── Title ───────────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 pt-10 pb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: accent + '18', border: `1px solid ${accent}30` }}>
            {course.emoji || '📚'}
          </div>
          <div>
            <h1 className="font-orbitron text-2xl font-bold text-white">{course.title} Learning Path</h1>
            <p className="text-xs font-semibold mt-0.5" style={{ color: accent }}>
              {course.weeks?.length || 0} Weeks · {course.weeks?.reduce((a, w) => a + (w.modules?.length || 0), 0) || 0} Modules
            </p>
          </div>
        </div>
      </div>

      {/* ── Description note ────────────────────────────────────────────────── */}
      {showNote && course.description && (
        <div className="max-w-4xl mx-auto px-4 mb-8">
          <div className="rounded-2xl p-6 relative"
            style={{ background: accent + '08', border: `1px solid ${accent}25` }}>
            <button onClick={() => setShowNote(false)}
              className="absolute top-4 right-4 text-slate-600 hover:text-slate-400">
              <X size={14} />
            </button>
            <h3 className="font-orbitron text-sm font-bold text-white mb-3">Welcome to {course.title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{course.description}</p>
          </div>
        </div>
      )}

      {/* ── Weeks & Modules ─────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 space-y-10">
        {course.weeks?.length === 0 && (
          <div className="glass-card rounded-2xl p-12 text-center">
            <p className="text-slate-500">No content added yet.</p>
            {isAdmin && (
              <button onClick={() => navigate(`/admin/courses/${course.id}/edit`)}
                className="mt-4 mx-auto flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#06b6d4,#7c3aed)' }}>
                <Pencil size={14} /> Add Content
              </button>
            )}
          </div>
        )}

        {course.weeks?.map(week => (
          <section key={week.id}>
            {/* Week label */}
            <div className="flex items-center gap-4 mb-5">
              <div className="px-3 py-1 rounded-lg text-xs font-bold font-orbitron tracking-wider" style={accentBg}>
                Week {week.weekNumber}
              </div>
              <div className="flex-1 h-px" style={{ background: accent + '20' }} />
              <span className="text-slate-600 text-xs font-semibold">{week.title}</span>
            </div>

            {/* Modules */}
            <div className="space-y-4">
              {week.modules?.map((mod, mi) => {
                const isOpen = !!openMods[mod.id];
                const modColor = mod.color || accent;
                return (
                  <div key={mod.id} className="rounded-2xl border overflow-hidden"
                    style={{
                      border: isOpen ? `1px solid ${modColor}35` : '1px solid rgba(255,255,255,0.07)',
                      background: isOpen ? modColor + '06' : 'rgba(255,255,255,0.02)',
                    }}>
                    <button onClick={() => toggleMod(mod.id)}
                      className="w-full flex items-center gap-4 px-5 py-4 text-left">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{ background: modColor + '18', border: `1px solid ${modColor}30` }}>
                        {mod.icon || '📖'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-bold tracking-widest uppercase mb-0.5" style={{ color: modColor }}>
                          Module {mod.number || mi + 1}
                        </div>
                        <div className="text-white font-bold text-sm">{mod.title}</div>
                        <div className="text-slate-600 text-xs mt-0.5">
                          {mod.topics?.length || 0} topics · {mod.resources?.length || 0} resources
                        </div>
                      </div>
                      <ChevronDown size={16} className="text-slate-600 flex-shrink-0 transition-transform"
                        style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-5 border-t border-white/5">
                        <div className="grid md:grid-cols-2 gap-6 pt-4">
                          {/* Topics */}
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <Layers size={13} style={{ color: modColor }} />
                              <span className="text-xs font-bold text-slate-300">Topics Covered</span>
                            </div>
                            {mod.topics?.length === 0
                              ? <p className="text-xs text-slate-700 italic">No topics yet</p>
                              : (
                                <ul className="space-y-2">
                                  {mod.topics.map(t => (
                                    <li key={t.id} className="flex items-start gap-2 text-xs text-slate-400">
                                      <span className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full"
                                        style={{ background: modColor + 'aa' }} />
                                      <span className="leading-relaxed">{t.content}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                          </div>

                          {/* Resources */}
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <BookOpen size={13} style={{ color: modColor }} />
                              <span className="text-xs font-bold text-slate-300">Resources</span>
                            </div>
                            {mod.resources?.length === 0
                              ? <p className="text-xs text-slate-700 italic">No resources yet</p>
                              : (
                                <div className="space-y-2">
                                  {mod.resources.map(res => (
                                    <ResourceButton key={res.id} res={res} onVideo={setVideo} />
                                  ))}
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {week.modules?.length === 0 && (
                <div className="glass-card rounded-xl p-6 text-center text-slate-600 text-sm">
                  No modules in this week yet.
                </div>
              )}
            </div>
          </section>
        ))}
      </div>

      {video && <VideoModal video={video} onClose={() => setVideo(null)} />}
    </div>
  );
}
