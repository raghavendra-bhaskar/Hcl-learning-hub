import test from 'node:test';
import assert from 'node:assert/strict';
import { discoverModels, normalizeEndpoint, ollamaRequest } from '../src/lib/ollama.js';
import { courseSources, retrieveSources, tutorSystemPrompt } from '../src/lib/aiKnowledge.js';

test('Ollama endpoints allow local servers but reject credentials and non-origin URLs', () => {
  assert.equal(normalizeEndpoint('http://localhost:11434/'), 'http://localhost:11434');
  assert.equal(normalizeEndpoint('http://host.docker.internal:11434'), 'http://host.docker.internal:11434');
  for (const endpoint of ['file:///tmp/model', 'http://user:secret@localhost:11434', 'http://localhost/api', 'http://localhost?token=x', 'http://169.254.169.254']) {
    assert.throws(() => normalizeEndpoint(endpoint));
  }
});

test('discovery distinguishes installed models from models currently loaded in memory', async (context) => {
  context.mock.method(globalThis, 'fetch', async (url: string) => Response.json({
    models: url.endsWith('/api/tags') ? [{ name: 'llama3.2:latest' }, { name: 'gemma3:latest' }] : [{ name: 'gemma3:latest' }],
  }));
  const models = await discoverModels('http://localhost:11434');
  assert.deepEqual(models.map((model: { name: string; running: boolean }) => [model.name, model.running]), [
    ['llama3.2:latest', false], ['gemma3:latest', true],
  ]);
});

test('Ollama HTTP errors are surfaced without including server response bodies', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => new Response('private server details', { status: 404 }));
  await assert.rejects(ollamaRequest('http://localhost:11434', '/api/tags'), /HTTP 404/);
});

test('retrieval finds course evidence and declines unrelated or stop-word-only questions', () => {
  const sources = courseSources([{
    slug: 'devops-loop', title: 'DevOps Loop', description: 'Deployment automation',
    weeks: [{ modules: [{ title: 'Pipelines', topics: [{ content: 'Pipelines automate build and deployment stages.' }] }] }],
    quests: [{ id: 'quest-1', title: 'Pipeline practice', scenario: 'A pipeline fails.', explanation: 'Inspect the build logs.', learnTopics: [{ content: 'Check pipeline stages.' }] }],
  }]);
  const matches = retrieveSources(sources, 'How do pipelines automate deployment?');
  assert.ok(matches.length > 0);
  assert.ok(matches.every(source => source.url.startsWith('/c/devops-loop')));
  assert.equal(retrieveSources(sources, 'Who won the football championship?').length, 0);
  assert.equal(retrieveSources(sources, 'can you tell me more please').length, 0);
  assert.match(tutorSystemPrompt('course', 'step-by-step', matches), /Stay strictly within the selected course/);
  assert.match(tutorSystemPrompt('course', 'step-by-step', matches), /Learning pace: step-by-step/);
});