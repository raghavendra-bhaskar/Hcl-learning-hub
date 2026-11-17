import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Check, X, Zap, Trophy, Volume2, Pause, Square } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAppStore } from '../App.jsx';
import { useTTS } from '../lib/useTTS.js';
import AvatarDisplay from '../components/AvatarDisplay.jsx';
import AITutor from '../components/AITutor.jsx';

const OPT_LABELS = { A: 'A', B: 'B', C: 'C', D: 'D' };
const OPT_KEYS   = ['A', 'B', 'C', 'D'];
const OPT_FIELDS = { A: 'optionA', B: 'optionB', C: 'optionC', D: 'optionD' };

/**
 * Cleans up the display title by removing unnecessary prefixes and suffixes.
 * @param {string} value - The title to clean up.
 * @param {string} fallback - The fallback title if the original title is empty.
 * @returns {string} The cleaned up title.
 */
function cleanDisplayTitle(value, fallback = '') {
  return String(value || fallback)
    .replace(/^week\s*\d+\s*[:\-–—]?\s*/i, '')
    .replace(/^module\s*\d+\s*[:\-–—]?\s*/i, '')
    .replace(/^[A-Z]\.[\s-]*/i, '')
    .replace(/\s+learning path$/i, '')
    .replace(/\s+learn and practice$/i, '')
    .trim() || fallback;
}

// Shared quiz page for database-backed course quests.
export default function CourseQuizPage({ embedded = false, onSwitchToLearn }) {
  const { slug, questId } = useParams();
  const navigate  = useNavigate();
  const { theme, playerName, avatar, completeCourseQuest } = useAppStore();
  const isLight = theme === 'light';
  const { speak, cancel, toggle, speaking, paused, rate, changeRate, supported } = useTTS();

  const [course, setCourse]     = useState(null);
  const [quest, setQuest]       = useState(null);
  const [allQuests, setAllQuests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [xpAwarded, setXpAwarded] = useState(0);
  const [autoSpeak, setAutoSpeak] = useState(() => slug !== 'ai-quest');

  useEffect(() => {
    setSelected(null);
    setSubmitted(false);
    setXpAwarded(0);
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
      } catch (e) { setError(e?.message || 'Failed to load quest'); }
      finally { setLoading(false); }
    })();
  }, [slug, questId]);

  const speechText = quest
    ? submitted ? String(quest.explanation || '')
      : [
          "Let's review the scenario.",
          quest.scenario,
          'Then select the correct option below.',
          ...OPT_KEYS.map(letter => `Option ${letter}: ${quest[OPT_FIELDS[letter]] || ''}`),
        ].filter(Boolean).join(' ')
    : '';

  useEffect(() => {
    if (slug === 'ai-quest' || !supported || !autoSpeak || !speechText) return undefined;
    speak(speechText);
    return cancel;
  }, [autoSpeak, cancel, slug, speechText, speak, supported]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white/20 border-t-cyan-400 rounded-full animate-spin" />
    </div>
  );
  if (error || !quest || !course) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-red-400">{error || 'Quest not found'}</p>
      <button onClick={() => navigate('/courses')} className="text-cyan-400 text-sm">← Back to Course Hub</button>
    </div>
  );

  const accent    = course.accentColor || '#06b6d4';
  const accentBg  = { background: accent + '18', border: `1px solid ${accent}30`, color: accent };
  const accentBtn = { background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, boxShadow: `0 8px 32px ${accent}40` };

  const isCorrect   = submitted && selected === quest.correct;
  const isWrong     = submitted && selected !== quest.correct;
  const questIndex  = allQuests.findIndex(q => q.id === questId);
  const displayQuestTitle = cleanDisplayTitle(quest.title, quest.title || `Quest ${questIndex + 1}`);

  const handleSubmit = () => {
    if (!selected) return;
    setSubmitted(true);
    if (selected === quest.correct) {
      const earned = quest.xp || 10;
      setXpAwarded(earned);
      completeCourseQuest(slug, quest.id, 1, earned, { title: quest.title });
    }
  };

  const optionStyle = (letter) => {
    if (!submitted) {
      return selected === letter
        ? { background: accent + '22', border: `2px solid ${accent}`, color: isLight ? '#0f172a' : '#e2e8f0' }
        : { background: isLight ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.03)', border: isLight ? '2px solid rgba(100,116,139,0.16)' : '2px solid rgba(255,255,255,0.08)', color: isLight ? '#334155' : '#94a3b8' };
    }
    if (letter === quest.correct)
      return { background: 'rgba(16,185,129,0.15)', border: '2px solid rgba(16,185,129,0.6)', color: isLight ? '#065f46' : '#6ee7b7' };
    if (letter === selected && letter !== quest.correct)
      return { background: 'rgba(239,68,68,0.12)', border: '2px solid rgba(239,68,68,0.5)', color: isLight ? '#991b1b' : '#fca5a5' };
    return { background: isLight ? 'rgba(255,255,255,0.78)' : 'rgba(255,255,255,0.02)', border: isLight ? '2px solid rgba(100,116,139,0.14)' : '2px solid rgba(255,255,255,0.05)', color: isLight ? '#475569' : '#475569' };
  };

  const voiceControls = slug !== 'ai-quest' && supported && (
    <div className="mx-auto mt-4 flex max-w-6xl flex-wrap items-center gap-2 px-4">
      <button type="button" onClick={() => speak(speechText)} disabled={!speechText} title="Play voice" className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs disabled:opacity-40"><Volume2 size={14} /> Play voice</button>
      <button type="button" onClick={toggle} disabled={!speaking} title={paused ? 'Resume voice' : 'Pause voice'} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs disabled:opacity-40"><Pause size={13} /> {paused ? 'Resume' : 'Pause'}</button>
      <button type="button" onClick={cancel} disabled={!speaking && !paused} title="Stop voice" className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs disabled:opacity-40"><Square size={13} /> Stop</button>
      <label className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-2 py-2 text-xs">Speed
        <select value={rate} onChange={event => changeRate(Number(event.target.value))} aria-label="Voice speed" className="bg-transparent">
          {[0.75, 0.9, 1, 1.15, 1.3, 1.5].map(speed => <option key={speed} value={speed}>{speed.toFixed(2).replace(/0$/, '')}x</option>)}
        </select>
      </label>
      <label className="inline-flex items-center gap-2 px-1 text-xs text-slate-400"><input type="checkbox" checked={autoSpeak} onChange={event => setAutoSpeak(event.target.checked)} /> Auto-play step audio</label>
    </div>
  );

  return (
    <div className={`min-h-screen pb-24 ${embedded ? 'w-full' : ''}`} style={{ background: isLight ? 'linear-gradient(160deg, #f0f9ff 0%, #f8fafc 60%, #eef2ff 100%)' : undefined }}>
      {/* Header with the course title plus direct actions for Course Home and Quests. */}
      {embedded ? (
        <div className="max-w-6xl mx-auto px-4 pt-5">
          <div className="inline-flex rounded-xl overflow-hidden border border-white/10">
            <button onClick={onSwitchToLearn} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white">📖 Learn</button>
            <span className="px-4 py-2 text-xs font-bold text-cyan-300 bg-cyan-500/15">🎯 Practice</span>
          </div>
        </div>
      ) : <header className="sticky top-0 z-40 backdrop-blur-md border-b" style={{ background: isLight ? 'rgba(248,250,252,0.94)' : 'rgba(3,10,20,0.88)', borderColor: isLight ? 'rgba(71,85,105,0.18)' : 'rgba(255,255,255,0.05)' }}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className={`flex items-center gap-1.5 text-xs transition-colors ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}>
            <ArrowLeft size={14} /> Back
          </button>
          <span className="text-slate-500">/</span>
          <span className={`text-xs font-bold font-orbitron truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>{course.title}</span>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => navigate(`/c/${slug}`)}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors border ${isLight ? 'text-slate-700 hover:text-slate-900' : 'text-slate-300 hover:text-white'}`}
              style={{ borderColor: isLight ? 'rgba(148,163,184,0.22)' : 'rgba(255,255,255,0.08)' }}>
              Course Home
            </button>
            <button onClick={() => navigate(`/c/${slug}/quests`)}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors border ${isLight ? 'text-slate-700 hover:text-slate-900' : 'text-slate-300 hover:text-white'}`}
              style={{ borderColor: isLight ? 'rgba(148,163,184,0.22)' : 'rgba(255,255,255,0.08)' }}>
              Quests
            </button>
            <span className="text-[11px] text-slate-500">
              {questIndex + 1} / {allQuests.length}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={accentBg}>
              ⚡ {quest.xp} XP
            </span>
          </div>
        </div>
      </header>}
      {voiceControls}

      {/* Progress bar */}
      <div className="w-full h-1" style={{ background: isLight ? 'rgba(148,163,184,0.18)' : 'rgba(255,255,255,0.05)' }}>
        <div className="h-full transition-all duration-500"
          style={{ width: `${((questIndex + 1) / allQuests.length) * 100}%`, background: `linear-gradient(90deg, ${accent}, ${accent}cc)` }} />
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-10">
        <AITutor key={slug} courseSlug={slug} />
        <div className="mx-auto grid max-w-4xl gap-6">
          <div className="min-w-0">
            <div className="mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}>
                Quest {questIndex + 1} · {course.title}
              </span>
            </div>
            <h1 className={`text-xl font-bold mb-8 ${isLight ? 'text-slate-900' : 'text-white'}`}>{displayQuestTitle}</h1>

            <div className="rounded-2xl p-6 mb-8 border"
              style={{ background: isLight ? 'rgba(255,255,255,0.82)' : accent + '06', border: isLight ? '1px solid rgba(100,116,139,0.14)' : `1px solid ${accent}25` }}>
              <p className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: accent }}>
                📋 Scenario
              </p>
              <p className={`leading-relaxed ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{quest.scenario}</p>
            </div>

            <div className="space-y-3 mb-8">
              {OPT_KEYS.map(letter => (
                <button
                  key={letter}
                  onClick={() => !submitted && setSelected(letter)}
                  disabled={submitted}
                  className="w-full text-left p-4 rounded-xl transition-all active:scale-[0.99] disabled:cursor-default"
                  style={optionStyle(letter)}
                >
                  <div className="flex items-center gap-4">
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0"
                      style={{ background: isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.08)', color: isLight ? '#0f172a' : undefined }}>
                      {letter}
                    </span>
                    <span className="flex-1 text-sm leading-relaxed">{quest[OPT_FIELDS[letter]]}</span>
                    {submitted && letter === quest.correct && <Check size={18} className="text-emerald-400 flex-shrink-0" />}
                    {submitted && letter === selected && letter !== quest.correct && <X size={18} className="text-red-400 flex-shrink-0" />}
                  </div>
                </button>
              ))}
            </div>

            {!submitted ? (
              <button onClick={handleSubmit} disabled={!selected}
                className="w-full py-4 rounded-2xl font-bold text-lg text-white disabled:opacity-40 transition-all active:scale-[0.99]"
                style={accentBtn}>
                Submit Answer
              </button>
            ) : (
              <div className="space-y-4">
                <div className={`rounded-2xl p-5 ${isCorrect ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                  <div className="flex items-center gap-3 mb-3">
                    {isCorrect
                      ? <><Check size={20} className="text-emerald-400" /><span className="font-bold text-emerald-400 text-lg">Correct!</span></>
                      : <><X size={20} className="text-red-400" /><span className="font-bold text-red-400 text-lg">Incorrect</span></>}
                    {isCorrect && <span className="ml-auto flex items-center gap-1.5 text-sm font-bold text-amber-400"><Zap size={14} /> +{xpAwarded} XP</span>}
                    {isWrong && <span className={`ml-auto text-sm ${isLight ? 'text-slate-700' : 'text-slate-500'}`}>Correct: Option {quest.correct}</span>}
                  </div>
                  <p className={`text-[11px] font-bold uppercase tracking-widest mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-500'}`}>Expert Explanation</p>
                  <p className={`text-sm leading-relaxed ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>{quest.explanation}</p>
                </div>
                {playerName && <div className="flex items-center gap-3 glass-card rounded-xl p-4">
                  {avatar && <AvatarDisplay avatar={avatar} size="sm" />}
                  <p className={`flex-1 text-xs ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>{isCorrect ? `Mission accomplished, ${playerName}! +${xpAwarded} XP added to your score.` : `Don't give up, ${playerName}! Review the explanation and try the next quest.`}</p>
                </div>}
                <button onClick={() => navigate(`/c/${slug}/quests`)} className="w-full py-3.5 rounded-xl font-bold text-sm text-white" style={accentBtn}>
                  <Trophy size={16} className="inline mr-2" />Return to Quests
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
