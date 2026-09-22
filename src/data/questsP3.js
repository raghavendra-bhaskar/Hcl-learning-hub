// AI Transformation Learning Path — 9 new quests (Quests 13–21)
// Maps to Week 1 Module 2 → Week 6 of the AI Transformation curriculum

export const QUESTS_P3 = [

  // ── Quest 13 ─ Conversation AI & Prompt Engineering (Week 1, Module 2) ────
  {
    id: 'conv-ai-prompting', pathId: 'ai-transformation',
    title: 'Conversation AI & Prompt Engineering', subtitle: 'Quest 13 — The Art of the Ask',
    description: 'Your team uses ChatGPT daily but gets inconsistent results. Master prompt engineering to unlock reliable, high-quality AI outputs.',
    icon: '💬', difficulty: 'Beginner', difficultyColor: 'text-emerald-400', xp: 160,
    badge: { icon: '🎤', name: 'Prompt Architect', color: 'from-sky-400 to-blue-500' }, timeEstimate: '9 min',
    questions: [
      {
        id: 1,
        scenario: '� Your manager asks you to explain what fundamentally changed when AI shifted from traditional recommendation systems to tools like ChatGPT and GPT-4. She wants the big picture explanation for the board.',
        question: 'In the context of AI, what is the "Generative Shift"?',
        options: [
          'The transition from predictive AI to deep learning.',
          'The difference between Generative AI and traditional predictive AI.',
          'The movement toward using only open-source AI models.',
          'The global adoption of GitHub Copilot.',
        ],
        correct: 1, xpReward: 53,
        explanation: 'The Generative Shift refers to the evolutionary transition from traditional predictive AI (which analyzed historical data to classify or forecast) to Generative AI (which creates entirely new content — text, images, code). Predictive AI answered "What will happen next?" Generative AI creates original data. This shift was enabled by transformer architectures, allowing AI to move from analysis to creation.',
      },
      {
        id: 2,
        scenario: '🎓 A new L2 analyst asks: "Everyone talks about AI but what does it mean to actually understand the foundations? Why should I learn the difference between ML and Deep Learning instead of just using the tools?"',
        question: 'Which term describes moving beyond the hype to understand the difference between Machine Learning and Deep Learning?',
        options: [
          'Platform Flexibility',
          'AI Transformation',
          'AI Foundations',
          'Modular Learning',
        ],
        correct: 2, xpReward: 54,
        explanation: 'AI Foundations means mastering the core underlying concepts rather than following marketing buzzwords. Machine Learning (ML) is a broad subset of AI where algorithms train on data to find patterns without explicit rules. Deep Learning (DL) is a specialized subset of ML using multi-layered neural networks. Understanding these distinct layers helps you make informed decisions about which AI approach fits a given problem.',
      },
      {
        id: 3,
        scenario: '📊 Your support analytics team uses AI to predict which tickets will breach SLA before it happens, based on 2 years of historical ticket and resolution data. Your manager asks which TYPE of AI this represents.',
        question: 'What type of AI is focused on forecasting future events or outcomes?',
        options: [
          'Generative AI',
          'Multi-Modal AI',
          'Predictive AI',
          'Conversational AI',
        ],
        correct: 2, xpReward: 53,
        explanation: 'Predictive AI relies on historical data and statistical modeling to identify patterns and estimate the likelihood of future events. It answers "What is most likely to happen next?" Examples: SLA breach prediction, fraud detection, inventory forecasting. Generative AI creates NEW content. Multi-Modal AI processes multiple input types simultaneously. Conversational AI simulates human dialogue.',
      },
    ],
  },

  // ── Quest 14 ─ Deep Dive into LLMs (Week 2, Module 3) ─────────────────────
  {
    id: 'llm-deep-dive', pathId: 'ai-transformation',
    title: 'Deep Dive into LLMs', subtitle: 'Quest 14 — Inside the Black Box',
    description: 'Your support team relies on LLMs daily. Understand tokens, context limits, temperature, and multi-modal AI to use them effectively.',
    icon: '🔬', difficulty: 'Beginner', difficultyColor: 'text-emerald-400', xp: 175,
    badge: { icon: '🧪', name: 'LLM Insider', color: 'from-violet-400 to-purple-500' }, timeEstimate: '10 min',
    questions: [
      {
        id: 1,
        scenario: '🎛️ Your team\'s AI assistant generates legal email drafts that are too creative and inconsistent — every response sounds different. You need to make the AI produce precise, repeatable outputs. Which LLM parameter should you tune?',
        question: 'If a user wants to control how creative and diverse an LLM\'s response is, they should adjust which parameter?',
        options: [
          'Context Window',
          'PII',
          'Temperature',
          'JSON',
        ],
        correct: 2, xpReward: 58,
        explanation: 'Temperature controls LLM output randomness. High temperature (0.7–1.2): increases creativity and diversity — ideal for brainstorming. Low temperature (0.0–0.3): decreases randomness, forcing the model to pick the most statistically likely words — producing precise, consistent, factual answers. For legal drafts: set Temperature near 0. For creative tasks: set it higher.',
      },
      {
        id: 2,
        scenario: '📄 You paste a 40-page customer incident report into your AI tool. Midway through the analysis, the AI starts giving answers that contradict what was in the first 20 pages — as if it "forgot" the earlier content. What technical limit is causing this?',
        question: 'The size of the "memory" an LLM has for the current conversation is referred to as the:',
        options: [
          'Request/Response Cycle',
          'Context Window',
          'Remote Repository',
          'Asynchronous Task Limit',
        ],
        correct: 1, xpReward: 58,
        explanation: 'The Context Window is the maximum amount of text (measured in tokens) that an LLM can process and remember at one time — it\'s the model\'s working memory. When a conversation exceeds this limit, the AI drops the oldest parts of the chat. GPT-4o: 128K tokens (~96K words). Gemini 1.5 Pro: 1M tokens. Solution: chunk large documents and process in overlapping sections.',
      },
      {
        id: 3,
        scenario: '⚠️ Your AI assistant confidently cites a non-existent IBM support article with a realistic-sounding URL and article title. The article does not exist. Your manager asks what this AI behavior is called.',
        question: 'What term is used to describe when an AI makes up information or states false facts?',
        options: [
          'Hallucinations',
          'Bias',
          'Tokenization',
          'Debugging',
        ],
        correct: 0, xpReward: 59,
        explanation: 'An AI hallucination occurs when an LLM generates an answer that sounds confident and grammatically perfect but is factually incorrect or entirely fabricated. Root cause: LLMs are statistical engines predicting the next likely word — they do not verify facts. Mitigation: RAG (grounds responses in real documents), output validation, and never trusting AI on specific facts without independent verification.',
      },
    ],
  },

  // ── Quest 15 ─ Vibe Coding & AI-Native Development (Week 2, Module 4) ──────
  {
    id: 'vibe-coding', pathId: 'ai-transformation',
    title: 'Vibe Coding & AI-Native Development', subtitle: 'Quest 15 — Code at the Speed of Thought',
    description: 'Your team needs to build internal tools fast. Learn how AI-native development accelerates coding from weeks to hours.',
    icon: '⚡', difficulty: 'Beginner', difficultyColor: 'text-emerald-400', xp: 175,
    badge: { icon: '🚀', name: 'Vibe Developer', color: 'from-orange-400 to-red-500' }, timeEstimate: '9 min',
    questions: [
      {
        id: 1,
        scenario: '💬 A senior developer on your team says they no longer write loops and functions manually. Instead, they describe what they want to build in plain English, and the AI generates the entire implementation. What is this modern development practice called?',
        question: 'A developer moving from writing explicit code to simply defining the intended behavior is practicing what technique?',
        options: [
          'Pull Requests',
          'Multi-Modal AI',
          'Vibe Coding',
          'Server-Side Logic',
        ],
        correct: 2, xpReward: 58,
        explanation: 'Vibe Coding is a software development style where a developer acts as a high-level director — defining features, architecture, and behavior in plain language — while leaving the actual code writing, syntax, debugging, and compilation entirely to an AI. Pull Requests are code review mechanisms. Multi-Modal AI refers to processing multiple input types. Server-Side Logic is back-end programming that executes on a web server.',
      },
      {
        id: 2,
        scenario: '� Your team is evaluating AI coding tools to help analysts write Python automation scripts faster. A colleague recommends GitHub Copilot. When filing the IT procurement form, which category does GitHub Copilot belong to?',
        question: 'What type of tool is GitHub Copilot mentioned as an example of?',
        options: [
          'An Orchestration Framework',
          'A Remote Repository',
          'An AI-Native IDE',
          'A Data Structure',
        ],
        correct: 2, xpReward: 59,
        explanation: 'GitHub Copilot is an AI-powered coding assistant that integrates directly into development environments (VS Code, JetBrains) to act as an AI pair programmer — suggesting code blocks, generating functions from plain-language comments, and assisting with syntax in real-time. An Orchestration Framework (like LangChain) connects LLM components. A Remote Repository (like GitHub itself) stores code in the cloud.',
      },
      {
        id: 3,
        scenario: '🏗️ Your team uses an AI coding assistant to build a ticket-status dashboard. The AI writes all the HTML structure, CSS imports, and standard variable declarations. Your role is to define what the dashboard should show. What is the AI specifically handling?',
        question: 'Vibe Coding encourages the use of AI to handle which part of the coding process?',
        options: [
          'The intent and logic.',
          'The boilerplate code and syntax.',
          'The ethical compliance audit.',
          'The final deployment to a container.',
        ],
        correct: 1, xpReward: 58,
        explanation: 'In Vibe Coding: the developer focuses on intent, architecture, and product logic (what to build). The AI handles the tedious mechanics — writing boilerplate code, syntax, repetitive setup, standard imports, and minor compilation errors. The intent and logic remain the human\'s responsibility. Ethical audits and container deployment are separate concerns from the code-generation aspect of vibe coding.',
      },
    ],
  },

  // ── Quest 16 ─ Using AI Responsibly (Week 3, Module 5) ────────────────────
  {
    id: 'ai-responsible-use', pathId: 'ai-transformation',
    title: 'Using AI Responsibly in the Workplace', subtitle: 'Quest 16 — The Ethical Operator',
    description: 'AI tools are powerful — but misuse can expose your company to legal and security risks. Navigate real compliance and privacy scenarios.',
    icon: '⚖️', difficulty: 'Intermediate', difficultyColor: 'text-yellow-400', xp: 200,
    badge: { icon: '🔏', name: 'Responsible AI User', color: 'from-indigo-400 to-blue-500' }, timeEstimate: '10 min',
    questions: [
      {
        id: 1,
        scenario: '⚖️ Your company\'s AI screening tool is flagging more candidates from certain demographic groups as "high risk." The data team suspects the training data reflects historical hiring inequalities. What process specifically addresses this problem?',
        question: 'What is the process of identifying and minimizing inherent social inequalities within AI training data?',
        options: [
          'Hallucination Reduction',
          'Bias & Fairness Mitigation',
          'Context Window Expansion',
          'Zero-Shot Learning',
        ],
        correct: 1, xpReward: 67,
        explanation: 'Bias & Fairness Mitigation is the active, systematic process of auditing and reducing unfair prejudices in AI systems. AI models inherit real-world societal biases (racism, sexism, ageism) from their training data. Mitigation techniques: balancing training datasets for equal demographic representation, adjusting algorithms to prevent discriminatory scoring, and continuously testing outputs for disparate impact across all groups.',
      },
      {
        id: 2,
        scenario: '🏥 An analyst uses an AI-generated summary of a customer\'s support history to escalate a case. It is later discovered the AI invented two cited incidents that never occurred — but the escalation had already been sent to the customer. What is the primary risk of this AI behavior?',
        question: 'What is the main concern associated with AI "Hallucinations"?',
        options: [
          'Increased cost of tokens.',
          'Production of false or misleading information.',
          'Difficulty in managing version control.',
          'Reduced model memory.',
        ],
        correct: 1, xpReward: 67,
        explanation: 'The primary concern with AI hallucinations is reliability and trust. Because hallucinated text looks professional and persuasive, users may accept false information as fact. In high-stakes environments (customer support, healthcare, legal, financial), acting on hallucinated content causes real harm: wrong escalations, compliance failures, and damaged customer trust. Always validate AI outputs before acting on them.',
      },
      {
        id: 3,
        scenario: '🌐 Your team is building an approved AI vendor list for enterprise use. You need to distinguish between companies that develop foundational AI models versus companies that merely use AI in their products. Which is a core AI Ecosystem player?',
        question: 'Which of the following is an example of a major player in the AI Ecosystem?',
        options: [
          'Netflix',
          'Tesla',
          'Cisco',
          'Anthropic',
        ],
        correct: 3, xpReward: 66,
        explanation: 'Anthropic is an AI safety and research company (founded by former OpenAI leaders) that develops the Claude family of LLMs — a core AI Ecosystem player. Netflix uses ML for recommendations but does not build foundational models. Tesla develops AI for autonomous vehicles/robotics (automotive category). Cisco is a digital networking and communications company, not an AI model developer.',
      },
    ],
  },

  // ── Quest 17 ─ AI Agents & Orchestration (Week 3, Module 6) ───────────────
  {
    id: 'ai-agents-orchestration', pathId: 'ai-transformation',
    title: 'AI Agents & Orchestration Frameworks', subtitle: 'Quest 17 — The Autonomous Workforce',
    description: 'Move beyond chatbots. Build AI agents that take actions, connect tools, and orchestrate multi-step workflows autonomously.',
    icon: '🤖', difficulty: 'Intermediate', difficultyColor: 'text-yellow-400', xp: 225,
    badge: { icon: '🕹️', name: 'Agent Engineer', color: 'from-emerald-400 to-teal-600' }, timeEstimate: '12 min',
    questions: [
      {
        id: 1,
        scenario: '🤖 Your current customer service chatbot answers FAQ questions via text responses. The next version should automatically look up a customer\'s account in ServiceNow, check their ticket history, generate a resolution email, and send it — all without human intervention. What is this upgraded system?',
        question: 'What is the fundamental difference between a traditional "chatbot" and an "AI Agent"?',
        options: [
          'Agents use Python; chatbots use JavaScript.',
          'Agents can perform actions (e.g., run a script, browse the web), while chatbots primarily converse.',
          'Chatbots use RAG; agents do not.',
          'Agents are limited by the context window; chatbots are not.',
        ],
        correct: 1, xpReward: 75,
        explanation: 'Traditional chatbots are reactive and conversational — they generate a text response and stop. AI Agents are proactive and action-oriented — equipped with tools (APIs, web browsers, code executors, databases) they can break a complex goal into steps, execute those steps autonomously, and self-correct. Both chatbots and agents can use RAG. Both are bound by context windows. Programming language choice is irrelevant.',
      },
      {
        id: 2,
        scenario: '� Your team needs the AI to answer questions about internal SOPs, product manuals, and past incident reports — documents created after the AI\'s training cutoff. Retraining the model would cost $50K+. What architecture solves this efficiently?',
        question: 'What is the primary benefit of using RAG?',
        options: [
          'It allows LLMs to access domain-specific data without costly and time-consuming retraining.',
          'It ensures that all AI-generated code is legally compliant.',
          'It speeds up Python script execution.',
          'It is a required step for all Git commits.',
        ],
        correct: 0, xpReward: 75,
        explanation: 'RAG (Retrieval-Augmented Generation) solves the LLM knowledge cutoff problem without retraining. How it works: vectorize your documents, embed the user query, retrieve the top-k most similar document chunks, inject those chunks into the LLM prompt. The model answers from YOUR current knowledge base. This guarantees accuracy, supports real-time document updates, and reduces hallucinations — at a fraction of retraining cost.',
      },
      {
        id: 3,
        scenario: '⚙️ You need to build a workflow: new P1 ticket arrives → knowledge base search → draft resolution → Slack notification → JIRA sub-task. You need a framework that chains these LLM-powered steps together with memory and conditional branching.',
        question: 'Which framework is mentioned for enabling multi-step AI tasks?',
        options: [
          'GitHub',
          'OAuth2',
          'LangChain',
          'Docker',
        ],
        correct: 2, xpReward: 75,
        explanation: 'LangChain is an open-source orchestration framework that enables complex, multi-step LLM applications. It allows developers to chain prompt templates, connect multiple models, maintain memory, and integrate external tools (APIs, databases, web browsers). GitHub is a code hosting platform. OAuth2 is an authentication protocol. Docker is a containerization platform — not an LLM orchestration tool.',
      },
    ],
  },

  // ── Quest 18 ─ Python for AI Automation (Week 4, Module 7A) ───────────────
  {
    id: 'python-ai', pathId: 'ai-transformation',
    title: 'Python for AI Automation', subtitle: 'Quest 18 — The Scripting Mindset',
    description: 'Python is the lingua franca of AI. Move from manual tasks to automated scripts that save hours of repetitive support work.',
    icon: '🐍', difficulty: 'Beginner', difficultyColor: 'text-emerald-400', xp: 175,
    badge: { icon: '⚙️', name: 'Python Automator', color: 'from-yellow-400 to-green-500' }, timeEstimate: '10 min',
    questions: [
      {
        id: 1,
        scenario: '� Your new automation team is choosing which programming language to standardize on for AI scripts. The data science team unanimously recommends Python. When asked to justify the recommendation, what is the primary reason?',
        question: 'Why is Python highlighted as the industry standard for AI Automation?',
        options: [
          'Its native support for OAuth2.',
          'Its simplicity, readability, and ecosystem of libraries.',
          'Its exclusive use of the POST HTTP method.',
          'Its inherent security against PII leaks.',
        ],
        correct: 1, xpReward: 58,
        explanation: 'Python dominates AI for three reasons: (1) Simplicity — clean, high-level syntax reads like plain English, letting you focus on solving problems rather than language mechanics, (2) Massive AI ecosystem — pandas for data, TensorFlow/PyTorch for ML, LangChain for LLMs, openai SDK for integration, (3) Community — global support, open-source tools, and documentation. All programming languages support OAuth2 and HTTP methods.',
      },
      {
        id: 2,
        scenario: '⚡ A senior engineer describes their approach: "I write small, focused Python scripts that glue pre-built libraries together rather than building everything from scratch. My goal is speed and leverage." What mindset does this describe?',
        question: 'What is the main characteristic of the "Scripting Mindset" for AI automation?',
        options: [
          'Using Natural Language Programming only.',
          'Focusing on Python\'s simplicity and ecosystem of libraries.',
          'Only writing code in AI-Native IDEs.',
          'Committing code daily without review.',
        ],
        correct: 1, xpReward: 58,
        explanation: 'The Scripting Mindset values agility and leverage over building from scratch. It means writing lightweight Python scripts that glue pre-built components together — using openai for LLM calls, requests for API interactions, pandas for data manipulation. The heavy lifting is done by the library ecosystem. A scripting mindset is a philosophy, not tied to any specific IDE or tool.',
      },
      {
        id: 3,
        scenario: '� You are writing a Python ticket processor. It should send an alert email only when priority is "P1". For all other priorities, it should simply log the ticket. Which Python construct handles this decision-making logic?',
        question: 'What control flow structure in Python allows code to execute conditionally?',
        options: [
          'Commits',
          'Branches',
          'If/else statements',
          'Tokens',
        ],
        correct: 2, xpReward: 59,
        explanation: 'If/else statements allow a script to make decisions and change its execution path based on whether a condition is true or false. This mimics human decision-making: "If priority == P1, send alert; else, log the ticket." Commits are saved snapshots in Git. Branches are independent development lines in Git. Tokens are the fragments of text LLMs use to process prompts.',
      },
    ],
  },

  // ── Quest 19 ─ Version Control with Git & GitHub (Week 4, Module 7B) ───────
  {
    id: 'git-github', pathId: 'ai-transformation',
    title: 'Version Control with Git & GitHub', subtitle: 'Quest 19 — The Safety Net',
    description: 'Your team builds automation scripts together. Without Git, changes overwrite each other and bugs have no undo button. Fix that.',
    icon: '🌿', difficulty: 'Beginner', difficultyColor: 'text-emerald-400', xp: 160,
    badge: { icon: '🌐', name: 'Git Guardian', color: 'from-green-400 to-emerald-600' }, timeEstimate: '9 min',
    questions: [
      {
        id: 1,
        scenario: '� Your team stores all automation scripts on a local shared drive. When two analysts edit the same file simultaneously, changes are lost and there is no history. A colleague recommends GitHub. What is GitHub\'s primary function that solves this problem?',
        question: 'What is the primary function of GitHub in relation to Git?',
        options: [
          'To execute Python code.',
          'To act as a remote repository for backup and team collaboration.',
          'To handle API request/response cycles.',
          'To perform JSON parsing.',
        ],
        correct: 1, xpReward: 53,
        explanation: 'Git is the local tool installed on your computer that tracks file history and handles version control. GitHub is the cloud-based hosting service for Git repositories. Pushing code to GitHub creates a secure cloud backup and provides collaboration tools (pull requests, code reviews, issue trackers) for team development. GitHub does not execute Python code, handle API cycles, or parse JSON.',
      },
      {
        id: 2,
        scenario: '🤖 Your procurement team asks you to classify GitHub Copilot in their software category system. Is it a version control tool, a code library, a data transformation tool, or something else entirely?',
        question: 'Tools like GitHub Copilot are categorized under:',
        options: [
          'Version Control Systems',
          'AI-Native IDEs',
          'Enterprise Scripting Libraries',
          'Data Transformation Tools',
        ],
        correct: 1, xpReward: 53,
        explanation: 'GitHub Copilot is an AI-powered coding assistant that integrates into IDEs to act as a virtual pair programmer — predicting code blocks, generating logic from comments, and assisting with syntax in real-time. Version Control Systems (like Git) manage code history. Enterprise Scripting Libraries (like NumPy) are code packages. Data Transformation Tools handle ETL pipelines.',
      },
      {
        id: 3,
        scenario: '� Your laptop crashed and you lost 2 days of script changes. A teammate who pushed their work to GitHub every day lost nothing. When you ask what protected their work, they point to a specific Git/GitHub feature. Which one?',
        question: 'When syncing local work with GitHub, what feature is being utilized for backup?',
        options: [
          'Collaborative Development',
          'Core Concepts',
          'Remote Repositories',
          'If/else logic',
        ],
        correct: 2, xpReward: 54,
        explanation: 'A Remote Repository is a version of your project hosted on the internet (on GitHub\'s cloud servers). Running `git push` uploads your local commits to this remote server — creating a secure cloud backup. Even if your local hardware fails, your complete development history is preserved. "Collaborative Development" is enabled BY remote repos but is not the backup mechanism itself.',
      },
    ],
  },

  // ── Quest 20 ─ API Automation & Data Handling (Week 5, Module 8) ───────────
  {
    id: 'api-automation', pathId: 'ai-transformation',
    title: 'API Automation & Data Handling', subtitle: 'Quest 20 — The Digital Handshake',
    description: 'APIs are the connective tissue of AI automation. Master REST, JSON, and authentication to build integrations that actually work.',
    icon: '🔌', difficulty: 'Intermediate', difficultyColor: 'text-yellow-400', xp: 225,
    badge: { icon: '🔗', name: 'API Integrator', color: 'from-cyan-400 to-teal-500' }, timeEstimate: '12 min',
    questions: [
      {
        id: 1,
        scenario: '📬 You write a Python script to fetch all open P1 tickets from your ticketing system\'s API. The API documentation says: "Use GET /api/tickets?status=open&priority=P1". But a new ticket must be created via "POST /api/tickets with a JSON body." Your junior teammate asks why different HTTP methods are used.',
        question: 'What is the correct explanation of REST HTTP methods?',
        options: [
          'GET and POST are interchangeable — use whichever the API documentation lists first',
          'GET retrieves data without side effects; POST creates or sends data with a request body; PUT updates existing resources; DELETE removes them — each method has a semantic contract',
          'GET is for public APIs and POST is for private APIs requiring authentication',
          'POST is always faster than GET because it bypasses caching',
        ],
        correct: 1, xpReward: 75,
        explanation: 'REST HTTP methods have semantic meaning: GET = read (no side effects, cacheable), POST = create/submit (has a body), PUT/PATCH = update, DELETE = remove. This consistency lets any developer predict what an endpoint does. GET `/tickets/123` retrieves ticket 123. POST `/tickets` with `{"priority":"P1"}` creates a new ticket. Never use GET to create data — it violates REST conventions.',
      },
      {
        id: 2,
        scenario: '📦 You receive this JSON API response and need to extract the first assignee\'s email address:\n`{"ticket":{"id":101,"assignees":[{"name":"Alice","email":"alice@co.com"},{"name":"Bob","email":"bob@co.com"}],"status":"open"}}`',
        question: 'Which Python code correctly extracts Alice\'s email from this nested JSON?',
        options: [
          'response["email"]',
          'response["ticket"]["assignees"][0]["email"]',
          'response.ticket.assignees.email[0]',
          'response["assignees"]["email"][0]',
        ],
        correct: 1, xpReward: 75,
        explanation: 'JSON becomes a Python dict after `json.loads()` or `response.json()`. Navigate nested structures: `response["ticket"]` → the ticket dict, `["assignees"]` → the list, `[0]` → the first element (Alice), `["email"]` → "alice@co.com". Always check that the key exists using `.get()` for optional fields. Missing a bracket level is the #1 JSON parsing bug.',
      },
      {
        id: 3,
        scenario: '🔐 You integrate with the Google Workspace API. The documentation says you need OAuth 2.0 for user data access. A shortcut colleague suggests just using an API key "because it\'s simpler." Your security team raises a flag.',
        question: 'Why does Google Workspace require OAuth 2.0 instead of a simple API key for user data?',
        options: [
          'OAuth 2.0 is just a newer version of API keys — they are functionally identical',
          'API keys grant full access to the entire account with no expiry; OAuth 2.0 issues scoped, time-limited access tokens — users grant specific permissions and can revoke access without rotating their credentials',
          'OAuth 2.0 makes API calls faster by caching access tokens',
          'OAuth 2.0 is only required for paid APIs; free APIs can always use API keys',
        ],
        correct: 1, xpReward: 75,
        explanation: 'OAuth 2.0 provides: (1) Scoped access — "read-only gmail" not "full account access", (2) Time-limited tokens that expire automatically, (3) User consent — users approve specific permissions, (4) Revocable — users can revoke access without changing passwords. API keys are static secrets — one breach exposes everything permanently. For user data: OAuth 2.0 is mandatory for security and compliance.',
      },
    ],
  },

  // ── Quest 21 ─ Docker & Advanced Deployment (Week 6, Module 9) ────────────
  {
    id: 'docker-cloud', pathId: 'ai-transformation',
    title: 'Docker & Deployment Automation', subtitle: 'Quest 21 — Ship It Everywhere',
    description: 'Your AI tools work on your laptop but fail in production. Learn containerization to make your automation portable, consistent, and scalable.',
    icon: '🐳', difficulty: 'Intermediate', difficultyColor: 'text-yellow-400', xp: 200,
    badge: { icon: '🏗️', name: 'Container Captain', color: 'from-blue-400 to-sky-600' }, timeEstimate: '11 min',
    questions: [
      {
        id: 1,
        scenario: '🖥️ Your AI ticket-processing script works perfectly on your Windows laptop. You send it to a Linux server and it crashes: "No module named \'openai\'", "python3: command not found", and the config file path is wrong.',
        question: 'What technology eliminates "it works on my machine" problems permanently?',
        options: [
          'Upload the entire laptop OS to the server',
          'Docker containers — package the application, all dependencies, runtime, and config into a single portable image that runs identically on any OS or cloud',
          'Write the script in JavaScript instead of Python for cross-platform compatibility',
          'Use a virtual machine — it also packages the OS but is lighter weight than Docker',
        ],
        correct: 1, xpReward: 67,
        explanation: 'Docker containers bundle: your Python script + exact Python version + all pip dependencies + runtime config into an immutable image. `docker run` produces identical behavior on Windows laptop, Linux server, AWS, Azure, or GCP. The key insight: Docker standardizes the entire runtime environment, not just the code.',
      },
      {
        id: 2,
        scenario: '📋 You need to containerize your Python AI script. A Dockerfile is a text file that defines how to build a Docker image. Review this incomplete Dockerfile:\n```\nFROM python:3.11-slim\nWORKDIR /app\nCOPY requirements.txt .\n___ requirements.txt\nCOPY . .\nCMD ["python", "processor.py"]\n```\nWhat command goes on the blank line to install Python dependencies?',
        question: 'Which Dockerfile instruction installs Python packages listed in requirements.txt?',
        options: [
          'INSTALL pip install -r requirements.txt',
          'RUN pip install -r requirements.txt',
          'EXEC pip install -r requirements.txt',
          'ADD pip install -r requirements.txt',
        ],
        correct: 1, xpReward: 66,
        explanation: 'Dockerfile instructions: FROM (base image), WORKDIR (working directory), COPY (files into image), RUN (execute a shell command during build), CMD (command to run when container starts). `RUN pip install -r requirements.txt` executes during the image build, baking all dependencies into the image layer. This is why Docker containers are self-contained — no missing packages at runtime.',
      },
      {
        id: 3,
        scenario: '🏢 Your AI automation service handles 50 support requests/hour normally, but spikes to 2,000/hour during major incidents. On a fixed server, it times out under load. Your infrastructure team asks how to scale the containerized service.',
        question: 'What is the key advantage of containerized microservices for handling variable AI workloads?',
        options: [
          'Containers automatically optimize code performance without hardware changes',
          'You must provision maximum capacity servers at all times to handle peak load',
          'Containers can be horizontally scaled — orchestrators (Kubernetes, AWS ECS) spin up additional container instances during spikes and shut them down when load drops, paying only for actual usage',
          'Containers only work for web servers, not for AI processing workloads',
        ],
        correct: 2, xpReward: 67,
        explanation: 'Container orchestration (Kubernetes, AWS ECS, Azure Container Apps) enables auto-scaling: normal load → 2 container instances, incident spike → 40 instances (in ~30 seconds), post-incident → scale back to 2. Each instance is identical (same Docker image). For AI teams: deploy each AI tool as an independent microservice — scale, update, or roll back each one independently without touching the rest.',
      },
    ],
  },
];
