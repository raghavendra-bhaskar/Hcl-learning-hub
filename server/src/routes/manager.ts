import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireRole } from '../middleware/requireRole.js';

export const managerRouter = Router();

managerRouter.use(requireRole('MANAGER', 'ADMIN'));

// ── Recursive tree helpers ─────────────────────────────────────────────────────

/**
 * Collect ALL manager IDs in the subtree rooted at rootManagerId (BFS).
 * Traverses via User.managerId (the primary hierarchy field).
 */
async function getAllTreeManagerIds(rootManagerId: string): Promise<string[]> {
  const result = new Set<string>([rootManagerId]);
  const queue  = [rootManagerId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const subManagers = await prisma.user.findMany({
      where:  { managerId: currentId, role: 'MANAGER' },
      select: { id: true },
    });
    for (const sm of subManagers) {
      if (!result.has(sm.id)) {
        result.add(sm.id);
        queue.push(sm.id);
      }
    }
  }

  return Array.from(result);
}

type ModBucket = { quests: number; xp: number; lastActivity: string | null };

type CourseMeta = { slug: string; title: string; totalQuests: number };

function buildSummary(u: any, trackedCourses: CourseMeta[]) {
  const totalXP  = (u.progress as any[]).reduce((s: number, p: any) => s + p.xpEarned, 0);
  const byModule = (u.progress as any[]).reduce((acc: Record<string, ModBucket>, p: any) => {
    const b = (acc[p.module] ??= { quests: 0, xp: 0, lastActivity: null });
    b.quests += 1;
    b.xp     += p.xpEarned;
    const ts  = p.completedAt.toISOString();
    if (!b.lastActivity || ts > b.lastActivity) b.lastActivity = ts;
    return acc;
  }, {} as Record<string, ModBucket>);
  const courseProgress = trackedCourses.map((course) => {
    const certs = (u.certifications as any[]).filter((cert: any) => cert.certId === course.slug);
    const achieved = certs.some((cert: any) => cert.status === 'achieved');
    const inProgress = certs.some((cert: any) => cert.status === 'in-progress');
    const assigned = certs.some((cert: any) => cert.status === 'assigned');
    const completedQuests = (u.progress as any[]).filter((progress: any) => progress.module === course.slug).length;
    const percentage = achieved
      ? 100
      : course.totalQuests > 0
      ? Math.max(0, Math.min(100, Math.round((completedQuests / course.totalQuests) * 100)))
      : 0;
    const status = achieved
      ? 'completed'
      : completedQuests > 0 || inProgress
      ? 'in-progress'
      : assigned
      ? 'opted'
      : 'not-started';
    return {
      slug: course.slug,
      title: course.title,
      totalQuests: course.totalQuests,
      completedQuests,
      percentage,
      status,
    };
  });
  return {
    id:              u.id,
    name:            u.name,
    email:           u.email,
    role:            u.role,
    managerId:       u.managerId ?? null,
    managers:        (u.assignedManagers ?? []).map((am: any) => am.manager),
    totalXP,
    questsCompleted: (u.progress as any[]).length,
    badgeCount:      (u.badges as any[]).length,
    certifications:  (u.certifications as any[]).map((c: any) => ({
      certId:     c.certId,
      level:      c.level,
      status:     c.status,
      achievedAt: c.achievedAt ? c.achievedAt.toISOString() : null,
    })),
    courseProgress,
    byModule,
    lastActivity: u.progress[0]?.completedAt?.toISOString() ?? null,
  };
}

async function getTrackedCourses(): Promise<CourseMeta[]> {
  const courses = await prisma.course.findMany({
    select: { slug: true, title: true, _count: { select: { quests: true } } },
    orderBy: [
      { order: 'asc' },
      { title: 'asc' },
    ],
  });
  return courses.map((course: any) => ({ slug: course.slug, title: course.title, totalQuests: course._count?.quests || 0 }));
}

const LEARNER_INCLUDE = {
  progress:         { orderBy: { completedAt: 'desc' as const } },
  badges:           true,
  certifications:   true,
  assignedManagers: { include: { manager: { select: { id: true, name: true, email: true } } } },
};

// ── GET /manager/all-learners ──────────────────────────────────────────────────
// Returns all learners visible to the current manager, including nested sub-teams.
managerRouter.get('/all-learners', async (req, res) => {
  const isAdmin   = req.user!.role === 'ADMIN';
  const managerId = req.user!.id;
  const trackedCourses = await getTrackedCourses();

  let whereClause: Record<string, unknown> = {};
  if (!isAdmin) {
    // Recursively collect the IDs of all managers in the tree under this manager
    const treeManagerIds = await getAllTreeManagerIds(managerId);
    whereClause = {
      id:  { not: managerId },   // exclude self
      OR: [
        { assignedManagers: { some: { managerId: { in: treeManagerIds } } } },
        { managerId:        { in: treeManagerIds } },
      ],
    };
  }

  const learners = await (prisma.user as any).findMany({
    where:   whereClause,
    include: LEARNER_INCLUDE,
    orderBy: { name: 'asc' },
  });

  res.json((learners as any[]).map((learner: any) => buildSummary(learner, trackedCourses)));
});

// ── GET /manager/tree ──────────────────────────────────────────────────────────
// Returns the full hierarchical team structure for the current manager.
managerRouter.get('/tree', async (req, res) => {
  const rootId = req.user!.role === 'ADMIN' && req.query.managerId
    ? String(req.query.managerId)
    : req.user!.id;
  const trackedCourses = await getTrackedCourses();

  type TreeNode = {
    id: string; name: string; email: string; role: string;
    directReports: TreeNode[];
    learners: ReturnType<typeof buildSummary>[];
  };

  async function buildNode(mgrId: string, visited = new Set<string>()): Promise<TreeNode> {
    if (visited.has(mgrId)) return { id: mgrId, name: '', email: '', role: 'MANAGER', directReports: [], learners: [] };
    visited.add(mgrId);

    const mgr = await prisma.user.findUnique({
      where: { id: mgrId },
      select: { id: true, name: true, email: true, role: true },
    });

    // Direct manager-role reports (sub-managers)
    const subManagers = await prisma.user.findMany({
      where: { managerId: mgrId, role: 'MANAGER' },
      select: { id: true },
    });

    // Non-manager reports (regular learners)
    const learnersRaw = await (prisma.user as any).findMany({
      where:   { managerId: mgrId, role: { not: 'MANAGER' } },
      include: LEARNER_INCLUDE,
      orderBy: { name: 'asc' },
    });

    // Also include learners assigned via UserManager table who aren't direct FK subordinates
    const assignedRaw = await (prisma.user as any).findMany({
      where: {
        assignedManagers: { some: { managerId: mgrId } },
        managerId: { not: mgrId },
        role: { not: 'MANAGER' },
      },
      include: LEARNER_INCLUDE,
      orderBy: { name: 'asc' },
    });

    const seenIds = new Set(learnersRaw.map((l: any) => l.id));
    const allLearners = [...learnersRaw, ...assignedRaw.filter((l: any) => !seenIds.has(l.id))];

    return {
      id:            mgr?.id    ?? mgrId,
      name:          mgr?.name  ?? '',
      email:         mgr?.email ?? '',
      role:          mgr?.role  ?? 'MANAGER',
      directReports: await Promise.all(subManagers.map(sm => buildNode(sm.id, new Set(visited)))),
      learners:      allLearners.map((learner: any) => buildSummary(learner, trackedCourses)),
    };
  }

  try {
    res.json(await buildNode(rootId));
  } catch (err) {
    console.error('[manager/tree]', err);
    res.status(500).json({ error: 'Failed to build team tree' });
  }
});

// ── GET /manager/subordinates ──────────────────────────────────────────────────
managerRouter.get('/subordinates', async (req, res) => {
  const managerId = req.user!.role === 'ADMIN' && req.query.managerId
    ? String(req.query.managerId)
    : req.user!.id;

  const subordinates = await prisma.user.findMany({
    where:   { managerId },
    include: { progress: true, badges: true, certifications: true },
    orderBy: { name: 'asc' },
  });

  const summary = subordinates.map((s) => {
    const totalXP  = s.progress.reduce((sum, p) => sum + p.xpEarned, 0);
    const byModule = s.progress.reduce<Record<string, { quests: number; xp: number }>>((acc, p) => {
      const bucket = (acc[p.module] ??= { quests: 0, xp: 0 });
      bucket.quests += 1;
      bucket.xp     += p.xpEarned;
      return acc;
    }, {});
    return {
      id:              s.id,
      name:            s.name,
      email:           s.email,
      role:            s.role,
      totalXP,
      questsCompleted: s.progress.length,
      badges:          s.badges.length,
      certifications:  s.certifications
        .filter((c) => c.status === 'achieved')
        .map((c)  => ({ certId: c.certId, level: c.level, achievedAt: c.achievedAt })),
      byModule,
    };
  });

  res.json(summary);
});

const addSubordinateSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
});

managerRouter.post('/subordinates', async (req, res) => {
  const parsed = addSubordinateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const email = parsed.data.email.toLowerCase();
  const managerId = req.user!.id;

  const sub = await prisma.user.upsert({
    where: { email },
    update: { managerId },
    create: { email, name: parsed.data.name ?? email, role: 'USER', managerId },
  });
  res.status(201).json(sub);
});

managerRouter.delete('/subordinates/:id', async (req, res) => {
  const id = req.params.id;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.managerId !== req.user!.id && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Not your subordinate' });
  }
  await prisma.user.update({ where: { id }, data: { managerId: null } });
  res.status(204).end();
});
