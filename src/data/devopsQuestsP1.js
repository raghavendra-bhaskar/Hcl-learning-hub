// DevOps Loop Quests — Part 1 (Paths 1-3, Quests 1-10)

export const DEVOPS_LOOP_PATHS = [
  { id: 'loop-setup', title: 'Loop Setup & Architecture', description: 'Install, configure, and understand the DevOps Loop platform', icon: '🔄', gradient: 'from-cyan-500 to-blue-600', color: '#06b6d4', quests: ['dq-loop-intro', 'dq-teamspace', 'dq-dashboard'] },
  { id: 'devops-plan', title: 'DevOps Plan', description: 'Change management, workitems, and state transitions', icon: '📋', gradient: 'from-violet-500 to-purple-600', color: '#8b5cf6', quests: ['dq-plan-overview', 'dq-workitem', 'dq-state-transitions', 'dq-plan-components'] },
  { id: 'devops-control', title: 'DevOps Control', description: 'Git hosting, code review, and source traceability', icon: '🗂️', gradient: 'from-indigo-500 to-blue-600', color: '#6366f1', quests: ['dq-control-overview', 'dq-pull-requests', 'dq-traceability'] },
  { id: 'devops-build', title: 'DevOps Build', description: 'CI pipeline, agents, templates, and CodeStation artifacts', icon: '🏗️', gradient: 'from-amber-500 to-orange-600', color: '#f59e0b', quests: ['dq-build-overview', 'dq-build-agents', 'dq-build-templates', 'dq-codestation'] },
  { id: 'devops-deploy-test-measure', title: 'Deploy · Test · Measure', description: 'Enterprise deployments, test automation, and value stream insights', icon: '🚀', gradient: 'from-emerald-500 to-teal-600', color: '#10b981', quests: ['dq-deploy-overview', 'dq-deploy-elements', 'dq-test-hub', 'dq-measure'] },
  { id: 'loop-installation', title: 'Installation & Operations', description: 'CNAPP installation, first steps, and troubleshooting', icon: '🛠️', gradient: 'from-rose-500 to-red-600', color: '#f43f5e', quests: ['dq-install-cnapp', 'dq-install-steps', 'dq-troubleshoot'] },
];

export const DEVOPS_QUESTS_P1 = [
  {
    id: 'dq-loop-intro', pathId: 'loop-setup', title: 'DevOps Loop Fundamentals', subtitle: 'Quest 1 — The Loop Begins',
    description: 'Understand the platform architecture before your first installation.',
    icon: '🔄', difficulty: 'Beginner', difficultyColor: 'text-emerald-400', xp: 150,
    badge: { icon: '🌀', name: 'Loop Pioneer', color: 'from-cyan-400 to-blue-500' }, timeEstimate: '8 min',
    questions: [
      { id: 1, scenario: '🏢 Your manager asks: "What is DevOps Loop?"', question: 'Which BEST describes IBM DevOps Loop?', options: ['A standalone Git repository hosting service', 'A unified CI/CD platform integrating Plan, Control, Build, Deploy, Test, and Measure into one automated lifecycle', 'A project management tool similar to Jira', 'A container orchestration platform like Kubernetes'], correct: 1, explanation: 'DevOps Loop is an integrated platform that auto-provisions and connects Plan, Control (Gitea), Build, Deploy (UCD), Test Hub, and Measure (Velocity) — enabling end-to-end CI/CD traceability.' },
      { id: 2, scenario: '⚙️ A colleague asks: "What gets created when you click Create Loop?"', question: 'When you create a Loop, what happens automatically?', options: ['Only a Git repository is created', 'All tools (Plan, Control, Build, Deploy, Test Hub, Measure) are provisioned and linked together automatically', 'A Kubernetes namespace is created', 'A Jenkins pipeline is created with blank stages'], correct: 1, explanation: "Loop creation auto-provisions corresponding projects in ALL tools — webhooks, plugins, and integrations are all pre-configured. That's Loop's core value: zero-friction tool integration." },
      { id: 3, scenario: '🧩 Your team asks about TeamSpaces vs Loops.', question: 'What is the correct relationship between a TeamSpace and a Loop?', options: ['A Loop contains multiple TeamSpaces', 'TeamSpace and Loop are the same thing', 'A TeamSpace is a secure isolated environment that contains one or more Loops', 'A TeamSpace is a single git repository'], correct: 2, explanation: 'TeamSpace = team-level isolation boundary. Within a TeamSpace, you create Loops (one per app/project). Only TeamSpace members can see that TeamSpace\'s Loops.' },
    ],
  },
  {
    id: 'dq-teamspace', pathId: 'loop-setup', title: 'TeamSpace & Loop Creation', subtitle: 'Quest 2 — Your First Loop',
    description: 'Walk through creating a TeamSpace and your first Loop step by step.',
    icon: '🏗️', difficulty: 'Beginner', difficultyColor: 'text-emerald-400', xp: 150,
    badge: { icon: '🏛️', name: 'Space Builder', color: 'from-blue-400 to-indigo-500' }, timeEstimate: '8 min',
    questions: [
      { id: 1, scenario: '📋 You are creating TeamSpace "TS5". What can you do during creation?', question: 'During TeamSpace creation, which option is available?', options: ['Configure CI/CD pipelines', 'Invite members by searching their IDs and clicking Add', 'Select a cloud provider', 'Upload Docker images'], correct: 1, explanation: 'During TeamSpace creation you can invite members. Note: users must be in the TeamSpace before they can join individual Loops within it.' },
      { id: 2, scenario: '🔤 You create a Loop named "DemoLoop". What will Plan name its app?', question: 'The DevOps Plan application for a Loop named "DemoLoop" will be called:', options: ['DemoLoop-Plan-App', 'DemoL (first 5 characters of the Loop name)', 'PlanApp-DemoLoop', 'DemoLoop (same as Loop name)'], correct: 1, explanation: 'Plan picks the first 5 characters of the Loop name. "DemoLoop" → "DemoL". Workitem IDs use this prefix: e.g., DemoL00000001.' },
      { id: 3, scenario: '👥 A new colleague needs access to a Loop in TS5.', question: 'To add a user to an existing Loop, what is the prerequisite?', options: ['User must have admin rights to the entire installation', 'User must first be added to the TeamSpace containing the Loop', 'User must create their own Loop first', 'No prerequisite — any registered user can join'], correct: 1, explanation: 'TeamSpace membership is required before Loop membership. Only TeamSpace members appear in the Loop member list — enforcing team-level isolation.' },
    ],
  },
  {
    id: 'dq-dashboard', pathId: 'loop-setup', title: 'Loop Dashboard & Value Stream', subtitle: 'Quest 3 — The Big Picture',
    description: 'Navigate the Dashboard and understand the end-to-end Value Stream Map.',
    icon: '📊', difficulty: 'Beginner', difficultyColor: 'text-emerald-400', xp: 175,
    badge: { icon: '🗺️', name: 'Stream Navigator', color: 'from-teal-400 to-cyan-500' }, timeEstimate: '10 min',
    questions: [
      { id: 1, scenario: '📊 You see "dots" moving across VSM stages in DevOps Measure.', question: 'In the Value Stream Map, what do "dots" represent?', options: ['Server nodes in your infrastructure', 'Build agent health indicators', 'Work artifacts (issues, commits, PRs, builds, deployments) flowing through pipeline stages', 'Database connection pools'], correct: 2, explanation: 'Dots represent work artifacts from Plan (issues), Control (PRs/commits), Build (builds), and Deploy (deployments) as they flow through VSM stages — giving real-time delivery visibility.' },
      { id: 2, scenario: '⏱️ Your VSM data seems stale. How does sync work?', question: 'How does the Value Stream synchronize with integrated tools?', options: ['Real-time via WebSockets', 'Only when you manually click Refresh', 'Auto-syncs every 5 minutes; force resync by toggling integration off then on', 'Once per day at midnight'], correct: 2, explanation: 'Default sync = 5 minutes. To force immediate resync: toggle the integration to Disable then Enable. This is the manual resync mechanism.' },
      { id: 3, scenario: '🗺️ A stakeholder asks about the complete workitem flow.', question: 'Which is the correct order of VSM stages in DevOps Loop?', options: ['Build → Deploy → Plan → Code → Test', 'Submitted → Backlog → In Progress → In Review → Completed → Build → DEV → QA → PROD', 'DEV → QA → PROD → Build → Test → Deploy', 'Active → Resolved → Closed → Build → Release'], correct: 1, explanation: 'Full VSM: Submitted → Backlog → In Progress (Active) → In Review (Resolved + open PR) → Completed (Closed + merged PR) → Build stages → DEV → QA → PROD.' },
    ],
  },
  {
    id: 'dq-plan-overview', pathId: 'devops-plan', title: 'DevOps Plan Overview', subtitle: 'Quest 4 — Planning the Mission',
    description: 'Understand the purpose, architecture, and capabilities of DevOps Plan.',
    icon: '📋', difficulty: 'Beginner', difficultyColor: 'text-emerald-400', xp: 150,
    badge: { icon: '📌', name: 'Plan Strategist', color: 'from-violet-400 to-purple-500' }, timeEstimate: '8 min',
    questions: [
      { id: 1, scenario: '💼 Describe DevOps Plan to a new team member.', question: 'Which BEST describes DevOps Plan?', options: ['A code editor for Helm charts', 'A low-code/no-code change management tool with AI assistant for tracking workitems through their full lifecycle', 'A deployment pipeline to production', 'A monitoring tool for application health'], correct: 1, explanation: "DevOps Plan is IBM's change management solution — tracks workitems through configurable workflows with full audit trail, real-time collaboration, and an AI assistant." },
      { id: 2, scenario: '🔧 A colleague asks about Plan core components.', question: 'What are the core components of DevOps Plan?', options: ['Jenkins, Maven, Nexus, SonarQube', 'Workflow types, Plan Application, Backend database, API Server', 'Docker, Kubernetes, Helm, Ingress', 'Git hooks, webhooks, CI triggers, artifact stores'], correct: 1, explanation: 'DevOps Plan = Workflow types (state machines) + Plan Application (UI/project container) + Backend database (record storage) + API Server (integration point for Loop tools).' },
      { id: 3, scenario: '📝 You need to create a workitem. What is mandatory?', question: 'When creating a workitem in DevOps Plan, which field is mandatory and must exist first?', options: ['A milestone must be assigned', 'A sprint must be active', 'A Project must exist and be selected', 'An assignee must be chosen'], correct: 2, explanation: 'Project is a mandatory field. Create it first via New → Project, then create a Workitem and select that project.' },
    ],
  },
  {
    id: 'dq-workitem', pathId: 'devops-plan', title: 'Workitem Creation & Management', subtitle: 'Quest 5 — Issue Tracker Pro',
    description: 'Create and manage workitems — the atomic units of work in DevOps Plan.',
    icon: '🎫', difficulty: 'Beginner', difficultyColor: 'text-emerald-400', xp: 150,
    badge: { icon: '🏷️', name: 'Workitem Wizard', color: 'from-purple-400 to-pink-500' }, timeEstimate: '8 min',
    questions: [
      { id: 1, scenario: '🎫 You create a workitem in Loop "5Loop". What ID format is expected?', question: 'A workitem in Loop "5Loop" will have ID format:', options: ['5LOOP-001', 'WI-2025-001', '5Loop00000002 (5-char prefix + sequential number)', 'TSK-0001'], correct: 2, explanation: 'Plan uses the Loop name as workitem ID prefix. "5Loop" → "5Loop00000002". Reference this ID in git commits to link code changes to workitems.' },
      { id: 2, scenario: '🔗 A developer pushes a commit. How do you link it to a workitem?', question: 'How do you associate a commit in DevOps Control with a Plan workitem?', options: ['Use Plan UI to drag-and-drop the commit', 'Include the workitem record ID in the git commit message', 'Add a #tag in code file comments', 'Loop automatically guesses the association'], correct: 1, explanation: 'Include the workitem record ID (e.g., 5Loop00000002) in the commit message. Verify in Plan → workitem → SCM Events tab.' },
      { id: 3, scenario: '📁 You want to organize workitems by feature area.', question: 'In DevOps Plan, how are workitems organized into logical groups?', options: ['Epics containing Stories', 'Projects — create them first, then assign workitems to them', 'Labels/Tags only', 'A single flat backlog'], correct: 1, explanation: 'Projects are the primary organizational unit. Create via New → Project, then create Workitems and assign to the appropriate Project.' },
    ],
  },
  {
    id: 'dq-state-transitions', pathId: 'devops-plan', title: 'State Transitions & Lifecycle', subtitle: 'Quest 6 — The Workflow Engine',
    description: 'Master the workitem lifecycle from Submitted to Closed.',
    icon: '🔀', difficulty: 'Intermediate', difficultyColor: 'text-yellow-400', xp: 200,
    badge: { icon: '🔁', name: 'Lifecycle Master', color: 'from-cyan-400 to-teal-500' }, timeEstimate: '10 min',
    questions: [
      { id: 1, scenario: '📊 A new workitem is created. What is its initial state?', question: 'Initial state of a newly created workitem in DevOps Plan:', options: ['Backlog', 'Active', 'Submitted', 'New'], correct: 2, explanation: 'New workitems start as "Submitted". Full lifecycle: Submitted → Backlog → Active → Resolved → Closed. Maps to VSM: Submitted → Backlog → In Progress → In Review → Completed.' },
      { id: 2, scenario: '🔄 Developer finished coding and submitted a PR. What workitem state?', question: 'Which Plan state maps to "In Review" in the Value Stream?', options: ['Active — still in progress', 'Submitted — just started', 'Resolved AND pr.status = "open" or "review"', 'Closed — work complete'], correct: 2, explanation: 'VSM "In Review" = issue.status = "Resolved" AND (pr.status = "open" OR pr.status = "review"). Developer done (Resolved in Plan), PR waiting for review in Control.' },
      { id: 3, scenario: '✅ A workitem is "Completed" in the VSM. What is true?', question: 'What condition puts a workitem in VSM "Completed" stage?', options: ['issue.status = "Active" AND pr.status = "merged"', 'issue.status = "Closed" AND pr.status = "merged"', 'issue.status = "Resolved" AND deployment.env = "DEV"', 'issue.status = "Backlog" AND build.status = "Success"'], correct: 1, explanation: 'VSM "Completed" = issue.status = "Closed" AND pr.status = "merged". Both Plan workitem Closed AND Control PR merged = fully done, code-integrated work.' },
    ],
  },
  {
    id: 'dq-plan-components', pathId: 'devops-plan', title: 'Plan Architecture Deep Dive', subtitle: 'Quest 7 — Under the Hood',
    description: 'Understand how Plan integrates with the Loop ecosystem.',
    icon: '⚙️', difficulty: 'Intermediate', difficultyColor: 'text-yellow-400', xp: 200,
    badge: { icon: '🔩', name: 'Plan Architect', color: 'from-indigo-400 to-violet-500' }, timeEstimate: '10 min',
    questions: [
      { id: 1, scenario: '🔗 How does Plan data appear in Measure Value Stream?', question: 'How does DevOps Measure get Plan workitem data?', options: ['Users manually export CSVs from Plan', 'Plan replicates its database to Measure', 'Measure has a Plan integration plugin that pulls issue states via API on a 5-minute sync', 'Developers copy workitem IDs into Measure manually'], correct: 2, explanation: 'Measure has a DevOps Plan integration plugin. It queries Plan API, syncs workitem states, and maps them to VSM stage queries (e.g., issue.status = "Active" → "In Progress" dot). Auto-syncs every 5 minutes.' },
      { id: 2, scenario: '📊 Your team wants Agile sprints in Plan. What workflow type supports this?', question: 'What does "configurable workflow types" mean in DevOps Plan?', options: ['Only Kanban is supported', 'One fixed workflow type per Loop', 'Teams can choose workflows suited to their methodology (Scrum, Kanban, etc.)', 'Workflows only available in Enterprise edition'], correct: 2, explanation: "Plan's low-code/no-code nature includes configurable workflow types. Different Loops can use different styles, and state machines can be adjusted to match team methodology." },
      { id: 3, scenario: "🔍 A workitem's SCM Events tab is empty despite a commit with the workitem ID.", question: "Most likely reason the SCM Events tab shows no commits:", options: ['Developer committed to wrong branch', 'Developer did NOT include workitem record ID in the commit message', 'Plan requires 24-hour delay for SCM events', 'SCM Events only show for "Active" workitems'], correct: 1, explanation: 'The commit-to-workitem link is established by including the record ID in the commit message. Without it, Plan cannot associate the commit, so SCM Events remains empty.' },
    ],
  },
  {
    id: 'dq-control-overview', pathId: 'devops-control', title: 'DevOps Control Overview', subtitle: 'Quest 8 — Source Control Central',
    description: 'Understand the Git hosting platform at the heart of DevOps Loop.',
    icon: '🗂️', difficulty: 'Beginner', difficultyColor: 'text-emerald-400', xp: 150,
    badge: { icon: '🌿', name: 'Git Guardian', color: 'from-green-400 to-emerald-500' }, timeEstimate: '8 min',
    questions: [
      { id: 1, scenario: '🤔 A colleague from GitHub asks what DevOps Control is based on.', question: 'DevOps Control is based on which open-source platform?', options: ['GitLab CE', 'Gitea — a lightweight self-hosted Git service', 'Bitbucket Server', 'Gogs'], correct: 1, explanation: 'DevOps Control is based on Gitea — community-managed, lightweight, written in Go. Uses Chi (HTTP routing), XORM (ORM), and Vue3/CodeMirror/Monaco for UI.' },
      { id: 2, scenario: '🔀 Your team wants code review before merging. Which Control feature supports this?', question: 'DevOps Control supports which two code review workflows?', options: ['Rebase and Cherry-pick workflows', 'Pull Request workflow and AGit workflow', 'Fork and Clone workflows', 'Merge and Squash workflows'], correct: 1, explanation: 'Control supports: Pull Request workflow (standard PR review) and AGit workflow (push-to-create PR). Both enable code review before merging to main.' },
      { id: 3, scenario: '🔗 What repo is auto-created in Control when you create Loop "5Loop" in TeamSpace "TS5"?', question: 'What repository is automatically created in Control on Loop creation?', options: ['A bare repo named "TS5"', 'No repo — create it manually', 'A repo named "TS5/5Loop" (TeamSpace/Loop format)', 'A repo named "main" with Loop name as a branch'], correct: 2, explanation: 'Loop auto-creates a Control repo in TeamSpace/Loop format: "TS5/5Loop". Pre-configured with webhooks to trigger builds on merge events.' },
    ],
  },
  {
    id: 'dq-pull-requests', pathId: 'devops-control', title: 'Pull Requests & Code Review', subtitle: 'Quest 9 — The Review Gate',
    description: 'Master the PR workflow that bridges code changes to build triggers.',
    icon: '🔃', difficulty: 'Intermediate', difficultyColor: 'text-yellow-400', xp: 200,
    badge: { icon: '✅', name: 'Review Gatekeeper', color: 'from-blue-400 to-cyan-500' }, timeEstimate: '10 min',
    questions: [
      { id: 1, scenario: '💻 Developer edits a file and wants to link it to workitem "5Loop00000002".', question: 'Where do you include the workitem record ID when committing in Control?', options: ['In the file as a code comment', 'In the "Commit changes" description/message field', 'In the file name prefix', 'In a metadata.yaml file'], correct: 1, explanation: 'Include workitem record ID in the Commit message field when saving. Creates SCM event link visible in Plan → workitem → SCM Events tab.' },
      { id: 2, scenario: '🔄 After committing, what triggers an automated build?', question: 'What action in Control triggers an automated build in DevOps Build?', options: ['Creating a new branch from main', 'Tagging a commit with a version number', 'Creating and merging a Pull Request to main — webhook fires on merge event', 'Pushing directly to main bypassing PR review'], correct: 2, explanation: 'Build webhook fires on "merge to main" events. Flow: Create PR → Review → Merge to main → webhook → Build Server assigns job → Build Agent executes.' },
      { id: 3, scenario: '🚦 A PR is approved. What merge type preserves full commit history?', question: 'Which merge type preserves all commits when merging a PR in Control?', options: ['Squash merge', 'Rebase merge', 'Create merge commit — preserves all individual commits and history', 'Fast-forward merge'], correct: 2, explanation: '"Create merge commit" is the standard merge type in the hands-on guide. Creates a merge commit preserving full history AND fires the build webhook.' },
    ],
  },
  {
    id: 'dq-traceability', pathId: 'devops-control', title: 'End-to-End Code Traceability', subtitle: 'Quest 10 — The Audit Trail',
    description: 'Connect workitems, commits, builds, and deployments into one traceable chain.',
    icon: '🔍', difficulty: 'Intermediate', difficultyColor: 'text-yellow-400', xp: 200,
    badge: { icon: '🔗', name: 'Trace Master', color: 'from-violet-400 to-indigo-500' }, timeEstimate: '10 min',
    questions: [
      { id: 1, scenario: '🕵️ A production issue was found. How do you trace back to the code change?', question: 'The backward traceability chain from a production artifact is:', options: ['PROD deployment → Snapshot → Component version → Artifact → Commit ID in CodeStation', 'Log file → Error code → Git blame → Developer name', 'PROD deployment → Environment → Agent → Build script', 'Test result → Test case → Code file → Line number'], correct: 0, explanation: 'Full backward trace: PROD deployment used a Snapshot → Snapshot = Component versions → Each version in CodeStation maps to exact Commit ID. Immutable artifacts + commit-linked versions make this possible.' },
      { id: 2, scenario: '📋 Auditor asks: "Show me all commits for workitem 5Loop00000002."', question: 'Where in Plan are all commits associated with a workitem shown?', options: ['Under the "Attachments" tab', 'Under the "SCM Events" tab — shows all commits referencing this workitem ID', 'Under Plan Application dashboard → "Commit History"', 'In a separate "Audit Report" page under Settings'], correct: 1, explanation: '"SCM Events" tab in a Plan workitem shows all Control commits that included the workitem record ID in their commit message — the primary audit trail.' },
      { id: 3, scenario: '🔒 Policy: every code change must trace to an approved workitem.', question: 'Which practice ensures full code-to-workitem traceability in DevOps Loop?', options: ['Restrict developers to Control web UI only', 'Enforce branch naming like "feature/username"', 'Require workitem record ID in every commit message; audit via Plan SCM Events', 'Use code comments in every file with the workitem number'], correct: 2, explanation: 'The formal traceability mechanism: workitem record ID in commit messages. Enforce via team policy or git hooks. Audit compliance via Plan SCM Events tab.' },
    ],
  },
];
