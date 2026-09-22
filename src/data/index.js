import { LEARNING_PATHS, QUESTS_P1 } from './questsP1.js';
import { QUESTS_P2 } from './questsP2.js';
import { QUESTS_P3 } from './questsP3.js';

export { LEARNING_PATHS };
export const QUESTS = [...QUESTS_P1, ...QUESTS_P2, ...QUESTS_P3];

export const getQuest = (id) => QUESTS.find(q => q.id === id);
export const getPath = (id) => LEARNING_PATHS.find(p => p.id === id);
export const getQuestsForPath = (pathId) => QUESTS.filter(q => q.pathId === pathId);

export const TOTAL_XP_AVAILABLE = QUESTS.reduce((sum, q) => sum + q.xp, 0);

export const LEVELS = [
  { level: 1, title: 'AI Rookie', minXP: 0, maxXP: 299, icon: '🌱' },
  { level: 2, title: 'Data Cadet', minXP: 300, maxXP: 699, icon: '🔵' },
  { level: 3, title: 'ML Scout', minXP: 700, maxXP: 1199, icon: '⚡' },
  { level: 4, title: 'AI Engineer', minXP: 1200, maxXP: 1799, icon: '🧠' },
  { level: 5, title: 'Neural Ninja', minXP: 1800, maxXP: 2499, icon: '🔥' },
  { level: 6, title: 'Deep Learning Master', minXP: 2500, maxXP: 3199, icon: '💎' },
  { level: 7, title: 'AI Grandmaster', minXP: 3200, maxXP: Infinity, icon: '👑' },
];

export const getLevelInfo = (xp) => {
  return LEVELS.find(l => xp >= l.minXP && xp <= l.maxXP) || LEVELS[LEVELS.length - 1];
};

export const getNextLevel = (xp) => {
  const current = getLevelInfo(xp);
  const idx = LEVELS.findIndex(l => l.level === current.level);
  return LEVELS[idx + 1] || null;
};
