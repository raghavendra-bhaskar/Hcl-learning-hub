import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Play, X, BookOpen, Layers, Pencil } from 'lucide-react';
import { api } from '../lib/api.js';
import { getAuth } from './LoginPage.jsx';
import { STANDARD_LEARNING_PATH_NOTE } from '../data/standardLearningPathNote.js';
import { getEmbedUrl, isNativeVideoResource, resolvePlayableUrl } from '../lib/learningResourceEmbeds.js';

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

function ResourceButton({ res, onVideo }) {
  const meta = TYPE_META[res.type] || TYPE_META.link;
  const embedUrl = getEmbedUrl(res, { autoplay: true });
  const isEmbeddable = !!embedUrl;
  const noLink = !res.url;

  const handleClick = () => {
    if (isEmbeddable) { onVideo({ label: res.label, url: resolvePlayableUrl(res), embedUrl, nativeVideo: isNativeVideoResource(res) }); }
    else if (res.url) { window.open(resolvePlayableUrl(res), '_blank', 'noopener,noreferrer'); }
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
  const isDirect = !!video.nativeVideo;

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

function ModuleCard({ mod, onVideo, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const modColor = mod.color || '#06b6d4';

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{ border: `1px solid ${modColor}25`, background: 'rgba(3,10,20,0.7)' }}
    >
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left transition-all hover:bg-white/[0.03]"
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0"
          style={{ background: modColor + '22', border: `1px solid ${modColor}55`, color: modColor }}
        >
          {mod.number || 1}
        </div>
        <div className="text-2xl flex-shrink-0">{mod.icon || '📖'}</div>
        <div className="flex-1 min-w-0">
          <span className="font-bold text-white text-sm">{mod.title}</span>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {mod.topics?.length || 0} topics · {mod.resources?.length || 0} resources
          </div>
        </div>
        <ChevronDown
          size={16}
          className="flex-shrink-0 text-slate-500 transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {open && (
        <div className="px-5 pb-5 border-t" style={{ borderColor: modColor + '20' }}>
          <div className="grid md:grid-cols-2 gap-6 pt-4">
            <div>
              <p className="text-[10px] font-bold tracking-widest text-slate-500 mb-3 uppercase">Topics Covered</p>
              {mod.topics?.length === 0 ? (
                <p className="text-xs text-slate-700 italic">No topics yet</p>
              ) : (
                <ul className="space-y-2">
                  {mod.topics.map((t, i) => (
                    <li key={t.id || i} className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
                      <span
                        className="mt-0.5 w-4 h-4 rounded flex items-center justify-center flex-shrink-0 text-[9px] font-black"
                        style={{ background: modColor + '22', color: modColor }}
                      >
                        {i + 1}
                      </span>
                      {t.content}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="text-[10px] font-bold tracking-widest text-slate-500 mb-3 uppercase">Learning Resources</p>
              {mod.resources?.length === 0 ? (
                <p className="text-xs text-slate-700 italic">No resources yet</p>
              ) : (
                <div className="space-y-2">
                  {mod.resources.map((res, i) => (
                    <ResourceButton key={res.id || i} res={res} onVideo={onVideo} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CoursePathPage({ forcedSlug, backPath, backLabel }) {
  const params = useParams();
  const slug = forcedSlug || params.slug;
  const navigate = useNavigate();
  const auth = getAuth();
  const isAdmin = auth?.role === 'ADMIN';

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [video, setVideo] = useState(null);
  const [showNote, setShowNote] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError('');
    (async () => {
      try {
        const c = await api.get(`/courses-api/${slug}`);
        setCourse(c);
        setSelectedWeek(0);
      } catch (e) {
        setError(e?.message || 'Course not found');
      } finally {
        setLoading(false);
      }
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
  const weeks = course.weeks || [];
  const moduleCount = weeks.reduce((sum, w) => sum + (w.modules?.length || 0), 0);
  const week = weeks[selectedWeek] || null;
  const targetBackPath = backPath || `/c/${slug}`;
  const targetBackLabel = backLabel || course.title;

  return (
    <div className="min-h-screen pb-20">
      <VideoModal video={video} onClose={() => setVideo(null)} />

      <div
        className="sticky top-0 z-40 flex items-center gap-4 px-4 py-3"
        style={{
          background: 'rgba(3,6,12,0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${accent}26`,
        }}
      >
        <button
          onClick={() => navigate(targetBackPath)}
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} /> {targetBackLabel}
        </button>

        <div className="flex-1 text-center">
          <p className="text-[11px] font-bold tracking-widest uppercase" style={{ color: accent, fontFamily: "'Courier New', monospace" }}>
            {course.tagline || `${course.title} Learning Path`}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <Layers size={12} style={{ color: accent }} />
          <span className="text-[11px] text-slate-500">{weeks.length} Weeks · {moduleCount} Modules</span>
        </div>

        {isAdmin && (
          <button
            onClick={() => navigate(`/admin/courses/${course.slug || slug}/edit`)}
            className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-white transition-colors border border-white/10 rounded-lg px-2.5 py-1"
          >
            <Pencil size={11} /> Edit
          </button>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4">
        <div className="pt-10 pb-6 text-center">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-[11px] font-bold mb-5 tracking-widest uppercase"
            style={{ borderColor: accent + '4d', background: accent + '14', color: accent }}
          >
            <BookOpen size={12} /> {course.title} Learning Path
          </div>
          <h1 className="font-orbitron text-[2rem] md:text-[2.7rem] font-black mb-4 leading-[1.08] tracking-tight">
            <span className="block" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}99)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {course.title}:
            </span>
            <span className="block text-white text-[1.7rem] md:text-[2.3rem] mt-1">{course.tagline || 'Structured learning roadmap'}</span>
          </h1>
          {course.description && <p className="text-slate-400 text-sm max-w-2xl mx-auto leading-relaxed">{course.description}</p>}
          <p className="text-slate-500 text-xs mt-4">{weeks.length} Week{weeks.length !== 1 ? 's' : ''} · {moduleCount} Module{moduleCount !== 1 ? 's' : ''}</p>
        </div>

        <div className="rounded-2xl mb-8 overflow-hidden" style={{ border: '1px solid rgba(245,158,11,0.25)', background: 'linear-gradient(180deg, rgba(32,21,10,0.82), rgba(18,14,10,0.52))' }}>
          <button className="w-full flex items-center justify-between px-5 py-4 text-left" onClick={() => setShowNote(v => !v)}>
            <div className="flex items-center gap-3">
              <span className="text-xl">📋</span>
              <div>
                <p className="font-bold text-amber-400 text-sm">{STANDARD_LEARNING_PATH_NOTE.title}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{STANDARD_LEARNING_PATH_NOTE.subtitle}</p>
              </div>
            </div>
            <ChevronDown size={16} className="text-amber-400 transition-transform" style={{ transform: showNote ? 'rotate(180deg)' : 'rotate(0deg)' }} />
          </button>
          {showNote && (
            <div className="grid md:grid-cols-2 gap-3 px-5 pb-5 pt-1 border-t" style={{ borderColor: 'rgba(245,158,11,0.2)' }}>
              {STANDARD_LEARNING_PATH_NOTE.points.map((point, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,196,72,0.07)' }}>
                  <span className="text-xl flex-shrink-0">{point.icon}</span>
                  <div>
                    <p className="font-bold text-amber-300 text-xs mb-1">{point.title}</p>
                    <p className="text-slate-400 text-xs leading-relaxed">{point.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {weeks.length > 0 && (
          <>
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
              {weeks.map((w, i) => (
                <button
                  key={w.id || w.weekNumber}
                  onClick={() => setSelectedWeek(i)}
                  className="flex-shrink-0 flex flex-col items-center gap-1 px-5 py-3 rounded-xl font-bold text-xs transition-all min-w-[112px]"
                  style={{
                    background: selectedWeek === i ? accent + '24' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${selectedWeek === i ? accent + '80' : 'rgba(255,255,255,0.08)'}`,
                    color: selectedWeek === i ? accent : '#64748b',
                    boxShadow: selectedWeek === i ? `0 0 16px ${accent}33` : 'none',
                  }}
                >
                  <span className="font-orbitron text-base font-black">Week {w.weekNumber}</span>
                  <span className="text-[10px] tracking-wider opacity-80">{w.title}</span>
                </button>
              ))}
            </div>

            {week && (
              <>
                <div className="flex items-center gap-4 px-5 py-4 rounded-xl mb-6" style={{ background: accent + '10', border: `1px solid ${accent}26` }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center font-orbitron font-black text-lg text-white flex-shrink-0" style={{ background: `linear-gradient(135deg, ${accent}66, ${accent}33)`, border: `1px solid ${accent}66` }}>
                    W{week.weekNumber}
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-widest mb-0.5">Now Learning</p>
                    <p className="font-bold text-white text-lg">Week {week.weekNumber} — {week.title}</p>
                    <p className="text-xs text-slate-500">{week.modules?.length || 0} module{(week.modules?.length || 0) !== 1 ? 's' : ''} · click any module to expand</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {week.modules?.map((mod, index) => (
                    <ModuleCard key={mod.id || index} mod={mod} onVideo={setVideo} defaultOpen={index === 0} />
                  ))}
                </div>

                <div className="flex justify-between items-center mt-8 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <button
                    onClick={() => setSelectedWeek(v => Math.max(0, v - 1))}
                    disabled={selectedWeek === 0}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-30 hover:bg-white/5"
                    style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}
                  >
                    ← Previous Week
                  </button>
                  <span className="text-xs text-slate-600">{selectedWeek + 1} / {weeks.length}</span>
                  <button
                    onClick={() => setSelectedWeek(v => Math.min(weeks.length - 1, v + 1))}
                    disabled={selectedWeek === weeks.length - 1}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-30"
                    style={{ border: `1px solid ${accent}4d`, color: accent }}
                  >
                    Next Week →
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {weeks.length === 0 && (
          <div className="glass-card rounded-2xl p-12 text-center mb-12">
            <p className="text-slate-500">No learning-path content added yet.</p>
            {isAdmin && (
              <button
                onClick={() => navigate(`/admin/courses/${course.slug || slug}/edit`)}
                className="mt-4 mx-auto flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#06b6d4,#7c3aed)' }}
              >
                <Pencil size={14} /> Add Content
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
