import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, ChevronRight, Pause, Square, Volume2, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAppStore } from '../App.jsx';
import { useTTS } from '../lib/useTTS.js';
import { canEmbedResource, getEmbedUrl, isNativeVideoResource, isYouTubeUrl, resolvePlayableUrl } from '../lib/learningResourceEmbeds.js';

const OPTIONS = ['A', 'B', 'C', 'D'];
const DEFAULT_STEP_VIDEO_URL = 'https://drive.google.com/file/d/1-ms4MaOTQun3OpJz6R6jdXg36pgmhyLx/view?usp=vids_web';
const DEFAULT_STEP_VIDEO_DURATION_SECONDS = 981;
let youtubeApiPromise;

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!youtubeApiPromise) {
    youtubeApiPromise = new Promise((resolve, reject) => {
      const previousReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previousReady?.();
        resolve(window.YT);
      };
      let script = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.onerror = reject;
        document.head.appendChild(script);
      }
    });
  }
  return youtubeApiPromise;
}

function getYouTubeVideoId(url) {
  return url?.match(/(?:embed\/|v=|youtu\.be\/)([^?&/]+)/i)?.[1] || null;
}

function getResourceIdentity(resource) {
  if (resource.isPlaceholder) return `placeholder:${resource.stepIndex}`;
  const url = resolvePlayableUrl(resource);
  const videoId = getYouTubeVideoId(url);
  return videoId ? `youtube:${videoId}` : url.split('?')[0];
}

function getDurationResourceIdentity(resource) {
  if (!resource) return '';
  const url = resolvePlayableUrl(resource);
  const videoId = getYouTubeVideoId(url);
  return videoId ? `youtube:${videoId}` : url.split('?')[0];
}

function getMeasuredStepDuration(step, durationByStep, durationResourceByStep) {
  const resource = step?.resourceList?.find(canEmbedResource);
  if (!resource) return 0;
  const identity = getDurationResourceIdentity(resource);
  const measured = identity && durationResourceByStep[step.key] === identity ? durationByStep[step.key] || 0 : 0;
  const configured = Number(resource.durationSeconds);
  const defaultPlaceholder = resource.isPlaceholder && resolvePlayableUrl(resource) === DEFAULT_STEP_VIDEO_URL
    ? DEFAULT_STEP_VIDEO_DURATION_SECONDS
    : 0;
  return measured || (configured > 0 ? configured : defaultPlaceholder);
}

function makeStepVideoPlaceholder(stepIndex) {
  return {
    id: `placeholder-video-${stepIndex}`,
    type: 'youtube',
    label: `Placeholder video · Step ${stepIndex + 1}`,
    url: DEFAULT_STEP_VIDEO_URL,
    durationSeconds: DEFAULT_STEP_VIDEO_DURATION_SECONDS,
    order: stepIndex,
    stepIndex,
    isPlaceholder: true,
  };
}

function formatDuration(seconds) {
  const totalSeconds = Math.ceil(Math.max(0, Number(seconds) || 0));
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;
  if (hours) return `${hours}h${minutes ? ` ${minutes}m` : ''}${remainingSeconds ? ` ${remainingSeconds}s` : ''}`;
  return `${minutes}m${remainingSeconds ? ` ${remainingSeconds}s` : ''}`;
}

function estimateStepSeconds(step, quest) {
  if (step.type === 'quiz') return Math.max(60, quest.questions.length * 60);
  const words = String(step.content || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(30, Math.ceil(words / 200 * 60));
}

function uniqueByText(items, getText) {
  const seen = new Set();
  return items.filter(item => {
    const key = String(getText(item) || '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeResource(resource, index) {
  if (typeof resource === 'string') return { id: `resource-${index}`, label: resource, url: resource, type: 'link', order: null };
  if (!resource || typeof resource !== 'object') return null;
  const order = Number(resource.order);
  const stepIndex = Number(resource.stepIndex);
  return {
    ...resource,
    id: resource.id || `resource-${index}`,
    label: String(resource.label ?? resource.title ?? `Resource ${index + 1}`),
    url: String(resource.url ?? ''),
    type: resource.type || 'link',
    order: Number.isFinite(order) ? order : null,
    stepIndex: resource.stepIndex !== null && resource.stepIndex !== undefined && Number.isInteger(stepIndex) && stepIndex >= 0 ? stepIndex : null,
    isPlaceholder: Boolean(resource.isPlaceholder),
  };
}

function hasQuestionData(quest) {
  return Boolean(quest?.correct) && OPTIONS.filter(letter => String(quest[`option${letter}`] || '').trim()).length >= 2;
}

function getQuestSteps(quest, module, { includeModuleTopics = true, hideScenario = false } = {}) {
  const inlineTopics = Array.isArray(quest.learnTopics)
    ? quest.learnTopics
        .map((topic, index) => typeof topic === 'string' ? { content: topic, order: index } : topic)
        .filter(topic => topic && !topic.isSolutionRequest && String(topic.content ?? topic.text ?? topic.body ?? '').trim())
        .map((topic, index) => ({
          content: String(topic.content ?? topic.text ?? topic.body ?? '').trim(),
          id: topic.id || `${quest.id}-topic-${index}`,
          resourceOrder: Number.isFinite(Number(topic.order)) ? Number(topic.order) : index,
        }))
    : [];
  const topics = inlineTopics.length
    ? inlineTopics
    : (includeModuleTopics ? module?.topics || [] : []).map((topic, index) => ({
        content: String(typeof topic === 'string' ? topic : topic?.content || '').trim(),
        id: topic?.id || `${quest.id}-module-topic-${index}`,
        resourceOrder: Number(topic?.order ?? index),
      })).filter(topic => topic.content);
  const scenario = String(quest.scenario || 'No learning content available yet.').trim();
  const slides = uniqueByText([
    ...(hideScenario ? [] : [{ type: 'scenario', label: scenario, content: scenario, resourceOrder: 0 }]),
    ...topics.map(topic => ({ type: 'topic', label: topic.content, ...topic })),
  ], slide => slide.content);
  const rawResources = Array.isArray(quest.learnResources) && quest.learnResources.length
    ? quest.learnResources
    : includeModuleTopics ? module?.resources || [] : [];
  const resources = rawResources.map(normalizeResource).filter(resource => resource?.label || resource?.url);
  const playableResources = resources.filter(canEmbedResource);
  const legacyVideoResources = playableResources.filter(resource => resource.stepIndex === null);
  const firstTopicIndex = slides.findIndex(slide => slide.type === 'topic');
  const legacyVideoStartIndex = firstTopicIndex < 0 ? 0 : firstTopicIndex;

  return slides.map((slide, slideIndex) => {
    const explicitVideo = playableResources.find(resource => resource.stepIndex === slideIndex && !resource.isPlaceholder)
      || playableResources.find(resource => resource.stepIndex === slideIndex);
    const legacyVideoIndex = slideIndex - legacyVideoStartIndex;
    const video = explicitVideo
      || (legacyVideoIndex >= 0 ? legacyVideoResources[legacyVideoIndex] : null)
      || makeStepVideoPlaceholder(slideIndex);
    const otherResources = resources.filter(resource => !canEmbedResource(resource) && resource.order === slide.resourceOrder);
    return {
      ...slide,
      key: `${quest.id}:${slide.type}:${slide.id || slideIndex}`,
      questId: quest.id,
      questTitle: quest.title || 'Learning Quest',
      resourceList: [...otherResources, video],
      slideIndex,
    };
  });
}

function cleanTitle(value) {
  return String(value || 'Learning Quest')
    .replace(/^week\s*\d+\s*[:\-–—]?\s*/i, '')
    .replace(/^module\s*\d+\s*[:\-–—]?\s*/i, '')
    .replace(/\s+learning path$/i, '')
    .trim();
}

function buildSessionQuests(quests, slug) {
  const groups = [];
  const questionGroups = new Map();

  quests.forEach((quest, index) => {
    const match = slug === 'devops-loop'
      ? String(quest.title || '').match(/^(.*?)\s+[—–-]\s+Q(\d+)$/i)
      : null;
    if (!match) {
      groups.push({ title: quest.title, learnQuest: quest, questions: hasQuestionData(quest) ? [{ quest, order: index }] : [], firstIndex: index });
      return;
    }

    const title = match[1].trim();
    const key = `${quest.moduleId || ''}:${title.toLowerCase()}`;
    let group = questionGroups.get(key);
    if (!group) {
      group = { title, learnQuest: quest, questions: [], firstIndex: index };
      questionGroups.set(key, group);
      groups.push(group);
    }
    if (hasQuestionData(quest)) group.questions.push({ quest, order: Number(match[2]) });
  });

  return groups.sort((left, right) => left.firstIndex - right.firstIndex).map(group => ({
    ...group,
    questions: group.questions.length
      ? group.questions.sort((left, right) => left.order - right.order).map(item => item.quest)
      : group.questions,
  }));
}

export default function CourseSessionPage() {
  const { slug, mode } = useParams();
  const navigate = useNavigate();
  const { theme, completeCourseQuest, courseCompletedQuests } = useAppStore();
  const { speak, cancel, toggle, speaking, paused, rate, changeRate, supported } = useTTS();
  const isLight = theme === 'light';
  const isPractice = mode === 'practice';
  const progressKey = `course-session-progress:${slug}:${mode}`;
  const [course, setCourse] = useState(null);
  const [quests, setQuests] = useState([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState('learn');
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [completedStepKeys, setCompletedStepKeys] = useState([]);
  const [completedQuestionIds, setCompletedQuestionIds] = useState([]);
  const [durationByStep, setDurationByStep] = useState({});
  const [durationResourceByStep, setDurationResourceByStep] = useState({});
  const [lastEndedVideo, setLastEndedVideo] = useState(null);
  const [videoPlaybackError, setVideoPlaybackError] = useState('');
  const [expandedQuestIndexes, setExpandedQuestIndexes] = useState([0]);
  const [activeResource, setActiveResource] = useState(null);
  const youtubeContainerRef = useRef(null);
  const youtubePlayerRef = useRef(null);
  const advancedStepKeys = useRef(new Set());
  const pendingProgress = useRef(null);
  const loadedProgressKey = useRef('');
  const [loading, setLoading] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [restoringProgress, setRestoringProgress] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSessionReady(false);
    setError('');
    (async () => {
      try {
        const loadedCourse = await api.get(`/courses-api/${slug}`);
        const loadedQuests = await api.get(`/courses-api/${loadedCourse.id}/quests`);
        if (cancelled) return;
        setCourse(loadedCourse);
        setQuests(Array.isArray(loadedQuests) ? loadedQuests : []);
        let saved = {};
        try { saved = JSON.parse(window.localStorage.getItem(progressKey) || '{}'); } catch { saved = {}; }
        loadedProgressKey.current = progressKey;
        pendingProgress.current = saved;
        setRestoringProgress(true);
        setStepIndex(Number.isInteger(saved.stepIndex) && saved.stepIndex >= 0 ? saved.stepIndex : 0);
        setPhase(isPractice && saved.phase === 'quiz' ? 'quiz' : 'learn');
        setSelected(typeof saved.selected === 'string' ? saved.selected : null);
        setSubmitted(Boolean(saved.submitted));
        setQuestionIndex(Number.isInteger(saved.questionIndex) && saved.questionIndex >= 0 ? saved.questionIndex : 0);
        setCompletedStepKeys(Array.isArray(saved.completedStepKeys) ? saved.completedStepKeys.filter(value => typeof value === 'string') : []);
        setCompletedQuestionIds(Array.isArray(saved.completedQuestionIds) ? saved.completedQuestionIds.filter(value => typeof value === 'string') : []);
        setDurationByStep(Object.fromEntries(Object.entries(saved.durationByStep || {}).filter(([, seconds]) => Number.isFinite(seconds) && seconds > 0)));
        setDurationResourceByStep(Object.fromEntries(Object.entries(saved.durationResourceByStep || {}).filter(([, identity]) => typeof identity === 'string' && identity)));
        setLastEndedVideo(saved.lastEndedVideo && typeof saved.lastEndedVideo.identity === 'string' ? saved.lastEndedVideo : null);
        setSessionReady(true);
      } catch (loadError) {
        if (!cancelled) setError(loadError?.message || 'Could not load course content');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isPractice, progressKey, slug]);

  const moduleMap = useMemo(() => Object.fromEntries((course?.weeks || []).flatMap(week =>
    (week.modules || []).map(module => [module.id, module]))), [course]);
  const sessionQuests = useMemo(() => buildSessionQuests(quests, slug), [quests, slug]);
  const correctQuestionProgress = courseCompletedQuests?.[slug] || {};
  const steps = useMemo(() => {
    const seenModules = new Set();
    let quizNumber = 0;
    return sessionQuests.flatMap((sessionQuest, questIndex) => {
      const quest = sessionQuest.learnQuest;
      const moduleKey = quest.moduleId || `quest:${quest.id}`;
      const includeModuleTopics = !seenModules.has(moduleKey);
      seenModules.add(moduleKey);
      const hideScenario = slug === 'devops-loop' && /\s+[—–-]\s+Q\d+$/i.test(String(quest.title || ''));
      const lessonSteps = isPractice ? [] : getQuestSteps(quest, moduleMap[quest.moduleId], { includeModuleTopics, hideScenario })
        .map(step => ({ ...step, questIndex, questTitle: sessionQuest.title }));
      const quizSteps = sessionQuest.questions.length ? [{
        key: `${quest.id}:quiz`,
        content: '',
        label: `Quiz ${++quizNumber}: ${cleanTitle(sessionQuest.title)}`,
        type: 'quiz',
        quizNumber,
        questId: quest.id,
        questTitle: sessionQuest.title,
        questIndex,
        resourceList: [],
      }] : [];
      return isPractice ? quizSteps : [...lessonSteps, ...quizSteps];
    });
  }, [sessionQuests, moduleMap, slug, isPractice]);
  const questStepGroups = useMemo(() => sessionQuests.map((quest, questIndex) => {
    const questSteps = steps.map((step, index) => ({ ...step, index })).filter(step => step.questIndex === questIndex);
    const completedCount = questSteps.filter(step => step.type === 'quiz'
      ? quest.questions.length > 0 && quest.questions.every(question => correctQuestionProgress[question.id])
      : completedStepKeys.includes(step.key)).length;
    const durationSeconds = questSteps.reduce((total, step) => total + (getMeasuredStepDuration(step, durationByStep, durationResourceByStep) || estimateStepSeconds(step, quest)), 0);
    return { quest, questIndex, steps: questSteps, completedCount, durationSeconds };
  }), [completedStepKeys, correctQuestionProgress, durationByStep, durationResourceByStep, sessionQuests, steps]);
  const currentStep = steps[stepIndex] || null;
  const currentSessionQuest = currentStep ? sessionQuests[currentStep.questIndex] : null;
  const currentQuestion = currentSessionQuest?.questions[questionIndex] || currentSessionQuest?.questions[0] || null;
  const practiceSpeechText = currentQuestion
    ? submitted ? String(currentQuestion.explanation || '')
      : ["Let's review the scenario.", currentQuestion.scenario, 'Then select the correct option below.',
          ...OPTIONS.map(letter => `Option ${letter}: ${currentQuestion[`option${letter}`] || ''}`)].filter(Boolean).join(' ')
    : '';
  const resources = currentStep?.resourceList || [];
  const completed = !loading && !error && steps.length > 0 && stepIndex >= steps.length;
  const completedStepCount = steps.filter(step => step.type === 'quiz'
    ? (sessionQuests[step.questIndex]?.questions || []).length > 0
      && sessionQuests[step.questIndex].questions.every(question => correctQuestionProgress[question.id])
    : completedStepKeys.includes(step.key)).length;
  const completionPercent = steps.length ? Math.round(completedStepCount / steps.length * 100) : 0;
  const accent = course?.accentColor || '#06b6d4';
  const primaryText = isLight ? 'text-slate-900' : 'text-white';
  const bodyText = isLight ? 'text-slate-700' : 'text-slate-300';
  const mutedText = isLight ? 'text-slate-600' : 'text-slate-400';
  const panelBorder = isLight ? 'border-slate-200' : 'border-white/10';

  useEffect(() => {
    if (!isPractice || phase !== 'quiz' || !supported || !practiceSpeechText) return undefined;
    speak(practiceSpeechText);
    return cancel;
  }, [cancel, isPractice, phase, practiceSpeechText, speak, supported]);

  const recordStepDuration = useCallback((stepKey, seconds, resourceIdentity) => {
    if (!stepKey || !Number.isFinite(seconds) || seconds <= 0 || !resourceIdentity) return;
    setDurationByStep(previous => previous[stepKey] === seconds ? previous : { ...previous, [stepKey]: seconds });
    setDurationResourceByStep(previous => previous[stepKey] === resourceIdentity ? previous : { ...previous, [stepKey]: resourceIdentity });
  }, []);

  useEffect(() => {
    if (!currentStep) return;
    setExpandedQuestIndexes(previous => previous.includes(currentStep.questIndex) ? previous : [...previous, currentStep.questIndex]);
  }, [currentStep?.questIndex]);
  useEffect(() => {
    if (!sessionReady || !restoringProgress) return;
    const saved = pendingProgress.current || {};
    const savedStepIndex = steps.findIndex(step => step.key === saved.currentStepKey);
    const fallbackIndex = Number.isInteger(saved.stepIndex) ? Math.min(saved.stepIndex, steps.length) : 0;
    setStepIndex(savedStepIndex >= 0 ? savedStepIndex : fallbackIndex);
    pendingProgress.current = null;
    setRestoringProgress(false);
  }, [restoringProgress, sessionReady, steps]);
  useEffect(() => {
    if (!sessionReady || restoringProgress || loadedProgressKey.current !== progressKey) return;
    try {
      window.localStorage.setItem(progressKey, JSON.stringify({
        stepIndex,
        currentStepKey: currentStep?.key || null,
        phase,
        selected,
        submitted,
        questionIndex,
        completedStepKeys,
        completedQuestionIds,
        durationByStep,
        durationResourceByStep,
        lastEndedVideo,
      }));
    } catch { /* Continue without persisted progress if storage is unavailable. */ }
  }, [completedQuestionIds, completedStepKeys, currentStep?.key, durationByStep, durationResourceByStep, lastEndedVideo, phase, progressKey, questionIndex, restoringProgress, selected, sessionReady, stepIndex, submitted]);

  const advanceStep = useCallback(() => {
    if (!currentStep || advancedStepKeys.current.has(currentStep.key)) return;
    advancedStepKeys.current.add(currentStep.key);
    setCompletedStepKeys(previous => previous.includes(currentStep.key) ? previous : [...previous, currentStep.key]);
    if (stepIndex + 1 < steps.length) {
      setStepIndex(stepIndex + 1);
      setActiveResource(null);
      return;
    }
    setStepIndex(steps.length);
  }, [currentStep, stepIndex, steps]);

  const candidateResource = resources.find(resource => resource.id === activeResource?.id)
    || resources.find(resource => canEmbedResource(resource)) || null;
  const candidateResourceIdentity = candidateResource ? getResourceIdentity(candidateResource) : '';
  const selectedResource = !activeResource && !candidateResource?.isPlaceholder && lastEndedVideo?.identity === candidateResourceIdentity && stepIndex > lastEndedVideo.stepIndex
    ? null
    : candidateResource;
  const resolvedResourceUrl = selectedResource ? resolvePlayableUrl(selectedResource) : '';
  const durationResourceIdentity = getDurationResourceIdentity(selectedResource);
  const nativeVideo = selectedResource ? isNativeVideoResource(selectedResource) : false;
  const videoSource = resolvedResourceUrl;
  const embedUrl = selectedResource && !nativeVideo ? getEmbedUrl(selectedResource, { autoplay: true }) : null;
  const youtubeVideo = selectedResource ? isYouTubeUrl(resolvePlayableUrl(selectedResource)) : false;
  const youtubeVideoId = youtubeVideo ? getYouTubeVideoId(resolvePlayableUrl(selectedResource)) : null;

  const handleVideoEnded = useCallback(() => {
    if (!currentStep || !candidateResourceIdentity) return;
    setLastEndedVideo({ identity: candidateResourceIdentity, stepIndex });
    advanceStep();
  }, [advanceStep, candidateResourceIdentity, currentStep?.key, stepIndex]);

  useEffect(() => {
    setVideoPlaybackError('');
  }, [currentStep?.key, selectedResource?.id]);

  useEffect(() => {
    if (!youtubeVideo || phase !== 'learn' || !youtubeVideoId) return undefined;
    let disposed = false;
    let player;
    let durationPoll;
    let playbackWatchdog;
    let playbackStarted = false;
    loadYouTubeApi().then(YT => {
      if (disposed || !youtubeContainerRef.current) return;
      const mountNode = document.createElement('div');
      youtubeContainerRef.current.replaceChildren(mountNode);
      player = new YT.Player(mountNode, {
        width: '100%',
        height: '100%',
        videoId: youtubeVideoId,
        playerVars: { autoplay: 1, controls: 1, enablejsapi: 1, origin: window.location.origin, rel: 0 },
        events: {
          onReady: () => {
            player.unMute();
            player.playVideo();
            playbackWatchdog = window.setTimeout(() => {
              if (!disposed && !playbackStarted) setVideoPlaybackError('Video did not start. Use the player controls or open it in YouTube.');
            }, 12000);
            durationPoll = window.setInterval(() => {
              const duration = player.getDuration();
              if (duration > 0) {
                recordStepDuration(currentStep.key, duration, durationResourceIdentity);
                window.clearInterval(durationPoll);
              }
            }, 500);
          },
          onStateChange: event => {
            const duration = player.getDuration();
            if (duration > 0) recordStepDuration(currentStep.key, duration, durationResourceIdentity);
            if (event.data === YT.PlayerState.PLAYING) {
              playbackStarted = true;
              window.clearTimeout(playbackWatchdog);
              setVideoPlaybackError('');
            }
            if (!disposed && event.data === YT.PlayerState.ENDED) handleVideoEnded();
          },
          onError: () => {
            if (!disposed) setVideoPlaybackError('This video could not be played here. Open it in YouTube or choose another resource.');
          },
        },
      });
      youtubePlayerRef.current = player;
    }).catch(() => {});
    return () => {
      disposed = true;
      window.clearInterval(durationPoll);
      window.clearTimeout(playbackWatchdog);
      player?.destroy();
      youtubeContainerRef.current?.replaceChildren();
      youtubePlayerRef.current = null;
    };
  }, [currentStep?.key, durationResourceIdentity, handleVideoEnded, phase, recordStepDuration, selectedResource?.id, youtubeVideo, youtubeVideoId]);

  useEffect(() => {
    if (phase !== 'learn' || !currentStep || selectedResource || currentStep.type === 'quiz' || currentStep.content.trim()) return undefined;
    const timer = window.setTimeout(advanceStep, 5000);
    return () => window.clearTimeout(timer);
  }, [advanceStep, currentStep, phase, selectedResource]);

  const goToStep = (index) => {
    advancedStepKeys.current.delete(steps[index]?.key);
    setLastEndedVideo(null);
    setStepIndex(index);
    setPhase('learn');
    setSelected(null);
    setSubmitted(false);
    setQuestionIndex(0);
    setActiveResource(null);
  };

  const submitAnswer = () => {
    if (!selected || !currentQuestion || submitted) return;
    setSubmitted(true);
    if (selected === currentQuestion.correct) {
      setCompletedQuestionIds(previous => previous.includes(currentQuestion.id) ? previous : [...previous, currentQuestion.id]);
      completeCourseQuest(slug, currentQuestion.id, 1, currentQuestion.xp || 10, { title: currentQuestion.title });
    }
  };

  const continueQuestion = () => {
    if (questionIndex + 1 < (currentSessionQuest?.questions.length || 0)) {
      setQuestionIndex(index => index + 1);
      setSelected(null);
      setSubmitted(false);
      return;
    }
    const allQuestionsCorrect = currentSessionQuest?.questions.every(question => correctQuestionProgress[question.id]);
    if (allQuestionsCorrect) {
      setCompletedStepKeys(previous => currentStep && !previous.includes(currentStep.key) ? [...previous, currentStep.key] : previous);
    }
    continueAfterPractice();
  };

  const continueAfterPractice = () => {
    const nextStepIndex = steps.findIndex(step => step.questIndex > (currentStep?.questIndex ?? -1));
    if (nextStepIndex < 0) {
      setStepIndex(steps.length);
      setPhase('learn');
      return;
    }
    goToStep(nextStepIndex);
  };

  const skipQuiz = () => {
    continueAfterPractice();
  };

  const startQuiz = () => {
    setQuestionIndex(0);
    setSelected(null);
    setSubmitted(false);
    setPhase('quiz');
  };

  if (slug === 'ai-quest') return <Navigate to="/ai-quest" replace />;
  if (mode !== 'learn' && mode !== 'practice') return <Navigate to={`/c/${slug}`} replace />;

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-white/20 border-t-cyan-400 rounded-full animate-spin" /></div>;
  if (error || !course) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-red-400">{error || 'Course not found'}</p>
      <button onClick={() => navigate(`/c/${slug}`)} className="text-cyan-400 text-sm">Back to Course</button>
    </div>
  );

  return (
    <main className="h-[100dvh] overflow-hidden flex flex-col" style={{ background: isLight ? '#f8fafc' : '#030712' }}>
      <header className="z-30 flex-shrink-0 border-b px-3 py-2 md:px-5" style={{ background: isLight ? 'rgba(248,250,252,.96)' : 'rgba(3,7,18,.96)', borderColor: isLight ? '#cbd5e1' : 'rgba(255,255,255,.08)' }}>
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center gap-2">
          <button onClick={() => navigate(-1)} className={`inline-flex items-center gap-1.5 px-2 py-2 text-xs ${mutedText} ${isLight ? 'hover:text-slate-900' : 'hover:text-white'}`}><ArrowLeft size={14} /> Back</button>
          <strong className="mr-auto text-sm" style={{ color: accent }}>{course.title} · {isPractice ? 'Continuous Practice' : 'Continuous Learning'}</strong>
          <button onClick={() => navigate(`/c/${slug}`)} className={`px-3 py-2 rounded-lg text-xs border ${panelBorder} ${bodyText}`}>Course Home</button>
        </div>
        {isPractice && supported && <div className={`max-w-[1600px] mx-auto mt-2 flex flex-wrap items-center gap-2 border-t pt-2 ${panelBorder}`}>
          <button type="button" onClick={() => speak(practiceSpeechText)} disabled={!practiceSpeechText} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40 ${panelBorder} ${bodyText}`}><Volume2 size={13} /> Play voice</button>
          <button type="button" onClick={toggle} disabled={!speaking} title={paused ? 'Resume voice' : 'Pause voice'} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40 ${panelBorder} ${bodyText}`}><Pause size={13} /> {paused ? 'Resume' : 'Pause'}</button>
          <button type="button" onClick={cancel} disabled={!speaking && !paused} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40 ${panelBorder} ${bodyText}`}><Square size={12} /> Stop</button>
          <label className={`inline-flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs ${panelBorder} ${bodyText}`}>Speed
            <select value={rate} onChange={event => changeRate(Number(event.target.value))} aria-label="Voice speed" className={`bg-transparent ${primaryText}`}>
              {[0.75, 0.9, 1, 1.15, 1.3, 1.5].map(speed => <option key={speed} value={speed}>{speed.toFixed(2).replace(/0$/, '')}x</option>)}
            </select>
          </label>
          <label className={`inline-flex items-center gap-2 px-1 text-xs ${mutedText}`}><input type="checkbox" checked readOnly /> Auto-play step audio</label>
        </div>}
        <div className={`max-w-[1600px] mx-auto mt-2 h-1 rounded-full overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-white/5'}`}>
          <div className="h-full transition-all" style={{ width: `${steps.length ? Math.min(100, ((stepIndex + 1) / steps.length) * 100) : 0}%`, background: accent }} />
        </div>
      </header>

      {completed ? (
        <section className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <Check size={42} style={{ color: accent }} />
          <h1 className={`text-2xl font-bold ${primaryText}`}>{completionPercent === 100 ? (isPractice ? 'Practice complete' : 'Learning path complete') : 'Session ended'}</h1>
          <p className={`text-sm ${mutedText}`}>{completedStepCount} of {steps.length} steps complete · {completionPercent}%</p>
          <div className="flex gap-2">
            <button onClick={() => navigate(`/c/${slug}`)} className="px-5 py-3 rounded-xl text-sm font-bold text-white" style={{ background: accent }}>Return to Course</button>
              <button onClick={() => {
              window.localStorage.removeItem(progressKey);
              setStepIndex(0); setPhase('learn'); setQuestionIndex(0); setSelected(null); setSubmitted(false);
              setCompletedStepKeys([]); setCompletedQuestionIds([]);
              setDurationByStep({}); setDurationResourceByStep({}); setLastEndedVideo(null); setVideoPlaybackError(''); setActiveResource(null);
              advancedStepKeys.current.clear();
            }} className={`px-5 py-3 rounded-xl text-sm font-bold border ${panelBorder} ${bodyText}`}>Start over</button>
          </div>
        </section>
      ) : !currentStep || !currentSessionQuest || (phase === 'quiz' && !currentQuestion) ? (
        <section className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <p className={mutedText}>This course has no quests to play yet.</p>
          <button onClick={() => navigate(`/c/${slug}/quests`)} className={`px-4 py-2 rounded-lg border text-sm ${panelBorder} ${bodyText}`}>View Quests</button>
        </section>
      ) : (
        <section className="flex-1 min-h-0 w-full max-w-[1600px] mx-auto p-3 md:p-5 grid grid-rows-[minmax(0,1fr)_minmax(220px,0.8fr)] gap-4 overflow-hidden lg:grid-rows-1 lg:grid-cols-[minmax(0,1.5fr)_minmax(360px,0.8fr)]">
          <div className={`min-w-0 min-h-0 h-full flex flex-col rounded-xl overflow-hidden border ${panelBorder}`} style={{ background: isLight ? '#ffffff' : '#000000' }}>
            <div className={`flex items-center justify-between gap-3 px-4 py-3 border-b ${panelBorder}`} style={{ background: isLight ? '#f1f5f9' : 'rgba(255,255,255,.03)' }}>
              <p className={`truncate text-xs font-semibold ${bodyText}`}>{phase === 'quiz' || currentStep.type === 'quiz' ? currentStep.label : selectedResource?.label || (currentStep.content.trim() ? 'Lesson notes' : 'Lesson video')}</p>
              <span className="flex-shrink-0 text-[11px] text-slate-500">{formatDuration(getMeasuredStepDuration(currentStep, durationByStep, durationResourceByStep) || estimateStepSeconds(currentStep, currentSessionQuest))}</span>
            </div>
            {phase === 'quiz' ? (
              <div className="flex-1 min-h-0 overflow-y-auto p-5 md:p-8">
                <p className="text-[10px] uppercase tracking-widest text-slate-500">Quest {currentStep.questIndex + 1} of {sessionQuests.length} · Question {questionIndex + 1} of {currentSessionQuest.questions.length}</p>
                <h1 className={`mt-2 text-xl font-bold ${primaryText}`}>{cleanTitle(currentSessionQuest.title)}</h1>
                <p className={`mt-5 text-sm leading-relaxed ${bodyText}`}>{currentQuestion.scenario}</p>
                <p className={`mt-5 text-sm font-bold ${primaryText}`}>Choose the best answer:</p>
                <div className="mt-3 space-y-2">
                  {OPTIONS.map(letter => {
                    const correct = submitted && letter === currentQuestion.correct;
                    const wrong = submitted && selected === letter && letter !== currentQuestion.correct;
                    const answerState = correct
                      ? `border-emerald-500/60 bg-emerald-500/10 ${isLight ? 'text-emerald-800' : 'text-emerald-200'}`
                      : wrong
                        ? `border-red-500/50 bg-red-500/10 ${isLight ? 'text-red-800' : 'text-red-200'}`
                        : selected === letter
                          ? `border-cyan-400 bg-cyan-500/10 ${isLight ? 'text-cyan-900' : 'text-cyan-100'}`
                          : isLight ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-white/10 bg-white/[0.02] text-slate-300';
                    return <button key={letter} onClick={() => !submitted && setSelected(letter)} disabled={submitted} className={`w-full rounded-lg border px-4 py-3 text-left text-sm ${answerState}`}>
                      <span className="mr-2 font-bold">{letter}.</span>{currentQuestion[`option${letter}`]}
                    </button>;
                  })}
                </div>
                {submitted && <div className={`mt-4 rounded-lg border p-4 ${panelBorder}`} style={{ background: isLight ? '#f8fafc' : 'rgba(255,255,255,.03)' }}>
                  <p className={`text-sm font-bold ${selected === currentQuestion.correct ? (isLight ? 'text-emerald-700' : 'text-emerald-300') : (isLight ? 'text-amber-700' : 'text-amber-300')}`}>{selected === currentQuestion.correct ? `Correct · ${currentQuestion.xp || 10} XP` : `Review the explanation · Correct answer: ${currentQuestion.correct}`}</p>
                  <p className={`mt-2 text-sm leading-relaxed ${bodyText}`}>{currentQuestion.explanation}</p>
                </div>}
              </div>
            ) : currentStep.type === 'quiz' ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
                <p className="text-[10px] uppercase tracking-widest text-slate-500">Quest {currentStep.questIndex + 1} of {sessionQuests.length}</p>
                <h1 className={`text-xl font-bold ${primaryText}`}>{currentStep.label}</h1>
                <p className={`text-sm ${bodyText}`}>{currentSessionQuest.questions.length} questions</p>
                <div className="flex gap-2">
                  <button onClick={startQuiz} className="rounded-lg px-5 py-3 text-sm font-bold text-white" style={{ background: accent }}>Start quiz</button>
                </div>
              </div>
            ) : currentStep.content.trim() && !selectedResource ? (
              <div className="flex-1 min-h-0 overflow-y-auto p-5 md:p-8">
                <h1 className={`text-xl font-bold leading-relaxed ${primaryText}`}>{currentStep.content}</h1>
              </div>
            ) : selectedResource ? nativeVideo ? (
              <div className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden">
                <video key={`${selectedResource.id}:${durationResourceIdentity}`} src={videoSource} autoPlay controls className="max-w-full max-h-full aspect-video bg-black object-contain" onLoadedMetadata={event => recordStepDuration(currentStep.key, event.currentTarget.duration, durationResourceIdentity)} onEnded={handleVideoEnded} onError={() => setVideoPlaybackError('This video could not be played in this browser.')} />
                {videoPlaybackError && <div role="alert" className="absolute left-3 top-3 flex max-w-[90%] items-center gap-2 rounded bg-black/85 px-3 py-2 text-xs text-amber-200"><span>{videoPlaybackError}</span><a href={resolvedResourceUrl} target="_blank" rel="noreferrer" className="underline">Open video</a></div>}
              </div>
            ) : youtubeVideo ? (
              <div className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden">
                <div ref={youtubeContainerRef} className="w-full max-w-full max-h-full aspect-video" />
                {videoPlaybackError && <div role="alert" className="absolute left-3 top-3 flex max-w-[90%] items-center gap-2 rounded bg-black/85 px-3 py-2 text-xs text-amber-200"><span>{videoPlaybackError}</span><a href={resolvedResourceUrl} target="_blank" rel="noreferrer" className="underline">Open in YouTube</a></div>}
              </div>
            ) : embedUrl ? (
              <div className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden">
                <iframe key={selectedResource.id} src={embedUrl} title={selectedResource.label} className="w-full max-w-full max-h-full aspect-video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-6 text-center text-sm text-slate-500">No playable video is attached to this lesson.</div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-6 text-center text-sm text-slate-500">No notes or video are attached. Continuing shortly.</div>
            )}
            {phase === 'learn' && <div className={`flex items-center gap-2 border-t px-4 py-3 ${panelBorder}`}>
              <button onClick={() => goToStep(stepIndex - 1)} disabled={stepIndex === 0} className={`rounded-lg border px-4 py-2.5 text-sm font-semibold disabled:opacity-30 ${panelBorder} ${bodyText}`}>Previous</button>
              <span className="flex-1 text-center text-xs text-slate-500">{selectedResource ? 'Video controls available' : currentStep.content.trim() ? 'Lesson notes' : 'No lesson content'}</span>
              <button onClick={currentStep.type === 'quiz' ? skipQuiz : advanceStep} className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-white" style={{ background: accent }}>Next <ChevronRight size={15} /></button>
            </div>}
            {phase === 'quiz' && <div className={`flex items-center gap-2 border-t px-4 py-3 ${panelBorder}`}>
              <button onClick={() => goToStep(stepIndex - 1)} disabled={stepIndex === 0} className={`rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-30 ${panelBorder} ${bodyText}`}>Previous</button>
              <button onClick={skipQuiz} className={`text-xs ${mutedText} ${isLight ? 'hover:text-slate-900' : 'hover:text-white'}`}>Skip quiz</button>
              <span className="flex-1" />
              {!submitted ? <button onClick={submitAnswer} disabled={!selected} className="rounded-lg px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40" style={{ background: accent }}>Submit answer</button>
                : <button onClick={continueQuestion} className="rounded-lg px-4 py-2.5 text-sm font-bold text-white" style={{ background: accent }}>{questionIndex + 1 < currentSessionQuest.questions.length ? 'Next question' : 'Continue'} <ChevronRight className="inline" size={15} /></button>}
            </div>}
          </div>

          <aside className={`min-h-0 h-full flex flex-col rounded-xl border ${panelBorder} overflow-hidden`} style={{ background: isLight ? '#ffffff' : 'rgba(255,255,255,.02)' }}>
            <div className={`px-5 py-4 border-b ${panelBorder}`}>
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Course content · {completedStepCount} of {steps.length} complete</p>
              <h1 className={`mt-1 text-lg font-bold ${primaryText}`}>{cleanTitle(currentSessionQuest.title)}</h1>
            </div>
            <nav aria-label="Course content" className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
              {questStepGroups.map(group => {
                const expanded = expandedQuestIndexes.includes(group.questIndex);
                return <section key={group.questIndex} className={`border-b ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
                  <button onClick={() => setExpandedQuestIndexes(previous => expanded ? previous.filter(index => index !== group.questIndex) : [...previous, group.questIndex])} aria-expanded={expanded} className={`sticky top-0 z-10 w-full flex items-center gap-2 border-b px-4 py-3 text-left ${isLight ? 'border-slate-200 bg-slate-100' : 'border-white/5 bg-slate-950'}`}>
                    <ChevronRight size={15} className={`flex-shrink-0 text-slate-500 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                    <strong className={`min-w-0 flex-1 truncate text-sm font-bold ${primaryText}`}>{cleanTitle(group.quest.title)}</strong>
                    <span className="flex-shrink-0 text-[10px] tabular-nums text-slate-400">{group.completedCount}/{group.steps.length} · {formatDuration(group.durationSeconds)}</span>
                  </button>
                  {expanded && group.steps.map(step => {
                    const isDone = step.type === 'quiz'
                      ? (group.quest.questions || []).length > 0 && group.quest.questions.every(question => correctQuestionProgress[question.id])
                      : completedStepKeys.includes(step.key);
                    const isCurrent = step.index === stepIndex;
                    const estimate = getMeasuredStepDuration(step, durationByStep, durationResourceByStep) || estimateStepSeconds(step, group.quest);
                    return <button key={step.key} onClick={() => goToStep(step.index)} className={`w-full flex items-start gap-3 border-b px-4 py-3 pl-8 text-left ${isLight ? 'border-slate-100' : 'border-white/5'} ${isCurrent ? (isLight ? 'bg-cyan-50' : 'bg-white/[0.08]') : isDone ? (isLight ? 'bg-blue-50' : 'bg-blue-500/10') : (isLight ? 'hover:bg-slate-50' : 'hover:bg-white/[0.04]')}`}>
                      <span className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border ${isDone ? 'border-blue-500 bg-blue-600 text-white' : isLight ? 'border-slate-300 text-slate-500' : 'border-slate-600 text-slate-500'}`}>{isDone && <Check size={13} strokeWidth={3} />}</span>
                      <span className={`min-w-0 flex-1 text-xs leading-relaxed ${bodyText}`}>{step.label}</span>
                      <span className="flex-shrink-0 text-[10px] text-slate-500">{formatDuration(estimate)}</span>
                    </button>;
                  })}
                </section>;
              })}
            </nav>
          </aside>
        </section>
      )}
      {error && <div role="alert" className="fixed bottom-4 right-4 flex items-center gap-2 rounded-lg bg-red-950 px-3 py-2 text-xs text-red-200"><X size={14} />{error}</div>}
    </main>
  );
}