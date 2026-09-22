// AI Transformation Learning Path — full curriculum data

export const LEARNING_PATH_NOTE = {
  title: 'A Note Before You Start Your Learning Journey',
  points: [
    {
      icon: '🗺️',
      title: 'A Starting Point, Not a Destination',
      desc: 'This AI transformation journey is not limited to the specific courses listed. These topics and materials are provided as a baseline reference to help orient you in the rapidly evolving landscape of AI and automation.',
    },
    {
      icon: '🎯',
      title: 'Platform Flexibility',
      desc: 'You are encouraged to leverage the learning platform that best suits your style — O\'Reilly, Udemy, YouTube, or other open-source platforms. The choice of medium is yours.',
    },
    {
      icon: '🧩',
      title: 'Modular Learning',
      desc: 'Some of the recommended courses are extensive. We encourage you to target specific modules within those courses that align with your immediate learning needs or current requirements.',
    },
    {
      icon: '🏅',
      title: 'Respect Your Existing Expertise',
      desc: 'You will likely encounter overlaps across different courses. If you are already proficient in a specific topic (e.g., Python basics or JSON parsing), feel free to skip those sections.',
    },
    {
      icon: '🤝',
      title: 'Community Contribution',
      desc: 'Innovation is a collaborative effort. If you discover a resource, course, or tool that you believe is superior to those listed here, please share it. We want to continuously refine this roadmap based on team feedback.',
    },
  ],
};

// Resource types:
//   "video"    → youtube.com/watch?v=ID  — embeds inside page
//   "playlist" → youtube search / channel — shows "Open on YouTube" in-page card
//   "read"     → article / docs           — external link
//   "udemy"    → Udemy course             — external link
//   "chapter"  → book/chapter reference   — no link (text only)
//   "workshop" → TBD session              — no link (text only)

export const LEARNING_PATH_WEEKS = [
  // ── WEEK 1 ────────────────────────────────────────────────────────────────
  {
    week: 1,
    label: 'Week 1',
    theme: 'Foundation',
    modules: [
      {
        id: 'mod-1',
        number: 1,
        title: 'AI Foundations & Generative AI',
        icon: '🧠',
        color: '#06b6d4',
        topics: [
          'What is AI? Moving beyond the hype — Machine Learning vs. Deep Learning',
          'The Generative Shift: How Generative AI differs from traditional predictive AI',
          'The AI Ecosystem: Major players (OpenAI, Google, Anthropic, Meta) and their flagship models',
          'Neural Networks Simplified: How computers "learn" patterns from data',
        ],
        resources: [
          { type: 'playlist', label: 'What is AI? — Part of AI Transformation: HCL Software Support playlist', url: 'https://www.youtube.com/results?search_query=what+is+AI+machine+learning+deep+learning+explained+beginners' },
          { type: 'playlist', label: 'Generative AI Foundations for Absolute Beginners — HCL Support playlist', url: 'https://www.youtube.com/results?search_query=generative+AI+foundations+absolute+beginners+course' },
          { type: 'udemy', label: 'The Next Frontier: Generative AI for Absolute Beginners — Udemy', url: 'https://www.udemy.com/courses/search/?q=generative+ai+absolute+beginners' },
          { type: 'oreilly', label: "O'Reilly: Generative AI, ML & Deep Learning — browse courses & books", url: 'https://learning.oreilly.com/search/?q=Generative+AI+Machine+Learning+Deep+Learning' },
        ],
      },
      {
        id: 'mod-2',
        number: 2,
        title: 'Conversation AI & Prompt Engineering',
        icon: '💬',
        color: '#8b5cf6',
        topics: [
          'NLP (Natural Language Processing): How machines understand human speech and text',
          'The Art of the Prompt: Moving from simple questions to "Persona-Based" and "Chain-of-Thought" prompting',
          'Zero-Shot vs. Few-Shot Learning: Training the AI with examples within the chat window',
        ],
        resources: [
          { type: 'video', label: 'NLP Basics', url: 'https://www.youtube.com/watch?v=fLvJ8VdHLA0' },
          { type: 'playlist', label: 'Prompt Engineering / Zero-Shot / Few-Shot Deep Dive — HCL Support playlist', url: 'https://www.youtube.com/results?search_query=prompt+engineering+deep+dive+zero+shot+few+shot+chain+of+thought' },
          { type: 'udemy', label: 'Prompt Engineering for Work — Udemy', url: 'https://www.udemy.com/courses/search/?q=prompt+engineering+for+work' },
          { type: 'oreilly', label: "O'Reilly: Prompt Engineering & NLP — browse courses & books", url: 'https://learning.oreilly.com/search/?q=Prompt+Engineering+NLP+LLM' },
          { type: 'workshop', label: 'Workshop 1: Live Session — Build an AI App Using Prompts & AI Tools (join Google Space for schedule)', url: 'https://chat.google.com/room/AAQAKyozwQ8?cls=7' },
        ],
      },
    ],
  },

  // ── WEEK 2 ────────────────────────────────────────────────────────────────
  {
    week: 2,
    label: 'Week 2',
    theme: 'LLMs & Dev Tools',
    modules: [
      {
        id: 'mod-3',
        number: 3,
        title: 'Deep Dive into LLMs (Large Language Models)',
        icon: '🔍',
        color: '#06b6d4',
        topics: [
          'Tokens & Context Windows: Understanding the "memory" and "cost" of AI models',
          'Hallucinations: Why AI makes things up and how to verify outputs',
          'Temperature & Top-P: Controlling creativity vs. randomness of responses',
          'Multi-Modal AI: Interacting with images, audio, and video alongside text',
        ],
        resources: [
          { type: 'playlist', label: 'Tokens & Context Windows / Hallucinations — Generative AI Foundations (HCL playlist)', url: 'https://www.youtube.com/results?search_query=LLM+tokens+context+window+hallucinations+temperature+explained' },
          { type: 'video', label: 'Multi-Modal AI Basics', url: 'https://www.youtube.com/watch?v=J51oZYcNvP8' },
          { type: 'read', label: 'What is Multi-Modal AI? — IBM Think', url: 'https://www.ibm.com/think/topics/multimodal-ai' },
          { type: 'udemy', label: 'LLM Concepts Deep Dive: Conceptual Mastery for Developers — Udemy', url: 'https://www.udemy.com/courses/search/?q=LLM+concepts+deep+dive+developers' },
          { type: 'oreilly', label: "O'Reilly: Natural Language Processing with Transformers — browse courses & books", url: 'https://learning.oreilly.com/search/?q=Natural+Language+Processing+Transformers+LLM' },
        ],
      },
      {
        id: 'mod-4',
        number: 4,
        title: 'Vibe Coding & The Future of Development',
        icon: '⚡',
        color: '#8b5cf6',
        topics: [
          'What is Vibe Coding? Transitioning from line-by-line code to describing "the vibe" (intent & logic)',
          'AI-Native IDEs: Hands-on with tools like GitHub Copilot and Windsurf',
          'Natural Language Programming: Building functional web apps by describing features, not boilerplate',
        ],
        resources: [
          { type: 'playlist', label: 'Vibe Coding Made Simple — A Beginner\'s Guide (HCL playlist)', url: 'https://www.youtube.com/results?search_query=vibe+coding+beginners+AI+IDE+copilot' },
          { type: 'udemy', label: 'Optional: Vibe Coding Bootcamp — Udemy', url: 'https://www.udemy.com/courses/search/?q=vibe+coding+bootcamp' },
          { type: 'read', label: 'Vibe Coding Explained: Tools and Guides — Google Cloud', url: 'https://cloud.google.com/discover/what-is-vibe-coding' },
          { type: 'read', label: 'What is Vibe Coding? — IBM Think', url: 'https://www.ibm.com/think/topics/vibe-coding' },
          { type: 'udemy', label: 'Vibe Coding: AI-Driven Software Development and Testing — Udemy', url: 'https://www.udemy.com/courses/search/?q=vibe+coding+AI+software+development+testing' },
          { type: 'oreilly', label: "O'Reilly: AI-Assisted Development & GitHub Copilot — browse courses & books", url: 'https://learning.oreilly.com/search/?q=AI+assisted+development+GitHub+Copilot' },
        ],
      },
    ],
  },

  // ── WEEK 3 ────────────────────────────────────────────────────────────────
  {
    week: 3,
    label: 'Week 3',
    theme: 'Ethics & Agents',
    modules: [
      {
        id: 'mod-5',
        number: 5,
        title: 'Using AI Responsibly (Ethics & Compliance)',
        icon: '⚖️',
        color: '#f59e0b',
        topics: [
          'Data Privacy: Why you must never paste PII (Personally Identifiable Information) into public LLMs',
          'Bias & Fairness: Identifying and mitigating societal biases in AI training data',
          'Intellectual Property: Navigating the legalities of AI-generated code and content',
        ],
        resources: [
          { type: 'playlist', label: 'Using AI Responsibly — HCL Support playlist', url: 'https://www.youtube.com/results?search_query=using+AI+responsibly+ethics+compliance+privacy' },
          { type: 'read', label: 'What is Responsible AI? — IBM Think', url: 'https://www.ibm.com/think/topics/responsible-ai' },
          { type: 'udemy', label: 'AI Ethics / Responsible Use — Udemy', url: 'https://www.udemy.com/courses/search/?q=AI+ethics+responsible+use' },
          { type: 'oreilly', label: "O'Reilly: Responsible AI, Ethics & Fairness — browse courses & books", url: 'https://learning.oreilly.com/search/?q=Responsible+AI+Ethics+Fairness+Bias' },
        ],
      },
      {
        id: 'mod-6',
        number: 6,
        title: 'Automating with AI (Agents & Orchestration)',
        icon: '🤖',
        color: '#10b981',
        topics: [
          'From Chatbots to Agents: Building AI that can browse the web, run Python scripts, or edit a Google Sheet',
          'RAG (Retrieval-Augmented Generation): Connecting AI to your own data without retraining the model',
          'Orchestration Frameworks: Introduction to LangChain and AutoGen for multi-step tasks',
        ],
        resources: [
          { type: 'oreilly', label: 'Generative AI with Python — Chapters 7 & 8: RAG (Retrieval-Augmented Generation)', url: 'https://learning.oreilly.com/search/?q=Generative+AI+with+Python' },
          { type: 'oreilly', label: 'Generative AI with Python — Chapters 9–14: Agentic Systems & Orchestration', url: 'https://learning.oreilly.com/search/?q=Generative+AI+with+Python' },
          { type: 'oreilly', label: 'Optional: Modern Automated AI Agents — Chapters 1–3', url: 'https://learning.oreilly.com/search/?q=Modern+Automated+AI+Agents' },
          { type: 'oreilly', label: 'Optional: Agentic Coding — Level 1 (Level 2 & 3 preferred if possible)', url: 'https://learning.oreilly.com/search/?q=Agentic+Coding' },
          { type: 'udemy', label: 'The AI Engineer Course 2026: Complete AI Engineer Bootcamp — Udemy', url: 'https://www.udemy.com/courses/search/?q=AI+engineer+2026+complete+bootcamp' },
          { type: 'playlist', label: 'AI Builder: Create Agents, Voice Agents & Automations in n8n', url: 'https://www.youtube.com/results?search_query=n8n+AI+agents+automation+workflow+google+sheets' },
          { type: 'udemy', label: 'LangChain & AutoGen: Build Autonomous AI Systems in 4 Weeks — Udemy', url: 'https://www.udemy.com/courses/search/?q=langchain+autogen+autonomous+AI+systems+agentic' },
          { type: 'udemy', label: 'The Complete No-Code AI Agents Masterclass — Udemy', url: 'https://www.udemy.com/courses/search/?q=no+code+AI+agents+masterclass+beginners' },
          { type: 'workshop', label: 'Workshop 2: Live Session — Build an AI Agent from Scratch (join Google Space for schedule)', url: 'https://chat.google.com/room/AAQAKyozwQ8?cls=7' },
        ],
      },
    ],
  },

  // ── WEEK 4 ────────────────────────────────────────────────────────────────
  {
    week: 4,
    label: 'Week 4',
    theme: 'Programming & Git',
    modules: [
      {
        id: 'mod-7a',
        number: '7A',
        title: 'Python for AI Automation',
        icon: '🐍',
        color: '#f59e0b',
        topics: [
          'The Scripting Mindset: Why Python is the industry standard for AI (simplicity, readability, ecosystem)',
          'Core Concepts: Variables, data structures (lists & dictionaries), control flow (if/else, for loops)',
        ],
        resources: [
          { type: 'read', label: 'Python Official Tutorial — docs.python.org/3/tutorial/', url: 'https://docs.python.org/3/tutorial/' },
          { type: 'read', label: 'Python for Everybody — freeCodeCamp', url: 'https://www.freecodecamp.org/learn/python-for-everybody/' },
          { type: 'playlist', label: 'Python Fundamentals — HCL Support playlist', url: 'https://www.youtube.com/results?search_query=python+fundamentals+beginners+tutorial+AI+automation' },
          { type: 'udemy', label: 'The AI Engineer Course 2026 — look for Python & NLP modules', url: 'https://www.udemy.com/courses/search/?q=AI+engineer+python+NLP' },
          { type: 'oreilly', label: "O'Reilly: Learning Python — browse courses & books", url: 'https://learning.oreilly.com/search/?q=Learning+Python+programming+beginners' },
        ],
      },
      {
        id: 'mod-7b',
        number: '7B',
        title: 'Version Control with Git & GitHub',
        icon: '🌿',
        color: '#10b981',
        topics: [
          'The Safety Net: How Git tracks every change, allowing you to "undo" mistakes',
          'Collaborative Development: Using Branches, Commits, and Pull Requests to build tools as a team',
          'Remote Repositories: Syncing local work with GitHub for backup and team visibility',
        ],
        resources: [
          { type: 'playlist', label: 'Git and GitHub Crash Course — HCL Support playlist', url: 'https://www.youtube.com/results?search_query=git+github+crash+course+beginners+version+control' },
          { type: 'udemy', label: 'Git & GitHub for Beginners: The Complete Hands On Course — Udemy', url: 'https://www.udemy.com/courses/search/?q=git+github+beginners+complete+hands+on' },
          { type: 'oreilly', label: "O'Reilly: Version Control with Git — browse courses & books", url: 'https://learning.oreilly.com/search/?q=Version+Control+Git+GitHub' },
        ],
      },
    ],
  },

  // ── WEEK 5 ────────────────────────────────────────────────────────────────
  {
    week: 5,
    label: 'Week 5',
    theme: 'APIs & Data',
    modules: [
      {
        id: 'mod-8a',
        number: '8A',
        title: 'Working with APIs (The Digital Handshake)',
        icon: '🔌',
        color: '#06b6d4',
        topics: [
          'Understanding REST: HTTP methods — GET for fetching data, POST for sending/creating data',
          'The Request/Response Cycle: Headers, status codes (200 OK vs. 404 Not Found), and payloads',
          'Python requests Library: The industry-standard tool for making API calls to any web service',
        ],
        resources: [
          { type: 'read', label: 'Automate the Boring Stuff with Python — automatetheboringstuff.com', url: 'https://automatetheboringstuff.com/' },
          { type: 'playlist', label: 'Understanding APIs and RESTful APIs Crash Course — HCL Support playlist', url: 'https://www.youtube.com/results?search_query=APIs+RESTful+crash+course+python+requests' },
          { type: 'oreilly', label: 'Python for DevOps — Chapter 9: API Automation & Scripting', url: 'https://learning.oreilly.com/search/?q=Python+for+DevOps' },
          { type: 'udemy', label: 'Understanding APIs and RESTful APIs Crash Course — Udemy', url: 'https://www.udemy.com/courses/search/?q=APIs+RESTful+crash+course' },
        ],
      },
      {
        id: 'mod-8b',
        number: '8B',
        title: 'JSON Parsing & Data Transformation',
        icon: '📦',
        color: '#8b5cf6',
        topics: [
          'JSON (JavaScript Object Notation): The universal language of APIs',
          'Navigating nested dictionaries and lists to extract specific data',
          'Example: Pulling a "case status" out of a complex API response',
        ],
        resources: [
          { type: 'playlist', label: 'JSON for Beginners — A Quick Course (HCL Support playlist)', url: 'https://www.youtube.com/results?search_query=JSON+beginners+quick+course+javascript+parsing' },
          { type: 'udemy', label: 'Beginners Course: Jq Command Tutorials to Parse JSON Data — Udemy', url: 'https://www.udemy.com/courses/search/?q=jq+command+JSON+parse+beginners' },
          { type: 'oreilly', label: "O'Reilly: Python Data Transformation & JSON — browse courses & books", url: 'https://learning.oreilly.com/search/?q=Python+JSON+data+transformation+API' },
        ],
      },
      {
        id: 'mod-8c',
        number: '8C',
        title: 'API Authentication & Security',
        icon: '🔐',
        color: '#f59e0b',
        topics: [
          'API Keys vs. OAuth2: Key-based access vs. the more secure OAuth2 flow for Google Workspace APIs',
          'Authorized JavaScript Origins: Managing security for client-side apps to restrict trusted domains',
          'Credential Safety: Implementing .env files to keep secrets out of source code',
        ],
        resources: [
          { type: 'read', label: 'Using Gemini API Keys — generateContent API | Google AI for Developers', url: 'https://ai.google.dev/gemini-api/docs/api-key' },
          { type: 'read', label: 'Authentication with OAuth Quickstart | Gemini API | Google AI for Developers', url: 'https://ai.google.dev/gemini-api/docs/oauth' },
          { type: 'oreilly', label: "O'Reilly: API Security, OAuth 2.0 & Credential Management — browse courses & books", url: 'https://learning.oreilly.com/search/?q=OAuth+API+Security+credentials' },
        ],
      },
      {
        id: 'mod-8d',
        number: '8D',
        title: 'Scripting Automation Tasks',
        icon: '⚙️',
        color: '#10b981',
        topics: [
          'Batch Processing: Automating repetitive tasks in bulk across datasets',
          'Webhooks: Making your script "listen" for events (e.g., run when a customer submits a feedback form)',
        ],
        resources: [
          { type: 'read', label: 'What is a Webhook? — article', url: 'https://www.ibm.com/think/topics/webhooks' },
          { type: 'read', label: 'About Webhooks — GitHub Docs', url: 'https://docs.github.com/en/webhooks/about-webhooks' },
          { type: 'oreilly', label: "O'Reilly: Python Automation & Scripting — browse courses & books", url: 'https://learning.oreilly.com/search/?q=Python+automation+scripting+webhooks' },
        ],
      },
    ],
  },

  // ── WEEK 6 ────────────────────────────────────────────────────────────────
  {
    week: 6,
    label: 'Week 6',
    theme: 'Advanced & Deploy',
    modules: [
      {
        id: 'mod-9a',
        number: '9A',
        title: 'Enterprise Scripting (Node.js & Java)',
        icon: '🏢',
        color: '#06b6d4',
        optional: true,
        topics: [
          'Server-Side Logic: Node.js handles async tasks; Java manages large-scale enterprise data',
          'Google API Client Libraries: Official Google Cloud libraries for Node.js and Java to manage Workspace data',
          'Integration Patterns: Bridging Python-based AI logic with existing Java-based environments',
        ],
        resources: [
          { type: 'read', label: 'API Client Libraries | Google for Developers', url: 'https://developers.google.com/api-client-library' },
          { type: 'oreilly', label: "O'Reilly: Node.js & Enterprise API Integration — browse courses & books", url: 'https://learning.oreilly.com/search/?q=Node.js+Enterprise+Java+API+Integration' },
        ],
      },
      {
        id: 'mod-9b',
        number: '9B',
        title: 'Docker & Containerization (Portable Workflows)',
        icon: '🐳',
        color: '#0ea5e9',
        optional: true,
        topics: [
          '"It Works on My Machine" — No More: Docker packages code, libraries, and dependencies into a portable container',
          'Container Lifecycle: Building, running, and managing containers locally and in production',
          'Microservices in Support: Deploy small, specialized AI tools independently without affecting the rest of the infrastructure',
        ],
        resources: [
          { type: 'playlist', label: 'Docker for the Absolute Beginner — Hands-On (HCL Support playlist)', url: 'https://www.youtube.com/results?search_query=docker+absolute+beginner+hands+on+devops+containers' },
          { type: 'udemy', label: 'Docker for the Absolute Beginner — Hands On — DevOps — Udemy', url: 'https://www.udemy.com/courses/search/?q=docker+absolute+beginner+hands+on+devops' },
          { type: 'oreilly', label: "O'Reilly: Docker Up & Running / Containerization — browse courses & books", url: 'https://learning.oreilly.com/search/?q=Docker+containerization+Up+Running' },
        ],
      },
    ],
  },
];
