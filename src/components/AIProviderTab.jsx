import { useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import { api } from '../lib/api.js';
import AITutor from './AITutor.jsx';
import { useAppStore } from '../App.jsx';

const PROVIDER_OPTIONS = [
  { value: 'openai', label: 'OpenAI', needsApiKey: true },
  { value: 'claude', label: 'Claude', needsApiKey: true },
  { value: 'gemini', label: 'Gemini', needsApiKey: true },
  { value: 'watsonx', label: 'IBM watsonx', needsApiKey: true },
  { value: 'azure-openai', label: 'Azure OpenAI', needsApiKey: true },
  { value: 'azure-openai-gateway', label: 'Azure OpenAI Gateway', needsApiKey: true },
  { value: 'ollama', label: 'Ollama', needsApiKey: false },
];

function makeIntegration(overrides = {}) {
  return {
    id: overrides.id || (globalThis.crypto?.randomUUID?.() || `ai-${Date.now()}`),
    name: overrides.name || 'New AI Provider',
    provider: overrides.provider || 'ollama',
    endpoint: overrides.endpoint || 'http://localhost:11434',
    apiKey: overrides.apiKey || '',
    model: overrides.model || '',
    maxOutputTokens: overrides.maxOutputTokens || 2048,
    reasoning: overrides.reasoning || 'automatic',
    enabled: !!overrides.enabled,
  };
}

export default function AIProviderTab() {
  const { theme } = useAppStore();
  const isLight = theme === 'light';
  const [config, setConfig] = useState(null);
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState(null);
  const [models, setModels] = useState([]);
  const [refresh, setRefresh] = useState(0);
  const [discovering, setDiscovering] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [discoveryError, setDiscoveryError] = useState('');
  const [saved, setSaved] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    api.get('/ai/config', { signal: controller.signal }).then(nextConfig => {
      if (controller.signal.aborted) return;
      setConfig(nextConfig);
      const activeId = nextConfig?.activeIntegrationId || nextConfig?.integrations?.[0]?.id || '';
      const selected = nextConfig?.integrations?.find(integration => integration.id === activeId) || nextConfig?.integrations?.[0] || null;
      setSelectedId(activeId);
      setDraft(selected ? makeIntegration(selected) : makeIntegration());
    }).catch(error => {
      if (!controller.signal.aborted) setError(error.message);
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!draft?.endpoint) return;
    const controller = new AbortController();
    setModels([]);
    setDiscoveryError('');
    if (draft.provider !== 'ollama') {
      setDiscovering(false);
      return () => controller.abort();
    }
    setDiscovering(true);
    const timer = setTimeout(async () => {
      try {
        const result = await api.post('/ai/models', { provider: draft.provider, endpoint: draft.endpoint }, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setModels(result.models);
        setDraft(previous => ({ ...previous, model: result.models.some(model => model.name === previous.model) ? previous.model : '' }));
      } catch (error) {
        if (!controller.signal.aborted) setDiscoveryError(error.message);
      } finally {
        if (!controller.signal.aborted) setDiscovering(false);
      }
    }, 600);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [draft?.endpoint, draft?.provider, refresh]);

  const change = (field, value) => {
    setDraft(previous => ({ ...previous, [field]: value }));
    setSaved(false);
    setError('');
  };

  const selectIntegration = (integration) => {
    setSelectedId(integration.id);
    setDraft(makeIntegration(integration));
    setSaved(false);
    setError('');
  };

  const beginAddIntegration = () => {
    const provider = 'ollama';
    setSelectedId('');
    setDraft(makeIntegration({ name: 'New Ollama Integration', provider, endpoint: 'http://localhost:11434' }));
    setModels([]);
    setDiscoveryError('');
    setSaved(false);
  };

  const removeIntegration = async (integrationId) => {
    if (!config) return;
    const remaining = (config.integrations || []).filter(integration => integration.id !== integrationId);
    const nextConfig = {
      activeIntegrationId: remaining.find(integration => integration.enabled)?.id || remaining[0]?.id || '',
      integrations: remaining.map((integration, index) => ({ ...integration, enabled: integration.enabled && index === 0 ? true : integration.enabled })),
    };
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const result = await api.put('/ai/config', nextConfig);
      setConfig(result);
      const nextSelected = result.integrations.find(integration => integration.id === result.activeIntegrationId) || result.integrations[0] || null;
      setSelectedId(nextSelected?.id || '');
      setDraft(nextSelected ? makeIntegration(nextSelected) : makeIntegration());
      setRevision(value => value + 1);
      setSaved(true);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const save = async event => {
    event.preventDefault();
    if (!config || !draft) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const normalizedDraft = {
        ...draft,
        name: draft.name.trim(),
        endpoint: draft.endpoint.trim(),
        model: draft.model.trim(),
        apiKey: draft.apiKey || '',
        maxOutputTokens: Number(draft.maxOutputTokens) || 2048,
        enabled: draft.provider === 'ollama' ? !!draft.enabled : false,
      };
      const existing = (config.integrations || []).filter(integration => integration.id !== normalizedDraft.id);
      const allIntegrations = [...existing, normalizedDraft];
      const nextActiveId = normalizedDraft.enabled
        ? normalizedDraft.id
        : (config.activeIntegrationId === normalizedDraft.id ? (allIntegrations.find(integration => integration.enabled)?.id || normalizedDraft.id) : config.activeIntegrationId || allIntegrations[0]?.id || '');
      const nextConfig = {
        activeIntegrationId: nextActiveId || normalizedDraft.id,
        integrations: allIntegrations.map(integration => ({
          ...integration,
          enabled: integration.id === (normalizedDraft.enabled ? normalizedDraft.id : nextActiveId) ? integration.enabled : false,
        })),
      };
      const result = await api.put('/ai/config', nextConfig);
      setConfig(result);
      const nextSelected = result.integrations.find(integration => integration.id === normalizedDraft.id) || result.integrations[0] || null;
      setSelectedId(nextSelected?.id || '');
      setDraft(nextSelected ? makeIntegration(nextSelected) : makeIntegration());
      setSaved(true);
      setRevision(value => value + 1);
    } catch (error) { setError(error.message); }
    finally { setSaving(false); }
  };
  const inputClass = `w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none disabled:opacity-40 ${isLight ? 'text-slate-900 bg-white border border-slate-300' : 'text-white bg-space-950 border border-white/20'}`;

  const integrations = config?.integrations || [];
  const activeIntegration = integrations.find(integration => integration.id === config?.activeIntegrationId) || integrations.find(integration => integration.enabled) || null;
  const selectedOption = PROVIDER_OPTIONS.find(option => option.value === draft?.provider);

  if (!config || !draft) return <p role={error ? 'alert' : 'status'} className={`text-sm ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{error || 'Loading AI Provider...'}</p>;

  return (
    <div className="max-w-5xl space-y-6" style={{ letterSpacing: 0 }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className={`font-orbitron text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>AI Integrations</h2>
          <p className={`mt-1 text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Manage multiple provider profiles, then keep one supported runtime active for AI Tutor and AI Help.</p>
        </div>
        <button type="button" onClick={beginAddIntegration}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white"
          style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)' }}>
          <Plus size={14} /> Add Integration
        </button>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: isLight ? '#ffffff' : 'rgba(3,10,20,0.72)', border: isLight ? '1px solid rgba(100,116,139,0.18)' : '1px solid rgba(255,255,255,0.08)', boxShadow: isLight ? '0 8px 24px rgba(15,23,42,0.06)' : 'none' }}>
        <div className="px-4 py-3 border-b flex items-center justify-between gap-3" style={{ borderColor: isLight ? 'rgba(148,163,184,0.18)' : 'rgba(255,255,255,0.06)' }}>
          <div>
            <p className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Installed Integrations</p>
            <p className="text-[11px] text-slate-500 mt-1">Non-Ollama providers can be saved now, while Ollama remains the active runtime supported by the tutor endpoints.</p>
          </div>
        </div>
        <div className="p-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {integrations.map(integration => {
            const active = integration.id === config.activeIntegrationId && integration.enabled;
            const selected = integration.id === selectedId;
            return <button key={integration.id} type="button" onClick={() => selectIntegration(integration)}
              className="rounded-2xl p-4 text-left border transition-all"
              style={{
                background: selected ? (isLight ? 'rgba(239,246,255,0.92)' : 'rgba(30,41,59,0.92)') : (isLight ? 'rgba(248,250,252,0.96)' : 'rgba(255,255,255,0.03)'),
                borderColor: active ? 'rgba(16,185,129,0.28)' : selected ? 'rgba(59,130,246,0.24)' : (isLight ? 'rgba(148,163,184,0.18)' : 'rgba(255,255,255,0.08)'),
              }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{integration.name}</p>
                  <p className="text-[11px] uppercase tracking-widest text-slate-500 mt-1">{PROVIDER_OPTIONS.find(option => option.value === integration.provider)?.label || integration.provider}</p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: active ? 'rgba(16,185,129,0.14)' : 'rgba(148,163,184,0.14)', border: active ? '1px solid rgba(16,185,129,0.28)' : '1px solid rgba(148,163,184,0.22)', color: active ? '#10b981' : '#64748b' }}>
                  {active ? 'Active' : 'Saved'}
                </span>
              </div>
              <p className={`mt-3 text-xs break-all ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{integration.endpoint}</p>
              <p className={`mt-2 text-xs ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{integration.model || 'No model selected'}</p>
              <div className="mt-4 flex items-center justify-between gap-2">
                <span className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>{integration.provider === 'ollama' ? 'Runtime-capable' : 'Saved for future runtime'}</span>
                <span className={`text-[11px] font-semibold ${selected ? 'text-cyan-500' : isLight ? 'text-slate-500' : 'text-slate-500'}`}>{selected ? 'Editing' : 'Open'}</span>
              </div>
            </button>;
          })}
        </div>
      </div>

      <form onSubmit={save} className="space-y-5">
        <div className="rounded-lg px-4 py-3 text-sm"
          style={{ background: isLight ? 'rgba(251,191,36,0.14)' : 'rgba(251,191,36,0.10)', border: isLight ? '1px solid rgba(217,119,6,0.28)' : '1px solid rgba(251,191,36,0.30)', color: isLight ? '#92400e' : '#fef3c7' }}>
          <p className="font-semibold">Check HCL-approved AI models before adding one.</p>
          <p className={`mt-1 text-xs leading-relaxed ${isLight ? 'text-amber-800' : 'text-amber-200/80'}`}>
            Read the HCL AI Tools document first. Only configure approved providers and models.
            <a href="https://sites.google.com/hcl.software/productsecurity/ai-portal/ai-tools"
              target="_blank" rel="noopener noreferrer"
              className={`ml-1 font-semibold underline underline-offset-2 ${isLight ? 'text-cyan-700 hover:text-cyan-800' : 'text-cyan-300 hover:text-cyan-200'}`}>
              Open HCL AI Tools approval list
            </a>
          </p>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <label className={`block text-sm ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Integration Name
            <input type="text" value={draft.name} onChange={event => change('name', event.target.value)} required maxLength={120}
              disabled={saving} placeholder="Enter Name" className={`${inputClass} mt-2`} />
          </label>
          <label className={`block text-sm ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Provider
            <select value={draft.provider} onChange={event => change('provider', event.target.value)} disabled={saving} className={`${inputClass} mt-2`}>
              {PROVIDER_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
        <label className={`block text-sm ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>API Endpoint
          <input type="url" value={draft.endpoint} onChange={event => change('endpoint', event.target.value)} required maxLength={500}
            disabled={saving} placeholder="http://localhost:11434" className={`${inputClass} mt-2`} />
        </label>
        {selectedOption?.needsApiKey && <label className={`block text-sm ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>API Key
          <input type="password" value={draft.apiKey} onChange={event => change('apiKey', event.target.value)} maxLength={4000}
            disabled={saving} placeholder="Enter API Key" className={`${inputClass} mt-2`} />
        </label>}
        <div>
          <label htmlFor="provider-model" className={`block text-sm mb-2 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Model Name</label>
          {draft.provider === 'ollama'
            ? <div className="flex gap-2">
              <select id="provider-model" value={draft.model} onChange={event => change('model', event.target.value)}
                disabled={discovering || saving || !models.length} className={`${inputClass} min-w-0`}>
                <option value="">{discovering ? 'Discovering models...' : 'Select an installed model'}</option>
                {models.map(model => <option key={model.name} value={model.name}>{model.name}{model.running ? ' (running)' : ''}</option>)}
              </select>
              <button type="button" onClick={() => { setRefresh(value => value + 1); setSaved(false); }} disabled={discovering || saving}
                title="Refresh models" aria-label="Refresh models" className={`w-11 h-11 shrink-0 rounded-lg border flex items-center justify-center disabled:opacity-40 ${isLight ? 'border-slate-300 text-cyan-700 bg-white' : 'border-white/20 text-cyan-300'}`}>
                {discovering ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
              </button>
            </div>
            : <input id="provider-model" type="text" value={draft.model} onChange={event => change('model', event.target.value)}
              disabled={saving} placeholder="Enter model name" className={inputClass} />}
          {discoveryError && <p role="alert" className={`text-sm mt-2 ${isLight ? 'text-red-600' : 'text-red-300'}`}>{discoveryError}</p>}
          {draft.provider === 'ollama' && !discovering && !discoveryError && !models.length && <p role="status" className={`text-sm mt-2 ${isLight ? 'text-amber-700' : 'text-amber-300'}`}>No installed models found on this endpoint.</p>}
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <label className={`block text-sm ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Max output tokens
            <input type="number" min="64" max="32768" value={draft.maxOutputTokens} onChange={event => change('maxOutputTokens', event.target.value)}
              disabled={saving} placeholder="Default: 2048" className={`${inputClass} mt-2`} />
          </label>
          <label className={`block text-sm ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Reasoning
            <select value={draft.reasoning} onChange={event => change('reasoning', event.target.value)} disabled={saving} className={`${inputClass} mt-2`}>
              <option value="automatic">Automatic</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
        </div>
        <label className={`flex items-center gap-3 text-sm ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
          <input type="checkbox" checked={draft.enabled} onChange={event => change('enabled', event.target.checked)} disabled={saving || draft.provider !== 'ollama'} className="w-4 h-4 accent-cyan-500" />
          Use this integration for AI Tutor and AI Help
        </label>
        {draft.provider !== 'ollama' && <p className={`text-xs ${isLight ? 'text-amber-700' : 'text-amber-300'}`}>This provider profile is saved for administrator planning. The current runtime chat path executes only through an active Ollama integration.</p>}
        <div className="flex items-center gap-4">
          <button type="submit" disabled={saving || (draft.provider === 'ollama' && draft.enabled && (discovering || !draft.model || !models.some(model => model.name === draft.model)))}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-40"
            style={{ background: isLight ? '#0891b2' : undefined }}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save
          </button>
          {selectedId && <button type="button" onClick={() => removeIntegration(selectedId)} disabled={saving || integrations.length <= 1}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40 ${isLight ? 'text-red-700 bg-red-50 border border-red-200' : 'text-red-300 border border-red-500/30 bg-red-500/10'}`}>
            <Trash2 size={16} /> Remove
          </button>}
          {saved && <p role="status" className={`text-sm ${isLight ? 'text-emerald-700' : 'text-emerald-300'}`}>AI Provider saved.</p>}
        </div>
        {error && <p role="alert" className={`text-sm ${isLight ? 'text-red-600' : 'text-red-300'}`}>{error}</p>}
      </form>
      {activeIntegration?.provider === 'ollama' && activeIntegration?.enabled && <div className="rounded-2xl p-5" style={{ background: isLight ? '#ffffff' : 'rgba(3,10,20,0.72)', border: isLight ? '1px solid rgba(100,116,139,0.18)' : '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Pencil size={16} className={isLight ? 'text-cyan-700' : 'text-cyan-300'} />
          <p className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Test Active Administrator Runtime</p>
        </div>
        <AITutor key={revision} mode="help" title="Test Saved Provider" />
      </div>}
    </div>
  );
}