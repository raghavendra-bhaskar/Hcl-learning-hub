// CNAPP LMS + Lab handoffs. All URLs open in a new tab; re-auth is expected.
// Fill in real URLs per quest as you map them; the UI hides sections that have no data.

const CNAPP = 'https://cnapp.prod.hclpnp.com';

// ── Module-level certification catalogs (shown on Course Hub + Results) ──────
export const CERTIFICATIONS = {
  'devops-loop': {
    id: 'devops-loop',
    title: 'DevOps Loop Certification',
    subtitle: 'Formal assessment in CNAPP LMS',
    catalogUrl: `${CNAPP}/lms/?redirect=0`,
    tracks: [
      { level: 'Foundation',   description: 'Build, share, and run modern applications', enrolUrl: `${CNAPP}/lms/course/index.php?categoryid=20`, accent: 'cyan' },
      { level: 'Practitioner', description: 'Automated container deployment, scaling, and management', enrolUrl: `${CNAPP}/lms/enrol/index.php?id=80`, accent: 'teal' },
      { level: 'Expert',       description: 'Modern software delivery at scale', enrolUrl: `${CNAPP}/lms/course/index.php?categoryid=20`, accent: 'emerald' },
    ],
  },
  'ai-quest': {
    id: 'ai-quest',
    title: 'AI Practitioner Certification',
    subtitle: 'Formal assessment in CNAPP LMS',
    catalogUrl: `${CNAPP}/lms/?redirect=0`,
    tracks: [
      { level: 'Foundation',   description: 'Generative AI, ML, and prompt basics', enrolUrl: `${CNAPP}/lms/course/index.php?categoryid=20`, accent: 'cyan' },
      { level: 'Practitioner', description: 'Applied AI: RAG, agents, and evaluation', enrolUrl: `${CNAPP}/lms/enrol/index.php?id=80`, accent: 'violet' },
      { level: 'Expert',       description: 'Enterprise AI architecture and MLOps', enrolUrl: `${CNAPP}/lms/course/index.php?categoryid=20`, accent: 'fuchsia' },
    ],
  },
};

// ── Per-quest hands-on lab links (shown on QuestDetail + Results) ────────────
// Key = quest.id (AI Quest) or devops quest.id
export const QUEST_LABS = {
  // DevOps Loop labs
  'dq-install-steps':   { id: 'dq-install-steps', url: `${CNAPP}/training`, title: 'DevOps Loop install lab', duration: '45 min' },
  'dq-troubleshooting': { id: 'dq-troubleshooting', url: `${CNAPP}/training`, title: 'Troubleshooting sandbox',  duration: '30 min' },

  // AI Quest labs — Docker / containerization / Python quests
  'docker-cloud':       { id: 'docker-cloud', url: `${CNAPP}/training`, title: 'Docker Commands lab',     duration: '30 min' },
  'python-ai':          { id: 'python-ai', url: `${CNAPP}/training`, title: 'Python for AI sandbox',   duration: '45 min' },
  'api-automation':     { id: 'api-automation', url: `${CNAPP}/training`, title: 'REST APIs lab',           duration: '30 min' },
};

export const getCertification = (moduleId) => CERTIFICATIONS[moduleId] || null;
export const getQuestLab      = (questId)  => QUEST_LABS[questId] || null;
