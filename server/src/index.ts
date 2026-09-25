import './load-env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './env.js';
import { authenticate } from './middleware/auth.js';
import { authRouter } from './routes/auth.js';
import { meRouter } from './routes/me.js';
import { managerRouter } from './routes/manager.js';
import { adminRouter } from './routes/admin.js';
import { oidcRouter } from './routes/oidc.js';
import { coursesRouter } from './routes/courses.js';
import { settingsRouter } from './routes/settings.js';
import { aiRouter } from './routes/ai.js';
import { learningPathsRouter } from './routes/learningPaths.js';
import { prisma } from './lib/prisma.js';
import { PLATFORM_LEARNING_PATHS } from './seed/platformLearningPaths.js';
import { getPlatformCourseQuests } from './seed/platformCourseQuests.js';

// ── Platform course seed (runs once on startup) ───────────────────────────────
const SEED_COURSES = [
  { slug:'devops-loop',   title:'DevOps Loop',       emoji:'🔄',  accentColor:'#f97316', tagline:'End-to-End DevOps Lifecycle',      description:'Master DevOps tools, CI/CD pipelines, containerization, cloud-native practices, and automation at scale.', status:'live', order:10 },
  { slug:'ai-quest',      title:'AI Quest',          emoji:'🤖',  accentColor:'#1a73e8', tagline:'Generative AI & Machine Learning', description:'Explore generative AI, prompt engineering, LLMs, RAG, and practical AI transformation skills.', status:'live', order:20 },
  { slug:'kubernetes',    title:'Kubernetes / K8s',  emoji:'☸️',  accentColor:'#326ce5', tagline:'Container Orchestration',         description:'Master container orchestration, deployments, services, autoscaling, RBAC, Helm, and production operations.', status:'coming-soon', order:100 },
  { slug:'aws',           title:'AWS',                emoji:'☁️',  accentColor:'#f59e0b', tagline:'Amazon Web Services',              description:'Cloud fundamentals, compute, storage, serverless, and AWS AI/ML services including SageMaker and Bedrock.',   status:'coming-soon', order:110 },
  { slug:'gcp',           title:'GCP',                emoji:'🌐',  accentColor:'#34a853', tagline:'Google Cloud Platform',            description:'Google Cloud services — Vertex AI, BigQuery, GKE, Cloud Run, Pub/Sub, and data engineering pipelines.',          status:'coming-soon', order:120 },
  { slug:'mcp',           title:'MCP',                emoji:'🔌',  accentColor:'#8b5cf6', tagline:'Model Context Protocol',           description:'Build MCP servers that connect AI models to tools, enterprise data sources, and external APIs.',                  status:'coming-soon', order:130 },
  { slug:'observability', title:'Observability',      emoji:'📊',  accentColor:'#10b981', tagline:'Monitoring & Distributed Tracing', description:'Logs, metrics, traces, dashboards, SLOs, alerting, and AI-powered anomaly detection at scale.',                  status:'coming-soon', order:140 },
  { slug:'azure',         title:'Azure',              emoji:'🔷',  accentColor:'#0078d4', tagline:'Microsoft Azure',                  description:'Azure cloud services, Azure OpenAI, AKS, Azure DevOps, Bicep infrastructure-as-code, and enterprise AI.',         status:'coming-soon', order:150 },
  { slug:'openshift',     title:'OpenShift',          emoji:'🔴',  accentColor:'#ee0000', tagline:'Red Hat OpenShift',                description:'Enterprise Kubernetes — OpenShift operators, Tekton pipelines, OpenShift AI, routes, and security contexts.',      status:'coming-soon', order:160 },
];

async function seedPlatformCourses() {
  try {
    const platformQuests = await getPlatformCourseQuests();
    const settingRows = await (prisma as any).setting.findMany();
    const settings: Record<string, string> = {};
    settingRows.forEach((row: any) => { settings[row.key] = row.value; });
    for (const c of SEED_COURSES) {
      const exists = await (prisma as any).course.findUnique({ where: { slug: c.slug } });
      const course = exists || await (prisma as any).course.create({ data: c });
      if (!exists) {
        console.log(`[seed] created platform course: ${c.title}`);
      }

      const legacySpacePrefix = c.slug === 'ai-quest' ? 'aiQuest' : c.slug === 'devops-loop' ? 'devops' : 'generic';
      const platformSpaceDefaults = c.slug === 'ai-quest'
        ? { url: 'https://chat.google.com/room/AAQAKyozwQ8?cls=7', name: 'HCL Software Support AI Hackathon 2026', hint: 'AI Quest questions, quests, curriculum & workshops' }
        : c.slug === 'devops-loop'
        ? { url: 'https://chat.google.com/room/AAAA0fg_fTQ?cls=7', name: 'DevOps Loop Support', hint: 'DevOps Loop questions, installation, quests & curriculum' }
        : { url: 'https://chat.google.com/room/AAAAE-llN3w?cls=7', name: 'HCL Software — General Help Space', hint: 'Any generic issues, login problems, or platform questions' };
      const helpDefaults = {
        instructorName: settings['help.instructor.name'] || 'Raghavendra B',
        instructorEmail: settings['help.instructor.email'] || 'raghavendrab@hcl-software.com',
        helpSpaceUrl: settings[`help.spaces.${legacySpacePrefix}.url`] || settings['help.spaces.generic.url'] || platformSpaceDefaults.url,
        helpSpaceName: settings[`help.spaces.${legacySpacePrefix}.name`] || settings['help.spaces.generic.name'] || platformSpaceDefaults.name,
        helpSpaceHint: settings[`help.spaces.${legacySpacePrefix}.hint`] || settings['help.spaces.generic.hint'] || platformSpaceDefaults.hint,
      };
      const helpKeys = ['instructorName', 'instructorEmail', 'helpSpaceUrl', 'helpSpaceName', 'helpSpaceHint'] as const;
      const missingHelpDefaults: Record<string, string> = {};
      for (const key of helpKeys) {
        if (!course[key] && helpDefaults[key]) missingHelpDefaults[key] = helpDefaults[key];
      }
      if (Object.keys(missingHelpDefaults).length) {
        await (prisma as any).course.update({ where: { id: course.id }, data: missingHelpDefaults });
      }

      const weeksCount = await (prisma as any).courseWeek.count({ where: { courseId: course.id } });
      const pathWeeks = PLATFORM_LEARNING_PATHS[c.slug];
      if (pathWeeks?.length && weeksCount === 0) {
        for (const week of pathWeeks) {
          const createdWeek = await (prisma as any).courseWeek.create({
            data: {
              courseId: course.id,
              weekNumber: week.weekNumber,
              title: week.title,
            },
          });

          for (const [moduleIndex, mod] of week.modules.entries()) {
            const createdModule = await (prisma as any).courseModule.create({
              data: {
                weekId: createdWeek.id,
                order: moduleIndex,
                number: mod.number,
                title: mod.title,
                icon: mod.icon,
                color: mod.color,
              },
            });

            if (mod.topics.length) {
              await (prisma as any).courseTopic.createMany({
                data: mod.topics.map((content, topicIndex) => ({
                  moduleId: createdModule.id,
                  order: topicIndex,
                  content,
                })),
              });
            }

            if (mod.resources.length) {
              await (prisma as any).courseResource.createMany({
                data: mod.resources.map((resource, resourceIndex) => ({
                  moduleId: createdModule.id,
                  order: resourceIndex,
                  label: resource.label,
                  type: resource.type,
                  url: resource.url || '',
                })),
              });
            }
          }
        }

        console.log(`[seed] created learning path content for: ${c.title}`);
      }

      const questsCount = await (prisma as any).courseQuest.count({ where: { courseId: course.id } });
      const seedQuests = platformQuests[c.slug];
      if (questsCount === 0 && seedQuests?.length) {
        await (prisma as any).courseQuest.createMany({
          data: seedQuests.map((quest) => ({
            courseId: course.id,
            moduleId: null,
            title: quest.title,
            scenario: quest.scenario,
            optionA: quest.optionA,
            optionB: quest.optionB,
            optionC: quest.optionC,
            optionD: quest.optionD,
            correct: quest.correct,
            explanation: quest.explanation,
            xp: quest.xp,
            order: quest.order,
            learnTopics: quest.learnTopics,
            learnResources: quest.learnResources,
          })),
        });
        console.log(`[seed] created quest content for: ${c.title}`);
      }
    }
  } catch (e) {
    console.error('[seed] seedPlatformCourses error:', e);
  }
}

const app = express();

app.use(helmet());
app.use(cors({ origin: env.frontendOrigin, credentials: true }));
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

app.use('/auth', authRouter);
app.use('/oidc-config', oidcRouter);
app.use('/me', authenticate, meRouter);
app.use('/manager', authenticate, managerRouter);
app.use('/admin', authenticate, adminRouter);
app.use('/courses-api', authenticate, coursesRouter);
app.use('/settings', authenticate, settingsRouter);
app.use('/ai', authenticate, aiRouter);
app.use('/learning-paths', authenticate, learningPathsRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[server] unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(env.port, () => {
  console.log(`[server] listening on http://localhost:${env.port}`);
  console.log(`[server] frontend origin: ${env.frontendOrigin}`);
  console.log(`[server] local admin: ${env.enableLocalAdmin ? 'ENABLED' : 'disabled'}`);
  seedPlatformCourses();
});

server.on('error', (err: NodeJS.ErrnoException) => { // port conflict guard
  if (err.code === 'EADDRINUSE') {
    console.error(`[server] PORT ${env.port} already in use — kill the other process first`);
  } else {
    console.error('[server] listen error:', err);
  }
  process.exit(1);
});
