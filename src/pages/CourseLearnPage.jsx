import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Target, X, Play } from 'lucide-react';
import { api } from '../lib/api.js';

// Resource types that can be embedded inline
const EMBEDDABLE = ['youtube', 'video'];

function isYouTubeUrl(url) {
  return url && (url.includes('youtube.com') || url.includes('youtu.be'));
}

function getEmbedUrl(type, url) {
  if (!url) return null;
  // Always try YouTube extraction first, regardless of declared type
  const yt = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=0&rel=0`;
  if (url.includes('youtube.com/embed/')) return url;
  if (type === 'video' || type === 'youtube') return url; // direct MP4 or other embeddable
  return null;
}

function ResourceViewer({ resource, onClose }) {
  const embedUrl = getEmbedUrl(resource.type, resource.url);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative w-full max-w-4xl rounded-2xl overflow-hidden"
        style={{ background: '#0a0f1a', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
          <p className="text-sm font-semibold text-white truncate">{resource.label}</p>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all">
            <X size={16} />
          </button>
        </div>
        {resource.type === 'video' && !isYouTubeUrl(resource.url) ? (
          <video src={resource.url} controls className="w-full max-h-[70vh] bg-black" />
        ) : embedUrl ? (
          <iframe
            src={embedUrl}
            className="w-full"
            style={{ height: '56.25vw', maxHeight: '70vh' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={resource.label}
          />
        ) : (
          <div className="p-6 text-center text-slate-500 text-sm">Unable to embed this resource. <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Open in new tab ↗</a></div>
        )}
      </div>
    </div>
  );
}

export default function CourseLearnPage() {
  const { slug, questId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse]     = useState(null);
  const [quest, setQuest]       = useState(null);
  const [module, setModule]     = useState(null);
  const [allQuests, setAllQuests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [slide, setSlide]       = useState(0);
  const [activeResource, setActiveResource] = useState(null);

  useEffect(() => {
    setSlide(0);
    setActiveResource(null);
    (async () => {
      setLoading(true);
      try {
        const [c, q] = await Promise.all([
          api.get(`/courses-api/${slug}`),
          api.get(`/courses-api/quests/${questId}`),
        ]);
        setCourse(c);
        setQuest(q);
        const qs = await api.get(`/courses-api/${c.id}/quests`);
        setAllQuests(Array.isArray(qs) ? qs : []);

        // Only fall back to moduleId if quest has no inline learnTopics
        const hasInlineTopics = Array.isArray(q.learnTopics) && q.learnTopics.length > 0;
        if (!hasInlineTopics && q.moduleId) {
          let foundModule = null;
          for (const week of (c.weeks || [])) {
            for (const mod of (week.modules || [])) {
              if (mod.id === q.moduleId) { foundModule = mod; break; }
            }
            if (foundModule) break;
          }
          setModule(foundModule || null);
        } else {
          setModule(null);
        }
      } catch (e) { setError(e?.message || 'Failed to load'); }
      finally { setLoading(false); }
    })();
  }, [slug, questId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white/20 border-t-cyan-400 rounded-full animate-spin" />
    </div>
  );
  if (error || !quest || !course) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-red-400">{error || 'Not found'}</p>
      <button onClick={() => navigate(`/c/${slug}/quests`)} className="text-cyan-400 text-sm">← Back to Quests</button>
    </div>
  );

  const accent    = course.accentColor || '#06b6d4';
  const accentBg  = { background: accent + '18', border: `1px solid ${accent}30`, color: accent };
  const accentBtn = { background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, boxShadow: `0 4px 20px ${accent}40` };

  // Extract solution request (stored as learnTopic with isSolutionRequest flag)
  const allTopicsRaw = Array.isArray(quest?.learnTopics) ? quest.learnTopics : [];
  const solutionRequest = allTopicsRaw.find(t => t.isSolutionRequest)?.content || '';
  const inlineTopics = allTopicsRaw.filter(t => !t.isSolutionRequest);

  // Prefer inline learnTopics/learnResources; fall back to linked module
  const hasInlineTopics = inlineTopics.length > 0;
  const topics    = hasInlineTopics ? inlineTopics : (module?.topics || []);
  const resources = (Array.isArray(quest?.learnResources) && quest.learnResources.length > 0)
    ? quest.learnResources
    : (module?.resources || []);

  const slides = [
    { type: 'scenario', content: quest.scenario, label: 'Scenario' },
    ...topics.map((t, i) => ({ type: 'topic', content: t.content, label: `Step ${i + 1}`, id: t.id })),
  ];
  const totalSlides = slides.length;
  const current     = slides[slide] || slides[0];

  // Resources for current slide (topic): match by order to topic index
  const slideResources = slide === 0
    ? resources.filter(r => r.order === 0)
    : resources.filter(r => r.order === slide - 1);

  // YouTube search URL for current step
  const ytSearchQuery = encodeURIComponent(`${course.title} ${quest.title} ${slide > 0 ? topics[slide - 1]?.content?.slice(0, 40) || '' : ''}`).trim();
  const ytSearchUrl = `https://www.youtube.com/results?search_query=${ytSearchQuery}`;

  // Navigation
  const questIndex = allQuests.findIndex(q => q.id === questId);
  const nextQuest  = questIndex >= 0 && questIndex < allQuests.length - 1 ? allQuests[questIndex + 1] : null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md border-b border-white/5 flex-shrink-0"
        style={{ background: 'rgba(3,10,20,0.92)' }}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(`/c/${slug}/quests`)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={14} /> Quests
          </button>
          <span className="text-slate-700">/</span>
          <span className="text-xs font-semibold text-slate-300 truncate">{quest.title}</span>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => navigate(`/c/${slug}/quiz/${questId}`)}
              className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold text-white"
              style={accentBtn}>
              <Target size={13} /> Skip to Quiz
            </button>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="w-full h-1 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div className="h-full transition-all duration-500"
          style={{ width: `${((slide + 1) / totalSlides) * 100}%`, background: `linear-gradient(90deg, ${accent}, ${accent}cc)` }} />
      </div>

      {/* Main content */}
      <div className="flex-1 max-w-6xl mx-auto px-4 pt-6 pb-24 w-full">
        <div className="flex flex-col lg:flex-row gap-6 h-full">

          {/* ── Left panel: slide navigator ─────────────────────────── */}
          <aside className="lg:w-72 flex-shrink-0">
            {/* Quest label */}
            <div className="mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}>
                📖 Learn · {course.title}
              </span>
              <h2 className="text-base font-bold text-white mt-1 leading-tight">{quest.title}</h2>
            </div>

            {/* Solution Request pinned box */}
            {solutionRequest && (
              <div className="mb-4 rounded-xl px-3 py-2.5 text-xs" style={{ background: accent + '10', border: `1px solid ${accent}25` }}>
                <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: accent }}>Solution Request</p>
                <p className="text-slate-400 leading-relaxed">{solutionRequest}</p>
              </div>
            )}

            {/* Slide list */}
            <div className="space-y-1.5">
              {slides.map((s, i) => (
                <button key={i} onClick={() => setSlide(i)}
                  className={`w-full text-left rounded-xl px-3 py-2.5 text-xs transition-all ${slide === i ? 'font-bold' : 'text-slate-500 hover:text-slate-300'}`}
                  style={slide === i ? { ...accentBg, fontWeight: 700 } : { background: 'rgba(255,255,255,0.02)' }}>
                  <span className="text-[10px] font-bold uppercase tracking-widest block mb-0.5 opacity-60">{s.label}</span>
                  <span className="line-clamp-2 leading-snug">{s.content.slice(0, 70)}{s.content.length > 70 ? '…' : ''}</span>
                </button>
              ))}
            </div>

            {/* Resources sidebar */}
            {resources.length > 0 && (
              <div className="mt-6">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2">Resources</p>
                <div className="space-y-1.5">
                  {resources.map(r => {
                    const embeddable = EMBEDDABLE.includes(r.type);
                    return (
                      <button key={r.id}
                        onClick={() => embeddable ? setActiveResource(r) : window.open(r.url, '_blank', 'noopener,noreferrer')}
                        className="w-full text-left flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                        <span className="flex-shrink-0">
                          {r.type === 'youtube' ? '▶' : r.type === 'video' ? '🎬' : r.type === 'oreilly' ? '📕' : r.type === 'ibm' ? '📘' : r.type === 'udemy' ? '🎓' : '🔗'}
                        </span>
                        <span className="truncate">{r.label}</span>
                        {embeddable && <Play size={10} className="ml-auto flex-shrink-0 opacity-50" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </aside>

          {/* ── Right panel: slide content ───────────────────────────── */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">
            {/* Slide content card */}
            <div className="glass-card rounded-2xl p-6 flex-shrink-0"
              style={{ borderColor: accent + '20', background: accent + '05' }}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full" style={accentBg}>
                  {current.label}
                </span>
                <span className="text-[10px] text-slate-600">{slide + 1} / {totalSlides}</span>
                {/* YouTube search for this step */}
                <a href={ytSearchUrl} target="_blank" rel="noopener noreferrer"
                  className="ml-auto flex items-center gap-1 text-[10px] text-slate-600 hover:text-red-400 transition-colors"
                  title="Find related videos on YouTube">
                  <span className="text-[11px]">▶</span> Find Videos
                </a>
              </div>
              <p className="text-slate-200 leading-relaxed text-sm whitespace-pre-wrap">{current.content}</p>
            </div>

            {/* Inline resources for this slide */}
            {slideResources.length > 0 && (
              <div className="space-y-3">
                {slideResources.map(r => {
                  const embeddable = EMBEDDABLE.includes(r.type);
                  const embedUrl   = embeddable ? getEmbedUrl(r.type, r.url) : null;
                  if (embedUrl && r.type !== 'video') {
                    return (
                      <div key={r.id} className="rounded-2xl overflow-hidden"
                        style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div className="px-4 py-2 flex items-center gap-2 border-b border-white/8"
                          style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <span className="text-sm">▶</span>
                          <span className="text-xs font-semibold text-slate-300">{r.label}</span>
                        </div>
                        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                          <iframe src={embedUrl} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen title={r.label} />
                        </div>
                      </div>
                    );
                  }
                  if (r.type === 'video' && !isYouTubeUrl(r.url)) {
                    return (
                      <div key={r.id} className="rounded-2xl overflow-hidden"
                        style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div className="px-4 py-2 flex items-center gap-2 border-b border-white/8"
                          style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <span className="text-sm">🎬</span>
                          <span className="text-xs font-semibold text-slate-300">{r.label}</span>
                        </div>
                        <video src={r.url} controls className="w-full bg-black max-h-80" />
                      </div>
                    );
                  }
                  return (
                    <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 glass-card rounded-xl px-4 py-3 text-sm text-slate-300 hover:text-white hover:border-white/20 transition-all">
                      <span>{r.type === 'oreilly' ? '📕' : r.type === 'ibm' ? '📘' : r.type === 'udemy' ? '🎓' : '🔗'}</span>
                      {r.label}
                      <span className="ml-auto text-xs text-slate-600">↗</span>
                    </a>
                  );
                })}
              </div>
            )}

            {/* No module linked */}
            {!module && slides.length <= 1 && (
              <div className="glass-card rounded-2xl p-8 text-center">
                <p className="text-slate-600 text-sm">No learning content is linked to this quest yet.</p>
                <p className="text-slate-700 text-xs mt-1">The admin can link a module to this quest in the Course Editor.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom navigation bar ──────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/8"
        style={{ background: 'rgba(3,10,20,0.96)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          {/* Learn / Practice toggle */}
          <div className="flex rounded-xl overflow-hidden border border-white/10 flex-shrink-0">
            <div className="px-4 py-2 text-xs font-bold text-white" style={{ background: accent + '22', color: accent }}>
              📖 Learn
            </div>
            <button onClick={() => navigate(`/c/${slug}/quiz/${questId}`)}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-white hover:bg-white/5 transition-all">
              🎯 Practice
            </button>
          </div>

          <div className="flex-1" />

          {/* Prev / slide counter / Next */}
          <button onClick={() => setSlide(s => Math.max(0, s - 1))} disabled={slide === 0}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/8 disabled:opacity-30 transition-all">
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs text-slate-500 tabular-nums">{slide + 1} / {totalSlides}</span>
          {slide < totalSlides - 1 ? (
            <button onClick={() => setSlide(s => Math.min(totalSlides - 1, s + 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/8 transition-all">
              <ChevronRight size={16} />
            </button>
          ) : (
            <button onClick={() => navigate(`/c/${slug}/quiz/${questId}`)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95"
              style={accentBtn}>
              <Target size={13} /> Take Quiz
            </button>
          )}
        </div>
      </div>

      {/* Resource viewer modal */}
      {activeResource && <ResourceViewer resource={activeResource} onClose={() => setActiveResource(null)} />}
    </div>
  );
}
