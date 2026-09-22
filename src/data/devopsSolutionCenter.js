// DevOps Loop Solution Center — Learn content for 21 quests
// Shared architecture: the DevOps Loop tool chain (Plan→Control→Build→Deploy→Test→Measure)

// ── Shared DevOps Loop architecture nodes & edges ────────────────────────────
export const LOOP_NODES = [
  { id: 'loop',        label: 'TeamSpace / Loop', icon: '🔄', col: 1, row: 2 },
  { id: 'plan',        label: 'DevOps Plan',      icon: '📋', col: 2, row: 1 },
  { id: 'control',     label: 'DevOps Control',   icon: '🗂️', col: 3, row: 1 },
  { id: 'build',       label: 'DevOps Build',     icon: '🏗️', col: 4, row: 1 },
  { id: 'codestation', label: 'CodeStation',      icon: '📦', col: 4, row: 3 },
  { id: 'deploy',      label: 'DevOps Deploy',    icon: '🚀', col: 5, row: 3 },
  { id: 'test',        label: 'Test Hub',         icon: '🧪', col: 6, row: 3 },
  { id: 'measure',     label: 'Measure / VSM',    icon: '📊', col: 6, row: 1 },
];

export const LOOP_EDGES = [
  { from: 'loop',        to: 'plan',        label: 'provisions toolchain', labelT: 0.46 },
  { from: 'plan',        to: 'control',     label: 'Workitem ID' },
  { from: 'control',     to: 'build',       label: 'Merge→Webhook' },
  { from: 'build',       to: 'codestation', label: 'Artifact Upload' },
  { from: 'codestation', to: 'deploy',      label: 'Component Version' },
  { from: 'deploy',      to: 'test',        label: 'Run Tests' },
  { from: 'test',        to: 'measure',     dashed: true, label: 'Quality + flow metrics' },
];

// ── Video links ───────────────────────────────────────────────────────────────
export const DEVOPS_VIDEO_LINKS = {
  'DevOps Loop Overview':    'https://www.youtube.com/results?search_query=IBM+DevOps+Loop+platform+overview',
  'TeamSpace Setup':         'https://www.youtube.com/results?search_query=IBM+DevOps+Loop+TeamSpace+Loop+creation',
  'Value Stream Map':        'https://www.youtube.com/results?search_query=IBM+DevOps+Velocity+Value+Stream+Map',
  'DevOps Plan Intro':       'https://www.youtube.com/results?search_query=IBM+DevOps+Plan+change+management',
  'Workitem Lifecycle':      'https://www.youtube.com/results?search_query=IBM+DevOps+Plan+workitem+lifecycle',
  'State Transitions':       'https://www.youtube.com/results?search_query=DevOps+workitem+state+machine+workflow',
  'Plan API Integration':    'https://www.youtube.com/results?search_query=IBM+DevOps+Plan+API+Velocity+integration',
  'Gitea Source Control':    'https://www.youtube.com/results?search_query=Gitea+self+hosted+git+server+tutorial',
  'Pull Request Workflow':   'https://www.youtube.com/results?search_query=pull+request+code+review+merge+workflow',
  'DevOps Traceability':     'https://www.youtube.com/results?search_query=DevOps+code+traceability+audit+trail',
  'CI Build Pipeline':       'https://www.youtube.com/results?search_query=CI+build+pipeline+overview+tutorial',
  'Build Agent Config':      'https://www.youtube.com/results?search_query=CI+CD+build+agent+pool+configuration',
  'Build Templates':         'https://www.youtube.com/results?search_query=IBM+DevOps+Build+job+template+steps',
  'CodeStation Artifacts':   'https://www.youtube.com/results?search_query=IBM+CodeStation+artifact+versioning',
  'UrbanCode Deploy':        'https://www.youtube.com/results?search_query=IBM+UrbanCode+Deploy+UCD+tutorial',
  'Deploy Snapshots':        'https://www.youtube.com/results?search_query=IBM+UrbanCode+Deploy+snapshots+components',
  'Test Hub Recording':      'https://www.youtube.com/results?search_query=IBM+DevOps+Test+Hub+web+UI+recording',
  'DORA Metrics':            'https://www.youtube.com/results?search_query=DORA+metrics+DevOps+deployment+frequency',
  'Kubernetes StorageClass': 'https://www.youtube.com/results?search_query=Kubernetes+ReadWriteMany+StorageClass+NFS',
  'Helm Install':            'https://www.youtube.com/results?search_query=Helm+chart+Kubernetes+install+tutorial',
  'Build Troubleshooting':   'https://www.youtube.com/results?search_query=CI+CD+build+failure+troubleshooting',
};

export const DEVOPS_QUEST_MORE_VIDEOS = {
  'dq-loop-intro':         'https://www.youtube.com/results?search_query=IBM+DevOps+Loop+overview',
  'dq-teamspace':          'https://www.youtube.com/results?search_query=IBM+DevOps+Loop+TeamSpace+Loop',
  'dq-dashboard':          'https://www.youtube.com/results?search_query=IBM+DevOps+Velocity+Value+Stream',
  'dq-plan-overview':      'https://www.youtube.com/results?search_query=IBM+DevOps+Plan+tutorial',
  'dq-workitem':           'https://www.youtube.com/results?search_query=IBM+DevOps+Plan+workitem',
  'dq-state-transitions':  'https://www.youtube.com/results?search_query=DevOps+issue+state+lifecycle',
  'dq-plan-components':    'https://www.youtube.com/results?search_query=IBM+DevOps+Plan+architecture',
  'dq-control-overview':   'https://www.youtube.com/results?search_query=Gitea+git+hosting+tutorial',
  'dq-pull-requests':      'https://www.youtube.com/results?search_query=git+pull+request+code+review',
  'dq-traceability':       'https://www.youtube.com/results?search_query=DevOps+end+to+end+traceability',
  'dq-build-overview':     'https://www.youtube.com/results?search_query=IBM+DevOps+Build+CI+pipeline',
  'dq-build-agents':       'https://www.youtube.com/results?search_query=build+agent+configuration+CI',
  'dq-build-templates':    'https://www.youtube.com/results?search_query=IBM+DevOps+Build+templates',
  'dq-codestation':        'https://www.youtube.com/results?search_query=IBM+CodeStation+artifact+management',
  'dq-deploy-overview':    'https://www.youtube.com/results?search_query=IBM+UrbanCode+Deploy+architecture',
  'dq-deploy-elements':    'https://www.youtube.com/results?search_query=IBM+UrbanCode+Deploy+components',
  'dq-test-hub':           'https://www.youtube.com/results?search_query=IBM+DevOps+Test+Hub',
  'dq-measure':            'https://www.youtube.com/results?search_query=IBM+DevOps+Velocity+insights',
  'dq-install-cnapp':      'https://www.youtube.com/results?search_query=Kubernetes+CNAPP+storage+ReadWriteMany',
  'dq-install-steps':      'https://www.youtube.com/results?search_query=Helm+Kubernetes+DevOps+install',
  'dq-troubleshoot':       'https://www.youtube.com/results?search_query=DevOps+build+pipeline+troubleshoot',
};

// ── Solution Center content per quest ─────────────────────────────────────────
// Each quest: { solutionRequest, nodes, edges, steps[] }
// steps: { highlight: [nodeId,...], text, link? }
// All quests share LOOP_NODES and LOOP_EDGES — different highlights per step

export const DEVOPS_SOLUTION_CENTER = {

  'dq-loop-intro': {
    solutionRequest: 'Your team is adopting IBM DevOps Loop. Before the first installation, understand the complete platform architecture: what each tool does and how they connect automatically when a Loop is created.',
    nodes: LOOP_NODES, edges: LOOP_EDGES,
    steps: [
      { highlight: ['loop'], text: 'IBM DevOps Loop is a unified CI/CD platform. When you create a Loop (linked to a TeamSpace), it automatically provisions ALL integrated tools and connects them with pre-configured webhooks, plugins, and naming conventions.', link: 'DevOps Loop Overview' },
      { highlight: ['plan'], text: 'DevOps Plan is Loop\'s change management tool. It tracks workitems (features, bugs, tasks) through configurable workflows with full audit trail and an AI assistant.', link: 'DevOps Plan Intro' },
      { highlight: ['control'], text: 'DevOps Control (based on Gitea) is Loop\'s source code hosting platform. It auto-creates a repository in TeamSpace/Loop format and configures build webhooks on merge events.' },
      { highlight: ['build', 'codestation'], text: 'DevOps Build executes CI jobs via a Build Server → Build Agent flow. Compiled artifacts (e.g., JPetStore.war) are stored immutably in CodeStation with commit-linked version metadata.' },
      { highlight: ['deploy', 'test'], text: 'DevOps Deploy (UCD) deploys component versions to DEV/QA/PROD environments. DevOps Test Hub records and replays automated UI tests against deployed applications.' },
      { highlight: ['measure'], text: 'DevOps Measure (Velocity) aggregates data from all tools via integration plugins, visualizes the end-to-end Value Stream Map, and provides DORA metrics dashboards.', link: 'Value Stream Map' },
    ],
  },

  'dq-teamspace': {
    solutionRequest: 'You need to create a new TeamSpace (TS5) and your first Loop within it. Understand the naming rules, member management, and what gets auto-created when the Loop is created.',
    nodes: LOOP_NODES, edges: LOOP_EDGES,
    steps: [
      { highlight: ['loop'], text: 'A TeamSpace is a secure, isolated environment (like a tenant) within a shared DevOps Loop installation. Navigate to TeamSpaces → New TeamSpace to create one.', link: 'TeamSpace Setup' },
      { highlight: ['loop'], text: 'During TeamSpace creation you can invite members by ID. Only TeamSpace members can later join Loops within that TeamSpace — membership is the isolation boundary.' },
      { highlight: ['loop', 'plan'], text: 'When creating a Loop, Plan uses the FIRST 5 CHARACTERS of the Loop name as its application name. "DemoLoop" → "DemoL". This prefix appears in all workitem IDs: DemoL00000001.' },
      { highlight: ['loop', 'control'], text: 'Loop creation auto-creates a Control repository named "TS5/5Loop" (TeamSpace/Loop). The repository comes pre-configured with build webhooks — no manual setup needed.' },
      { highlight: ['loop', 'build', 'deploy', 'test', 'measure'], text: 'Simultaneously, Loop provisions a Build project, Deploy application, Test Hub project, and Measure value stream — all named consistently with the Loop for easy identification.' },
      { highlight: ['loop'], text: 'To add members to a Loop, they must ALREADY be in the TeamSpace. In Loop settings → Members, only existing TeamSpace members appear. This two-tier access model ensures team isolation.' },
    ],
  },

  'dq-dashboard': {
    solutionRequest: 'Your team lead wants a real-time view of the entire delivery pipeline from workitem creation to production. Understand the DevOps Loop Dashboard, Value Stream Map, and sync mechanism.',
    nodes: LOOP_NODES, edges: LOOP_EDGES,
    steps: [
      { highlight: ['measure'], text: 'The DevOps Measure Value Stream Map (VSM) provides end-to-end visibility. "Dots" represent work artifacts (issues, PRs, builds, deployments) flowing through pipeline stages in real time.', link: 'Value Stream Map' },
      { highlight: ['plan'], text: 'VSM Stage 1-2: Submitted (new workitem) → Backlog (planned). Stage 3: In Progress (issue.status = "Active"). All driven by Plan workitem state changes.' },
      { highlight: ['plan', 'control'], text: 'VSM Stage 4: In Review = issue.status = "Resolved" AND pr.status = "open". Stage 5: Completed = issue.status = "Closed" AND pr.status = "merged".' },
      { highlight: ['build', 'codestation'], text: 'VSM Build stages: Build Failed or Build Success appear when the merged PR triggers a Build job. The dot moves from "Completed" code stage into the Build stage.' },
      { highlight: ['deploy'], text: 'VSM Deployment stages: DEV → QA → PROD. Each environment promotion appears as a new dot position in the VSM, driven by Deploy job completion events.' },
      { highlight: ['measure'], text: 'VSM syncs automatically every 5 minutes. To force an immediate resync: toggle an integration plugin to Disable then Enable. Data comes from Plan, Control, Build, Deploy, Test via API polling.' },
    ],
  },

  'dq-plan-overview': {
    solutionRequest: 'A new engineer joins and asks how IBM DevOps Plan works. Walk them through the core components, workflow types, and how Plan fits into the DevOps Loop change management lifecycle.',
    nodes: LOOP_NODES, edges: LOOP_EDGES,
    steps: [
      { highlight: ['plan'], text: 'DevOps Plan is a low-code/no-code change management tool. It tracks workitems through configurable state machines with full audit history and built-in AI assistant for work management.', link: 'DevOps Plan Intro' },
      { highlight: ['plan'], text: 'Plan\'s core components: (1) Workflow types — configurable state machines. (2) Plan Application — the UI/project container named with first 5 chars of Loop name. (3) Backend database + API Server.' },
      { highlight: ['plan'], text: 'Creating a workitem requires a mandatory Project field. Create a Project first via New → Project. Projects organize related workitems under one container within the Plan Application.' },
      { highlight: ['plan'], text: 'Plan supports configurable workflow types — teams can choose between Scrum, Kanban, or custom workflows. Different Loops can use different workflow styles simultaneously.' },
      { highlight: ['plan', 'control'], text: 'Including the workitem record ID (e.g., 5Loop00000002) in a git commit message creates an automatic link. Plan shows all associated commits in the workitem\'s "SCM Events" tab.', link: 'Workitem Lifecycle' },
      { highlight: ['plan', 'measure'], text: 'Plan integrates with Measure (Velocity) via an API plugin that syncs workitem states every 5 minutes. Each state maps to a VSM stage, turning workitem progress into visual delivery metrics.' },
    ],
  },

  'dq-workitem': {
    solutionRequest: 'The team needs a clear process for creating workitems, linking them to code changes, and organizing them into projects. Establish the standard DevOps Plan workitem workflow.',
    nodes: LOOP_NODES, edges: LOOP_EDGES,
    steps: [
      { highlight: ['plan'], text: 'Workitems are created in Plan via New → Workitem. The mandatory Project field must be selected — create the Project first (New → Project → name → Save) before creating workitems.', link: 'Workitem Lifecycle' },
      { highlight: ['plan'], text: 'Workitem IDs use the Loop name prefix. For Loop "5Loop", IDs are: 5Loop00000001, 5Loop00000002. This ID is the critical linkage key — used in commit messages to connect code to work.' },
      { highlight: ['plan'], text: 'Each workitem starts as "Submitted". Move it to Backlog → Active as the team picks it up. The state change is visible in the VSM real-time — stakeholders see progress without manual updates.' },
      { highlight: ['plan', 'control'], text: 'To link a commit: in DevOps Control, when editing/committing a file, include the FULL workitem record ID in the Commit Changes description field. Example: "Fix login bug 5Loop00000002".' },
      { highlight: ['plan', 'control'], text: 'After committing with the workitem ID: open Plan → select the workitem → click "SCM Events" tab. All linked commits appear here — file changed, commit hash, author, timestamp.' },
      { highlight: ['plan'], text: 'Projects group related workitems. Use New → Project for each feature area (e.g., "Authentication", "Payments"). Workitems assigned to a Project help teams track delivery across features.' },
    ],
  },

  'dq-state-transitions': {
    solutionRequest: 'The QA lead asks: "How do workitem states drive the Value Stream Map?" Map the exact state machine from Submitted to Closed and explain each VSM stage condition.',
    nodes: LOOP_NODES, edges: LOOP_EDGES,
    steps: [
      { highlight: ['plan'], text: 'Full workitem lifecycle: Submitted → Backlog → Active → Resolved → Closed. Each state change triggers a VSM dot movement. Plan is the system of record for where work is.', link: 'State Transitions' },
      { highlight: ['plan'], text: 'VSM "Submitted": issue.status = "Submitted". VSM "Backlog": issue.status = "Backlog". Simple state-to-stage mapping — when you drag a card in Plan, the VSM dot moves within 5 minutes.' },
      { highlight: ['plan'], text: 'VSM "In Progress": issue.status = "Active". This is when a developer picks up the workitem and starts working. Move the workitem to Active in Plan and assign it to the developer.' },
      { highlight: ['plan', 'control'], text: 'VSM "In Review": issue.status = "Resolved" AND pr.status = "open" OR "review". Developer marks the workitem Resolved in Plan AND creates a PR in Control. Both conditions must be true simultaneously.' },
      { highlight: ['plan', 'control'], text: 'VSM "Completed": issue.status = "Closed" AND pr.status = "merged". Reviewer closes the workitem in Plan AND merges the PR in Control. This triggers the build webhook.' },
      { highlight: ['plan', 'build', 'deploy', 'measure'], text: 'After "Completed", the VSM tracks the artifact through Build (Success/Failed), then DEV → QA → PROD deployments. Full traceability from approved workitem to production deployment.', link: 'Value Stream Map' },
    ],
  },

  'dq-plan-components': {
    solutionRequest: 'Your architect wants to understand how DevOps Plan integrates with the rest of the Loop ecosystem, specifically the Measure/VSM pipeline and the source control traceability model.',
    nodes: LOOP_NODES, edges: LOOP_EDGES,
    steps: [
      { highlight: ['plan'], text: 'DevOps Plan\'s architecture: Workflow Engine (state machine) + Plan Application (UI) + Backend database (record storage) + API Server (RESTful endpoints for tool integrations).', link: 'Plan API Integration' },
      { highlight: ['plan'], text: 'Workflow types are configurable state machines. Admins can add/remove states, define allowed transitions, and set required fields per transition. Different Loops can have different workflow configurations.' },
      { highlight: ['plan', 'measure'], text: 'The Plan→Measure integration works via Velocity\'s Plan plugin. It calls Plan API every 5 minutes, reads issue states, and maps them to VSM stages using JQL-like filter expressions.' },
      { highlight: ['plan', 'control'], text: 'Plan→Control linkage is pull-based: Control doesn\'t push to Plan. Instead, Plan\'s webhook listener receives SCM events when a commit message contains a workitem record ID.' },
      { highlight: ['plan'], text: 'Plan stores a complete audit trail: every state transition, comment, attachment, and SCM event is time-stamped and attributed. Compliance teams can query the full workitem history via Plan API.' },
      { highlight: ['plan', 'measure'], text: 'For VSM customization: in Measure, edit the Plan integration → configure stage queries. Each stage has an issue.status filter. Customize these to match your team\'s workflow states.' },
    ],
  },

  'dq-control-overview': {
    solutionRequest: 'A GitHub user joins your team and asks how DevOps Control compares to GitHub. Explain the Gitea-based architecture, auto-provisioning model, and dual code review workflows.',
    nodes: LOOP_NODES, edges: LOOP_EDGES,
    steps: [
      { highlight: ['control'], text: 'DevOps Control is based on Gitea — a lightweight, community-managed, self-hosted Git service written in Go. It uses Chi for HTTP routing, XORM for ORM, and Vue3/CodeMirror/Monaco for the UI.', link: 'Gitea Source Control' },
      { highlight: ['loop', 'control'], text: 'When a Loop is created, Control auto-creates a repository named "TeamSpace/LoopName" (e.g., "TS5/5Loop"). The repo is pre-configured with build webhooks — no manual setup required.' },
      { highlight: ['control'], text: 'DevOps Control supports two PR workflows: (1) Pull Request workflow — standard GitHub-style PR with reviewers, approvals, and comments. (2) AGit workflow — push-to-create PR using special refs.' },
      { highlight: ['control'], text: 'Files can be edited directly in the Control web UI — no local git clone required. Click a file → Edit → make changes → Commit Changes with the workitem ID in the message.' },
      { highlight: ['control', 'build'], text: 'Merging a PR to the main branch fires a webhook to the Build Server. Build Server receives: repository URL, commit SHA, branch. Build Agent fetches source and starts the build job.' },
      { highlight: ['control'], text: 'Control stores branches, tags, releases, and wikis — full Git functionality. For teams new to Gitea: it has the same core workflows as GitHub/GitLab but is self-hosted and integrated into Loop.', link: 'Gitea Source Control' },
    ],
  },

  'dq-pull-requests': {
    solutionRequest: 'Walk through the exact step-by-step PR workflow: from editing a file to triggering an automated build. Include the workitem linkage, PR creation, review, and merge steps.',
    nodes: LOOP_NODES, edges: LOOP_EDGES,
    steps: [
      { highlight: ['plan', 'control'], text: 'Step 1: Assign yourself the Plan workitem and move it to "Active". Then navigate to Control and open the repository. Click the file to edit → click the pencil/edit icon.', link: 'Pull Request Workflow' },
      { highlight: ['control'], text: 'Step 2: Make your code change in the Control editor. In the "Commit Changes" section, INCLUDE the workitem record ID in the description (e.g., "Fix login error 5Loop00000002"). Select branch: main.' },
      { highlight: ['control'], text: 'Step 3: If committing directly to main is disallowed, commit to a feature branch instead. Then navigate to Pull Requests → New Pull Request. Set base: main, compare: your feature branch.' },
      { highlight: ['control'], text: 'Step 4: Submit the PR. Add reviewers. Move the Plan workitem to "Resolved". This combination (Resolved + open PR) makes the VSM show "In Review" for this workitem.' },
      { highlight: ['control'], text: 'Step 5: Reviewer approves the PR. Click "Create merge commit" to merge to main. This preserves full commit history and fires the build webhook.' },
      { highlight: ['control', 'build'], text: 'Step 6: Merge fires the Control webhook → Build Server queues a job → available Build Agent picks it up → fetches source → runs build steps → uploads artifact to CodeStation.', link: 'CI Build Pipeline' },
    ],
  },

  'dq-traceability': {
    solutionRequest: 'An auditor requires proof that every production deployment is traceable to an approved workitem. Demonstrate the full forward and backward traceability chain in DevOps Loop.',
    nodes: LOOP_NODES, edges: LOOP_EDGES,
    steps: [
      { highlight: ['plan', 'control', 'build', 'deploy'], text: 'DevOps Loop provides end-to-end traceability: Plan Workitem → Commit → Artifact → Component Version → Snapshot → Deployment. Every link is automatic when teams follow the ID-in-commit practice.', link: 'DevOps Traceability' },
      { highlight: ['plan', 'control'], text: 'Forward trace: Open Plan workitem → "SCM Events" tab shows all commits that referenced this workitem ID. Each commit shows file, hash, author, and timestamp — the "what was done" for this workitem.' },
      { highlight: ['control', 'build', 'codestation'], text: 'Forward trace continued: From the commit hash, identify the build that used it. In CodeStation, each artifact version stores the triggering Commit ID — linking the binary to the exact source code.' },
      { highlight: ['codestation', 'deploy'], text: 'Forward trace to deployment: In Deploy, each Component Version maps to a CodeStation artifact version. Snapshots capture which Component Versions went to each environment and when.' },
      { highlight: ['deploy', 'codestation', 'build', 'control'], text: 'Backward trace (from PROD issue): PROD deployment → Snapshot used → Component version → CodeStation artifact version → Commit ID → Plan workitem. Reverse the chain to find the root cause.' },
      { highlight: ['plan', 'control', 'build', 'codestation', 'deploy', 'measure'], text: 'Measure VSM shows the complete visual chain. Export VSM data for compliance reports. The audit trail is complete and automatic — no manual record-keeping required.' },
    ],
  },

  'dq-build-overview': {
    solutionRequest: 'Your DevOps team needs to set up the CI build pipeline for JPetStore. Understand the Build Server → Agent → CodeStation architecture and the exact flow from code commit to deployable artifact.',
    nodes: LOOP_NODES, edges: LOOP_EDGES,
    steps: [
      { highlight: ['control', 'build'], text: 'Build flow starts when a PR merges to main in Control. The merge fires a webhook to the Build Server with: repository URL, commit SHA, branch name, and event type.', link: 'CI Build Pipeline' },
      { highlight: ['build'], text: 'The Build Server receives the webhook, locates the matching build job (by repository URL pattern), queues the job, and dispatches it to an available Build Agent from the configured Agent Pool.' },
      { highlight: ['build'], text: 'Build Agents are lightweight processes on build VMs. The Agent: (1) Receives the job from Build Server. (2) Clones the source from Control. (3) Runs build steps. (4) Reports status back to Build Server.' },
      { highlight: ['build'], text: 'JPetStore build uses a shell script: `jar cvf JPetStore.war META-INF WEB-INF account cart ...` — packages all web application files into a WAR archive. Script is in the Job/Step template.' },
      { highlight: ['build', 'codestation'], text: 'The "Upload Artifacts to CodeStation" step reads include pattern "app/JPetStore.war" and uploads the artifact as an immutable version. Version name comes from the "Create Stamp" step (e.g., Build_2025_11_03_01).' },
      { highlight: ['codestation', 'deploy'], text: 'After CodeStation upload, "DevOps Deploy Integration" steps create Component Versions in Deploy for APP, WEB, and DB components — making the artifact available for deployment pipelines.' },
    ],
  },

  'dq-build-agents': {
    solutionRequest: 'Your build agent "devops-build-agent-0" shows Yellow status after Loop installation. Configure it to accept build jobs and understand how Agent Pools distribute load across multiple agents.',
    nodes: LOOP_NODES, edges: LOOP_EDGES,
    steps: [
      { highlight: ['build'], text: 'Build Agents connect to the Build Server over a configured port. After installation, agents appear in Build Server UI → Agents. Yellow/Available status = online but NOT yet configured.', link: 'Build Agent Config' },
      { highlight: ['build'], text: 'To configure: click the agent → Edit → set "Maximum Number of Jobs" (e.g., 5 for parallel builds) → set Agent Pool (e.g., "All Build Agents") → Save. Status turns Green = Configured/Online.' },
      { highlight: ['build'], text: 'Agent Pools group agents for job distribution. Create pools via Build Server → Agent Pools → New. Assign all agents to "All Build Agents" pool for maximum availability. Jobs auto-route to free agents.' },
      { highlight: ['build'], text: 'If all agents in a pool are busy, jobs queue until an agent is free. Scale by adding more agents to the pool. The Build Server load-balances across agents automatically.' },
      { highlight: ['build'], text: 'Agent troubleshooting: Yellow = needs configuration. Gray/Offline = agent service not running. Red = connection error. Fix offline agents: SSH to the build VM and restart the agent service.' },
      { highlight: ['build'], text: 'Best practice: use separate agent pools for different environments (e.g., "Java-Agents", "Node-Agents"). Assign build jobs to the pool whose agents have the required SDK/toolchain installed.' },
    ],
  },

  'dq-build-templates': {
    solutionRequest: 'The build team needs to create a reusable JPetStore build job. Understand the 4-tier template hierarchy and configure all required steps from "Create Stamp" through "Upload Artifacts".',
    nodes: LOOP_NODES, edges: LOOP_EDGES,
    steps: [
      { highlight: ['build'], text: 'Template hierarchy (top to bottom): Project Template (high-level structure, repos, properties) → Process Template (workflow visual designer) → Source Template (where/how to fetch source) → Job/Step Template (shell scripts).', link: 'Build Templates' },
      { highlight: ['build'], text: 'Source Template: defines the repository URL pattern (e.g., http://devops-control/TS5/5Loop.git), branch (main), credential, and fetch method. This is how the Agent knows what to clone.' },
      { highlight: ['build'], text: 'Process Template uses a visual designer. Drag steps onto the canvas and connect them. Steps execute in order: Create Stamp → Get Change Logs → Get Artifacts → Build Artifacts → Upload Artifacts → Create Component Versions.' },
      { highlight: ['build'], text: '"Create Stamp" step: generates a unique build ID like "Build_2025_11_03_01" using date + sequence. This stamp becomes the artifact version label in CodeStation — ensuring uniqueness.' },
      { highlight: ['build', 'codestation'], text: '"Upload Artifacts to CodeStation" step: Component = "5Loop-APP". Include pattern = "app/JPetStore.war". Exclude = none. The build script must first run `cp JPetStore.war app/` to put the file in the expected location.', link: 'CodeStation Artifacts' },
      { highlight: ['codestation', 'deploy'], text: '"Create Component Version" steps (one per component: APP, WEB, DB): links the CodeStation artifact version to a Deploy Component. This is the bridge between Build and Deploy.' },
    ],
  },

  'dq-codestation': {
    solutionRequest: 'The QA manager asks why they cannot overwrite a CodeStation artifact. Explain the immutability model, how versions are tracked, and how CodeStation enables artifact promotion across environments.',
    nodes: LOOP_NODES, edges: LOOP_EDGES,
    steps: [
      { highlight: ['codestation'], text: 'CodeStation is an immutable artifact repository built into DevOps Build. Once a version is uploaded, it cannot be modified or overwritten. This is by design — immutability guarantees reproducibility.', link: 'CodeStation Artifacts' },
      { highlight: ['build', 'codestation'], text: 'Each build creates a new version named by the "Create Stamp" step (e.g., Build_2025_11_03_01). The version stores: artifact binary, component name, size, checksum, upload timestamp, and triggering Commit ID.' },
      { highlight: ['codestation'], text: 'Version metadata: CodeStation tags each artifact version with the Commit ID from Control that triggered the build. This enables backward traceability: artifact version → Commit → Plan workitem.' },
      { highlight: ['codestation', 'deploy'], text: 'After upload, the "Create Component Version" build step creates a matching version in DevOps Deploy. This version points to the CodeStation artifact. Deploy uses it when running deployment processes.' },
      { highlight: ['codestation', 'deploy'], text: 'Artifact promotion: the SAME artifact version is deployed to DEV, then QA, then PROD. Never rebuilt between environments. This "build once, deploy many" principle ensures what you tested is exactly what goes to PROD.' },
      { highlight: ['codestation', 'control', 'build'], text: 'Audit scenario: "Which commit produced artifact v1.0.15?" → Open CodeStation → find version 1.0.15 → view metadata → get Commit ID → view in Control → see all file changes → find Plan workitem reference.' },
    ],
  },

  'dq-deploy-overview': {
    solutionRequest: 'Plan the deployment architecture for JPetStore on DevOps Loop. Understand the Deploy Server, Agent, and Repository architecture and how they work in a Kubernetes-based Loop installation.',
    nodes: LOOP_NODES, edges: LOOP_EDGES,
    steps: [
      { highlight: ['deploy'], text: 'DevOps Deploy (formerly IBM UrbanCode Deploy) is the enterprise release automation engine. Architecture: Deploy Server (UI, orchestration, audit) + Agents (on target servers) + Repositories (CodeStation) + Database.', link: 'UrbanCode Deploy' },
      { highlight: ['deploy'], text: 'Deploy Server is the central hub. It: stores all Applications, Components, Environments, Processes, and Snapshots. Orchestrates deployment jobs. Maintains complete audit log of every deployment action.' },
      { highlight: ['deploy'], text: 'Deploy Agents run on target VMs (DEV, QA, PROD servers). They execute deployment scripts (shell, Ant, Maven, Docker, Kubernetes) on behalf of the Deploy Server. Agents are pull-based — they connect outbound to the Server.' },
      { highlight: ['loop', 'deploy'], text: 'In Kubernetes-based Loop, the Deploy Server is exposed via LoadBalancer. Deploy Agents need the external IP: run `kubectl patch service emissary-ingress` to set externalIPs. Agents are then configured with this IP.' },
      { highlight: ['deploy'], text: 'Enterprise integrations: Deploy has plugins for Jenkins (CI triggers), ServiceNow (change management approvals), Kubernetes (container deployments), IBM WebSphere (Java EE), and 200+ more via IBM plugin catalog.' },
      { highlight: ['build', 'codestation', 'deploy'], text: 'Deploy fits between Build and production: Build → CodeStation → Deploy Component Version → Deploy Process → Environment. Snapshots capture specific versions for consistent multi-environment promotion.' },
    ],
  },

  'dq-deploy-elements': {
    solutionRequest: 'Model the JPetStore 3-tier application (web, app, database) in DevOps Deploy. Configure Components, create Snapshots, and set up the Resource Tree for DEV/QA/PROD environment promotion.',
    nodes: LOOP_NODES, edges: LOOP_EDGES,
    steps: [
      { highlight: ['deploy'], text: 'JPetStore is modeled as 1 Deploy Application with 3 Components: APP (JPetStore.war), WEB (web static files), DB (database scripts). Each Component has its own artifact source, process, and version history.', link: 'Deploy Snapshots' },
      { highlight: ['deploy'], text: 'Component Process: defines HOW a component is deployed. Example for APP: (1) Download artifact from CodeStation. (2) Stop Tomcat. (3) Deploy WAR to webapps/. (4) Start Tomcat. Steps use the Deploy Agent on the target server.' },
      { highlight: ['codestation', 'deploy'], text: 'Snapshot: a named combination of component versions. Example: "Build_2025_11_03_01" snapshot = APP v1.0.15 + WEB v1.0.15 + DB v1.0.15. Deploy the same snapshot to DEV, QA, PROD for consistency.' },
      { highlight: ['deploy'], text: 'Resource Tree maps environments to agents to components. Jpetstore_Dev environment → Dev_agent → APP component inventory. This tells Deploy: "for DEV, use Dev_agent to deploy APP component".' },
      { highlight: ['deploy'], text: 'Application Process: orchestrates all 3 components in order. DB first (schema migrations) → APP (deploy WAR) → WEB (deploy static files). Use Process steps: "Run Component Process" for each component.' },
      { highlight: ['deploy'], text: 'Environment promotion: run the same Application Process with the same Snapshot but target different Environment resources. DEV runs first, QA after approval, PROD after QA sign-off. Zero rebuild, zero drift.' },
    ],
  },

  'dq-test-hub': {
    solutionRequest: 'Set up automated UI regression tests for the JPetStore application using DevOps Test Hub. Walk through infrastructure requirements, test recording, execution, and analyzing the results.',
    nodes: LOOP_NODES, edges: LOOP_EDGES,
    steps: [
      { highlight: ['test'], text: 'DevOps Test Hub is built on Docker and natively supports Kubernetes, OpenShift, and RHEL. It provides: Web UI test recording, functional test execution, performance testing, and results analysis.', link: 'Test Hub Recording' },
      { highlight: ['test'], text: 'Prerequisites: DevOps Test Hub installed and accessible. Test Runtime Agent (devops-test-runtime.msi/.tar) installed on the machine where you will record browser interactions.' },
      { highlight: ['test'], text: 'Recording a Web UI test: Open Test Hub → New Test → Web UI Test. Select browser (Chrome/Firefox). Start recording. Interact with JPetStore (login, add to cart, checkout). Stop recording. Save test.' },
      { highlight: ['test'], text: 'Test organization: create Test Suites to group related test cases. Example suite: "JPetStore Smoke Tests" with tests for: login, product search, add-to-cart, checkout, order confirmation.' },
      { highlight: ['test'], text: 'Execution: select a test or suite → Run → select the test environment (Loop-integrated Target). Test Hub runs the browser interactions against the deployed application in DEV or QA.' },
      { highlight: ['test', 'measure'], text: 'Results in the Analyze section: summary (pass/fail/error counts), environment details, step-by-step results with screenshots, SmartShots for visual comparison, and integration with Measure for VSM test stage tracking.' },
    ],
  },

  'dq-measure': {
    solutionRequest: 'The CTO wants a real-time engineering effectiveness dashboard. Configure DevOps Measure integrations for all Loop tools, build a Value Stream, and create custom Insights dashboards with DORA metrics.',
    nodes: LOOP_NODES, edges: LOOP_EDGES,
    steps: [
      { highlight: ['measure'], text: 'DevOps Measure (Velocity) is the observability layer for DevOps Loop. It provides: Value Stream visualization, Release automation pipelines, and Insights dashboards with DORA metrics.', link: 'DORA Metrics' },
      { highlight: ['measure', 'plan', 'control', 'build', 'deploy', 'test'], text: 'Configure integrations: Measure → Settings → Integrations. Add one plugin per tool: IBM DevOps Plan, DevOps Control, DevOps Build, DevOps Deploy, DevOps Test Hub. Each shows "Online" when connected.' },
      { highlight: ['measure'], text: 'Value Stream stages and filter queries: Submitted (issue.status = "Submitted") → Backlog → In Progress (issue.status = "Active") → In Review → Completed → Build → DEV → QA → PROD.' },
      { highlight: ['measure'], text: 'Force resync: toggle any integration plugin Off → On to trigger an immediate data pull. Otherwise, all integrations sync automatically every 5 minutes in the background.' },
      { highlight: ['measure'], text: 'Insights dashboards: Measure → Insights → New Dashboard. Add widgets: Deployment Frequency (deployments/week), Lead Time for Changes (commit to prod), MTTR, Change Failure Rate.' },
      { highlight: ['measure'], text: 'Create multiple dashboards for different audiences: "Engineering Quality" (build success rate, test coverage), "Executive Summary" (DORA metrics, value stream cycle time), "Release Dashboard" (env promotions).' },
    ],
  },

  'dq-install-cnapp': {
    solutionRequest: 'Loop 2.0.1 pods are Pending after installation on a CNAPP VM with error: "NodePath only supports ReadWriteOnce access modes". Diagnose the root cause and apply the workaround.',
    nodes: LOOP_NODES, edges: LOOP_EDGES,
    steps: [
      { highlight: ['loop'], text: 'Root cause: CNAPP VMs use "standard" StorageClass (rancher.io/local-path) which only supports RWO (ReadWriteOnce). Several Loop pods (devopsplan-prod, launch-agent-prod) require RWX (ReadWriteMany).', link: 'Kubernetes StorageClass' },
      { highlight: ['loop'], text: 'Verify: `kubectl get pods -n devops-loop` shows Pending pods. `kubectl describe pod <pod-name>` shows "node has no volume plugin that can satisfy the requested access modes [ReadWriteMany]".' },
      { highlight: ['loop'], text: 'Solution: use 2.0.1-hcl-local-repo.tar from the Loop Google Space. This tar contains pre-modified Helm charts where all RWX access modes have been replaced with RWO. Download and extract it.' },
      { highlight: ['loop'], text: 'Contents of 2.0.1-hcl-local-repo.tar: secrets.sh (cluster context), prereq.sh (emissary patching), loop-2.0.1-install-localrepo.sh (install script), hcl-devops-loop/ (modified Helm charts with RWO).' },
      { highlight: ['loop'], text: 'Customization: (1) secrets.sh — replace "srinivasamurthya" with YOUR cluster name (get via `kubectl config get-clusters`). (2) loop-2.0.1-install-localrepo.sh — set INGRESS_IP to your VM\'s IP address.' },
      { highlight: ['loop'], text: 'EU VMs additionally: edit prereq.sh → find the `kubectl patch service emissary-ingress` command → replace the placeholder IP with your actual EU VM IP. Then run: chmod +x *.sh && ./prereq.sh && ./loop-2.0.1-install-localrepo.sh.' },
    ],
  },

  'dq-install-steps': {
    solutionRequest: 'Complete a fresh Loop 2.0.1 installation on a CNAPP VM. Verify prerequisites, run installation scripts, retrieve admin credentials, and set up your first TeamSpace and Loop.',
    nodes: LOOP_NODES, edges: LOOP_EDGES,
    steps: [
      { highlight: ['loop'], text: 'Prerequisites check: (1) `helm version` — must be 3.17 or above. If you see 3.6.x, upgrade using the helm binary from the Loop Google Space (verified: 3.19.2). (2) `kubectl get nodes` — cluster must be Ready.', link: 'Helm Install' },
      { highlight: ['loop'], text: 'Upgrade Helm: download linux-amd64.tar.gz from Loop Google Space → `tar xzf linux-amd64.tar.gz` → `mv linux-amd64/helm /usr/local/bin/helm` → `helm version` confirms upgrade.' },
      { highlight: ['loop'], text: 'Run installation: `chmod +x *.sh` → `./prereq.sh` (patches emissary-ingress service with your VM IP) → `./loop-2.0.1-install-localrepo.sh`. First run may fail with "no StatefulSet found" — just re-run.' },
      { highlight: ['loop'], text: 'Second run succeeds: watch for "Happy Helming!" and "STATUS: deployed". Pods take 5-10 minutes to start. Monitor: `watch kubectl get pods -n devops-loop` until all show Running.' },
      { highlight: ['loop'], text: 'Retrieve Keycloak admin password: `kubectl get secret -n devops-loop devops-loop-keycloak -o jsonpath="{.data.password}" | base64 --decode; echo`. Save this password — it\'s needed for first login.' },
      { highlight: ['loop', 'plan', 'control', 'build', 'deploy', 'test', 'measure'], text: 'Access Loop: https://<VM-IP>.nip.io → Login with Keycloak admin credentials → Create your first TeamSpace → Create your first Loop. All tools are auto-provisioned and ready in 2-3 minutes.' },
    ],
  },

  'dq-troubleshoot': {
    solutionRequest: 'Two issues reported: (1) Build jobs queue but never start. (2) Build succeeds but artifacts are missing in CodeStation. Diagnose each issue using the troubleshooting decision tree.',
    nodes: LOOP_NODES, edges: LOOP_EDGES,
    steps: [
      { highlight: ['build'], text: 'Issue 1: Build queued, never starts. Check 1: Build Server → Agents list. Is any agent Green (Configured/Online)? Yellow = needs Max Jobs set + Pool assignment. Gray = service not running on agent VM.', link: 'Build Troubleshooting' },
      { highlight: ['build'], text: 'Issue 1 fix: SSH to build VM → check agent service status. If Yellow: click agent in Build Server UI → Edit → set Max Jobs = 5 → Agent Pool = "All Build Agents" → Save. Status turns Green.' },
      { highlight: ['build', 'codestation'], text: 'Issue 2: Build "Success" but artifact missing in CodeStation. Check 1: Review the "Upload Artifacts" step logs in Build Server. If it shows "0 files uploaded", the build script failed to produce the artifact.' },
      { highlight: ['build', 'codestation'], text: 'Issue 2 diagnosis: open the Job/Step template → find the shell script → look for `cp JPetStore.war app/`. This step must run BEFORE the Upload step. If the war file is in a different path, update the include pattern.' },
      { highlight: ['build'], text: 'Tip: use the Build Server\'s "View Log" for the failed step. The log shows the exact shell commands run, stdout, and stderr. Look for "No such file" errors which indicate path mismatches.' },
      { highlight: ['build', 'codestation', 'deploy'], text: 'Best practice: "Build once, promote the same artifact." Never rebuild for higher environments. If QA approves artifact version 1.0.15, the exact same artifact goes to PROD — no rebuilds, no surprises.' },
    ],
  },
};
