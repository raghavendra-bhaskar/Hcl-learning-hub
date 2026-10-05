import { useEffect, useState } from 'react';
import { Loader2, RefreshCw, Save } from 'lucide-react';
import { api } from '../lib/api.js';
import AITutor from './AITutor.jsx';
import { useAppStore } from '../App.jsx';

export default function AIProviderTab() {
  const { theme } = useAppStore();
  const isLight = theme === 'light';
  const [config, setConfig] = useState(null);
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
    api.get('/ai/config', { signal: controller.signal }).then(setConfig).catch(error => {
      if (!controller.signal.aborted) setError(error.message);
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!config) return;
    const controller = new AbortController();
    setModels([]);
    setDiscoveryError('');
    setDiscovering(true);
    const timer = setTimeout(async () => {
      try {
        const result = await api.post('/ai/models', { endpoint: config.endpoint }, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setModels(result.models);
        setConfig(previous => ({ ...previous, model: result.models.some(model => model.name === previous.model) ? previous.model : '' }));
      } catch (error) {
        if (!controller.signal.aborted) setDiscoveryError(error.message);
      } finally {
        if (!controller.signal.aborted) setDiscovering(false);
      }
    }, 600);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [config?.endpoint, refresh]);

  const change = (field, value) => {
    setConfig(previous => ({ ...previous, [field]: value }));
    setSaved(false);
    setError('');
  };
  const save = async event => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await api.put('/ai/config', config);
      setSaved(true);
      setRevision(value => value + 1);
    } catch (error) { setError(error.message); }
    finally { setSaving(false); }
  };
  const inputClass = `w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none disabled:opacity-40 ${isLight ? 'text-slate-900 bg-white border border-slate-300' : 'text-white bg-space-950 border border-white/20'}`;

  if (!config) return <p role={error ? 'alert' : 'status'} className={`text-sm ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{error || 'Loading AI Provider...'}</p>;

  return (
    <div className="max-w-2xl" style={{ letterSpacing: 0 }}>
      <h2 className={`font-orbitron text-lg font-bold mb-6 ${isLight ? 'text-slate-900' : 'text-white'}`}>AI Provider Settings</h2>
      <form onSubmit={save} className="space-y-5">
        <div className="rounded-lg px-4 py-3 text-sm"
          style={{ background: isLight ? 'rgba(251,191,36,0.14)' : 'rgba(251,191,36,0.10)', border: isLight ? '1px solid rgba(217,119,6,0.28)' : '1px solid rgba(251,191,36,0.30)', color: isLight ? '#92400e' : '#fef3c7' }}>
          <p className="font-semibold">Check HCL-approved AI models before adding one.</p>
          <p className={`mt-1 text-xs leading-relaxed ${isLight ? 'text-amber-800' : 'text-amber-200/80'}`}>
            Read the HCL AI Tools document first. Only configure approved models,
            such as an approved Qwen or Llama variant, from your Ollama endpoint.
            <a href="https://sites.google.com/hcl.software/productsecurity/ai-portal/ai-tools"
              target="_blank" rel="noopener noreferrer"
              className={`ml-1 font-semibold underline underline-offset-2 ${isLight ? 'text-cyan-700 hover:text-cyan-800' : 'text-cyan-300 hover:text-cyan-200'}`}>
              Open HCL AI Tools approval list
            </a>
          </p>
        </div>
        <label className={`block text-sm ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>AI Provider
          <select value={config.provider} disabled className={`${inputClass} mt-2`}><option value="ollama">Ollama</option></select>
        </label>
        <label className={`block text-sm ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>AI Provider Endpoint
          <input type="url" value={config.endpoint} onChange={event => change('endpoint', event.target.value)} required maxLength={500}
            disabled={saving} placeholder="http://localhost:11434" className={`${inputClass} mt-2`} />
        </label>
        <div>
          <label htmlFor="ollama-model" className={`block text-sm mb-2 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Model Name</label>
          <div className="flex gap-2">
            <select id="ollama-model" value={config.model} onChange={event => change('model', event.target.value)}
              disabled={discovering || saving || !models.length} className={`${inputClass} min-w-0`}>
              <option value="">{discovering ? 'Discovering models...' : 'Select an installed model'}</option>
              {models.map(model => <option key={model.name} value={model.name}>{model.name}{model.running ? ' (running)' : ''}</option>)}
            </select>
            <button type="button" onClick={() => { setRefresh(value => value + 1); setSaved(false); }} disabled={discovering || saving}
              title="Refresh models" aria-label="Refresh models" className={`w-11 h-11 shrink-0 rounded-lg border flex items-center justify-center disabled:opacity-40 ${isLight ? 'border-slate-300 text-cyan-700 bg-white' : 'border-white/20 text-cyan-300'}`}>
              {discovering ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
            </button>
          </div>
          {discoveryError && <p role="alert" className={`text-sm mt-2 ${isLight ? 'text-red-600' : 'text-red-300'}`}>{discoveryError}</p>}
          {!discovering && !discoveryError && !models.length && <p role="status" className={`text-sm mt-2 ${isLight ? 'text-amber-700' : 'text-amber-300'}`}>No installed models found on this endpoint.</p>}
        </div>
        <label className={`flex items-center gap-3 text-sm ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
          <input type="checkbox" checked={config.enabled} onChange={event => change('enabled', event.target.checked)} disabled={saving} className="w-4 h-4 accent-cyan-500" />
          Enable AI Tutor and AI Help
        </label>
        <div className="flex items-center gap-4">
          <button type="submit" disabled={saving || (config.enabled && (discovering || !models.some(model => model.name === config.model)))}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-40"
            style={{ background: isLight ? '#0891b2' : undefined }}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save
          </button>
          {saved && <p role="status" className={`text-sm ${isLight ? 'text-emerald-700' : 'text-emerald-300'}`}>AI Provider saved.</p>}
        </div>
        {error && <p role="alert" className={`text-sm ${isLight ? 'text-red-600' : 'text-red-300'}`}>{error}</p>}
      </form>
      <AITutor key={revision} mode="help" title="Test Saved Provider" />
    </div>
  );
}