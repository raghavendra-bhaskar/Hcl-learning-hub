import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Play, X, BookOpen, Layers, Pencil } from 'lucide-react';
import { api } from '../lib/api.js';
import { STANDARD_LEARNING_PATH_NOTE } from '../data/standardLearningPathNote.js';
import { getEmbedUrl, isNativeVideoResource, resolvePlayableUrl } from '../lib/learningResourceEmbeds.js';
import { useAppStore } from '../App.jsx';

function alpha(hex, opacity) {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return `rgba(15,23,42,${opacity})`;
  let value = hex.slice(1);
  if (value.length === 3) value = value.split('').map(char => char + char).join('');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

function cleanDisplayTitle(value, fallback = '') {
  return String(value || fallback)
    .replace(/^week\s*\d+\s*[:\-–—]?\s*/i, '')
    .replace(/^module\s*\d+\s*[:\-–—]?\s*/i, '')
    .replace(/^[A-Z]\.[\s-]*/i, '')
    .replace(/\s+learning path$/i, '')
    .replace(/\s+learn and practice$/i, '')
    .trim() || fallback;
}

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
  const { theme } = useAppStore();
  const isLight = theme === 'light';
  const tone = isLight ? '#334155' : meta.color;

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
        background: noLink
          ? (isLight ? 'rgba(148,163,184,0.16)' : 'rgba(255,255,255,0.03)')
          : (isLight ? 'rgba(255,255,255,0.78)' : meta.bg),
        border: `1px solid ${noLink ? (isLight ? 'rgba(71,85,105,0.18)' : 'rgba(255,255,255,0.06)') : (isLight ? 'rgba(71,85,105,0.18)' : meta.color + '30')}`,
        color: noLink ? '#64748b' : tone,
        cursor: noLink ? 'default' : 'pointer',
        opacity: noLink ? 0.7 : 1,
      }}
    >
      <span className="flex-shrink-0 mt-0.5 text-sm">{meta.icon}</span>
      <span className="flex-1 leading-relaxed font-medium" style={{ color: noLink ? '#64748b' : (isLight ? '#0f172a' : '#e2e8f0') }}>
        {res.label}
        {noLink && <span className="ml-2 text-[10px]" style={{ color: isLight ? '#475569' : meta.color }}>(TBD)</span>}
      </span>
      {!noLink && (
        <span className="flex-shrink-0 mt-0.5 text-[10px] font-bold tracking-wider" style={{ color: isLight ? '#475569' : meta.color }}>
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
  const { theme } = useAppStore();
  const isLight = theme === 'light';
  const lightBorder = alpha(modColor, 0.22);
  const moduleTitle = cleanDisplayTitle(mod.title, `Module ${mod.number || 1}`);

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{ border: isLight ? `1px solid ${lightBorder}` : `1px solid ${modColor}25`, background: isLight ? 'rgba(255,255,255,0.72)' : 'rgba(3,10,20,0.7)' }}
    >
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-all ${isLight ? 'hover:bg-slate-400/10' : 'hover:bg-white/[0.03]'}`}
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0"
          style={{ background: isLight ? 'rgba(15,23,42,0.06)' : modColor + '22', border: isLight ? '1px solid rgba(71,85,105,0.22)' : `1px solid ${modColor}55`, color: isLight ? '#0f172a' : modColor }}
        >
          {mod.number || 1}
        </div>
        <div className="text-2xl flex-shrink-0">{mod.icon || '📖'}</div>
        <div className="flex-1 min-w-0">
          <span className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>{moduleTitle}</span>
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
        <div className="px-5 pb-5 border-t" style={{ borderColor: isLight ? 'rgba(71,85,105,0.14)' : modColor + '20' }}>
          <div className="grid md:grid-cols-2 gap-6 pt-4">
            <div>
              <p className={`text-[10px] font-bold tracking-widest mb-3 uppercase ${isLight ? 'text-slate-800' : 'text-slate-500'}`}>Topics Covered</p>
              {mod.topics?.length === 0 ? (
                <p className={`text-xs italic ${isLight ? 'text-slate-700' : 'text-slate-500'}`}>No topics yet</p>
              ) : (
                <ul className="space-y-2">
                  {mod.topics.map((t, i) => (
                    <li key={t.id || i} className={`flex items-start gap-2.5 text-xs leading-relaxed ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
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
              <p className={`text-[10px] font-bold tracking-widest mb-3 uppercase ${isLight ? 'text-slate-800' : 'text-slate-500'}`}>Learning Resources</p>
              {mod.resources?.length === 0 ? (
                <p className={`text-xs italic ${isLight ? 'text-slate-700' : 'text-slate-500'}`}>No resources yet</p>
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
  const { theme } = useAppStore();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [video, setVideo] = useState(null);
  const [showNote, setShowNote] = useState(false);

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
  const canEdit = Boolean(course.canEdit);
  const isLight = theme === 'light';
  const weeks = course.weeks || [];
  const moduleCount = weeks.reduce((sum, w) => sum + (w.modules?.length || 0), 0);
  const week = weeks[selectedWeek] || null;
  const targetBackPath = backPath || `/c/${slug}`;
  const targetBackLabel = backLabel || course.title;
  const toneColor = isLight ? '#0f172a' : accent;
  const softAccentBg = isLight ? 'rgba(15,23,42,0.06)' : accent + '14';
  const subtlePanel = isLight ? 'rgba(255,255,255,0.74)' : 'rgba(3,10,20,0.7)';

  return (
    <div className="min-h-screen pb-20" style={{ background: isLight ? 'linear-gradient(160deg, #f0f9ff 0%, #f8fafc 60%, #eef2ff 100%)' : undefined }}>
      <VideoModal video={video} onClose={() => setVideo(null)} />

      <div
        className="sticky top-0 z-40 flex items-center gap-4 px-4 py-3"
        style={{
          background: isLight ? 'rgba(248,250,252,0.94)' : 'rgba(3,6,12,0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: isLight ? '1px solid rgba(71,85,105,0.18)' : `1px solid ${accent}26`,
        }}
      >
        <button
          onClick={() => navigate(targetBackPath)}
          className={`flex items-center gap-2 text-xs transition-colors ${isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}
        >
          <ArrowLeft size={14} /> {targetBackLabel}
        </button>

        <div className="flex-1 text-center">
          <p className="text-[11px] font-bold tracking-widest uppercase" style={{ color: toneColor, fontFamily: "'Courier New', monospace" }}>
            {course.tagline || `${course.title} Learning Path`}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <Layers size={12} style={{ color: accent }} />
          <span className="text-[11px] text-slate-500">{weeks.length} Weeks · {moduleCount} Modules</span>
        </div>

        {canEdit && (
          <button
            onClick={() => navigate(`/admin/courses/${course.slug || slug}/edit`)}
            className={`flex items-center gap-1.5 text-[11px] transition-colors border rounded-lg px-2.5 py-1 ${isLight ? 'text-slate-500 hover:text-cyan-600' : 'text-slate-500 hover:text-white'}`}
            style={{ borderColor: isLight ? 'rgba(148,163,184,0.2)' : 'rgba(255,255,255,0.1)' }}
          >
            <Pencil size={11} /> Edit
          </button>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4">
        <div className="pt-8 pb-6 text-center">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-[11px] font-bold mb-5 tracking-widest uppercase"
            style={{ borderColor: isLight ? 'rgba(71,85,105,0.18)' : accent + '4d', background: softAccentBg, color: toneColor }}
          >
            <BookOpen size={12} /> {course.title} Learning Path
          </div>
          <h1 className="font-orbitron text-[1.6rem] md:text-[2.2rem] font-black mb-4 leading-[1.08] tracking-tight">
            <span className={`block ${isLight ? 'text-slate-900' : ''}`} style={isLight ? undefined : { background: `linear-gradient(135deg, ${accent}, ${accent}99)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {course.title}:
            </span>
            <span className={`block text-[1.15rem] md:text-[1.6rem] mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>{course.tagline || 'Structured learning roadmap'}</span>
          </h1>
          {course.description && <p className={`text-sm max-w-2xl mx-auto leading-relaxed ${isLight ? 'text-slate-800' : 'text-slate-400'}`}>{course.description}</p>}
          <p className="text-slate-500 text-xs mt-4">{weeks.length} Week{weeks.length !== 1 ? 's' : ''} · {moduleCount} Module{moduleCount !== 1 ? 's' : ''}</p>
        </div>

        <div className="rounded-2xl mb-8 overflow-hidden" style={{ border: isLight ? '1px solid rgba(71,85,105,0.18)' : '1px solid rgba(245,158,11,0.25)', background: isLight ? subtlePanel : 'linear-gradient(180deg, rgba(32,21,10,0.82), rgba(18,14,10,0.52))' }}>
          <button className="w-full flex items-center justify-between px-5 py-4 text-left" onClick={() => setShowNote(v => !v)}>
            <div className="flex items-center gap-3">
              <span className="text-xl">📋</span>
              <div>
                <p className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-amber-400'}`}>{STANDARD_LEARNING_PATH_NOTE.title}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{STANDARD_LEARNING_PATH_NOTE.subtitle}</p>
              </div>
            </div>
            <ChevronDown size={16} className="transition-transform" style={{ color: isLight ? '#334155' : '#fbbf24', transform: showNote ? 'rotate(180deg)' : 'rotate(0deg)' }} />
          </button>
          {showNote && (
            <div className="grid md:grid-cols-2 gap-3 px-5 pb-5 pt-1 border-t" style={{ borderColor: isLight ? 'rgba(71,85,105,0.12)' : 'rgba(245,158,11,0.2)' }}>
              {STANDARD_LEARNING_PATH_NOTE.points.map((point, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: isLight ? 'rgba(15,23,42,0.04)' : 'rgba(255,196,72,0.07)', border: isLight ? '1px solid rgba(71,85,105,0.12)' : undefined }}>
                  <span className="text-xl flex-shrink-0">{point.icon}</span>
                  <div>
                    <p className={`font-bold text-xs mb-1 ${isLight ? 'text-slate-900' : 'text-amber-300'}`}>{point.title}</p>
                    <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-800' : 'text-slate-400'}`}>{point.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {weeks.length > 0 && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
              {weeks.map((w, i) => (
                <button
                  key={w.id || w.weekNumber}
                  onClick={() => setSelectedWeek(i)}
                  className="flex flex-col items-center justify-center gap-1 px-4 py-3 rounded-xl font-bold text-xs transition-all min-h-[88px]"
                  style={{
                    background: selectedWeek === i ? (isLight ? 'rgba(15,23,42,0.08)' : accent + '24') : (isLight ? 'rgba(255,255,255,0.62)' : 'rgba(255,255,255,0.03)'),
                    border: `1px solid ${selectedWeek === i ? (isLight ? 'rgba(15,23,42,0.18)' : accent + '80') : (isLight ? 'rgba(148,163,184,0.18)' : 'rgba(255,255,255,0.08)')}`,
                    color: selectedWeek === i ? (isLight ? '#0f172a' : accent) : '#64748b',
                    boxShadow: selectedWeek === i ? (isLight ? '0 6px 18px rgba(15,23,42,0.08)' : `0 0 16px ${accent}33`) : 'none',
                  }}
                >
                  <span className="font-orbitron text-base font-black">Week {w.weekNumber}</span>
                </button>
              ))}
            </div>

            {week && (
              <>
                <div className="flex items-center gap-4 px-5 py-4 rounded-xl mb-6" style={{ background: isLight ? 'rgba(255,255,255,0.66)' : accent + '10', border: isLight ? '1px solid rgba(71,85,105,0.16)' : `1px solid ${accent}26` }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center font-orbitron font-black text-lg flex-shrink-0" style={{ background: isLight ? 'rgba(15,23,42,0.08)' : `linear-gradient(135deg, ${accent}66, ${accent}33)`, border: isLight ? '1px solid rgba(71,85,105,0.18)' : `1px solid ${accent}66`, color: isLight ? '#0f172a' : '#ffffff' }}>
                    W{week.weekNumber}
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-widest mb-0.5">Now Learning</p>
                    <p className={`font-bold text-lg ${isLight ? 'text-slate-900' : 'text-white'}`}>Week {week.weekNumber} — {cleanDisplayTitle(week.title, `Week ${week.weekNumber}`)}</p>
                    <p className="text-xs text-slate-500">{week.modules?.length || 0} module{(week.modules?.length || 0) !== 1 ? 's' : ''} · click any module to expand</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {week.modules?.map((mod, index) => (
                    <ModuleCard key={mod.id || index} mod={mod} onVideo={setVideo} defaultOpen={false} />
                  ))}
                </div>

                <div className="flex justify-between items-center mt-8 pt-6" style={{ borderTop: isLight ? '1px solid rgba(148,163,184,0.18)' : '1px solid rgba(255,255,255,0.06)' }}>
                  <button
                    onClick={() => setSelectedWeek(v => Math.max(0, v - 1))}
                    disabled={selectedWeek === 0}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-30 hover:bg-white/5"
                    style={{ border: isLight ? '1px solid rgba(148,163,184,0.2)' : '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}
                  >
                    ← Previous Week
                  </button>
                  <span className="text-xs text-slate-600">{selectedWeek + 1} / {weeks.length}</span>
                  <button
                    onClick={() => setSelectedWeek(v => Math.min(weeks.length - 1, v + 1))}
                    disabled={selectedWeek === weeks.length - 1}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-30"
                    style={{ border: isLight ? '1px solid rgba(71,85,105,0.18)' : `1px solid ${accent}4d`, color: isLight ? '#0f172a' : accent, background: isLight ? 'rgba(255,255,255,0.7)' : undefined }}
                  >
                    Next Week →
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {weeks.length === 0 && (
          <div className="glass-card rounded-2xl p-12 text-center mb-12" style={{ background: isLight ? 'rgba(148,163,184,0.16)' : undefined, border: isLight ? '1px solid rgba(71,85,105,0.22)' : undefined }}>
            <p className="text-slate-500">No learning-path content added yet.</p>
            {canEdit && (
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
