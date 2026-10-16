import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { createDatabaseBackup } from '../lib/dbBackup.js';
import { requireRole } from '../middleware/requireRole.js';

export const coursesRouter = Router();

const moderatorSettingKey = (slug: string) => `course.moderators.${slug}`;
const categorySettingKey = (courseId: string) => `course.category.${courseId}`;

function normalizeCourseCategory(category?: string | null) {
  return category === 'process' || category === 'product' || category === 'technology'
    ? category
    : 'technology';
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

async function getModeratorIdsBySlug(slug: string): Promise<string[]> {
  const setting = await (prisma as any).setting.findUnique({ where: { key: moderatorSettingKey(slug) } });
  return parseModeratorIds(setting?.value);
}

async function getModeratorMap(slugs: string[]): Promise<Record<string, string[]>> {
  if (!slugs.length) return {};
  const rows = await (prisma as any).setting.findMany({
    where: { key: { in: slugs.map(moderatorSettingKey) } },
  });
  const map: Record<string, string[]> = Object.fromEntries(slugs.map(slug => [slug, []]));
  rows.forEach((row: any) => {
    const slug = String(row.key || '').replace(/^course\.moderators\./, '');
    map[slug] = parseModeratorIds(row.value);
  });
  return map;
}

async function getCategoryOverrideMap(courseIds: string[]): Promise<Record<string, string>> {
  if (!courseIds.length) return {};
  const rows = await (prisma as any).setting.findMany({
    where: { key: { in: courseIds.map(categorySettingKey) } },
  });
  const map: Record<string, string> = {};
  rows.forEach((row: any) => {
    const courseId = String(row.key || '').replace(/^course\.category\./, '');
    map[courseId] = normalizeCourseCategory(row.value);
  });
  return map;
}

async function persistCategoryOverride(courseId: string, category?: string | null) {
  const normalized = normalizeCourseCategory(category);
  await (prisma as any).setting.upsert({
    where: { key: categorySettingKey(courseId) },
    update: { value: normalized },
    create: { key: categorySettingKey(courseId), value: normalized },
  });
  return normalized;
}

function canEditCourse(user: Express.Request['user'], moderatorIds: string[]) {
  return user?.role === 'ADMIN' || moderatorIds.includes(user?.id || '');
}

async function getCourseSlugById(id: string): Promise<string | null> {
  const course = await (prisma as any).course.findUnique({ where: { id }, select: { slug: true } });
  return course?.slug ?? null;
}

async function getCourseSlugByWeekId(id: string): Promise<string | null> {
  const week = await (prisma as any).courseWeek.findUnique({
    where: { id },
    select: { course: { select: { slug: true } } },
  });
  return week?.course?.slug ?? null;
}

async function getCourseSlugByModuleId(id: string): Promise<string | null> {
  const module = await (prisma as any).courseModule.findUnique({
    where: { id },
    select: { week: { select: { course: { select: { slug: true } } } } },
  });
  return module?.week?.course?.slug ?? null;
}

async function getCourseSlugByTopicId(id: string): Promise<string | null> {
  const topic = await (prisma as any).courseTopic.findUnique({
    where: { id },
    select: { module: { select: { week: { select: { course: { select: { slug: true } } } } } } },
  });
  return topic?.module?.week?.course?.slug ?? null;
}

async function getCourseSlugByResourceId(id: string): Promise<string | null> {
  const resource = await (prisma as any).courseResource.findUnique({
    where: { id },
    select: { module: { select: { week: { select: { course: { select: { slug: true } } } } } } },
  });
  return resource?.module?.week?.course?.slug ?? null;
}

async function getCourseSlugByQuestId(id: string): Promise<string | null> {
  const quest = await (prisma as any).courseQuest.findUnique({
    where: { id },
    select: { course: { select: { slug: true } } },
  });
  return quest?.course?.slug ?? null;
}

async function ensureCourseEditor(req: any, res: any, slug: string | null) {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return false;
  }
  if (!slug) {
    res.status(404).json({ error: 'Course not found' });
    return false;
  }
  const moderatorIds = await getModeratorIdsBySlug(slug);
  if (!canEditCourse(req.user, moderatorIds)) {
    res.status(403).json({ error: 'Forbidden: insufficient course permissions' });
    return false;
  }
  return true;
}

async function decorateCourse(course: any, user: Express.Request['user']) {
  const moderatorIds = await getModeratorIdsBySlug(course.slug);
  const categoryMap = await getCategoryOverrideMap([course.id]);
  return {
    ...course,
    category: categoryMap[course.id] || normalizeCourseCategory(course.category),
    moderatorIds,
    canEdit: canEditCourse(user, moderatorIds),
  };
}

async function resolveCourseCategory(courseId: string, fallbackCategory?: string | null) {
  const categoryMap = await getCategoryOverrideMap([courseId]);
  return categoryMap[courseId] || normalizeCourseCategory(fallbackCategory);
}

function isUnknownCategoryArgumentError(error: unknown) {
  return /unknown argument [`'"]?category[`'"]?/i.test(String((error as any)?.message || ''));
}

function isMissingCategoryColumnError(error: unknown) {
  return (error as any)?.code === 'P2022' || /column .*category.* does not exist/i.test(String((error as any)?.message || ''));
}

async function syncCourseCategoryColumn(courseId: string, category: string) {
  await (prisma as any).$executeRaw(
    Prisma.sql`UPDATE "Course" SET "category" = ${category}, "updatedAt" = NOW() WHERE "id" = ${courseId}`,
  );
}

async function applyCategoryFallback(courseId: string, data: Record<string, any>) {
  const normalizedCategory = persistCategoryOverride(courseId, data.category);
  const { category, ...rest } = data;
  const hasOtherFields = Object.keys(rest).length > 0;
  const updatedCourse = hasOtherFields
    ? await (prisma as any).course.update({ where: { id: courseId }, data: rest, select: courseBaseSelect })
    : await (prisma as any).course.findUnique({ where: { id: courseId }, select: courseBaseSelect });
  try {
    if (category !== undefined) await syncCourseCategoryColumn(courseId, category);
  } catch (syncError: any) {
    if (!isMissingCategoryColumnError(syncError)) throw syncError;
  }
  return { ...(updatedCourse || {}), category: await normalizedCategory };
}

// Explicit course selections keep the admin panel working even when an older VM restore does not
// yet have the newer category column, because category still falls back from the settings table.
const courseBaseSelect = {
  id: true,
  slug: true,
  title: true,
  tagline: true,
  description: true,
  emoji: true,
  accentColor: true,
  status: true,
  order: true,
  instructorName: true,
  instructorEmail: true,
  helpSpaceUrl: true,
  helpSpaceName: true,
  helpSpaceHint: true,
  createdAt: true,
  updatedAt: true,
};

const courseDetailSelect = {
  ...courseBaseSelect,
  weeks: {
    orderBy: { weekNumber: 'asc' as const },
    include: {
      modules: {
        orderBy: { order: 'asc' as const },
        include: {
          topics:    { orderBy: { order: 'asc' as const } },
          resources: { orderBy: { order: 'asc' as const } },
        },
      },
    },
  },
  _count: { select: { quests: true } },
};

const courseListSelect = {
  ...courseBaseSelect,
  weeks: { include: { modules: { include: { _count: { select: { topics: true, resources: true } } } } } },
  _count: { select: { weeks: true } },
};

// ── List all courses ─────────────────────────────────────────────────────────
coursesRouter.get('/', async (req, res) => {
  const courses = await (prisma as any).course.findMany({
    orderBy: { createdAt: 'asc' },
    select: courseListSelect,
  });
  const moderatorMap = await getModeratorMap(courses.map((course: any) => course.slug));
  const categoryMap = await getCategoryOverrideMap(courses.map((course: any) => course.id));
  res.json(courses.map((course: any) => {
    const moderatorIds = moderatorMap[course.slug] || [];
    return {
      ...course,
      category: categoryMap[course.id] || normalizeCourseCategory(course.category),
      moderatorIds,
      canEdit: canEditCourse(req.user, moderatorIds),
    };
  }));
});

// ── Get single course by slug ─────────────────────────────────────────────────
coursesRouter.get('/:slug', async (req, res) => {
  const course = await (prisma as any).course.findUnique({
    where: { slug: req.params.slug },
    select: courseDetailSelect,
  });
  if (!course) return res.status(404).json({ error: 'Course not found' });
  res.json(await decorateCourse(course, req.user));
});

const moderatorSchema = z.object({ moderatorIds: z.array(z.string()).default([]) });

coursesRouter.get('/:slug/moderators', requireRole('ADMIN'), async (req, res) => {
  const moderatorIds = await getModeratorIdsBySlug(req.params.slug);
  const moderators = moderatorIds.length === 0
    ? []
    : await (prisma as any).user.findMany({
        where: { id: { in: moderatorIds } },
        select: { id: true, name: true, email: true, role: true },
        orderBy: { name: 'asc' },
      });
  res.json({ moderatorIds, moderators });
});

coursesRouter.put('/:slug/moderators', requireRole('ADMIN'), async (req, res) => {
  const parsed = moderatorSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const uniqueIds = [...new Set(parsed.data.moderatorIds.filter(Boolean))];
  await (prisma as any).setting.upsert({
    where: { key: moderatorSettingKey(req.params.slug) },
    update: { value: JSON.stringify(uniqueIds) },
    create: { key: moderatorSettingKey(req.params.slug), value: JSON.stringify(uniqueIds) },
  });
  const moderators = uniqueIds.length === 0
    ? []
    : await (prisma as any).user.findMany({
        where: { id: { in: uniqueIds } },
        select: { id: true, name: true, email: true, role: true },
        orderBy: { name: 'asc' },
      });
  res.json({ moderatorIds: uniqueIds, moderators });
});

// ── Create course (ADMIN) ─────────────────────────────────────────────────────
const courseSchema = z.object({
  title:           z.string().min(2),
  slug:            z.string().min(2).regex(/^[a-z0-9-]+$/),
  tagline:         z.string().optional(),
  description:     z.string().optional(),
  emoji:           z.string().optional(),
  accentColor:     z.string().optional(),
  status:          z.enum(['live', 'coming-soon']).optional(),
  category:        z.enum(['process', 'product', 'technology']).optional(),
  order:           z.number().optional(),
  instructorName:  z.string().optional(),
  instructorEmail: z.string().optional(),
  helpSpaceUrl:    z.string().optional(),
  helpSpaceName:   z.string().optional(),
  helpSpaceHint:   z.string().optional(),
});

coursesRouter.post('/', requireRole('ADMIN'), async (req, res) => {
  const p = courseSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten() });
  try {
    // Inherit global help settings for new courses so the Help button works immediately
    const settings = await (prisma as any).setting.findMany();
    const s: Record<string, string> = {};
    settings.forEach((r: any) => { s[r.key] = r.value; });
    const helpDefaults = {
      instructorName:  p.data.instructorName  || s['help.instructor.name']  || '',
      instructorEmail: p.data.instructorEmail || s['help.instructor.email'] || '',
      helpSpaceUrl:    p.data.helpSpaceUrl    || s['help.spaces.generic.url']  || '',
      helpSpaceName:   p.data.helpSpaceName   || s['help.spaces.generic.name'] || '',
      helpSpaceHint:   p.data.helpSpaceHint   || s['help.spaces.generic.hint'] || '',
    };
    const course = await (prisma as any).course.create({ data: { ...p.data, category: p.data.category || 'technology', ...helpDefaults }, select: courseBaseSelect });
    if (p.data.category) await persistCategoryOverride(course.id, p.data.category);
    res.json({ ...course, category: await resolveCourseCategory(course.id, p.data.category || 'technology') });
  } catch (e: any) {
    if (p.data.category && (isUnknownCategoryArgumentError(e) || isMissingCategoryColumnError(e))) {
      try {
        const settings = await (prisma as any).setting.findMany();
        const s: Record<string, string> = {};
        settings.forEach((r: any) => { s[r.key] = r.value; });
        const helpDefaults = {
          instructorName:  p.data.instructorName  || s['help.instructor.name']  || '',
          instructorEmail: p.data.instructorEmail || s['help.instructor.email'] || '',
          helpSpaceUrl:    p.data.helpSpaceUrl    || s['help.spaces.generic.url']  || '',
          helpSpaceName:   p.data.helpSpaceName   || s['help.spaces.generic.name'] || '',
          helpSpaceHint:   p.data.helpSpaceHint   || s['help.spaces.generic.hint'] || '',
        };
        const { category, ...rest } = p.data;
        const course = await (prisma as any).course.create({ data: { ...rest, ...helpDefaults }, select: courseBaseSelect });
        await persistCategoryOverride(course.id, category);
        return res.json({ ...course, category: normalizeCourseCategory(category) });
      } catch (fallbackError: any) {
        console.error('[courses] create category fallback failed:', fallbackError);
        return res.status(500).json({ error: fallbackError instanceof Error ? fallbackError.message : 'Failed to create course' });
      }
    }
    if (e.code === 'P2002') return res.status(409).json({ error: 'Slug already in use' });
    console.error('[courses] create failed:', e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to create course' });
  }
});
// ── Bulk reorder courses (ADMIN) — must be before /:id ───────────────────────
coursesRouter.put('/reorder', requireRole('ADMIN'), async (req, res) => {
  const { orders } = req.body; // [{ id, order }]
  if (!Array.isArray(orders)) return res.status(400).json({ error: 'orders array required' });
  await Promise.all(orders.map(({ id, order }: any) =>
    (prisma as any).course.update({ where: { id }, data: { order: Number(order) } })
  ));
  res.json({ ok: true });
});

// ── Update course info (ADMIN or assigned moderator) ──────────────────────────
coursesRouter.put('/:id', async (req, res) => {
  if (!(await ensureCourseEditor(req, res, await getCourseSlugById(req.params.id)))) return;
  const p = courseSchema.partial().safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten() });
  const data = { ...p.data } as Record<string, any>;
  try {
    const course = await (prisma as any).course.update({ where: { id: req.params.id }, data, select: courseBaseSelect });
    if (data.category !== undefined) await persistCategoryOverride(req.params.id, data.category);
    res.json({ ...course, category: await resolveCourseCategory(req.params.id, data.category || 'technology') });
  } catch (error: any) {
    if (error?.code === 'P2002') return res.status(409).json({ error: 'Course slug already in use' });
    if (data.category !== undefined && (isUnknownCategoryArgumentError(error) || isMissingCategoryColumnError(error))) {
      try {
        return res.json(await applyCategoryFallback(req.params.id, data));
      } catch (fallbackError: any) {
        if (fallbackError?.code === 'P2002') return res.status(409).json({ error: 'Course slug already in use' });
        console.error('[courses] update category fallback failed:', fallbackError);
        return res.status(500).json({ error: fallbackError instanceof Error ? fallbackError.message : 'Failed to update course category' });
      }
    }
    console.error('[courses] update failed:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update course' });
  }
});

// ── Delete course (ADMIN) ─────────────────────────────────────────────────────
coursesRouter.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  try {
    const course = await (prisma as any).course.findUnique({ where: { id: req.params.id }, select: { id: true, slug: true, title: true } });
    if (!course) return res.status(404).json({ error: 'Course not found' });
    const backup = await createDatabaseBackup({ label: `before-delete-course-${course.slug}` });
    await (prisma as any).course.delete({ where: { id: req.params.id } });
    res.json({ ok: true, backup });
  } catch (error) {
    console.error('[courses] delete backup failed:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Course deletion backup failed' });
  }
});

// ── Weeks ─────────────────────────────────────────────────────────────────────
coursesRouter.post('/:courseId/weeks', async (req, res) => {
  if (!(await ensureCourseEditor(req, res, await getCourseSlugById(req.params.courseId)))) return;
  const { title, weekNumber } = req.body;
  if (!title || !weekNumber) return res.status(400).json({ error: 'title and weekNumber required' });
  try {
    const week = await (prisma as any).courseWeek.create({
      data: { courseId: req.params.courseId, weekNumber: Number(weekNumber), title },
      include: { modules: true },
    });
    res.json(week);
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Week number already exists in this course' });
    throw e;
  }
});

coursesRouter.put('/weeks/:id', async (req, res) => {
  if (!(await ensureCourseEditor(req, res, await getCourseSlugByWeekId(req.params.id)))) return;
  const { title, weekNumber } = req.body;
  const data: any = {};
  if (title !== undefined) data.title = title;
  if (weekNumber !== undefined) data.weekNumber = Number(weekNumber);
  const week = await (prisma as any).courseWeek.update({ where: { id: req.params.id }, data, include: { modules: true } });
  res.json(week);
});

coursesRouter.delete('/weeks/:id', async (req, res) => {
  if (!(await ensureCourseEditor(req, res, await getCourseSlugByWeekId(req.params.id)))) return;
  await (prisma as any).courseWeek.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ── Modules ───────────────────────────────────────────────────────────────────
coursesRouter.post('/weeks/:weekId/modules', async (req, res) => {
  if (!(await ensureCourseEditor(req, res, await getCourseSlugByWeekId(req.params.weekId)))) return;
  const { title, icon, color, order, number } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const mod = await (prisma as any).courseModule.create({
    data: {
      weekId: req.params.weekId,
      title,
      icon:   icon  || '📖',
      color:  color || '#06b6d4',
      order:  Number(order  ?? 0),
      number: Number(number ?? 1),
    },
    include: { topics: true, resources: true },
  });
  res.json(mod);
});

coursesRouter.put('/modules/:id', async (req, res) => {
  if (!(await ensureCourseEditor(req, res, await getCourseSlugByModuleId(req.params.id)))) return;
  const { title, icon, color, order, number } = req.body;
  const data: any = {};
  if (title  !== undefined) data.title  = title;
  if (icon   !== undefined) data.icon   = icon;
  if (color  !== undefined) data.color  = color;
  if (order  !== undefined) data.order  = Number(order);
  if (number !== undefined) data.number = Number(number);
  const mod = await (prisma as any).courseModule.update({
    where: { id: req.params.id }, data,
    include: { topics: true, resources: true },
  });
  res.json(mod);
});

coursesRouter.delete('/modules/:id', async (req, res) => {
  if (!(await ensureCourseEditor(req, res, await getCourseSlugByModuleId(req.params.id)))) return;
  await (prisma as any).courseModule.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ── Topics ────────────────────────────────────────────────────────────────────
coursesRouter.post('/modules/:moduleId/topics', async (req, res) => {
  if (!(await ensureCourseEditor(req, res, await getCourseSlugByModuleId(req.params.moduleId)))) return;
  const { content, order } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });
  const topic = await (prisma as any).courseTopic.create({
    data: { moduleId: req.params.moduleId, content, order: Number(order ?? 0) },
  });
  res.json(topic);
});

coursesRouter.put('/topics/:id', async (req, res) => {
  if (!(await ensureCourseEditor(req, res, await getCourseSlugByTopicId(req.params.id)))) return;
  const { content, order } = req.body;
  const data: any = {};
  if (content !== undefined) data.content = content;
  if (order   !== undefined) data.order   = Number(order);
  const topic = await (prisma as any).courseTopic.update({ where: { id: req.params.id }, data });
  res.json(topic);
});

coursesRouter.delete('/topics/:id', async (req, res) => {
  if (!(await ensureCourseEditor(req, res, await getCourseSlugByTopicId(req.params.id)))) return;
  await (prisma as any).courseTopic.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ── Resources ─────────────────────────────────────────────────────────────────
coursesRouter.post('/modules/:moduleId/resources', async (req, res) => {
  if (!(await ensureCourseEditor(req, res, await getCourseSlugByModuleId(req.params.moduleId)))) return;
  const { label, type, url, order } = req.body;
  if (!label) return res.status(400).json({ error: 'label required' });
  const res_ = await (prisma as any).courseResource.create({
    data: {
      moduleId: req.params.moduleId,
      label,
      type:  type  || 'link',
      url:   url   || '',
      order: Number(order ?? 0),
    },
  });
  res.json(res_);
});

coursesRouter.put('/resources/:id', async (req, res) => {
  if (!(await ensureCourseEditor(req, res, await getCourseSlugByResourceId(req.params.id)))) return;
  const { label, type, url, order } = req.body;
  const data: any = {};
  if (label !== undefined) data.label = label;
  if (type  !== undefined) data.type  = type;
  if (url   !== undefined) data.url   = url;
  if (order !== undefined) data.order = Number(order);
  const res_ = await (prisma as any).courseResource.update({ where: { id: req.params.id }, data });
  res.json(res_);
});

coursesRouter.delete('/resources/:id', async (req, res) => {
  if (!(await ensureCourseEditor(req, res, await getCourseSlugByResourceId(req.params.id)))) return;
  await (prisma as any).courseResource.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ── Quests ─────────────────────────────────────────────────────────────────────
// GET all quests for a course (public, authenticated)
coursesRouter.get('/:courseId/quests', async (req, res) => {
  const quests = await (prisma as any).courseQuest.findMany({
    where: { courseId: req.params.courseId },
    orderBy: { order: 'asc' },
  });
  res.json(quests);
});

// GET single quest by id
coursesRouter.get('/quests/:id', async (req, res) => {
  const q = await (prisma as any).courseQuest.findUnique({ where: { id: req.params.id } });
  if (!q) return res.status(404).json({ error: 'Quest not found' });
  res.json(q);
});

// POST create quest (ADMIN or assigned moderator)
coursesRouter.post('/:courseId/quests', async (req, res) => {
  if (!(await ensureCourseEditor(req, res, await getCourseSlugById(req.params.courseId)))) return;
  const { title, scenario, optionA, optionB, optionC, optionD, correct, explanation, xp, moduleId, order, learnTopics, learnResources } = req.body;
  if (!title || !scenario || !optionA || !optionB || !optionC || !optionD || !correct || !explanation) {
    return res.status(400).json({ error: 'All quest fields are required' });
  }
  const q = await (prisma as any).courseQuest.create({
    data: {
      courseId: req.params.courseId,
      moduleId: moduleId || null,
      title, scenario, optionA, optionB, optionC, optionD,
      correct: correct.toUpperCase(),
      explanation,
      xp:             Number(xp    ?? 10),
      order:          Number(order ?? 0),
      learnTopics:    learnTopics    ?? null,
      learnResources: learnResources ?? null,
    },
  });
  res.json(q);
});

// PUT update quest (ADMIN or assigned moderator)
coursesRouter.put('/quests/:id', async (req, res) => {
  if (!(await ensureCourseEditor(req, res, await getCourseSlugByQuestId(req.params.id)))) return;
  const { title, scenario, optionA, optionB, optionC, optionD, correct, explanation, xp, moduleId, order, learnTopics, learnResources } = req.body;
  const data: any = {};
  if (title          !== undefined) data.title          = title;
  if (scenario       !== undefined) data.scenario       = scenario;
  if (optionA        !== undefined) data.optionA        = optionA;
  if (optionB        !== undefined) data.optionB        = optionB;
  if (optionC        !== undefined) data.optionC        = optionC;
  if (optionD        !== undefined) data.optionD        = optionD;
  if (correct        !== undefined) data.correct        = correct.toUpperCase();
  if (explanation    !== undefined) data.explanation    = explanation;
  if (xp             !== undefined) data.xp             = Number(xp);
  if (moduleId       !== undefined) data.moduleId       = moduleId || null;
  if (order          !== undefined) data.order          = Number(order);
  if (learnTopics    !== undefined) data.learnTopics    = learnTopics    ?? null;
  if (learnResources !== undefined) data.learnResources = learnResources ?? null;
  const q = await (prisma as any).courseQuest.update({ where: { id: req.params.id }, data });
  res.json(q);
});

// DELETE quest (ADMIN or assigned moderator)
coursesRouter.delete('/quests/:id', async (req, res) => {
  if (!(await ensureCourseEditor(req, res, await getCourseSlugByQuestId(req.params.id)))) return;
  await (prisma as any).courseQuest.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
