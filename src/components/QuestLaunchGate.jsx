import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import QuestLaunchSequence from './QuestLaunchSequence.jsx';
import { useAppStore } from '../App.jsx';

const COURSE_LAUNCH_KEY       = 'hcl-launch-route';
const DB_COURSE_ROUTE       = /^\/c\/([^/]+)(?:\/(quests|learning-path|quiz|learn))?(?:\/.*)?$/;

function resolveLaunch(pathname, dbCourses) {
  if (pathname === '/ai-quest') {
    return {
      module: 'ai',
      cta: 'Enter Module',
      autoAdvance: true,
      quest: {
        title: 'AI Quest Module',
        subtitle: 'Generative AI & Machine Learning',
        description: 'Prepare to enter the AI mission zone.',
        icon: '🤖',
        xp: null,
      },
    };
  }

  if (pathname === '/devops-loop') {
    return {
      module: 'devops',
      cta: 'Enter Module',
      autoAdvance: true,
      quest: {
        title: 'DevOps Loop Module',
        subtitle: 'End-to-End DevOps Lifecycle',
        description: 'Prepare to enter the DevOps Loop.',
        icon: '🔄',
        xp: null,
      },
    };
  }

  const dbMatch = pathname.match(DB_COURSE_ROUTE);
  if (dbMatch && !dbMatch[2]) {
    const slug   = dbMatch[1];
    const course = dbCourses?.find(c => c.slug === slug);
    const title  = course?.title || slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const emoji  = course?.emoji || '📚';
    const tagline = course?.tagline || course?.title || 'Course';
    return {
      module: 'db',
      cta: 'Enter Module',
      autoAdvance: true,
      quest: {
        title: `${title} Module`,
        subtitle: tagline,
        description: `Prepare to enter the ${title} mission zone.`,
        icon: emoji,
        xp: null,
      },
    };
  }

  return null;
}

const HUB_PATHS = new Set(['/', '/courses']);

// Matches the "action" routes (quiz/solution) both for AI Quest and DevOps Loop.
const ACTION_ROUTE = /^\/(devops-loop\/)?(quiz|solution)\/[^/]+$/;
const QUEST_DETAIL_ROUTE = /^\/(devops-loop\/)?quest\/[^/]+$/;

function segments(pathname) {
  return pathname.split('/').filter(Boolean).length;
}

export default function QuestLaunchGate() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  const prevPathnameRef = useRef(pathname);
  const [launch, setLaunch] = useState(null);
  const { dbCourses } = useAppStore();

  useEffect(() => {
    const prev = prevPathnameRef.current;
    prevPathnameRef.current = pathname;

    const isExitingAction =
      prev && ACTION_ROUTE.test(prev) && QUEST_DETAIL_ROUTE.test(pathname);

    const isBackNav =
      navigationType === 'POP' ||
      isExitingAction ||
      (prev && prev !== pathname &&
        (segments(pathname) < segments(prev) || HUB_PATHS.has(pathname)));

    if (isBackNav) {
      setLaunch(null);
      return;
    }

    let requestedLaunch = null;
    try {
      requestedLaunch = sessionStorage.getItem(COURSE_LAUNCH_KEY);
    } catch {}

    if (requestedLaunch !== pathname) {
      setLaunch(null);
      return;
    }

    setLaunch(resolveLaunch(pathname, dbCourses));
  }, [pathname, navigationType, dbCourses]);

  const finish = useCallback(() => {
    try { sessionStorage.removeItem(COURSE_LAUNCH_KEY); } catch {}
    setLaunch(null);
  }, [launch]);

  return launch ? (
    <QuestLaunchSequence quest={launch.quest} module={launch.module} cta={launch.cta} onComplete={finish} autoAdvance={launch.autoAdvance} />
  ) : null;
}
