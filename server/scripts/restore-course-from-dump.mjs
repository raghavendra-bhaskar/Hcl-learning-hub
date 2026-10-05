import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, openSync, readSync, closeSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverRoot = resolve(__dirname, '..');
config({ path: join(serverRoot, '.env') });

function fail(message) {
  console.error(message);
  process.exit(1);
}

function info(message) {
  console.log(message);
}

function parseArgs(argv) {
  const args = { dump: '', slug: '', apply: false, keepTempDb: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dump') args.dump = argv[++i] || '';
    else if (arg === '--slug') args.slug = argv[++i] || '';
    else if (arg === '--apply') args.apply = true;
    else if (arg === '--keep-temp-db') args.keepTempDb = true;
    else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node --env-file=server/.env server/scripts/restore-course-from-dump.mjs --dump <path> --slug <course-slug> [--apply] [--keep-temp-db]');
      process.exit(0);
    } else {
      fail(`Unknown argument: ${arg}`);
    }
  }
  if (!args.dump) fail('Missing --dump <path>');
  if (!args.slug) fail('Missing --slug <course-slug>');
  return args;
}

function parseDatabaseUrl(databaseUrl = process.env.DATABASE_URL || '') {
  if (!databaseUrl) fail('DATABASE_URL is not configured');
  const parsed = new URL(databaseUrl);
  return {
    databaseUrl,
    host: parsed.hostname || '127.0.0.1',
    port: parsed.port || '5432',
    user: decodeURIComponent(parsed.username || ''),
    password: decodeURIComponent(parsed.password || ''),
    database: decodeURIComponent(parsed.pathname.replace(/^\//, '') || ''),
  };
}

function buildDatabaseUrl(connection, database) {
  const parsed = new URL('postgresql://localhost');
  parsed.username = connection.user;
  parsed.password = connection.password;
  parsed.hostname = connection.host;
  parsed.port = connection.port;
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

function run(command, args, env = process.env) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk.toString(); });
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    child.on('error', rejectPromise);
    child.on('close', code => {
      if (code === 0) return resolvePromise({ stdout, stderr });
      rejectPromise(new Error(stderr.trim() || stdout.trim() || `${command} exited with code ${code}`));
    });
  });
}

function sanitizeLabel(value) {
  return (value || 'course')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'course';
}

function timestampForFile(date = new Date()) {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

function readMagic(filePath) {
  const fd = openSync(filePath, 'r');
  try {
    const buffer = Buffer.alloc(5);
    readSync(fd, buffer, 0, 5, 0);
    return buffer.toString();
  } finally {
    closeSync(fd);
  }
}

function getCourseInclude() {
  return {
    weeks: {
      orderBy: { weekNumber: 'asc' },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            topics: { orderBy: { order: 'asc' } },
            resources: { orderBy: { order: 'asc' } },
          },
        },
      },
    },
    quests: { orderBy: { order: 'asc' } },
  };
}

async function getCourseSnapshot(prisma, slug) {
  const course = await prisma.course.findUnique({ where: { slug }, include: getCourseInclude() });
  const moderatorSetting = await prisma.setting.findUnique({ where: { key: `course.moderators.${slug}` } });
  return { course, moderatorSetting };
}

function summarize(snapshot) {
  const course = snapshot?.course;
  if (!course) return { exists: false };
  const modules = course.weeks.flatMap(week => week.modules || []);
  return {
    exists: true,
    id: course.id,
    title: course.title,
    slug: course.slug,
    status: course.status,
    weeks: course.weeks.length,
    modules: modules.length,
    topics: modules.reduce((sum, module) => sum + (module.topics?.length || 0), 0),
    resources: modules.reduce((sum, module) => sum + (module.resources?.length || 0), 0),
    quests: course.quests.length,
    moderatorSetting: snapshot.moderatorSetting?.value || null,
  };
}

async function createSafetyBackup(connection, slug) {
  const backupDir = join(serverRoot, 'backups');
  if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true });
  const base = `hcl-hub-before-restore-${sanitizeLabel(slug)}-${timestampForFile()}`;
  let target = join(backupDir, `${base}.dump`);
  let version = 2;
  while (existsSync(target)) {
    target = join(backupDir, `${base}-v${version}.dump`);
    version += 1;
  }
  await run('pg_dump', [
    '-h', connection.host,
    '-p', connection.port,
    '-U', connection.user,
    '-d', connection.database,
    '--format=custom',
    '--no-owner',
    '--no-acl',
    '-f', target,
  ], { PGPASSWORD: connection.password });
  return { filePath: target, sizeBytes: statSync(target).size };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dumpPath = resolve(args.dump);
  if (!existsSync(dumpPath)) fail(`Dump file not found: ${dumpPath}`);
  const connection = parseDatabaseUrl();
  const adminDbUrl = buildDatabaseUrl(connection, 'postgres');
  const tempDbName = `hclhub_restore_${sanitizeLabel(args.slug).replace(/-/g, '_')}_${Date.now()}`.slice(0, 60);
  const tempDbUrl = buildDatabaseUrl(connection, tempDbName);
  const currentPrisma = new PrismaClient();
  const adminPrisma = new PrismaClient({ datasources: { db: { url: adminDbUrl } } });
  let tempPrisma;

  try {
    info(`Creating temporary database: ${tempDbName}`);
    await adminPrisma.$executeRawUnsafe(`CREATE DATABASE "${tempDbName}"`);
    const magic = readMagic(dumpPath);
    if (magic === 'PGDMP') {
      await run('pg_restore', [
        '-h', connection.host,
        '-p', connection.port,
        '-U', connection.user,
        '-d', tempDbName,
        '--no-owner',
        '--no-acl',
        dumpPath,
      ], { PGPASSWORD: connection.password });
    } else {
      await run('psql', [
        '-h', connection.host,
        '-p', connection.port,
        '-U', connection.user,
        '-d', tempDbName,
        '-f', dumpPath,
      ], { PGPASSWORD: connection.password });
    }

    tempPrisma = new PrismaClient({ datasources: { db: { url: tempDbUrl } } });

    const [backupSnapshot, currentSnapshot] = await Promise.all([
      getCourseSnapshot(tempPrisma, args.slug),
      getCourseSnapshot(currentPrisma, args.slug),
    ]);

    const comparison = {
      slug: args.slug,
      backup: summarize(backupSnapshot),
      current: summarize(currentSnapshot),
    };

    console.log(JSON.stringify(comparison, null, 2));

    if (!backupSnapshot.course) {
      fail(`Course "${args.slug}" not found in backup dump`);
    }

    if (!args.apply) {
      info('Comparison only. Re-run with --apply to restore this course into the current database.');
      return;
    }

    const safetyBackup = await createSafetyBackup(connection, args.slug);
    info(`Safety backup created: ${safetyBackup.filePath}`);

    await currentPrisma.$transaction(async (tx) => {
      const existing = await tx.course.findUnique({ where: { slug: args.slug }, select: { id: true } });
      if (existing) {
        await tx.course.delete({ where: { id: existing.id } });
      }

      const course = backupSnapshot.course;
      await tx.course.create({
        data: {
          id: course.id,
          slug: course.slug,
          title: course.title,
          tagline: course.tagline,
          description: course.description,
          emoji: course.emoji,
          accentColor: course.accentColor,
          status: course.status,
          order: course.order,
          instructorName: course.instructorName,
          instructorEmail: course.instructorEmail,
          helpSpaceUrl: course.helpSpaceUrl,
          helpSpaceName: course.helpSpaceName,
          helpSpaceHint: course.helpSpaceHint,
        },
      });

      const weeks = course.weeks.map(week => ({
        id: week.id,
        courseId: course.id,
        weekNumber: week.weekNumber,
        title: week.title,
      }));
      if (weeks.length) await tx.courseWeek.createMany({ data: weeks });

      const modules = course.weeks.flatMap(week => (week.modules || []).map(module => ({
        id: module.id,
        weekId: week.id,
        order: module.order,
        number: module.number,
        title: module.title,
        icon: module.icon,
        color: module.color,
      })));
      if (modules.length) await tx.courseModule.createMany({ data: modules });

      const topics = course.weeks.flatMap(week => (week.modules || []).flatMap(module => (module.topics || []).map(topic => ({
        id: topic.id,
        moduleId: module.id,
        order: topic.order,
        content: topic.content,
      }))));
      if (topics.length) await tx.courseTopic.createMany({ data: topics });

      const resources = course.weeks.flatMap(week => (week.modules || []).flatMap(module => (module.resources || []).map(resource => ({
        id: resource.id,
        moduleId: module.id,
        order: resource.order,
        label: resource.label,
        type: resource.type,
        url: resource.url,
      }))));
      if (resources.length) await tx.courseResource.createMany({ data: resources });

      const quests = course.quests.map(quest => ({
        id: quest.id,
        courseId: quest.courseId,
        moduleId: quest.moduleId,
        order: quest.order,
        title: quest.title,
        scenario: quest.scenario,
        optionA: quest.optionA,
        optionB: quest.optionB,
        optionC: quest.optionC,
        optionD: quest.optionD,
        correct: quest.correct,
        explanation: quest.explanation,
        xp: quest.xp,
        learnTopics: quest.learnTopics,
        learnResources: quest.learnResources,
      }));
      if (quests.length) await tx.courseQuest.createMany({ data: quests });

      const settingKey = `course.moderators.${args.slug}`;
      if (backupSnapshot.moderatorSetting) {
        await tx.setting.upsert({
          where: { key: settingKey },
          update: { value: backupSnapshot.moderatorSetting.value },
          create: { key: settingKey, value: backupSnapshot.moderatorSetting.value },
        });
      } else {
        await tx.setting.deleteMany({ where: { key: settingKey } });
      }
    });

    info(`Course restored successfully: ${args.slug}`);
  } finally {
    await Promise.allSettled([
      currentPrisma.$disconnect(),
      adminPrisma.$disconnect(),
      tempPrisma?.$disconnect?.(),
    ]);
    if (!args.keepTempDb) {
      try {
        const cleanupPrisma = new PrismaClient({ datasources: { db: { url: adminDbUrl } } });
        await cleanupPrisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${tempDbName}" WITH (FORCE)`);
        await cleanupPrisma.$disconnect();
      } catch (error) {
        console.warn(`Failed to drop temporary database ${tempDbName}: ${error?.message || error}`);
      }
    }
  }
}

main().catch(error => {
  console.error(error?.message || error);
  process.exit(1);
});
