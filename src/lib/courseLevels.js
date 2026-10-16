const LEVEL_BANDS = [
  { level: 1, minXP: 0, maxXP: 299 },
  { level: 2, minXP: 300, maxXP: 699 },
  { level: 3, minXP: 700, maxXP: 1199 },
  { level: 4, minXP: 1200, maxXP: 1799 },
  { level: 5, minXP: 1800, maxXP: 2499 },
  { level: 6, minXP: 2500, maxXP: 3199 },
  { level: 7, minXP: 3200, maxXP: Infinity },
];

const AI_QUEST_TITLES = [
  { title: 'AI Rookie', icon: '🌱' },
  { title: 'Data Cadet', icon: '🔵' },
  { title: 'ML Scout', icon: '⚡' },
  { title: 'AI Engineer', icon: '🧠' },
  { title: 'Neural Ninja', icon: '🔥' },
  { title: 'Deep Learning Master', icon: '💎' },
  { title: 'AI Grandmaster', icon: '👑' },
];

const DEVOPS_LOOP_TITLES = [
  { title: 'Pipeline Rookie', icon: '🪜' },
  { title: 'Build Cadet', icon: '🛠️' },
  { title: 'Release Scout', icon: '🚀' },
  { title: 'Automation Engineer', icon: '⚙️' },
  { title: 'Site Reliability Ninja', icon: '🛡️' },
  { title: 'Platform Master', icon: '🌐' },
  { title: 'DevOps Grandmaster', icon: '🏆' },
];

function buildLevels(titles) {
  return LEVEL_BANDS.map((band, index) => ({ ...band, ...titles[index] }));
}

function normalizeCourse(course) {
  if (typeof course === 'string') return { slug: course };
  return course || {};
}

function compactCourseLabel(title = '', category = '') {
  const slugSource = String(title || category || 'Course')
    .replace(/\b(learning|course|path|quest|hub|loop|program|academy)\b/gi, ' ')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim();
  const words = slugSource.split(/\s+/).filter(Boolean).slice(0, 2);
  return words.length ? words.join(' ') : 'Course';
}

function buildDynamicTitles(course) {
  const { title = '', category = '' } = normalizeCourse(course);
  const label = compactCourseLabel(title, category);
  const titlesByCategory = {
    product: [
      `${label} Starter`,
      `${label} Explorer`,
      `${label} Specialist`,
      `${label} Strategist`,
      `${label} Champion`,
      `${label} Maestro`,
      `${label} Visionary`,
    ],
    process: [
      `${label} Starter`,
      `${label} Navigator`,
      `${label} Practitioner`,
      `${label} Optimizer`,
      `${label} Champion`,
      `${label} Maestro`,
      `${label} Visionary`,
    ],
    technology: [
      `${label} Starter`,
      `${label} Builder`,
      `${label} Engineer`,
      `${label} Specialist`,
      `${label} Architect`,
      `${label} Master`,
      `${label} Grandmaster`,
    ],
  };
  const iconsByCategory = {
    product: ['📦', '🧭', '🎯', '🚀', '🏅', '💼', '👑'],
    process: ['🧩', '🗺️', '🔄', '📈', '🏅', '🧠', '👑'],
    technology: ['🧪', '🔧', '⚡', '💻', '🛰️', '💎', '👑'],
  };
  const effectiveCategory = category === 'product' || category === 'process' ? category : 'technology';
  return titlesByCategory[effectiveCategory].map((entry, index) => ({
    title: entry,
    icon: iconsByCategory[effectiveCategory][index],
  }));
}

export const AI_QUEST_LEVELS = buildLevels(AI_QUEST_TITLES);
export const DEVOPS_LOOP_LEVELS = buildLevels(DEVOPS_LOOP_TITLES);

export function getLevels(course = { slug: 'ai-quest' }) {
  const normalized = normalizeCourse(course);
  if (normalized.slug === 'ai-quest') return AI_QUEST_LEVELS;
  if (normalized.slug === 'devops-loop') return DEVOPS_LOOP_LEVELS;
  return buildLevels(buildDynamicTitles(normalized));
}

export function getLevelInfo(xp = 0, course = { slug: 'ai-quest' }) {
  const levels = getLevels(course);
  return levels.find(level => xp >= level.minXP && xp <= level.maxXP) || levels[levels.length - 1];
}

export function getNextLevel(xp = 0, course = { slug: 'ai-quest' }) {
  const levels = getLevels(course);
  const current = getLevelInfo(xp, course);
  const currentIndex = levels.findIndex(level => level.level === current.level);
  return levels[currentIndex + 1] || null;
}
