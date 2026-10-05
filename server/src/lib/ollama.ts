export function normalizeEndpoint(value: string): string {
  let endpoint: URL;
  try { endpoint = new URL(value); }
  catch { throw new Error('Enter a valid Ollama HTTP or HTTPS endpoint.'); }
  if (!['http:', 'https:'].includes(endpoint.protocol) || endpoint.username || endpoint.password ||
      endpoint.search || endpoint.hash || endpoint.pathname !== '/' ||
      /^(169\.254\.|0\.|\[?fe80:|\[?::ffff:169\.254\.)/i.test(endpoint.hostname) ||
      endpoint.hostname === 'metadata.google.internal') {
    throw new Error('Use an Ollama server origin without credentials, paths, or query parameters.');
  }
  return endpoint.origin;
}

export async function ollamaRequest(
  endpoint: string,
  path: '/api/tags' | '/api/ps' | '/api/chat',
  body?: unknown,
  requestOptions?: { timeoutMs?: number },
) {
  let response: Response;
  try {
    response = await fetch(`${normalizeEndpoint(endpoint)}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(requestOptions?.timeoutMs ?? (body ? 300_000 : 10_000)),
      redirect: 'error',
    });
  } catch (error) {
    if ((error as Error).name === 'TimeoutError') {
      throw new Error('Ollama request timed out. Check connectivity, choose a smaller/faster model, or shorten the prompt.');
    }
    throw new Error(`Ollama request failed. Check that the backend server can reach the configured endpoint and that the Ollama server is running. ${(error as Error).message || ''}`.trim());
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`Ollama returned HTTP ${response.status}. Check the endpoint and installed model.`);
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Ollama returned an empty response.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 4_000_000) {
      await reader.cancel();
      throw new Error('Ollama response exceeded the size limit.');
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export async function discoverModels(endpoint: string) {
  const installed = await ollamaRequest(endpoint, '/api/tags');
  if (!Array.isArray(installed.models)) throw new Error('The endpoint did not return an Ollama model list.');
  const running = await ollamaRequest(endpoint, '/api/ps').catch(() => null);
  const loaded = new Set((running?.models || []).map((model: { name: string }) => model.name));
  return installed.models
    .filter((model: { name?: string }) => typeof model.name === 'string' && model.name.length > 0)
    .map((model: { name: string; size?: number }) => ({
      name: model.name, size: model.size, running: running ? loaded.has(model.name) : null,
    }));
}