import { useState, useEffect, useCallback } from 'react';
import { getLevelInfo } from '../data/index.js';

const STORAGE_KEY = 'ai-quest-progress';

const defaultState = {
  playerName: '',
  avatar: null,
  tutorialShown: false,
  totalXP: 0,
  completedQuests: {},
  earnedBadges: [],
  devopsCompletedQuests: {},
  devopsTotalXP: 0,
  dbCourses: [],        // not persisted — loaded fresh each session
  teamMembers: [
    { id: 1, name: 'Rajesh A',   xp: 1250, badges: 5, avatarConfig: { presetId: 'engineer',  skinTone: '#ECC898', badgeColorId: 'cyan',    accessoryId: 'headset'    } },
    { id: 2, name: 'Avinash Srinivasamurthy ',   xp: 975,  badges: 4, avatarConfig: { presetId: 'scientist', skinTone: '#D4A373', badgeColorId: 'violet',  accessoryId: 'glasses'    } },
    { id: 3, name: 'RameshKannan Perumal',  xp: 850,  badges: 3, avatarConfig: { presetId: 'wizard',    skinTone: '#A0694A', badgeColorId: 'emerald', accessoryId: 'graduation' } },
    { id: 4, name: 'Deepak  Shintre', xp: 720,  badges: 3, avatarConfig: { presetId: 'superhero', skinTone: '#7D4B35', badgeColorId: 'pink',    accessoryId: 'none'       } },
    { id: 5, name: 'Raghavendra Bhaskar',  xp: 580,  badges: 2, avatarConfig: { presetId: 'detective', skinTone: '#FFDBB4', badgeColorId: 'amber',   accessoryId: 'cap'        } },
  ],
};

const loadState = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...defaultState, ...JSON.parse(saved) };
  } catch {}
  return defaultState;
};

const saveState = (state) => {
  try {
    const { teamMembers, dbCourses, ...toSave } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {}
};

export const useStore = () => {
  const [state, setState] = useState(loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const setPlayerName = useCallback((name) => {
    setState(s => ({ ...s, playerName: name }));
  }, []);

  const setAvatar = useCallback((avatarConfig) => {
    setState(s => ({ ...s, avatar: avatarConfig }));
  }, []);

  const markTutorialShown = useCallback(() => {
    setState(s => ({ ...s, tutorialShown: true }));
  }, []);

  const completeDevOpsQuest = useCallback((questId, score, xpEarned, badge) => {
    setState(s => {
      const existing = s.devopsCompletedQuests[questId];
      if (existing && existing.score >= score) return s;
      const xpDiff = xpEarned - (existing?.xpEarned || 0);
      return {
        ...s,
        devopsTotalXP: s.devopsTotalXP + xpDiff,
        devopsCompletedQuests: { ...s.devopsCompletedQuests, [questId]: { score, xpEarned, completedAt: Date.now(), badge } },
      };
    });
  }, []);

  const completeQuest = useCallback((questId, score, xpEarned, badge) => {
    setState(s => {
      const existing = s.completedQuests[questId];
      if (existing && existing.score >= score) return s;
      const newBadges = badge && !s.earnedBadges.find(b => b.name === badge.name)
        ? [...s.earnedBadges, badge]
        : s.earnedBadges;
      const xpDiff = xpEarned - (existing?.xpEarned || 0);
      return {
        ...s,
        totalXP: s.totalXP + xpDiff,
        completedQuests: { ...s.completedQuests, [questId]: { score, xpEarned, completedAt: Date.now() } },
        earnedBadges: newBadges,
      };
    });
  }, []);

  const resetProgress = useCallback(() => {
    setState({ ...defaultState, teamMembers: defaultState.teamMembers });
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const setDbCourses = useCallback((courses) => {
    setState(s => ({ ...s, dbCourses: courses }));
  }, []);

  const levelInfo = getLevelInfo(state.totalXP);

  const leaderboard = [
    ...state.teamMembers,
    state.playerName
      ? { id: 0, name: state.playerName + ' (You)', xp: state.totalXP, badges: state.earnedBadges.length, avatarConfig: state.avatar, isYou: true }
      : null,
  ].filter(Boolean).sort((a, b) => b.xp - a.xp);

  return { ...state, levelInfo, leaderboard, setPlayerName, setAvatar, markTutorialShown, completeQuest, completeDevOpsQuest, resetProgress, setDbCourses };
};
