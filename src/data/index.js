import { LEARNING_PATHS, QUESTS_P1 } from './questsP1.js';
import { QUESTS_P2 } from './questsP2.js';
import { QUESTS_P3 } from './questsP3.js';
import { AI_QUEST_LEVELS, getLevelInfo as getCourseLevelInfo, getNextLevel as getCourseNextLevel } from '../lib/courseLevels.js';

export { LEARNING_PATHS };
export const QUESTS = [...QUESTS_P1, ...QUESTS_P2, ...QUESTS_P3];

export const getQuest = (id) => QUESTS.find(q => q.id === id);
export const getPath = (id) => LEARNING_PATHS.find(p => p.id === id);
export const getQuestsForPath = (pathId) => QUESTS.filter(q => q.pathId === pathId);

export const TOTAL_XP_AVAILABLE = QUESTS.reduce((sum, q) => sum + q.xp, 0);

export const LEVELS = AI_QUEST_LEVELS;

export const getLevelInfo = (xp) => {
  return getCourseLevelInfo(xp, { slug: 'ai-quest' });
};

export const getNextLevel = (xp) => {
  return getCourseNextLevel(xp, { slug: 'ai-quest' });
};
