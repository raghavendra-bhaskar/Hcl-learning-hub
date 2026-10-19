import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const packageJsonPath = resolve(repoRoot, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

const providerCatalog = [
  { id: 'ollama', label: 'Ollama', runtime: 'supported' },
  { id: 'openai', label: 'OpenAI', runtime: 'saved-profile' },
  { id: 'claude', label: 'Claude', runtime: 'saved-profile' },
  { id: 'gemini', label: 'Gemini', runtime: 'saved-profile' },
  { id: 'watsonx', label: 'IBM watsonx', runtime: 'saved-profile' },
  { id: 'azure-openai', label: 'Azure OpenAI', runtime: 'saved-profile' },
  { id: 'azure-openai-gateway', label: 'Azure OpenAI Gateway', runtime: 'saved-profile' },
];

function writeMessage(message) {
  const payload = Buffer.from(JSON.stringify(message), 'utf8');
  process.stdout.write(`Content-Length: ${payload.length}\r\n\r\n`);
  process.stdout.write(payload);
}

function reply(id, result) {
  writeMessage({ jsonrpc: '2.0', id, result });
}

function replyError(id, code, message) {
  writeMessage({ jsonrpc: '2.0', id, error: { code, message } });
}

function listTools() {
  return [
    {
      name: 'get_deployment_defaults',
      description: 'Show the local deployment baseline and patch strategy used by the Learning Hub admin deployment preview.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    },
    {
      name: 'list_ai_provider_options',
      description: 'List the AI provider options currently shown in the admin AI Integrations panel.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    },
    {
      name: 'get_workspace_version',
      description: 'Return the workspace package version used by local builds.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    },
  ];
}

function callTool(name) {
  if (name === 'get_deployment_defaults') {
    return {
      content: [{ type: 'text', text: JSON.stringify({ currentBaseline: '6', nextPatchExample: '6.1', rollbackUsesRecordedReleases: true }, null, 2) }],
    };
  }
  if (name === 'list_ai_provider_options') {
    return {
      content: [{ type: 'text', text: JSON.stringify(providerCatalog, null, 2) }],
    };
  }
  if (name === 'get_workspace_version') {
    return {
      content: [{ type: 'text', text: JSON.stringify({ name: packageJson.name, version: packageJson.version }, null, 2) }],
    };
  }
  throw new Error(`Unknown tool: ${name}`);
}

function handleMessage(message) {
  if (!message || message.jsonrpc !== '2.0') return;
  const { id, method, params } = message;

  if (method === 'initialize') {
    reply(id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {}, resources: {} },
      serverInfo: { name: 'learning-hub-demo-mcp', version: '1.0.0' },
    });
    return;
  }

  if (method === 'notifications/initialized') return;

  if (method === 'ping') {
    reply(id, {});
    return;
  }

  if (method === 'tools/list') {
    reply(id, { tools: listTools() });
    return;
  }

  if (method === 'tools/call') {
    try {
      reply(id, callTool(params?.name));
    } catch (error) {
      replyError(id, -32602, error instanceof Error ? error.message : 'Unknown tool error');
    }
    return;
  }

  if (method === 'resources/list') {
    reply(id, { resources: [] });
    return;
  }

  if (method === 'resources/read') {
    replyError(id, -32602, 'No demo resources are published by this server.');
    return;
  }

  if (id !== undefined) replyError(id, -32601, `Method not found: ${method}`);
}

let buffer = Buffer.alloc(0);
process.stdin.on('data', chunk => {
  buffer = Buffer.concat([buffer, chunk]);
  while (true) {
    const headerEnd = buffer.indexOf('\r\n\r\n');
    if (headerEnd === -1) return;
    const headerText = buffer.slice(0, headerEnd).toString('utf8');
    const lengthMatch = headerText.match(/Content-Length:\s*(\d+)/i);
    if (!lengthMatch) {
      buffer = buffer.slice(headerEnd + 4);
      continue;
    }
    const contentLength = Number.parseInt(lengthMatch[1], 10);
    const messageEnd = headerEnd + 4 + contentLength;
    if (buffer.length < messageEnd) return;
    const payload = buffer.slice(headerEnd + 4, messageEnd).toString('utf8');
    buffer = buffer.slice(messageEnd);
    try {
      handleMessage(JSON.parse(payload));
    } catch (error) {
      writeMessage({ jsonrpc: '2.0', method: 'window/logMessage', params: { level: 'error', data: error instanceof Error ? error.message : 'Invalid JSON payload' } });
    }
  }
});
