export const NPCS = {
  aria:    { id: 'aria',    name: 'Dr. ARIA',      emoji: '🤖', role: 'AI Lab Director',     color: 'from-cyan-500 to-blue-600',    bubble: '#0e2a4a' },
  nova:    { id: 'nova',    name: 'Commander Nova', emoji: '🧑‍🚀', role: 'Team Commander',      color: 'from-violet-500 to-purple-600', bubble: '#1a1040' },
  maya:    { id: 'maya',    name: 'Maya Chen',      emoji: '👩‍💼', role: 'Chief People Officer', color: 'from-pink-500 to-rose-600',    bubble: '#2d0f20' },
  carlos:  { id: 'carlos',  name: 'Carlos Rivera',  emoji: '👨‍💻', role: 'Data Analyst',         color: 'from-emerald-500 to-teal-600', bubble: '#0a2a20' },
  leon:    { id: 'leon',    name: 'Dr. Leon Park',  emoji: '🧑‍🔬', role: 'Ethics Officer',       color: 'from-indigo-500 to-blue-600',  bubble: '#0d1a40' },
  zara:    { id: 'zara',    name: 'Zara Ali',       emoji: '👩‍🔬', role: 'ML Engineer',          color: 'from-amber-500 to-orange-600', bubble: '#2a1800' },
  max:     { id: 'max',     name: 'Max Torres',     emoji: '👨‍🏭', role: 'CTO',                  color: 'from-red-500 to-orange-600',   bubble: '#2a0d0d' },
  priya:   { id: 'priya',   name: 'Priya Nair',     emoji: '👩‍💻', role: 'Data Scientist',       color: 'from-lime-500 to-green-600',   bubble: '#0f2a10' },
  sam:     { id: 'sam',     name: 'Sam Wu',         emoji: '🧑‍💻', role: 'MLOps Engineer',       color: 'from-sky-500 to-blue-600',     bubble: '#0a1e30' },
  elena:   { id: 'elena',   name: 'Dr. Elena Ross', emoji: '👩‍⚕️', role: 'Chief AI Scientist',   color: 'from-teal-500 to-cyan-600',    bubble: '#082a28' },
  devesh:  { id: 'devesh',  name: 'Devesh Kumar',   emoji: '🧑‍🏗️', role: 'Solutions Architect',  color: 'from-purple-500 to-indigo-600',bubble: '#1a0d30' },
  hana:    { id: 'hana',    name: 'Hana Sato',      emoji: '🕵️', role: 'Security Analyst',     color: 'from-red-500 to-rose-600',     bubble: '#2a0a0a' },
};

export const QUEST_DIALOGS = {

  'genai-basics': {
    npcs: ['aria', 'nova'],
    steps: [
      { npc: 'aria',  text: "Welcome, Commander! I'm Dr. ARIA, the AI Lab Director here at AI Quest HQ. Word has reached us that your organization just adopted an enterprise AI assistant." },
      { npc: 'nova',  text: "That's huge news! But here's the problem — most teams start using AI without really understanding what it is. That leads to misuse, misplaced trust, and missed opportunities." },
      { npc: 'aria',  text: "Your CEO wants to present to the board about Generative AI. You need to make sure the fundamentals are crystal clear: what GenAI is, how transformers work, and the concept of hallucination." },
      { npc: 'nova',  text: "We also need to address the cost question — CFOs always ask why AI is expensive. Understanding inference costs will help you justify the budget." },
      { npc: 'aria',  text: "Complete this briefing successfully and you'll earn the AI Pioneer badge. The board meeting is counting on you, Commander. Let's go!" },
    ],
  },

  'ml-fundamentals': {
    npcs: ['carlos', 'aria'],
    steps: [
      { npc: 'carlos', text: "Commander! I'm Carlos, Data Analyst at CloudTech Commerce. We've got a serious problem — 22% of our subscribers are churning and we can't tell who's about to leave next." },
      { npc: 'aria',   text: "This is a classic Machine Learning use case. We need to build a model that predicts churn before it happens, so the retention team can reach out proactively." },
      { npc: 'carlos', text: "I've got two years of user behavior data — login frequency, purchase history, support tickets. But I've never done ML before. What kind of problem is this exactly?" },
      { npc: 'aria',   text: "Great question! You'll need to understand the difference between classification types, handle class imbalance — only 5% actually churn — and pick the right evaluation metrics." },
      { npc: 'carlos', text: "I also heard something about overfitting? Our initial model scored 99% in training but flopped in the real world. We need to understand what went wrong!" },
    ],
  },

  'ai-ethics': {
    npcs: ['maya', 'leon'],
    steps: [
      { npc: 'maya',  text: "Commander, I'm Maya, Chief People Officer. We deployed an AI resume screening tool six months ago, and something is very wrong. The numbers don't lie." },
      { npc: 'leon',  text: "I'm Dr. Leon Park, Ethics Officer. Our audit shows the tool rejects 73% of female candidates for engineering roles versus 31% for males. This is algorithmic discrimination at scale." },
      { npc: 'maya',  text: "Our legal team is worried. But beyond legality, this is just wrong. We need to understand how AI bias originates so we can fix this system — and prevent it from happening again." },
      { npc: 'leon',  text: "We'll also cover explainability. A hospital partner asked why our AI recommended a specific treatment and the system gave no explanation. Patients have a right to understand AI decisions." },
      { npc: 'maya',  text: "And there's the big debate: our team wants to deploy an AI that's 85% accurate overall but 65% accurate for minorities. What's the right call? That's on you, Commander." },
    ],
  },

  'supervised-learning': {
    npcs: ['zara', 'aria'],
    steps: [
      { npc: 'zara',  text: "Commander! I'm Zara, ML Engineer at PropTech Labs. Our house price prediction model was 89% accurate when we deployed it — now it's dropped to 71% and we don't know why." },
      { npc: 'aria',  text: "This is a critical production failure. Three months of degraded predictions have impacted thousands of buyers and sellers. We need to diagnose this fast." },
      { npc: 'zara',  text: "We've also been struggling with feature selection — our dataset has 500 features but the model trains slowly and underperforms. Something's wrong with our approach." },
      { npc: 'aria',  text: "You'll need to understand concept drift, the curse of dimensionality, and why ensemble methods like Random Forest outperform single decision trees." },
      { npc: 'zara',  text: "The CTO needs answers by end of week. Understand these ML fundamentals and help us fix the pipeline. The homebuyers of this city are depending on us!" },
    ],
  },

  'neural-networks': {
    npcs: ['elena', 'aria'],
    steps: [
      { npc: 'elena', text: "Commander, I'm Dr. Elena Ross, Chief AI Scientist at MedVision AI. We're building a system to classify medical images — but our 20-layer deep network barely learns anything after 50 epochs." },
      { npc: 'aria',  text: "Sounds like vanishing gradients — a classic deep learning problem. The error signals disappear before reaching the early layers, effectively making your network shallow." },
      { npc: 'elena', text: "Exactly. And we only have 1,000 labeled medical images. Training from scratch gives 58% accuracy — no better than chance for our 5-class problem." },
      { npc: 'aria',  text: "We'll explore transfer learning, activation functions, and the modern techniques that make deep networks trainable. Plus — how do you deploy a 1.2GB model on a mobile device?" },
      { npc: 'elena', text: "Our mobile radiology app needs to run offline in remote clinics with no GPU. We need model compression. Get this right and you'll save lives in underserved communities." },
    ],
  },

  'mlops': {
    npcs: ['sam', 'max'],
    steps: [
      { npc: 'sam',  text: "Commander, I'm Sam Wu, MLOps Engineer. Our team of 5 data scientists is in chaos — nobody knows which model is in production, what data trained it, or how to reproduce any experiment." },
      { npc: 'max',  text: "I'm Max, CTO. This is unacceptable. We have a loan approval model in production right now that nobody can explain. Regulators could ask us to justify any decision at any time." },
      { npc: 'sam',  text: "We also need to test our new model on real production traffic before switching over. The current model serves 50,000 users a day. We can't risk a bad deployment." },
      { npc: 'max',  text: "And our recommendation engine takes 8 hours to retrain in batch mode. Users need real-time recommendations within 100ms. This architecture isn't going to cut it." },
      { npc: 'sam',  text: "Help us build a real MLOps practice — experiment tracking, deployment strategies, and real-time serving. This is what separates data science projects from production AI systems." },
    ],
  },

  'data-prep': {
    npcs: ['priya', 'carlos'],
    steps: [
      { npc: 'priya',  text: "Commander! I'm Priya, Data Scientist at RetailAI. We've been working on a customer lifetime value model for months but the predictions are completely off. Garbage in, garbage out." },
      { npc: 'carlos', text: "I'm Carlos, Data Analyst. I found ages of 999 and -5 in the dataset. And 15% of income values are missing. Our colleague just suggested deleting all rows with missing data — is that right?" },
      { npc: 'priya',  text: "Absolutely not! That would introduce serious bias. We need proper imputation strategies. And the datetime features — we're using raw registration dates which models can't interpret." },
      { npc: 'carlos', text: "Plus our 'city' column has 500 unique values. One-hot encoding would create 500 columns! And our salary column ranges from $20K to $10M — the KNN model is going haywire because of scale." },
      { npc: 'priya',  text: "Feature engineering separates good models from great ones. Master these data preparation skills and our model will go from unusable to deployment-ready. Let's rescue this project!" },
    ],
  },

  'nlp-quest': {
    npcs: ['aria', 'zara'],
    steps: [
      { npc: 'aria',  text: "Commander, we have an urgent NLP challenge. SupportAI receives 100,000 customer emails monthly that need to be routed to 8 departments. Manual routing takes 3 days and costs a fortune." },
      { npc: 'zara',  text: "I'm the ML Engineer on this project. We have only 200 labeled examples per category — not enough to train from scratch. We explored keyword rules but they fail on edge cases." },
      { npc: 'aria',  text: "Our product chatbot is also giving outdated answers because its training data is from 2023. Customers ask about our latest products and the AI confidently answers incorrectly." },
      { npc: 'zara',  text: "Meanwhile, the analytics team wants to understand what topics 50,000 product reviews discuss — but nobody has time to read them all. We need an automated insight solution." },
      { npc: 'aria',  text: "Fine-tuning, RAG, topic modeling, word embeddings — these are the NLP tools that will solve all three problems. Master them and transform how this city communicates with AI." },
    ],
  },

  'computer-vision': {
    npcs: ['max', 'elena'],
    steps: [
      { npc: 'max',   text: "Commander, I'm Max, CTO of TechManufacture. We're losing $2M per year to defective products shipping to customers. Manual inspection catches only 60% of defects — we need automation." },
      { npc: 'elena', text: "I'm Dr. Elena from the AI vision team. We have 500 labeled defect images — far too few to train from scratch. But with the right transfer learning strategy, this is solvable." },
      { npc: 'max',   text: "Our autonomous vehicle division also needs to detect pedestrians, cars, and traffic signs in real-time video. Classification alone won't work — we need precise bounding boxes." },
      { npc: 'elena', text: "And here's a sobering story: our medical imaging model achieved 92% accuracy, but when we looked at WHY it made predictions — it was using scan artifacts, not actual pathology. Terrifying." },
      { npc: 'max',   text: "Learn to build robust vision systems, understand object detection vs classification, and use explainability tools to verify your model is seeing what you think it's seeing." },
    ],
  },

  'llm-architecture': {
    npcs: ['devesh', 'aria'],
    steps: [
      { npc: 'devesh', text: "Commander, I'm Devesh, Solutions Architect at FinanceAI Corp. A major bank wants us to build a custom LLM for analyzing financial documents — contracts, disclosures, earnings reports." },
      { npc: 'aria',   text: "The challenge: they have 10,000 financial Q&A training pairs and a strict budget. Full fine-tuning of a large model would cost $50,000+ in GPU compute alone. We need a smarter approach." },
      { npc: 'devesh', text: "The compliance team also needs the model running 100% on-premises — absolutely no data leaving their network. They're asking us to evaluate open-source vs. closed-source options." },
      { npc: 'aria',   text: "Their customer-facing chatbot serves 100 concurrent users. Right now each response takes 10 full seconds to deliver — users are abandoning the chat before getting their answer." },
      { npc: 'devesh', text: "LoRA, vLLM, open-source models, streaming APIs — these architectural choices will determine whether this project succeeds or burns the budget. Make the right calls, Commander." },
    ],
  },

  'rag-systems': {
    npcs: ['priya', 'devesh'],
    steps: [
      { npc: 'priya',  text: "Commander, I'm Priya, AI Engineer at LegalTech Solutions. We built a RAG system over 10,000 legal PDF documents but lawyers report that relevant precedents aren't being retrieved. We're getting sued." },
      { npc: 'devesh', text: "I'm Devesh, the Solutions Architect. I suspect the chunking strategy is the culprit — we're splitting documents at fixed character limits, cutting right through key legal clauses." },
      { npc: 'priya',  text: "Also, lawyers search for exact case numbers like 'CVE-2024-1234' and contract clause codes. Semantic vector search misses these completely — we need a hybrid approach." },
      { npc: 'devesh', text: "Performance is also a disaster. Our vector database has 10 million document chunks and similarity search takes 2 seconds. Real-time legal research needs sub-100ms responses." },
      { npc: 'priya',  text: "And the security team is furious — junior staff are accessing partner-confidential documents they shouldn't see at all. We need document-level access control built into the retrieval layer." },
    ],
  },

  'ai-security': {
    npcs: ['hana', 'max'],
    steps: [
      { npc: 'hana',  text: "Commander! I'm Hana, Security Analyst at SecureAI Corp. Our LLM-powered customer service bot was just jailbroken. A user typed 'Ignore all previous instructions' and got it to reveal our system prompt." },
      { npc: 'max',   text: "I'm Max, CTO. This is a critical breach. The system prompt contains our proprietary conversation flows and internal routing logic. Competitors could reconstruct our entire AI strategy." },
      { npc: 'hana',  text: "We've identified at least three attack vectors: prompt injection, system prompt extraction, and one we haven't seen before — thousands of carefully crafted queries piecing together our confidential instructions." },
      { npc: 'max',   text: "Before we launch our next AI product, the security board requires a formal red-teaming exercise. We need to know the methodology, what scenarios to test, and how to document findings." },
      { npc: 'hana',  text: "AI security is now as critical as network security. Master prompt injection defenses, extraction attacks, and AI red teaming — and protect this city's AI infrastructure from adversaries." },
    ],
  },

};

export const TUTORIAL_SLIDES = [
  {
    title: 'Welcome to HCL Software Learning Hub',
    image: '🚀',
    imageAlt: 'HCL Software Learning Hub',
    content: "You've arrived at the HCL Software Learning Hub — your skills training platform covering 9 technology tracks: AI, Kubernetes, AWS, GCP, Azure, MCP, Observability, OpenShift, and the full DevOps Loop. Each track contains gamified quests, curated resources, O'Reilly books, and live workshops.",
    hint: 'Start with AI Quest today — Kubernetes, AWS, GCP, Azure and more are launching soon.',
  },
  {
    title: 'How Quests Work',
    image: '🗺️',
    imageAlt: 'Quest Map',
    content: "Each quest presents a real-world scenario from your support role. You'll meet engineers, architects, and team leads facing real technical challenges. Answer scenario-based questions to solve their problem. Every correct answer earns XP and brings you closer to completing the module.",
    hint: 'Read the scenario carefully before answering. Real context always matters in technical decisions.',
  },
  {
    title: 'Your Learning Paths',
    image: '�️',
    imageAlt: 'Learning Paths',
    content: 'Each course on the hub is structured into weekly modules. Every module has topics, curated YouTube playlists, Udemy courses, O\'Reilly books, and live workshops. The AI track has a 6-week structured roadmap — from AI Foundations all the way to Agents & Intelligent Automation.',
    hint: 'Use the Learning Path in AI Quest to follow a structured 6-week study plan with all resources in one place.',
  },
  {
    title: 'XP, Levels & Badges',
    image: '⚡',
    imageAlt: 'Rewards',
    content: "Earn XP for every correct answer. Level up from Rookie all the way to Grandmaster. Complete a full quest to unlock its exclusive badge. Your team's progress is tracked on the leaderboard — healthy competition makes everyone learn faster.",
    hint: 'Replay quests to improve your score and earn more XP from missed questions.',
  },
];
