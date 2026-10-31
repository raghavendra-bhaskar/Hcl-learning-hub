import nodemailer from 'nodemailer';
import { env } from '../env.js';

let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!env.smtp.enabled || !env.smtp.host) return null;
  if (_transporter) return _transporter;
  _transporter = nodemailer.createTransport({
    host:   env.smtp.host,
    port:   env.smtp.port,
    secure: env.smtp.secure,
    auth:   env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
  });
  return _transporter;
}

async function send(to: string, subject: string, html: string): Promise<boolean> {
  const t = getTransporter();
  if (!t) {
    console.log(`[email] SMTP disabled — would have sent "${subject}" to ${to}`);
    return false;
  }
  try {
    await t.sendMail({ from: env.smtp.from, to, subject, html });
    console.log(`[email] sent "${subject}" → ${to}`);
    return true;
  } catch (err) {
    console.error(`[email] failed to send "${subject}" to ${to}:`, err);
    return false;
  }
}

// ── Email templates ───────────────────────────────────────────────────────────

function layout(content: string) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0f1a;color:#e2e8f0;margin:0;padding:0}
  .wrap{max-width:600px;margin:0 auto;padding:32px 20px}
  .logo{font-size:20px;font-weight:800;color:#06b6d4;margin-bottom:28px}
  .card{background:#111827;border-radius:16px;padding:28px;border:1px solid #1e293b;margin-bottom:20px}
  h2{color:#f1f5f9;font-size:18px;margin:0 0 12px}
  p{color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 14px}
  .badge{display:inline-block;padding:4px 12px;border-radius:20px;background:#06b6d422;color:#06b6d4;font-size:12px;font-weight:600;margin-bottom:16px}
  .btn{display:inline-block;padding:12px 24px;border-radius:12px;background:linear-gradient(135deg,#06b6d4,#0891b2);color:#fff!important;font-weight:700;text-decoration:none;font-size:14px;margin-top:8px}
  .stat{display:inline-block;padding:8px 16px;background:#0f172a;border-radius:8px;margin:4px;text-align:center}
  .stat-n{font-size:22px;font-weight:800;color:#06b6d4}
  .stat-l{font-size:11px;color:#64748b;display:block;margin-top:2px}
  .footer{font-size:11px;color:#334155;text-align:center;padding-top:20px}
  a{color:#06b6d4}
</style></head><body>
<div class="wrap">
  <div class="logo">🎯 HCL Learning Hub</div>
  ${content}
  <div class="footer">
    You received this because you have notifications enabled.<br>
    <a href="${env.smtp.appUrl}/settings">Manage notification preferences</a>
  </div>
</div></body></html>`;
}

export async function sendQuestCompletionEmail(opts: {
  to: string; name: string;
  questTitle: string; courseTitle: string; courseSlug: string;
  score: number; total: number; xp: number;
}) {
  const pct = Math.round((opts.score / opts.total) * 100);
  const html = layout(`
    <div class="card">
      <div class="badge">🏆 Quest Complete</div>
      <h2>Well done, ${opts.name}!</h2>
      <p>You just completed <strong style="color:#f1f5f9">${opts.questTitle}</strong> in <strong style="color:#f1f5f9">${opts.courseTitle}</strong>.</p>
      <div>
        <div class="stat"><span class="stat-n">${pct}%</span><span class="stat-l">Score</span></div>
        <div class="stat"><span class="stat-n">+${opts.xp}</span><span class="stat-l">XP earned</span></div>
        <div class="stat"><span class="stat-n">${opts.score}/${opts.total}</span><span class="stat-l">Correct</span></div>
      </div>
      <br>
      <a class="btn" href="${env.smtp.appUrl}/c/${opts.courseSlug}/quests">Continue Learning →</a>
    </div>`);
  return send(opts.to, `✅ Quest complete: ${opts.questTitle}`, html);
}

export async function sendCourseCompletionEmail(opts: {
  to: string; name: string;
  courseTitle: string; courseSlug: string; totalXP: number; questsCompleted: number;
}) {
  const html = layout(`
    <div class="card">
      <div class="badge">🎓 Course Complete</div>
      <h2>Congratulations, ${opts.name}!</h2>
      <p>You have completed all quests in <strong style="color:#f1f5f9">${opts.courseTitle}</strong>. Outstanding achievement!</p>
      <div>
        <div class="stat"><span class="stat-n">${opts.questsCompleted}</span><span class="stat-l">Quests done</span></div>
        <div class="stat"><span class="stat-n">${opts.totalXP}</span><span class="stat-l">Total XP</span></div>
      </div>
      <br>
      <a class="btn" href="${env.smtp.appUrl}/c/${opts.courseSlug}">View Certificate →</a>
    </div>`);
  return send(opts.to, `🎓 Course complete: ${opts.courseTitle}`, html);
}

export async function sendWeeklyReportEmail(opts: {
  to: string; managerName: string;
  weekLabel: string;
  learners: Array<{
    name: string; email: string;
    questsThisWeek: number; xpThisWeek: number; totalXP: number;
    courseProgress: Array<{ title: string; percentage: number; status: string }>;
  }>;
}) {
  const rows = opts.learners.map(l => {
    const courses = l.courseProgress
      .map(c => `<span style="font-size:11px;color:#94a3b8">${c.title}: <strong style="color:#06b6d4">${c.percentage}%</strong></span>`)
      .join(' &nbsp;·&nbsp; ') || '<span style="color:#475569;font-size:11px">No activity yet</span>';
    return `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #1e293b">
          <strong style="color:#f1f5f9;font-size:13px">${l.name}</strong><br>
          <span style="font-size:11px;color:#64748b">${l.email}</span>
        </td>
        <td style="padding:10px 8px;border-bottom:1px solid #1e293b;text-align:center">
          <span style="color:#06b6d4;font-weight:700">${l.questsThisWeek}</span>
        </td>
        <td style="padding:10px 8px;border-bottom:1px solid #1e293b;text-align:center">
          <span style="color:#10b981;font-weight:700">+${l.xpThisWeek}</span>
        </td>
        <td style="padding:10px 8px;border-bottom:1px solid #1e293b;font-size:11px">${courses}</td>
      </tr>`;
  }).join('');

  const html = layout(`
    <div class="card">
      <div class="badge">📊 Weekly Report</div>
      <h2>${opts.weekLabel} — Team Progress</h2>
      <p>Hi ${opts.managerName}, here's your team's learning summary for the week.</p>
      ${opts.learners.length === 0
        ? '<p style="color:#475569">No learners are currently active under your team.</p>'
        : `<table style="width:100%;border-collapse:collapse">
            <thead>
              <tr>
                <th style="text-align:left;padding:8px;color:#64748b;font-size:11px;border-bottom:1px solid #334155">Learner</th>
                <th style="text-align:center;padding:8px;color:#64748b;font-size:11px;border-bottom:1px solid #334155">Quests</th>
                <th style="text-align:center;padding:8px;color:#64748b;font-size:11px;border-bottom:1px solid #334155">XP</th>
                <th style="text-align:left;padding:8px;color:#64748b;font-size:11px;border-bottom:1px solid #334155">Courses</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>`
      }
      <br>
      <a class="btn" href="${env.smtp.appUrl}/manager">View Full Dashboard →</a>
    </div>`);
  return send(opts.to, `📊 Weekly learning report — ${opts.weekLabel}`, html);
}

export async function sendTestEmail(to: string): Promise<boolean> {
  const html = layout(`
    <div class="card">
      <div class="badge">✅ Test Email</div>
      <h2>Email configuration works!</h2>
      <p>This is a test message from HCL Learning Hub. Your SMTP settings are correctly configured.</p>
    </div>`);
  return send(to, '✅ HCL Learning Hub — email test', html);
}
