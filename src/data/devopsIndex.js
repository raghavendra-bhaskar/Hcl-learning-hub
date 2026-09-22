import { DEVOPS_LOOP_PATHS } from './devopsQuestsP1.js';
import { DEVOPS_QUESTS_P1 } from './devopsQuestsP1.js';
import { DEVOPS_QUESTS_P2 } from './devopsQuestsP2.js';

export { DEVOPS_LOOP_PATHS };
export const DEVOPS_QUESTS = [...DEVOPS_QUESTS_P1, ...DEVOPS_QUESTS_P2];

export const getDevOpsQuest = (id) => DEVOPS_QUESTS.find(q => q.id === id);
export const getDevOpsPath = (id) => DEVOPS_LOOP_PATHS.find(p => p.id === id);

export const DEVOPS_TOTAL_QUESTS = DEVOPS_QUESTS.length;
export const DEVOPS_TOTAL_PATHS = DEVOPS_LOOP_PATHS.length;
