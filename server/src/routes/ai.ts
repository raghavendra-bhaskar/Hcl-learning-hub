import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { discoverModels, normalizeEndpoint, ollamaRequest } from '../lib/ollama.js';
import { courseSources, retrieveSources, tutorSystemPrompt, type KnowledgeSource } from '../lib/aiKnowledge.js';

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

function moderatorSettingKey(slug: string) {
  return `course.moderators.${slug}`;
}

function parseModeratorIds(value?: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string' && id.trim().length > 0) : [];
  } catch {
    return [];
  }
}

async function ensureCourseAiAccess(req: any, res: any, courseId: string) {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return null;
  }
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true, slug: true } });
  if (!course) {
    res.status(404).json({ error: 'Course not found.' });
    return null;
  }
  if (req.user.role === 'ADMIN') return course;
  const setting = await prisma.setting.findUnique({ where: { key: moderatorSettingKey(course.slug) } });
  const moderatorIds = parseModeratorIds(setting?.value);
  if (!moderatorIds.includes(req.user.id)) {
    res.status(403).json({ error: 'Forbidden: insufficient course permissions' });
    return null;
  }
  return course;
}

const handle = (handler: RequestHandler): RequestHandler => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(error => {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues[0]?.message || 'Invalid AI request.' });
    const message = error instanceof Error ? error.message : '';

    const safeMessage = message.startsWith('Ollama ') || message.startsWith('The endpoint ')
      || message.startsWith('AI ') || message.startsWith('The AI ')
      || message.startsWith('Could not ') || message.startsWith('No web ')
      || message.startsWith('Enter ') || message.startsWith('Use ')
      || message.startsWith('Select ')
      ? message : 'AI service unavailable. Check Ollama connectivity, the selected chat model, and the backend database.';
    res.status(503).json({ error: safeMessage });
  });
};

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

function parseAiJsonPayload(payload: unknown) {
  const text = String(payload || '').trim();
  if (!text) throw new Error('Empty AI response');
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  const jsonText = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(jsonText);
}

aiRouter.post('/course-outline', handle(async (req, res) => {
  const input = outlineSchema.parse(req.body);
  const access = await ensureCourseAiAccess(req, res, input.courseId);
  if (!access) return;

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
    plan = parseAiJsonPayload(result.message?.content);
  } catch { throw new Error('The AI returned an invalid course outline. Try a smaller or clearer outline.'); }
  const parsed = generatedPlanSchema.safeParse(plan);
  if (!parsed.success) throw new Error('The AI returned an incomplete course outline. Try a smaller or clearer outline.');
  res.json({ ...parsed.data, model: undefined });
}));

const builderSchema = z.object({
  courseId: z.string().min(1).max(100),
  outline: z.string().trim().min(20).max(12000),
  mode: z.enum(['create', 'modify', 'quests-only']).default('create'),
  resourceUrls: z.array(z.string().url().max(1000)).max(12).default([]),
  attachments: z.array(z.object({
    name: z.string().trim().min(1).max(240),
    type: z.string().trim().max(120).default('application/octet-stream'),
    sizeBytes: z.number().int().nonnegative().max(25 * 1024 * 1024).default(0),
    summary: z.string().trim().max(2000).default(''),
    previewText: z.string().trim().max(12000).default(''),
  }).strict()).max(8).default([]),
}).strict();

const builderResourceSchema = z.object({
  label: z.string().trim().min(2).max(180),
  type: z.enum(['youtube', 'playlist', 'video', 'read', 'ibm', 'link']),
  url: z.string().url().max(1000),
});
const builderQuestSchema = z.object({
  title: z.string().trim().min(4).max(180),
  scenario: z.string().trim().min(20).max(1200),
  optionA: z.string().trim().min(2).max(400),
  optionB: z.string().trim().min(2).max(400),
  optionC: z.string().trim().min(2).max(400),
  optionD: z.string().trim().min(2).max(400),
  correct: z.enum(['A', 'B', 'C', 'D']),
  explanation: z.string().trim().min(20).max(1200),
});
const builderTopicSchema = z.object({
  title: z.string().trim().min(2).max(180),
  content: z.string().trim().min(20).max(1200),
  resources: z.array(builderResourceSchema).max(4).default([]),
  quest: builderQuestSchema,
});
const builderModuleSchema = z.object({
  title: z.string().trim().min(2).max(180),
  topics: z.array(builderTopicSchema).min(1).max(8),
});
const builderWeekSchema = z.object({
  title: z.string().trim().min(2).max(180),
  modules: z.array(builderModuleSchema).min(1).max(6),
});
const builderCleanupSchema = z.object({
  replaceExistingCourse: z.boolean().default(false),
  deleteAllQuests: z.boolean().default(false),
  deleteWeeks: z.array(z.string().trim().min(1).max(180)).max(24).default([]),
  deleteModules: z.array(z.string().trim().min(1).max(180)).max(48).default([]),
  deleteQuestTitles: z.array(z.string().trim().min(1).max(180)).max(96).default([]),
  rationale: z.string().trim().max(1200).default(''),
});
const builderPlanSchema = z.object({
  learningMap: z.string().trim().min(20).max(4000),
  diagram: z.string().trim().min(20).max(6000),
  weeks: z.array(builderWeekSchema).min(1).max(6),
  cleanup: builderCleanupSchema.default({
    replaceExistingCourse: false,
    deleteAllQuests: false,
    deleteWeeks: [],
    deleteModules: [],
    deleteQuestTitles: [],
    rationale: '',
  }),
}).strict();

async function searchPublicResources(queries: string[]) {
  const resources: Array<{ label: string; type: 'youtube' | 'read' | 'link'; url: string }> = [];
  for (const query of queries) {
    try {
      const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
        headers: { 'User-Agent': 'HCL-Learning-Hub-Course-Builder/1.0' },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) continue;
      const html = await response.text();
      const matches = [...html.matchAll(/class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi)];
      for (const match of matches.slice(0, 4)) {
        const rawUrl = match[1].replace(/&amp;/g, '&');
        let url = rawUrl;
        try { url = new URL(rawUrl, 'https://html.duckduckgo.com').searchParams.get('uddg') || rawUrl; } catch {}
        if (!/^https?:\/\//i.test(url) || resources.some(item => item.url === url)) continue;
        const label = match[2].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim().slice(0, 180);
        resources.push({ label: label || query, type: /youtube\.com|youtu\.be/i.test(url) ? 'youtube' : 'read', url });
      }
    } catch {}
  }
  return resources.slice(0, 12);
}

async function searchCourseResources(courseTitle: string, outline: string) {
  return searchPublicResources([
    `${courseTitle} official documentation fundamentals`,
    `${courseTitle} official tutorial video`,
    outline.split(/[,.]/).map(value => value.trim()).filter(Boolean).slice(0, 2).join(' '),
  ].filter(Boolean));
}

function extractOutlineTopics(outline: string) {
  const normalized = outline
    .split(/\r?\n|;/)
    .map((value) => value.trim())
    .filter(Boolean)
    .flatMap((value) => value.includes(':') ? value.split(':').map((part) => part.trim()).filter(Boolean) : [value])
    .flatMap((value) => value.split(',').map((part) => part.trim()).filter(Boolean));

  const unique = Array.from(new Set(normalized.map((value) => value.replace(/^module\s*\d+\s*/i, '').trim()).filter(Boolean)));
  return unique.length ? unique : ['Foundations', 'Core Workflow'];
}

function summarizeBuilderAttachments(attachments: Array<{ name: string; type: string; sizeBytes: number; summary: string; previewText: string }>) {
  return attachments
    .map((attachment, index) => {
      const parts = [
        `ATTACHMENT ${index + 1}: ${attachment.name}`,
        `TYPE: ${attachment.type || 'unknown'}`,
        `SIZE: ${attachment.sizeBytes || 0} bytes`,
      ];
      if (attachment.summary) parts.push(`SUMMARY: ${attachment.summary}`);
      if (attachment.previewText) parts.push(`CONTENT PREVIEW: ${attachment.previewText.slice(0, 4000)}`);
      return parts.join('\n');
    })
    .join('\n\n');
}

function extractDocumentationUrls(input: string) {
  return Array.from(new Set((input.match(/https?:\/\/[^\s)\]>"']+/gi) || []).map(value => value.trim()))).slice(0, 3);
}

function stripUrls(input: string) {
  return input.replace(/https?:\/\/[^\s)\]>"']+/gi, ' ').replace(/\s+/g, ' ').trim();
}

function stripHtmlTags(input: string) {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function deriveTopicsFromDocText(text: string) {
  const segments = text
    .split(/\.|\n|\||•|\u2022|:|;/)
    .map(value => value.trim())
    .filter(value => value.length >= 4 && value.length <= 120)
    .filter(value => /[a-z]/i.test(value))
    .filter(value => !/^https?:/i.test(value));
  return Array.from(new Set(segments)).slice(0, 12);
}

async function fetchDocumentationSource(url: string) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'HCL-Learning-Hub-Course-Builder/1.0' },
    signal: AbortSignal.timeout(20000),
    redirect: 'follow',
  });
  if (!response.ok) throw new Error(`Documentation request returned HTTP ${response.status}`);
  const contentType = response.headers.get('content-type') || '';
  const raw = await response.text();
  const headingMatches = [...raw.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
    .map(match => stripHtmlTags(match[1]))
    .filter(Boolean)
    .slice(0, 16);
  const plainText = /html/i.test(contentType) ? stripHtmlTags(raw) : raw.replace(/\s+/g, ' ').trim();
  const summary = plainText.slice(0, 6000);
  const title = headingMatches[0] || (() => {
    try {
      const parsed = new URL(url);
      return parsed.pathname.split('/').filter(Boolean).pop() || parsed.hostname;
    } catch { return url; }
  })();
  return {
    url,
    title,
    headings: headingMatches,
    summary,
    topics: deriveTopicsFromDocText([...headingMatches, ...summary.split(/\n/).slice(0, 20)].join('\n')),
  };
}

async function resolveDocumentationSources(urls: string[]) {
  const results = await Promise.all(urls.map(async (url) => {
    try { return await fetchDocumentationSource(url); }
    catch { return null; }
  }));
  return results.filter(Boolean) as Array<{ url: string; title: string; headings: string[]; summary: string; topics: string[] }>;
}

function buildWeekTopicTargets(topicCount: number) {
  const targets: number[] = [];
  let remaining = Math.max(topicCount, 1);

  while (remaining > 0) {
    if (remaining === 3) {
      targets.push(3);
      remaining = 0;
    } else if (remaining === 1) {
      targets.push(1);
      remaining = 0;
    } else {
      targets.push(2);
      remaining -= 2;
    }
  }

  return targets;
}

function clampText(value: unknown, fallback: string, max: number, min = 1) {
  const text = String(value ?? fallback).replace(/\s+/g, ' ').trim() || fallback;
  const sliced = text.slice(0, max).trim();
  if (sliced.length >= min) return sliced;
  return fallback.slice(0, max).trim();
}

function cleanBuilderTitle(value: unknown, fallback: string) {
  const base = clampText(value, fallback, 180, 1)
    .replace(/^week\s*\d+\s*[:\-–—]?\s*/i, '')
    .replace(/^module\s*\d+\s*[:\-–—]?\s*/i, '')
    .replace(/^[A-Z]\.[\s-]*/i, '')
    .replace(/\s+learning path$/i, '')
    .replace(/\s+learn and practice$/i, '')
    .trim();
  return base || fallback;
}

function normalizeBuilderKey(value: unknown) {
  return cleanBuilderTitle(value, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function composeWeekTitle(moduleTitles: string[]) {
  const cleaned = moduleTitles.map((title) => cleanBuilderTitle(title, '')).filter(Boolean);
  if (cleaned.length === 0) return 'Core Learning Path';
  if (cleaned.length === 1) return cleaned[0];
  if (cleaned.length === 2) return clampText(`${cleaned[0]} and ${cleaned[1]}`, cleaned[0], 180, 2);
  return clampText(`${cleaned[0]}, ${cleaned[1]}, and ${cleaned[2]}`, cleaned[0], 180, 2);
}

function buildExistingCourseSummary(course: any) {
  const weeks = Array.isArray(course?.weeks) ? course.weeks : [];
  const quests = Array.isArray(course?.quests) ? course.quests : [];

  const moduleQuestCount = new Map<string, number>();
  quests.forEach((quest: any) => {
    if (!quest?.moduleId) return;
    moduleQuestCount.set(quest.moduleId, (moduleQuestCount.get(quest.moduleId) || 0) + 1);
  });

  return weeks.slice(0, 6).map((week: any) => {
    const modules = Array.isArray(week?.modules) ? week.modules : [];
    const moduleSummary = modules.slice(0, 4).map((module: any) => {
      const topics = Array.isArray(module?.topics) ? module.topics : [];
      return `${cleanBuilderTitle(module?.title, 'Untitled Module')} (${topics.length}T/${moduleQuestCount.get(module.id) || 0}Q)`;
    }).join('; ');
    return `Week ${week.weekNumber}: ${cleanBuilderTitle(week?.title, `Week ${week.weekNumber}`)} => ${moduleSummary || 'No modules yet'}`;
  }).join('\n');
}

function extractQuotedOrBulletedNames(input: string) {
  const fromQuotes = [...input.matchAll(/["“”']([^"“”'\n]{2,180})["“”']/g)].map((match) => match[1].trim());
  const fromBullets = input.split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*\d.)]+\s+/.test(line))
    .map((line) => line.replace(/^[-*\d.)]+\s+/, '').trim())
    .filter(Boolean);
  return Array.from(new Set([...fromQuotes, ...fromBullets])).slice(0, 48);
}

function deriveCleanupHints(input: string, existingCourse: any) {
  const request = String(input || '');
  const normalized = request.toLowerCase();
  const existingWeeks = Array.isArray(existingCourse?.weeks) ? existingCourse.weeks : [];
  const existingModules = existingWeeks.flatMap((week: any) => Array.isArray(week?.modules) ? week.modules : []);
  const existingQuests = Array.isArray(existingCourse?.quests) ? existingCourse.quests : [];
  const namedItems = extractQuotedOrBulletedNames(request);

  const replaceExistingCourse = /(remove|delete|replace|rebuild|recreate).*(entire|whole|old|existing).*(learning path|course)|remove the old weekly learning path|replace the old weekly learning path/i.test(request);
  const deleteAllQuests = /(delete|remove).*(all|existing).*(quest|quiz)/i.test(request);
  const deleteWeeks = existingWeeks
    .map((week: any) => String(week?.title || '').trim())
    .filter((title: string) => {
      const key = normalizeBuilderKey(title);
      return key && namedItems.some((item) => normalizeBuilderKey(item) === key) && /(delete|remove|drop)/i.test(request);
    });
  const deleteModules = existingModules
    .map((module: any) => String(module?.title || '').trim())
    .filter((title: string) => {
      const key = normalizeBuilderKey(title);
      return key && namedItems.some((item) => normalizeBuilderKey(item) === key) && /(delete|remove|drop)/i.test(request);
    });
  const deleteQuestTitles = existingQuests
    .map((quest: any) => String(quest?.title || '').trim())
    .filter((title: string) => {
      const key = normalizeBuilderKey(title);
      return key && namedItems.some((item) => normalizeBuilderKey(item) === key) && /(delete|remove|drop)/i.test(request);
    });

  return {
    replaceExistingCourse,
    deleteAllQuests,
    deleteWeeks: Array.from(new Set(deleteWeeks)).slice(0, 24),
    deleteModules: Array.from(new Set(deleteModules)).slice(0, 48),
    deleteQuestTitles: Array.from(new Set(deleteQuestTitles)).slice(0, 96),
    rationale: normalized.includes('delete') || normalized.includes('remove') || normalized.includes('replace')
      ? 'Derived from explicit delete/remove/replace instructions in the request.'
      : '',
  };
}

function normalizeCleanupPlan(cleanup: any, input: string, existingCourse: any) {
  const hinted = deriveCleanupHints(input, existingCourse);
  const parsed = builderCleanupSchema.safeParse(cleanup || {});
  const data = parsed.success ? parsed.data : builderCleanupSchema.parse({});
  return {
    replaceExistingCourse: data.replaceExistingCourse || hinted.replaceExistingCourse,
    deleteAllQuests: data.deleteAllQuests || hinted.deleteAllQuests,
    deleteWeeks: Array.from(new Set([...(data.deleteWeeks || []), ...hinted.deleteWeeks])).slice(0, 24),
    deleteModules: Array.from(new Set([...(data.deleteModules || []), ...hinted.deleteModules])).slice(0, 48),
    deleteQuestTitles: Array.from(new Set([...(data.deleteQuestTitles || []), ...hinted.deleteQuestTitles])).slice(0, 96),
    rationale: clampText(data.rationale || hinted.rationale || '', '', 1200, 0),
  };
}

function normalizeBuilderPlan(plan: any, courseTitle: string, outlineTopics: string[], weekTopicTargets: number[], mode: 'create' | 'modify' | 'quests-only') {
  const weeks = Array.isArray(plan?.weeks) ? plan.weeks : [];

  const flattenedTopics = weeks.flatMap((week: any) =>
    (Array.isArray(week?.modules) ? week.modules : []).flatMap((module: any) =>
      (Array.isArray(module?.topics) ? module.topics : []).map((topic: any) => ({
        ...topic,
        moduleTitle: module?.title,
        weekTitle: week?.title,
      }))),
  );

  const normalizedTopicPool = outlineTopics.map((seedTitle, topicIndex) => {
    const topic = flattenedTopics[topicIndex] || {};
    const title = cleanBuilderTitle(topic?.title, seedTitle);
    const content = clampText(
      topic?.content,
      `${title} overview for ${courseTitle}. Include practical learning guidance before the learner attempts practice.`,
      1200,
      20,
    );
    const resources = (Array.isArray(topic?.resources) ? topic.resources : [])
      .filter((resource: any) => typeof resource?.url === 'string' && /^https?:\/\//i.test(resource.url))
      .slice(0, 4)
      .map((resource: any, resourceIndex: number) => ({
        label: clampText(resource?.label, `${title} resource ${resourceIndex + 1}`, 180, 2),
        type: ['youtube', 'playlist', 'video', 'read', 'ibm', 'link'].includes(resource?.type) ? resource.type : (/youtube\.com|youtu\.be/i.test(resource?.url || '') ? 'youtube' : 'link'),
        url: String(resource.url).trim().slice(0, 1000),
      }));
    const quest = topic?.quest || {};
    return {
      title,
      content,
      resources,
      quest: {
        title: cleanBuilderTitle(quest?.title, title),
        scenario: clampText(quest?.scenario, `You have studied ${title} in ${courseTitle}. Choose the best practice step to apply what you learned.`, 1200, 20),
        optionA: clampText(quest?.optionA, `Apply the recommended ${title} practice from the learning content.`, 400, 2),
        optionB: clampText(quest?.optionB, `Skip the documented ${title} checks and continue without validation.`, 400, 2),
        optionC: clampText(quest?.optionC, `Delay ${title} planning until after issues appear in production.`, 400, 2),
        optionD: clampText(quest?.optionD, `Ignore the ${title} workflow and rely on guesswork.`, 400, 2),
        correct: ['A', 'B', 'C', 'D'].includes(quest?.correct) ? quest.correct : 'A',
        explanation: clampText(quest?.explanation, `Option A is correct because it follows the learn-and-practice guidance for ${title}.`, 1200, 20),
      },
    };
  });

  let topicCursor = 0;
  const normalizedWeeks = weekTopicTargets.slice(0, 6).map((topicCount, weekIndex) => {
    const weekTopics = normalizedTopicPool.slice(topicCursor, topicCursor + topicCount);
    topicCursor += topicCount;
    const primaryTitle = weekTopics[0]?.title || outlineTopics[weekIndex] || `Week ${weekIndex + 1}`;
    const sourceWeek = weeks[weekIndex] || {};
    const moduleTitles = weekTopics.map((topic) => topic.title).filter(Boolean);
    const cleanedSourceWeekTitle = cleanBuilderTitle(sourceWeek?.title, primaryTitle);
    const combinedWeekTitle = composeWeekTitle(moduleTitles);
    const useCombinedWeekTitle = moduleTitles.length > 1
      && (!cleanedSourceWeekTitle || normalizeBuilderKey(cleanedSourceWeekTitle) === normalizeBuilderKey(moduleTitles[0]));
    return {
      title: useCombinedWeekTitle
        ? combinedWeekTitle
        : cleanBuilderTitle(sourceWeek?.title, mode === 'quests-only' ? combinedWeekTitle : primaryTitle),
      modules: weekTopics.map((topic, moduleIndex) => {
        const sourceModule = sourceWeek?.modules?.[moduleIndex] || {};
        return {
          title: cleanBuilderTitle(sourceModule?.title, topic.title),
          topics: [topic],
        };
      }),
    };
  }).filter((week: any) => week.modules.length > 0);

  return {
    learningMap: clampText(plan?.learningMap, `The course progresses from foundations to practical application across ${normalizedWeeks.length || 1} stages.`, 4000, 20),
    diagram: clampText(plan?.diagram, `flowchart TD\nA[Foundations]-->B[Practice]\nB-->C[Assessment]`, 6000, 20),
    weeks: normalizedWeeks,
    cleanup: builderCleanupSchema.parse({
      replaceExistingCourse: false,
      deleteAllQuests: false,
      deleteWeeks: [],
      deleteModules: [],
      deleteQuestTitles: [],
      rationale: '',
      ...(plan?.cleanup || {}),
    }),
  };
}

aiRouter.post('/course-builder', handle(async (req, res) => {
  const input = builderSchema.parse(req.body);
  const access = await ensureCourseAiAccess(req, res, input.courseId);
  if (!access) return;
  const config = await readConfig();

  if (!config.enabled) { res.status(503).json({ error: 'AI is disabled. Configure the AI Provider first.' }); return; }
  const course = await prisma.course.findUnique({
    where: { id: input.courseId },
    select: {
      title: true,
      description: true,
      weeks: {
        orderBy: { weekNumber: 'asc' },
        select: {
          id: true,
          weekNumber: true,
          title: true,
          modules: {
            orderBy: { order: 'asc' },
            select: {
              id: true,
              title: true,
              topics: { orderBy: { order: 'asc' }, select: { content: true } },
            },
          },
        },
      },
      quests: {
        orderBy: { order: 'asc' },
        select: { id: true, title: true, moduleId: true },
      },
    },
  });
  if (!course) { res.status(404).json({ error: 'Course not found.' }); return; }

  const existingModuleTitles = (course.weeks || []).flatMap((week: any) =>
    (Array.isArray(week.modules) ? week.modules : []).map((module: any) => cleanBuilderTitle(module.title, 'Untitled Module')).filter(Boolean),
  );
  const documentationUrls = Array.from(new Set([...extractDocumentationUrls(input.outline), ...(input.resourceUrls || [])]));
  const documentationSources = await resolveDocumentationSources(documentationUrls);
  const attachmentTopics = (input.attachments || [])
    .flatMap((attachment) => extractOutlineTopics([attachment.summary, attachment.previewText].filter(Boolean).join('\n')))
    .filter(Boolean);
  const requestedTopics = Array.from(new Set([
    ...extractOutlineTopics(stripUrls(input.outline)),
    ...attachmentTopics,
    ...documentationSources.flatMap(source => source.topics),
  ])).slice(0, 12);

  const outlineTopics = input.mode === 'quests-only'
    ? (existingModuleTitles.length ? existingModuleTitles.slice(0, 12) : requestedTopics.slice(0, 12))
    : input.mode === 'modify'
      ? Array.from(new Set([...requestedTopics, ...existingModuleTitles])).slice(0, 12)
      : requestedTopics.slice(0, 12);

  const weekTopicTargets = buildWeekTopicTargets(outlineTopics.length);
  const existingCourseSummary = buildExistingCourseSummary(course);
  const resources = input.mode === 'quests-only'
    ? []
    : [
      ...documentationSources.map(source => ({ label: source.title, type: 'ibm' as const, url: source.url })),
      ...await searchCourseResources(course.title, outlineTopics.slice(0, 4).join(', ')),
    ].filter((resource, index, all) => all.findIndex(item => item.url === resource.url) === index).slice(0, 12);
  const resourceText = resources.length
    ? resources.map((resource, index) => `${index + 1}. ${resource.label} | ${resource.url}`).join('\n')
    : 'No web results were available. Do not invent URLs; leave resources empty.';
  const documentationText = documentationSources.length
    ? documentationSources.map((source, index) => [
      `DOCUMENT ${index + 1}: ${source.title}`,
      `URL: ${source.url}`,
      `HEADINGS: ${source.headings.slice(0, 10).join(' | ') || 'None'}`,
      `EXCERPT: ${source.summary.slice(0, 2500)}`,
    ].join('\n')).join('\n\n')
    : 'No product documentation URLs were supplied.';
  const attachmentsText = input.attachments?.length
    ? summarizeBuilderAttachments(input.attachments)
    : 'No local attachments were supplied.';
  const cleanupHints = deriveCleanupHints(input.outline, course);
  const result = await ollamaRequest(config.endpoint, '/api/chat', {
    model: config.model, stream: false, format: 'json',
    messages: [{ role: 'system', content: [
      'You are the HCL Software Learning Hub full course designer.',
      'Use the AI Quest style: progressive learning, compact topics, scenario-based learning, one quiz quest per topic.',
      'Return JSON only in this exact shape: {"learningMap":"...","diagram":"...","cleanup":{"replaceExistingCourse":false,"deleteAllQuests":false,"deleteWeeks":[],"deleteModules":[],"deleteQuestTitles":[],"rationale":"..."},"weeks":[{"title":"...","modules":[{"title":"...","topics":[{"title":"...","content":"...","resources":[{"label":"...","type":"read|youtube|link","url":"..."}],"quest":{"title":"...","scenario":"...","optionA":"...","optionB":"...","optionC":"...","optionD":"...","correct":"A|B|C|D","explanation":"..."}}]}]}]}.',
      `BUILDER MODE: ${input.mode}.`,
      `Create exactly ${weekTopicTargets.length} weeks. Use this module distribution per week: ${weekTopicTargets.map((count, index) => `Week ${index + 1}=${count} modules`).join(', ')}.`,
      'Each outline topic must appear once. Create exactly 1 topic per module. Keep each topic teachable in 8 to 20 minutes.',
      'learningMap explains the progression. diagram is Mermaid flowchart text only, no markdown fences.',
      'Use concise titles without Week/Module prefixes. Each topic needs one learn-and-practice quest with four options and one correct answer.',
      'The REQUEST is the highest-priority source of truth. Follow it exactly, especially for keep, delete, replace, compare, split, or separate-enablement instructions.',
      'Reconcile and unify all three context sources together: direct instructions, product documentation URLs, and uploaded attachments. Do not ignore any of the three when they are supplied.',
      'If the request names modules or weeks explicitly, preserve those names unless the request explicitly asks you to replace them.',
      input.mode === 'quests-only'
        ? 'Quest-only mode: keep the existing week and module structure. Regenerate only learn content and quiz quests.'
        : input.mode === 'modify'
          ? 'Modify mode: treat the existing course as the base. Update only the requested areas and preserve unaffected structure.'
          : 'Create mode: build a full course preview while avoiding duplicates against the existing course structure.',
      'If product documentation URLs are supplied, infer the module list from the documentation headings, workflows, and terminology before filling any missing areas from the free-text request.',
      'If local attachments are supplied, use their summaries and extracted previews as additional context. If an attachment has no readable preview, use only its filename and summary metadata.',
      'If the request asks to delete or replace content, populate the cleanup object precisely. Use replaceExistingCourse when the old learning path or whole course should be removed before rebuilding.',
      'Use only the supplied candidate URLs. Do not invent or modify URLs. A topic may have zero resources if none fit.',
      `COURSE: ${course.title}\nDESCRIPTION: ${course.description || ''}\nREQUEST: ${input.outline}\nOUTLINE TOPICS:\n${outlineTopics.map((topic, index) => `${index + 1}. ${topic}`).join('\n')}\nEXISTING COURSE STRUCTURE:\n${existingCourseSummary || 'No existing course content.'}\nHEURISTIC CLEANUP HINTS:\n${JSON.stringify(cleanupHints, null, 2)}\nDOCUMENTATION SOURCES:\n${documentationText}\nATTACHMENTS:\n${attachmentsText}\nCANDIDATE RESOURCES:\n${resourceText}`,
    ].join('\n') }],
    options: { temperature: 0.15, num_predict: 6000, num_ctx: 8192 },
  }, { timeoutMs: 480000 });

  let plan: unknown;
  try {
    plan = parseAiJsonPayload(result.message?.content);
  } catch { throw new Error('The AI returned an invalid full course plan. Try a smaller outline.'); }
  const normalizedPlan = normalizeBuilderPlan(plan, course.title, outlineTopics, weekTopicTargets, input.mode);
  const parsed = builderPlanSchema.safeParse({
    ...normalizedPlan,
    cleanup: normalizeCleanupPlan(normalizedPlan.cleanup, input.outline, course),
  });
  if (!parsed.success) throw new Error('The AI returned an incomplete course plan. Try a smaller outline or model.');
  res.json({ ...parsed.data, discoveredResources: resources, documentationSources: documentationSources.map(source => ({ title: source.title, url: source.url })) });
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
const EXTERNAL_RESOURCE_PATTERN = /official|documentation|docs|reference|references|resource|resources|link|links|article|video|tutorial|internet|latest|external|web/i;
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
    if (!sources.length || EXTERNAL_RESOURCE_PATTERN.test(input.message)) {
      const webQueryParts = [
        input.mode === 'course' ? courses[0]?.title : 'HCL Software Learning Hub',
        input.message,
      ].filter(Boolean);
      const webResults = await searchPublicResources([webQueryParts.join(' '), input.message].filter(Boolean));
      const webSources: KnowledgeSource[] = webResults.slice(0, 4).map((resource, index) => ({
        id: `web-${index + 1}`,
        title: resource.label,
        text: `${resource.label}\n${resource.url}`,
        url: resource.url,
      }));
      if (webSources.length) {
        const merged = [...sources, ...webSources];
        const seen = new Set<string>();
        sources = merged.filter(source => {
          const key = `${source.title}::${source.url}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }).slice(0, 6);
      }
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