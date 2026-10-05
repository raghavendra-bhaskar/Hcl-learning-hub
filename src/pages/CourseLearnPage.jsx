import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Target, Play } from 'lucide-react';
import { api } from '../lib/api.js';
import { canEmbedResource, getEmbedUrl, isNativeVideoResource, resolvePlayableUrl } from '../lib/learningResourceEmbeds.js';
import { useAppStore } from '../App.jsx';

// Resource types that can be embedded inline
const EMBEDDABLE = ['youtube', 'video', 'playlist'];

function cleanDisplayTitle(value, fallback = '') {
  return String(value || fallback)
    .replace(/^week\s*\d+\s*[:\-–—]?\s*/i, '')
    .replace(/^module\s*\d+\s*[:\-–—]?\s*/i, '')
    .replace(/^[A-Z]\.[\s-]*/i, '')
    .replace(/\s+learning path$/i, '')
    .replace(/\s+learn and practice$/i, '')
    .trim() || fallback;
}

export default function CourseLearnPage() {
  const { slug, questId } = useParams();
  const navigate = useNavigate();
  const { theme } = useAppStore();

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
  const isLight   = theme === 'light';
  const accentBg  = { background: accent + '18', border: `1px solid ${accent}30`, color: accent };
  const accentBtn = { background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, boxShadow: `0 4px 20px ${accent}40` };
  const displayQuestTitle = cleanDisplayTitle(quest.title, quest.title || 'Learning Quest');

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
  const frameResource = slideResources.find(r => r.id === activeResource?.id)
    || slideResources.find(r => canEmbedResource(r))
    || null;
  const frameEmbedUrl = frameResource ? getEmbedUrl(frameResource) : null;
  const frameUseNativeVideo = frameResource ? isNativeVideoResource(frameResource) : false;
  const frameResolvedUrl = frameResource ? resolvePlayableUrl(frameResource) : '';

  // YouTube search URL for current step
  const ytSearchQuery = encodeURIComponent(`${course.title} ${quest.title} ${slide > 0 ? topics[slide - 1]?.content?.slice(0, 40) || '' : ''}`).trim();
  const ytSearchUrl = `https://www.youtube.com/results?search_query=${ytSearchQuery}`;

  // Navigation
  const questIndex = allQuests.findIndex(q => q.id === questId);
  const nextQuest  = questIndex >= 0 && questIndex < allQuests.length - 1 ? allQuests[questIndex + 1] : null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: isLight ? 'linear-gradient(160deg, #f8fafc 0%, #f1f5f9 55%, #eef2ff 100%)' : undefined }}>
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md border-b border-white/5 flex-shrink-0"
        style={{ background: isLight ? 'rgba(248,250,252,0.96)' : 'rgba(3,10,20,0.92)', borderColor: isLight ? 'rgba(100,116,139,0.16)' : 'rgba(255,255,255,0.05)' }}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(`/c/${slug}/quests`)}
            className={`flex items-center gap-1.5 text-xs transition-colors ${isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}>
            <ArrowLeft size={14} /> Quests
          </button>
          <span className={isLight ? 'text-slate-300' : 'text-slate-700'}>/</span>
          <span className={`text-xs font-semibold truncate ${isLight ? 'text-slate-900' : 'text-slate-300'}`}>{quest.title}</span>
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
      <div className="w-full h-1 flex-shrink-0" style={{ background: isLight ? 'rgba(148,163,184,0.18)' : 'rgba(255,255,255,0.05)' }}>
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
                📖 Learn
              </span>
              <h2 className={`text-base font-bold mt-1 leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>{displayQuestTitle}</h2>
            </div>

            {/* Solution Request pinned box */}
            {solutionRequest && (
              <div className="mb-4 rounded-xl px-3 py-2.5 text-xs" style={{ background: isLight ? 'rgba(255,255,255,0.78)' : accent + '10', border: isLight ? '1px solid rgba(100,116,139,0.16)' : `1px solid ${accent}25` }}>
                <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: accent }}>Solution Request</p>
                <p className={`leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>{solutionRequest}</p>
              </div>
            )}

            {/* Slide list */}
            <div className="space-y-1.5">
              {slides.map((s, i) => (
                <button key={i} onClick={() => setSlide(i)}
                  className={`w-full text-left rounded-xl px-3 py-2.5 text-xs transition-all ${slide === i ? 'font-bold' : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-500 hover:text-slate-300'}`}
                  style={slide === i ? { ...accentBg, fontWeight: 700 } : { background: isLight ? 'rgba(255,255,255,0.78)' : 'rgba(255,255,255,0.02)', border: isLight ? '1px solid rgba(100,116,139,0.14)' : '1px solid transparent' }}>
                  <span className="text-[10px] font-bold uppercase tracking-widest block mb-0.5 opacity-60">{s.label}</span>
                  <span className="line-clamp-2 leading-snug">{s.content.slice(0, 70)}{s.content.length > 70 ? '…' : ''}</span>
                </button>
              ))}
            </div>

            {/* Resources sidebar */}
            {resources.length > 0 && (
              <div className="mt-6">
                <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isLight ? 'text-slate-700' : 'text-slate-600'}`}>Resources</p>
                <div className="space-y-1.5">
                  {slideResources.length === 0 && (
                    <p className={`text-[11px] italic px-1 py-2 ${isLight ? 'text-slate-600' : 'text-slate-700'}`}>No resources for this step.</p>
                  )}
                  {slideResources.map(r => {
                    const embeddable = EMBEDDABLE.includes(r.type) && canEmbedResource(r);
                    const isSelected = frameResource?.id === r.id;
                    return (
                      <button key={r.id}
                        onClick={() => embeddable ? setActiveResource(r) : window.open(resolvePlayableUrl(r), '_blank', 'noopener,noreferrer')}
                        className={`w-full text-left flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-all ${isLight ? 'text-slate-700 hover:text-slate-900' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                        style={isSelected
                          ? { background: accent + '14', border: `1px solid ${accent}35`, color: isLight ? '#0f172a' : '#fff' }
                          : { background: isLight ? 'rgba(255,255,255,0.78)' : 'transparent', border: isLight ? '1px solid rgba(100,116,139,0.14)' : '1px solid transparent' }}>
                        <span className="flex-shrink-0">
                          {r.type === 'youtube' || r.type === 'playlist' ? '▶' : r.type === 'video' ? '🎬' : r.type === 'oreilly' ? '📕' : r.type === 'ibm' ? '📘' : r.type === 'udemy' ? '🎓' : '🔗'}
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
              style={{ borderColor: isLight ? 'rgba(100,116,139,0.14)' : accent + '20', background: isLight ? 'rgba(255,255,255,0.8)' : accent + '05' }}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full" style={accentBg}>
                  {current.label}
                </span>
                <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-600'}`}>{slide + 1} / {totalSlides}</span>
                {/* YouTube search for this step */}
                <a href={ytSearchUrl} target="_blank" rel="noopener noreferrer"
                  className={`ml-auto flex items-center gap-1 text-[10px] transition-colors ${isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-600 hover:text-red-400'}`}
                  title="Find related videos on YouTube">
                  <span className="text-[11px]">▶</span> Find Videos
                </a>
              </div>
              <p className={`leading-relaxed text-sm whitespace-pre-wrap ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{current.content}</p>
            </div>

            {/* Inline resources for this slide */}
            {slideResources.length > 0 && (
              <div className="glass-card rounded-2xl overflow-hidden flex-1 min-h-[360px]"
                style={{ borderColor: isLight ? 'rgba(100,116,139,0.14)' : accent + '20', background: isLight ? 'rgba(255,255,255,0.82)' : 'rgba(3,10,20,0.7)' }}>
                <div className="px-4 py-3 flex items-center gap-2 border-b"
                  style={{ background: isLight ? 'rgba(15,23,42,0.04)' : accent + '08', borderColor: isLight ? 'rgba(100,116,139,0.12)' : 'rgba(255,255,255,0.08)' }}>
                  <span className="text-sm">{frameResource ? (frameUseNativeVideo ? '🎬' : '▶') : '📚'}</span>
                  <span className={`text-xs font-semibold truncate ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>{frameResource ? frameResource.label : 'Step Resources'}</span>
                </div>

                {frameResource ? (
                  frameUseNativeVideo ? (
                    <video src={resolvePlayableUrl(frameResource)} controls className="w-full bg-black min-h-[320px]" />
                  ) : frameEmbedUrl ? (
                    <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                      <iframe src={frameEmbedUrl} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen title={frameResource.label} />
                    </div>
                  ) : (
                    <div className="p-6 flex flex-col items-center justify-center gap-4 min-h-[320px] text-center">
                      <p className={`text-sm ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>This resource cannot be embedded inside the page.</p>
                      <a
                        href={frameResolvedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${isLight ? 'text-white' : 'text-white'}`}
                        style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}>
                        <Play size={14} /> Open resource in new tab
                      </a>
                    </div>
                  )
                ) : (
                  <div className="p-5 space-y-3">
                    {slideResources.map(r => (
                      <a key={r.id} href={resolvePlayableUrl(r)} target="_blank" rel="noopener noreferrer"
                        className={`flex items-center gap-3 glass-card rounded-xl px-4 py-3 text-sm transition-all ${isLight ? 'text-slate-700 hover:text-slate-900' : 'text-slate-300 hover:text-white hover:border-white/20'}`}
                        style={isLight ? { background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(100,116,139,0.14)' } : undefined}>
                        <span>{r.type === 'oreilly' ? '📕' : r.type === 'ibm' ? '📘' : r.type === 'udemy' ? '🎓' : '🔗'}</span>
                        {r.label}
                        <span className={`ml-auto text-xs ${isLight ? 'text-slate-500' : 'text-slate-600'}`}>↗</span>
                      </a>
                    ))}
                  </div>
                )}

                {slideResources.length > 1 && (
                  <div className="px-4 py-3 border-t flex flex-wrap gap-2" style={{ borderColor: isLight ? 'rgba(100,116,139,0.12)' : 'rgba(255,255,255,0.08)' }}>
                    {slideResources.map(r => {
                      const embeddable = canEmbedResource(r);
                      const selected = frameResource?.id === r.id;
                      return embeddable ? (
                        <button key={r.id} onClick={() => setActiveResource(r)}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                          style={selected
                            ? { background: accent + '20', color: isLight ? '#0f172a' : accent, border: `1px solid ${accent}40` }
                            : { background: isLight ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.04)', color: isLight ? '#475569' : '#94a3b8', border: isLight ? '1px solid rgba(100,116,139,0.14)' : '1px solid rgba(255,255,255,0.08)' }}>
                          {r.label}
                        </button>
                      ) : (
                        <a key={r.id} href={resolvePlayableUrl(r)} target="_blank" rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                          style={{ background: isLight ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.04)', color: isLight ? '#475569' : '#94a3b8', border: isLight ? '1px solid rgba(100,116,139,0.14)' : '1px solid rgba(255,255,255,0.08)' }}>
                          {r.label} ↗
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* No module linked */}
            {!module && slides.length <= 1 && (
              <div className="glass-card rounded-2xl p-8 text-center" style={isLight ? { background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(100,116,139,0.14)' } : undefined}>
                <p className={`text-sm ${isLight ? 'text-slate-700' : 'text-slate-600'}`}>No learning content is linked to this quest yet.</p>
                <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-700'}`}>The admin can link a module to this quest in the Course Editor.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom navigation bar ──────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/8"
        style={{ background: isLight ? 'rgba(248,250,252,0.96)' : 'rgba(3,10,20,0.96)', backdropFilter: 'blur(12px)', borderColor: isLight ? 'rgba(100,116,139,0.16)' : 'rgba(255,255,255,0.08)' }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          {/* Learn / Practice toggle */}
          <div className="flex rounded-xl overflow-hidden flex-shrink-0" style={{ border: isLight ? '1px solid rgba(100,116,139,0.16)' : '1px solid rgba(255,255,255,0.1)' }}>
            <div className="px-4 py-2 text-xs font-bold" style={{ background: accent + '22', color: isLight ? '#0f172a' : accent }}>
              📖 Learn
            </div>
            <button onClick={() => navigate(`/c/${slug}/quiz/${questId}`)}
              className={`px-4 py-2 text-xs font-bold transition-all ${isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
              🎯 Practice
            </button>
          </div>

          <div className="flex-1" />

          {/* Prev / slide counter / Next */}
          <button onClick={() => setSlide(s => Math.max(0, s - 1))} disabled={slide === 0}
            className={`w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30 transition-all ${isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/70' : 'text-slate-500 hover:text-white hover:bg-white/8'}`}>
            <ChevronLeft size={16} />
          </button>
          <span className={`text-xs tabular-nums ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>{slide + 1} / {totalSlides}</span>
          {slide < totalSlides - 1 ? (
            <button onClick={() => setSlide(s => Math.min(totalSlides - 1, s + 1))}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70' : 'text-slate-400 hover:text-white hover:bg-white/8'}`}>
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

    </div>
  );
}
