import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const packageJsonPath = resolve(repoRoot, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const port = Number.parseInt(process.env.MCP_PORT || '3333', 10);
const host = process.env.MCP_HOST || '127.0.0.1';
const endpointPath = '/mcp';

const providerCatalog = [
  { id: 'ollama', label: 'Ollama', runtime: 'supported' },
  { id: 'openai', label: 'OpenAI', runtime: 'saved-profile' },
  { id: 'claude', label: 'Claude', runtime: 'saved-profile' },
  { id: 'gemini', label: 'Gemini', runtime: 'saved-profile' },
  { id: 'watsonx', label: 'IBM watsonx', runtime: 'saved-profile' },
  { id: 'azure-openai', label: 'Azure OpenAI', runtime: 'saved-profile' },
  { id: 'azure-openai-gateway', label: 'Azure OpenAI Gateway', runtime: 'saved-profile' },
];

function json(response, statusCode, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type, accept',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  response.end(body);
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
    {
      name: 'get_mcp_demo_status',
      description: 'Return the localhost MCP endpoint details for Windsurf or VS Code validation.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    },
  ];
}

function callTool(name) {
  if (name === 'get_deployment_defaults') {
    return {
      content: [{ type: 'text', text: JSON.stringify({ currentBaseline: '5', nextPatchExample: '5.1', rollbackUsesRecordedReleases: true }, null, 2) }],
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
  if (name === 'get_mcp_demo_status') {
    return {
      content: [{ type: 'text', text: JSON.stringify({ host, port, endpoint: `http://${host}:${port}${endpointPath}`, transport: 'http' }, null, 2) }],
    };
  }
  throw new Error(`Unknown tool: ${name}`);
}

function handleMessage(message) {
  if (!message || message.jsonrpc !== '2.0') {
    return { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid Request' } };
  }

  const { id, method, params } = message;

  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {}, resources: {} },
        serverInfo: { name: 'learning-hub-localhost-mcp', version: '1.0.0' },
      },
    };
  }

  if (method === 'notifications/initialized') {
    return null;
  }

  if (method === 'ping') {
    return { jsonrpc: '2.0', id, result: {} };
  }

  if (method === 'tools/list') {
    return { jsonrpc: '2.0', id, result: { tools: listTools() } };
  }

  if (method === 'tools/call') {
    try {
      return { jsonrpc: '2.0', id, result: callTool(params?.name) };
    } catch (error) {
      return { jsonrpc: '2.0', id, error: { code: -32602, message: error instanceof Error ? error.message : 'Unknown tool error' } };
    }
  }

  if (method === 'resources/list') {
    return { jsonrpc: '2.0', id, result: { resources: [] } };
  }

  if (method === 'resources/read') {
    return { jsonrpc: '2.0', id, error: { code: -32602, message: 'No demo resources are published by this server.' } };
  }

  return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
}

const server = createServer((request, response) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'content-type, accept',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Cache-Control': 'no-store',
    });
    response.end();
    return;
  }

  if (request.url === '/' && request.method === 'GET') {
    json(response, 200, { name: 'learning-hub-localhost-mcp', endpoint: endpointPath, status: 'ok' });
    return;
  }

  if (request.url !== endpointPath) {
    json(response, 404, { error: 'Not found' });
    return;
  }

  if (request.method !== 'POST') {
    json(response, 405, { error: 'Use POST for MCP JSON-RPC requests.' });
    return;
  }

  const chunks = [];
  request.on('data', chunk => chunks.push(chunk));
  request.on('end', () => {
    try {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      const payload = raw ? JSON.parse(raw) : null;
      const result = handleMessage(payload);
      if (result === null) {
        response.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store',
        });
        response.end();
        return;
      }
      json(response, 200, result);
    } catch (error) {
      json(response, 400, {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: error instanceof Error ? error.message : 'Parse error' },
      });
    }
  });
});

server.listen(port, host, () => {
  console.log(`[mcp-http] listening on http://${host}:${port}${endpointPath}`);
});
