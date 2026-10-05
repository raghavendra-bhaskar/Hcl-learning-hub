import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, ChevronDown, Loader2, Send, Trash2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAppStore } from '../App.jsx';

export default function AITutor({ courseSlug, mode = 'course', title = 'AI Tutor', onNavigate }) {
  const { theme } = useAppStore();
  const isLight = theme === 'light';
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(null);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [pace, setPace] = useState('balanced');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(null);
  const transcript = useRef(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setStatus(null);
    setError('');
    api.get('/ai/status', { signal: controller.signal }).then(setStatus).catch(error => {
      if (!controller.signal.aborted) setError(error.message);
    });
    return () => controller.abort();
  }, [open]);

  useEffect(() => () => pending.current?.abort(), []);
  useEffect(() => {
    if (transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight;
  }, [messages, busy]);

  const send = async event => {
    event.preventDefault();
    if (!question.trim() || busy || !status?.enabled) return;
    const message = question.trim();
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError('');
    try {
      const result = await api.post('/ai/chat', {
        mode, ...(mode === 'course' ? { courseSlug } : {}), message, pace,
        history: messages.slice(-8).map(({ role, content }) => ({ role, content: content.slice(0, 4000) })),
      }, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setMessages(previous => [...previous.slice(-18), { role: 'user', content: message }, { role: 'assistant', content: result.answer, sources: result.sources, model: result.model }]);
      setQuestion('');
    } catch (error) {
      if (!controller.signal.aborted) setError(error.message);
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  };

  return (
    <section className="my-6 min-w-0 border-y text-left" style={{ letterSpacing: 0, borderColor: isLight ? 'rgba(100,116,139,0.18)' : 'rgba(34,211,238,0.2)' }}>
      <button type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-controls={panelId}
        className={`flex items-center gap-3 w-full py-4 text-sm font-semibold text-left ${isLight ? 'text-slate-800' : 'text-cyan-300'}`}>
        <Bot size={20} className="shrink-0" /> {title}
        <ChevronDown size={16} className={`ml-auto shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div id={panelId} className="pb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className={`flex items-center gap-2 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Pace
            <select value={pace} onChange={event => setPace(event.target.value)} disabled={busy}
              className={`border rounded-lg px-2 py-2 ${isLight ? 'bg-white text-slate-900 border-slate-300' : 'bg-space-950 text-slate-200 border-white/20'}`}>
              <option value="step-by-step">Step by step</option>
              <option value="balanced">Balanced</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>
          <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>{status?.enabled ? 'AI ready' : (status ? 'AI unavailable' : 'Connecting...')}</span>
          <button type="button" onClick={() => { setMessages([]); setError(''); }} disabled={busy || !messages.length}
            title="Clear conversation" aria-label="Clear conversation" className={`ml-auto p-2 disabled:opacity-40 ${isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}>
            <Trash2 size={16} />
          </button>
        </div>
        {status && !status.enabled && <p className={`text-sm ${isLight ? 'text-amber-700' : 'text-amber-300'}`} role="status">AI is disabled. Ask an administrator to configure the AI Provider.</p>}
        <div ref={transcript} role="log" aria-label={`${title} conversation`} aria-live="polite"
          className="max-h-80 overflow-y-auto space-y-4 text-sm leading-relaxed">
          {messages.map((message, index) => <div key={index} className="border-l-2 pl-3" style={{ borderColor: isLight ? 'rgba(100,116,139,0.18)' : 'rgba(255,255,255,0.15)' }}>
            <p className={`text-xs font-semibold mb-1 ${message.role === 'user' ? (isLight ? 'text-slate-900' : 'text-amber-300') : (isLight ? 'text-cyan-700' : 'text-cyan-300')}`}>
              {message.role === 'user' ? 'You' : 'AI Tutor'}
            </p>
            <p className={`whitespace-pre-wrap [overflow-wrap:anywhere] ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{message.content}</p>
            {!!message.sources?.length && <details className="mt-2 group">
              <summary className={`cursor-pointer text-xs ${isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-500 hover:text-cyan-300'}`}>Retrieved sources ({message.sources.length})</summary>
              <div className="mt-2 space-y-1 pl-3 border-l" style={{ borderColor: isLight ? 'rgba(100,116,139,0.14)' : 'rgba(255,255,255,0.1)' }}>
                {message.sources.map(source => <Link key={source.reference} to={source.url} onClick={onNavigate}
                  className={`block text-xs hover:underline [overflow-wrap:anywhere] ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>
                  [{source.reference}] {source.title}
                </Link>)}
              </div>
            </details>}
          </div>)}
          {busy && <p className={`flex items-center gap-2 ${isLight ? 'text-slate-600' : 'text-slate-400'}`} role="status"><Loader2 size={16} className="animate-spin" /> Thinking...</p>}
        </div>
        {error && <p role="alert" className={`text-sm break-words ${isLight ? 'text-red-700' : 'text-red-300'}`}>{error}</p>}
        <form onSubmit={send} className="flex items-end gap-2">
          <label className="flex-1 min-w-0">
            <span className="sr-only">Question for {title}</span>
            <textarea value={question} onChange={event => setQuestion(event.target.value)} maxLength={2000} rows={2}
              disabled={busy || !status?.enabled} placeholder={mode === 'course' ? 'Ask about this course...' : 'Ask about the Learning Hub...'}
              className={`w-full resize-y min-h-[64px] max-h-40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-400 disabled:opacity-40 ${isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-white/5 border-white/20 text-white'}`} />
          </label>
          <button type="submit" disabled={busy || !status?.enabled || !question.trim()} title="Send question" aria-label="Send question"
            className="shrink-0 w-10 h-10 mb-1 rounded-lg bg-cyan-600 flex items-center justify-center text-white disabled:opacity-40 hover:bg-cyan-500">
            <Send size={18} />
          </button>
        </form>
      </div>}
    </section>
  );
}