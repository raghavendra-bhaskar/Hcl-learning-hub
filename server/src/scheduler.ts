import cron from 'node-cron';
import { prisma } from './lib/prisma.js';
import { sendWeeklyReportEmail } from './lib/email.js';
import { env } from './env.js';

// ── Weekly manager report ─────────────────────────────────────────────────────
// Runs every Monday at 08:00 server-local time.
// Managers who have NOT explicitly opted out (weekly_report pref enabled !== false) receive a report.

async function sendWeeklyReports() {
  if (!env.smtp.enabled) return;

  const now  = new Date();
  const week = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const weekLabel = `Week of ${week}`;

  // 7 days ago
  const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Find all managers/admins who have NOT opted out
  const managers = await (prisma as any).user.findMany({
    where: { role: { in: ['MANAGER', 'ADMIN'] } },
    select: { id: true, name: true, email: true, role: true },
  });

  for (const mgr of managers) {
    // Check opt-out: if a pref row exists with enabled=false, skip
    const pref = await (prisma as any).notificationPreference.findUnique({
      where: { userId_type: { userId: mgr.id, type: 'weekly_report' } },
    });
    if (pref && pref.enabled === false) continue;

    // Gather learners under this manager
    const learners = await (prisma as any).user.findMany({
      where: {
        OR: [
          { managerId: mgr.id },
          { assignedManagers: { some: { managerId: mgr.id } } },
        ],
        role: 'USER',
      },
      include: {
        progress: {
          where: { completedAt: { gte: since } },
          orderBy: { completedAt: 'desc' },
        },
        certifications: true,
      },
    });

    // Tracked courses for percentage
    const courses = await (prisma as any).course.findMany({
      select: { slug: true, title: true, _count: { select: { quests: true } } },
    });
    const courseMap = new Map(courses.map((c: any) => [c.slug, c]));

    const learnerReports = await Promise.all(learners.map(async (l: any) => {
      const allProgress = await (prisma as any).progress.findMany({
        where: { userId: l.id },
        select: { module: true, xpEarned: true, questId: true },
      });

      const courseProgress = courses.map((c: any) => {
        const done       = allProgress.filter((p: any) => p.module === c.slug).length;
        const total      = c._count?.quests || 0;
        const pct        = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
        const cert       = l.certifications.find((cert: any) => cert.certId === c.slug);
        const status     = cert?.status === 'achieved' ? 'completed' : done > 0 ? 'in-progress' : 'not-started';
        return { title: c.title, percentage: pct, status };
      }).filter((c: any) => c.status !== 'not-started');

      return {
        name:           l.name,
        email:          l.email,
        questsThisWeek: l.progress.length,
        xpThisWeek:     l.progress.reduce((s: number, p: any) => s + p.xpEarned, 0),
        totalXP:        allProgress.reduce((s: number, p: any) => s + p.xpEarned, 0),
        courseProgress,
      };
    }));

    try {
      await sendWeeklyReportEmail({
        to:          mgr.email,
        managerName: mgr.name,
        weekLabel,
        learners:    learnerReports,
      });
    } catch (err) {
      console.error(`[scheduler] weekly report failed for ${mgr.email}:`, err);
    }
  }
  console.log(`[scheduler] weekly reports sent for ${weekLabel}`);
}

// ── Init ──────────────────────────────────────────────────────────────────────
export function initScheduler() {
  // Every Monday at 08:00
  cron.schedule('0 8 * * 1', () => {
    console.log('[scheduler] running weekly report job');
    sendWeeklyReports().catch(err => console.error('[scheduler] error:', err));
  });
  console.log('[scheduler] weekly manager report scheduled (Mon 08:00)');
}
