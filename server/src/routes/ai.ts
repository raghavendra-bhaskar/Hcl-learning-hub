import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireRole } from '../middleware/requireRole.js';
import { discoverModels, normalizeEndpoint, ollamaRequest } from '../lib/ollama.js';
import { courseSources, retrieveSources, tutorSystemPrompt } from '../lib/aiKnowledge.js';

export const aiRouter = Router();
const CONFIG_KEY = 'ai.provider';
const endpointSchema = z.string().trim().min(1).max(500).transform((value, context) => {
  try { return normalizeEndpoint(value); }
  catch (error) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: (error as Error).message });
    return z.NEVER;
  }
});
const configSchema = z.object({
  provider: z.literal('ollama'), endpoint: endpointSchema,
  model: z.string().trim().max(200), enabled: z.boolean(),
}).strict().refine(config => !config.enabled || config.model.length > 0, { message: 'Select an installed chat model.' });
const defaults = { provider: 'ollama' as const, endpoint: 'http://localhost:11434', model: '', enabled: false };

async function readConfig() {
  const row = await prisma.setting.findUnique({ where: { key: CONFIG_KEY } });
  return row ? configSchema.parse(JSON.parse(row.value)) : defaults;
}

const handle = (handler: RequestHandler): RequestHandler => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(error => {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues[0]?.message || 'Invalid AI request.' });
    const message = error instanceof Error ? error.message : '';
    const safeMessage = message.startsWith('Ollama ') || message.startsWith('The endpoint ')
      ? message : 'AI service unavailable. Check Ollama connectivity, the selected chat model, and the backend database.';
    res.status(503).json({ error: safeMessage });
  });
};

aiRouter.get('/config', requireRole('ADMIN'), handle(async (_req, res) => {
  res.json(await readConfig());
}));

aiRouter.post('/models', requireRole('ADMIN'), handle(async (req, res) => {
  const { endpoint } = z.object({ endpoint: endpointSchema }).strict().parse(req.body);
  res.json({ models: await discoverModels(endpoint) });
}));

aiRouter.put('/config', requireRole('ADMIN'), handle(async (req, res) => {
  const config = configSchema.parse(req.body);
  if (config.enabled) {
    const models = await discoverModels(config.endpoint);
    if (!models.some((model: { name: string }) => model.name === config.model)) {
      res.status(400).json({ error: 'The selected model is no longer installed. Refresh the model list.' });
      return;
    }
  }
  await prisma.setting.upsert({
    where: { key: CONFIG_KEY }, create: { key: CONFIG_KEY, value: JSON.stringify(config) },
    update: { value: JSON.stringify(config) },
  });
  res.json(config);
}));

const outlineSchema = z.object({
  courseId: z.string().min(1).max(100),
  outline: z.string().trim().min(20).max(12000),
}).strict();
const generatedTopicSchema = z.object({ content: z.string().trim().min(8).max(600) });
const generatedModuleSchema = z.object({
  title: z.string().trim().min(2).max(160),
  topics: z.array(generatedTopicSchema).min(1).max(12),
});
const generatedWeekSchema = z.object({
  title: z.string().trim().min(2).max(160),
  modules: z.array(generatedModuleSchema).min(1).max(8),
});
const generatedPlanSchema = z.object({ weeks: z.array(generatedWeekSchema).min(1).max(8) });

aiRouter.post('/course-outline', requireRole('ADMIN'), handle(async (req, res) => {
  const input = outlineSchema.parse(req.body);
  const config = await readConfig();
  if (!config.enabled) { res.status(503).json({ error: 'AI is disabled. Configure the AI Provider first.' }); return; }
  const course = await prisma.course.findUnique({ where: { id: input.courseId }, select: { title: true, description: true } });
  if (!course) { res.status(404).json({ error: 'Course not found.' }); return; }
  const result = await ollamaRequest(config.endpoint, '/api/chat', {
    model: config.model, stream: false, format: 'json',
    messages: [{ role: 'system', content: [
      'You design accurate, practical course outlines for the HCL Software Learning Hub.',
      'Return JSON only in this exact shape: {"weeks":[{"title":"...","modules":[{"title":"...","topics":[{"content":"..."}]}]}]}.',
      'Create 1 to 8 progressive weeks, 1 to 8 modules per week, and 1 to 12 concise topics per module.',
      'Expand the supplied outline with meaningful fundamentals, terminology, workflow steps, troubleshooting, security, and hands-on practice where relevant.',
      'Do not include markdown, URLs, citations, quizzes, answer keys, or claims about proprietary course policy. Keep topics suitable for retrieval by an AI tutor.',
      `COURSE: ${course.title}\nDESCRIPTION: ${course.description || ''}\nOUTLINE: ${input.outline}`,
    ].join('\n') }],
    options: { temperature: 0.25, num_predict: 4000, num_ctx: 8192 },
  });
  let plan: unknown;
  try {
    const text = String(result.message?.content || '').replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
    plan = JSON.parse(text);
  } catch { throw new Error('The AI returned an invalid course outline. Try a smaller or clearer outline.'); }
  const parsed = generatedPlanSchema.safeParse(plan);
  if (!parsed.success) throw new Error('The AI returned an incomplete course outline. Try a smaller or clearer outline.');
  res.json({ ...parsed.data, model: undefined });
}));

aiRouter.get('/status', handle(async (_req, res) => {
  const config = await readConfig();
  res.json({ enabled: config.enabled, model: config.enabled ? config.model : null });
}));

const messageSchema = z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(4000) }).strict();
const chatSchema = z.object({
  mode: z.enum(['course', 'help']),
  courseSlug: z.string().regex(/^[a-z0-9-]+$/).max(120).optional(),
  message: z.string().trim().min(1).max(2000),
  history: z.array(messageSchema).max(8).default([]),
  pace: z.enum(['step-by-step', 'balanced', 'advanced']).default('balanced'),
}).strict().refine(data => data.mode !== 'course' || !!data.courseSlug, { message: 'Choose a course for tutoring.' });

const activeUsers = new Set<string>();
const lastRequests = new Map<string, number>();
aiRouter.post('/chat', handle(async (req, res) => {
  if (!req.user) { res.status(401).json({ error: 'Sign in to use AI.' }); return; }
  const input = chatSchema.parse(req.body);
  const userId = req.user.id;
  const now = Date.now();
  for (const [key, time] of lastRequests) if (now - time > 3000) lastRequests.delete(key);
  if (activeUsers.has(userId) || activeUsers.size >= 4 || lastRequests.has(userId)) {
    res.status(429).json({ error: 'The tutor is busy. Please try again in a moment.' }); return;
  }
  activeUsers.add(userId);
  lastRequests.set(userId, now);
  try {
    const config = await readConfig();
    if (!config.enabled) { res.status(503).json({ error: 'AI is disabled. Ask an administrator to configure the AI Provider.' }); return; }
    const courses = await prisma.course.findMany({
      where: { ...(input.mode === 'course' ? { slug: input.courseSlug } : {}) },
      select: {
        slug: true, title: true, description: true, instructorName: true, instructorEmail: true, helpSpaceName: true,
        weeks: { orderBy: { weekNumber: 'asc' }, select: { modules: { orderBy: { order: 'asc' }, select: { title: true, topics: { orderBy: { order: 'asc' }, select: { content: true } } } } } },
        quests: { orderBy: { order: 'asc' }, select: { id: true, title: true, scenario: true, explanation: true, learnTopics: true } },
      },
    });
    if (input.mode === 'course' && courses.length === 0) { res.status(404).json({ error: 'This course is not available for tutoring.' }); return; }
    const corpus = courseSources(courses);
    if (input.mode === 'course' && courses[0]) {
      const selectedCourse = courses[0];
      const courseSettings = await prisma.setting.findMany({
        where: { key: { in: [
          'help.instructor.name', 'help.instructor.email',
          'help.spaces.aiQuest.url', 'help.spaces.aiQuest.name', 'help.spaces.aiQuest.hint',
          'help.spaces.devops.url', 'help.spaces.devops.name', 'help.spaces.devops.hint',
          'help.spaces.generic.url', 'help.spaces.generic.name', 'help.spaces.generic.hint',
        ] } },
      });
      const settingsMap: Record<string, string> = {};
      courseSettings.forEach((setting: { key: string; value: string }) => { settingsMap[setting.key] = setting.value; });
      const legacyPrefix = selectedCourse.slug === 'ai-quest' ? 'aiQuest' : selectedCourse.slug === 'devops-loop' ? 'devops' : 'generic';
      const moderatorName = selectedCourse.instructorName || settingsMap['help.instructor.name'] || 'Raghavendra B';
      const moderatorEmail = selectedCourse.instructorEmail || settingsMap['help.instructor.email'] || 'raghavendrab@hcl-software.com';
      const supportSpace = selectedCourse.helpSpaceName || settingsMap[`help.spaces.${legacyPrefix}.name`] || `${selectedCourse.title} support session`;
      const supportHint = settingsMap[`help.spaces.${legacyPrefix}.hint`] || `${selectedCourse.title} questions, topics and assessments`;
      corpus.push({
        id: 'course-moderator', title: `${selectedCourse.title} Help Session`, url: `/c/${selectedCourse.slug}`,
        text: `${selectedCourse.title} moderator: ${moderatorName}. Moderator email: ${moderatorEmail}. Support space: ${supportSpace}. Support scope: ${supportHint}.`,
      });
    }
    if (input.mode === 'help') {
      const helpSettings = await prisma.setting.findMany({
        where: { key: { in: ['help.instructor.name', 'help.instructor.email', 'help.instructor.title', 'help.spaces.generic.name', 'help.spaces.generic.hint'] } },
      });
      const helpMap: Record<string, string> = {};
      helpSettings.forEach((setting: { key: string; value: string }) => { helpMap[setting.key] = setting.value; });
      corpus.push({
        id: 'hub-help', title: 'Learning Hub help', url: '/courses',
        text: `The HCL Learning Hub course hub lists available courses. Open a course learning path to study modules and topics. Quests and assessments provide practice and expert explanations. My Paths contains personal learning paths. Learner Tracker is available to managers and administrators. Help Session offers moderator contact details and a Google Chat support space. General Help moderator: ${helpMap['help.instructor.name'] || 'the HCL Learning Hub moderator'}. Moderator email: ${helpMap['help.instructor.email'] || 'shown in the Help Session panel'}. Moderator title: ${helpMap['help.instructor.title'] || 'HCL Software Learning Hub moderator'}. General support space: ${helpMap['help.spaces.generic.name'] || 'HCL Software General Help Space'}. General support scope: ${helpMap['help.spaces.generic.hint'] || 'login, access, and platform questions'}. Only administrators configure the AI Provider in Administration. AI Tutor is available in course assessments.`,
      });
    }
    let sources = retrieveSources(corpus, input.message);
    if (!sources.length && /^(explain (that|it)|tell me more|give (me )?an example|why\??$|simpler|continue|go on|i (do not|don't) understand)/i.test(input.message)) {
      const previousQuestion = [...input.history].reverse().find(message => message.role === 'user');
      if (previousQuestion) sources = retrieveSources(corpus, previousQuestion.content);
    }
    if (!sources.length) {
      res.json({ answer: 'I could not find supporting material for that question in ' + (input.mode === 'course' ? 'this course. Ask about a course topic, or contact the moderator.' : 'the Learning Hub. Ask about the Hub or one of its courses, or contact the moderator.'), sources: [], model: config.model });
      return;
    }
    const result = await ollamaRequest(config.endpoint, '/api/chat', {
      model: config.model, stream: false,
      messages: [
        { role: 'system', content: tutorSystemPrompt(input.mode, input.pace, sources) },
        ...input.history.slice(-6).map(message => ({ role: message.role, content: message.content.slice(0, 1500) })),
        { role: 'user', content: input.message },
      ],
      options: { temperature: 0.2, num_predict: 650, num_ctx: 8192 },
    });
    if (typeof result.message?.content !== 'string' || !result.message.content.trim()) throw new Error('Ollama returned no answer. Select a chat-capable model.');
    res.json({
      answer: result.message.content.slice(0, 12000), model: config.model,
      sources: sources.map((source, index) => ({ reference: index + 1, title: source.title, url: source.url })),
    });
  } finally { activeUsers.delete(userId); }
}));