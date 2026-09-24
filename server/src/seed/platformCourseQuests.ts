type LegacyQuestion = {
  id?: string | number;
  scenario: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  xpReward?: number;
};

type LegacyQuest = {
  id: string;
  pathId?: string;
  title: string;
  subtitle?: string;
  description?: string;
  xp?: number;
  questions: LegacyQuestion[];
};

type SeedQuest = {
  title: string;
  scenario: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correct: string;
  explanation: string;
  xp: number;
  order: number;
  learnTopics: Array<{ content: string; order: number; isSolutionRequest?: boolean }>;
  learnResources: Array<{ type: string; label: string; url: string; order: number }>;
};

function toCorrectLetter(index: number) {
  return ['A', 'B', 'C', 'D'][index] || 'A';
}

function normalizeQuestionScenario(question: LegacyQuestion) {
  const parts = [question.scenario, question.question].filter(Boolean).map((part) => String(part).trim());
  return parts.join('\n\n');
}

function buildLearnPayload(
  solutionRequest: string | undefined,
  steps: Array<{ text?: string; link?: string }> | undefined,
  videoLinks: Record<string, string> | undefined,
  moreVideosUrl: string | undefined,
) {
  const learnTopics: Array<{ content: string; order: number; isSolutionRequest?: boolean }> = [];
  const learnResources: Array<{ type: string; label: string; url: string; order: number }> = [];

  if (solutionRequest?.trim()) {
    learnTopics.push({ content: solutionRequest.trim(), order: -1, isSolutionRequest: true });
  }

  (steps || []).forEach((step, index) => {
    if (step?.text?.trim()) {
      learnTopics.push({ content: step.text.trim(), order: index });
    }
    const label = step?.link?.trim();
    const url = label ? videoLinks?.[label] : undefined;
    if (label && url) {
      learnResources.push({
        type: url.includes('youtube.com') || url.includes('youtu.be') ? 'youtube' : 'link',
        label,
        url,
        order: learnResources.length,
      });
    }
  });

  if (moreVideosUrl) {
    learnResources.push({
      type: 'playlist',
      label: 'More Videos',
      url: moreVideosUrl,
      order: learnResources.length,
    });
  }

  return { learnTopics, learnResources };
}

function transformQuestPack(
  quests: LegacyQuest[],
  solutionCenter: Record<string, any>,
  videoLinks: Record<string, string>,
  moreVideos: Record<string, string>,
  startingOrder: number,
) {
  const seeded: SeedQuest[] = [];
  let order = startingOrder;

  quests.forEach((quest) => {
    const learnData = buildLearnPayload(
      solutionCenter?.[quest.id]?.solutionRequest,
      solutionCenter?.[quest.id]?.steps,
      videoLinks,
      moreVideos?.[quest.id],
    );

    const defaultXp = Math.max(10, Math.round((quest.xp || 30) / Math.max(quest.questions?.length || 1, 1)));

    (quest.questions || []).forEach((question, idx) => {
      const options = Array.isArray(question.options) ? question.options : [];
      seeded.push({
        title: `${quest.title} — Q${idx + 1}`,
        scenario: normalizeQuestionScenario(question),
        optionA: options[0] || '',
        optionB: options[1] || '',
        optionC: options[2] || '',
        optionD: options[3] || '',
        correct: toCorrectLetter(question.correct),
        explanation: question.explanation || '',
        xp: Number(question.xpReward || defaultXp || 10),
        order: order++,
        learnTopics: learnData.learnTopics,
        learnResources: learnData.learnResources,
      });
    });
  });

  return seeded;
}

export async function getPlatformCourseQuests() {
  const aiIndexModule = await import(new URL('../../../src/data/index.js', import.meta.url).href);
  const aiSolutionModule = await import(new URL('../../../src/data/solutionCenter.js', import.meta.url).href);
  const devopsIndexModule = await import(new URL('../../../src/data/devopsIndex.js', import.meta.url).href);
  const devopsP1Module = await import(new URL('../../../src/data/devopsQuestsP1.js', import.meta.url).href);
  const devopsP2Module = await import(new URL('../../../src/data/devopsQuestsP2.js', import.meta.url).href);
  const devopsSolutionModule = await import(new URL('../../../src/data/devopsSolutionCenter.js', import.meta.url).href);

  const aiQuests = ((aiIndexModule as any).QUESTS || []) as LegacyQuest[];
  const aiSolutionCenter = ((aiSolutionModule as any).SOLUTION_CENTER || {}) as Record<string, any>;
  const aiVideoLinks = ((aiSolutionModule as any).VIDEO_LINKS || {}) as Record<string, string>;
  const aiMoreVideos = ((aiSolutionModule as any).QUEST_MORE_VIDEOS || {}) as Record<string, string>;

  const devopsQuests = [
    ...((((devopsP1Module as any).DEVOPS_QUESTS_P1 || []) as LegacyQuest[])),
    ...((((devopsP2Module as any).DEVOPS_QUESTS_P2 || []) as LegacyQuest[])),
  ];
  const devopsSolutionCenter = ((devopsSolutionModule as any).DEVOPS_SOLUTION_CENTER || {}) as Record<string, any>;
  const devopsVideoLinks = ((devopsSolutionModule as any).DEVOPS_VIDEO_LINKS || {}) as Record<string, string>;
  const devopsMoreVideos = ((devopsSolutionModule as any).DEVOPS_QUEST_MORE_VIDEOS || {}) as Record<string, string>;

  return {
    'ai-quest': transformQuestPack(aiQuests, aiSolutionCenter, aiVideoLinks, aiMoreVideos, 0),
    'devops-loop': transformQuestPack(devopsQuests, devopsSolutionCenter, devopsVideoLinks, devopsMoreVideos, 0),
  } as Record<string, SeedQuest[]>;
}
