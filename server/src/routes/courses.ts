import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireRole } from '../middleware/requireRole.js';

export const coursesRouter = Router();

const courseInclude = {
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

// ── List all courses ─────────────────────────────────────────────────────────
coursesRouter.get('/', async (_req, res) => {
  const courses = await (prisma as any).course.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      weeks: { include: { modules: { include: { _count: { select: { topics: true, resources: true } } } } } },
      _count: { select: { weeks: true } },
    },
  });
  res.json(courses);
});

// ── Get single course by slug ─────────────────────────────────────────────────
coursesRouter.get('/:slug', async (req, res) => {
  const course = await (prisma as any).course.findUnique({
    where: { slug: req.params.slug },
    include: courseInclude,
  });
  if (!course) return res.status(404).json({ error: 'Course not found' });
  res.json(course);
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
    const course = await (prisma as any).course.create({ data: { ...p.data, ...helpDefaults } });
    res.json(course);
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Slug already in use' });
    throw e;
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

// ── Update course info (ADMIN) ────────────────────────────────────────────────
coursesRouter.put('/:id', requireRole('ADMIN'), async (req, res) => {
  const p = courseSchema.partial().safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten() });
  const course = await (prisma as any).course.update({ where: { id: req.params.id }, data: p.data });
  res.json(course);
});

// ── Delete course (ADMIN) ─────────────────────────────────────────────────────
coursesRouter.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  await (prisma as any).course.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ── Weeks ─────────────────────────────────────────────────────────────────────
coursesRouter.post('/:courseId/weeks', requireRole('ADMIN'), async (req, res) => {
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

coursesRouter.put('/weeks/:id', requireRole('ADMIN'), async (req, res) => {
  const { title, weekNumber } = req.body;
  const data: any = {};
  if (title !== undefined) data.title = title;
  if (weekNumber !== undefined) data.weekNumber = Number(weekNumber);
  const week = await (prisma as any).courseWeek.update({ where: { id: req.params.id }, data, include: { modules: true } });
  res.json(week);
});

coursesRouter.delete('/weeks/:id', requireRole('ADMIN'), async (req, res) => {
  await (prisma as any).courseWeek.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ── Modules ───────────────────────────────────────────────────────────────────
coursesRouter.post('/weeks/:weekId/modules', requireRole('ADMIN'), async (req, res) => {
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

coursesRouter.put('/modules/:id', requireRole('ADMIN'), async (req, res) => {
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

coursesRouter.delete('/modules/:id', requireRole('ADMIN'), async (req, res) => {
  await (prisma as any).courseModule.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ── Topics ────────────────────────────────────────────────────────────────────
coursesRouter.post('/modules/:moduleId/topics', requireRole('ADMIN'), async (req, res) => {
  const { content, order } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });
  const topic = await (prisma as any).courseTopic.create({
    data: { moduleId: req.params.moduleId, content, order: Number(order ?? 0) },
  });
  res.json(topic);
});

coursesRouter.put('/topics/:id', requireRole('ADMIN'), async (req, res) => {
  const { content, order } = req.body;
  const data: any = {};
  if (content !== undefined) data.content = content;
  if (order   !== undefined) data.order   = Number(order);
  const topic = await (prisma as any).courseTopic.update({ where: { id: req.params.id }, data });
  res.json(topic);
});

coursesRouter.delete('/topics/:id', requireRole('ADMIN'), async (req, res) => {
  await (prisma as any).courseTopic.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ── Resources ─────────────────────────────────────────────────────────────────
coursesRouter.post('/modules/:moduleId/resources', requireRole('ADMIN'), async (req, res) => {
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

coursesRouter.put('/resources/:id', requireRole('ADMIN'), async (req, res) => {
  const { label, type, url, order } = req.body;
  const data: any = {};
  if (label !== undefined) data.label = label;
  if (type  !== undefined) data.type  = type;
  if (url   !== undefined) data.url   = url;
  if (order !== undefined) data.order = Number(order);
  const res_ = await (prisma as any).courseResource.update({ where: { id: req.params.id }, data });
  res.json(res_);
});

coursesRouter.delete('/resources/:id', requireRole('ADMIN'), async (req, res) => {
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

// POST create quest (ADMIN)
coursesRouter.post('/:courseId/quests', requireRole('ADMIN'), async (req, res) => {
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

// PUT update quest (ADMIN)
coursesRouter.put('/quests/:id', requireRole('ADMIN'), async (req, res) => {
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

// DELETE quest (ADMIN)
coursesRouter.delete('/quests/:id', requireRole('ADMIN'), async (req, res) => {
  await (prisma as any).courseQuest.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
