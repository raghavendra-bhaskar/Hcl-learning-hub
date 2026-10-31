import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireRole } from '../middleware/requireRole.js';
import { sendTestEmail } from '../lib/email.js';

export const notificationsRouter = Router();

// ── Notification types ────────────────────────────────────────────────────────
// quest_completion  — email on each quest completed   (default: true for all)
// course_completion — email when a course is done     (default: true for all)
// weekly_report     — Monday digest for managers      (default: true for MANAGER/ADMIN, opt-out)

const VALID_TYPES = ['quest_completion', 'course_completion', 'weekly_report'] as const;
type NotifType = typeof VALID_TYPES[number];

function defaultEnabled(type: NotifType, role: string): boolean {
  if (type === 'weekly_report') return role === 'MANAGER' || role === 'ADMIN';
  return true;
}

// ── GET /notifications/prefs ──────────────────────────────────────────────────
// Returns the current user's notification preferences (with defaults filled in).
notificationsRouter.get('/prefs', async (req, res) => {
  const userId = req.user!.id;
  const role   = req.user!.role;

  const stored = await (prisma as any).notificationPreference.findMany({
    where: { userId },
  });
  const storedMap: Record<string, boolean> = {};
  stored.forEach((r: any) => { storedMap[r.type] = r.enabled; });

  const prefs = VALID_TYPES.map(type => ({
    type,
    enabled: storedMap[type] ?? defaultEnabled(type, role),
  }));

  res.json(prefs);
});

// ── PUT /notifications/prefs ──────────────────────────────────────────────────
// Upsert one or more notification preferences for the current user.
const prefsSchema = z.array(z.object({
  type:    z.enum(VALID_TYPES),
  enabled: z.boolean(),
}));

notificationsRouter.put('/prefs', async (req, res) => {
  const parsed = prefsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const userId = req.user!.id;

  await Promise.all(parsed.data.map(({ type, enabled }) =>
    (prisma as any).notificationPreference.upsert({
      where:  { userId_type: { userId, type } },
      update: { enabled },
      create: { userId, type, enabled },
    })
  ));

  res.json({ ok: true });
});

// ── GET /notifications/prefs/:userId ─────────────────────────────────────────
// Admin can view any user's prefs.
notificationsRouter.get('/prefs/:userId', requireRole('ADMIN'), async (req, res) => {
  const userId = req.params.userId;
  const user   = await (prisma as any).user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const stored = await (prisma as any).notificationPreference.findMany({ where: { userId } });
  const storedMap: Record<string, boolean> = {};
  stored.forEach((r: any) => { storedMap[r.type] = r.enabled; });

  const prefs = VALID_TYPES.map(type => ({
    type,
    enabled: storedMap[type] ?? defaultEnabled(type, user.role),
  }));

  res.json(prefs);
});

// ── POST /notifications/test ──────────────────────────────────────────────────
// Admin-only: send a test email to verify SMTP configuration.
notificationsRouter.post('/test', requireRole('ADMIN'), async (req, res) => {
  const to = String(req.body?.to || req.user!.email);
  const ok = await sendTestEmail(to);
  res.json({ ok, to });
});
