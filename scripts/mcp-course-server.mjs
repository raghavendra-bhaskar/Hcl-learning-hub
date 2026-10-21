const courseFields = {
  title: { type: 'string' },
  slug: { type: 'string' },
  tagline: { type: 'string' },
  description: { type: 'string' },
  emoji: { type: 'string' },
  accentColor: { type: 'string' },
  status: { type: 'string', enum: ['live', 'coming-soon'] },
  category: { type: 'string', enum: ['process', 'product', 'technology'] },
  order: { type: 'number' },
  instructorName: { type: 'string' },
  instructorEmail: { type: 'string' },
  helpSpaceUrl: { type: 'string' },
  helpSpaceName: { type: 'string' },
  helpSpaceHint: { type: 'string' },
};

const questFields = {
  title: { type: 'string' },
  scenario: { type: 'string' },
  optionA: { type: 'string' },
  optionB: { type: 'string' },
  optionC: { type: 'string' },
  optionD: { type: 'string' },
  correct: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
  explanation: { type: 'string' },
  xp: { type: 'number' },
  moduleId: { type: ['string', 'null'] },
  order: { type: 'number' },
};

function defineTool(name, description, properties, required = []) {
  return {
    name,
    description,
    inputSchema: {
      type: 'object',
      properties,
      required,
      additionalProperties: false,
    },
  };
}

const tools = [
  defineTool('list_courses', 'List courses on the configured Learning Hub VM.', {}),
  defineTool('get_course', 'Get a course and its weeks, modules, topics, resources, and quest count.', {
    slug: { type: 'string', description: 'Course slug, for example ai-quest.' },
  }, ['slug']),
  defineTool('list_topics', 'List topics grouped by week and module for a course.', {
    slug: { type: 'string', description: 'Course slug, for example ai-quest.' },
  }, ['slug']),
  defineTool('list_quests', 'List the quests for a course by course ID.', {
    courseId: { type: 'string' },
  }, ['courseId']),
  defineTool('list_moderators', 'List assigned moderator names and email addresses for a course. Requires administrator permission.', {
    slug: { type: 'string', description: 'Course slug, for example ai-quest.' },
  }, ['slug']),
  defineTool('list_course_learners', 'List opted, in-progress, and completed learners with completion percentages for a course visible to the current manager or administrator.', {
    slug: { type: 'string', description: 'Course slug, for example devops-loop.' },
  }, ['slug']),
  defineTool('preview_course_builder', 'Generate a reviewable AI course-builder plan from an outline and verified resource URLs. Does not save course content.', {
    courseId: { type: 'string' },
    outline: { type: 'string' },
    resourceUrls: { type: 'array', items: { type: 'string' } },
  }, ['courseId', 'outline']),
  defineTool('create_course', 'Create a course on the VM. Requires administrator permission.', courseFields, ['title', 'slug']),
  defineTool('update_course', 'Update course metadata by course ID. Requires administrator or assigned moderator permission.', {
    courseId: { type: 'string' },
    ...courseFields,
  }, ['courseId']),
  defineTool('create_week', 'Add a week to a course. Requires administrator or assigned moderator permission.', {
    courseId: { type: 'string' },
    title: { type: 'string' },
    weekNumber: { type: 'number' },
  }, ['courseId', 'title', 'weekNumber']),
  defineTool('update_week', 'Update a week by ID. Requires administrator or assigned moderator permission.', {
    id: { type: 'string' },
    title: { type: 'string' },
    weekNumber: { type: 'number' },
  }, ['id']),
  defineTool('create_module', 'Add a module to a week. Requires administrator or assigned moderator permission.', {
    weekId: { type: 'string' },
    title: { type: 'string' },
    icon: { type: 'string' },
    color: { type: 'string' },
    order: { type: 'number' },
    number: { type: 'number' },
  }, ['weekId', 'title']),
  defineTool('update_module', 'Update a module by ID. Requires administrator or assigned moderator permission.', {
    id: { type: 'string' },
    title: { type: 'string' },
    icon: { type: 'string' },
    color: { type: 'string' },
    order: { type: 'number' },
    number: { type: 'number' },
  }, ['id']),
  defineTool('create_topic', 'Add learning content to a module. Requires administrator or assigned moderator permission.', {
    moduleId: { type: 'string' },
    content: { type: 'string' },
    order: { type: 'number' },
  }, ['moduleId', 'content']),
  defineTool('update_topic', 'Update a topic by ID. Requires administrator or assigned moderator permission.', {
    id: { type: 'string' },
    content: { type: 'string' },
    order: { type: 'number' },
  }, ['id']),
  defineTool('create_resource', 'Add a learning resource to a module. Requires administrator or assigned moderator permission.', {
    moduleId: { type: 'string' },
    label: { type: 'string' },
    type: { type: 'string' },
    url: { type: 'string' },
    order: { type: 'number' },
  }, ['moduleId', 'label']),
  defineTool('update_resource', 'Update a resource by ID. Requires administrator or assigned moderator permission.', {
    id: { type: 'string' },
    label: { type: 'string' },
    type: { type: 'string' },
    url: { type: 'string' },
    order: { type: 'number' },
  }, ['id']),
  defineTool('create_quest', 'Add a quiz quest to a course. Requires administrator or assigned moderator permission.', {
    courseId: { type: 'string' },
    ...questFields,
  }, ['courseId', 'title', 'scenario', 'optionA', 'optionB', 'optionC', 'optionD', 'correct', 'explanation']),
  defineTool('update_quest', 'Update a quest by ID. Requires administrator or assigned moderator permission.', {
    id: { type: 'string' },
    ...questFields,
  }, ['id']),
];

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing VS Code MCP input: ${name}`);
  return value;
}

function getApiBaseUrl() {
  const url = new URL(requiredEnv('HCL_HUB_API_URL'));
  const isLoopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((!['http:', 'https:'].includes(url.protocol)) || (url.protocol !== 'https:' && !isLoopback) || url.username || url.password || url.search || url.hash) {
    throw new Error('Learning Hub API URL must be an HTTP(S) URL without credentials, query, or fragment.');
  }
  const path = url.pathname.replace(/\/+$/, '');
  const directLocalApi = isLoopback && url.port === '4000' && !path;
  url.pathname = directLocalApi || path.endsWith('/api') ? path || '/' : `${path}/api`;
  return url.toString().replace(/\/$/, '');
}

const apiBaseUrl = getApiBaseUrl();
const email = requiredEnv('HCL_HUB_EMAIL');
const password = requiredEnv('HCL_HUB_PASSWORD');
let accessToken;

async function fetchHub(path, options) {
  try {
    return await fetch(`${apiBaseUrl}${path}`, options);
  } catch (error) {
    const cause = error instanceof Error ? error.cause : null;
    const networkError = cause instanceof AggregateError ? cause.errors[0] : cause;
    const code = networkError && typeof networkError === 'object' && 'code' in networkError ? String(networkError.code) : '';
    const detail = code || (networkError instanceof Error ? networkError.message : error instanceof Error ? error.message : 'Unknown network error');
    throw new Error(`Cannot reach Learning Hub API at ${new URL(apiBaseUrl).origin} (${detail}). Check the VM URL, VPN, proxy, and TLS configuration.`);
  }
}

function writeMessage(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function reply(id, result) {
  writeMessage({ jsonrpc: '2.0', id, result });
}

function replyError(id, code, message) {
  writeMessage({ jsonrpc: '2.0', id, error: { code, message } });
}

async function login() {
  const response = await fetchHub('/auth/local/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    redirect: 'error',
    signal: AbortSignal.timeout(30000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload.token !== 'string') {
    throw new Error(`Learning Hub login failed (HTTP ${response.status}). Check the VM URL and local account credentials.`);
  }
  accessToken = payload.token;
}

async function apiRequest(method, path, body, retry = true) {
  if (!accessToken) await login();
  const response = await fetchHub(path, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    redirect: 'error',
    signal: AbortSignal.timeout(30000),
  });
  if (response.status === 401 && retry) {
    accessToken = undefined;
    await login();
    return apiRequest(method, path, body, false);
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = typeof payload?.error === 'string' ? `: ${payload.error}` : '';
    throw new Error(`Learning Hub API returned HTTP ${response.status}${detail}`);
  }
  return payload;
}

function without(args, ...keys) {
  const excluded = new Set(keys);
  return Object.fromEntries(Object.entries(args).filter(([key]) => !excluded.has(key)));
}

function requireFields(args, fields) {
  for (const field of fields) {
    if (args[field] === undefined || args[field] === null || args[field] === '') {
      throw new Error(`Missing required field: ${field}`);
    }
  }
}

async function callTool(name, input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Tool arguments must be an object.');

  switch (name) {
    case 'list_courses':
      return apiRequest('GET', '/courses-api/');
    case 'get_course':
      requireFields(input, ['slug']);
      return apiRequest('GET', `/courses-api/${encodeURIComponent(input.slug)}`);
    case 'list_topics': {
      requireFields(input, ['slug']);
      const course = await apiRequest('GET', `/courses-api/${encodeURIComponent(input.slug)}`);
      return course.weeks.flatMap(week => week.modules.map(module => ({
        week: { id: week.id, title: week.title, weekNumber: week.weekNumber },
        module: { id: module.id, title: module.title },
        topics: module.topics,
      })));
    }
    case 'list_quests':
      requireFields(input, ['courseId']);
      return apiRequest('GET', `/courses-api/${encodeURIComponent(input.courseId)}/quests`);
    case 'list_moderators':
      requireFields(input, ['slug']);
      return apiRequest('GET', `/courses-api/${encodeURIComponent(input.slug)}/moderators`);
    case 'list_course_learners': {
      requireFields(input, ['slug']);
      const learners = await apiRequest('GET', '/manager/all-learners');
      return learners.flatMap(learner => {
        if (learner.role === 'ADMIN') return [];
        const certification = learner.certifications.find(cert => cert.certId === input.slug);
        const progress = learner.courseProgress.find(course => course.slug === input.slug);
        const status = progress?.status || (certification?.status === 'assigned' ? 'opted' : null);
        return status ? [{ name: learner.name, email: learner.email, status, percentage: progress?.percentage ?? 0 }] : [];
      });
    }
    case 'preview_course_builder':
      requireFields(input, ['courseId', 'outline']);
      return apiRequest('POST', '/ai/course-builder', {
        courseId: input.courseId,
        outline: input.outline,
        mode: 'create',
        resourceUrls: input.resourceUrls || [],
      });
    case 'create_course':
      requireFields(input, ['title', 'slug']);
      return apiRequest('POST', '/courses-api/', input);
    case 'update_course':
      requireFields(input, ['courseId']);
      if (!Object.keys(without(input, 'courseId')).length) throw new Error('Provide at least one course field to update.');
      return apiRequest('PUT', `/courses-api/${encodeURIComponent(input.courseId)}`, without(input, 'courseId'));
    case 'create_week':
      requireFields(input, ['courseId', 'title', 'weekNumber']);
      return apiRequest('POST', `/courses-api/${encodeURIComponent(input.courseId)}/weeks`, without(input, 'courseId'));
    case 'update_week':
      requireFields(input, ['id']);
      if (!Object.keys(without(input, 'id')).length) throw new Error('Provide a week title or number to update.');
      return apiRequest('PUT', `/courses-api/weeks/${encodeURIComponent(input.id)}`, without(input, 'id'));
    case 'create_module':
      requireFields(input, ['weekId', 'title']);
      return apiRequest('POST', `/courses-api/weeks/${encodeURIComponent(input.weekId)}/modules`, without(input, 'weekId'));
    case 'update_module':
      requireFields(input, ['id']);
      if (!Object.keys(without(input, 'id')).length) throw new Error('Provide a module field to update.');
      return apiRequest('PUT', `/courses-api/modules/${encodeURIComponent(input.id)}`, without(input, 'id'));
    case 'create_topic':
      requireFields(input, ['moduleId', 'content']);
      return apiRequest('POST', `/courses-api/modules/${encodeURIComponent(input.moduleId)}/topics`, without(input, 'moduleId'));
    case 'update_topic':
      requireFields(input, ['id']);
      if (!Object.keys(without(input, 'id')).length) throw new Error('Provide topic content or order to update.');
      return apiRequest('PUT', `/courses-api/topics/${encodeURIComponent(input.id)}`, without(input, 'id'));
    case 'create_resource':
      requireFields(input, ['moduleId', 'label']);
      return apiRequest('POST', `/courses-api/modules/${encodeURIComponent(input.moduleId)}/resources`, without(input, 'moduleId'));
    case 'update_resource':
      requireFields(input, ['id']);
      if (!Object.keys(without(input, 'id')).length) throw new Error('Provide a resource field to update.');
      return apiRequest('PUT', `/courses-api/resources/${encodeURIComponent(input.id)}`, without(input, 'id'));
    case 'create_quest':
      requireFields(input, ['courseId', 'title', 'scenario', 'optionA', 'optionB', 'optionC', 'optionD', 'correct', 'explanation']);
      return apiRequest('POST', `/courses-api/${encodeURIComponent(input.courseId)}/quests`, without(input, 'courseId'));
    case 'update_quest':
      requireFields(input, ['id']);
      if (!Object.keys(without(input, 'id')).length) throw new Error('Provide a quest field to update.');
      return apiRequest('PUT', `/courses-api/quests/${encodeURIComponent(input.id)}`, without(input, 'id'));
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function handleMessage(message) {
  if (!message || message.jsonrpc !== '2.0') return;
  const { id, method, params } = message;
  if (method === 'initialize') {
    reply(id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'hcl-learning-hub-course-admin', version: '1.0.0' },
    });
    return;
  }
  if (method === 'notifications/initialized') return;
  if (method === 'ping') return reply(id, {});
  if (method === 'tools/list') return reply(id, { tools });
  if (method === 'tools/call') {
    try {
      const result = await callTool(params?.name, params?.arguments);
      reply(id, { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] });
    } catch (error) {
      reply(id, {
        content: [{ type: 'text', text: error instanceof Error ? error.message : 'Unknown Learning Hub error.' }],
        isError: true,
      });
    }
    return;
  }
  if (method === 'resources/list') return reply(id, { resources: [] });
  if (id !== undefined) replyError(id, -32601, `Method not found: ${method}`);
}

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  buffer += chunk;
  while (buffer.includes('\n')) {
    const end = buffer.indexOf('\n');
    const payload = buffer.slice(0, end).trim();
    buffer = buffer.slice(end + 1);
    if (!payload) continue;
    try {
      void handleMessage(JSON.parse(payload)).catch(error => {
        writeMessage({ jsonrpc: '2.0', method: 'window/logMessage', params: { level: 'error', data: error instanceof Error ? error.message : 'MCP request failed.' } });
      });
    } catch {
      writeMessage({ jsonrpc: '2.0', method: 'window/logMessage', params: { level: 'error', data: 'Invalid JSON-RPC payload.' } });
    }
  }
});