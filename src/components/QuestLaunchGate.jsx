import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { getQuest } from '../data/index.js';
import { getDevOpsQuest } from '../data/devopsIndex.js';
import QuestLaunchSequence from './QuestLaunchSequence.jsx';
import { useAppStore } from '../App.jsx';

const AI_QUEST_ROUTE        = /^\/quest\/([^/]+)$/;
const AI_SOLUTION_ROUTE     = /^\/(solution|quiz)\/([^/]+)$/;
const DEVOPS_QUEST_ROUTE    = /^\/devops-loop\/quest\/([^/]+)$/;
const DEVOPS_SOLUTION_ROUTE = /^\/devops-loop\/(solution|quiz)\/([^/]+)$/;
const DB_COURSE_ROUTE       = /^\/c\/([^/]+)(?:\/(quests|learning-path|quiz|learn))?(?:\/.*)?$/

const MODULE_LAUNCHES = {
  '/ai-quest': {
    module: 'ai',
    cta: 'Enter Module',
    quest: { title: 'AI Quest Module', subtitle: 'Generative AI & Machine Learning',
             description: 'Prepare to enter the AI mission zone.', icon: '🤖', xp: null },
  },
  '/devops-loop': {
    module: 'devops',
    cta: 'Enter Module',
    quest: { title: 'DevOps Loop Module', subtitle: 'End-to-End DevOps Lifecycle',
             description: 'Prepare to enter the DevOps Loop.', icon: '🔄', xp: null },
  },
  '/paths': {
    module: 'ai',
    cta: 'Enter Learning Paths',
    quest: { title: 'AI Learning Paths', subtitle: '21 quests across 6 paths',
             description: 'All AI missions available for launch.', icon: '🎯', xp: null },
  },
  '/devops-loop/paths': {
    module: 'devops',
    cta: 'Enter Learning Paths',
    quest: { title: 'DevOps Learning Paths', subtitle: '21 quests across 8 modules',
             description: 'All Loop missions available for launch.', icon: '🎯', xp: null },
  },
  '/devops-loop/learning-path': {
    module: 'devops',
    cta: 'Enter Learning Path',
    quest: { title: 'DevOps 4-Week Curriculum', subtitle: 'Structured learning journey',
             description: 'Enter your structured DevOps roadmap.', icon: '📚', xp: null },
  },
};

// One-shot flag written by AvatarEditor when the first-login tutorial completes.
const FIRST_LAUNCH_KEY = 'hcl-first-launch';

function resolveLaunch(pathname, dbCourses) {
  const devopsQ = pathname.match(DEVOPS_QUEST_ROUTE);
  if (devopsQ) {
    const quest = getDevOpsQuest(devopsQ[1]);
    return quest ? { module: 'devops', quest, cta: 'Enter Quest' } : null;
  }
  const devopsS = pathname.match(DEVOPS_SOLUTION_ROUTE);
  if (devopsS) {
    const quest = getDevOpsQuest(devopsS[2]);
    const cta = devopsS[1] === 'quiz' ? 'Enter Practice' : 'Enter Learning';
    return quest ? { module: 'devops', quest, cta } : null;
  }
  const aiQ = pathname.match(AI_QUEST_ROUTE);
  if (aiQ) {
    const quest = getQuest(aiQ[1]);
    return quest ? { module: 'ai', quest, cta: 'Enter Quest' } : null;
  }
  const aiS = pathname.match(AI_SOLUTION_ROUTE);
  if (aiS) {
    const quest = getQuest(aiS[2]);
    const cta = aiS[1] === 'quiz' ? 'Enter Practice' : 'Enter Learning';
    return quest ? { module: 'ai', quest, cta } : null;
  }

  if (MODULE_LAUNCHES[pathname]) return MODULE_LAUNCHES[pathname];

  // ── Dynamic DB courses ──────────────────────────────────────────────────────
  const dbMatch = pathname.match(DB_COURSE_ROUTE);
  if (dbMatch) {
    const slug   = dbMatch[1];
    const sub    = dbMatch[2]; // 'quests' | 'learning-path' | 'quiz' | 'learn' | undefined
    const course = dbCourses?.find(c => c.slug === slug);
    const title  = course?.title || slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const emoji  = course?.emoji || '📚';
    const tagline = course?.tagline || course?.title || 'Course';
    let cta = 'Enter Module';
    let desc = `Prepare to enter the ${title} mission zone.`;
    if (sub === 'quests')        { cta = 'Enter Quests';        desc = `All ${title} quests ready for launch.`; }
    if (sub === 'learning-path') { cta = 'Enter Learning Path'; desc = `Structured ${title} roadmap ready.`; }
    if (sub === 'quiz')          { cta = 'Enter Practice';       desc = `Prepare to answer the quest.`; }
    if (sub === 'learn')         { cta = 'Enter Learn Mode';     desc = `Learning content ready to view.`; }
    return { module: 'db', quest: { title: `${title} Module`, subtitle: tagline, description: desc, icon: emoji, xp: null }, cta };
  }

  if (pathname === '/' || pathname === '/courses') {
    try {
      if (sessionStorage.getItem(FIRST_LAUNCH_KEY)) {
        return {
          module: 'ai',
          cta: 'Enter Learning Hub',
          quest: {
            title: 'Welcome, Commander',
            subtitle: 'HCL Software Learning Hub',
            description: 'Your training platform is now online.',
            icon: '🚀',
            xp: null,
          },
          consumesFirstLaunch: true,
        };
      }
    } catch {}
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
    setLaunch(resolveLaunch(pathname, dbCourses));
  }, [pathname, navigationType, dbCourses]);

  const finish = useCallback(() => {
    if (launch?.consumesFirstLaunch) {
      try { sessionStorage.removeItem(FIRST_LAUNCH_KEY); } catch {}
    }
    setLaunch(null);
  }, [launch]);

  return launch ? (
    <QuestLaunchSequence quest={launch.quest} module={launch.module} cta={launch.cta} onComplete={finish} />
  ) : null;
}
