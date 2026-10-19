import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { normalizeEndpoint } from './ollama.js';

export const AI_CONFIG_KEY = 'ai.provider';
export const AI_PROVIDER_KEYS = ['ollama', 'openai', 'claude', 'gemini', 'watsonx', 'azure-openai', 'azure-openai-gateway'] as const;
export const AI_REASONING_KEYS = ['automatic', 'low', 'medium', 'high'] as const;

export type AiProviderKey = typeof AI_PROVIDER_KEYS[number];
export type AiReasoningKey = typeof AI_REASONING_KEYS[number];

const providerSchema = z.enum(AI_PROVIDER_KEYS);
const reasoningSchema = z.enum(AI_REASONING_KEYS);
const endpointSchema = z.string().trim().min(1).max(500).transform((value, context) => {
  try { return normalizeEndpoint(value); }
  catch (error) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: (error as Error).message });
    return z.NEVER;
  }
});

export const aiIntegrationSchema = z.object({
  id: z.string().trim().min(1).max(120),
  name: z.string().trim().min(2).max(120),
  provider: providerSchema,
  endpoint: endpointSchema,
  apiKey: z.string().max(4000).default(''),
  model: z.string().trim().max(200),
  maxOutputTokens: z.number().int().min(64).max(32768).default(2048),
  reasoning: reasoningSchema.default('automatic'),
  enabled: z.boolean().default(false),
}).strict();

export const aiConfigSchema = z.object({
  activeIntegrationId: z.string().trim().max(120).default(''),
  integrations: z.array(aiIntegrationSchema).max(12).default([]),
}).strict();

function getProviderDefaultName(provider: AiProviderKey) {
  switch (provider) {
    case 'openai': return 'OpenAI';
    case 'claude': return 'Claude';
    case 'gemini': return 'Gemini';
    case 'watsonx': return 'IBM watsonx';
    case 'azure-openai': return 'Azure OpenAI';
    case 'azure-openai-gateway': return 'Azure OpenAI Gateway';
    default: return 'Ollama';
  }
}

export function buildDefaultAiIntegration(overrides: Partial<z.infer<typeof aiIntegrationSchema>> = {}) {
  const provider = (overrides.provider || 'ollama') as AiProviderKey;
  return aiIntegrationSchema.parse({
    id: overrides.id || randomUUID(),
    name: overrides.name || getProviderDefaultName(provider),
    provider,
    endpoint: overrides.endpoint || 'http://localhost:11434',
    apiKey: overrides.apiKey || '',
    model: overrides.model || '',
    maxOutputTokens: overrides.maxOutputTokens ?? 2048,
    reasoning: overrides.reasoning || 'automatic',
    enabled: overrides.enabled ?? false,
  });
}

export function normalizeAiConfig(raw: unknown) {
  if (!raw || typeof raw !== 'object') {
    const integration = buildDefaultAiIntegration({ enabled: false });
    return { activeIntegrationId: integration.id, integrations: [integration] };
  }

  if (!Array.isArray((raw as any).integrations)) {
    const legacy = raw as { provider?: string; endpoint?: string; model?: string; enabled?: boolean };
    const integration = buildDefaultAiIntegration({
      provider: legacy.provider === 'ollama' ? 'ollama' : 'ollama',
      endpoint: legacy.endpoint || 'http://localhost:11434',
      model: legacy.model || '',
      enabled: Boolean(legacy.enabled),
    });
    return { activeIntegrationId: integration.id, integrations: [integration] };
  }

  const parsed = aiConfigSchema.parse(raw);
  const baseIntegrations = parsed.integrations.length
    ? parsed.integrations.map((integration) => buildDefaultAiIntegration(integration))
    : [buildDefaultAiIntegration({ enabled: false })];
  const activeIntegrationId = parsed.activeIntegrationId
    || baseIntegrations.find((integration) => integration.enabled)?.id
    || baseIntegrations[0].id;

  const integrations = baseIntegrations.map((integration) => ({
    ...integration,
    enabled: integration.id === activeIntegrationId ? integration.enabled : false,
  }));

  return aiConfigSchema.parse({ activeIntegrationId, integrations });
}

export function getActiveAiIntegration(config: z.infer<typeof aiConfigSchema>) {
  return config.integrations.find((integration) => integration.id === config.activeIntegrationId)
    || config.integrations[0]
    || null;
}

export function isOllamaIntegration(integration: { provider?: string } | null | undefined) {
  return integration?.provider === 'ollama';
}

export function getTutorResponseOptions(input: { message: string; pace: 'step-by-step' | 'balanced' | 'advanced' }, maxOutputTokens: number) {
  const cleanedMessage = String(input.message || '').trim();
  const shortQuestion = cleanedMessage.length <= 120 && cleanedMessage.split(/\s+/).length <= 18;
  const ceiling = Math.max(64, Math.min(maxOutputTokens || 2048, 32768));
  const requestedTokens = input.pace === 'advanced'
    ? 520
    : input.pace === 'step-by-step'
      ? 280
      : shortQuestion
        ? 180
        : 320;

  return {
    temperature: input.pace === 'advanced' ? 0.2 : 0.12,
    num_predict: Math.min(requestedTokens, ceiling),
    num_ctx: shortQuestion ? 4096 : 6144,
  };
}
